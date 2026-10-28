# Booky STEP 11 완료 보고서 — 실제 CNN 기사 기반 통합 영어 학습 시스템

---

## 1. 작업 목적 및 사전 조사 결과

본 작업(STEP 11)은 STEP 09의 'CNN News English' 카테고리와 STEP 10의 'Guided C2 Study' 실전 학습 파이프라인을 기반으로, 사용자가 제공한 실제 CNN 뉴스 기사 한 편(**"What to Know About Lung Nodules" / "폐 결절에 대해 알아야 할 것들"**)을 정밀 등록하고, **원문 정독(1:1 번역 대조) → 핵심 어휘 14선 → 문장 분석 → 객관식 독해 퀴즈 → 받아쓰기 → 말하기 연습 → 문장 따라 말하기(Shadowing) → 종합 복습 및 완강**까지 끊김 없는 통합 영어 학습 시스템을 구축하고 전방위 무결성을 검증하는 데 목적이 있습니다.

### 사전 조사 요약
1. **기존 기사 등록 및 읽기 기능(STEP 09)**: `src/utils/cnnNewsStorage.ts` 내에 기사 CRUD 및 8대 C2 주관식 독해 템플릿이 이미 구축되어 있어, 새로운 기사를 등록하더라도 중복 시스템을 생성하지 않고 기존 모델을 안전하게 확장할 수 있음을 확인하였습니다.
2. **5단계 실전 코스(STEP 10)**: `CnnNewsGuidedCourseModal.tsx`가 `READING`, `ANALYSIS`, `COMPREHENSION`, `WRITING`, `REVIEW`의 5단계 흐름을 제공하고 있었으며, 이번 STEP 11의 세부 학습 요소(14개 어휘, 독해 퀴즈, 받아쓰기, 스피킹, 섀도잉)를 5단계 파이프라인의 각 단계에 유기적으로 결합하여 UI의 복잡도를 낮추고 학습 흐름을 단일화하였습니다.
3. **로컬 백업 및 복원(STEP 08)**: `src/utils/backupRestore.ts`가 기사 데이터와 코스 진행도를 온전하게 백업/복원하도록 설계되어 있으며, 신규 필드(`coreVocabularies`, `comprehensionQuizzes`, `dictationQuizzes`, `speakingExercises`, `shadowingExercises`)가 없는 구버전 백업 파일 복원 시에도 자동 기본값 보강을 통해 100% 하위 호환성을 보장하도록 처리하였습니다.

---

## 2. 생성 및 수정된 핵심 파일 목록

| 구분 | 파일 경로 | 주요 역할 및 변경 내역 |
|:---|:---|:---|
| **신규** | `scripts/verify_step11_integrated_study.py` | 실제 기사 로드, 어휘 14개, 독해 퀴즈 2개 채점, 받아쓰기 정답 비교, 스피킹/섀도잉 저장, 백업 복원, AI 배제, TypeScript 및 빌드 100% 검증 스크립트 |
| **수정** | `src/types.ts` | `CnnVocabItem`, `CnnComprehensionQuiz`, `CnnDictationQuiz`, `CnnSpeakingExercise`, `CnnShadowingExercise` 인터페이스 정의 및 `CnnNewsArticle`, `GuidedCourseProgress` 확장 |
| **수정** | `src/utils/cnnNewsStorage.ts` | `SEED_ARTICLE_LUNG_NODULES` 정밀 시드 데이터 추가, `ensureSeedArticleLungNodules()` 중복 방지 등록 함수, 어휘·퀴즈·받아쓰기·스피킹·섀도잉 전용 업데이트 함수 구현 |
| **수정** | `src/components/cnnNews/CnnNewsGuidedCourseModal.tsx` | 5단계 실전 코스에 원문 1:1 번역 대조, 14개 어휘 플래시카드, 객관식 퀴즈 2문제, 받아쓰기 2문제, 말하기 연습, 4대 문장 섀도잉 및 완강 리포트 통합 |
| **수정** | `src/components/cnnNews/CnnNewsReaderView.tsx` | 기사 헤더 한국어 제목 병기 및 실전 학습 코스 진입 버튼 라벨 정비 |
| **수정** | `scripts/safe-git-sync.ps1` | Windows OneDrive 환경에서 Vite 캐시 락 예방 안전 정리 로직 보강 |

---

## 3. 기능별 구현 및 검증 결과

### 3.1 실제 CNN 기사 등록 (`CNN_LUNG_NODULES_001`)
- **기사 제목**: `What to Know About Lung Nodules` (한국어: `폐 결절에 대해 알아야 할 것들`)
- **출처**: `CNN News English`
- **본문 구성**: 총 10개 문단 (영어 원문 10문단 & 한국어 번역 10문단 1:1 완벽 매핑)
- **중복 등록 방지**: `ensureSeedArticleLungNodules()` 함수를 통해 최초 1회만 안전하게 등록되며, 동일 ID로 반복 호출 시 기존 데이터를 덮어쓰거나 중복 생성하지 않습니다.

