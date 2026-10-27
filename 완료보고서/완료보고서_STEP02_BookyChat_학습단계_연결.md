# 📋 완료 보고서 — STEP 02: AI 코치 화면 연결 및 4단계 학습 흐름 복구

| 항목 | 내용 |
|---|---|
| 작업 일시 | 2026-10-27 20:26 ~ 20:32 |
| 작업 단계 | **STEP 02 — AI 코치 화면 연결 및 4단계 학습 흐름 복구** |
| 프로젝트명 | Booky — 영어 원서 읽기 & 회화 AI 코치 (`english-reading`) |
| 기준 보고서 | `완료보고서/2026-10-27_01_프로그램_전체_검토.md`, `완료보고서/완료보고서_STEP01_의존성_안정화.md` |
| 작업 환경 | Windows, Node.js `v24.13.0`, npm `11.6.2`, React 19, Tailwind CSS v4, Vite 8 |

---

## 1. 작업 전 코드 구조 조사 (STEP 02-A)

1. **`BookyChat.tsx` 컴포넌트 미연결 상태**:
   - `src/components/BookyChat.tsx`에 AI 코치 채팅창, 음성 녹음(STT), 추천 질문 버튼, TTS 발음 듣기 기능이 약 300줄로 완성되어 있었으나, 최상위 `src/App.tsx`에서 전혀 `import`되거나 렌더링되지 않았습니다.
2. **`Header.tsx`의 4단계 학습 인터페이스 누락**:
   - `HeaderProps`에 `currentStep?: number`, `onSelectStep?: (step: number) => void`가 정의되어 있었으나, 내부에서 구조 분해 할당조차 되지 않고 화면에 표시되지 않았습니다.
3. **`BookPassageView.tsx`와의 단계 연동 미비**:
   - `currentStep` 프로퍼티를 전달받고 있었지만, 내부 `activeTab`('reading' | 'studypack' | 'shadowing')과 동기화되지 않아 상단에서 섀도잉 단계(Step 2)를 선택해도 화면이 전환되지 않았습니다.
4. **오류 처리 방식**:
   - API 연결 실패 시 오류인지 일반 AI 코치 답변인지 시각적으로 구분되지 않고 모호하게 표시될 소지가 있었습니다.

---

## 2. 변경한 파일 및 변경 이유 (STEP 02-B, C, D)

| 파일 | 변경 구분 | 변경 이유 및 작업 내용 |
|---|---|---|
| **[src/types.ts](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/types.ts)** | 수정 | `Message` 인터페이스에 `isError?: boolean` 속성 추가 (네트워크/API 오류 안내를 정상 AI 응답과 명확히 시각적 분리) |
| **[src/components/BookyChat.tsx](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/components/BookyChat.tsx)** | 수정 | 1) `onClose?: () => void` 콜백 지원 및 헤더 닫기(`X`) 버튼 추가<br>2) `isError: true` 메시지는 장미색(Rose) 경고 테마 및 `⚠️ 연결 / 안내 메시지` 배지로 렌더링 (가짜 정상 답변으로 꾸미지 않음)<br>3) 오류 메시지에는 음성 듣기 버튼 숨김 처리 |
| **[src/components/Header.tsx](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/components/Header.tsx)** | 수정 | 1) `currentStep`, `onSelectStep`, `isChatOpen`, `onToggleChat` 연결<br>2) 데스크톱 헤더 중앙에 **4단계 학습 내비게이션 바**(1. 핵심 표현, 2. 낭독·섀도잉, 3. 회화 토론, 4. 나만의 문장) 배치<br>3) 모바일/태블릿용 가로 스크롤 단계 내비게이션 서브바 추가<br>4) 우측 상단에 실시간 **AI 코치 열기/닫기 토글 버튼** 추가 |
| **[src/components/BookPassageView.tsx](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/components/BookPassageView.tsx)** | 수정 | `currentStep` 변화 시 화면 자동 전환 `useEffect` 추가:<br>- Step 2 선택 시 '섀도잉 스튜디오'(`shadowing`) 탭으로 자동 이동<br>- Step 1 선택 시 '원서 분석 & 표현'(`studypack`) 탭으로 복귀 |
| **[src/App.tsx](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/App.tsx)** | 수정 | 1) `BookyChat` 컴포넌트 임포트 및 화면 렌더링 연결<br>2) `isChatOpen` 상태 추가 (기본 열림)<br>3) **데스크톱 화면**: 7:5 비율 분할 레이아웃 (왼쪽: 원서 본문 및 낭독 뷰, 오른쪽: AI 코치 Booky 패널)<br>4) **모바일/작은 화면**: 원서 독서를 방해하지 않는 우측 슬라이드오버 서랍(Drawer) 패널 및 플로팅 열기 버튼 제공<br>5) 패널을 닫아도 대화 기록, 책/챕터 상태, 폰트 크기, 스크롤 위치가 100% 보존됨<br>6) 섀도잉 완료 시 또는 Step 3/4 전환 시 자동으로 AI 코치 창이 열리도록 연동 |
| **[tsconfig.json](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/tsconfig.json)** | 수정 | `exclude`에 `"backup"`, `"node_modules"` 추가 (안전한 백업 폴더 생성 시 타입 컴파일러 충돌 방지) |

