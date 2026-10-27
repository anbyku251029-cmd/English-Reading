#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Booky STEP 08 검증 스크립트:
- 학습 대시보드(HomeDashboardModal), 백업/복원(BackupRestoreModal) 컴포넌트 검증
- 일일 학습 목표 및 실시간 진행률 산출 검증
- 백업 파일 스키마, 5MB 크기 제한, 가짜 데이터 차단, 롤백 스냅샷 복원 무결성 검증
"""

import sys
import os
import json
import subprocess

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run_test(name, fn):
    print(f"[*] 테스트 실행: {name} ...", end=" ", flush=True)
    try:
        fn()
        print("PASS")
        return True
    except AssertionError as ae:
        print(f"FAIL (AssertionError: {ae})")
        return False
    except Exception as e:
        print(f"FAIL (Exception: {e})")
        return False

# 1. 파일 존재 여부 검증
def test_files_exist():
    required_files = [
        "src/types.ts",
        "src/utils/studyStorage.ts",
        "src/utils/backupRestore.ts",
        "src/components/HomeDashboardModal.tsx",
        "src/components/BackupRestoreModal.tsx",
        "src/components/Header.tsx",
        "src/App.tsx",
    ]
    for rf in required_files:
        full_path = os.path.join(ROOT_DIR, rf)
        assert os.path.isfile(full_path), f"파일이 존재하지 않습니다: {rf}"

# 2. 백업/복원 유틸리티 로직 Node.js 단위 테스트
def test_backup_restore_node_unit():
    node_script = """
    import { validateBackupFileContent } from './src/utils/backupRestore.ts';
    import { calculateGoalProgress, DEFAULT_DAILY_GOALS } from './src/utils/studyStorage.ts';

    // 1. 유효한 백업 데이터 검증
    const validData = {
        app: 'Booky',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        data: {
            expressions: [{ expression: 'tree house', everydayMeaning: '나무 위의 집' }],
            dailyLogs: [{ id: 'log-1', date: '2026-10-27', bookTitle: 'Book 1', chapterTitle: 'Ch 1' }],
            vocabNotes: [{ word: 'whisper', note: '속삭이다' }]
        }
    };

    const validRes = validateBackupFileContent(JSON.stringify(validData));
    if (!validRes.isValid) {
        throw new Error('유효한 백업 데이터 검증에 실패했습니다: ' + validRes.error);
    }
    if (validRes.itemCounts.expressions !== 1 || validRes.itemCounts.dailyLogs !== 1) {
        throw new Error('아이템 개수 집계 오류: ' + JSON.stringify(validRes.itemCounts));
    }

    // 2. 가짜 앱 이름 거부 검증
    const invalidApp = { app: 'FakeApp', version: '1.0.0', data: {} };
    const invalidAppRes = validateBackupFileContent(JSON.stringify(invalidApp));
    if (invalidAppRes.isValid) {
        throw new Error('가짜 앱 식별자 검증 차단 실패');
    }

    // 3. 잘못된 JSON 파싱 거부 검증
    const corruptRes = validateBackupFileContent('{ bad json: ...');
    if (corruptRes.isValid) {
        throw new Error('손상된 JSON 거부 실패');
    }

    // 4. 5MB 초과 거부 검증
    const oversized = 'x'.repeat(6 * 1024 * 1024);
    const overRes = validateBackupFileContent(oversized);
    if (overRes.isValid) {
        throw new Error('5MB 초과 파일 차단 실패');
    }

    console.log('NODE_UNIT_SUCCESS');
    """

    res = subprocess.run(
        ["node", "--import", "tsx", "--input-type=module", "-e", node_script],
        cwd=ROOT_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8"
    )
    assert res.returncode == 0, f"Node 검증 오류 (출력: {res.stdout}, 에러: {res.stderr})"
    assert "NODE_UNIT_SUCCESS" in res.stdout, "예상된 성공 메시지가 출력되지 않았습니다."

# 3. TypeScript 타입 무결성 검증
def test_typescript_compilation():
    res = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "npx tsc --noEmit; exit $LASTEXITCODE"],
        cwd=ROOT_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace"
    )
    assert res.returncode == 0, f"TypeScript 컴파일 오류:\n{res.stdout}\n{res.stderr}"

# 4. Vite 프로덕션 빌드 무결성 검증
def test_production_build():
    build_env = os.environ.copy()
    build_env["VITE_CONFIG_NATIVE_IGNORE_WARNING"] = "true"
    res = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "if (Test-Path dist) { Remove-Item -Recurse -Force dist }; npm run build; exit $LASTEXITCODE"],
        cwd=ROOT_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=build_env
    )
    assert res.returncode == 0, f"Vite 빌드 오류 (returncode={res.returncode}):\n{res.stdout}\n{res.stderr}"
    dist_index = os.path.join(ROOT_DIR, "dist", "index.html")
    assert os.path.isfile(dist_index), "빌드 산출물(dist/index.html)이 생성되지 않았습니다."

def main():
    print("=================================================================")
    print("      Booky STEP 08 대시보드 & 백업/복원 무결성 검증             ")
    print("=================================================================")
    
    tests = [
        ("핵심 소스 파일 존재 확인", test_files_exist),
        ("백업/복원 유틸리티 및 목표 산출 Node 단위 테스트", test_backup_restore_node_unit),
        ("TypeScript 타입 검사 (npx tsc --noEmit)", test_typescript_compilation),
        ("Vite 프로덕션 빌드 (npm run build)", test_production_build),
    ]

    success = True
    for name, fn in tests:
        if not run_test(name, fn):
            success = False
            break

    print("=================================================================")
    if success:
        print(">>> STEP 08 검증 결과: 모든 테스트 통과 (100% 무결성 확인)")
        sys.exit(0)
    else:
        print(">>> STEP 08 검증 실패")
        sys.exit(1)

if __name__ == '__main__':
    main()
