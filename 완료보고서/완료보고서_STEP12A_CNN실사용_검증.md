# Booky STEP 12-A — CNN 통합 학습 실사용 검증 및 결함 수정 완료 보고서

**작업 일시**: 2026-10-28  
**프로젝트명**: Booky — 영어 원서 읽기 & CNN 뉴스 영어 학습 시스템  
**대상 기사**: `CNN_LUNG_NODULES_001` (*What to Know About Lung Nodules* / 폐 결절에 대해 알아야 할 것들)  
**저장소 경로**: `C:\Users\anbyo\OneDrive\바탕 화면\Work\english-reading`  
**GitHub 저장소**: https://github.com/anbyku251029-cmd/English-Reading  

---

## 1. 조사한 실제 코드 및 주요 발견 사항 (STEP 12-A-1)

수정 착수 전 기존 소스 코드를 면밀히 조사한 결과 다음과 같은 설계 특성과 잠재적 결함을 확인했습니다:

1. **시드 데이터 중복 및 덮어쓰기 경로 조사 (`src/utils/cnnNewsStorage.ts`)**:
   - `ensureSeedArticleLungNodules()`는 `list.find(a => a.id === SEED_ARTICLE_LUNG_NODULES.id)`를 통해 기사가 이미 존재하는 경우 기존 객체를 그대로 반환하므로 중복 기사가 생성되지 않음을 확인했습니다.
   - `loadNewsArticles()`는 시드 기사 내 필드가 누락(빈 배열/undefined)되었을 때만 기본값으로 보강하며, 사용자가 작성한 메모(`userNotes`), 어휘 암기 상태(`isMemorized`), 퀴즈 응시 내역(`userSelectedOption`), 받아쓰기 답안(`userInputs`) 등 기존 사용자 데이터가 존재하면 절대 덮어쓰지 않도록 안전하게 분기되어 있음을 확인했습니다.
   - **발견된 잠재 결함**: `localStorage`에 저장된 배열 내에 `null`이나 손상된 비객체 데이터가 포함되어 있을 경우, `a.id` 참조 시 `TypeError: Cannot read properties of null` 런타임 크래시가 발생할 수 있는 위험이 있었습니다.

2. **녹음 파일의 저장 위치 및 수명 조사 (`src/components/cnnNews/CnnNewsGuidedCourseModal.tsx`)**:
   - **저장 위치 및 수명**: 녹음 파일은 `localStorage`나 `IndexedDB`에 영구 저장되지 않고, 브라우저 메모리 상의 임시 `Blob URL`(`blob:http...`)로만 유지됩니다. 따라서 페이지 새로고침이나 탭 종료 시 자동으로 무효화되는 브라우저 세션 수명을 가집니다.
   - **발견된 결함 1 (메모리 누수)**: 말하기 녹음 삭제 버튼 클릭 시 `setSpeakingAudioUrl(null)`만 호출되고 `URL.revokeObjectURL(speakingAudioUrl)`이 호출되지 않아 메모리 누수가 발생했습니다. 또한 재녹음 시 이전 Blob URL이 해제되지 않았습니다.
   - **발견된 결함 2 (섀도잉 녹음 삭제 및 해제 누락)**: 섀도잉 녹음의 경우 재녹음 시 이전 Blob URL 해제가 누락되었으며, 사용자가 녹음을 명시적으로 삭제할 수 있는 UI 및 핸들러가 없었습니다.
   - **발견된 결함 3 (미디어 스트림 트랙 미정리)**: 녹음 도중 창을 닫거나 컴포넌트가 언마운트될 때 활성 마이크 스트림(`MediaStream`)의 트랙(`stream.getTracks().forEach(t => t.stop())`)이 정리되지 않아 브라우저 탭에 마이크 점유 상태가 유지될 위험이 있었습니다.

3. **마지막 읽은 문단 위치 동기화 조사 (`src/components/cnnNews/CnnNewsReaderView.tsx`)**:
   - `CnnNewsArticle.lastReadParagraphIndex` 필드가 정의되어 있으나, 문단을 클릭하거나 음성을 청취할 때 이를 스토리지에 능동적으로 저장하고 표시해주는 UI 상호작용이 누락되어 있었습니다.

---

## 2. 수정한 파일 및 수정 이유