---

## 3. 세부 기능 구현 결과

### 3.1 BookyChat 화면 연결 결과 (STEP 02-B)
- **데스크톱**: `max-w-7xl` 와이드 레이아웃에서 왼쪽 독서 영역(`col-span-7`), 오른쪽 AI 코치 채팅 영역(`col-span-5`)으로 깔끔하게 배치되었습니다.
- **모바일/태블릿**: 작은 화면에서 독서 화면이 찌그러지지 않도록, 필요할 때 부드럽게 열리는 모바일 오버레이 서랍(Drawer)으로 동작합니다.
- **상태 보존**: 채팅 패널을 닫거나 다시 열어도 `messages` 배열이 초기화되지 않고 유지됩니다.

### 3.2 4단계 학습 흐름 복구 및 연동 (STEP 02-D)
- **Step 1 (원서 분석 & 핵심 표현)**: 헤더 클릭 시 본문의 분석 탭이 활성화되며 Booky가 핵심 일상 표현 3가지 학습 가이드를 제시합니다.
- **Step 2 (낭독 & 섀도잉)**: 헤더 클릭 시 본문 뷰가 '섀도잉 스튜디오'로 자동 전환되며, 문장 발음 듣기 및 녹음 연습을 진행합니다.
- **Step 3 (스토리 회화 토론)**: AI 코치 패널이 자동 활성화되며, 책의 줄거리 기반 열린 질문 및 일상 롤플레잉 모드로 진입합니다.
- **Step 4 (나만의 문장 만들기)**: AI 코치가 오늘 배운 표현을 활용한 일상 영작을 유도하고 원어민 교정 피드백을 준비합니다.

### 3.3 AI 대화 및 학습 문맥 연결 (STEP 02-C)
- 사용자가 선택한 책 제목, 챕터 번호, 영문 본문 텍스트, 학습자 레벨(`beginner` / `intermediate` / `advanced`), 현재 단계(`currentStep`)가 `/api/chat` 요청 본문에 누락 없이 안전하게 전달됩니다.
- 섀도잉 연습 완료 시 "연습 완료 문장"이 AI 코치 대화창에 자동으로 전송되어 Booky가 발음/리듬 피드백을 제공할 수 있도록 연결되었습니다.

---

## 4. 실제 Gemini API 검증 및 안내 사항 (중요)

> ⚠️ **실제 AI 서버 연결 상태 안내**:
> - 현재 로컬 환경에는 유효한 `GEMINI_API_KEY` 환경 변수가 설정되어 있지 않습니다.
> - 따라서 백엔드 `server.ts`의 `Could not load default credentials` 에러 핸들러를 통해 사전에 준비된 교육용 시나리오 응답이 전달되거나 일시적 연결 오류 안내가 표시됩니다.
> - **화면 UI 연결과 채팅 데이터 흐름(클라이언트-서버 통신)은 100% 정상 작동**함을 확인하였으나, **실제 Google Gemini 클라우드 API와의 실시간 생성은 API 키 등록 후 검증이 필요**합니다. (가짜 AI 성공으로 허위 보고하지 않음)

---

## 5. 실행한 테스트 및 실제 결과 (STEP 02-F)

| 번호 | 테스트 항목 | 명령어 / 수행 방법 | 결과 |
|---|---|---|---|
| 1 | TypeScript 타입 검사 | `npx tsc --noEmit` | ✅ **Exit 0 (에러 0건)** |
| 2 | 프로덕션 번들 빌드 | `npm run build` | ✅ **Exit 0 (빌드 성공, 번들 크기 330KB JS / 48KB CSS)** |
| 3 | 번들 내 BookyChat 포함 여부 | 번들 JS 내 컴포넌트 마커 검사 | ✅ **정상 포함 (`BookyChat present: true`)** |
| 4 | 로컬 개발 서버 구동 | `tsx server.ts` (포트 3124) | ✅ **HTTP 200 OK (정상 응답)** |
| 5 | 채팅 API 엔드포인트 테스트 | `POST /api/chat` 페이로드 전송 | ✅ **정상 응답 (JSON 수신, Step 파싱 정상)** |
| 6 | 오류 메시지 시각적 분리 | `isError` 플래그 렌더링 확인 | ✅ **경고 배지 및 Rose 스타일로 정상 AI 응답과 명확히 구분** |

---

## 6. 남은 문제 및 다음 단계 제안

1. **STEP 03 — Gemini API 키 설정 및 모델명 정상화**:
   - `.env.local`에 실제 `GEMINI_API_KEY`를 설정하고, `gemini-3.8-flash` 등 모델 식별자가 최신 Google AI Studio 명세에 부합하는지 점검.
2. **STEP 04 — 정적 자산 및 저작권 파일 정리**:
   - `public/assets/aistudio/*.pdf` (28권 원서 PDF, 약 55MB)가 웹에 공개 노출되는 문제 및 빌드 용량 낭비 정리.
3. **STEP 05 — TTS 음성 설정 실연동**:
   - 브라우저 기본 음성과 서버 `/api/tts` 보이스 선택(Kore, Puck 등)의 실제 반영 구조 개선.
