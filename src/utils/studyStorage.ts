import { KeyExpression, DailyStudyLog, LearningStatsSummary, DailyGoals } from '../types';

export const STORAGE_KEYS = {
  EXPRESSIONS: 'booky_saved_expressions',
  DAILY_LOGS: 'booky_daily_logs',
  CHECKLIST: 'booky_reading_checklist',
  PROGRESS: 'booky_reading_progress',
  VOCAB_NOTES: 'booky_vocab_notes',
  GOALS: 'booky_daily_goals',
  FONT_SIZE: 'booky_font_size',
  PRE_RESTORE_BACKUP: 'booky_pre_restore_backup',
};

// ============================================================================
// 1. Expressions Storage & Review Management
// ============================================================================

export function loadSavedExpressions(): KeyExpression[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPRESSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item, idx) => ({
        ...item,
        id: item.id || `expr-${Date.now()}-${idx}`,
        reviewStatus: item.reviewStatus || 'new',
        reviewCount: item.reviewCount || 0,
      }));
    }
    return [];
  } catch (e) {
    console.warn('Failed to parse saved expressions from localStorage', e);
    return [];
  }
}

export function saveExpressions(expressions: KeyExpression[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPRESSIONS, JSON.stringify(expressions));
    return true;
  } catch (e) {
    console.warn('Failed to save expressions to localStorage', e);
    return false;
  }
}

export function addOrUpdateExpression(newExpr: KeyExpression): KeyExpression[] {
  const current = loadSavedExpressions();
  const normalized = newExpr.expression.trim().toLowerCase();
  const existingIdx = current.findIndex((e) => e.expression.trim().toLowerCase() === normalized);

  let updated: KeyExpression[];
  if (existingIdx >= 0) {
    // Update existing
    updated = [...current];
    updated[existingIdx] = {
      ...updated[existingIdx],
      ...newExpr,
      id: updated[existingIdx].id || `expr-${Date.now()}`,
      savedAt: updated[existingIdx].savedAt || new Date().toISOString().slice(0, 10),
    };
  } else {
    // Add new
    const toAdd: KeyExpression = {
      ...newExpr,
      id: newExpr.id || `expr-${Date.now()}`,
      savedAt: newExpr.savedAt || new Date().toISOString().slice(0, 10),
      reviewStatus: newExpr.reviewStatus || 'new',
      reviewCount: 0,
    };
    updated = [toAdd, ...current];
  }

  saveExpressions(updated);
  return updated;
}

export function recordExpressionReview(
  id: string,
  result: 'remembered' | 'review_again' | 'hard'
): KeyExpression[] {
  const current = loadSavedExpressions();
  const updated = current.map((e) => {
    if (e.id === id || e.expression === id) {
      return {
        ...e,
        reviewStatus: result,
        lastReviewedAt: new Date().toISOString().slice(0, 10),
        reviewCount: (e.reviewCount || 0) + 1,
      };
    }
    return e;
  });

  saveExpressions(updated);
  return updated;
}

// ============================================================================
// 2. Daily Study Logs Management (Step 07-B)
// ============================================================================

export function loadDailyLogs(): DailyStudyLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_LOGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse daily logs from localStorage', e);
    return [];
  }
}

export function saveDailyLogs(logs: DailyStudyLog[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(logs));
    return true;
  } catch (e) {
    console.warn('Failed to save daily logs', e);
    return false;
  }
}

