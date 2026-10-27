"""
Booky - STEP 07 독서 기록, 표현 복습, 학습 통계 자동 검증기
"""
import sys
import subprocess

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

def log(msg, symbol="ℹ️"):
    print(f"[{symbol}] {msg}")

# Node.js runner to test studyStorage logic in JS runtime
TEST_JS_CODE = """
import {
  loadSavedExpressions,
  saveExpressions,
  addOrUpdateExpression,
  recordExpressionReview,
  loadDailyLogs,
  saveDailyLogs,
  recordChapterActivity,
  calculateLearningStats,
  exportExpressionsToMarkdown,
} from './src/utils/studyStorage.ts';

// Mock localStorage
const store = {};
globalThis.localStorage = {
  getItem: (key) => store[key] || null,
  setItem: (key, val) => { store[key] = String(val); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
};

console.log('=== [1] 신규 표현 저장 및 중복 방지 테스트 ===');
const expr1 = {
  expression: 'into the woods',
  inContext: 'Annie raced into the woods.',
  everydayMeaning: '숲속으로 들어가다',
  dailyExample: 'Let us walk into the woods.',
  dailyExampleMeaning: '숲속으로 걸어가자.',
  bookTitle: 'Dinosaurs Before Dark',
  chapterTitle: 'Chapter 1: Into the Woods',
  bookId: 31,
  chapterId: 258,
};

let list = addOrUpdateExpression(expr1);
if (list.length !== 1) throw new Error('Expected 1 expression, got ' + list.length);
if (list[0].reviewStatus !== 'new') throw new Error('Expected status new');

// 중복 표현 저장 시 개수가 늘지 않고 내용이 갱신되는지 확인
const expr1Updated = {
  ...expr1,
  userNote: '주인공 잭과 애니가 모험을 시작한 장소',
};
list = addOrUpdateExpression(expr1Updated);
if (list.length !== 1) throw new Error('Duplicate expression created!');
if (list[0].userNote !== '주인공 잭과 애니가 모험을 시작한 장소') throw new Error('Note was not updated');
console.log('✅ 신규 표현 저장 및 중복 방지/갱신 정상 동작');

console.log('\\n=== [2] 표현 복습(Flashcard) 상태 기록 테스트 ===');
const exprId = list[0].id;
list = recordExpressionReview(exprId, 'remembered');
if (list[0].reviewStatus !== 'remembered') throw new Error('Expected status remembered');
if (list[0].reviewCount !== 1) throw new Error('Expected reviewCount 1');

list = recordExpressionReview(exprId, 'review_again');
if (list[0].reviewStatus !== 'review_again') throw new Error('Expected status review_again');
if (list[0].reviewCount !== 2) throw new Error('Expected reviewCount 2');
console.log('✅ 표현 복습 상태(remembered, review_again) 및 횟수 기록 정상 동작');

console.log('\\n=== [3] 일별 독서 활동(Daily Logs) 기록 테스트 ===');
let logs = recordChapterActivity(31, 'Dinosaurs Before Dark', 258, 'Chapter 1: Into the Woods', 15, false);
if (logs.length !== 1) throw new Error('Expected 1 log, got ' + logs.length);
if (logs[0].readParagraphsCount !== 15) throw new Error('Expected readParagraphs 15');

// 같은 날 같은 챕터 추가 활동 시 문단 수 업데이트 확인
logs = recordChapterActivity(31, 'Dinosaurs Before Dark', 258, 'Chapter 1: Into the Woods', 25, true);
if (logs.length !== 1) throw new Error('Duplicate daily log created!');
if (logs[0].readParagraphsCount !== 25) throw new Error('Expected readParagraphs 25');
if (logs[0].isChapterCompleted !== true) throw new Error('Expected isChapterCompleted true');
console.log('✅ 일별 독서 활동 및 챕터 완료 기록 정상 동작');

console.log('\\n=== [4] 실제 기록 기반 학습 통계 계산 테스트 ===');
const stats = calculateLearningStats();
if (stats.totalStudyDays !== 1) throw new Error('Expected totalStudyDays 1');
if (stats.uniqueChaptersVisited !== 1) throw new Error('Expected uniqueChaptersVisited 1');
if (stats.completedChaptersCount !== 1) throw new Error('Expected completedChaptersCount 1');
if (stats.totalSavedExpressions !== 1) throw new Error('Expected totalSavedExpressions 1');
if (stats.reviewedExpressionsCount !== 1) throw new Error('Expected reviewedExpressionsCount 1');
console.log('✅ 실제 기록 기반 통계(학습일: 1일, 챕터: 1개, 표현: 1개, 복습: 1개) 정확 계산 확인');

console.log('\\n=== [5] 깨진 JSON 및 손상된 localStorage 복구 테스트 ===');
store['booky_saved_expressions'] = '{broken_json...';
store['booky_daily_logs'] = 'invalid_data';
const recoveredExprs = loadSavedExpressions();
const recoveredLogs = loadDailyLogs();
if (!Array.isArray(recoveredExprs) || recoveredExprs.length !== 0) throw new Error('Failed to handle broken expressions');
if (!Array.isArray(recoveredLogs) || recoveredLogs.length !== 0) throw new Error('Failed to handle broken logs');
console.log('✅ 손상된 JSON 데이터에 대해 앱 크래시 없이 빈 배열로 안전 복구 확인');

console.log('\\n=== [6] Markdown 내보내기 텍스트 형식 테스트 ===');
store['booky_saved_expressions'] = JSON.stringify([expr1Updated]);
const md = exportExpressionsToMarkdown(loadSavedExpressions());
if (!md.includes('into the woods')) throw new Error('Missing expression in markdown');
if (!md.includes('Dinosaurs Before Dark')) throw new Error('Missing book title in markdown');
console.log('✅ Markdown 내보내기 헤더 및 출처 서식 정상 생성 확인');

console.log('\\n🎉 모든 로컬 학습 기록·표현 복습·통계 단위 테스트 100% 통과!');
"""

def run():
    print("=" * 70)
    print("Booky STEP 07 학습 기록 및 복습 시스템 자동화 검증")
    print("=" * 70)
    log("Node.js 환경에서 studyStorage 모듈 단위 테스트 실행 중...", "🚀")

    proc = subprocess.run(
        ["node", "--import", "tsx", "--input-type=module", "-e", TEST_JS_CODE],
        capture_output=True,
        text=True,
        encoding="utf-8"
    )

    print(proc.stdout)
    if proc.stderr:
        print(proc.stderr, file=sys.stderr)

    if proc.returncode != 0:
        log("테스트 실행 실패!", "❌")
        sys.exit(proc.returncode)

    log("모든 STEP 07 단위 및 통합 검증 통과 완료!", "🎉")
    print("=" * 70)

if __name__ == "__main__":
    run()
