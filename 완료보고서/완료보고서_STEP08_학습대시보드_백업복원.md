# 완료 보고서 #08 — 개인 맞춤형 영어 학습 대시보드 및 로컬 데이터 백업·복원 시스템

**문서 번호:** BOOKY-REPORT-STEP-08  
**작성 일자:** 2026-10-27  
**작성자:** AI Agent (Antigravity)  
**프로젝트명:** Booky — 영어 원서 읽기 & 회화 AI 코치  
**작업 브랜치:** `main`  
**GitHub 저장소:** https://github.com/anbyku251029-cmd/English-Reading  

---

## 1. 작업 목적 및 변경 배경

STEP 01~07을 통해 패키지 의존성 안정화, 4단계 학습 흐름 및 AI 코치 화면 연결, 28권 매직트리하우스 로컬 SQLite 원서 읽기 시스템, 문장 선택/낭독/섀도잉, 로컬 학습 기록·플래시카드 표현 복습 시스템이 완성되었습니다.

이번 STEP 08에서는 사용자가 학습에 몰입하고 성취도를 실시간으로 체감할 수 있도록 **개인 맞춤형 영어 학습 대시보드(Home Dashboard)**와 학습 데이터를 안전하게 유지·보관할 수 있는 **로컬 데이터 백업 및 복원(Backup & Restore) 시스템**을 구축하였습니다.

---

## 2. 절대 준수 원칙 이행 확인

- [x] **외부 AI 및 API 통신 0건**: Gemini API, OpenAI API 등 외부 AI 호출 코드 및 API 키 요청 기능 일체 미사용.
- [x] **개인 데이터 외부 유출 차단**: 학습 기록, 저장 표현, 단어 메모, 통계 데이터가 외부로 전송되지 않고 100% 브라우저 로컬 스토리지 및 파일 다운로드로만 작동.
- [x] **기존 데이터베이스 및 원본 파일 무수정**: `data/local_books/books.sqlite3` 및 `Book/` 디렉터리 내 원서 파일 일체 변경 없음.
- [x] **기존 데이터 보존**: `booky_saved_expressions`, `booky_daily_logs`, `booky_reading_progress` 등 기존 학습 기록 100% 보존.
- [x] **가짜 통계 배제**: 대시보드 진행률과 누적 지표는 모두 실제 저장된 학습 로그와 표현 데이터를 기반으로 실시간 계산.

---

## 3. 핵심 구현 내용

### 3.1 개인 맞춤형 영어 학습 홈 대시보드 (`HomeDashboardModal.tsx`)
- **일일 학습 목표 시스템 (`DailyGoals`)**:
  - 하루 목표 챕터 수 및 표현 복습 개수를 자유롭게 설정 및 저장 (`booky_daily_goals`).
  - 오늘 학습한 실제 챕터 수(`actualChaptersToday`)와 복습한 표현 수(`actualReviewedToday`)를 기반으로 한 실시간 달성률(%) 프로그레스 바 제공.
  - 목표 달성 시 축하 뱃지(`달성 완료! 🎉`) 시각화.
- **최근 읽던 원서 이어 읽기 카드**:
  - 최근 읽던 책 이름, 챕터명, 문단 위치를 한눈에 확인하고 [▶ 이어서 읽기] 원클릭 이동 지원 (`onJumpToPassage`).
- **복습 대기 표현 미리보기**:
  - 플래시카드 복습 상태 중 `review_again`(다시 복습) 또는 `hard`(어려움) 태그가 지정된 표현을 우선 추출하여 바로 복습할 수 있도록 연결.
- **빠른 액션 패널**:
  - [28권 도서 서재], [표현 플래시카드 복습], [데이터 백업 & 복원] 원클릭 바로가기 지원.

### 3.2 안전한 로컬 데이터 백업 및 복원 엔진 (`backupRestore.ts`, `BackupRestoreModal.tsx`)
- **단일 JSON 백업 내보내기 (`createLocalBackup`, `downloadBackupFile`)**:
  - 저장된 표현(`booky_saved_expressions`), 일별 학습 로그(`booky_daily_logs`), 독서 위치(`booky_reading_progress`), 낭독 체크리스트(`booky_reading_checklist`), 단어 메모(`booky_vocab_notes`), 일일 학습 목표(`booky_daily_goals`), 폰트 설정(`booky_font_size`)을 체계적으로 묶어 `booky-local-backup-YYYY-MM-DD.json` 파일로 즉시 다운로드.
