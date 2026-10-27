"""
Booky - STEP 05 로컬 SQLite 원서 읽기 시스템 정밀 자동 검증기
"""
import urllib.request
import urllib.error
import json
import sqlite3
import subprocess
import sys
import time

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_URL = "http://localhost:3000"

def log(msg, symbol="OK"):
    print(f"[{symbol}] {msg}")

def check_direct_db():
    log("1. SQLite 직접 조회 검증 시작", "🔍")
    conn = sqlite3.connect("data/local_books/books.sqlite3")
    cur = conn.cursor()

    cur.execute("SELECT count(*) FROM books")
    books_count = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM chapters")
    chapters_count = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM paragraphs")
    paragraphs_count = cur.fetchone()[0]

    cur.execute("PRAGMA integrity_check")
    integrity = cur.fetchone()[0]

    cur.execute("PRAGMA foreign_key_check")
    fk_errors = len(cur.fetchall())

    log(f"DB 통계: 도서 {books_count}권, 챕터 {chapters_count}개, 문단 {paragraphs_count}개", "📊")
    log(f"무결성: {integrity}, 외래키 오류: {fk_errors}건", "✅" if integrity == "ok" and fk_errors == 0 else "❌")

    assert books_count == 28, f"Expected 28 books, got {books_count}"
    assert chapters_count == 300, f"Expected 300 chapters, got {chapters_count}"
    assert paragraphs_count == 14963, f"Expected 14963 paragraphs, got {paragraphs_count}"
    assert integrity == "ok"
    assert fk_errors == 0

def test_api_endpoints():
    log("2. 로컬 도서 REST API 통합 테스트", "🌐")

    # 1. GET /api/books
    req = urllib.request.Request(f"{BASE_URL}/api/books")
    with urllib.request.urlopen(req) as res:
        assert res.status == 200, f"Expected 200, got {res.status}"
        data = json.loads(res.read().decode('utf-8'))
        assert data.get("ok") is True
        assert len(data.get("books", [])) == 28
        first_book = data["books"][0]
        last_book = data["books"][-1]
        log(f"GET /api/books: 28권 조회 성공 (첫권: #{first_book['book_number']} {first_book['title']}, 마지막: #{last_book['book_number']} {last_book['title']})", "✅")
        book_id_1 = first_book["id"]
        book_id_28 = last_book["id"]

    # 2. GET /api/books/:id/chapters
    with urllib.request.urlopen(f"{BASE_URL}/api/books/{book_id_1}/chapters") as res:
        assert res.status == 200
        ch_data = json.loads(res.read().decode('utf-8'))
        assert ch_data.get("ok") is True
        assert len(ch_data.get("chapters", [])) == 10
        first_chapter = ch_data["chapters"][0]
        log(f"GET /api/books/{book_id_1}/chapters: 1권 10개 챕터 조회 성공 (첫 챕터: {first_chapter['title']})", "✅")
        chapter_id_1 = first_chapter["id"]

    with urllib.request.urlopen(f"{BASE_URL}/api/books/{book_id_28}/chapters") as res:
        assert res.status == 200
        ch28_data = json.loads(res.read().decode('utf-8'))
        assert len(ch28_data.get("chapters", [])) == 11
        log(f"GET /api/books/{book_id_28}/chapters: 28권 11개 챕터 조회 성공", "✅")

    # 3. GET /api/chapters/:id/paragraphs
    with urllib.request.urlopen(f"{BASE_URL}/api/chapters/{chapter_id_1}/paragraphs") as res:
        assert res.status == 200
        par_data = json.loads(res.read().decode('utf-8'))
        assert par_data.get("ok") is True
        paragraphs = par_data.get("paragraphs", [])
        assert len(paragraphs) == 38
        p1 = paragraphs[0]["content"]
        log(f"GET /api/chapters/{chapter_id_1}/paragraphs: 38개 문단 조회 성공", "✅")
        log(f"유니코드 따옴표 본문 검증: {p1[:40]}...", "📝")
        assert "monster" in p1.lower()

    # 4. Error cases
    # 404 invalid book ID
    try:
        urllib.request.urlopen(f"{BASE_URL}/api/books/999999/chapters")
        assert False, "Expected 404"
    except urllib.error.HTTPError as e:
        assert e.code == 404
        log("잘못된 도서 ID (999999) 404 예외 처리 정상", "✅")

    # 400 non-numeric book ID
    try:
        urllib.request.urlopen(f"{BASE_URL}/api/books/invalid-id/chapters")
        assert False, "Expected 400"
    except urllib.error.HTTPError as e:
        assert e.code == 400
        log("문자열 도서 ID ('invalid-id') 400 예외 처리 정상", "✅")

    # 404 invalid chapter ID
    try:
        urllib.request.urlopen(f"{BASE_URL}/api/chapters/999999/paragraphs")
        assert False, "Expected 404"
    except urllib.error.HTTPError as e:
        assert e.code == 404
        log("잘못된 챕터 ID (999999) 404 예외 처리 정상", "✅")

    # 400 negative chapter ID
    try:
        urllib.request.urlopen(f"{BASE_URL}/api/chapters/-5/paragraphs")
        assert False, "Expected 400"
    except urllib.error.HTTPError as e:
        assert e.code == 400
        log("음수 챕터 ID (-5) 400 예외 처리 정상", "✅")

if __name__ == "__main__":
    print("=" * 70)
    print("Booky STEP 05 로컬 SQLite 원서 읽기 시스템 종합 검증")
    print("=" * 70)
    check_direct_db()
    
    # Check if server is running or start it briefly
    try:
        urllib.request.urlopen(f"{BASE_URL}/api/books", timeout=1.5)
        server_running = True
    except Exception:
        server_running = False

    server_process = None
    if not server_running:
        log("서버가 기동되어 있지 않아 백그라운드로 잠시 시작합니다...", "🚀")
        server_process = subprocess.Popen(["node", "server.ts"])
        time.sleep(3)

    try:
        test_api_endpoints()
        print("=" * 70)
        log("모든 정밀 검증 항목 100% 통과 완료!", "🎉")
        print("=" * 70)
    finally:
        if server_process:
            server_process.terminate()
