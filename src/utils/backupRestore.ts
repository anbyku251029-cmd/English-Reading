/**
 * Booky STEP 08, 09, 10: 로컬 데이터 안전 백업 및 복원 유틸리티
 * 
 * - 브라우저 localStorage에 저장된 개인 학습 데이터(원서 + CNN 뉴스 + C2 코스 진행도)를 JSON 파일로 내보내기/불러오기
 * - 외부 서버나 AI API 통신 없이 100% 브라우저 로컬에서 안전하게 처리
 * - 최대 5MB 크기 제한, 필수 스키마 및 데이터 무결성 검증
 * - 복원 직전 자동 롤백 백업(booky_pre_restore_backup) 생성으로 실수 방지
 */

import {
  BackupData,
  BackupValidationResult,
  DailyGoals,
  DailyStudyLog,
  KeyExpression,
  ReadingProgress,
  CnnNewsArticle,
  CnnNewsStudyLog,
  GuidedCourseProgress,
} from '../types';
import {
  STORAGE_KEYS,
  loadDailyGoals,
  loadDailyLogs,
  loadSavedExpressions,
} from './studyStorage';
import {
  CNN_STORAGE_KEYS,
  loadNewsArticles,
  loadNewsStudyLogs,
  saveNewsArticles,
  saveNewsStudyLogs,
  loadAllGuidedProgress,
  saveAllGuidedProgress,
} from './cnnNewsStorage';

const MAX_BACKUP_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * 1. 현재 로컬 저장소의 모든 Booky 데이터(원서 + CNN 뉴스 + 단계별 코스)를 통합한 백업 객체 생성
 */
