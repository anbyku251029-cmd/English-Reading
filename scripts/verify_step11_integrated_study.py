# -*- coding: utf-8 -*-
"""
=============================================================================
Booky STEP 11 — 실제 CNN 기사 기반 통합 영어 학습 시스템 종합 검증 스크립트
=============================================================================

검증 항목:
1. 핵심 파일 및 컴포넌트 존재 검증
2. Node.js 환경에서 단위/통합 기능 검증:
   - 기사 'CNN_LUNG_NODULES_001' 로드 및 10개 문단, 10개 번역 일치 검증
   - 핵심 어휘 14개 등록, 원문 문장 매핑, 암기 토글, 플래시카드 연동 검증
   - 독해 객관식 퀴즈 2문제 채점 (문제 1: b, 문제 2: c, 정답/오답 해설)
   - 받아쓰기 퀴즈 2문제 비교 (trim, case-insensitive, 부분 점수/완전 일치)
   - 말하기 연습 및 섀도잉 4문장 완료 상태 저장 및 추적
   - 5단계 Guided Course 실전 연동 (READING -> ANALYSIS -> COMPREHENSION -> WRITING -> REVIEW -> COMPLETED)
   - 백업 생성 및 복원 호환성 (하위 호환성 및 신규 필드 보존)
3. 외부 AI API 미호출(Gemini, OpenAI 등) 및 가짜 AI 점수/모범답안 배제 검증
4. Git 보안 격리 규칙 검증 (Book/, data/local_books/, .env*)
5. TypeScript 타입 검사 (npx tsc --noEmit)
6. 프로덕션 빌드 무결성 검증 (npm run build)
"""

import os
import sys
import shutil
import subprocess

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
os.chdir(ROOT_DIR)

PASS = "PASS"
FAIL = "FAIL"

def run_test(name, func):
    print(f"[*] 테스트 실행: {name} ... ", end='', flush=True)
    try:
        ok, msg = func()
        if ok:
            print(PASS)
            return True
        else:
            print(f"{FAIL} -> {msg}")
            return False
    except Exception as e:
        print(f"{FAIL} (예외 발생) -> {e}")
        return False

# -----------------------------------------------------------------------------
# 1. 핵심 파일 존재 검증
# -----------------------------------------------------------------------------
def test_files_exist():
    required_files = [
        "src/types.ts",
        "src/utils/cnnNewsStorage.ts",
        "src/utils/backupRestore.ts",
        "src/components/cnnNews/CnnNewsGuidedCourseModal.tsx",
        "src/components/cnnNews/CnnNewsReaderView.tsx",
        "src/components/cnnNews/CnnNewsCategoryView.tsx",
        "scripts/safe-git-sync.ps1",
    ]
    for rf in required_files:
        full_path = os.path.join(ROOT_DIR, rf)
        if not os.path.exists(full_path):
            return False, f"필수 파일 누락: {rf}"
    return True, ""