- **다단계 백업 검증 파이프라인 (`validateBackupFileContent`)**:
  - **크기 제한**: 최대 5MB 초과 파일 즉시 차단 (메모리 고갈 방지).
  - **구조 검증**: 손상된 JSON 파싱 거부, `app: "Booky"` 애플리케이션 식별자 확인, 핵심 배열 유효성 점검.
  - **복원 전 미리보기**: 포함된 표현 수, 학습 로그 건수, 메모 개수를 사용자에게 사전 확인 제공.
- **원클릭 자동 롤백 스냅샷 복원 (`restoreLocalBackup`, `rollbackPreRestoreBackup`)**:
  - 복원 실행 직전의 현재 상태를 `booky_pre_restore_backup`에 자동 스냅샷으로 보관.
  - 사용자가 잘못된 파일로 복원하더라도 [원래 상태로 되돌리기] 버튼으로 1초 만에 원상복구 가능.

### 3.3 헤더 및 앱 통합 연동 (`Header.tsx`, `App.tsx`, `NotebookDrawer.tsx`)
- 헤더 상단에 [학습 홈] 및 [백업/복원] 전용 바로가기 버튼 추가.
- `NotebookDrawer`에 `initialTab`을 도입하여 대시보드에서 플래시카드 복습 모드나 통계 탭으로 다이렉트 전환 지원.
- `ReadingProgress`에 도서명 및 챕터명 속성을 보강하여 하위 호환성 유지 및 시인성 개선.
- `vite.config.ts`의 `emptyOutDir: true` 및 ES Module 최적화로 빌드 무결성 확보.

---

## 4. 수정 및 생성된 파일 목록

| 구분 | 파일 경로 | 변경 요약 |
|:---:|:---|:---|
| **생성** | `src/utils/backupRestore.ts` | 백업 생성/다운로드/검증/복원/롤백 핵심 유틸리티 |
| **생성** | `src/components/HomeDashboardModal.tsx` | 학습 대시보드, 일일 목표 진행률, 최근 읽은 도서 카드, 빠른 액션 |
| **생성** | `src/components/BackupRestoreModal.tsx` | JSON 백업 다운로드, 파일 업로드 검증 미리보기, 안전 복원 및 롤백 UI |
| **생성** | `scripts/verify_step08_dashboard_backup.py` | STEP 08 단위 및 빌드 무결성 자동 검증 스크립트 |
| **수정** | `src/types.ts` | `DailyGoals`, `BackupData`, `BackupValidationResult`, `ReadingProgress` 확장 |
| **수정** | `src/utils/studyStorage.ts` | 일일 목표 로드/저장/진행률 계산 함수 추가 |
| **수정** | `src/components/Header.tsx` | 대시보드(Home) 및 백업(HardDrive) 액션 버튼 및 핸들러 추가 |
| **수정** | `src/components/NotebookDrawer.tsx` | `initialTab` 지원 추가로 대시보드에서의 탭 직접 전환 구현 |
| **수정** | `src/components/BookPassageView.tsx` | 읽기 위치 저장 시 도서명 및 챕터명 메타데이터 동시 기록 |
| **수정** | `src/App.tsx` | 대시보드/백업 모달 상태 관리, 복원 성공 시 로컬 상태 자동 동기화 |
| **수정** | `vite.config.ts` | `emptyOutDir: true` 및 `import.meta.url` 경로 설정 최적화 |

---

## 5. 무결성 검증 결과

1. **자동 검증 스크립트 (`scripts/verify_step08_dashboard_backup.py`)**:
   - `핵심 소스 파일 존재 확인`: **PASS**
   - `백업/복원 유틸리티 및 목표 산출 Node 단위 테스트`: **PASS** (정상 데이터 검증, 5MB 초과 차단, 가짜 식별자 차단, 손상 JSON 거부 100% 통과)
   - `TypeScript 타입 검사 (npx tsc --noEmit)`: **PASS** (에러 0건)
   - `Vite 프로덕션 빌드 (npm run build)`: **PASS** (444ms, dist 산출물 100% 생성)
2. **이전 단계 기능 무결성 재검증**:
   - `python scripts/verify_step07_study_system.py`: **100% 통과**
   - `python scripts/audit_28_books_data.py`: **28권 300챕터 14,963문단 전수 보존 확인**

---

## 6. Git 동기화 및 커밋 정보

- 자동 동기화 스크립트: `scripts/safe-git-sync.ps1`
- 안전 점검: `books.sqlite3`, `Book/`, `.env*` 등 저작권/보안 파일 격리 상태 확인 완료.
- 원격 저장소: `https://github.com/anbyku251029-cmd/English-Reading` (`origin/main`)
