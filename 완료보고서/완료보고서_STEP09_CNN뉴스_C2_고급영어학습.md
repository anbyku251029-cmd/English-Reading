# 완료 보고서 #09 — CNN News C2 고급 영어 학습 카테고리 구축

**문서 번호:** BOOKY-REPORT-STEP-09  
**작성 일자:** 2026-10-27  
**작성자:** AI Agent (Antigravity)  
**프로젝트명:** Booky — 영어 원서 읽기 & 회화 AI 코치  
**작업 브랜치:** `main`  
**GitHub 저장소:** https://github.com/anbyku251029-cmd/English-Reading  

---

## 1. 작업 목적 및 변경 배경

기존 STEP 01~08을 통해 구현된 28권 매직트리하우스 영어 원서 읽기, 4단계 학습 흐름, 로컬 독서 기록, 플래시카드 표현 복습, 학습 대시보드 및 백업/복원 기능과 **완전히 독립적이면서 유기적으로 결합된 최고급 영어 학습 카테고리**인 **`CNN News English (C2 Advanced English Study)`**를 구축하였습니다.

사용자가 보유한 시사 뉴스 자료를 직접 등록하고, CEFR C2 최고 수준의 정밀 통사 구조 분석, 심층 행간 추론, C2 고급 어휘 정리, 아카데믹 영작문 및 찬반 토론 논증을 로컬 환경에서 안전하게 학습할 수 있는 종합 스튜디오를 완성하였습니다.

---

## 2. 절대 준수 원칙 이행 확인

- [x] **외부 AI 및 API 통신 0건**: Gemini, OpenAI 등 외부 AI API 호출 및 API 키 요구 일체 배제.
- [x] **개인 뉴스 자료 외부 유출 차단**: 뉴스 원문, 사용자의 문장 분석, 독해 답변, 에세이, 토론문이 외부 서버로 전송되지 않고 100% 브라우저 로컬 저장소(`localStorage`)에만 안전하게 보관.
- [x] **기존 원서 데이터 및 DB 100% 보존**: 28권 원서 SQLite DB(`books.sqlite3`, 300챕터, 14,963문단) 및 기존 독서 진행률(`booky_reading_progress`), 원서 표현 노트(`booky_saved_expressions`), 일별 학습 로그(`booky_daily_logs`) 무수정 보존.
- [x] **안전 파싱 및 XSS 차단**: HTML 파일 파싱 시 `DOMParser`를 활용하여 스크립트 실행을 원천 차단하고 `<script>`, `<style>`, `<iframe>` 등 유해 태그 완전 제거.
- [x] **가짜 데이터 및 가짜 통계 배제**: 자동 채점이나 허위 AI 점수 대신, 사용자가 직접 작성하고 수정·비교할 수 있는 구조적 학습 양식 제공.

---

## 3. 핵심 구현 내용

### 3.1 메인 화면 카테고리 분리 및 네비게이션 (`Header.tsx`, `App.tsx`)
- **카테고리 전환 탭 탑재**:
  - 📚 **28권 원서 (Magic Tree House)**: 기초~중급 4단계 AI 코칭 및 로컬 SQLite 원서 독서.
  - 📰 **CNN News (C2)**: 시사 뉴스로 배우는 CEFR C2 최고급 영어 독해·어휘·작문·토론 스튜디오.
- **시각적 아이덴티티 분리**:
  - 원서는 따뜻한 Amber/Orange 테마, CNN 뉴스는 강렬하고 품격 있는 Deep Red & Charcoal/Dark Slate 테마 적용.
  - 원서의 책 선택기, 4단계 코칭, 섀도잉 기능과 완벽히 격리되어 상호 간섭 없이 독립 구동.

### 3.2 안전한 뉴스 자료 등록 및 관리 (`CnnNewsRegisterModal.tsx`, `newsFileParser.ts`)
- **지원 파일 형식**:
  - `.txt` (일반 텍스트 줄바꿈 분할 및 첫 줄 제목 제안)
  - `.md` (마크다운 `#` 헤더 추출 및 문단 분할)
  - `.html` / `.htm` (`DOMParser` 기반 안전 텍스트 추출, `<script>`, `<style>` 등 제거, `<title>`/`<h1>` 및 `<meta>` 발행일 추출)
  - 직접 텍스트 붙여넣기 탭 제공