### 3.2 핵심 어휘 14선 및 플래시카드 연동
사용자가 지정한 14개 어휘가 정확한 한국어 뜻 및 원문 사용 문장과 매핑되어 등록되었습니다:
1. `abnormal` (비정상적인) — 문단 1
2. `be diagnosed with` (~로 진단받다) — 문단 2
3. `pulmonary nodule` (폐결절) — 문단 2
4. `define as` (~으로 정의하다) — 문단 3
5. `benign` (양성의) — 문단 3
6. `cancerous` (암성의, 암이 있는) — 문단 3
7. `detection` (발견, 조기 발견) — 문단 4
8. `mass` (덩어리, 종괴) — 문단 4
9. `biopsy` (생검, 조직 검사) — 문단 5
10. `surgically` (수술로) — 문단 5
11. `resection` (절제, 절제술) — 문단 6
12. `early treatment` (조기 치료) — 문단 7
13. `be eligible for` (~의 자격이 있다, ~의 대상이 되다) — 문단 8
14. `screening` (검사) — 문단 8
- **기능**: 어휘별 암기 완료/복습 필요 토글, 개인 메모 작성 및 저장, 검색 및 상태 필터링, **"플래시카드 저장"** 버튼을 통한 STEP 07 복습 단어장 연동 완비.

### 3.3 독해 객관식 퀴즈 2문제 채점
- **문제 1**: 폐결절 조기 발견이 중요한 이유 → **정답: b (결절의 크기와 성장 여부를 확인할 수 있기 때문에)**
- **문제 2**: 폐암 검진 대상자 중 실제 검진 비율 → **정답: c (약 17~20%)**
- **기능**: 선택지 선택, 제출 시 즉시 정답/오답 판정 및 기사 본문 근거 상세 해설 노출, "다시 풀기" 초기화 기능 제공.

### 3.4 문장 받아쓰기 (Dictation) 2문제
- **문제 1**: `It's an ______ of ______ growth in the ______.` (정답 단어: `area`, `abnormal`, `lungs`)
- **문제 2**: `There are very few symptoms with early-stage ______ cancer, so finding a ______ that ends up being ______ allows for early ______.` (정답 단어: `lung`, `nodule`, `cancerous`, `treatment`)
- **기능**: 빈칸별 개별 input, 원문 TTS 듣기, 공백 제거(trim) 및 대소문자 무시(case-insensitive) 정밀 채점, 정확도(%) 산출, "정답 전체 문장 보기" 토글 및 "다시 풀기" 지원.

### 3.5 한국어 제시문 말하기 연습
- **한국어 제시문**: `생검을 하거나 수술로 제거할 수 있다.`
- **기준 영어 문장**: `It can either be biopsied or surgically removed, then tested.`
- **기능**: 기준 문장 브라우저 TTS 듣기, 마이크 녹음 시작/정지/재생/삭제(`MediaRecorder` API), 자가 영작문 및 발음 메모 작성, 완료 체크박스.
- **원칙 준수**: 가짜 AI 발음 점수를 임의로 생성하지 않으며, 음성 데이터는 외부 서버로 전송되지 않고 브라우저 세션에서 안전하게 처리됩니다.

### 3.6 문장 따라 말하기 (Shadowing 4선)
1. `It's an area of abnormal growth in the lungs.`
2. `And in the U.S., about 1.6 million patients are diagnosed with pulmonary nodules every year.`
3. `It can either be biopsied or surgically removed, then tested.`
4. `Mahajan says there are very few symptoms with early-stage lung cancer, so finding a nodule that ends up being cancerous allows for early treatment.`
- **기능**: 4문장 탭 전환, 재생 속도 조절(0.8x / 1.0x / 1.2x), 마이크 녹음 및 재생, 문장별 완료 체크.
- **명시적 안내**: "※ 본 음성은 브라우저 Web Speech 합성음(TTS)이며, CNN 실제 기자의 원본 방송 음성이 아닙니다" 문구 항시 노출.

### 3.7 STEP 10 Guided Course 5단계 통합 구조
- **1단계 (Reading & Vocab)**: 원문 10문단 정독 + 1:1 번역 대조 + 14개 핵심 어휘 플래시카드
- **2단계 (Sentence Analysis)**: 문장 선택 및 9대 통사 구조 정밀 분석
- **3단계 (Comprehension & Quiz)**: 독해 퀴즈 2문제 + C2 심층 비판적 질문 8선
- **4단계 (Writing & Debate)**: Executive Summary 영작문 + 찬반 토론 프레임워크
- **5단계 (Review & Practice)**: 받아쓰기 2문제 + 말하기 연습 + 섀도잉 4문장 + 최종 완강 확정

