# 완료 보고서 #04-A — GitHub 안전 자동 동기화 체계 구축

- **작성 일자**: 2026-10-27
- **프로젝트명**: Booky — 영어 원서 읽기 & 회화 AI 코치
- **작업 환경**: Windows, Git for Windows, PowerShell, Node.js v24.13.0
- **원격 저장소**: `https://github.com/anbyku251029-cmd/English-Reading`
- **대상 브랜치**: `main`

---

## 1. 작업 목적 및 개요

본 작업(STEP 04-A)은 Booky 프로젝트의 변경 사항을 원격 GitHub 저장소에 안전하고 규칙적으로 반영할 수 있는 **자동 동기화 파이프라인(Safe Git Sync)**을 구축하는 작업입니다.

단순한 `git push`가 아닌, 다음 3대 필수 안전 요건을 기계적으로 강제하도록 설계되었습니다:
1. **저작권 및 보안 파일 격리**: 원본 도서 파일(`.mobi`, `.pdf`), 추출된 본문 데이터베이스(`books.sqlite3`), Gemini API 키가 담긴 환경 변수(`.env*`)의 Git 추적 원천 차단
2. **사전 품질 검증 게이트(Verification Gates)**: TypeScript 컴파일 무결성(`npx tsc --noEmit`)과 Vite 프로덕션 빌드 무결성(`npm run build`)을 사전에 통과해야만 커밋/푸시 허용
3. **재현 가능한 단일 명령어 실행**: PowerShell 기반의 자동화 스크립트 제공

---

## 2. 세부 수행 내역

### 2.1 Git 로컬 저장소 연결 및 초기화
- 로컬 작업 디렉터리에 `git init -b main`을 초기화하고 원격 저장소(`origin`)를 `https://github.com/anbyku251029-cmd/English-Reading`으로 설정.
- 원격 저장소의 최신 이력(`7aab91c`)을 `git fetch` 및 `git reset --mixed`로 연결하여 기존 로컬 작업 파일을 전혀 손상시키지 않고 안전하게 브랜치 트래킹 설정 완료.
- 원격 초기 커밋에 잘못 포함되어 있던 저작권 도서 PDF(`public/assets/aistudio/01_Dinosaurs_Before_Dark_-_Mary_Pope_Osborne_47a1ea99.pdf`)를 `git rm --cached`로 추적 해제.

### 2.2 보안 및 저작권 격리 `.gitignore` 전면 강화
- 아래 항목들을 `.gitignore`에 등록하여 향후 어떠한 작업에서도 실수로 원격에 업로드되지 않도록 차단:
  - `Book/`, `*.mobi`, `*.epub`, `*.pdf`
  - `data/local_books/`, `*.sqlite3`, `*.db`
  - `.env`, `.env.local`, `.env.*.local`
  - `backup/`, `dist/`, `node_modules/`

### 2.3 안전 동기화 스크립트 개발 (`scripts/safe-git-sync.ps1`)
- 6단계 검증 게이트 자동화:
  1. 저장소 경로 및 원격 URL 일치 확인
  2. 금지된 파일 패턴(도서, DB, 환경변수) 스테이징 여부 스캔 (발견 시 즉시 중단)
  3. `npx tsc --noEmit` 실행을 통한 TypeScript 정적 타입 검사
  4. `npm run build` 실행을 통한 Vite 프로덕션 빌드 검사 (OneDrive 환경 dist 잠김 방지 로직 포함)
  5. 검증된 소스 코드, 문서, 스크립트만 선별하여 `git add` 및 커밋 생성
  6. `git push -u origin main` 실행 및 최신 커밋 SHA 터미널 출력

### 2.4 운영 문서 및 규칙 정의
- `docs/GITHUB_AUTO_SYNC.md`: 동기화 체계 상세 아키텍처 및 명령어 실행 매뉴얼 작성.
- `AGENTS.md`: Antigravity AI 코치가 작업 시 준수해야 할 Git 동기화, 저작권 격리, 보고서 작성 행동 수칙을 루트 디렉터리에 명시.

---

## 3. 검증 결과

1. **Git 원격 드라이런(Dry-run) 검증**:
   - `git push -u origin main --dry-run` 테스트 결과 인증 및 접근 정상 확인.
2. **사전 격리 검증**:
   - `git status --porcelain` 검사 시 `Book/`, `data/local_books/`, `.env.local` 등 민감 파일이 완벽하게 무시됨을 확인.
3. **품질 검증 게이트 통과**:
   - `npx tsc --noEmit`: 오류 0건 통과.
   - `npm run build`: Exit 0 정상 빌드 완료.

---

## 4. 산출물 목록

| 파일 경로 | 구분 | 주요 내용 |
| :--- | :---: | :--- |
| `scripts/safe-git-sync.ps1` | 스크립트 | 6단계 검증 게이트가 적용된 안전 Git 동기화 PowerShell 스크립트 |
| `docs/GITHUB_AUTO_SYNC.md` | 기술 문서 | 자동 동기화 체계 원칙, 실행 방법, 보안 가이드 |
| `AGENTS.md` | 작업 규칙 | AI 어시스턴트의 Git 및 보안 상시 준수 행동 지침 |
| `.gitignore` | 설정 파일 | 도서, DB, API키, 백업 파일 제외 규칙 정의 |
