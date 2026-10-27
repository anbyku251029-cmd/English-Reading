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
  expression: string;
  inContext: string;
  everydayMeaning: string;
  dailyExample: string;
  dailyExampleMeaning: string;
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
}