| 파일 경로 | 수정 내용 및 수정 이유 |
| :--- | :--- |
| `src/utils/cnnNewsStorage.ts` | **로컬 저장소 손상 데이터 방어 강화**: `loadNewsArticles()` 및 `loadNewsStudyLogs()` 파싱 시 `null`이나 비객체 원소를 안전하게 걸러내는 필터(`!!(a && typeof a === 'object' && typeof a.id === 'string')`)를 추가하여 스토리지 오염에 따른 앱 크래시 방지. `loadAllGuidedProgress()`에서 `Array.isArray` 방어 추가. |
| `src/components/cnnNews/CnnNewsGuidedCourseModal.tsx` | **녹음 메모리 누수 방지 및 리소스 라이프사이클 정리**: <br>1) `activeBlobUrlsRef`, `speakingStreamRef`, `shadowStreamRef` 도입<br>2) 재녹음 및 녹음 삭제 시 `URL.revokeObjectURL()` 즉각 호출<br>3) 섀도잉 녹음 삭제 버튼 및 핸들러 추가<br>4) 모달 닫기 및 컴포넌트 언마운트 시 모든 활성 스트림 트랙 정리(`t.stop()`) 및 발급된 Blob URL 전수 해제<br>5) 문단 클릭 및 음성 청취 시 `lastReadParagraphIndex` 영구 저장 및 모달 오픈 시 이전 위치 복원<br>6) 임시 Blob URL 세션 수명에 대한 사용자 명시 안내 문구 추가 |
| `src/components/cnnNews/CnnNewsReaderView.tsx` | **마지막 읽은 위치 추적 및 UI 표시**: 문단 낭독(TTS) 및 문장 분석 선택 시 `lastReadParagraphIndex`를 업데이트하고, 해당 문단 헤더에 `[마지막 읽은 위치]` 뱃지 렌더링. TTS 미지원 브라우저 알림 안내 추가. |

---

## 3. 기사 데이터 무결성 테스트 결과 (STEP 12-A-2)

자동화 검증 스크립트(`scripts/verify_step12a_cnn_validation.py`)를 통해 실제 Node.js 환경에서 정밀 테스트를 수행했습니다:

1. **최초 등록 및 기사 조회**: `CNN_LUNG_NODULES_001` 기사, 10개 원문 문단, 10개 한국어 번역 문단 정상 조회 확인 (**PASS**)
2. **동일 등록 함수 반복 호출 시 중복 방지**: `ensureSeedArticleLungNodules()`를 연속 3회 호출한 뒤 저장소 내 기사 목록 조회 결과, 동일 ID 기사가 정확히 1건만 유지됨을 확인 (**PASS**)
3. **사용자 메모 및 학습 기록 유지**: 문단 메모, 문장 분석, C2 8대 질문 답변, 14대 핵심 어휘 암기/메모, 퀴즈 정답, 받아쓰기 채점 결과가 로컬스토리지에 안전하게 기록되고 보존됨을 확인 (**PASS**)
4. **시드 등록/로드 과정에서의 덮어쓰기 방지**: 사용자가 수정한 데이터가 존재하는 상태에서 `ensureSeedArticleLungNodules()` 및 `loadNewsArticles()`를 재호출해도 사용자의 입력 데이터가 절대 덮어씌워지지 않고 100% 보존됨을 확인 (**PASS**)
5. **새로고침 시뮬레이션**: 브라우저 재시작(새로고침) 후에도 기사 데이터 및 Guided Course 5단계 진행 상태(`GuidedCourseProgress`)가 완벽하게 일치 유지됨 (**PASS**)
6. **손상된 저장 데이터 격리 및 복구**:
   - `[null, {id: 'valid'}, undefined]` 등 배열 내 손상된 데이터가 주입되어도 오류 없이 정상 데이터만 필터링하여 복구 로드 (**PASS**)
   - 완전히 깨진 JSON 문자열(`{invalid-json:::`)이 로컬스토리지에 들어있어도 크래시 없이 안전하게 빈 배열 반환 및 복원 (**PASS**)

---

## 4. 실제 브라우저 수동 테스트 및 검증 결과 (STEP 12-A-3)

> **안내**: 본 프로젝트의 개발 및 검증 에이전트 환경(비헤드리스 가상 터미널)의 특성에 따라, **자동화 단위/통합 테스트**를 통해 검증된 로직과 실제 물리적 하드웨어(마이크, 스피커) 및 사용자 상호작용이 요구되는 **브라우저 수동 테스트**를 명확히 구분하여 기록합니다.

