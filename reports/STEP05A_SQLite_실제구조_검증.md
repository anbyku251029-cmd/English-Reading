# STEP 05-A — SQLite 도서 데이터베이스 실제 구조 검증 보고서

- **검증 일시**: 2026-10-27
- **프로젝트**: Booky — 영어 원서 읽기 & 회화 AI 코치
- **검증 대상 파일**: `data/local_books/books.sqlite3` (크기: 2,756,608 bytes / 2.63 MB)
- **실행 환경**: Node.js v24.13.0, SQLite 3, Windows

---

## 1. 데이터베이스 기본 현황 및 무결성

| 검증 항목 | 검증 쿼리 | 결과 | 상태 |
| :--- | :--- | :---: | :---: |
| **파일 존재 여부** | 파일 시스템 점검 | 존재 확인 (2.63 MB) | 정상 ✅ |
| **SQLite 무결성** | `PRAGMA integrity_check;` | `ok` | 통과 ✅ |
| **외래 키 무결성** | `PRAGMA foreign_key_check;` | 오류 0건 | 통과 ✅ |
| **도서 총계** | `SELECT count(*) FROM books;` | **28권** | 일치 ✅ |
| **챕터(장) 총계** | `SELECT count(*) FROM chapters;` | **300개 장** | 일치 ✅ |
| **본문 문단 총계** | `SELECT count(*) FROM paragraphs;` | **14,963개 문단** | 일치 ✅ |

---

## 2. 실제 테이블 및 컬럼 스키마

### 2.1 `books` 테이블 (28 레코드)
- `id` (INTEGER, PRIMARY KEY, AutoIncrement, 실제 값: 31 ~ 58)
- `book_number` (INTEGER, 1 ~ 28)
- `title` (TEXT, NOT NULL, 예: "Dinosaurs Before Dark")
- `author` (TEXT, NOT NULL, "Mary Pope Osborne")
- `language` (TEXT, 'en')
- `source_filename` (TEXT, NOT NULL)
- `source_path` (TEXT, NOT NULL)
- `source_sha256` (TEXT, NOT NULL)
- `file_size` (INTEGER, NOT NULL)
- `import_status` (TEXT, NOT NULL, 'SUCCESS')
- `imported_at` (DATETIME, NOT NULL)
- `metadata_json` (TEXT)

### 2.2 `chapters` 테이블 (300 레코드)
- `id` (INTEGER, PRIMARY KEY, AutoIncrement, 실제 값: 258 ~ 557)
- `book_id` (INTEGER, NOT NULL, FOREIGN KEY -> `books(id)` ON DELETE CASCADE)
- `chapter_number` (INTEGER, 1부터 시작)
- `title` (TEXT, NOT NULL, 예: "1. Into the Woods")
- `sequence_number` (INTEGER, 정렬 순번)

### 2.3 `paragraphs` 테이블 (14,963 레코드)
- `id` (INTEGER, PRIMARY KEY, AutoIncrement, 실제 값: 12618 ~ 27580)
- `chapter_id` (INTEGER, NOT NULL, FOREIGN KEY -> `chapters(id)` ON DELETE CASCADE)
- `paragraph_number` (INTEGER, 1부터 시작하는 장 내 순번)
- `content` (TEXT, NOT NULL, 정제된 본문 텍스트, UTF-8 유니코드)
- `content_sha256` (TEXT, NOT NULL)

### 2.4 `import_jobs` 테이블
- `id`, `source_filename`, `started_at`, `finished_at`, `status`, `extracted_chapters`, `extracted_paragraphs`, `error_message`

---

## 3. 관계 및 식별자(ID) 주의점

1. **`books.id`와 `book_number`의 구분**:
   - `books.id`는 시스템 내부 기본키(PK)로 31번부터 58번까지 부여되어 있습니다.
   - `books.book_number`는 Magic Tree House 공식 권 번호로 1번부터 28번까지입니다.
   - `chapters.book_id`는 외래키로서 `books.id`를 참조하므로, 조회 시 `WHERE book_id = ?`로 정확히 매핑해야 합니다.
2. **정렬 원칙**:
   - 도서 목록: `ORDER BY book_number ASC`
   - 장 목록: `ORDER BY sequence_number ASC, chapter_number ASC`
   - 문단 목록: `ORDER BY paragraph_number ASC`

---

## 4. 백엔드 연동 계획 (STEP 05-B)

- Node.js v24 표준 라이브러리인 `node:sqlite`의 `DatabaseSync`를 사용하여 무거운 C++ 빌드 의존성 없이 즉시 연결합니다.
- 안전을 위해 `{ readOnly: true }` 옵션으로 열어 데이터베이스의 변경 또는 훼손을 원천 차단합니다.
- 모든 쿼리는 매개변수화된 쿼리(`prepare(sql).all(params)`)를 사용하여 SQL 인젝션을 방지합니다.
- 책 본문은 서버 터미널이나 로그에 일절 출력하지 않으며, 클라이언트 오류 시 내부 경로를 숨기고 정형화된 JSON 에러를 반환합니다.
