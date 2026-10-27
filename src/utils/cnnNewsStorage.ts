/**
 * Booky STEP 09: CNN News C2 고급 영어 로컬 저장소 및 학습 엔진
 * 
 * - 100% 브라우저 localStorage 기반 뉴스 기사 및 C2 학습 데이터 관리
 * - C2 8대 독해 질문 표준 템플릿 제공
 * - 규칙 기반 문장 분할 (약어 오분할 방지)
 * - 기존 원서 표현 노트(KeyExpression) 및 통계 시스템과의 안전한 연동
 */

import {
  CnnNewsArticle,
  CnnNewsStudyLog,
  KeyExpression,
  NewsStudyStatus,
  ReadingQuestionItem,
  SentenceAnalysisItem,
  WritingOutputData,
  DebateOutputData,
  GuidedCourseStep,
  GuidedCourseProgress,
} from '../types';
import { STORAGE_KEYS as STUDY_KEYS, loadSavedExpressions, saveExpressions } from './studyStorage';

export const CNN_STORAGE_KEYS = {
  ARTICLES: 'booky_cnn_news_articles',
  LOGS: 'booky_cnn_news_logs',
  GUIDED_PROGRESS: 'booky_cnn_guided_progress',
};

// ============================================================================
// 1. C2 8대 독해 질문 표준 템플릿 (Step 09-C)
// ============================================================================

export const DEFAULT_C2_READING_QUESTIONS: Omit<ReadingQuestionItem, 'userAnswer' | 'userExplanation' | 'updatedAt'>[] = [
  {
    id: 'q-1-main-argument',
    type: 'main_argument',
    questionLabel: '1. Main Argument (필자의 핵심 주장)',
    prompt: '기사의 표면적 사실 전달을 넘어, 필자가 독자에게 전달하고자 하는 궁극적인 중심 논지(Core Thesis)는 무엇인가?',
  },
  {
    id: 'q-2-inference',
    type: 'inference',
    questionLabel: '2. Inference (심층 문맥 추론)',
    prompt: '명시적으로 서술되지 않았지만, 인용문과 통계 배치를 통해 필자가 암시(imply)하는 바는 무엇인가?',
  },
  {
    id: 'q-3-tone-and-stance',
    type: 'tone_and_stance',
    questionLabel: '3. Tone and Stance (어조와 입장)',
    prompt: '기사 전반에 흐르는 필자의 어조(Skeptical, Urgent, Neutral, Condemnatory 등)와 대상에 대한 태도는 어떠한가?',
  },
  {
    id: 'q-4-evidence',
    type: 'evidence',
    questionLabel: '4. Evidence (근거의 신뢰성과 적절성)',
    prompt: '필자의 주장을 뒷받침하기 위해 제시된 정량적 데이터나 취재원의 신뢰도는 충분한가? 편향은 없는가?',
  },
  {
    id: 'q-5-rhetorical-strategy',
    type: 'rhetorical_strategy',
    questionLabel: '5. Rhetorical Strategy (수사적 전략)',
    prompt: '독자의 감정이나 논리에 호소하기 위해 사용된 은유(Metaphor), 대조(Antithesis), 도치, 인용 배치 전략은 무엇인가?',
  },
  {
    id: 'q-6-ambiguity',
    type: 'ambiguity',
    questionLabel: '6. Ambiguity (중의적 어휘와 행간 해석)',
    prompt: '기사에서 다의적으로 해석될 수 있는 단어, 외교적/정치적 완곡어법(Euphemism)은 어떤 함의를 지니는가?',
  },
  {
    id: 'q-7-critical-evaluation',
    type: 'critical_evaluation',
    questionLabel: '7. Critical Evaluation (비판적 평가)',
    prompt: '기사의 논리적 전개에 비약이나 간과된 변수는 없는가? 논증의 강점과 한계는 무엇인가?',
  },
  {
    id: 'q-8-alternative-interpretation',
    type: 'alternative_interpretation',
    questionLabel: '8. Alternative Interpretation (대안적 시각)',
    prompt: '기사의 사건이나 현상을 반대 진영의 관점이나 다른 경제·정치적 패러다임에서 해석한다면 어떻게 달라지는가?',
  },
];