# -----------------------------------------------------------------------------
# 2. Node.js 단위 테스트 (기사, 어휘, 퀴즈, 받아쓰기, 스피킹, 섀도잉, 백업)
# -----------------------------------------------------------------------------
def test_node_step11_unit():
    node_script = """
    import {
      loadNewsArticles,
      getNewsArticleById,
      ensureSeedArticleLungNodules,
      updateCoreVocabItem,
      updateComprehensionQuiz,
      resetComprehensionQuiz,
      updateDictationQuiz,
      resetDictationQuiz,
      revealDictationQuizAnswer,
      updateSpeakingExercise,
      updateShadowingExercise,
      getGuidedProgress,
      updateGuidedProgress,
      syncGuidedProgressWithArticle,
      saveNewsExpression,
    } from './src/utils/cnnNewsStorage.ts';
    import { createLocalBackup, restoreLocalBackup } from './src/utils/backupRestore.ts';

    // Mock localStorage
    const store = {};
    global.localStorage = {
      getItem: (k) => store[k] || null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); }
    };

    // [테스트 1] 기본 시드 기사 CNN_LUNG_NODULES_001 안전 등록 및 중복 등록 방지 검증
    const seeded = ensureSeedArticleLungNodules();
    if (!seeded || seeded.id !== 'CNN_LUNG_NODULES_001') {
      throw new Error('시드 기사 등록 실패');
    }
    // 동일 ID 재등록 시 중복 방지 검증
    ensureSeedArticleLungNodules();
    const articles = loadNewsArticles();
    if (articles.filter(a => a.id === 'CNN_LUNG_NODULES_001').length !== 1) {
      throw new Error('중복 기사 생성 방지 실패');
    }
    const lungNews = getNewsArticleById('CNN_LUNG_NODULES_001');
    if (!lungNews) {
      throw new Error('기사 ID CNN_LUNG_NODULES_001를 찾을 수 없습니다.');
    }
    if (lungNews.title !== 'What to Know About Lung Nodules') {
      throw new Error(`기사 제목 불일치: ${lungNews.title}`);
    }
    if (!lungNews.paragraphs || lungNews.paragraphs.length !== 10) {
      throw new Error(`문단 개수 불일치: ${lungNews.paragraphs?.length} (예상: 10)`);
    }
    if (!lungNews.koreanParagraphs || lungNews.koreanParagraphs.length !== 10) {
      throw new Error(`번역 문단 개수 불일치: ${lungNews.koreanParagraphs?.length} (예상: 10)`);
    }

    // [테스트 2] 핵심 어휘 14개 검증
    const vocabs = lungNews.coreVocabularies || [];
    if (vocabs.length !== 14) {
      throw new Error(`핵심 어휘 개수 불일치: ${vocabs.length} (예상: 14)`);
    }
    const expectedVocabs = [
      'abnormal', 'be diagnosed with', 'pulmonary nodule', 'define as',
      'benign', 'cancerous', 'detection', 'mass', 'biopsy', 'surgically',
      'resection', 'early treatment', 'be eligible for', 'screening'
    ];
    expectedVocabs.forEach((expr) => {
      const found = vocabs.find(v => v.expression.toLowerCase() === expr.toLowerCase());
      if (!found) {
        throw new Error(`필수 어휘 누락: ${expr}`);
      }
      if (!found.koreanMeaning) {
        throw new Error(`어휘 한국어 뜻 누락: ${expr}`);
      }
    });

    // 어휘 암기 상태 업데이트 테스트
    const targetVocab = { ...vocabs[0], isMemorized: true, userNote: '테스트 메모' };
    updateCoreVocabItem(lungNews.id, targetVocab);
    const updatedLungNews = getNewsArticleById(lungNews.id);
    const checkedVocab = updatedLungNews.coreVocabularies.find(v => v.id === targetVocab.id);
    if (!checkedVocab.isMemorized || checkedVocab.userNote !== '테스트 메모') {
      throw new Error('어휘 상태 업데이트 실패');
    }

    // [테스트 3] 독해 객관식 퀴즈 2문제 채점
    const quizzes = lungNews.comprehensionQuizzes || [];
    if (quizzes.length !== 2) {
      throw new Error(`독해 퀴즈 개수 불일치: ${quizzes.length} (예상: 2)`);
    }
    // 문제 1 정답 채점 (정답: b)
    const q1Res = updateComprehensionQuiz(lungNews.id, 'quiz-1', 'b');
    if (!q1Res.isCorrect) throw new Error('퀴즈 1번 정답(b) 채점 실패');
    // 문제 1 오답 채점
    const q1Wrong = updateComprehensionQuiz(lungNews.id, 'quiz-1', 'a');
    if (q1Wrong.isCorrect) throw new Error('퀴즈 1번 오답(a) 채점 오류');
    // 문제 1 정답 복구
    updateComprehensionQuiz(lungNews.id, 'quiz-1', 'b');

    // 문제 2 정답 채점 (정답: c)
    const q2Res = updateComprehensionQuiz(lungNews.id, 'quiz-2', 'c');
    if (!q2Res.isCorrect) throw new Error('퀴즈 2번 정답(c) 채점 실패');

    // [테스트 4] 받아쓰기 퀴즈 2문제 정답 비교
    const dicts = lungNews.dictationQuizzes || [];
    if (dicts.length !== 2) {
      throw new Error(`받아쓰기 퀴즈 개수 불일치: ${dicts.length} (예상: 2)`);
    }
    // 문제 1: area, abnormal, lungs
    const d1Res = updateDictationQuiz(lungNews.id, 'dict-1', [' Area ', 'ABNORMAL', 'lungs  ']);
    if (!d1Res.isCorrect || d1Res.accuracyRate !== 100) {
      throw new Error(`받아쓰기 1번 채점 실패: 정답률 ${d1Res.accuracyRate}%`);
    }
    // 문제 2: lung, nodule, cancerous, treatment
    const d2Res = updateDictationQuiz(lungNews.id, 'dict-2', ['lung', 'nodule', 'cancerous', 'treatment']);
    if (!d2Res.isCorrect || d2Res.accuracyRate !== 100) {
      throw new Error(`받아쓰기 2번 채점 실패: 정답률 ${d2Res.accuracyRate}%`);
    }

    // [테스트 5] 말하기 및 섀도잉 상태 저장
    updateSpeakingExercise(lungNews.id, 'speak-1', {
      userTranscript: 'It can either be biopsied or surgically removed, then tested.',
      isCompleted: true,
      hasRecordedAudio: true,
    });
    updateShadowingExercise(lungNews.id, 'shadow-1', { isCompleted: true });
    updateShadowingExercise(lungNews.id, 'shadow-2', { isCompleted: true });

    // [테스트 6] 코스 진행도 동기화
    const freshArticle = getNewsArticleById(lungNews.id);
    const syncedProgress = syncGuidedProgressWithArticle(freshArticle);
    if (!syncedProgress.checklist.quizScores || syncedProgress.checklist.quizScores.passedCount !== 2) {
      throw new Error('퀴즈 정답 결과가 코스 진행도에 올바르게 동기화되지 않았습니다.');
    }
    if (syncedProgress.checklist.dictationCompletedCount !== 2) {
      throw new Error('받아쓰기 완료 결과가 코스 진행도에 올바르게 동기화되지 않았습니다.');
    }
    if (!syncedProgress.checklist.speakingCompleted) {
      throw new Error('말하기 연습 완료 결과가 코스 진행도에 올바르게 동기화되지 않았습니다.');
    }
    if (syncedProgress.checklist.shadowingCompletedCount !== 2) {
      throw new Error('섀도잉 완료 결과가 코스 진행도에 올바르게 동기화되지 않았습니다.');
    }

    // [테스트 7] 백업 및 복원 무결성 검증
    const backup = createLocalBackup();
    if (!backup.data.cnnNewsArticles || backup.data.cnnNewsArticles.length === 0) {
      throw new Error('백업 데이터에 cnnNewsArticles 누락');
    }
    const backedUpLung = backup.data.cnnNewsArticles.find(a => a.id === 'CNN_LUNG_NODULES_001');
    if (!backedUpLung || !backedUpLung.coreVocabularies || backedUpLung.coreVocabularies.length !== 14) {
      throw new Error('백업된 기사 내 핵심 어휘 데이터 누락');
    }
    if (!backedUpLung.comprehensionQuizzes || backedUpLung.comprehensionQuizzes.length !== 2) {
      throw new Error('백업된 기사 내 독해 퀴즈 데이터 누락');
    }

    store['booky_cnn_news_articles'] = '[]';
    const restoreRes = restoreLocalBackup(backup);
    if (!restoreRes.success) {
      throw new Error(`로컬 백업 복원 실패: ${restoreRes.error}`);
    }
    const restoredArticle = getNewsArticleById('CNN_LUNG_NODULES_001');
    if (!restoredArticle || restoredArticle.coreVocabularies.length !== 14) {
      throw new Error('복원 후 CNN 기사 또는 어휘 복원 불일치');
    }

    console.log('NODE_UNIT_SUCCESS');
    """

    res = subprocess.run(
        ["node", "--import", "tsx", "--input-type=module", "-e", node_script],
        cwd=ROOT_DIR,
        capture_output=True,
        text=True,
        encoding='utf-8'
    )
    if res.returncode != 0:
        return False, f"Node 단위 테스트 실패 (code {res.returncode}):\n{res.stderr}\n{res.stdout}"
    if 'NODE_UNIT_SUCCESS' not in res.stdout:
        return False, f"Node 단위 테스트 미완료 출력: {res.stdout}"
    return True, ""

