# MOBI 도서 자료 전수 조사 및 인벤토리 (Magic Tree House #01~#28)

- **조사 일시**: 2026-10-27
- **대상 디렉터리**: `Book/00 Magic Tree House-books/`
- **대상 파일 수**: 총 28권 (.mobi)
- **저장 위치**: 로컬 SQLite 데이터베이스 (`data/local_books/books.sqlite3`)
- **저작권 격리**: 원본 도서(.mobi) 및 본문 추출 DB(.sqlite3)는 `.gitignore`를 통해 Git 추적에서 영구 제외됨.

---

## 1. 종합 요약 통계

| 항목 | 수치 | 비고 |
| :--- | :--- | :--- |
| **총 도서 수** | **28권** | Magic Tree House 시리즈 1~28권 전권 |
| **총 챕터(장) 수** | **300개** | 도서당 평균 약 10.7개 챕터 |
| **총 문단(본문 단위) 수** | **14,963개** | 도서당 평균 약 534.4개 문단 |
| **총 원본 파일 용량** | **77.2 MB** (80,950,564 bytes) | 최소 980 KB ~ 최대 4.5 MB |
| **DRM 암호화 여부** | **전권 무암호화 (Accessible)** | PalmDOC Type 2 압축, 암호화 0 (None) |
| **DB 파일 용량** | **약 2.63 MB** (2,756,608 bytes) | SQLite 3, WAL 모드 및 외래키 제약 활성화 |

---

## 2. 28권 전수 상세 인벤토리

| 권 | 도서 제목 | 저자 | 원본 파일명 | 파일 크기 | SHA-256 해시 | 챕터 | 문단 | DRM 상태 |
| :---: | :--- | :--- | :--- | :---: | :--- | :---: | :---: | :---: |
| #01 | Dinosaurs Before Dark | Mary Pope Osborne | `01 Dinosaurs Before Dark - Mary Pope Osborne.mobi` | 1.61 MB | `83befa2e50...` | 10 | 480 | 정상 (No DRM) |
| #02 | The Knight at Dawn | Mary Pope Osborne | `02 The Knight at Dawn - Mary Pope Osborne.mobi` | 3.35 MB | `0f2d6445a9...` | 10 | 519 | 정상 (No DRM) |
| #03 | Mummies in the Morning | Mary Pope Osborne | `03 Mummies in the Morning - Mary Pope Osborne.mobi` | 1.03 MB | `671f08bf11...` | 10 | 613 | 정상 (No DRM) |
| #04 | Pirates Past Noon | Mary Pope Osborne | `04 Pirates Past Noon - Mary Pope Osborne.mobi` | 3.47 MB | `df9e659893...` | 10 | 547 | 정상 (No DRM) |
| #05 | Night of the Ninjas | Mary Pope Osborne | `05 Night of the Ninjas - Mary Pope Osborne.mobi` | 3.25 MB | `b6c66fe311...` | 11 | 542 | 정상 (No DRM) |
| #06 | Afternoon on the Amazon | Mary Pope Osborne | `06 Afternoon on the Amazon - Mary Pope Osborne.mobi` | 4.21 MB | `7670e88692...` | 11 | 507 | 정상 (No DRM) |
| #07 | Sunset of the Sabertooth | Mary Pope Osborne | `07 Sunset of the Sabertooth - Mary Pope Osborne.mobi` | 0.96 MB | `5fcd5f3890...` | 12 | 536 | 정상 (No DRM) |
| #08 | Midnight on the Moon | Mary Pope Osborne | `08 Midnight on the Moon - Mary Pope Osborne.mobi` | 1.85 MB | `68d971a44e...` | 11 | 583 | 정상 (No DRM) |
| #09 | Dolphins at Daybreak | Mary Pope Osborne | `09 Dolphins at Daybreak - Mary Pope Osborne.mobi` | 3.64 MB | `d676a902f5...` | 10 | 483 | 정상 (No DRM) |
| #10 | Ghost Town at Sundown | Mary Pope Osborne | `10 Ghost Town at Sundown - Mary Pope Osborne.mobi` | 3.61 MB | `e95392d701...` | 10 | 571 | 정상 (No DRM) |
| #11 | Lions at Lunchtime | Mary Pope Osborne | `11 Lions at Lunchtime - Mary Pope Osborne.mobi` | 3.13 MB | `81386d21dc...` | 10 | 526 | 정상 (No DRM) |
| #12 | Polar Bears Past Bedtime | Mary Pope Osborne | `12 Polar Bears Past Bedtime - Mary Pope Osborne.mobi` | 2.65 MB | `8918a483a8...` | 10 | 579 | 정상 (No DRM) |
| #13 | Vacation Under the Volcano | Mary Pope Osborne | `13 Vacation Under the Volcano - Mary Pope Osborne.mobi` | 1.72 MB | `9744c29150...` | 10 | 548 | 정상 (No DRM) |
| #14 | Day of the Dragon King | Mary Pope Osborne | `14 Day of the Dragon King - Mary Pope Osborne.mobi` | 3.84 MB | `24c6657bab...` | 11 | 531 | 정상 (No DRM) |
| #15 | Viking Ships at Sunrise | Mary Pope Osborne | `15 Viking Ships at Sunrise - Mary Pope Osborne.mobi` | 2.80 MB | `a869969ab1...` | 11 | 541 | 정상 (No DRM) |
| #16 | Hour of the Olympics | Mary Pope Osborne | `16 Hour of the Olympics - Mary Pope Osborne.mobi` | 1.73 MB | `29996d8c7e...` | 11 | 604 | 정상 (No DRM) |
| #17 | Tonight on the Titanic | Mary Pope Osborne | `17 Tonight on the Titanic - Mary Pope Osborne.mobi` | 4.39 MB | `4c3cce8c26...` | 11 | 551 | 정상 (No DRM) |
| #18 | Buffalo Before Breakfast | Mary Pope Osborne | `18 Buffalo Before Breakfast - Mary Pope Osborne.mobi` | 3.08 MB | `5a9f6bf0a0...` | 11 | 580 | 정상 (No DRM) |
| #19 | Tigers at Twilight | Mary Pope Osborne | `19 Tigers at Twilight - Mary Pope Osborne.mobi` | 2.23 MB | `c1a7a3c457...` | 11 | 564 | 정상 (No DRM) |
| #20 | Dingoes at Dinnertime | Mary Pope Osborne | `20 Dingoes at Dinnertime - Mary Pope Osborne.mobi` | 2.23 MB | `1e41bdb725...` | 11 | 557 | 정상 (No DRM) |
| #21 | Civil War on Sunday | Mary Pope Osborne | `21 Civil War on Sunday - Mary Pope Osborne.mobi` | 2.00 MB | `f0b13e9a3b...` | 11 | 515 | 정상 (No DRM) |
| #22 | Revolutionary War on Wednesday | Mary Pope Osborne | `22 Revolutionary War on Wednesday - Mary Pope Osborne.mobi` | 3.19 MB | `f2e1418e66...` | 11 | 524 | 정상 (No DRM) |
| #23 | Twister on Tuesday | Mary Pope Osborne | `23 Twister on Tuesday - Mary Pope Osborne.mobi` | 2.12 MB | `9efcd83046...` | 11 | 499 | 정상 (No DRM) |
| #24 | Earthquake in the Early Morning | Mary Pope Osborne | `24 Earthquake in the Early Morning - Mary Pope Osborne.mobi` | 3.36 MB | `e092936c2d...` | 11 | 512 | 정상 (No DRM) |
| #25 | Stage Fright on a Summer Night | Mary Pope Osborne | `25 Stage Fright on a Summer Night - Mary Pope Osborne.mobi` | 3.18 MB | `29f2f629ff...` | 11 | 465 | 정상 (No DRM) |
| #26 | Good Morning, Gorillas | Mary Pope Osborne | `26 Good Morning, Gorillas - Mary Pope Osborne.mobi` | 2.05 MB | `9dc622ec7f...` | 11 | 493 | 정상 (No DRM) |
| #27 | Thanksgiving on Thursday | Mary Pope Osborne | `27 Thanksgiving on Thursday - Mary Pope Osborne.mobi` | 3.17 MB | `8393df4069...` | 11 | 499 | 정상 (No DRM) |
| #28 | High Tide in Hawaii | Mary Pope Osborne | `28 High Tide in Hawaii - Mary Pope Osborne.mobi` | 2.39 MB | `99276358e8...` | 11 | 494 | 정상 (No DRM) |

