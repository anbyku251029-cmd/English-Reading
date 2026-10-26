export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  step?: number;
  timestamp: Date;
  targetSentence?: string;
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
