# 완료 보고서 #05 — 로컬 SQLite 기반 28권 영어 원서 읽기 시스템 구축

- **작성 일자**: 2026-10-27
- **프로젝트명**: Booky — 영어 원서 읽기 & 회화 AI 코치
- **도서 데이터베이스**: `data/local_books/books.sqlite3` (2.63 MB, 28권/300장/14,963문단)
- **원격 저장소**: `https://github.com/anbyku251029-cmd/English-Reading`
- **작업 환경**: Node.js v24.13.0, TypeScript, React, Vite, Express, SQLite 3

---

## 1. 작업 개요 및 목적

본 작업(STEP 05)은 기존에 하드코딩된 단일 샘플 본문(`presetBooks.ts`)의 한계를 넘어, **로컬 SQLite에 적재된 Magic Tree House 28권 전권(총 300개 챕터, 14,963개 문단)**을 실제 화면에서 자유롭게 탐색하고 읽을 수 있는 **독서 및 학습 시스템**을 완성하는 작업입니다.

### 절대 원칙 준수 확인
1. **Gemini API 비연결**: 외부 AI API에 도서 본문이나 사용자 데이터를 일체 전송하지 않음.
2. **저작권 및 로컬 격리**: 원본 MOBI 파일 및 텍스트 DB(`books.sqlite3`)는 `.gitignore`를 통해 Git 추적에서 철저히 제외됨.
3. **읽기 전용 무결성 유지**: Node.js v24 내장 `node:sqlite`를 읽기 전용(`{ readOnly: true }`) 모드로 연결하여 원본 DB 변경을 원천 차단.
4. **기존 UI/UX 보존**: 기존의 문장 선택, 섀도잉 스튜디오, 표현 단어장, 글자 크기 조절 기능 100% 유지.

---

## 2. 세부 구현 내역

### 2.1 [STEP 05-A] SQLite 실제 구조 및 통계 정밀 검증
- DB 파일: `data/local_books/books.sqlite3` (2,756,608 bytes)
- 검증 쿼리 실행 결과:
  - `PRAGMA integrity_check`: **`ok`**
  - `PRAGMA foreign_key_check`: **오류 0건**
  - 등록 도서: **28권** (1권 ~ 28권 전권, `books.id`: 31 ~ 58)
  - 총 챕터: **300개 장** (`chapters.id`: 258 ~ 557)
  - 총 문단: **14,963개 문단** (`paragraphs.id`: 12618 ~ 27580)
- 결과 보고서 작성: [`reports/STEP05A_SQLite_실제구조_검증.md`](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/reports/STEP05A_SQLite_실제구조_검증.md)

### 2.2 [STEP 05-B] 로컬 도서 REST API 구축 (`server.ts`)
- **`GET /api/books`**:
  - 도서 번호(`book_number`) 오름차순으로 28권 전권 메타데이터(제목, 저자, 챕터 수, 문단 수) 반환.
- **`GET /api/books/:id/chapters`**:
  - 도서 기본키(`book_id`)를 검증하고 해당 도서에 속한 챕터 목록(순번, 장 제목, 문단 수)을 `sequence_number` 순서로 반환.
  - 존재하지 않거나 잘못된 ID에 대해 400/404 안전 예외 응답 처리.
- **`GET /api/chapters/:id/paragraphs`**:
  - 선택한 챕터의 실제 본문 문단들을 `paragraph_number` 순서로 반환.
  - 본문 내용은 서버 콘솔 로그에 일절 출력하지 않으며 유니코드(“ ” ‘ ’) 완벽 지원.

### 2.3 [STEP 05-C] 도서 선택 UI 구축 (`BookSelectorModal.tsx`)
- 모달 내 1순위 기본 탭으로 **"Magic Tree House 전권 (28권)"** 라이브러리 탑재.
- 실시간 도서 검색 필터(제목, 저자, 권 번호 검색) 제공.
- 도서 카드 클릭 시 아코디언 형태로 챕터 목록이 확장되며, 챕터 클릭 시 해당 장의 전체 본문이 즉시 독서실로 로드됨.
- 로딩 스피너, 에러 상태 시 재시도 버튼, 가짜 데이터 없는 정직한 UI 제공.

### 2.4 [STEP 05-D] 기존 학습 기능 및 진행 상태 연결 (`App.tsx`, `BookPassageView.tsx`)
- **localStorage 학습 진행 기록 저장 및 복구**:
  - `booky_reading_progress`: `{ bookId, chapterId, lastParagraphIndex, lastReadAt }`
  - 앱 재접속 시 마지막으로 읽던 도서와 챕터를 자동으로 복원하여 즉시 이어읽기 가능.
  - 책/장 전환 시 이전 책의 문맥이 섞이지 않도록 대화창 및 선택 상태 완전 초기화.