export function createDefaultReadingQuestions(): ReadingQuestionItem[] {
  const now = new Date().toISOString();
  return DEFAULT_C2_READING_QUESTIONS.map((q) => ({
    ...q,
    userAnswer: '',
    userExplanation: '',
    updatedAt: now,
  }));
}

// ============================================================================
// 2. 규칙 기반 문장 분할 (약어 오분할 방지)
// ============================================================================

export function splitIntoSentences(paragraphText: string): string[] {
  if (!paragraphText || !paragraphText.trim()) return [];

  // 약어 임시 치환
  const placeholderMap: [RegExp, string][] = [
    [/\bU\.S\./gi, '__US__'],
    [/\be\.g\./gi, '__EG__'],
    [/\bi\.e\./gi, '__IE__'],
    [/\bMr\./gi, '__MR__'],
    [/\bMs\./gi, '__MS__'],
    [/\bMrs\./gi, '__MRS__'],
    [/\bDr\./gi, '__DR__'],
    [/\bProf\./gi, '__PROF__'],
    [/\bvs\./gi, '__VS__'],
    [/\bJan\./gi, '__JAN__'],
    [/\bFeb\./gi, '__FEB__'],
    [/\bMar\./gi, '__MAR__'],
    [/\bApr\./gi, '__APR__'],
    [/\bAug\./gi, '__AUG__'],
    [/\bSept\./gi, '__SEPT__'],
    [/\bOct\./gi, '__OCT__'],
    [/\bNov\./gi, '__NOV__'],
    [/\bDec\./gi, '__DEC__'],
    [/\bNo\./gi, '__NO__'],
    [/\bCo\./gi, '__CO__'],
    [/\bInc\./gi, '__INC__'],
    [/\bCorp\./gi, '__CORP__'],
    [/\bLtd\./gi, '__LTD__'],
    [/\bSt\./gi, '__ST__'],
  ];

  let text = paragraphText;
  placeholderMap.forEach(([regex, token]) => {
    text = text.replace(regex, token);
  });

  // 따옴표 및 종결 부호(.!?) 뒤 공백 기준 분할
  const rawSentences = text.split(/(?<=[.!?]["'”’]?)\s+(?=[A-Z0-9"“'‘])/g);

  // 원복
  return rawSentences
    .map((s) => {
      let restored = s.trim();
      placeholderMap.forEach(([_, token]) => {
        const original = token.replace(/__([A-Z0-9]+)__/, (match, p1) => {
          switch (p1) {
            case 'US': return 'U.S.';
            case 'EG': return 'e.g.';
            case 'IE': return 'i.e.';
            case 'MR': return 'Mr.';
            case 'MS': return 'Ms.';
            case 'MRS': return 'Mrs.';
            case 'DR': return 'Dr.';
            case 'PROF': return 'Prof.';
            case 'VS': return 'vs.';
            case 'JAN': return 'Jan.';
            case 'FEB': return 'Feb.';
            case 'MAR': return 'Mar.';
            case 'APR': return 'Apr.';
            case 'AUG': return 'Aug.';
            case 'SEPT': return 'Sept.';
            case 'OCT': return 'Oct.';
            case 'NOV': return 'Nov.';
            case 'DEC': return 'Dec.';
            case 'NO': return 'No.';
            case 'CO': return 'Co.';
            case 'INC': return 'Inc.';
            case 'CORP': return 'Corp.';
            case 'LTD': return 'Ltd.';
            case 'ST': return 'St.';
            default: return match;
          }
        });
        restored = restored.replace(new RegExp(token, 'g'), original);
      });
      return restored;
    })
    .filter((s) => s.length > 0);
}

// ============================================================================
// 3. 기사 CRUD (Articles Management)
// ============================================================================

export function loadNewsArticles(): CnnNewsArticle[] {
  try {
    const raw = localStorage.getItem(CNN_STORAGE_KEYS.ARTICLES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse cnn news articles from localStorage', e);
    return [];
  }
}

export function saveNewsArticles(articles: CnnNewsArticle[]): void {
  try {
    localStorage.setItem(CNN_STORAGE_KEYS.ARTICLES, JSON.stringify(articles));
  } catch (e) {
    console.error('Failed to save cnn news articles to localStorage', e);
  }
}

export function getNewsArticleById(id: string): CnnNewsArticle | undefined {
  const list = loadNewsArticles();
  return list.find((a) => a.id === id);
}

export function addNewsArticle(
  input: {
    title: string;
    source?: string;
    articleDate?: string;
    topic?: string;
    rawContent: string;
    paragraphs: string[];
    koreanSummary?: string;
    fileName: string;
    fileType: 'txt' | 'md' | 'html' | 'manual';
  }
): CnnNewsArticle {
  const list = loadNewsArticles();
  const id = `cnn-news-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  const newArticle: CnnNewsArticle = {
    id,
    title: input.title.trim() || 'Untitled CNN News',
    source: input.source?.trim() || 'CNN',
    articleDate: input.articleDate?.trim() || '미확인',
    createdAt: now,
    topic: input.topic?.trim() || 'World',
    rawContent: input.rawContent,
    paragraphs: input.paragraphs,
    koreanSummary: input.koreanSummary?.trim() || '',
    status: 'not_started',
    userNotes: {},
    fileName: input.fileName,
    fileType: input.fileType,
    sentenceAnalyses: {},
    readingQuestions: createDefaultReadingQuestions(),
    writingOutput: {
      summary: '',
      stance: 'neutral',
      opinionEssay: '',
      alternativeProposals: '',
      koreanDraft: '',
      createdAt: now,
      updatedAt: now,
    },
    debateOutput: {
      coreIssue: '',
      argumentsFor: '',
      argumentsAgainst: '',
      counterArguments: '',
      rebuttal: '',
      finalPosition: '',
      updatedAt: now,
    },
    lastReadParagraphIndex: 0,
    lastReadAt: now,
  };

  const updated = [newArticle, ...list];
  saveNewsArticles(updated);
  return newArticle;
}

export function updateNewsArticle(updatedArticle: CnnNewsArticle): void {
  const list = loadNewsArticles();
  const index = list.findIndex((a) => a.id === updatedArticle.id);
  if (index >= 0) {
    list[index] = {
      ...updatedArticle,
      lastReadAt: new Date().toISOString(),
    };
    saveNewsArticles(list);
  }
}

export function deleteNewsArticle(id: string): boolean {
  const list = loadNewsArticles();
  const filtered = list.filter((a) => a.id !== id);
  if (filtered.length !== list.length) {
    saveNewsArticles(filtered);
    return true;
  }
  return false;
}

// ============================================================================
// 4. 문장 분석 및 문단 메모 저장
// ============================================================================

export function updateSentenceAnalysis(newsId: string, analysis: SentenceAnalysisItem): void {
  const article = getNewsArticleById(newsId);
  if (!article) return;

  const currentAnalyses = article.sentenceAnalyses || {};
  article.sentenceAnalyses = {
    ...currentAnalyses,
    [analysis.id]: analysis,
  };

  // 문장 분석이 있으면 최소 'in_progress' 상태로 전환
  if (article.status === 'not_started') {
    article.status = 'in_progress';
  }

  updateNewsArticle(article);
  recordNewsActivity(newsId, article.title, article.status);
}

export function deleteSentenceAnalysis(newsId: string, sentenceId: string): void {
  const article = getNewsArticleById(newsId);
  if (!article || !article.sentenceAnalyses) return;

  delete article.sentenceAnalyses[sentenceId];
  updateNewsArticle(article);
}

export function updateParagraphNote(newsId: string, paragraphIndex: number, note: string): void {
  const article = getNewsArticleById(newsId);
  if (!article) return;

  const currentNotes = article.userNotes || {};
  if (!note.trim()) {
    delete currentNotes[paragraphIndex];
  } else {
    currentNotes[paragraphIndex] = note.trim();
  }
  article.userNotes = { ...currentNotes };
  updateNewsArticle(article);
}

// ============================================================================
// 5. C2 질문 답변 및 작문/토론 저장
// ============================================================================

export function updateQuestionAnswer(
  newsId: string,
  questionId: string,
  userAnswer: string,
  userExplanation?: string
): void {
  const article = getNewsArticleById(newsId);
  if (!article) return;

  article.readingQuestions = article.readingQuestions.map((q) => {
    if (q.id === questionId) {
      return {
        ...q,
        userAnswer,
        userExplanation: userExplanation ?? q.userExplanation,
        updatedAt: new Date().toISOString(),
      };
    }
    return q;
  });

  if (article.status === 'not_started') {
    article.status = 'in_progress';
  }

  updateNewsArticle(article);
  recordNewsActivity(newsId, article.title, article.status);
}

export function updateWritingOutput(newsId: string, writing: WritingOutputData): void {
  const article = getNewsArticleById(newsId);
  if (!article) return;

  article.writingOutput = {
    ...writing,
    updatedAt: new Date().toISOString(),
  };

  if (article.status === 'not_started') {
    article.status = 'in_progress';
  }

  updateNewsArticle(article);
  recordNewsActivity(newsId, article.title, article.status);
}

export function updateDebateOutput(newsId: string, debate: DebateOutputData): void {
  const article = getNewsArticleById(newsId);
  if (!article) return;

  article.debateOutput = {
    ...debate,
    updatedAt: new Date().toISOString(),
  };

  if (article.status === 'not_started') {
    article.status = 'in_progress';
  }

  updateNewsArticle(article);
  recordNewsActivity(newsId, article.title, article.status);
}

// ============================================================================
// 6. 표현 저장 및 기존 표현 노트 연동 (Step 09-D)
// ============================================================================

export function saveNewsExpression(item: {
  expression: string;
  inContext: string;
  everydayMeaning: string;
  newsId: string;
  newsTitle: string;
  partOfSpeech?: string;
  englishDefinition?: string;
  synonymsAntonyms?: string;
  formalityLevel?: 'formal' | 'informal' | 'academic' | 'journalistic';
  usageContext?: string;
  userNote?: string;
}): KeyExpression[] {
  const currentList = loadSavedExpressions();
  const now = new Date().toISOString();

  // 기존 동일 표현 검색 (표현 문자열 기준)
  const normExpr = item.expression.trim().toLowerCase();
  const existingIdx = currentList.findIndex((e) => e.expression.trim().toLowerCase() === normExpr);

  let updatedList: KeyExpression[];
  if (existingIdx >= 0) {
    const prev = currentList[existingIdx];
    const merged: KeyExpression = {
      ...prev,
      inContext: item.inContext || prev.inContext,
      everydayMeaning: item.everydayMeaning || prev.everydayMeaning,
      sourceType: 'news',
      newsId: item.newsId,
      newsTitle: item.newsTitle,
      source: 'CNN',
      partOfSpeech: item.partOfSpeech || prev.partOfSpeech,
      englishDefinition: item.englishDefinition || prev.englishDefinition,
      synonymsAntonyms: item.synonymsAntonyms || prev.synonymsAntonyms,
      formalityLevel: item.formalityLevel || prev.formalityLevel,
      usageContext: item.usageContext || prev.usageContext,
      userNote: item.userNote !== undefined ? item.userNote : prev.userNote,
      savedAt: now,
    };
    updatedList = [...currentList];
    updatedList[existingIdx] = merged;
  } else {
    const newItem: KeyExpression = {
      id: `expr-news-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      expression: item.expression.trim(),
      inContext: item.inContext.trim(),
      everydayMeaning: item.everydayMeaning.trim(),
      dailyExample: item.inContext.trim(),
      dailyExampleMeaning: item.everydayMeaning.trim(),
      sourceType: 'news',
      newsId: item.newsId,
      newsTitle: item.newsTitle,
      source: 'CNN',
      partOfSpeech: item.partOfSpeech,
      englishDefinition: item.englishDefinition,
      synonymsAntonyms: item.synonymsAntonyms,
      formalityLevel: item.formalityLevel || 'journalistic',
      usageContext: item.usageContext,
      userNote: item.userNote || '',
      reviewStatus: 'new',
      reviewCount: 0,
      savedAt: now,
    };
    updatedList = [newItem, ...currentList];
  }

  saveExpressions(updatedList);
  return updatedList;
}

export function loadNewsExpressions(newsId?: string): KeyExpression[] {
  const all = loadSavedExpressions();
  const newsOnly = all.filter((e) => e.sourceType === 'news' || !!e.newsId);
  if (!newsId) return newsOnly;
  return newsOnly.filter((e) => e.newsId === newsId);
}

// ============================================================================
// 7. 뉴스 학습 활동 기록 및 통계 (Step 09-F)
// ============================================================================

export function loadNewsStudyLogs(): CnnNewsStudyLog[] {
  try {
    const raw = localStorage.getItem(CNN_STORAGE_KEYS.LOGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse cnn news logs from localStorage', e);
    return [];
  }
}

export function saveNewsStudyLogs(logs: CnnNewsStudyLog[]): void {
  try {
    localStorage.setItem(CNN_STORAGE_KEYS.LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save cnn news logs', e);
  }
}

export function recordNewsActivity(
  newsId: string,
  newsTitle: string,
  status: NewsStudyStatus
): void {
  const article = getNewsArticleById(newsId);
  if (!article) return;

  const today = new Date().toISOString().slice(0, 10);
  const logId = `${today}-${newsId}`;
  const currentLogs = loadNewsStudyLogs();

  const analyzedCount = Object.keys(article.sentenceAnalyses || {}).length;
  const answeredQCount = (article.readingQuestions || []).filter((q) => q.userAnswer?.trim().length > 0).length;
  const hasWriting = !!(article.writingOutput?.summary?.trim() || article.writingOutput?.opinionEssay?.trim());
  const hasDebate = !!(article.debateOutput?.coreIssue?.trim() || article.debateOutput?.finalPosition?.trim());
  const savedExprCount = loadNewsExpressions(newsId).length;

  const existingIdx = currentLogs.findIndex((l) => l.id === logId);
  let updatedLogs: CnnNewsStudyLog[];

  const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  if (existingIdx >= 0) {
    const prev = currentLogs[existingIdx];
    const merged: CnnNewsStudyLog = {
      ...prev,
      newsTitle,
      status,
      analyzedSentencesCount: Math.max(prev.analyzedSentencesCount, analyzedCount),
      savedExpressionsCount: Math.max(prev.savedExpressionsCount, savedExprCount),
      answeredQuestionsCount: Math.max(prev.answeredQuestionsCount, answeredQCount),
      hasWriting: prev.hasWriting || hasWriting,
      hasDebate: prev.hasDebate || hasDebate,
      lastActiveTime: timeStr,
    };
    updatedLogs = [...currentLogs];
    updatedLogs[existingIdx] = merged;
  } else {
    const newLog: CnnNewsStudyLog = {
      id: logId,
      date: today,
      newsId,
      newsTitle,
      status,
      analyzedSentencesCount: analyzedCount,
      savedExpressionsCount: savedExprCount,
      answeredQuestionsCount: answeredQCount,
      hasWriting,
      hasDebate,
      lastActiveTime: timeStr,
    };
    updatedLogs = [newLog, ...currentLogs];
  }

  saveNewsStudyLogs(updatedLogs);
}

export interface CnnNewsStatsSummary {
  totalArticles: number;
  completedArticles: number;
  inProgressArticles: number;
  totalAnalyzedSentences: number;
  totalNewsExpressions: number;
  totalAnsweredQuestions: number;
  totalWritingDrafts: number;
  totalDebateDrafts: number;
  recentLogs: CnnNewsStudyLog[];
}

export function calculateNewsStats(): CnnNewsStatsSummary {
  const articles = loadNewsArticles();
  const logs = loadNewsStudyLogs();
  const newsExpressions = loadNewsExpressions();

  let completedArticles = 0;
  let inProgressArticles = 0;
  let totalAnalyzedSentences = 0;
  let totalAnsweredQuestions = 0;
  let totalWritingDrafts = 0;
  let totalDebateDrafts = 0;

  articles.forEach((a) => {
    if (a.status === 'completed') completedArticles += 1;
    else if (a.status === 'in_progress') inProgressArticles += 1;

    totalAnalyzedSentences += Object.keys(a.sentenceAnalyses || {}).length;
    totalAnsweredQuestions += (a.readingQuestions || []).filter((q) => q.userAnswer?.trim()).length;
    if (a.writingOutput?.summary?.trim() || a.writingOutput?.opinionEssay?.trim()) {
      totalWritingDrafts += 1;
    }
    if (a.debateOutput?.coreIssue?.trim() || a.debateOutput?.finalPosition?.trim()) {
      totalDebateDrafts += 1;
    }
  });

  return {
    totalArticles: articles.length,
    completedArticles,
    inProgressArticles,
    totalAnalyzedSentences,
    totalNewsExpressions: newsExpressions.length,
    totalAnsweredQuestions,
    totalWritingDrafts,
    totalDebateDrafts,
    recentLogs: logs.slice(0, 10),
  };
}

// ============================================================================
// 8. CNN News C2 Guided Course Management (Step 10)
// ============================================================================

export function loadAllGuidedProgress(): Record<string, GuidedCourseProgress> {
  try {
    const raw = localStorage.getItem(CNN_STORAGE_KEYS.GUIDED_PROGRESS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    console.warn('Failed to parse cnn guided progress from localStorage', e);
    return {};
  }
}

export function saveAllGuidedProgress(map: Record<string, GuidedCourseProgress>): void {
  try {
    localStorage.setItem(CNN_STORAGE_KEYS.GUIDED_PROGRESS, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save cnn guided progress', e);
  }
}

export function getGuidedProgress(newsId: string): GuidedCourseProgress {
  const all = loadAllGuidedProgress();
  if (all[newsId]) {
    return all[newsId];
  }

  // 기본 초기 진행 상태 생성 및 저장
  const initial: GuidedCourseProgress = {
    newsId,
    currentStep: 'NOT_STARTED',
    highestStepReached: 'NOT_STARTED',
    lastParagraphIndex: 0,
    lastModifiedAt: new Date().toISOString(),
    checklist: {
      hasReadPassage: false,
      analyzedSentenceIds: [],
      answeredQuestionIds: [],
      hasCompletedWriting: false,
      hasReviewedAll: false,
    },
  };
  all[newsId] = initial;
  saveAllGuidedProgress(all);
  return initial;
}

export function updateGuidedProgress(
  newsId: string,
  updates: Partial<GuidedCourseProgress>
): GuidedCourseProgress {
  const all = loadAllGuidedProgress();
  const current = getGuidedProgress(newsId);

  // 단계 도달 순서 우선순위
  const stepRank: Record<GuidedCourseStep, number> = {
    NOT_STARTED: 0,
    READING: 1,
    ANALYSIS: 2,
    COMPREHENSION: 3,
    WRITING: 4,
    REVIEW: 5,
    COMPLETED: 6,
  };

  const newStep = updates.currentStep || current.currentStep;
  const highest =
    stepRank[newStep] > stepRank[current.highestStepReached]
      ? newStep
      : current.highestStepReached;

  const merged: GuidedCourseProgress = {
    ...current,
    ...updates,
    checklist: {
      ...current.checklist,
      ...(updates.checklist || {}),
    },
    highestStepReached: highest,
    lastModifiedAt: new Date().toISOString(),
  };

  if (!merged.startedAt && newStep !== 'NOT_STARTED') {
    merged.startedAt = new Date().toISOString();
  }

  if (newStep === 'COMPLETED' && !merged.completedAt) {
    merged.completedAt = new Date().toISOString();
  }

  all[newsId] = merged;
  saveAllGuidedProgress(all);
  return merged;
}

/**
 * 기사의 실제 저장 데이터와 코스 진행 체크리스트 동기화
 * (가짜 완료를 방지하고 실제 사용자가 작성한 내역을 기반으로 정합성 보장)
 */
export function syncGuidedProgressWithArticle(article: CnnNewsArticle): GuidedCourseProgress {
  const current = getGuidedProgress(article.id);

  const analyzedIds = Object.keys(article.sentenceAnalyses || {});
  const answeredIds = (article.readingQuestions || [])
    .filter((q) => q.userAnswer && q.userAnswer.trim().length > 0)
    .map((q) => q.id);

  const hasWriting = !!(
    (article.writingOutput?.summary && article.writingOutput.summary.trim().length > 0) ||
    (article.writingOutput?.opinionEssay && article.writingOutput.opinionEssay.trim().length > 0) ||
    (article.debateOutput?.coreIssue && article.debateOutput.coreIssue.trim().length > 0)
  );

  const updatedChecklist = {
    hasReadPassage: current.checklist.hasReadPassage || (article.lastReadParagraphIndex || 0) > 0 || article.paragraphs.length > 0,
    analyzedSentenceIds: analyzedIds,
    answeredQuestionIds: answeredIds,
    hasCompletedWriting: hasWriting,
    hasReviewedAll: current.checklist.hasReviewedAll,
  };

  return updateGuidedProgress(article.id, {
    checklist: updatedChecklist,
    lastParagraphIndex: article.lastReadParagraphIndex || current.lastParagraphIndex,
  });
}

