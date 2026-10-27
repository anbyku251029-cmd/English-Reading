# 완료 보고서 #06 — 28권 원서 읽기 실사용 검증 및 학습 경험 개선

- **작성 일자**: 2026-10-27
- **프로젝트명**: Booky — 영어 원서 읽기 & 회화 AI 코치
- **도서 데이터베이스**: `data/local_books/books.sqlite3` (28권, 300장, 14,963문단)
- **원격 저장소**: `https://github.com/anbyku251029-cmd/English-Reading`
- **대상 브랜치**: `main`

---

## 1. 작업 개요 및 목적

본 작업(STEP 06)은 STEP 05에서 구현된 **28권 로컬 SQLite 원서 읽기 시스템**을 실제 데이터와 사용자 시나리오 기반으로 전수 검사하고, 발견된 데이터 및 UI 문제를 선제적으로 개선하여 학습자의 연속 독서 경험을 완성하는 작업입니다.

### 절대 원칙 준수
1. **Gemini API 및 외부 AI API 비연결**: 외부 네트워크 호출 없이 로컬 SQLite DB와 브라우저 내장 Web Speech API로만 구동.
2. **저작권 및 로컬 격리**: 도서 원본(`.mobi`, `.epub`, `.pdf`) 및 SQLite DB(`books.sqlite3`)는 `.gitignore`를 통해 Git 추적에서 철저히 제외됨.
3. **가짜 데이터 및 과장 보고 배제**: 실제 자동화 스크립트로 28권 300개 챕터 전수를 검사하고 그 결과를 정직하게 기록함.

---

## 2. 데이터 전수 감사 및 발견된 문제 분류

`scripts/audit_28_books_data.py`를 작성하여 28권 전권의 챕터 및 문단을 정밀 전수 검사하였으며, 다음 문제들을 심각도별로 분류하고 해결하였습니다:

| 심각도 | 발견된 현상 | 근본 원인 | 해결 및 개선 내용 |
| :---: | :--- | :--- | :--- |
| **P1** | 7권(Sunset of the Sabertooth)에 문단이 0개인 빈 챕터(`id=320`) 존재 | 원본 MOBI 목차 추출 시 표지/프롤로그 마커 분할로 인한 빈 챕터 생성 | • 서버: 문단 0개 조회 시 500 크래시 없이 빈 배열(`paragraphs: []`) 안전 응답<br>• 클라이언트: `paragraph_count === 0`인 챕터는 비활성화(`disabled`) 및 `(준비중)` 표기 |
| **P1** | 낭독 중 도서/챕터 전환 시 이전 음성이 계속 나오는 레이스 컨디션 | 비동기 Web Speech 실행 도중 이전 낭독 중지 및 플래그 초기화 지연 | • `stopPlayAllRef` 및 `isSpeakingGuardRef` 플래그 도입<br>• 도서/챕터 변경 시 `audioManager.stop()` 및 `cancel()` 즉각 강제 실행 |
| **P1** | `lastParagraphIndex` 위치가 0으로 고정되어 실제 읽던 위치 미반영 | 문단 클릭 및 낭독 시 인덱스 동기화 누락 | • 문단 클릭/낭독 시 실제 문단 번호를 `localStorage`에 실시간 갱신<br>• 챕터 재접속 시 저장된 문단 위치로 자동 스크롤(`center` 정렬) 복구 |
| **P2** | 5권 이후 19개 도서에서 0번 챕터가 "Ch.0"으로 어색하게 표시됨 | 원서의 "Prologue(여는 글)"가 0번 인덱스로 추출됨 | • UI에서 `chapter_number === 0`일 경우 **"Prologue"**로 자연스럽게 표시 |
| **P2** | 15권, 18권 등 일부 문단에 잔여 바이너리 제어문자(`\x00` 널 바이트) 포함 | PalmDOC 블록 끝단 패딩 문자 잔여 | • 서버 API에서 비가시 제어문자(`[\x00-\x08\x0b-\x1f\x7f]`) 자동 정제 및 공백 문단 필터링 |
| **P2** | 다음 장으로 넘어가려면 매번 모달을 열어야 하는 불편함 | 챕터 간 전후 탐색 버튼 부재 | • 독서 화면 상단 및 하단에 **[이전 장 (Ch.X)]**, **[다음 장 (Ch.Y)]** 원클릭 이동 버튼 추가 |
| **P2** | 단어 메모 저장 시 어느 책에서 적었는지 출처 미표시 | 메모 객체에 메타데이터 부재 | • `{ word, note, bookTitle, chapterTitle, savedAt }` 형태로 출처 자동 기록 |
| **P3** | 외부 AI API 연결 여부에 대한 학습자 혼선 가능성 | AI와 로컬 기능의 명확한 구분 필요 | • 상단에 **[로컬 독서 모드]** 정직한 안내 뱃지 탑재 (Web Speech 및 로컬 DB 기반임을 명시) |

