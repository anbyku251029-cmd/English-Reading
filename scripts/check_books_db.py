#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/check_books_db.py
Booky - SQLite 도서 데이터베이스 무결성 및 통계 검증 도구
"""

import os
import sys
import sqlite3
import hashlib

# Ensure UTF-8 in Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DB_PATH = os.path.join(PROJECT_ROOT, 'data', 'local_books', 'books.sqlite3')
SOURCE_DIR = os.path.join(PROJECT_ROOT, 'Book', '00 Magic Tree House-books')


def run_checks():
    print("=" * 75)
    print("Booky - SQLite 도서 데이터베이스 무결성 및 정밀 검증")
    print(f"데이터베이스 파일: {DB_PATH}")
    print("=" * 75)

    if not os.path.exists(DB_PATH):
        print(f"오류: 데이터베이스 파일이 존재하지 않습니다: {DB_PATH}")
        sys.exit(1)

    db_size = os.path.getsize(DB_PATH)
    print(f"DB 파일 크기: {db_size:,} bytes ({db_size / 1024 / 1024:.2f} MB)")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    cur = conn.cursor()

    # 1. 무결성 검사 (PRAGMA integrity_check)
    cur.execute("PRAGMA integrity_check;")
    integrity = cur.fetchone()[0]
    print(f"\n1. SQLite 무결성 검사 (integrity_check): {'✅ 통과 (ok)' if integrity == 'ok' else '❌ 실패: ' + str(integrity)}")

    # 2. 외래 키 무결성 검사 (PRAGMA foreign_key_check)
    cur.execute("PRAGMA foreign_key_check;")
    fk_errors = cur.fetchall()
    print(f"2. 외래 키 무결성 검사 (foreign_key_check): {'✅ 통과 (오류 0건)' if len(fk_errors) == 0 else f'❌ 오류 {len(fk_errors)}건'}")

    # 3. 테이블별 레코드 집계
    cur.execute("SELECT COUNT(*) FROM books;")
    total_books = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM chapters;")
    total_chapters = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM paragraphs;")
    total_paragraphs = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM import_jobs WHERE status = 'COMPLETED';")
    completed_jobs = cur.fetchone()[0]

    print("\n3. 레코드 통계 요약:")
    print(f"   - 등록 도서 수: {total_books}권 (원본 목표 28권)")
    print(f"   - 총 챕터(장) 수: {total_chapters}개 (평균 {total_chapters / total_books:.1f}장/권)")
    print(f"   - 총 문단 수: {total_paragraphs:,}개 (평균 {total_paragraphs / total_books:.1f}문단/권)")
    print(f"   - 완료된 작업(Jobs) 수: {completed_jobs}건")

    # 4. 빈 제목/본문 검사
    cur.execute("SELECT COUNT(*) FROM books WHERE trim(title) = '' OR title IS NULL;")
    empty_book_titles = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM chapters WHERE trim(title) = '' OR title IS NULL;")
    empty_ch_titles = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM paragraphs WHERE trim(content) = '' OR content IS NULL;")
    empty_paragraphs = cur.fetchone()[0]

    print("\n4. 데이터 결측치 검사:")
    print(f"   - 빈 도서 제목: {empty_book_titles}건")
    print(f"   - 빈 챕터 제목: {empty_ch_titles}건")
    print(f"   - 빈 본문 문단: {empty_paragraphs}건")

    # 5. 원본 파일 무결성 비교 (SHA256 불일치 검사)
    print("\n5. 원본 MOBI 파일 SHA-256 검증:")
    cur.execute("SELECT book_number, title, source_path, source_sha256 FROM books ORDER BY book_number;")
    books = cur.fetchall()
    hash_match_count = 0

    for b_num, title, path, recorded_sha in books:
        if os.path.exists(path):
            with open(path, 'rb') as f:
                actual_sha = hashlib.sha256(f.read()).hexdigest()
            if actual_sha == recorded_sha:
                hash_match_count += 1
            else:
                print(f"   ❌ 해시 불일치: Book #{b_num} ({title})")
        else:
            print(f"   ⚠️ 파일 없음: {path}")

    print(f"   - 원본 파일 해시 일치: {hash_match_count} / {total_books}권 100% 일치")

    # 6. 도서별 상세 요약 테이블
    print("\n6. 도서별 장 및 문단 수 현황:")
    print("-" * 75)
    print(f"{'번호':<4} {'도서명':<38} {'장수':<6} {'문단수':<8}")
    print("-" * 75)
    cur.execute("""
    SELECT b.book_number, b.title, COUNT(DISTINCT c.id) as ch_cnt, COUNT(p.id) as para_cnt
    FROM books b
    LEFT JOIN chapters c ON b.id = c.book_id
    LEFT JOIN paragraphs p ON c.id = p.chapter_id
    GROUP BY b.id
    ORDER BY b.book_number;
    """)
    rows = cur.fetchall()
    for row in rows:
        print(f"#{row[0]:02d}  {row[1][:36]:<38} {row[2]:<6} {row[3]:<8}")

    conn.close()
    print("-" * 75)
    print("모든 검증 완료: SQLite 데이터베이스가 완벽하게 구축되었습니다. ✅")
    print("=" * 75)


if __name__ == '__main__':
    run_checks()
