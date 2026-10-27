# 📋 완료 보고서 — STEP 03: Gemini API 실연결 검증 및 가짜 응답 제거

| 항목 | 내용 |
|---|---|
| 작업 일시 | 2026-10-27 20:37 ~ 20:44 |
| 작업 단계 | **STEP 03 — Gemini API 실연결 검증 및 가짜 응답 제거** |
| 프로젝트명 | Booky — 영어 원서 읽기 & 회화 AI 코치 (`english-reading`) |
| 기준 보고서 | `완료보고서/2026-10-27_01_프로그램_전체_검토.md`, `완료보고서_STEP01_의존성_안정화.md`, `완료보고서_STEP02_BookyChat_학습단계_연결.md` |
| 작업 환경 | Windows, Node.js `v24.13.0`, npm `11.6.2`, `@google/genai` v2.31.0 |

---

## 1. 변경 파일 및 변경 이유

| 파일 | 변경 구분 | 변경 이유 및 작업 내용 |
|---|---|---|
| **[server.ts](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/server.ts)** | 대폭 개선 | 1) **가짜 성공 응답 전면 제거**: 에러 발생 시 Magic Tree House 하드코딩 답변이나 92점 고정 점수를 반환하던 폴백 제거<br>2) **`.env.local` 우선 로딩 지원**: `fs.existsSync('.env.local')` 기반 안전한 환경 변수 주입<br>3) **체계적 오류 분류 함수 `classifyGeminiError` 도입**: `API_KEY_MISSING`(401), `API_KEY_INVALID`(401), `PERMISSION_DENIED`(403), `QUOTA_EXCEEDED`(429), `MODEL_NOT_FOUND`(404), `NETWORK_ERROR`(503) 등으로 세분화하여 일관된 JSON 반환<br>4) **보안 강화**: 요청 본문 크기 10MB → 2MB 축소, 메시지/본문 글자 수 절삭 제한, 민감한 키/스택 로그 비노출 |
| **[.env.example](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/.env.example)** | 개선 | 실제 키 대신 명확한 발급 안내(`https://aistudio.google.com/app/apikey`), `.env.local` 복사 사용법, 모델 옵션 명시 |
| **[src/App.tsx](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/App.tsx)** | 수정 | 1) `/api/chat` 및 `/api/analyze-passage` 실패 시 가짜 데이터 생성 없이 실제 에러 메시지를 `isError: true` 배지로 정직하게 표시<br>2) 원서 분석 실패 시 이전 책 데이터가 남지 않도록 `setStudyPack(null)` 처리 |
| **[src/components/BookPassageView.tsx](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/components/BookPassageView.tsx)** | 수정 | 섀도잉 평가 요청 시 `res.ok`를 엄격히 검증하여, 실패 시 임의 점수가 생성되지 않고 사용자에게 원인을 안내하도록 개선 |

---

## 2. 사용 SDK 및 모델 식별자 검증

- **Gemini SDK**: `@google/genai` (버전 `2.31.0`)
- **텍스트 모델 (`GEMINI_MODEL`)**:
  - 기본값: `gemini-2.5-flash` (Google AI Studio 최신 표준 모델)
  - 환경 변수 `GEMINI_MODEL`을 통해 변경 가능
  - *기존 코드의 `gemini-3.8-flash` 검토*: 공개 API 정식 카탈로그에 없는 버전이므로, 실제 키 사용 시 404 에러를 방지하기 위해 기본값을 안정적인 `gemini-2.5-flash`로 지정하고 환경 변수로 오버라이드할 수 있도록 개선했습니다.
- **TTS 오디오 모델 (`GEMINI_TTS_MODEL`)**: `gemini-3.8-flash-lite-tts` (환경 변수 지원)

---

## 3. 환경 변수 설정 및 보안 검사 결과

1. **`.env.local` 로드 검증**:
   - `dotenv.config()`에 이어 `.env.local`이 존재할 경우 `override: true`로 최우선 로드하도록 구현했습니다.
   - 격리 테스트를 통해 `.env.local` 파일에 키를 두었을 때 서버가 정상 인식함을 검증했습니다.
2. **Git 추적 방지**:
   - `.gitignore`의 `.env*` 및 `!.env.example` 규칙에 따라 `.env.local` 파일은 Git에 절대 커밋되지 않음을 확인했습니다.
3. **프론트엔드 번들 검사**:
   - 빌드된 클라이언트 번들(`dist/assets/*.js`)을 전체 스캔한 결과, `GEMINI_API_KEY` 및 실제 키 문자열이 **0건 (완전 비노출)**임을 확인했습니다.
4. **서버 본문 및 글자 수 제한**:
   - `express.json({ limit: '2mb' })` 적용.
   - `messages` 최대 20턴 제한, 본문 텍스트 최대 10,000자 제한, 섀도잉 문장 500자 제한 적용.

