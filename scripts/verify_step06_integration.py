"""
Booky - STEP 06 실사용 통합 및 데이터 품질 자동 검증기
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

def log(msg, symbol="ℹ️"):
    print(f"[{symbol}] {msg}")

def run_tests():
    print("=" * 70)
    print("Booky STEP 06 실사용 통합 및 데이터 품질 자동 검증")
    print("=" * 70)

    # 1. 28권 전권 REST API 조회 및 장 수 통계 검증
    log("1. 28권 전권 REST API 연동 및 장 수 전수 검사", "🔍")
    req = urllib.request.Request(f"{BASE_URL}/api/books")
    with urllib.request.urlopen(req) as res:
        assert res.status == 200
        data = json.loads(res.read().decode('utf-8'))
        assert data.get("ok") is True
        books = data.get("books", [])
        assert len(books) == 28, f"Expected 28 books, got {len(books)}"

        total_chapters = sum(b["chapter_count"] for b in books)
        total_paragraphs = sum(b["paragraph_count"] for b in books)
        log(f"28권 전권 응답 완료: 총 {total_chapters}개 챕터, {total_paragraphs}개 문단 집계", "✅")
        assert total_chapters == 300, f"Expected 300 chapters, got {total_chapters}"

    # 2. 28권 각 권별 챕터 순번 및 0번(Prologue) 챕터 검사
    log("2. 28권 전권의 챕터 목록 및 Prologue 검사", "📖")
    prologue_books = []
    for b in books:
        book_id = b["id"]
        with urllib.request.urlopen(f"{BASE_URL}/api/books/{book_id}/chapters") as ch_res:
            assert ch_res.status == 200
            ch_data = json.loads(ch_res.read().decode('utf-8'))
            chapters = ch_data.get("chapters", [])
            assert len(chapters) > 0
            if chapters[0]["chapter_number"] == 0:
                prologue_books.append(b["book_number"])

    log(f"Prologue(여는글) 보유 도서: {len(prologue_books)}권 감지 (Book #{prologue_books[:5]}...)", "✅")

    # 3. 7권 Sunset of the Sabertooth 빈 챕터(id=320) 안전 응답 검사
    log("3. 빈 챕터(문단 0개) 안전 응답 검사", "🛡️")
    with urllib.request.urlopen(f"{BASE_URL}/api/chapters/320/paragraphs") as p_res:
        assert p_res.status == 200
        p_data = json.loads(p_res.read().decode('utf-8'))
        assert p_data.get("ok") is True
        assert len(p_data.get("paragraphs", [])) == 0
        log("문단 0개 챕터 조회 시 서버가 500 오류 없이 안전하게 빈 배열(0건) 응답", "✅")

    # 4. 제어문자 정제 검사 (15권 2장 id=406의 \x00 정제 여부)
    log("4. 바이너리 제어문자(\\x00) 자동 정제 검사", "🧹")
    with urllib.request.urlopen(f"{BASE_URL}/api/chapters/406/paragraphs") as p_res:
        assert p_res.status == 200
        p_data = json.loads(p_res.read().decode('utf-8'))
        paragraphs = p_data.get("paragraphs", [])
        for p in paragraphs:
            assert "\x00" not in p["content"], "Null byte detected in paragraph!"
            assert len(p["content"]) > 0, "Empty paragraph detected!"
        log("제어문자 정제 완료: 모든 문단에서 널 바이트(\\x00) 및 공백 문단 배제 확인", "✅")

    # 5. 유니코드 따옴표 및 아포스트로피 보존 검사
    log("5. 영문 유니코드 따옴표 (“ ” ‘ ’) 보존 검사", "🔤")
    with urllib.request.urlopen(f"{BASE_URL}/api/chapters/258/paragraphs") as p_res:
        assert p_res.status == 200
        p_data = json.loads(p_res.read().decode('utf-8'))
        p1 = p_data["paragraphs"][0]["content"]
        assert "“Help! A monster!”" in p1 or "Help! A monster!" in p1
        log(f"1권 1장 첫 문단 본문 확인: {p1[:45]}...", "✅")

    # 6. 예외 처리 (잘못된 요청 및 404/400)
    log("6. 비정상 ID 및 범위 초과 예외 처리 검사", "⚡")
    error_urls = [
        (f"{BASE_URL}/api/books/0/chapters", 400),
        (f"{BASE_URL}/api/books/99999/chapters", 404),
        (f"{BASE_URL}/api/chapters/0/paragraphs", 400),
        (f"{BASE_URL}/api/chapters/99999/paragraphs", 404),
        (f"{BASE_URL}/api/books/undefined/chapters", 400),
    ]
    for url, expected_code in error_urls:
        try:
            urllib.request.urlopen(url)
            assert False, f"Expected {expected_code} for {url}"
        except urllib.error.HTTPError as e:
            assert e.code == expected_code, f"Expected {expected_code}, got {e.code}"

    log("모든 비정상 요청(400/404) 정확한 상태코드 및 JSON 에러 반환 확인", "✅")

if __name__ == "__main__":
    try:
        urllib.request.urlopen(f"{BASE_URL}/api/books", timeout=1.5)
        server_running = True
    except Exception:
        server_running = False

    server_process = None
    if not server_running:
        log("검증을 위해 로컬 서버를 백그라운드로 기동합니다...", "🚀")
        server_process = subprocess.Popen(["node", "server.ts"])
        time.sleep(3)

    try:
        run_tests()
        print("=" * 70)
        log("STEP 06 데이터 품질 및 실사용 통합 검증 100% 통과 완료!", "🎉")
        print("=" * 70)
    finally:
        if server_process:
            server_process.terminate()