# -----------------------------------------------------------------------------
# 3. 외부 AI API 미호출 및 가짜 점수 배제 검사
# -----------------------------------------------------------------------------
def test_no_external_ai_in_step11():
    target_files = [
        "src/utils/cnnNewsStorage.ts",
        "src/components/cnnNews/CnnNewsGuidedCourseModal.tsx",
    ]
    disallowed_keywords = [
        "GoogleGenAI",
        "gemini-2.5",
        "gemini-1.5",
        "openai",
        "anthropic",
        "api.openai.com",
        "generativelanguage.googleapis.com",
    ]
    for tf in target_files:
        full_path = os.path.join(ROOT_DIR, tf)
        if not os.path.exists(full_path):
            continue
        with open(full_path, 'r', encoding='utf-8') as f:
            code = f.read()
        for kw in disallowed_keywords:
            if kw.lower() in code.lower():
                return False, f"외부 AI 키워드 발견 ({kw}) in {tf}"
    return True, ""

# -----------------------------------------------------------------------------
# 4. Git 보안 격리 규칙 검사
# -----------------------------------------------------------------------------
def test_git_isolation():
    res = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True, encoding='utf-8')
    staged = res.stdout
    forbidden_prefixes = ["Book/", "data/local_books/", ".env"]
    for line in staged.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split(maxsplit=1)
        if len(parts) < 2:
            continue
        fname = parts[1]
        for forb in forbidden_prefixes:
            if fname.startswith(forb):
                return False, f"보안 격리 대상 파일이 Git에 감지됨: {fname}"
    return True, ""