---

## 4. API별 테스트 및 오류 상황별 실제 결과

모의 문장: `"The little dog ran across the garden."`

### 4.1 테스트 1 — API 키 미설정 시 (`API_KEY_MISSING`)
서버에 API 키가 설정되지 않은 상태에서 호출한 결과입니다:

| API 엔드포인트 | HTTP 상태 | 응답 `ok` | 에러 코드 | 반환 메시지 | 가짜 데이터 여부 |
|---|---|---|---|---|---|
| `POST /api/chat` | **401** | `false` | `API_KEY_MISSING` | "Gemini API 키가 설정되지 않았습니다. 프로젝트의 .env.local 파일에 GEMINI_API_KEY를 설정해 주세요." | ❌ **반환 안 함 (정상 차단)** |
| `POST /api/analyze-passage` | **401** | `false` | `API_KEY_MISSING` | 동일 | ❌ **반환 안 함 (정상 차단)** |
| `POST /api/shadowing-feedback` | **401** | `false` | `API_KEY_MISSING` | 동일 | ❌ **92점 미생성 (정상 차단)** |
| `POST /api/tts` | **401** | `false` | `API_KEY_MISSING` | 동일 | ❌ **반환 안 함 (정상 차단)** |

### 4.2 테스트 2 — 유효하지 않은 API 키 전달 시 (`API_KEY_INVALID`)
임의의 잘못된 키(`invalid_test_key_abc123`)를 설정하고 실제 Google 엔드포인트를 호출한 결과입니다:

| API 엔드포인트 | HTTP 상태 | 응답 `ok` | 에러 코드 | 반환 메시지 |
|---|---|---|---|---|
| `POST /api/chat` | **401** | `false` | `API_KEY_INVALID` | "등록된 Gemini API 키가 유효하지 않습니다. Google AI Studio에서 올바른 키를 확인해 주세요." |
| `POST /api/analyze-passage` | **401** | `false` | `API_KEY_INVALID` | 동일 |
| `POST /api/shadowing-feedback` | **401** | `false` | `API_KEY_INVALID` | 동일 |

---

## 5. 실제 AI 응답과 모의 테스트의 명확한 구분

- ✅ **검증 완료 항목**:
  1. API 키 미설정 시 안전한 차단 및 한글 안내 (HTTP 401)
  2. 잘못된 API 키 전달 시 Google 원격 에러 식별 및 정규화 (HTTP 401)
  3. 실패 시 고정 92점 점수, Magic Tree House 예시 답변 등 **가짜 데이터 반환 경로 100% 제거**
  4. 채팅 UI 및 섀도잉 화면에서 에러를 경고 배지로 정직하게 표시하는 흐름
  5. `.env.local` 로딩 및 프론트엔드 번들 보안 무결성
  6. `npx tsc --noEmit` (에러 0건) 및 `npm run build` (빌드 정상 완료)
- ⚠️ **미검증 항목 (대기 중)**:
  - **실제 유효한 Gemini API 키를 통한 실시간 텍스트 생성**: 현재 사용자 환경에 실제 결제/무료 활성 키가 주입되지 않았으므로, 실제 유효 키 기반 라이브 생성 테스트는 사용자의 로컬 키 설정 후 동작 검증이 가능합니다. (가짜 성공으로 보고하지 않음)

---

## 6. 사용자를 위한 로컬 API 키 등록 방법 안내

실제 Gemini AI 응답을 활성화하려면 다음 순서로 키를 등록해 주세요:

1. [Google AI Studio](https://aistudio.google.com/app/apikey)에 접속하여 무료 API 키를 발급받습니다.
2. 프로젝트 루트 폴더(`english-reading`)에 `.env.local` 파일을 생성합니다.
3. 아래와 같이 입력하고 저장합니다:
   ```env
   GEMINI_API_KEY="AIzaSy로 시작하는 실제 본인의 API 키"
   ```
4. 터미널에서 `npm run dev`로 서버를 시작하면, 서버 콘솔에 `[Booky Server] Gemini API Key configured: YES`가 표시되며 실제 AI 코칭이 동작합니다.

---

## 7. 다음 단계 제안

- **STEP 04 — 정적 파일 정리 및 빌드 용량 최적화**:
  - `public/assets/aistudio/*.pdf` (28권 원서 PDF, 약 55MB)가 웹 공개 경로에 노출되는 저작권 위험 및 불필요한 빌드 용량 정리.
- **STEP 05 — TTS 보이스 설정 실연동 및 편의 기능 개선**:
  - 설정창의 보이스 선택(Kore, Puck 등)과 브라우저 음성 연동 강화.
