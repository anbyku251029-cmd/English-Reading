export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  step?: number;
  timestamp: Date;
  targetSentence?: string;
  isError?: boolean;
}

export interface KeyExpression {
  id?: string;
  expression: string;
  inContext: string;
  everydayMeaning: string;
  dailyExample: string;
  dailyExampleMeaning: string;
  bookId?: number | string;
  bookTitle?: string;
  chapterId?: number | string;
  chapterTitle?: string;
  paragraphNumber?: number;
  savedAt?: string;
  userNote?: string;
  reviewStatus?: 'new' | 'remembered' | 'review_again' | 'hard';
  lastReviewedAt?: string;
  reviewCount?: number;
  // C2 News Expansion (Step 09)
  sourceType?: 'book' | 'news';
  newsId?: string;
  newsTitle?: string;
  source?: string;
  partOfSpeech?: string;
  englishDefinition?: string;
  synonymsAntonyms?: string;
  formalityLevel?: 'formal' | 'informal' | 'academic' | 'journalistic';
  usageContext?: string;
}

export interface ShadowingSentence {
  sentence: string;
  rhythmChunks: string;
  rhythmTip: string;
}

export interface StudyPack {
  sceneSummary: string;
  keyExpressions: KeyExpression[];
  shadowingSentences: ShadowingSentence[];
  discussionPrompt: string;
  roleplayScenario: string;
  personalOutputPrompt: string;
}

export interface ShadowingFeedback {
  score: number;
  praise: string;
  phrasingGuide: string;
  intonationTip: string;
  coachingComment: string;
}

export type LearnerLevel = 'beginner' | 'intermediate' | 'advanced';

// Local SQLite Book Types (Step 05)
export interface LocalBook {
  id: number;
  book_number: number;
  title: string;
  author: string;
  language: string;
  chapter_count: number;
  paragraph_count: number;
  is_available: number;
}

export interface LocalChapter {
  id: number;
  book_id: number;
  chapter_number: number;
  title: string;
  sequence_number: number;
  paragraph_count: number;
}

export interface LocalParagraph {
  id: number;
  chapter_id: number;
  paragraph_number: number;
  content: string;
  char_length: number;
}

export interface ReadingProgress {
  bookId: number;
  chapterId: number;
  lastParagraphIndex: number;
  lastReadAt: string;
  bookTitle?: string;
  chapterTitle?: string;
}

// Daily Study Log & Stats Types (Step 07)
export interface DailyStudyLog {
  id: string; // e.g. "2026-10-27-31-258"
  date: string; // YYYY-MM-DD
  bookId: number | string;
  bookTitle: string;
  chapterId: number | string;
  chapterTitle: string;
  readParagraphsCount: number;
  savedExpressionsCount: number;
  isChapterCompleted?: boolean;
  lastActiveTime: string;
}

export interface LearningStatsSummary {
  totalStudyDays: number;
  todayChapters: { bookTitle: string; chapterTitle: string }[];
  uniqueChaptersVisited: number;
  completedChaptersCount: number;
  totalSavedExpressions: number;
  reviewedExpressionsCount: number;
  completedBooksCount: number;
  dailyLogs: DailyStudyLog[];
}

// Daily Goals & Backup/Restore Types (Step 08)
export interface DailyGoals {
  targetChapters: number;
  targetExpressions: number;
  updatedAt: string;
}

export interface BackupData {
  app: 'Booky';
  version: '1.0.0';
  exportedAt: string;
  data: {
    expressions: KeyExpression[];
    dailyLogs: DailyStudyLog[];
    readingProgress?: ReadingProgress;
    checklist?: Record<string, boolean>;
    vocabNotes?: {
      word: string;
      note: string;
      bookTitle?: string;
      chapterTitle?: string;
      savedAt?: string;
    }[];
    dailyGoals?: DailyGoals;
    fontSize?: number;
    // Step 09 C2 News Backup
    cnnNewsArticles?: CnnNewsArticle[];
    cnnNewsLogs?: CnnNewsStudyLog[];
  };
}

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  itemCounts?: {
    expressions: number;
    dailyLogs: number;
    vocabNotes: number;
    cnnNewsArticles?: number;
  };
  backupData?: BackupData;
}

