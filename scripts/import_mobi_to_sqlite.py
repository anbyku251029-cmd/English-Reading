#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/import_mobi_to_sqlite.py
Booky - MOBI 도서 자료 SQLite 데이터베이스 추출 및 구축 도구
"""

import os
import sys
import glob
import re
import struct
import hashlib
import json
import sqlite3
from datetime import datetime
from bs4 import BeautifulSoup

# Ensure stdout uses UTF-8 in Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SOURCE_DIR = os.path.join(PROJECT_ROOT, 'Book', '00 Magic Tree House-books')
DB_DIR = os.path.join(PROJECT_ROOT, 'data', 'local_books')
DB_PATH = os.path.join(DB_DIR, 'books.sqlite3')


def decompress_palmdoc(chunk: bytes) -> bytearray:
    """PalmDOC LZ77 압축 해제 알고리즘"""
    out = bytearray()
    i = 0
    n = len(chunk)
    while i < n:
        b = chunk[i]
        i += 1
        if b == 0:
            out.append(0)
        elif 1 <= b <= 8:
            out.extend(chunk[i:i + b])
            i += b
        elif b <= 0x7f:
            out.append(b)
        elif b >= 0xc0:
            out.append(32)
            out.append(b ^ 0x80)
        else:
            if i >= n:
                break
            b2 = chunk[i]
            i += 1
            distance = (((b << 8) | b2) >> 3) & 0x7ff
            length = (b2 & 7) + 3
            start = len(out) - distance
            for k in range(length):
                pos = start + k
                if 0 <= pos < len(out):
                    out.append(out[pos])
    return out


def extract_mobi_html(filepath: str) -> tuple[str, dict]:
    """MOBI 파일에서 PalmDOC 레코드를 파싱하고 압축을 풀어 전체 HTML 텍스트를 반환"""
    with open(filepath, 'rb') as f:
        data = f.read()

    num_records = struct.unpack('>H', data[76:78])[0]
    record_offsets = []
    for i in range(num_records):
        off = struct.unpack('>I', data[78 + i * 8:82 + i * 8])[0]
        record_offsets.append(off)
    record_offsets.append(len(data))

    rec0 = data[record_offsets[0]:record_offsets[1]]
    compression = struct.unpack('>H', rec0[:2])[0]
    rec_count = struct.unpack('>H', rec0[8:10])[0]

    decompressed = bytearray()
    for r in range(1, rec_count + 1):
        chunk = data[record_offsets[r]:record_offsets[r + 1]]
        if compression == 2:
            decompressed.extend(decompress_palmdoc(chunk))
        elif compression == 1:
            decompressed.extend(chunk)
        else:
            raise ValueError(f"지원되지 않는 MOBI 압축 방식: {compression}")

    html = decompressed.decode('utf-8', errors='replace')
    meta = {
        'num_records': num_records,
        'compression': compression,
        'raw_size': len(data),
        'decompressed_size': len(decompressed),
    }
    return html, meta


def parse_mobi_book_content(html: str, book_title: str):
    """
    HTML에서 Table of Contents(TOC) <a filepos="..."> 또는 장 제목 패턴을 기반으로
    장(Chapter)별 본문 문단(Paragraph)을 추출
    """
    soup = BeautifulSoup(html, 'html.parser')

    # 1. BeautifulSoup로 <a filepos="..."> 태그의 텍스트와 바이트 오프셋 추출 (font/u/b 태그 무관)
    raw_links = soup.find_all('a', attrs={'filepos': True})
    seen_pos = set()
    toc_chapters = []

    for a in raw_links:
        pos_str = a.get('filepos', '').strip()
        if not pos_str.isdigit():
            continue
        pos = int(pos_str)
        txt = re.sub(r'\s+', ' ', a.get_text()).strip()

        # 장 번호 패턴 확인 (예: Prologue, 1. Into the Woods, Chapter 1 등)
        is_chapter = bool(re.match(r'^(Prologue|\d+\.|\d+\s+|Chapter\s+\d+)', txt, re.I))
        if is_chapter and pos not in seen_pos and len(txt) < 80:
            seen_pos.add(pos)
            toc_chapters.append((pos, txt))

    toc_chapters.sort(key=lambda x: x[0])

    extracted_chapters = []

    if len(toc_chapters) >= 5:
        # filepos 기준 슬라이싱
        for idx, (start_pos, ch_title) in enumerate(toc_chapters):
            end_pos = toc_chapters[idx + 1][0] if idx + 1 < len(toc_chapters) else len(html)
            ch_html = html[start_pos:end_pos]
            ch_soup = BeautifulSoup(ch_html, 'html.parser')

            # 문단 추출 (<p> 태그 우선)
            p_tags = ch_soup.find_all('p')
            paragraphs = []
            for p in p_tags:
                txt = p.get_text().strip()
                if txt and not re.match(r'^(\[?\d+\]?|Cover|Title Page)$', txt):
                    paragraphs.append(txt)

            if len(paragraphs) < 3:
                raw_lines = [l.strip() for l in ch_soup.get_text().splitlines() if l.strip()]
                paragraphs = [l for l in raw_lines if len(l) > 15]

            # 장 번호 추출 (Prologue는 0번, 숫자는 해당 숫자)
            num_match = re.search(r'(\d+)', ch_title)
            if 'prologue' in ch_title.lower():
                ch_num = 0
            elif num_match:
                ch_num = int(num_match.group(1))
            else:
                ch_num = idx + 1

            extracted_chapters.append({
                'chapter_number': ch_num,
                'title': ch_title,
                'sequence_number': idx + 1,
                'paragraphs': paragraphs
            })
    else:
        # Fallback: 일반 텍스트 내에서 장 제목 패턴 검색
        full_text = soup.get_text()
        lines = full_text.splitlines()

        current_ch_num = 0
        current_ch_title = "Intro"
        current_paras = []
        seq = 0

        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue

            ch_m = re.match(r'^(\d+)\.\s+([A-Za-z0-9\s,\'!\?]+)$', line_str)
            if ch_m and len(line_str) < 60:
                if current_paras:
                    seq += 1
                    extracted_chapters.append({
                        'chapter_number': current_ch_num or seq,
                        'title': current_ch_title,
                        'sequence_number': seq,
                        'paragraphs': current_paras
                    })
                    current_paras = []
                current_ch_num = int(ch_m.group(1))
                current_ch_title = line_str
            else:
                if len(line_str) > 15:
                    current_paras.append(line_str)

        if current_paras:
            seq += 1
            extracted_chapters.append({
                'chapter_number': current_ch_num or seq,
                'title': current_ch_title,
                'sequence_number': seq,
                'paragraphs': current_paras
            })

    return extracted_chapters


def init_database(conn: sqlite3.Connection):
    """SQLite 데이터베이스 스키마 생성 및 외래 키 활성화"""
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = ON;")

    # 1. books 테이블
    cur.execute("""
    CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_number INTEGER UNIQUE,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        language TEXT DEFAULT 'en',
        source_filename TEXT NOT NULL,
        source_path TEXT NOT NULL,
        source_sha256 TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        import_status TEXT NOT NULL,
        imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata_json TEXT
    );
    """)

    # 2. chapters 테이블
    cur.execute("""
    CREATE TABLE IF NOT EXISTS chapters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        chapter_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        sequence_number INTEGER NOT NULL,
        CONSTRAINT unique_book_chapter UNIQUE (book_id, sequence_number)
    );
    """)

    # 3. paragraphs 테이블
    cur.execute("""
    CREATE TABLE IF NOT EXISTS paragraphs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
        paragraph_number INTEGER NOT NULL,
        content TEXT NOT NULL,
        content_sha256 TEXT NOT NULL,
        CONSTRAINT unique_chapter_para UNIQUE (chapter_id, paragraph_number)
    );
    """)

    # 4. import_jobs 테이블
    cur.execute("""
    CREATE TABLE IF NOT EXISTS import_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_filename TEXT NOT NULL,
        started_at DATETIME NOT NULL,
        finished_at DATETIME,
        status TEXT NOT NULL,
        extracted_chapters INTEGER DEFAULT 0,
        extracted_paragraphs INTEGER DEFAULT 0,
        error_message TEXT
    );
    """)

    # 인덱스 생성
    cur.execute("CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter ON paragraphs(chapter_id);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_books_sha256 ON books(source_sha256);")
    conn.commit()


def process_single_mobi(conn: sqlite3.Connection, filepath: str) -> dict:
    """단일 MOBI 파일을 파싱하고 트랜잭션 단위로 SQLite에 삽입"""
    filename = os.path.basename(filepath)
    started_at = datetime.now().isoformat()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO import_jobs (source_filename, started_at, status)
    VALUES (?, ?, 'PROCESSING')
    """, (filename, started_at))
    job_id = cur.lastrowid
    conn.commit()

    try:
        # 파일 해시 및 크기 계산
        with open(filepath, 'rb') as f:
            file_bytes = f.read()
        sha256 = hashlib.sha256(file_bytes).hexdigest()
        file_size = len(file_bytes)

        # 파일명에서 책 번호, 제목, 저자 추출
        # 예: 01 Dinosaurs Before Dark - Mary Pope Osborne.mobi
        fn_match = re.match(r'^(\d+)\s+(.+?)\s+-\s+(.+?)\.mobi$', filename, re.IGNORECASE)
        if fn_match:
            book_number = int(fn_match.group(1))
            title = fn_match.group(2).strip()
            author = fn_match.group(3).strip()
        else:
            book_number = None
            title = filename.replace('.mobi', '')
            author = "Mary Pope Osborne"

        # HTML 압축 해제 및 본문 파싱
        html, meta = extract_mobi_html(filepath)
        chapters = parse_mobi_book_content(html, title)

        if not chapters:
            raise ValueError("장(Chapter) 본문 또는 목차를 파싱하지 못했습니다.")

        # 트랜잭션 시작
        # 기존 동일 도서 확인 시 삭제 후 재삽입 (재실행 멱등성 보장)
        cur.execute("SELECT id FROM books WHERE source_sha256 = ? OR book_number = ?", (sha256, book_number))
        existing = cur.fetchone()
        if existing:
            cur.execute("DELETE FROM books WHERE id = ?", (existing[0],))

        cur.execute("""
        INSERT INTO books (
            book_number, title, author, language, source_filename,
            source_path, source_sha256, file_size, import_status, metadata_json
        ) VALUES (?, ?, ?, 'en', ?, ?, ?, ?, 'COMPLETED', ?)
        """, (
            book_number, title, author, filename,
            filepath, sha256, file_size, json.dumps(meta)
        ))
        book_id = cur.lastrowid

        total_paragraphs = 0
        for ch in chapters:
            cur.execute("""
            INSERT INTO chapters (book_id, chapter_number, title, sequence_number)
            VALUES (?, ?, ?, ?)
            """, (book_id, ch['chapter_number'], ch['title'], ch['sequence_number']))
            ch_id = cur.lastrowid

            for p_idx, para in enumerate(ch['paragraphs'], 1):
                p_hash = hashlib.sha256(para.encode('utf-8')).hexdigest()
                cur.execute("""
                INSERT INTO paragraphs (chapter_id, paragraph_number, content, content_sha256)
                VALUES (?, ?, ?, ?)
                """, (ch_id, p_idx, para, p_hash))
                total_paragraphs += 1

        finished_at = datetime.now().isoformat()
        cur.execute("""
        UPDATE import_jobs
        SET finished_at = ?, status = 'COMPLETED',
            extracted_chapters = ?, extracted_paragraphs = ?
        WHERE id = ?
        """, (finished_at, len(chapters), total_paragraphs, job_id))

        conn.commit()
        return {
            'success': True,
            'book_number': book_number,
            'title': title,
            'chapters': len(chapters),
            'paragraphs': total_paragraphs,
            'sha256': sha256
        }

    except Exception as e:
        conn.rollback()
        finished_at = datetime.now().isoformat()
        cur.execute("""
        UPDATE import_jobs
        SET finished_at = ?, status = 'FAILED', error_message = ?
        WHERE id = ?
        """, (finished_at, str(e), job_id))
        conn.commit()
        return {
            'success': False,
            'filename': filename,
            'error': str(e)
        }