export function createLocalBackup(): BackupData {
  const expressions: KeyExpression[] = loadSavedExpressions();
  const dailyLogs: DailyStudyLog[] = loadDailyLogs();
  const dailyGoals: DailyGoals = loadDailyGoals();
  const cnnNewsArticles: CnnNewsArticle[] = loadNewsArticles();
  const cnnNewsLogs: CnnNewsStudyLog[] = loadNewsStudyLogs();
  const guidedProgressMap = loadAllGuidedProgress();
  const cnnGuidedProgress: GuidedCourseProgress[] = Object.values(guidedProgressMap);

  let readingProgress: ReadingProgress | undefined;
  try {
    const rawProgress = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (rawProgress) {
      readingProgress = JSON.parse(rawProgress);
    }
  } catch (e) {
    console.warn('Failed to parse reading progress for backup', e);
  }

  let checklist: Record<string, boolean> | undefined;
  try {
    const rawChecklist = localStorage.getItem(STORAGE_KEYS.CHECKLIST);
    if (rawChecklist) {
      checklist = JSON.parse(rawChecklist);
    }
  } catch (e) {
    console.warn('Failed to parse checklist for backup', e);
  }

  let vocabNotes: { word: string; note: string; bookTitle?: string; chapterTitle?: string; savedAt?: string }[] = [];
  try {
    const rawNotes = localStorage.getItem(STORAGE_KEYS.VOCAB_NOTES);
    if (rawNotes) {
      const parsed = JSON.parse(rawNotes);
      if (Array.isArray(parsed)) {
        vocabNotes = parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse vocab notes for backup', e);
  }

  let fontSize: number | undefined;
  try {
    const rawFont = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
    if (rawFont) {
      fontSize = parseInt(rawFont, 10);
    }
  } catch (e) {
    console.warn('Failed to parse font size for backup', e);
  }

  return {
    app: 'Booky',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      expressions,
      dailyLogs,
      readingProgress,
      checklist,
      vocabNotes,
      dailyGoals,
      fontSize,
      cnnNewsArticles,
      cnnNewsLogs,
      cnnGuidedProgress,
    },
  };
}

/**
 * 2. 백업 객체를 JSON 파일로 다운로드
 */
export function downloadBackupFile(backup: BackupData): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `booky-local-backup-${dateStr}.json`;
  const jsonStr = JSON.stringify(backup, null, 2);

  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 3. 업로드된 백업 JSON 파일 내용 검증
 */
export function validateBackupFileContent(rawContent: string): BackupValidationResult {
  // 1) 크기 제한 검사 (최대 5MB)
  if (!rawContent || rawContent.length > MAX_BACKUP_SIZE_BYTES) {
    return {
      isValid: false,
      error: '백업 파일 크기가 너무 큽니다 (최대 허용: 5MB). 올바른 Booky 백업 파일인지 확인해주세요.',
    };
  }

  // 2) JSON 파싱 검사
  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch (e) {
    return {
      isValid: false,
      error: '유효한 JSON 형식이 아닙니다. 파일이 손상되었거나 형식이 올바르지 않습니다.',
    };
  }

  // 3) Booky 애플리케이션 식별자 검증
  if (!parsed || typeof parsed !== 'object') {
    return {
      isValid: false,
      error: '백업 데이터 구조가 올바르지 않습니다.',
    };
  }

  if (parsed.app !== 'Booky') {
    return {
      isValid: false,
      error: 'Booky에서 생성된 백업 파일이 아닙니다. (app 식별자 불일치)',
    };
  }

  if (!parsed.data || typeof parsed.data !== 'object') {
    return {
      isValid: false,
      error: '백업 파일 내부에 데이터 섹션(data)이 누락되었습니다.',
    };
  }

  // 4) 핵심 배열 유효성 검사
  const expressions = Array.isArray(parsed.data.expressions) ? parsed.data.expressions : [];
  const dailyLogs = Array.isArray(parsed.data.dailyLogs) ? parsed.data.dailyLogs : [];
  const vocabNotes = Array.isArray(parsed.data.vocabNotes) ? parsed.data.vocabNotes : [];
  const cnnNewsArticles = Array.isArray(parsed.data.cnnNewsArticles) ? parsed.data.cnnNewsArticles : [];
  const cnnGuidedProgress = Array.isArray(parsed.data.cnnGuidedProgress) ? parsed.data.cnnGuidedProgress : [];

  return {
    isValid: true,
    itemCounts: {
      expressions: expressions.length,
      dailyLogs: dailyLogs.length,
      vocabNotes: vocabNotes.length,
      cnnNewsArticles: cnnNewsArticles.length,
      cnnGuidedProgress: cnnGuidedProgress.length,
    },
    backupData: parsed as BackupData,
  };
}

/**
 * 4. 검증된 백업 데이터를 로컬스토리지에 복원
 * - 복원 직전 현재 상태를 롤백 스냅샷(STORAGE_KEYS.PRE_RESTORE_BACKUP)에 자동 저장
 */
export function restoreLocalBackup(backup: BackupData): { success: boolean; error?: string } {
  try {
    // 1) 복원 직전 스냅샷 저장
    const currentBackup = createLocalBackup();
    localStorage.setItem(STORAGE_KEYS.PRE_RESTORE_BACKUP, JSON.stringify(currentBackup));

    // 2) 데이터 안전 덮어쓰기
    const { data } = backup;

    if (Array.isArray(data.expressions)) {
      localStorage.setItem(STORAGE_KEYS.EXPRESSIONS, JSON.stringify(data.expressions));
    }

    if (Array.isArray(data.dailyLogs)) {
      localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(data.dailyLogs));
    }

    if (data.readingProgress) {
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(data.readingProgress));
    }

    if (data.checklist) {
      localStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(data.checklist));
    }

    if (Array.isArray(data.vocabNotes)) {
      localStorage.setItem(STORAGE_KEYS.VOCAB_NOTES, JSON.stringify(data.vocabNotes));
    }

    if (data.dailyGoals) {
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(data.dailyGoals));
    }

    if (typeof data.fontSize === 'number') {
      localStorage.setItem(STORAGE_KEYS.FONT_SIZE, String(data.fontSize));
    }

    // Step 09 C2 뉴스 데이터 복원
    if (Array.isArray(data.cnnNewsArticles)) {
      saveNewsArticles(data.cnnNewsArticles);
    }

    if (Array.isArray(data.cnnNewsLogs)) {
      saveNewsStudyLogs(data.cnnNewsLogs);
    }

    // Step 10 코스 진행도 복원
    if (Array.isArray(data.cnnGuidedProgress)) {
      const map: Record<string, GuidedCourseProgress> = {};
      data.cnnGuidedProgress.forEach((p) => {
        if (p && p.newsId) map[p.newsId] = p;
      });
      saveAllGuidedProgress(map);
    }

    return { success: true };
  } catch (e: any) {
    console.error('Failed to restore local backup', e);
    return {
      success: false,
      error: e?.message || '로컬 저장소 복원 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 5. 직전 복원 취소 (롤백 복원)
 */
export function rollbackPreRestoreBackup(): { success: boolean; error?: string } {
  try {
    const rawSnapshot = localStorage.getItem(STORAGE_KEYS.PRE_RESTORE_BACKUP);
    if (!rawSnapshot) {
      return { success: false, error: '되돌릴 이전 백업 스냅샷이 존재하지 않습니다.' };
    }

    const snapshot = JSON.parse(rawSnapshot) as BackupData;
    const { data } = snapshot;

    if (Array.isArray(data.expressions)) {
      localStorage.setItem(STORAGE_KEYS.EXPRESSIONS, JSON.stringify(data.expressions));
    }
    if (Array.isArray(data.dailyLogs)) {
      localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(data.dailyLogs));
    }
    if (data.readingProgress) {
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(data.readingProgress));
    }
    if (data.checklist) {
      localStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(data.checklist));
    }
    if (Array.isArray(data.vocabNotes)) {
      localStorage.setItem(STORAGE_KEYS.VOCAB_NOTES, JSON.stringify(data.vocabNotes));
    }
    if (data.dailyGoals) {
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(data.dailyGoals));
    }
    if (typeof data.fontSize === 'number') {
      localStorage.setItem(STORAGE_KEYS.FONT_SIZE, String(data.fontSize));
    }

    if (Array.isArray(data.cnnNewsArticles)) {
      saveNewsArticles(data.cnnNewsArticles);
    }
    if (Array.isArray(data.cnnNewsLogs)) {
      saveNewsStudyLogs(data.cnnNewsLogs);
    }
    if (Array.isArray(data.cnnGuidedProgress)) {
      const map: Record<string, GuidedCourseProgress> = {};
      data.cnnGuidedProgress.forEach((p) => {
        if (p && p.newsId) map[p.newsId] = p;
      });
      saveAllGuidedProgress(map);
    }

    // 롤백 완료 후 스냅샷 정리
    localStorage.removeItem(STORAGE_KEYS.PRE_RESTORE_BACKUP);

    return { success: true };
  } catch (e: any) {
    console.error('Failed to rollback backup', e);
    return {
      success: false,
      error: e?.message || '이전 상태로 되돌리는 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 6. 롤백 가능한 직전 스냅샷이 존재하는지 확인
 */
export function hasRollbackSnapshot(): boolean {
  return !!localStorage.getItem(STORAGE_KEYS.PRE_RESTORE_BACKUP);
}
