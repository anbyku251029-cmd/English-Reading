# 📋 완료 보고서 — STEP 01: 패키지 의존성 충돌 해결 및 설치 안정화

| 항목 | 내용 |
|---|---|
| 작업 일시 | 2026-10-27 20:18 ~ 20:24 |
| 작업 단계 | **STEP 01 — 패키지 의존성 충돌 해결 및 설치 안정화** |
| 프로젝트명 | Booky — 영어 원서 읽기 & 회화 AI 코치 (`english-reading`) |
| 기준 보고서 | `완료보고서/2026-10-27_01_프로그램_전체_검토.md` |
| 작업 환경 | Windows, Node.js `v24.13.0`, npm `11.6.2` |

---

## 1. 작업 개요 및 원인 분석

### 1.1 기존 문제점
- 일반적인 `npm install` 실행 시 `ERESOLVE could not resolve` 에러가 발생하여 설치가 중단되었습니다.
- **원인**:
  - `package.json`의 `devDependencies`에 `"esbuild": "^0.25.0"`이 직접 명시되어 있었습니다.
  - 최상위 빌드 도구인 `vite@^8.3.0` (실제 설치 `vite@8.3.5`)은 peerDependency로 `"esbuild": "^0.27.0 || ^0.28.0"`을 요구합니다.
  - `tsx@^4.21.0` 역시 내부적으로 `esbuild ~0.28.0`을 사용합니다.
  - 이로 인해 npm이 esbuild `0.25.x`와 `0.28.x` 간의 피어 의존성 충돌을 해결하지 못했습니다.

### 1.2 코드베이스 내 esbuild 직접 사용 여부 검증
- 프로젝트 소스 전체(`src/**/*.ts`, `src/**/*.tsx`, `server.ts` 등)를 검사한 결과, `esbuild`를 직접 `import`하거나 호출하는 코드가 **전혀 없음**을 확인했습니다.
- `esbuild`는 `vite`와 `tsx`가 내부적으로 사용하는 도구이므로, `package.json`의 직접 의존성에서 제거하는 것이 가장 안전하고 표준적인 해결책입니다.

---

## 2. 작업 전 백업 및 변경 사항

### 2.1 파일 백업
- 작업 전 원본 파일 보존을 위해 `backup/STEP01_20261027_2018/` 디렉터리에 `package.json` 및 기존 `package-lock.json`을 백업했습니다.

### 2.2 변경된 파일
1. **[package.json](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/package.json)**
   - `devDependencies`에서 불필요하게 고정되어 있던 `"esbuild": "^0.25.0"` 1줄 제거.
2. **[package-lock.json](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/package-lock.json)**
   - esbuild 충돌이 해결된 순정 의존성 트리로 새로 생성 및 정합성 일치 완료.

### 2.3 패키지 버전 변경 전/후 비교

| 패키지 | 변경 전 | 변경 후 | 비고 |
|---|---|---|---|
| `esbuild` (루트 직접 명시) | `^0.25.0` (설치: `0.25.12`) | **제거됨** | 루트에서 제거, 번들러가 자체 관리 |
| `vite` | `^8.3.0` (`8.3.5`) | `^8.3.0` (`8.3.5`) | 유지됨 |
| `tsx` 내부 `esbuild` | `0.28.2` | `0.28.2` | 유지됨 |
| `vite` 참조 `esbuild` | `0.25.12` (충돌 경고) | `0.28.2` (deduped 정상) | 충돌 완벽 해소 |

---

## 3. 검증 항목 및 실제 실행 결과

| 검증 단계 | 실행 명령 | 결과 | 상세 내용 |
|---|---|---|---|
| 1. 클린 설치 | `npm install --no-audit --no-fund` | ✅ **성공 (Exit 0)** | `--legacy-peer-deps` 없이 순수 `npm install` 정상 완료 (180개 패키지 설치) |
| 2. 의존성 트리 검사 | `npm ls --depth=0` | ✅ **성공 (Exit 0)** | 누락 또는 충돌(ELSPROBLEMS) 0건 |
| 3. esbuild 참조 검사 | `npm ls esbuild --all` | ✅ **성공 (Exit 0)** | `tsx`와 `vite` 모두 `esbuild@0.28.2`로 단일화되어 정상 링크됨 |
| 4. TypeScript 타입 검사 | `npx tsc --noEmit` | ✅ **성공 (Exit 0)** | 문법 및 타입 에러 0건 |
| 5. 프로덕션 빌드 | `npm run build` | ✅ **성공 (Exit 0)** | 879ms 만에 빌드 완료 (`dist/` 생성 정상) |
| 6. 독립 환경 클린 검증 | `C:\booky_cleancheck`에서 `npm ci` 후 빌드 3회 | ✅ **성공 (Exit 0)** | 3회 연속 빌드 성공 (재현 가능성 검증 완료) |

> 💡 **OneDrive 동기화 환경 팁**:
> 작업 디렉터리가 OneDrive 동기화 폴더 내에 위치한 경우, 이미 생성된 `dist` 파일들을 OneDrive가 실시간 클라우드 동기화 락(lock)을 걸어 Vite의 파일 덮어쓰기가 일시 방해받을 수 있습니다. 빌드 시 `dist` 폴더를 새로 비우고 진행하면 정상 동작합니다.

---

## 4. 기존 기능 영향성 평가

- **학습 기능, 화면 UI, AI 코칭 로직, 백엔드 서버 로직**: **전혀 수정하지 않음 (0건 영향)**.
- 기존 소스 코드 파일(`src/*`, `server.ts` 등)의 코드는 단 한 줄도 변경되지 않았습니다.
- 오직 의존성 선언부(`package.json`, `package-lock.json`)만 정상화하여 설치 안정성을 확보했습니다.

---

## 5. 완료 상태 및 다음 단계 안내

- **완료 여부**: ✅ **완료 (STEP 01 완료 기준 100% 충족)**
- **남은 문제 및 다음 단계 (STEP 02 제안)**:
  1. **BookyChat 화면 연결**: [BookyChat.tsx](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/components/BookyChat.tsx) 컴포넌트가 화면([App.tsx](file:///c:/Users/anbyo/OneDrive/바탕%20화면/Work/english-reading/src/App.tsx))에 렌더링되도록 연결하여 사용자가 AI 코치의 대화 및 4단계 학습 안내를 실제로 보고 소통할 수 있도록 구성.
  2. **헤더의 Step 연동**: 상단 헤더에 현재 학습 단계(Step 1~4)를 표시하고 이동할 수 있도록 연결.