- **비지원 형식 친절한 안내**:
  - `.pdf`, `.docx` 업로드 시 브라우저 보안 및 표준 파서 안정성 안내와 함께 텍스트 복사 등록 유도.
  - 5MB 초과 파일 차단으로 브라우저 메모리 고갈 방지.
- **메타데이터 관리**:
  - 고유 ID, 제목, 출처(CNN 등), 기사 작성일(모를 경우 '미확인' 처리), 등록일, 주제(Politics, Economy, World, Science, Culture 등), 원문, 사용자 한국어 요약, 학습 상태(학습 전, 학습 중, 완독 완료), 문단별 메모, 원본 파일명 및 형식.

### 3.3 뉴스 목록 및 검색·필터 뷰 (`CnnNewsCategoryView.tsx`)
- 실시간 제목/본문/요약 검색창.
- 주제(Topic)별 필터, 학습 상태(not_started, in_progress, completed) 필터, 정렬(최신순, 오래된순, 가나다순).
- 뉴스 카드: 제목, 출처, 작성일, 주제 태그, 상태 뱃지, 문단 수, 분석 문장 수, 질문 답변 수 시각화.
- 기사 안전 삭제 (확인 팝업 후 해당 기사 및 하위 분석 데이터만 격리 삭제).
- C2 학습 통계 카드 바: 등록된 뉴스, 완독 뉴스, 분석 문장, C2 어휘, 질문 답변, 작문/토론문 실시간 집계.

### 3.4 C2 수준 뉴스 상세 독해 및 종합 스튜디오 (`CnnNewsReaderView.tsx`)
6개의 전문 C2 학습 탭 제공:
1. **📖 1. 원문 독해 & 문단 메모 (Reading & Paragraph Notes)**:
   - 문단별 번호(`¶1`, `¶2`...) 부여 및 Web Speech API 고음질 낭독/일시정지/정지 제어.
   - 문단별 심층 메모(`userNotes`) 작성 및 인라인 편집.
   - 문장을 클릭하면 [고급 문장 분석] 탭으로 즉시 연동.
   - 글자 크기(13px~24px) 자유 조절.
2. **🔍 2. 고급 문장 분석 (C2 Sentence Dissection)**:
   - 기사의 모든 문장 중 선택하여 9대 정밀 통사/의미 항목 직접 분석 및 저장:
     1. 영어 원문 문장 (`sentence`)
     2. 문장 구조 메모 (`sentenceStructure`: 주어/본동사, 도치, 복문 구조)
     3. 핵심 문법 (`keyGrammar`: 분사구문, 가정법 과거완료, 복합관계사 등)
     4. 접속 표현 및 논리 관계 (`logicalConnectors`: 대조, 양보, 인과)
     5. 지시어가 가리키는 내용 (`referents`: this, former/latter 등)
     6. 생략 및 행간의 함축 의미 (`implicitMeaning`: Subtext)
     7. 문장의 어조와 필자의 태도 (`toneAndAttitude`: 회의적, 경고성 등)
     8. 한국어 정밀 해석 (`koreanTranslation`)
     9. 추가 질문 및 의문점 (`questions`)
   - 분석 완료된 문장 카드 리스트 표시 및 수정/삭제 지원.
3. **❓ 3. C2 8대 독해 질문 (Critical Reading Q&A)**:
   - 1. Main Argument (핵심 주장)
   - 2. Inference (심층 문맥 추론)
   - 3. Tone and Stance (어조와 입장)
   - 4. Evidence (근거의 신뢰성과 적절성)
   - 5. Rhetorical Strategy (수사적 전략)
   - 6. Ambiguity (중의적 어휘와 행간 해석)
   - 7. Critical Evaluation (비판적 평가)
   - 8. Alternative Interpretation (대안적 시각)
   - 질문별 [나의 답변(My Answer)] 작성 및 [모범 해설/논거(Explanation)] 별도 저장.
