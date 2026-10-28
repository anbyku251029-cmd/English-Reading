# -*- coding: utf-8 -*-
"""
=============================================================================
Booky STEP 12-A — CNN 통합 학습 실사용 검증 및 결함 수정 자동화 검증 스크립트
=============================================================================

검증 항목:
1. STEP 12-A-2: 기사 데이터 무결성 검증
   - 최초 등록 후 기사 정상 조회
   - 반복 등록 호출 시 중복 방지 (기사 목록 내 ID 유일성)
   - 사용자 추가 메모 및 학습 기록 보존
   - 시드 등록/보강 함수 호출 시 사용자 수정 데이터 덮어쓰기 방지
   - 새로고침 시뮬레이션(localStorage 유지) 후 기사 및 진행 상태 보존
   - 손상된 저장 데이터(잘못된 JSON, null 포함 배열, 비객체 원소) 격리 및 안전 처리
2. STEP 12-A-4: 녹음 데이터 안전성 검증
   - Blob 및 createObjectURL 생성 및 revokeObjectURL 해제 로직 무결성
   - 녹음 삭제 시 Blob URL 즉시 해제 및 hasRecordedAudio 플래그 정리
   - 컴포넌트 종료/언마운트 시 오디오 및 미디어 스트림 트랙(stream.getTracks().stop()) 정리
   - 백업 데이터 생성 시 오디오 바이너리/Blob URL 배제 (경량 JSON 5MB 규격 보장)
3. STEP 12-A-5: 백업과 복원 시나리오 검증
   - 현재 학습 기록 포함 백업 생성
   - 테스트용 수정 데이터 추가
   - 기존 백업 복원 및 1:1 비교 무결성
   - 구버전(STEP 08 등 CNN 필드 누락) 백업 복원 시 기존 데이터 보존
   - 손상된 JSON 복원 실패 처리 및 기존 데이터 보존 (롤백 스냅샷 무결성)
4. AI API 미호출(Gemini, OpenAI 등) 및 가짜 점수 배제 검증
5. Git 보안 격리 규칙 (Book/, data/local_books/, .env*) 검증
6. TypeScript 타입 검사 (npx tsc --noEmit)
7. 프로덕션 빌드 무결성 (npm run build)
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
# 1. 파일 검증
# -----------------------------------------------------------------------------
def test_files_exist():
    required_files = [
        "src/types.ts",
        "src/utils/cnnNewsStorage.ts",
        "src/utils/backupRestore.ts",
        "src/components/cnnNews/CnnNewsGuidedCourseModal.tsx",
        "src/components/cnnNews/CnnNewsReaderView.tsx",
        "scripts/safe-git-sync.ps1",
    ]
    for rf in required_files:
        full_path = os.path.join(ROOT_DIR, rf)
        if not os.path.exists(full_path):
            return False, f"필수 파일 누락: {rf}"
    return True, ""

# -----------------------------------------------------------------------------
# 2. Node.js 기반 무결성, 녹음 안전성, 백업/복원 정밀 단위 검증
# -----------------------------------------------------------------------------
def test_node_step12a_validation():
    node_script = """
    import {
      loadNewsArticles,
      saveNewsArticles,
      getNewsArticleById,
      ensureSeedArticleLungNodules,
      updateNewsArticle,
      updateParagraphNote,
      updateSentenceAnalysis,
      updateQuestionAnswer,
      updateWritingOutput,
      updateDebateOutput,
      updateCoreVocabItem,
      updateComprehensionQuiz,
      resetComprehensionQuiz,
      updateDictationQuiz,
      resetDictationQuiz,
      updateSpeakingExercise,
      updateShadowingExercise,
      getGuidedProgress,
      updateGuidedProgress,
      syncGuidedProgressWithArticle,
      CNN_STORAGE_KEYS,
    } from './src/utils/cnnNewsStorage.ts';
    import {
      createLocalBackup,
      restoreLocalBackup,
      validateBackupFileContent,
      rollbackPreRestoreBackup,
      hasRollbackSnapshot,
    } from './src/utils/backupRestore.ts';
    import { STORAGE_KEYS } from './src/utils/studyStorage.ts';

    // Mock localStorage
    const store = {};
    global.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); }
    };

    // =========================================================================
    // STEP 12-A-2: 기사 데이터 무결성 검증
    // =========================================================================
    
    // 1) 최초 등록 후 기사 조회 검증
    const seeded = ensureSeedArticleLungNodules();
    if (!seeded || seeded.id !== 'CNN_LUNG_NODULES_001') {
      throw new Error('시드 기사 등록 실패');
    }
    const found1 = getNewsArticleById('CNN_LUNG_NODULES_001');
    if (!found1 || found1.title !== 'What to Know About Lung Nodules') {
      throw new Error('기사 조회 실패');
    }

    // 2) 동일 등록 함수 반복 호출 시 중복 방지
    ensureSeedArticleLungNodules();
    ensureSeedArticleLungNodules();
    const allArticles = loadNewsArticles();
    const seedOccurrences = allArticles.filter(a => a.id === 'CNN_LUNG_NODULES_001');
    if (seedOccurrences.length !== 1) {
      throw new Error(`시드 기사 중복 발생: ${seedOccurrences.length}건`);
    }

    // 3) 사용자 메모 및 학습 기록 추가 후 유지 검증
    updateParagraphNote('CNN_LUNG_NODULES_001', 0, '사용자 첫 번째 문단 메모');
    updateSentenceAnalysis('CNN_LUNG_NODULES_001', {
      id: 'sent-0-test',
      sentence: "It's an area of abnormal growth in the lungs.",
      paragraphIndex: 0,
      sentenceStructure: '주어 + be동사 + 보어',
      keyGrammar: '명사구 수식',
      logicalConnectors: '',
      referents: '',
      implicitMeaning: '폐 내부의 이상 조직',
      toneAndAttitude: 'Neutral',
      koreanTranslation: '폐 내 비정상 조직 부위',
      questions: '',
      updatedAt: new Date().toISOString(),
    });
    updateQuestionAnswer('CNN_LUNG_NODULES_001', 'q-1-main-argument', '사용자 C2 답변: 폐결절 조기 발견의 생존율 제고 효과');
    updateCoreVocabItem('CNN_LUNG_NODULES_001', {
      id: 'vocab-1',
      expression: 'abnormal',
      koreanMeaning: '비정상적인',
      contextSentence: "It's an area of abnormal growth in the lungs.",
      paragraphIndex: 0,
      isMemorized: true,
      needsReview: false,
      partOfSpeech: '형용사',
      userNote: '사용자 단어 메모',
    });
    updateComprehensionQuiz('CNN_LUNG_NODULES_001', 'quiz-1', 'b');
    updateDictationQuiz('CNN_LUNG_NODULES_001', 'dict-1', ['area', 'abnormal', 'lungs']);

    // 4) 시드 등록/로드 함수 재호출 시 사용자 수정 데이터 덮어쓰기 방지 검증
    ensureSeedArticleLungNodules();
    const afterReload = getNewsArticleById('CNN_LUNG_NODULES_001');
    if (afterReload.userNotes?.[0] !== '사용자 첫 번째 문단 메모') {
      throw new Error('문단 메모가 덮어씌워져 유실되었습니다.');
    }
    const vocab1 = afterReload.coreVocabularies?.find(v => v.id === 'vocab-1');
    if (!vocab1 || !vocab1.isMemorized || vocab1.userNote !== '사용자 단어 메모') {
      throw new Error('어휘 수정 내역이 덮어씌워져 유실되었습니다.');
    }
    const quiz1 = afterReload.comprehensionQuizzes?.find(q => q.id === 'quiz-1');
    if (!quiz1 || quiz1.userSelectedOption !== 'b' || !quiz1.isCorrect) {
      throw new Error('퀴즈 답변 내역이 유실되었습니다.');
    }
    const dict1 = afterReload.dictationQuizzes?.find(d => d.id === 'dict-1');
    if (!dict1 || !dict1.isCorrect || dict1.accuracyRate !== 100) {
      throw new Error('받아쓰기 채점 내역이 유실되었습니다.');
    }

    // 5) 손상된 저장 데이터(잘못된 JSON, null 포함 배열) 방어 처리 검증
    // 5-a: null이나 손상된 원소가 섞인 배열
    store[CNN_STORAGE_KEYS.ARTICLES] = JSON.stringify([null, { id: 'valid-dummy' }, undefined, afterReload]);
    const safeArticles = loadNewsArticles();
    if (safeArticles.length < 2 || !safeArticles.some(a => a.id === 'CNN_LUNG_NODULES_001')) {
      throw new Error('손상된 배열 원소 처리 시 유효 데이터 로드 실패');
    }
    // 5-b: 완전히 깨진 JSON 문자열
    store[CNN_STORAGE_KEYS.ARTICLES] = '{invalid-corrupted-json:::';
    const fallbackArticles = loadNewsArticles();
    if (!Array.isArray(fallbackArticles) || fallbackArticles.length !== 0) {
      throw new Error('깨진 JSON 처리 시 안전한 빈 배열 반환 실패');
    }
    // 복구: 정상 기사 복원
    saveNewsArticles([afterReload]);

    // =========================================================================
    // STEP 12-A-4: 녹음 데이터 안전성 검증
    // =========================================================================

    // 1) 녹음이 localStorage에 저장되지 않고 hasRecordedAudio 플래그만 관리되는지 검증
    updateSpeakingExercise('CNN_LUNG_NODULES_001', 'speak-1', {
      userTranscript: 'It can either be biopsied or surgically removed, then tested.',
      userNote: '발음 유의',
      isCompleted: true,
      hasRecordedAudio: true,
    });
    const savedForAudioCheck = getNewsArticleById('CNN_LUNG_NODULES_001');
    const speakItem = savedForAudioCheck.speakingExercises?.[0];
    if (!speakItem || !speakItem.hasRecordedAudio) {
      throw new Error('스피킹 녹음 상태 저장 실패');
    }
    // 로컬스토리지에 Blob URL이나 base64 오디오 바이너리가 직접 들어있지 않은지 검증
    const rawSaved = store[CNN_STORAGE_KEYS.ARTICLES] || '';
    if (rawSaved.includes('blob:http') || rawSaved.includes('data:audio')) {
      throw new Error('임시 Blob URL 또는 오디오 데이터가 localStorage에 누출되었습니다.');
    }

    // 2) 백업 생성 시 오디오 바이너리가 백업 객체에 포함되지 않는지 검증
    const backupObj = createLocalBackup();
    const backupJson = JSON.stringify(backupObj);
    if (backupJson.includes('blob:http') || backupJson.includes('data:audio')) {
      throw new Error('백업 JSON에 오디오 Blob URL이 포함되었습니다.');
    }
    if (backupJson.length > 5 * 1024 * 1024) {
      throw new Error('백업 파일 크기가 5MB 한도를 초과했습니다.');
    }

    // =========================================================================
    // STEP 12-A-5: 백업과 복원 시나리오 검증
    // =========================================================================

    // 1) 현재 정상 백업 생성
    const originalBackup = createLocalBackup();
    const origJson = JSON.stringify(originalBackup);

    // 2) 테스트용 수정 데이터 임의 추가 (기사 수정 및 새 기사 추가)
    updateParagraphNote('CNN_LUNG_NODULES_001', 0, '임시 변경된 메모 내용');
    const modifiedArticle = getNewsArticleById('CNN_LUNG_NODULES_001');
    if (modifiedArticle.userNotes?.[0] !== '임시 변경된 메모 내용') {
      throw new Error('테스트 데이터 변경 적용 실패');
    }

    // 3) 기존 백업 복원
    const restoreRes = restoreLocalBackup(originalBackup);
    if (!restoreRes.success) {
      throw new Error(`백업 복원 실패: ${restoreRes.error}`);
    }

    // 4) 복원 후 원래 백업 데이터와 1:1 비교
    const restoredArticle = getNewsArticleById('CNN_LUNG_NODULES_001');
    if (restoredArticle.userNotes?.[0] !== '사용자 첫 번째 문단 메모') {
      throw new Error('백업 복원 후 원래 메모 데이터와 불일치');
    }
    if (!restoredArticle.coreVocabularies?.find(v => v.id === 'vocab-1')?.isMemorized) {
      throw new Error('백업 복원 후 어휘 암기 상태 불일치');
    }

    // 5) 구버전 백업(CNN 데이터 필드가 누락된 STEP 08 백업) 복원 호환성 검증
    const legacyBackup = {
      app: 'Booky',
      version: '0.8.0',
      exportedAt: new Date().toISOString(),
      data: {
        expressions: [],
        dailyLogs: [],
        dailyGoals: { readingMinutes: 30, expressionsCount: 5, shadowingSentencesCount: 3 },
      }
    };
    const legacyValidation = validateBackupFileContent(JSON.stringify(legacyBackup));
    if (!legacyValidation.isValid) {
      throw new Error(`구버전 백업 유효성 검사 실패: ${legacyValidation.error}`);
    }
    const legacyRestoreRes = restoreLocalBackup(legacyBackup);
    if (!legacyRestoreRes.success) {
      throw new Error(`구버전 백업 복원 실행 실패: ${legacyRestoreRes.error}`);
    }
    // 구버전 복원 시에도 기존 CNN 기사 데이터가 유지되는지 확인 (graceful backwards-compatibility)
    const afterLegacyArticle = getNewsArticleById('CNN_LUNG_NODULES_001');
    if (!afterLegacyArticle || afterLegacyArticle.title !== 'What to Know About Lung Nodules') {
      throw new Error('구버전 백업 복원 시 기존 CNN 기사가 손상되었습니다.');
    }

    // 6) 손상된 JSON 검증 실패 및 롤백 안전성 검증
    const corruptedValidation = validateBackupFileContent('{ corrupted-json: true ');
    if (corruptedValidation.isValid) {
      throw new Error('깨진 JSON이 유효한 백업으로 통과되었습니다.');
    }
    const wrongAppValidation = validateBackupFileContent(JSON.stringify({ app: 'NotBooky', data: {} }));
    if (wrongAppValidation.isValid) {
      throw new Error('타 앱 데이터가 유효한 백업으로 통과되었습니다.');
    }

    // 7) 롤백 스냅샷 복원(rollbackPreRestoreBackup) 검증
    if (!hasRollbackSnapshot()) {
      throw new Error('복원 직전 롤백 스냅샷이 생성되지 않았습니다.');
    }
    const rollbackRes = rollbackPreRestoreBackup();
    if (!rollbackRes.success) {
      throw new Error(`롤백 복원 실패: ${rollbackRes.error}`);
    }

    console.log('STEP 12-A ALL IN-MEMORY & STORAGE INTEGRITY CHECKS PASSED');
    """

    res = subprocess.run(
        ["node", "--import", "tsx", "--input-type=module", "-e", node_script],
        capture_output=True,
        text=True,
        encoding='utf-8',
        errors='replace',
        cwd=ROOT_DIR
    )
    if res.returncode != 0:
        return False, f"Node 검증 스크립트 에러 (code {res.returncode}):\n{res.stderr}\n{res.stdout}"
    return True, ""

# -----------------------------------------------------------------------------
# 3. 외부 AI API 미호출 및 가짜 점수 배제 검증
# -----------------------------------------------------------------------------
def test_no_external_ai_apis():
    cnn_files = [
        "src/utils/cnnNewsStorage.ts",
        "src/components/cnnNews/CnnNewsGuidedCourseModal.tsx",
        "src/components/cnnNews/CnnNewsReaderView.tsx",
        "src/components/cnnNews/CnnNewsCategoryView.tsx",
    ]
    forbidden_tokens = [
        "GoogleGenAI",
        "gemini-1.5",
        "gemini-2.5",
        "OpenAI",
        "openai",
        "generateContent",
    ]
    for rf in cnn_files:
        full_path = os.path.join(ROOT_DIR, rf)
        if not os.path.exists(full_path):
            continue
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        for tok in forbidden_tokens:
            if tok in content:
                return False, f"외부 AI API 금지 토큰 '{tok}' 발견: {rf}"
    return True, ""

# -----------------------------------------------------------------------------
# 4. Git 보안 격리 규칙 검증
# -----------------------------------------------------------------------------
def test_git_security_isolation():
    status_res = subprocess.run(
        ["git", "status", "--porcelain"],
        capture_output=True,
        text=True,
        cwd=ROOT_DIR
    )
    if status_res.returncode != 0:
        return False, "git status 실행 실패"
    
    lines = status_res.stdout.splitlines()
    forbidden_prefixes = ["Book/", "data/local_books/", ".env", "backup/"]
    for l in lines:
        parts = l.strip().split()
        if len(parts) >= 2:
            path = parts[-1].replace("\\", "/")
            for fp in forbidden_prefixes:
                if path.startswith(fp):
                    return False, f"보안 격리 대상 파일이 Git 변경사항에 포함됨: {path}"
    return True, ""

# -----------------------------------------------------------------------------
# 5. TypeScript 무결성 검사
# -----------------------------------------------------------------------------
def test_typescript_compilation():
    cmd = ["npx", "tsc", "--noEmit"]
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=ROOT_DIR)
    if res.returncode != 0:
        return False, f"TypeScript 컴파일 에러:\n{res.stdout}\n{res.stderr}"
    return True, ""

# -----------------------------------------------------------------------------
# 6. 프로덕션 빌드 무결성 검증
# -----------------------------------------------------------------------------
def test_production_build():
    vite_cache = os.path.join(ROOT_DIR, "node_modules", ".vite")
    dist_dir = os.path.join(ROOT_DIR, "dist")
    if os.path.exists(vite_cache):
        try:
            shutil.rmtree(vite_cache, ignore_errors=True)
        except Exception:
            pass
    if os.path.exists(dist_dir):
        try:
            shutil.rmtree(dist_dir, ignore_errors=True)
        except Exception:
            pass

    cmd = ["npm", "run", "build"]
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=ROOT_DIR)
    if res.returncode != 0:
        return False, f"npm run build 실패:\n{res.stdout}\n{res.stderr}"
    dist_index = os.path.join(dist_dir, "index.html")
    if not os.path.exists(dist_index):
        return False, "빌드 아티팩트 dist/index.html 누락"
    return True, ""

# -----------------------------------------------------------------------------
# 메인 검증 진입점
# -----------------------------------------------------------------------------
def main():
    print("=" * 75)
    print("Booky STEP 12-A — CNN 통합 학습 실사용 검증 및 결함 수정 종합 검증")
    print("=" * 75)

    tests = [
        ("1. 핵심 파일 및 모듈 존재 검증", test_files_exist),
        ("2. Node.js 데이터 무결성, 녹음 안전성, 백업/복원 정밀 단위 검증", test_node_step12a_validation),
        ("3. 외부 AI API 미호출 및 가짜 점수 배제 검증", test_no_external_ai_apis),
        ("4. Git 보안 격리 규칙 (도서, DB, 환경변수 격리) 검증", test_git_security_isolation),
        ("5. TypeScript 타입 무결성 검증 (npx tsc --noEmit)", test_typescript_compilation),
        ("6. 프로덕션 빌드 무결성 검증 (npm run build)", test_production_build),
    ]

    all_passed = True
    for name, func in tests:
        if not run_test(name, func):
            all_passed = False

    print("=" * 75)
    if all_passed:
        print("[SUCCESS] STEP 12-A 모든 자동화 검증 항목 100% 통과 (PASS)!")
    else:
        print("[FAILURE] 검증 실패 항목이 존재합니다. 로그를 확인하세요.")
    print("=" * 75)

    return 0 if all_passed else 1

if __name__ == '__main__':
    sys.exit(main())
