# Booky - AI 에이전트(Antigravity) 작업 행동 지침 및 규칙

본 파일은 Booky 프로젝트를 작업하는 AI 에이전트(Antigravity)가 상시 준수해야 하는 운영 지침입니다.

---

## 1. 언어 및 커뮤니케이션 원칙

- 모든 아티팩트, 완료 보고서, 설명, 사용자와의 대화는 **한국어로 명확하고 알기 쉽게** 작성합니다.
- 대화형 선택 모달(`ask_question`) 등이 발생할 경우 사용자의 특별한 지시가 없으면 기본값(1번)을 선택합니다.

---

## 2. 보안 및 저작권 엄격 격리 규칙 (절대 준수)

다음 파일과 디렉터리는 **어떠한 경우에도 Git 원격 저장소(`origin/main`)에 커밋하거나 푸시해서는 안 됩니다**:
- `Book/` (저작권 보호 대상인 Magic Tree House 원본 `.mobi`, `.epub`, `.pdf` 등)
- `data/local_books/` (추출된 본문 텍스트가 저장된 `books.sqlite3` 등 로컬 DB)
- `.env`, `.env.local`, `.env.*` (Gemini API 키 등 환경 변수)
- `backup/` (로컬 임시 백업 디렉터리)
- `node_modules/`, `dist/` (의존성 및 빌드 아티팩트)

위 항목들은 `.gitignore`에 등록되어 있으며, 작업 전후로 스테이징 여부를 반드시 점검합니다.

---

## 3. GitHub 안전 자동 동기화 규칙

작업(STEP)이 완료되거나 주요 코드 수정이 끝난 후에는 수동 푸시 대신 검증된 동기화 스크립트를 사용합니다:

1. **품질 검증**: TypeScript 검사(`npx tsc --noEmit`) 및 프로덕션 빌드(`npm run build`)가 100% 무결한지 확인합니다.
2. **동기화 실행**: `scripts/safe-git-sync.ps1`을 호출하여 커밋 및 GitHub 푸시를 수행합니다.
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\safe-git-sync.ps1 -CommitMessage "feat: ..."
   ```
3. **커밋 SHA 기록**: 푸시 완료 후 생성된 최신 Git 커밋 SHA를 완료 보고서와 사용자 응답에 명시합니다.

---

## 4. 완료 보고서 작성 및 보관 규칙

- 각 STEP 작업이 완료될 때마다 **완료 보고서**를 상세히 작성합니다.
- 완료 보고서는 `완료보고서/` 폴더에 생성하고, 동일한 내용을 `reports/` 폴더에도 복사하여 이중으로 보존합니다.
- 보고서에는 다음 항목이 반드시 포함되어야 합니다:
  1. 작업 목적 및 변경 배경
  2. 수정/생성된 핵심 파일 목록
  3. 무결성 검증 결과 (명령어 및 출력 로그 요약)
  4. Git 커밋 SHA 및 원격 저장소 푸시 상태
  5. 다음 단계 계획