4. **📑 4. C2 고급 어휘 노트 (Vocabulary Notes)**:
   - 단어/표현, 품사(partOfSpeech), 문맥 문장, 한국어 의미, 영영 정의(englishDefinition), 유의어/반의어, 격식 수준(Journalistic, Academic, Formal, Informal), 사용 상황, 사용자 메모 저장.
   - 기존 `KeyExpression`과 100% 호환되도록 `sourceType: 'news'`, `newsId` 속성 부여.
5. **✍️ 5. C2 작문 & 토론 (Writing & Debate)**:
   - **영작문**: 뉴스 핵심 요약(3~5문장), 입장 선택(Agree/Disagree/Neutral/Nuanced), 의견문(Argumentative Opinion Essay), 대안 제시(Alternative Proposals), 한국어 초안.
   - **토론**: 핵심 쟁점(Core Issue), 찬성 논거(Arguments For), 반대 논거(Arguments Against), 예상 반론(Counter-arguments), 재반박(Rebuttal), 최종 입장(Final Position).
6. **📊 6. 학습 통계 (Study Stats)**:
   - 본 기사의 문단 수, 분석 문장 수, 질문 답변 완료 수, 저장된 C2 어휘 수, 에세이 및 토론 논거 작성 여부 종합 표시.

### 3.5 로컬 백업 및 복원 연동 (`backupRestore.ts`, `BackupRestoreModal.tsx`)
- STEP 08 백업 파이프라인에 `cnnNewsArticles`, `cnnNewsLogs` 필드를 자동 통합.
- 백업 파일 다운로드 시 CNN 뉴스 데이터가 함께 보존되며, 복원 시에도 원서 데이터와 함께 안전하게 복원 및 롤백 지원.

---

## 4. 실제 동작 기능과 향후 개선 기능의 구분

| 구분 | 기능 항목 | 현재 동작 상태 | 비고 |
|:---:|:---|:---:|:---|
| **실제 동작** | `.txt`, `.md`, `.html` 파일 안전 파싱 및 문단 추출 | **완벽 동작** | 스크립트 실행 없는 안전 파싱 및 XSS 차단 |
| **실제 동작** | 비지원 포맷(`.pdf`, `.docx`) 안내 및 5MB 크기 제한 | **완벽 동작** | 친절한 안내 메시지 및 텍스트 붙여넣기 유도 |
| **실제 동작** | 뉴스 CRUD, 검색, 주제 필터, 상태 필터, 정렬 | **완벽 동작** | localStorage 기반 영구 저장 |
| **실제 동작** | 규칙 기반 문장 분할 (약어 오분할 방지) | **완벽 동작** | U.S., Mr., Jan. 등 20여 종 약어 보존 분할 |
| **실제 동작** | 9대 항목 C2 정밀 문장 분석 폼 및 저장 | **완벽 동작** | 문장별 카드 조회/수정/삭제 |
| **실제 동작** | 8대 C2 비판적 독해 질문 및 사용자 답변/해설 저장 | **완벽 동작** | 각 문항별 개별 저장 및 수정 |
| **실제 동작** | C2 어휘 노트 (품사, 영영정의, 유의어, 격식도) | **완벽 동작** | 기존 표현 노트와 안전 호환 연동 |
| **실제 동작** | C2 영작문 (요약, 의견문, 대안) 및 토론 (찬반, 반론, 재반박) | **완벽 동작** | 구조적 논증 프레임워크 저장 |
| **실제 동작** | Web Speech API 문단 음성 낭독/정지 | **완벽 동작** | 브라우저 내장 음성 합성 활용 |
| **실제 동작** | JSON 백업 및 복원 연동 | **완벽 동작** | CNN 뉴스 기사 및 학습 로그 포함 |
| **향후 개선** | 로컬 오프라인 PDF 텍스트 추출 라이브러리 탑재 검토 | 향후 검토 | 현재는 안전성을 위해 텍스트 복사 방식 권장 |
| **향후 개선** | 기사 본문 인라인 하이라이팅 기능 고도화 | 향후 검토 | 현재는 문장 클릭 시 분석 탭으로 다이렉트 연동 |

---

## 5. 수정 및 생성된 파일 목록

