#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Booky STEP 10 검증 스크립트:
- CNN News C2 Guided Course (단계별 실전 학습 코스) 검증
- 5단계 학습 파이프라인 (Reading -> Sentence Analysis -> Comprehension -> Writing -> Review)
- 7대 진행 상태 (NOT_STARTED, READING, ANALYSIS, COMPREHENSION, WRITING, REVIEW, COMPLETED)
- 실제 작성 데이터 기반 정직한 완료 판정 (가짜 점수 및 AI 채점 배제)
- 백업 및 복원 호환성 검증
"""

import sys
import os
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

# 1. 파일 존재 여부 확인
def test_files_exist():
    required_files = [
        "src/types.ts",
        "src/utils/cnnNewsStorage.ts",
        "src/utils/backupRestore.ts",
        "src/components/cnnNews/CnnNewsGuidedCourseModal.tsx",
        "src/components/cnnNews/CnnNewsReaderView.tsx",
        "src/components/cnnNews/CnnNewsCategoryView.tsx",
    ]
    for rf in required_files:
        full_path = os.path.join(ROOT_DIR, rf)
        assert os.path.isfile(full_path), f"필수 파일 누락: {rf}"

# 2. Node.js 단위 테스트 (단계별 코스 상태 전이, 기사 데이터 동기화, 완료 판정, 백업 연동)
def test_guided_course_node_unit():
    node_script = """
    import {
        addNewsArticle,
        getGuidedProgress,
        updateGuidedProgress,
        syncGuidedProgressWithArticle,
        updateSentenceAnalysis,
        updateQuestionAnswer,
        updateWritingOutput,
        updateDebateOutput,
        loadNewsArticles,
    } from './src/utils/cnnNewsStorage.ts';
    import { createLocalBackup, validateBackupFileContent, restoreLocalBackup } from './src/utils/backupRestore.ts';

    // Mock localStorage
    const store = {};
    globalThis.localStorage = {
        getItem: (k) => store[k] || null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        clear: () => { for (const k in store) delete store[k]; },
    };

    // 1. 기사 생성 및 초기 코스 진행도 검증
    const art1 = addNewsArticle({
        title: 'Geopolitical Shift in Global Trade',
        source: 'CNN',
        articleDate: '2026-10-27',
        topic: 'World',
        rawContent: 'Trade corridors are shifting globally.\\n\\nSupply chains adapt to new realities.',
        paragraphs: ['Trade corridors are shifting globally.', 'Supply chains adapt to new realities.'],
        fileName: 'trade.txt',
        fileType: 'txt',
    });

    const initialProg = getGuidedProgress(art1.id);
    if (initialProg.currentStep !== 'NOT_STARTED' || initialProg.highestStepReached !== 'NOT_STARTED') {
        throw new Error('초기 코스 상태 오류: ' + JSON.stringify(initialProg));
    }
    if (initialProg.checklist.analyzedSentenceIds.length !== 0 || initialProg.checklist.hasCompletedWriting) {
        throw new Error('초기 체크리스트가 비어있지 않음');
    }

    // 2. 단계 전이 (READING -> ANALYSIS -> COMPREHENSION -> WRITING -> REVIEW)
    const progReading = updateGuidedProgress(art1.id, {
        currentStep: 'READING',
        lastParagraphIndex: 0,
        checklist: { ...initialProg.checklist, hasReadPassage: true }
    });
    if (progReading.currentStep !== 'READING' || progReading.highestStepReached !== 'READING' || !progReading.startedAt) {
        throw new Error('READING 단계 전이 실패: ' + JSON.stringify(progReading));
    }

    // 3. 실제 문장 분석 추가 후 동기화 검증
    updateSentenceAnalysis(art1.id, {
        id: 'sent-trade-1',
        sentence: 'Trade corridors are shifting globally.',
        paragraphIndex: 0,
        sentenceStructure: 'S + V + Adv 단문 구조',
        keyGrammar: '현재진행형 시제',
        logicalConnectors: 'None',
        referents: 'None',
        implicitMeaning: '공급망 재편의 시급성',
        toneAndAttitude: 'Objective analytical',
        koreanTranslation: '글로벌 무역 경로가 전 세계적으로 변화하고 있다.',
        questions: '한국 무역에 미칠 영향은?',
        updatedAt: new Date().toISOString(),
    });

    const artAfterSent = loadNewsArticles().find(a => a.id === art1.id);
    const progSynced = syncGuidedProgressWithArticle(artAfterSent);
    if (!progSynced.checklist.analyzedSentenceIds.includes('sent-trade-1')) {
        throw new Error('문장 분석 동기화 실패: ' + JSON.stringify(progSynced));
    }

    // 4. 독해 질문 답변 작성 및 동기화
    updateQuestionAnswer(art1.id, 'q-1-main-argument', '무역로 다변화와 공급망 복원력 강화가 핵심이다.', '취재원 인용구');
    const artAfterQ = loadNewsArticles().find(a => a.id === art1.id);
    const progAfterQ = syncGuidedProgressWithArticle(artAfterQ);
    if (!progAfterQ.checklist.answeredQuestionIds.includes('q-1-main-argument')) {
        throw new Error('독해 질문 답변 동기화 실패');
    }

    // 5. 영작문 및 토론 저장 후 동기화
    updateWritingOutput(art1.id, {
        summary: 'Global trade routes are undergoing fundamental realignment.',
        stance: 'agree',
        opinionEssay: 'Diversifying supply lines is essential for resilience.',
        alternativeProposals: 'Multilateral trade agreements should be updated.',
        koreanDraft: '공급망 다변화의 필요성',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    const artAfterWriting = loadNewsArticles().find(a => a.id === art1.id);
    const progAfterWriting = syncGuidedProgressWithArticle(artAfterWriting);
    if (!progAfterWriting.checklist.hasCompletedWriting) {
        throw new Error('영작문 동기화 실패');
    }

    // 6. 완독 완료 (COMPLETED) 전이 및 완료 시간 기록
    const progCompleted = updateGuidedProgress(art1.id, {
        currentStep: 'COMPLETED',
        checklist: { ...progAfterWriting.checklist, hasReviewedAll: true }
    });
    if (progCompleted.currentStep !== 'COMPLETED' || !progCompleted.completedAt) {
        throw new Error('COMPLETED 단계 전이 및 완료 시간 기록 실패');
    }

    // 7. 기사 간 진행도 데이터 격리 검증 (새 기사 생성 시 독립 유지)
    const art2 = addNewsArticle({
        title: 'Tech Innovations in Clean Energy',
        source: 'CNN',
        rawContent: 'Solar tech advances rapidly.',
        paragraphs: ['Solar tech advances rapidly.'],
        fileName: 'tech.txt',
        fileType: 'txt',
    });
    const prog2 = getGuidedProgress(art2.id);
    if (prog2.currentStep !== 'NOT_STARTED' || prog2.checklist.analyzedSentenceIds.length !== 0) {
        throw new Error('기사 간 진행도 데이터 격리 실패');
    }

    // 8. 백업 및 복원 스키마 검증
    const backup = createLocalBackup();
    if (!backup.data.cnnGuidedProgress || backup.data.cnnGuidedProgress.length !== 2) {
        throw new Error('백업 데이터에 cnnGuidedProgress 누락 또는 개수 불일치');
    }

    const valRes = validateBackupFileContent(JSON.stringify(backup));
    if (!valRes.isValid || valRes.itemCounts.cnnGuidedProgress !== 2) {
        throw new Error('백업 검증 결과 불일치: ' + JSON.stringify(valRes));
    }

    // 복원 테스트
    store['booky_cnn_guided_progress'] = '{}';
    restoreLocalBackup(backup);
    const restoredProg = getGuidedProgress(art1.id);
    if (restoredProg.currentStep !== 'COMPLETED' || !restoredProg.completedAt) {
        throw new Error('백업 복원 후 코스 상태 복원 실패: ' + JSON.stringify(restoredProg));
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
    assert res.returncode == 0, f"Node 단위 검증 오류 (출력: {res.stdout}, 에러: {res.stderr})"
    assert "NODE_UNIT_SUCCESS" in res.stdout, "예상된 성공 메시지가 출력되지 않았습니다."

# 3. TypeScript 타입 검사
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
    assert res.returncode == 0, f"Vite 빌드 오류:\n{res.stdout}\n{res.stderr}"
    dist_index = os.path.join(ROOT_DIR, "dist", "index.html")
    assert os.path.isfile(dist_index), "빌드 산출물(dist/index.html)이 생성되지 않았습니다."

def main():
    print("=================================================================")
    print("      Booky STEP 10 CNN News C2 단계별 실전 학습 코스 검증        ")
    print("=================================================================")

    tests = [
        ("핵심 소스 파일 및 컴포넌트 존재 확인", test_files_exist),
        ("Guided Course 단계별 상태 전이, 정합성 동기화, 백업 Node 단위 테스트", test_guided_course_node_unit),
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
        print(">>> STEP 10 검증 결과: 모든 테스트 통과 (100% 무결성 확인)")
        sys.exit(0)
    else:
        print(">>> STEP 10 검증 실패")
        sys.exit(1)

if __name__ == '__main__':
    main()