def main():
    print("=" * 70)
    print("Booky - Magic Tree House MOBI -> SQLite 변환 및 구축 도구")
    print("=" * 70)

    if not os.path.exists(SOURCE_DIR):
        print(f"오류: 대상 도서 폴더를 찾을 수 없습니다: {SOURCE_DIR}")
        sys.exit(1)

    os.makedirs(DB_DIR, exist_ok=True)
    mobi_files = sorted(glob.glob(os.path.join(SOURCE_DIR, '*.mobi')))
    print(f"발견된 원본 MOBI 파일 수: {len(mobi_files)}권")
    print(f"대상 SQLite 경로: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    init_database(conn)

    # 1권 시험 가져오기 (Test Run)
    print("\n[단계 1] 제1권 시험 가져오기 (Dinosaurs Before Dark) 진행 중...")
    test_res = process_single_mobi(conn, mobi_files[0])
    if not test_res['success']:
        print(f"시험 가져오기 실패: {test_res.get('error')}")
        conn.close()
        sys.exit(1)

    print(f"  -> 시험 가져오기 성공! 도서명: {test_res['title']}, 장: {test_res['chapters']}개, 문단: {test_res['paragraphs']}개")

    # 나머지 27권 전체 가져오기 (Batch Run)
    print("\n[단계 2] 전체 도서 (총 28권) 일괄 데이터베이스 구축 진행 중...")
    success_count = 0
    fail_count = 0
    results = []

    for f in mobi_files:
        res = process_single_mobi(conn, f)
        if res['success']:
            success_count += 1
            print(f"  [성공 {res['book_number']:02d}/28] {res['title'][:32].ljust(32)} | {res['chapters']:2d}장 | {res['paragraphs']:3d}문단")
        else:
            fail_count += 1
            print(f"  [실패] {res['filename']}: {res['error']}")
        results.append(res)

    conn.close()
    print("\n" + "=" * 70)
    print(f"MOBI 도서 가져오기 완료: 총 {len(mobi_files)}권 중 성공 {success_count}권, 실패 {fail_count}권")
    print("=" * 70)


if __name__ == '__main__':
    main()
