"""
Booky - 28권 전권 데이터 무결성 및 연속성 전수 감사 스크립트
"""
import sqlite3
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

def run_audit():
    conn = sqlite3.connect('data/local_books/books.sqlite3')
    cur = conn.cursor()

    print("=== [1] 도서 목록 및 권 번호 검사 ===")
    cur.execute("SELECT id, book_number, title, author, language FROM books ORDER BY book_number")
    books = cur.fetchall()
    print(f"등록 도서 수: {len(books)}권")
    expected_numbers = list(range(1, 29))
    actual_numbers = [b[1] for b in books]
    if expected_numbers == actual_numbers:
        print("✅ 1~28권 번호가 완벽하게 연속적으로 존재합니다.")
    else:
        print("❌ 권 번호 불일치:", actual_numbers)

    print("\n=== [2] 챕터(장) 전수 검사 ===")
    cur.execute("SELECT count(*) FROM chapters")
    total_chapters = cur.fetchone()[0]
    print(f"총 챕터 수: {total_chapters}개 (예상: 300개)")

    # 빈 챕터가 있는지 검사
    cur.execute("""
        SELECT b.book_number, b.title, c.chapter_number, c.title, COUNT(p.id) as p_count
        FROM books b
        JOIN chapters c ON b.id = c.book_id
        LEFT JOIN paragraphs p ON c.id = p.chapter_id
        GROUP BY c.id
        HAVING p_count = 0
    """)
    empty_chapters = cur.fetchall()
    if not empty_chapters:
        print("✅ 문단이 0개인 빈 챕터가 존재하지 않습니다. (0건)")
    else:
        print(f"❌ 문단이 0개인 빈 챕터 발견: {len(empty_chapters)}건")

    print("\n=== [3] 문단(본문) 전수 검사 ===")
    cur.execute("SELECT count(*) FROM paragraphs")
    total_paras = cur.fetchone()[0]
    print(f"총 문단 수: {total_paras}개 (예상: 14,963개)")

    cur.execute("SELECT count(*) FROM paragraphs WHERE length(trim(content)) = 0 OR content IS NULL")
    empty_paras = cur.fetchone()[0]
    if empty_paras == 0:
        print("✅ 공백이거나 누락된 문단이 전혀 없습니다. (0건)")
    else:
        print(f"❌ 빈 문단 발견: {empty_paras}건")

    print("\n=== [4] 각 도서별 챕터 번호 연속성 검사 ===")
    broken_chapters = []
    for b in books:
        book_id = b[0]
        book_num = b[1]
        cur.execute("""
            SELECT chapter_number, sequence_number, title
            FROM chapters
            WHERE book_id = ?
            ORDER BY sequence_number, chapter_number
        """, (book_id,))
        chapters = cur.fetchall()
        ch_nums = [c[0] for c in chapters]
        expected_ch = list(range(1, len(chapters) + 1))
        if ch_nums != expected_ch:
            broken_chapters.append((book_num, b[2], ch_nums, expected_ch))

    if not broken_chapters:
        print("✅ 28권 모든 책의 챕터 번호가 1번부터 차례대로 연속 부여되어 있습니다.")
    else:
        print(f"⚠️ 챕터 번호 불연속 발견 ({len(broken_chapters)}권):")
        for bc in broken_chapters:
            print(f"   - #{bc[0]} {bc[1]}: 실제={bc[2]} vs 예상={bc[3]}")

    print("\n=== [5] 문단 번호 연속성 검사 ===")
    cur.execute("""
        SELECT chapter_id, min(paragraph_number), max(paragraph_number), count(*)
        FROM paragraphs
        GROUP BY chapter_id
        HAVING min(paragraph_number) != 1 OR max(paragraph_number) != count(*)
    """)
    broken_paras = cur.fetchall()
    if not broken_paras:
        print("✅ 300개 모든 챕터의 문단 번호가 1번부터 빈틈없이 순차 증가합니다.")
    else:
        print(f"⚠️ 문단 번호 불연속 챕터 발견: {len(broken_paras)}건")

    print("\n=== [6] 특수 유니코드 따옴표 및 글자 인코딩 표본 검사 ===")
    cur.execute("""
        SELECT id, content FROM paragraphs 
        WHERE content LIKE '%“%' OR content LIKE '%”%' OR content LIKE '%’%' OR content LIKE '%‘%'
        LIMIT 5
    """)
    samples = cur.fetchall()
    print(f"유니코드 따옴표 포함 문단 표본 (총 {len(samples)}건 확인):")
    for s in samples:
        print(f"   - [ID {s[0]}] {s[1][:60]}...")

if __name__ == "__main__":
    run_audit()