| 카테고리 | 세부 검증 항목 | 자동화 검증 상태 | 브라우저 수동 테스트 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **A. 기사 읽기** | - 대상 기사(`CNN_LUNG_NODULES_001`) 오픈<br>- 영문 원문 10문단 및 한국어 1:1 번역 대조 토글<br>- 문단 선택 이동 및 마지막 읽은 위치(`lastReadParagraphIndex`) 저장/복원 | **PASS** | **NOT RUN** (실제 클릭 확인 대기) | 코드 무결성 및 상태 보존 테스트 완료 |
| **B. 어휘 14선** | - 14개 어휘 렌더링 및 검색/필터링<br>- 암기 완료/복습 필요 상태 토글<br>- 개인 단어 메모 작성 및 저장<br>- 플래시카드(STEP 07 복습 단어장) 연동 | **PASS** | **NOT RUN** (실제 클릭 확인 대기) | `updateCoreVocabItem` 및 `saveNewsExpression` 무결성 확인 |
| **C. 독해 퀴즈** | - 문제 1 (정답: `b`), 문제 2 (정답: `c`) 채점<br>- 오답 선택 시 오답 판정 및 상세 한글 해설 표시<br>- 다시 풀기 시 선택 상태 초기화 | **PASS** | **NOT RUN** (실제 클릭 확인 대기) | 단위 테스트로 100% 채점 로직 검증 완료 |
| **D. 받아쓰기** | - 문제 1 (빈칸 3개: `area`, `abnormal`, `lungs`)<br>- 문제 2 (빈칸 4개: `lung`, `nodule`, `cancerous`, `treatment`)<br>- 공백 제거(trim) 및 대소문자 무시(case-insensitive) 채점<br>- 정답 전체 문장 보기 토글 및 다시 풀기 | **PASS** | **NOT RUN** (실제 입력 확인 대기) | 정확도(%) 및 일치 판정 무결성 확인 |
| **E. 음성 (TTS)** | - 문단별 원문 듣기 버튼 클릭<br>- 재클릭 또는 모달 닫기 시 즉각 정지(`audioManager.stop()`)<br>- 음성 합성 미지원 브라우저 환경 안내 alert 처리 | **PASS** | **NOT RUN** (물리 스피커 청취 대기) | W3C `SpeechSynthesis` 표준 호출 무결성 확인 |
| **F. 마이크/녹음** | - 마이크 권한 요청 및 녹음 시작/정지<br>- 내 녹음 재생 및 녹음 삭제<br>- 다른 문장 이동 및 창 닫기 시 리소스 해제 | **PASS** | **NOT RUN** (물리 마이크 입력 대기) | `MediaRecorder` 및 Blob URL 해제 로직 구현 완료 |

---

## 5. TTS 및 마이크 녹음 리소스 안전성 검증 (STEP 12-A-4)

1. **TTS 음성 재생 안전성**:
   - `audioManager.stop()`을 재생 직전 항상 선행 호출하여 문단 간 이동이나 반복 클릭 시 음성이 겹쳐서 재생되는 현상을 원천 방지했습니다.
   - `window.speechSynthesis`를 지원하지 않는 브라우저 환경에서는 안전 안내 모달/경고를 띄우도록 처리했습니다.
   - 실제 CNN 기자의 방송 원본 오디오가 아닌 **브라우저 내장 Web Speech API 합성음(TTS)**임을 사용자 화면에 명시했습니다.
2. **녹음 데이터의 생성·삭제·수명 주기**:
   - `MediaRecorder`의 `ondataavailable` 이벤트를 통해 오디오 청크를 수집하고 `Blob`을 생성한 뒤 `URL.createObjectURL(audioBlob)`을 발급합니다.
   - 사용자가 '삭제' 버튼을 누르면 `URL.revokeObjectURL()`을 즉각 호출하고 참조를 제거하여 브라우저 메모리 누수를 완전히 차단했습니다.
   - 재녹음 시작 시에도 기존에 발급되어 있던 이전 Blob URL을 먼저 해제하도록 보강했습니다.
   - 모달이 닫히거나 컴포넌트가 언마운트될 때 활성 마이크 `MediaStream`의 모든 트랙(`stream.getTracks().forEach(t => t.stop())`)을 중단하여 마이크 점유를 즉시 해제합니다.
3. **로컬스토리지 및 백업 배제 (데이터 경량화)**:
   - 기사 데이터 객체에는 녹음 여부 플래그(`hasRecordedAudio: boolean`)만 기록되며, 용량이 큰 오디오 바이너리나 Blob URL은 절대 `localStorage`에 기록되지 않습니다.
   - 따라서 백업 파일(`booky-local-backup-*.json`) 생성 시에도 오디오 데이터가 배제되어 5MB 한도를 초과하지 않고 수십 KB 수준의 가벼운 텍스트 JSON으로 안전하게 유지됩니다.

---

## 6. 백업 및 복원 시나리오 검증 결과 (STEP 12-A-5)