---

## 3. SQLite 데이터베이스 구조 (`books.sqlite3`)

- **테이블 1: `books`**
  - `id`: 도서 기본 키
  - `book_number`: 도서 번호 (1 ~ 28)
  - `title`: 도서명
  - `author`: 저자명
  - `language`: 도서 언어 ('en')
  - `source_filename`: 원본 파일명
  - `source_path`: 원본 파일 상대 경로
  - `source_sha256`: 원본 파일 무결성 해시
  - `file_size`: 원본 바이트 크기
  - `import_status`: 상태 ('SUCCESS')
  - `metadata_json`: 부가 메타데이터

- **테이블 2: `chapters`**
  - `id`: 챕터 기본 키
  - `book_id`: `books(id)` 외래키 (`ON DELETE CASCADE`)
  - `chapter_number`: 장 순번 (1부터 시작)
  - `title`: 장 제목 (예: "Chapter 1: Into the Woods")
  - `filepos`: MOBI 원문 바이트 오프셋 위치

- **테이블 3: `paragraphs`**
  - `id`: 문단 기본 키
  - `chapter_id`: `chapters(id)` 외래키 (`ON DELETE CASCADE`)
  - `paragraph_index`: 챕터 내 문단 순번
  - `text_content`: 정제된 영어 본문 문단 (텍스트)
  - `char_length`: 글자 수

- **테이블 4: `import_jobs`**
  - `id`: 작업 실행 로그 ID
  - `started_at`, `finished_at`, `status`, `notes`: 파이프라인 감사 및 멱등성 보장 로그

---

## 4. 파이프라인 스크립트 안내

- **임포트 스크립트**: `scripts/import_mobi_to_sqlite.py`
  - 순수 파이썬 PalmDOC LZ77 압축 해제기 내장
  - BeautifulSoup을 통한 목차(`<a filepos=...>`) 및 챕터 슬라이싱
  - 트랜잭션 단위 안전 저장 및 멱등성 보장 (기존 등록 도서 건너뛰기)
- **무결성 검증 스크립트**: `scripts/check_books_db.py`
  - `PRAGMA integrity_check` 및 `PRAGMA foreign_key_check` 수행
  - 도서/장/문단 카운트 및 원본 MOBI 해시 100% 일치 확인