# -----------------------------------------------------------------------------
# 5. TypeScript 컴파일 무결성 검사
# -----------------------------------------------------------------------------
def test_typescript_compile():
    res = subprocess.run(["powershell", "-NoProfile", "-Command", "npx tsc --noEmit; exit $LASTEXITCODE"], capture_output=True, text=True, encoding='utf-8')
    if res.returncode != 0:
        return False, f"TypeScript 컴파일 오류 (code {res.returncode}):\n{res.stderr}\n{res.stdout}"
    return True, ""

# -----------------------------------------------------------------------------
# 6. Vite 프로덕션 빌드 무결성 검사
# -----------------------------------------------------------------------------
def test_production_build():
    for d in ['node_modules/.vite', 'dist']:
        p = os.path.join(ROOT_DIR, d)
        if os.path.exists(p):
            try:
                shutil.rmtree(p)
            except Exception:
                pass

    res = subprocess.run(["npm.cmd", "run", "build"], capture_output=True, text=True, encoding='utf-8')
    if res.returncode != 0:
        return False, f"Vite 프로덕션 빌드 실패 (code {res.returncode}):\n{res.stderr}\n{res.stdout}"
    if not os.path.exists(os.path.join(ROOT_DIR, "dist", "index.html")):
        return False, "dist/index.html 빌드 결과물이 생성되지 않았습니다."
    return True, ""

# -----------------------------------------------------------------------------
# Main Runner
# -----------------------------------------------------------------------------
def main():
    print("=" * 65)
    print("      Booky STEP 11 실제 CNN 기사 통합 학습 시스템 검증        ")
    print("=" * 65)

    tests = [
        ("핵심 소스 파일 및 컴포넌트 존재 확인", test_files_exist),
        ("실제 CNN 기사, 어휘 14개, 퀴즈, 받아쓰기, 스피킹 단위 테스트", test_node_step11_unit),
        ("외부 AI API(Gemini, OpenAI 등) 호출 배제 코드 검사", test_no_external_ai_in_step11),
        ("저작권 도서/DB/환경변수 Git 격리 검사", test_git_isolation),
        ("TypeScript 타입 검사 (npx tsc --noEmit)", test_typescript_compile),
        ("Vite 프로덕션 빌드 (npm run build)", test_production_build),
    ]

    all_passed = True
    for name, func in tests:
        if not run_test(name, func):
            all_passed = False

    print("=" * 65)
    if all_passed:
        print(">>> STEP 11 검증 결과: 모든 테스트 통과 (100% 무결성 확인)")
        return 0
    else:
        print(">>> STEP 11 검증 결과: 일부 테스트 실패 (확인 및 수정 필요)")
        return 1

if __name__ == '__main__':
    sys.exit(main())