1. **현재 학습 데이터 백업 생성**: C2 뉴스 기사, 14대 어휘, 퀴즈, 받아쓰기, 스피킹, Guided Course 진행도가 모두 포함된 JSON 백업 생성 확인 (**PASS**)
2. **테스트 데이터 임의 수정 후 복원**:
   - 백업 생성 후 기사 메모를 임의로 변경
   - 기존 백업 복원(`restoreLocalBackup`) 실행
   - 복원된 기사의 메모 및 어휘 암기 상태가 원래 백업 시점의 데이터와 1:1 완벽 일치함을 확인 (**PASS**)
3. **구버전 백업(STEP 08 등 CNN 데이터가 없는 백업) 복원**:
   - 구버전 백업 복원 시에도 기존 로컬 CNN 기사가 임의로 삭제되거나 손상되지 않고 안전하게 보존됨을 확인 (**PASS**)
4. **손상된 JSON 처리 및 안전한 롤백**:
   - 문법이 깨진 JSON 파일 검증 시 즉시 `isValid: false` 및 에러 반환 확인 (**PASS**)
   - 복원 직전 자동 생성되는 롤백 스냅샷(`STORAGE_KEYS.PRE_RESTORE_BACKUP`) 및 `rollbackPreRestoreBackup()` 정상 동작 확인 (**PASS**)

---

## 7. 전체 회귀 테스트 전수 검증 결과 (STEP 12-A-6)

기존 시스템(STEP 07~11) 및 빌드 환경에 대한 회귀 테스트를 전수 실행하여 100% 통과를 확인했습니다:

| 검증 스크립트 / 명령어 | 검증 대상 | 결과 | 비고 |
| :--- | :--- | :---: | :--- |
| `scripts/verify_step12a_cnn_validation.py` | STEP 12-A 무결성, 녹음 안전성, 백업/복원 | **PASS** | 신규 작성된 종합 검증 스크립트 |
| `scripts/verify_step11_integrated_study.py` | STEP 11 실제 기사 및 학습 5요소 연동 | **PASS** | 회귀 무결성 확인 |
| `scripts/verify_step10_guided_course.py` | STEP 10 단계별 코스 상태 전이 | **PASS** | 회귀 무결성 확인 |
| `scripts/verify_step09_cnn_news.py` | STEP 09 CNN 뉴스 스토리지 및 분석 | **PASS** | 회귀 무결성 확인 |
| `scripts/verify_step08_dashboard_backup.py` | STEP 08 대시보드 및 백업 유틸리티 | **PASS** | 회귀 무결성 확인 |
| `scripts/verify_step07_study_system.py` | STEP 07 독서 기록, 복습 단어장 | **PASS** | 회귀 무결성 확인 |
| `scripts/audit_28_books_data.py` | 28권 원서 SQLite 도서 데이터베이스 | **PASS** | 28권, 300장, 14,963문단 100% 온전 보존 |
| `npx tsc --noEmit` | TypeScript 전체 타입 검사 | **PASS** | 오류 0건 |
| `npm run build` | Vite 프로덕션 빌드 무결성 | **PASS** | `dist/index.html` 정상 빌드 완료 |

---

## 8. 남은 결함 및 브라우저 실사용 권장 사항

1. **남은 결함**:
   - 현재 코드 레벨에서 발견된 모든 로컬 스토리지 오염 방어, Blob URL 메모리 누수, 미디어 스트림 트랙 미해제 결함은 모두 수정 완료되었습니다.
2. **브라우저 실사용 수동 확인 권장**:
   - 실제 브라우저 환경에서 마이크 하드웨어를 연결하여 직접 발음 녹음 및 재생 음질을 점검해보실 수 있습니다.
   - OS 및 브라우저(Chrome, Edge 등)에 내장된 영문 음성 엔진(Natural Voice 등)에 따라 TTS 음색을 체감하실 수 있습니다.

---

## 9. Git 및 민감 데이터 보호 확인

- **저작권 보호 파일 격리**: `Book/` (원본 MOBI 파일) 및 `data/local_books/` (SQLite DB)는 `.gitignore`에 등록되어 있으며 Git 스테이징에 일체 포함되지 않았습니다.
- **환경 변수 및 개인 데이터 격리**: `.env*`, 개인 녹음 오디오, 테스트 JSON 등은 안전하게 격리되었습니다.
- **Git 커밋/푸시 규칙 준수**: "사용자의 명시적 허가 없이 불필요한 Git 커밋이나 푸시를 수행하지 않는다"는 원칙에 따라, 자동 푸시를 진행하지 않고 본 보고서를 먼저 제출합니다.
