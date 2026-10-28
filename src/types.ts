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
    // Step 10 Guided Course Progress
    cnnGuidedProgress?: GuidedCourseProgress[];
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
    cnnGuidedProgress?: number;
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

export interface CnnVocabItem {
  id: string;
  expression: string;          // 영어 표현 (예: "pulmonary nodule", "be diagnosed with")
  koreanMeaning: string;       // 한국어 뜻 (예: "폐결절", "~로 진단받다")
  contextSentence: string;     // 원문 사용 문장
  paragraphIndex?: number;     // 원문 문단 번호 (0-based)
  isMemorized: boolean;        // 암기 완료 여부
  needsReview: boolean;        // 복습 필요 여부
  userNote?: string;           // 사용자 개인 메모
  partOfSpeech?: string;       // 품사/구문 단위
}

export interface CnnComprehensionQuiz {
  id: string;
  question: string;
  options: { key: string; text: string }[];
  correctAnswer: string;       // 'b', 'c' 등
  explanation: string;         // 정답/오답 기사 근거 해설
  userSelectedOption?: string; // 사용자가 선택한 답
  isSubmitted?: boolean;
  isCorrect?: boolean;
}

export interface CnnDictationQuiz {
  id: string;
  displaySentence: string;     // 빈칸 표시 문장
  targetSentence: string;      // 정답 전체 문장
  blankAnswers: string[];      // 정답 단어 목록
  userInputs: string[];        // 사용자 입력값
  isSubmitted?: boolean;
  accuracyRate?: number;       // 정답률 (0~100)
  isCorrect?: boolean;
  revealed?: boolean;          // 정답 보기 여부
}

export interface CnnSpeakingExercise {
  id: string;
  koreanPrompt: string;        // "생검을 하거나 수술로 제거할 수 있다."
  targetEnglish: string;       // "It can either be biopsied or surgically removed, then tested."
  userTranscript?: string;     // 사용자가 작성한 영어 표현
  userNote?: string;           // 개인 메모
  isCompleted: boolean;
  hasRecordedAudio?: boolean;  // 녹음 여부
}

export interface CnnShadowingExercise {
  id: string;
  targetSentence: string;
  paragraphIndex: number;
  userNote?: string;
  isCompleted: boolean;
  hasRecordedAudio?: boolean;
}

export interface CnnNewsArticle {
  id: string;
  title: string;
  koreanTitle?: string;          // 한국어 기사 제목 (Step 11)
  source: string;                // 'CNN' 또는 입력 출처
  articleDate: string;           // 기사 작성일 또는 '미확인'
  createdAt: string;             // 로컬 등록일 (ISO)
  topic: string;                 // Politics, Economy, Science/Tech, Health, World, Climate, Culture, Society
  rawContent: string;            // 원본 텍스트
  paragraphs: string[];          // 문단 배열
  koreanParagraphs?: string[];   // 문단별 1:1 한국어 번역 (Step 11)
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

  // Step 11 통합 학습 데이터
  coreVocabularies?: CnnVocabItem[];
  comprehensionQuizzes?: CnnComprehensionQuiz[];
  dictationQuizzes?: CnnDictationQuiz[];
  speakingExercises?: CnnSpeakingExercise[];
  shadowingExercises?: CnnShadowingExercise[];
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

// ============================================================================
// CNN News C2 Guided Course Types (Step 10 & 11)
// ============================================================================

export type StepProgressState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type GuidedCourseStep =
  | 'NOT_STARTED'
  | 'READING'
  | 'VOCABULARY'
  | 'ANALYSIS'
  | 'COMPREHENSION'
  | 'DICTATION'
  | 'SPEAKING'
  | 'SHADOWING'
  | 'WRITING'
  | 'REVIEW'
  | 'COMPLETED';

export interface GuidedCourseChecklist {
  hasReadPassage: boolean;          // 1단계: 원문 읽기 및 문단 파악 여부
  memorizedVocabCount?: number;     // 2단계: 핵심 어휘 암기/확인 수
  analyzedSentenceIds: string[];    // 3단계: 실제 분석한 문장 ID 목록
  answeredQuestionIds: string[];    // C2 서술형 질문 (STEP 10 호환)
  quizScores?: { passedCount: number; totalCount: number }; // 4단계: 객관식 퀴즈 결과
  dictationCompletedCount?: number; // 5단계: 받아쓰기 완료 수
  speakingCompleted?: boolean;      // 6단계: 말하기 완료 여부
  shadowingCompletedCount?: number; // 7단계: 섀도잉 완료 수
  hasCompletedWriting: boolean;     // 영작문 완료 여부 (STEP 10 호환)
  hasReviewedAll: boolean;          // 8단계: 최종 복습 및 완료 체크
}

export interface GuidedCourseProgress {
  newsId: string;
  currentStep: GuidedCourseStep;
  highestStepReached: GuidedCourseStep;
  lastParagraphIndex: number;
  stepStates?: Partial<Record<GuidedCourseStep, StepProgressState>>;
  startedAt?: string;
  completedAt?: string;
  lastModifiedAt: string;
  checklist: GuidedCourseChecklist;
}