---

## 4. 실행한 테스트 명령 및 결과 (100% ALL PASS)

| 번호 | 테스트 스크립트 / 명령어 | 검증 내용 | 결과 |
|:---:|:---|:---|:---:|
| 1 | `python scripts/verify_step11_integrated_study.py` | STEP 11 기사, 어휘, 퀴즈, 받아쓰기, 스피킹, 백업, 빌드 | **PASS** |
| 2 | `python scripts/verify_step10_guided_course.py` | STEP 10 5단계 코스 상태 전이 및 체크리스트 회귀 검증 | **PASS** |
| 3 | `python scripts/verify_step09_cnn_news.py` | STEP 09 뉴스 파서, 스토리지, C2 분석 회귀 검증 | **PASS** |
| 4 | `python scripts/verify_step08_dashboard_backup.py` | STEP 08 학습 대시보드 및 백업/복원 회귀 검증 | **PASS** |
| 5 | `python scripts/verify_step07_study_system.py` | STEP 07 학습 통계, 표현 노트, 복습 시스템 회귀 검증 | **PASS** |
| 6 | `python scripts/audit_28_books_data.py` | 로컬 SQLite 28권 원서 DB (28권/300장/14,963문단) 무결성 감사 | **PASS** |
| 7 | `npx tsc --noEmit` | TypeScript 전체 타입 검사 (오류 0건) | **PASS** |
| 8 | `npm run build` | Vite 프로덕션 번들링 및 빌드 결과물(`dist/index.html`) 생성 | **PASS** |

---

## 5. 검증 상태 분류 (PASS / FAIL / NOT RUN)

- **PASS (자동화 및 검증 완료)**:
  - 기사 고유 ID 등록 및 중복 등록 방지 (PASS)
  - 10개 문단 영어 원문 및 한국어 번역 1:1 매핑 (PASS)
  - 핵심 어휘 14개 등록 및 조회, 뜻 매핑 (PASS)
  - 독해 퀴즈 2문제 채점(b, c) 및 오답 처리 (PASS)
  - 받아쓰기 2문제 빈칸 비교 및 정확도 계산 (PASS)
  - 말하기/섀도잉 완료 상태 저장 및 코스 연동 (PASS)
  - 로컬 백업 생성 및 복원 하위 호환성 (PASS)
  - 외부 AI API 미호출 코드 검사 (PASS)
  - 저작권 도서/DB Git 격리 (PASS)
  - TypeScript 컴파일 및 프로덕션 빌드 (PASS)
- **NOT RUN (브라우저 수동 확인 대상)**:
  - 실제 마이크 하드웨어 연결 및 OS 마이크 권한 팝업 허용 동작
  - 브라우저 스피커를 통한 실제 TTS 음성 출력 청취
  - 사용자가 녹음한 실제 WebM 오디오의 음질 및 재생 품질

---

## 6. 브라우저 수동 테스트 가이드

1. **기사 읽기 및 번역 대조**:
   - CNN 뉴스 상세 화면 상단 `[🎯 실전 C2 학습 코스 (8단계/단계별 학습)]` 버튼 클릭.
   - 1단계에서 문단 클릭 후 `[1:1 한국어 번역 대조]` 버튼을 눌러 번역문 확인.
   - `[🔊 듣기]` 버튼을 눌러 브라우저 Web Speech 음성 재생 확인.
2. **어휘 학습 및 플래시카드**:
   - 1단계 하단의 어휘 카드에서 `[✓ 암기 완료 체크]` 및 `[⭐ 플래시카드 저장]` 클릭.
   - 학습 홈의 복습 플래시카드에 정상적으로 표현이 추가되었는지 확인.
3. **독해 퀴즈 및 받아쓰기**:
   - 3단계에서 문제 1은 b, 문제 2는 c를 선택하여 제출 후 정답 및 해설 확인.
   - 5단계 받아쓰기에서 소문자로 빈칸 입력 후 `[채점하기]` 클릭하여 100% 확인.
4. **마이크 녹음 및 섀도잉**:
   - 5단계 말하기/섀도잉 섹션에서 `[🎙️ 녹음 시작]` 클릭 (브라우저 마이크 권한 '허용').
   - 녹음 정지 후 생성된 오디오 플레이어에서 재생 및 `[삭제]` 동작 확인.

---

## 7. 보안 및 저작권 엄격 격리 확인

- `Book/` (저작권 원본 도서): 안전 제외 확인
- `data/local_books/books.sqlite3`: 안전 제외 확인
- `.env*`, 개인 녹음 파일 및 백업 JSON: 안전 제외 확인
- 동기화 스크립트 `scripts/safe-git-sync.ps1`을 통한 안전 배포 완료.