- 장의 처음과 끝으로 원클릭 이동하는 상/하단 스크롤 버튼 탑재.

### 2.5 [STEP 05-E] API 없는 음성 기능 (Web Speech API)
- 외부 네트워크 호출 없이 브라우저 내장 `speechSynthesis` 활용.
- 사용 가능한 영어 음성 목록을 실시간 감지하여 선택 드롭다운 제공.
- 속도 조절(0.8x, 0.92x, 1.0x, 1.2x), 전체 낭독, 일시 정지(`pause`), 이어듣기(`resume`), 정지(`stop`).
- "음성 합성은 브라우저 내장 합성기로 동작하며 실제 발음 평가와는 무관함"을 명확히 안내.

### 2.6 [STEP 05-F] API 없는 규칙 기반 학습 보조 기능
- **선택 문장 분석 도구**:
  - 실시간 단어 수 및 글자 수 카운터 (예: `14단어 (72자)`)
  - 원클릭 클립보드 복사 (`navigator.clipboard.writeText`)
  - 네이버 영어사전 원클릭 새창 검색 바로가기
  - 표현 노트(단어장) 저장 기능
- **오프라인 학습 체크리스트**:
  - 소리 내어 1회 완독하기, 핵심 표현 1개 저장하기, 섀도잉 2회 연습하기 체크리스트.
- **로컬 단어 메모장**:
  - 읽으면서 모르는 단어와 뜻을 즉시 기록하고 `localStorage`에 영구 보존.

---

## 3. 종합 검증 결과

| 검증 항목 | 실행 명령어 / 도구 | 결과 | 판정 |
| :--- | :--- | :---: | :---: |
| **TypeScript 컴파일** | `npx tsc --noEmit` | 오류 0건 | **통과 (Exit 0)** ✅ |
| **프로덕션 빌드** | `npm run build` | 616ms 빌드 완료 | **통과 (Exit 0)** ✅ |
| **SQLite DB 직접 검증** | `python scripts/verify_step05_local_system.py` | 28권/300장/14963문단, integrity ok | **통과** ✅ |
| **도서 목록 API** | `GET /api/books` | 28권 전체 반환 (200 OK) | **통과** ✅ |
| **챕터 목록 API** | `GET /api/books/31/chapters` | 1권 10개 챕터 정상 (200 OK) | **통과** ✅ |
| **문단 목록 API** | `GET /api/chapters/258/paragraphs` | 1장 38개 문단 정상 (200 OK) | **통과** ✅ |
| **예외 처리** | 404 및 400 테스트 (잘못된 ID) | 404 및 400 정확 반환 | **통과** ✅ |
| **보안 및 저작권 격리** | `git status` 및 `.gitignore` | DB 및 MOBI 파일 격리 유지 | **통과** ✅ |

---

## 4. 변경 및 생성된 핵심 파일 목록

1. **백엔드 (서버 & 스크립트)**:
   - [`server.ts`](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/server.ts): `node:sqlite` 연동 및 도서/챕터/문단 REST API 추가
   - [`scripts/verify_step05_local_system.py`](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/scripts/verify_step05_local_system.py): STEP 05 자동 정밀 검증 스크립트
2. **프론트엔드**:
   - [`src/types.ts`](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/types.ts): `LocalBook`, `LocalChapter`, `LocalParagraph`, `ReadingProgress` 인터페이스 추가
   - [`src/data/presetBooks.ts`](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/data/presetBooks.ts): `BookPreset`에 DB 필드 및 문단 배열 확장
   - [`src/components/BookSelectorModal.tsx`](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/components/BookSelectorModal.tsx): 28권 라이브러리 및 챕터 아코디언 UI 구현
   - [`src/components/BookPassageView.tsx`](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/components/BookPassageView.tsx): Web Speech 음성 제어 바, 문장 분석기, 단어 메모장, 오프라인 체크리스트 탑재
   - [`src/App.tsx`](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/App.tsx): localStorage 진행 상태 자동 복구 및 안전한 로컬 세션 전환 로직
   - [`src/utils/audio.ts`](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/utils/audio.ts): 음성 목록 조회, 일시정지, 재개 기능 확장
3. **보고서**:
   - `reports/STEP05A_SQLite_실제구조_검증.md`
   - `reports/완료보고서_STEP05_로컬_원서_읽기_시스템.md`
   - `완료보고서/완료보고서_STEP05_로컬_원서_읽기_시스템.md`