export function recordChapterActivity(
  bookId: number | string,
  bookTitle: string,
  chapterId: number | string,
  chapterTitle: string,
  readParagraphs: number = 1,
  isCompleted: boolean = false
): DailyStudyLog[] {
  const today = new Date().toISOString().slice(0, 10);
  const logId = `${today}-${bookId}-${chapterId}`;
  const currentLogs = loadDailyLogs();
  const existingIdx = currentLogs.findIndex((l) => l.id === logId);

  let updatedLogs: DailyStudyLog[];
  if (existingIdx >= 0) {
    const existing = currentLogs[existingIdx];
    const updatedItem: DailyStudyLog = {
      ...existing,
      readParagraphsCount: Math.max(existing.readParagraphsCount, readParagraphs),
      isChapterCompleted: isCompleted || existing.isChapterCompleted,
      lastActiveTime: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
    updatedLogs = [...currentLogs];
    updatedLogs[existingIdx] = updatedItem;
  } else {
    const newItem: DailyStudyLog = {
      id: logId,
      date: today,
      bookId,
      bookTitle,
      chapterId,
      chapterTitle,
      readParagraphsCount: readParagraphs,
      savedExpressionsCount: 0,
      isChapterCompleted: isCompleted,
      lastActiveTime: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
    updatedLogs = [newItem, ...currentLogs];
  }

  saveDailyLogs(updatedLogs);
  return updatedLogs;
}

// ============================================================================
// 3. Learning Stats Calculation (Step 07-E)
// ============================================================================

export function calculateLearningStats(): LearningStatsSummary {
  const dailyLogs = loadDailyLogs();
  const expressions = loadSavedExpressions();
  const today = new Date().toISOString().slice(0, 10);

  // 1. Total unique study days
  const uniqueDates = new Set(dailyLogs.map((l) => l.date));
  const totalStudyDays = uniqueDates.size;

  // 2. Today's visited chapters
  const todayLogs = dailyLogs.filter((l) => l.date === today);
  const todayChapters = todayLogs.map((l) => ({
    bookTitle: l.bookTitle,
    chapterTitle: l.chapterTitle,
  }));

  // 3. Unique chapters visited
  const uniqueChapterIds = new Set(dailyLogs.map((l) => String(l.chapterId)));
  const uniqueChaptersVisited = uniqueChapterIds.size;

  // 4. Completed chapters count
  const completedChapterIds = new Set(
    dailyLogs.filter((l) => l.isChapterCompleted).map((l) => String(l.chapterId))
  );
  const completedChaptersCount = completedChapterIds.size;

  // 5. Saved & Reviewed expressions count
  const totalSavedExpressions = expressions.length;
  const reviewedExpressionsCount = expressions.filter((e) => (e.reviewCount || 0) > 0).length;

  // 6. Completed books count (at least 10 completed chapters for a book)
  const chaptersPerBook: Record<string, Set<string>> = {};
  dailyLogs
    .filter((l) => l.isChapterCompleted)
    .forEach((l) => {
      const bKey = String(l.bookId);
      if (!chaptersPerBook[bKey]) chaptersPerBook[bKey] = new Set();
      chaptersPerBook[bKey].add(String(l.chapterId));
    });

  let completedBooksCount = 0;
  for (const bKey in chaptersPerBook) {
    if (chaptersPerBook[bKey].size >= 10) {
      completedBooksCount += 1;
    }
  }

  return {
    totalStudyDays,
    todayChapters,
    uniqueChaptersVisited,
    completedChaptersCount,
    totalSavedExpressions,
    reviewedExpressionsCount,
    completedBooksCount,
    dailyLogs,
  };
}

// ============================================================================
// 5. Daily Goals Management (Step 08-B)
// ============================================================================

export const DEFAULT_DAILY_GOALS: DailyGoals = {
  targetChapters: 1,
  targetExpressions: 3,
  updatedAt: new Date().toISOString().slice(0, 10),
};

export function loadDailyGoals(): DailyGoals {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GOALS);
    if (!raw) return DEFAULT_DAILY_GOALS;
    const parsed = JSON.parse(raw);
    return {
      targetChapters: typeof parsed.targetChapters === 'number' && parsed.targetChapters > 0 ? parsed.targetChapters : 1,
      targetExpressions: typeof parsed.targetExpressions === 'number' && parsed.targetExpressions > 0 ? parsed.targetExpressions : 3,
      updatedAt: parsed.updatedAt || new Date().toISOString().slice(0, 10),
    };
  } catch (e) {
    console.warn('Failed to parse daily goals from localStorage', e);
    return DEFAULT_DAILY_GOALS;
  }
}

export function saveDailyGoals(goals: Partial<DailyGoals>): DailyGoals {
  try {
    const current = loadDailyGoals();
    const updated: DailyGoals = {
      targetChapters: goals.targetChapters ?? current.targetChapters,
      targetExpressions: goals.targetExpressions ?? current.targetExpressions,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save daily goals', e);
    return DEFAULT_DAILY_GOALS;
  }
}

export function calculateGoalProgress(goals: DailyGoals) {
  const today = new Date().toISOString().slice(0, 10);
  const dailyLogs = loadDailyLogs();
  const expressions = loadSavedExpressions();

  // 1. Chapters read or visited today
  const todayLogs = dailyLogs.filter((l) => l.date === today);
  const actualChaptersToday = todayLogs.length;
  const chapterProgressPercent = Math.min(100, Math.round((actualChaptersToday / goals.targetChapters) * 100));

  // 2. Expressions reviewed today
  const actualReviewedToday = expressions.filter(
    (e) => e.lastReviewedAt === today && (e.reviewCount || 0) > 0
  ).length;
  const expressionProgressPercent = Math.min(100, Math.round((actualReviewedToday / goals.targetExpressions) * 100));

  return {
    actualChaptersToday,
    targetChapters: goals.targetChapters,
    chapterProgressPercent,
    isChapterGoalAchieved: actualChaptersToday >= goals.targetChapters,

    actualReviewedToday,
    targetExpressions: goals.targetExpressions,
    expressionProgressPercent,
    isExpressionGoalAchieved: actualReviewedToday >= goals.targetExpressions,
  };
}

export function exportExpressionsToMarkdown(expressions: KeyExpression[]): string {
  const dateStr = new Date().toLocaleDateString('ko-KR');
  let md = `# 📚 Booky 영어 원서 표현 노트 및 학습 기록\n\n- 내보낸 일시: ${dateStr}\n- 총 저장된 표현: ${expressions.length}개\n\n---\n\n`;

  expressions.forEach((item, idx) => {
    md += `### ${idx + 1}. **${item.expression}**\n`;
    if (item.everydayMeaning) {
      md += `- **일상 의미:** ${item.everydayMeaning}\n`;
    }
    if (item.inContext) {
      md += `- **원서 문맥:** ${item.inContext}\n`;
    }
    if (item.bookTitle) {
      md += `- **출처:** ${item.bookTitle} (${item.chapterTitle || ''})\n`;
    }
    if (item.userNote) {
      md += `- **나의 메모:** ${item.userNote}\n`;
    }
    if (item.reviewStatus) {
      const statusMap: Record<string, string> = {
        remembered: '기억함 (Passed)',
        review_again: '다시 복습 필요',
        hard: '어려움',
        new: '새 표현',
      };
      md += `- **복습 상태:** ${statusMap[item.reviewStatus] || item.reviewStatus} (복습 횟수: ${item.reviewCount || 0}회)\n`;
    }
    md += `\n`;
  });

  return md;
}