// ============================================================================
// CNN News C2 Advanced English Types (Step 09)
// ============================================================================

export type NewsStudyStatus = 'not_started' | 'in_progress' | 'completed';

export interface SentenceAnalysisItem {
  id: string;
  sentence: string;
  paragraphIndex: number;
  sentenceStructure: string;     // 문장 구조 메모 (주어, 본동사, 도치, 종속절 등)
  keyGrammar: string;            // 핵심 문법 (분사구문, 가정법, 복합관계사 등)
  logicalConnectors: string;     // 접속 표현 및 논리 관계 (대조, 인과, 양보 등)
  referents: string;             // 지시어(this, which, former/latter 등) 지칭 대상
  implicitMeaning: string;       // 생략 및 행간의 함축 의미 (Subtext/Implication)
  toneAndAttitude: string;       // 어조와 필자의 태도 (Critical, Sarcastic, Objective 등)
  koreanTranslation: string;     // 한국어 정밀 해석
  questions: string;             // 추가 의문점 및 질문
  updatedAt: string;
}

export interface ReadingQuestionItem {
  id: string;
  type:
    | 'main_argument'
    | 'inference'
    | 'tone_and_stance'
    | 'evidence'
    | 'rhetorical_strategy'
    | 'ambiguity'
    | 'critical_evaluation'
    | 'alternative_interpretation';
  questionLabel: string;         // 예: "1. Main Argument: 필자의 핵심 주장"
  prompt: string;                // 세부 가이드
  userAnswer: string;            // 사용자 작성 답변
  userExplanation?: string;      // 사용자 입력 모범 해설/논거
  updatedAt: string;
}

export interface WritingOutputData {
  summary: string;               // 뉴스 핵심 내용 영어 요약
  stance: 'agree' | 'disagree' | 'neutral' | 'nuanced'; // 필자 주장에 대한 입장
  opinionEssay: string;          // 근거를 포함한 영어 의견문
  alternativeProposals: string;  // 대안 제시
  koreanDraft: string;           // 한국어 초안
  createdAt: string;
  updatedAt: string;
}

export interface DebateOutputData {
  coreIssue: string;             // 핵심 쟁점
  argumentsFor: string;          // 찬성 논거
  argumentsAgainst: string;      // 반대 논거
  counterArguments: string;      // 반론
  rebuttal: string;              // 재반박
  finalPosition: string;         // 최종 입장
  updatedAt: string;
}

export interface CnnNewsArticle {
  id: string;
  title: string;
  source: string;                // 'CNN' 또는 입력 출처
  articleDate: string;           // 기사 작성일 또는 '미확인'
  createdAt: string;             // 로컬 등록일 (ISO)
  topic: string;                 // Politics, Economy, Science/Tech, World, Climate, Culture, Society
  rawContent: string;            // 원본 텍스트
  paragraphs: string[];          // 문단 배열
  koreanSummary?: string;        // 사용자 작성 한국어 요약
  status: NewsStudyStatus;
  userNotes: Record<number, string>; // 문단별 메모 (paragraphIndex -> note)
  fileName: string;
  fileType: 'txt' | 'md' | 'html' | 'manual';
  sentenceAnalyses: Record<string, SentenceAnalysisItem>; // sentenceId -> analysis
  readingQuestions: ReadingQuestionItem[];
  writingOutput?: WritingOutputData;
  debateOutput?: DebateOutputData;
  lastReadParagraphIndex?: number;
  lastReadAt?: string;
}

export interface CnnNewsStudyLog {
  id: string;
  date: string;                  // YYYY-MM-DD
  newsId: string;
  newsTitle: string;
  status: NewsStudyStatus;
  analyzedSentencesCount: number;
  savedExpressionsCount: number;
  answeredQuestionsCount: number;
  hasWriting: boolean;
  hasDebate: boolean;
  lastActiveTime: string;
}