| 구분 | 파일 경로 | 변경 요약 |
|:---:|:---|:---|
| **생성** | `src/utils/newsFileParser.ts` | .txt, .md, .html 안전 파서 (DOMParser XSS 방지, 비지원 형식 차단) |
| **생성** | `src/utils/cnnNewsStorage.ts` | 기사 CRUD, 규칙 기반 문장 분할, C2 8대 질문 템플릿, C2 어휘/작문/토론/통계 저장 |
| **생성** | `src/components/cnnNews/CnnNewsRegisterModal.tsx` | 파일 업로드 및 직접 입력, 메타데이터 입력, 본문 미리보기 등록 모달 |
| **생성** | `src/components/cnnNews/CnnNewsCategoryView.tsx` | CNN News 카테고리 메인, 검색, 필터, 정렬, 통계 바, 기사 카드 그리드 |
| **생성** | `src/components/cnnNews/CnnNewsReaderView.tsx` | C2 뉴스 상세 독해 6대 탭 스튜디오 (원문/문장분석/질문답변/어휘/작문토론/통계) |
| **생성** | `scripts/verify_step09_cnn_news.py` | STEP 09 파서/스토리지/빌드 무결성 자동 검증 스크립트 |
| **수정** | `src/types.ts` | CnnNewsArticle, SentenceAnalysisItem, ReadingQuestionItem, Writing/Debate 타입 추가 |
| **수정** | `src/utils/backupRestore.ts` | 백업 및 복원 데이터에 cnnNewsArticles, cnnNewsLogs 통합 |
| **수정** | `src/components/BackupRestoreModal.tsx` | 복원 검증 미리보기 패널에 CNN 뉴스 기사 건수 추가 |
| **수정** | `src/components/Header.tsx` | 원서 ↔ CNN News 카테고리 전환 탭 및 테마 연동 |
| **수정** | `src/components/HomeDashboardModal.tsx` | 빠른 바로가기 패널에 [CNN News (C2 고급 영어)] 바로가기 버튼 추가 |
| **수정** | `src/App.tsx` | currentCategory 및 selectedNewsArticleId 상태 관리, 카테고리 뷰 전환 연동 |

---

## 6. 무결성 검증 결과

1. **자동 검증 스크립트 (`scripts/verify_step09_cnn_news.py`)**:
   - `핵심 소스 및 컴포넌트 파일 존재 확인`: **PASS**
   - `CNN 뉴스 파서, 스토리지, C2 분석, 백업 연동 Node 단위 테스트`: **PASS** (TXT/MD 파싱, PDF 거부, 5MB 차단, 약어 오분할 방지, 기사 CRUD, 문장 분석, 독해 답변, 어휘 노트, 작문/토론, 통계, 백업 유효성 100% 통과)
   - `TypeScript 타입 검사 (npx tsc --noEmit)`: **PASS** (오류 0건)
   - `Vite 프로덕션 빌드 (npm run build)`: **PASS** (1674 modules transformed, dist 정상 생성)
2. **이전 단계 기능 회귀 검증**:
   - `python scripts/verify_step08_dashboard_backup.py`: **100% PASS**
   - `python scripts/verify_step07_study_system.py`: **100% PASS**
   - `python scripts/audit_28_books_data.py`: **28권 300챕터 14,963문단 원본 100% 보존 확인**

---

## 7. 데이터 보호 및 Git 동기화 정보

- **저작권 및 보안 파일 격리 확인**:
  - `Book/` (저작권 원본 도서)
  - `data/local_books/` (`books.sqlite3` 원서 DB)
  - `.env*`, `backup/`, `dist/` 등
  - 사용자가 업로드한 CNN 뉴스 자료 및 작성된 개인 학습 노트는 Git 원격 저장소에 커밋되지 않으며 100% 로컬 브라우저에만 보관됩니다.
- **자동 동기화 스크립트**: `scripts/safe-git-sync.ps1`
- **원격 저장소**: `https://github.com/anbyku251029-cmd/English-Reading` (`origin/main`)
- **최신 Git 커밋 SHA**: b9ac8d2846dad4dd3ff405361ab3044eca789df
