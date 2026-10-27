<#
.SYNOPSIS
    Booky 프로젝트 안전 GitHub 자동 동기화 스크립트 (Safe Git Sync)

.DESCRIPTION
    1. Git 환경 및 원격 저장소 URL 검증
    2. 보안 및 저작권 격리 파일(MOBI, SQLite DB, .env, 비밀 키) 검사
    3. TypeScript 컴파일 무결성 검증 (npx tsc --noEmit)
    4. 프로덕션 빌드 무결성 검증 (npm run build)
    5. 검증 통과 시에만 변경 사항 스테이징, 커밋 및 push 수행
    6. 커밋 SHA 및 결과 출력

.PARAMETER CommitMessage
    커밋 메시지 (필수 또는 기본값 제공)

.EXAMPLE
    .\scripts\safe-git-sync.ps1 -CommitMessage "feat: complete Step 01-04"
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$CommitMessage = "chore: safe auto-sync from Antigravity"
)

# PowerShell에서 외부 네이티브 명령(npm, git)의 stderr 출력이 NativeCommandError로 스크립트를 중단시키지 않도록 설정
$ErrorActionPreference = "Continue"
$ExpectedRemote = "https://github.com/anbyku251029-cmd/English-Reading"

Write-Host "===========================================================================" -ForegroundColor Cyan
Write-Host "Booky - 안전 GitHub 자동 동기화 (Safe Git Sync)" -ForegroundColor Cyan
Write-Host "===========================================================================" -ForegroundColor Cyan

# 1. 작업 디렉터리 및 Git 저장소 확인
$repoRoot = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $repoRoot

if (-not (Test-Path "$repoRoot\.git")) {
    Write-Error "오류: 현재 폴더($repoRoot)에 .git 저장소가 존재하지 않습니다."
    exit 1
}

# 2. Git 원격 저장소 확인
$originUrl = (git remote get-url origin 2>$null)
if (-not $originUrl -or ($originUrl.TrimEnd(".git") -ne $ExpectedRemote.TrimEnd(".git"))) {
    Write-Error "오류: 원격 저장소 URL이 예상과 다릅니다. (현재: '$originUrl', 예상: '$ExpectedRemote')"
    exit 1
}
Write-Host "[1/6] 원격 저장소 확인 완료: $originUrl" -ForegroundColor Green

# 3. 보안 및 저작권 파일 검사 (.gitignore 유효성 및 민감 파일 확인)
Write-Host "[2/6] 저작권 및 보안 파일 격리 상태 검사 중..." -ForegroundColor Yellow

$prohibitedPatterns = @(
    "Book/",
    "data/local_books/",
    ".env",
    ".env.local",
    "backup/",
    "node_modules/"
)

# git status --porcelain에서 추적되면 안 되는 파일 확인
$statusOutput = git status --porcelain
foreach ($line in $statusOutput) {
    $filePath = $line.Substring(3).Trim()
    # .env.example은 커밋 허용, 실제 키가 들어가는 .env 및 .env.local 등은 차단
    if ($filePath -match "\.mobi$" -or $filePath -match "\.sqlite3$" -or ($filePath -match "^\.env" -and $filePath -ne ".env.example") -or $filePath -match "^Book/" -or $filePath -match "^data/local_books/") {
        Write-Error "보안 경고: 민감하거나 저작권이 있는 파일($filePath)이 Git 추적 대상에 포함되어 있습니다. 동기화를 중단합니다."
        exit 1
    }
}
Write-Host "      저작권/보안 파일 격리 검증 통과! (도서 원본 및 DB 제외 확인)" -ForegroundColor Green

# 4. TypeScript 컴파일 검사
Write-Host "[3/6] TypeScript 타입 무결성 검사 (npx tsc --noEmit)..." -ForegroundColor Yellow
$tscOutput = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host $tscOutput -ForegroundColor Red
    Write-Error "검증 실패: TypeScript 컴파일 오류가 발생했습니다. 수정한 후 다시 시도하십시오."
    exit 1
}
Write-Host "      TypeScript 타입 검사 통과 (오류 0건)" -ForegroundColor Green

# 5. 프로덕션 빌드 검사
Write-Host "[4/6] Vite 프로덕션 빌드 검사 (npm run build)..." -ForegroundColor Yellow

# Windows OneDrive 환경에서 dist 폴더 락 방지를 위해 안전 정리
if (Test-Path "$repoRoot\dist") {
    try {
        Get-ChildItem -Path "$repoRoot\dist" -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
    } catch {}
}

$buildOutput = npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host $buildOutput -ForegroundColor Red
    Write-Error "검증 실패: 프로덕션 빌드(npm run build)가 실패했습니다. 수정한 후 다시 시도하십시오."
    exit 1
}
Write-Host "      프로덕션 빌드 검사 통과" -ForegroundColor Green

# 6. 변경 사항 스테이징 및 커밋 생성
Write-Host "[5/6] 변경 사항 스테이징 및 커밋 생성..." -ForegroundColor Yellow

# 허용된 파일 및 폴더 위주로 안전하게 git add
git add src/
git add scripts/
git add docs/
git add 완료보고서/
git add reports/
git add package.json package-lock.json tsconfig.json tsconfig.node.json tsconfig.app.json vite.config.ts tailwind.config.js index.html .gitignore AGENTS.md server.ts 2>$null

# 이전 커밋에 잘못 포함되었을 수 있는 저작권 pdf 제거 확인
git rm --cached public/assets/aistudio/01_Dinosaurs_Before_Dark_-_Mary_Pope_Osborne_47a1ea99.pdf 2>$null

# 스테이징된 변경사항이 있는지 확인
$stagedDiff = git diff --cached --name-only
if (-not $stagedDiff) {
    Write-Host "알림: 새로 커밋할 변경 사항이 없습니다. 작업 트리가 깨끗합니다." -ForegroundColor Cyan
    $currentSha = (git rev-parse HEAD)
    Write-Host "현재 최신 커밋 SHA: $currentSha" -ForegroundColor Green
    exit 0
}

Write-Host "커밋 대상 파일 목록:" -ForegroundColor Gray
$stagedDiff | ForEach-Object { Write-Host "  + $_" -ForegroundColor DarkGray }

git commit -m "$CommitMessage"
if ($LASTEXITCODE -ne 0) {
    Write-Error "오류: git commit 실패"
    exit 1
}
$commitSha = (git rev-parse HEAD)
Write-Host "      커밋 생성 완료: $commitSha" -ForegroundColor Green

# 7. 원격 저장소(GitHub) Push
Write-Host "[6/6] GitHub 원격 저장소(origin main)로 Push 중..." -ForegroundColor Yellow
$pushOutput = git push -u origin main 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host $pushOutput -ForegroundColor Red
    Write-Error "오류: git push 실패. 네트워크 또는 권한을 확인하십시오."
    exit 1
}

Write-Host "===========================================================================" -ForegroundColor Green
Write-Host "✅ GitHub 안전 자동 동기화 성공!" -ForegroundColor Green
Write-Host "커밋 SHA: $commitSha" -ForegroundColor Green
Write-Host "원격 저장소: $ExpectedRemote" -ForegroundColor Green
Write-Host "===========================================================================" -ForegroundColor Green