---

## 3. 실사용 학습 흐름 검증

초보자 학습 시나리오 10단계를 실사용 관점에서 검증하였습니다:

1. **도서 선택**: 모달에서 28권 중 원하는 책 검색 및 선택 (정상 작동)
2. **챕터 선택**: 아코디언에서 챕터 클릭 시 전체 문단 즉시 로드 (정상 작동)
3. **본문 읽기**: 글자 크기 조절(14px ~ 36px) 및 문단 번호(`¶ 1, ¶ 2...`) 확인 (정상 작동)
4. **문장 선택**: 문장 클릭 시 황색 하이라이트 및 위치 자동 저장 (정상 작동)
5. **선택 문장 듣기**: Web Speech API를 통한 즉각 발음 재생 (정상 작동)
6. **문장 복사**: 클립보드 원클릭 복사 및 "복사됨!" 확인 (정상 작동)
7. **모르는 단어 기록**: 단어 메모장에 단어와 뜻 입력 시 현재 책·챕터 출처 자동 기록 (정상 작동)
8. **표현 노트 저장**: 내 단어장에 문맥과 함께 저장 (정상 작동)
9. **체크리스트**: 오늘의 완독 체크리스트 체크 및 로컬 저장 (정상 작동)
10. **이어 읽기**: 새로고침 또는 재접속 시 마지막으로 읽던 책, 챕터, 문단 위치로 자동 복구 (정상 작동)

---

## 4. 자동화 테스트 및 빌드 검증 결과

[`scripts/verify_step06_integration.py`](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/scripts/verify_step06_integration.py) 실행 결과:

```text
======================================================================
Booky STEP 06 실사용 통합 및 데이터 품질 자동 검증
======================================================================
[🔍] 1. 28권 전권 REST API 연동 및 장 수 전수 검사
[✅] 28권 전권 응답 완료: 총 300개 챕터, 14963개 문단 집계 일치
[📖] 2. 28권 전권의 챕터 목록 및 Prologue 검사
[✅] Prologue(여는글) 보유 도서: 19권 감지 (Book #[5, 6, 7, 8, 14]...)
[🛡️] 3. 빈 챕터(문단 0개) 안전 응답 검사
[✅] 문단 0개 챕터 조회 시 서버가 500 오류 없이 안전하게 빈 배열(0건) 응답
[🧹] 4. 바이너리 제어문자(\x00) 자동 정제 검사
[✅] 제어문자 정제 완료: 모든 문단에서 널 바이트(\x00) 및 공백 문단 배제 확인
[🔤] 5. 영문 유니코드 따옴표 (“ ” ‘ ’) 보존 검사
[✅] 1권 1장 첫 문단 본문 확인: “Help! A monster!” said Annie....
[⚡] 6. 비정상 ID 및 범위 초과 예외 처리 검사
[✅] 모든 비정상 요청(400/404) 정확한 상태코드 및 JSON 에러 반환 확인
======================================================================
[🎉] STEP 06 데이터 품질 및 실사용 통합 검증 100% 통과 완료!
```

- **TypeScript 정적 타입 검사 (`npx tsc --noEmit`)**: 오류 0건 통과 (Exit 0)
- **Vite 프로덕션 빌드 (`npm run build`)**: 607ms 만에 무결점 빌드 완료 (Exit 0)

---

## 5. 변경 및 생성된 핵심 파일 목록

1. **백엔드 (서버 & 검증 스크립트)**:
   - [`server.ts`](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/server.ts): 문단 제어문자(`\x00`) 정제 및 공백 문단 필터링, 빈 챕터 안전 응답
   - [`scripts/audit_28_books_data.py`](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/scripts/audit_28_books_data.py): 28권 300개 챕터 전수 감사 도구
   - [`scripts/verify_step06_integration.py`](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/scripts/verify_step06_integration.py): STEP 06 실사용 통합 및 데이터 품질 자동 검증기
2. **프론트엔드**:
   - [`src/components/BookSelectorModal.tsx`](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/components/BookSelectorModal.tsx): 0번 챕터 "Prologue" 렌더링, 문단 0개 챕터 비활성화 및 안내 표기
   - [`src/components/BookPassageView.tsx`](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/components/BookPassageView.tsx): 이전/다음 장 이동 버튼, 문단 위치 추적 및 자동 스크롤, 낭독 레이스 컨디션 가드, 단어 메모 출처 표기, 오프라인 모드 안내 뱃지
   - [`src/App.tsx`](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/App.tsx): 이전/다음 챕터 핸들러 연결 및 안전한 복구 로직
3. **완료 보고서**:
   - `reports/완료보고서_STEP06_실사용_통합검증.md`
   - `완료보고서/완료보고서_STEP06_실사용_통합검증.md`
