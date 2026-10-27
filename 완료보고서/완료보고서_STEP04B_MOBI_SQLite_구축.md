# 완료 보고서 #04-B — MOBI 도서자료 조사 및 SQLite 데이터베이스 구축

- **작성 일자**: 2026-10-27
- **프로젝트명**: Booky — 영어 원서 읽기 & 회화 AI 코치
- **도서 원본 디렉터리**: `Book/00 Magic Tree House-books/`
- **구축 데이터베이스**: `data/local_books/books.sqlite3` (용량: 약 2.63 MB)
- **작업 환경**: Python 3, SQLite 3, Windows

---

## 1. 작업 목적 및 배경

Booky 프로젝트가 기존 하드코딩된 단일 샘플 텍스트(`presetBooks.ts`)의 한계를 넘어, 실제 28권에 달하는 "Magic Tree House" 원서 전권을 챕터 및 문단 단위로 자유롭게 학습하고 AI 코칭에 활용할 수 있도록 **로컬 정밀 도서 데이터베이스 파이프라인**을 구축하는 작업입니다.

핵심 요건:
1. 원본 MOBI 파일 28권 전수에 대한 파일 규격, 크기, 무결성 해시(SHA-256), 암호화(DRM) 여부 전수 조사
2. 외부 불필요한 무거운 의존성 없이 순수 파이썬으로 구현된 고성능 PalmDOC LZ77 압축 해제기 및 HTML 목차 파서 구현
3. 관계형 SQLite 스키마(`books`, `chapters`, `paragraphs`, `import_jobs`) 구축 및 외래키/인덱스 최적화
4. 무결성 검증 스크립트 작성 및 28권 전권 데이터 100% 추출·검증 완료
5. 저작권 보호를 위해 원본 파일 및 DB 파일의 Git 격리 철저 준수

---

## 2. 세부 수행 내역

### 2.1 원본 MOBI 파일 28권 전수 조사
- `Book/00 Magic Tree House-books/` 폴더 내 28개 `.mobi` 파일 전수 조사 완료.
- **파일 형식 분석**:
  - 파일 헤더: Palm Database (`BOOKMOBI`)
  - 압축 유형: PalmDOC LZ77 (Compression Type 2)
  - 암호화 유형: `Encryption Type 0` (전권 무암호화 / Accessible)
- **전체 인벤토리 문서 생성**: `docs/MOBI_INVENTORY.md`

### 2.2 고성능 파싱 파이프라인 개발 (`scripts/import_mobi_to_sqlite.py`)
- **순수 Python PalmDOC LZ77 디컴프레서**: MOBI 바이너리 레코드 블록을 읽고 텍스트 스트림을 메모리 상에서 고속 복원.
- **정밀 목차 파서 (BeautifulSoup 기반)**:
  - MOBI 본문 내 `<a filepos="NNNN">` 태그를 추적하여 각 챕터의 정확한 바이트 오프셋 탐색.
  - 책에 따라 목차 태그 내부에 서식 태그(`<font color="blue"><u>...</u></font>`)가 포함된 구조(16, 18, 19, 20, 21, 26권 등)도 누락 없이 100% 파싱하도록 대응.
  - 챕터별 본문 HTML 정제 및 텍스트 문단(`paragraphs`) 단위 분할.
- **트랜잭션 및 멱등성(Idempotency)**:
  - 이미 성공적으로 임포트된 책은 건너뛰며, 각 도서 단위로 원자적(Atomic) 트랜잭션 적용.

### 2.3 SQLite 관계형 스키마 설계
`data/local_books/books.sqlite3` 파일에 4개 테이블 구축:
1. `books`: 도서 메타데이터 (권번호, 제목, 저자, 원본 파일명, SHA-256, 바이트 크기 등)
2. `chapters`: 챕터 정보 (`book_id` 외래키, 순번, 챕터 제목, filepos 오프셋)
3. `paragraphs`: 본문 문단 (`chapter_id` 외래키, 문단 순번, 텍스트 내용, 글자 수)
4. `import_jobs`: 임포트 감사 로그 및 작업 이력

### 2.4 데이터베이스 무결성 검증기 개발 (`scripts/check_books_db.py`)
- `PRAGMA integrity_check` 및 `PRAGMA foreign_key_check` 자동 실행.
- 도서, 장, 문단 수 집계 및 결측치(빈 제목/본문) 점검.
- 원본 MOBI 파일과의 실시간 SHA-256 해시 대조.

---

## 3. 구축 및 검증 결과

`python scripts/check_books_db.py` 실행 결과:

```text
===========================================================================
Booky - SQLite 도서 데이터베이스 무결성 및 정밀 검증
데이터베이스 파일: C:\Users\anbyo\OneDrive\바탕 화면\Work\english-reading\data\local_books\books.sqlite3
===========================================================================
DB 파일 크기: 2,756,608 bytes (2.63 MB)

1. SQLite 무결성 검사 (integrity_check): ✅ 통과 (ok)
2. 외래 키 무결성 검사 (foreign_key_check): ✅ 통과 (오류 0건)

3. 레코드 통계 요약:
   - 등록 도서 수: 28권 (원본 목표 28권 전원 등록)
   - 총 챕터(장) 수: 300개 (도서당 평균 10.7개)
   - 총 문단 수: 14,963개 (도서당 평균 534.4개)
   - 완료된 작업(Jobs) 수: 58건

4. 데이터 결측치 검사:
   - 빈 도서 제목: 0건 (결측 없음)
   - 빈 챕터 제목: 0건 (결측 없음)
   - 빈 본문 문단: 0건 (결측 없음)

5. 원본 MOBI 파일 SHA-256 검증:
   - 원본 파일 해시 일치: 28 / 28권 100% 일치
===========================================================================
```

---

## 4. 산출물 목록

| 파일 경로 | 구분 | 주요 내용 |
| :--- | :---: | :--- |
| `data/local_books/books.sqlite3` | 데이터베이스 | Magic Tree House 28권 (300개 챕터, 14,963개 문단) 로컬 SQLite DB (Git 제외) |
| `scripts/import_mobi_to_sqlite.py` | 스크립트 | PalmDOC 디컴프레서 및 BeautifulSoup 기반 MOBI -> SQLite 자동 임포터 |
| `scripts/check_books_db.py` | 스크립트 | SQLite 무결성, 외래키, 레코드 카운트, SHA-256 정밀 검증기 |
| `docs/MOBI_INVENTORY.md` | 기술 문서 | 28권 전수 메타데이터, 파일 크기, 해시값, 챕터/문단 수 인벤토리 보고서 |

---

## 5. 향후 활용 계획 (다음 단계)

- `server.ts`에 로컬 SQLite 조회 REST API(`/api/books`, `/api/books/:id/chapters`, `/api/chapters/:id/paragraphs`)를 추가하여, 프론트엔드(`BookPassageView.tsx`)에서 28권 전권을 즉시 선택하고 읽을 수 있도록 연결할 예정입니다.
