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
  CnnVocabItem,
  CnnComprehensionQuiz,
  CnnDictationQuiz,
  CnnSpeakingExercise,
  CnnShadowingExercise,
  StepProgressState,
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
// 3. 기사 CRUD (Articles Management) & STEP 11 실전 기사 시드
// ============================================================================

export const SEED_ARTICLE_LUNG_NODULES: CnnNewsArticle = {
  id: 'CNN_LUNG_NODULES_001',
  title: 'What to Know About Lung Nodules',
  koreanTitle: '폐 결절에 대해 알아야 할 것들',
  source: 'CNN News English',
  articleDate: '2026-10-28',
  createdAt: '2026-10-28T12:00:00.000Z',
  topic: 'Health',
  rawContent: "It's an area of abnormal growth in the lungs.\n\nAnd in the U.S., about 1.6 million patients are diagnosed with pulmonary nodules every year.\n\n\"They can vary from different sizes, from, you know, anywhere from one millimeter up to three centimeters, as we kind of define them as a nodule. But they're a spot that can occur for many reasons, many of which are benign, but sometimes they can be cancerous as well.\"\n\nDr. Bobby Mahajan with the American Lung Association says early lung nodule detection allows doctors to see if the mass is growing.\n\nIt can either be biopsied or surgically removed, then tested.\n\n\"If there are signs of cancer in the nodule, depending on the age of the person, there are other medical issues, we kind of say, well, do we do more of a resection to remove more of the lung itself so that there's a low risk of the nodule coming back?\"\n\nMahajan says there are very few symptoms with early-stage lung cancer, so finding a nodule that ends up being cancerous allows for early treatment.\n\n\"Only about 17 to 20% of individuals who are eligible for lung cancer screening actually get screened.\"\n\nPeople between the ages of 50 and 80 who currently smoke, have what's called a \"20 pack-year\" smoking history, which is 1 pack a day for 20 years or two packs a day for 10 years, or if you quit smoking within the last 15 years, are eligible for lung cancer screening.\n\n\"If we can detect a nodule at the earliest stage, at five years, there's a 92% survival.\" ",
  paragraphs: ["It's an area of abnormal growth in the lungs.", "And in the U.S., about 1.6 million patients are diagnosed with pulmonary nodules every year.", "\"They can vary from different sizes, from, you know, anywhere from one millimeter up to three centimeters, as we kind of define them as a nodule. But they're a spot that can occur for many reasons, many of which are benign, but sometimes they can be cancerous as well.\"", "Dr. Bobby Mahajan with the American Lung Association says early lung nodule detection allows doctors to see if the mass is growing.", "It can either be biopsied or surgically removed, then tested.", "\"If there are signs of cancer in the nodule, depending on the age of the person, there are other medical issues, we kind of say, well, do we do more of a resection to remove more of the lung itself so that there's a low risk of the nodule coming back?\"", "Mahajan says there are very few symptoms with early-stage lung cancer, so finding a nodule that ends up being cancerous allows for early treatment.", "\"Only about 17 to 20% of individuals who are eligible for lung cancer screening actually get screened.\"", "People between the ages of 50 and 80 who currently smoke, have what's called a \"20 pack-year\" smoking history, which is 1 pack a day for 20 years or two packs a day for 10 years, or if you quit smoking within the last 15 years, are eligible for lung cancer screening.", "\"If we can detect a nodule at the earliest stage, at five years, there's a 92% survival.\""],
  koreanParagraphs: ["폐결절은 폐에 비정상적인 조직이 자라 형성된 부위입니다.", "미국에서는 매년 약 160만 명의 환자가 폐결절 진단을 받습니다.", "“폐결절의 크기는 다양하며, 보통 결절이라고 정의하는 크기는 1mm에서 3cm까지입니다. 여러 가지 원인으로 생길 수 있는 병변으로, 대부분은 양성이지만 때로는 암성 병변일 수도 있습니다.”", "미국폐협회의 바비 마하잔 박사는 폐결절을 조기에 발견하면 의료진이 결절의 크기가 커지고 있는지 확인할 수 있다고 말합니다.", "결절은 조직검사를 하거나 수술로 제거한 뒤 검사를 받을 수 있습니다.", "“결절에서 암의 징후가 발견되면 환자의 나이나 다른 건강상 문제 등을 고려해 폐 조직을 더 많이 절제할지 판단합니다. 이는 결절이 재발할 위험을 낮추기 위한 것입니다.”", "마하잔은 초기 폐암은 증상이 거의 없기 때문에, 검사에서 발견된 결절이 암으로 판명되면 조기에 치료할 수 있다고 설명합니다.", "“폐암 검진 대상자 중 실제로 검진을 받는 사람은 약 17~20%에 불과합니다.”", "50~80세 성인 중 현재 흡연 중이거나 20갑년의 흡연력이 있는 사람, 즉 20년 동안 하루 한 갑씩 또는 10년 동안 하루 두 갑씩 담배를 피운 사람, 또는 금연한 지 15년이 지나지 않은 사람은 폐암 검진 대상자입니다.", "“결절을 가장 초기 단계에서 발견하면 5년 생존율은 92%에 달합니다.”"],
  koreanSummary: '폐결절의 정의와 크기 범위(1mm~3cm), 조기 발견의 중요성 및 고위험군 대상 폐암 검진(20갑년 흡연력 등)의 생존율 향상 효과(조기 발견 시 5년 생존율 92%)를 다룬 CNN 뉴스 기사입니다.',
  status: 'not_started',
  userNotes: {},
  fileName: 'CNN_What_to_Know_About_Lung_Nodules.txt',
  fileType: 'manual',
  sentenceAnalyses: {},
  readingQuestions: createDefaultReadingQuestions(),
  writingOutput: {
    summary: '',
    stance: 'neutral',
    opinionEssay: '',
    alternativeProposals: '',
    koreanDraft: '',
    createdAt: '2026-10-28T12:00:00.000Z',
    updatedAt: '2026-10-28T12:00:00.000Z',
  },
  debateOutput: {
    coreIssue: '',
    argumentsFor: '',
    argumentsAgainst: '',
    counterArguments: '',
    rebuttal: '',
    finalPosition: '',
    updatedAt: '2026-10-28T12:00:00.000Z',
  },
  lastReadParagraphIndex: 0,
  lastReadAt: '2026-10-28T12:00:00.000Z',
  coreVocabularies: [{"id": "vocab-1", "expression": "abnormal", "koreanMeaning": "비정상적인", "contextSentence": "It's an area of abnormal growth in the lungs.", "paragraphIndex": 0, "isMemorized": false, "needsReview": true, "partOfSpeech": "형용사", "userNote": ""}, {"id": "vocab-2", "expression": "be diagnosed with", "koreanMeaning": "~로 진단받다", "contextSentence": "And in the U.S., about 1.6 million patients are diagnosed with pulmonary nodules every year.", "paragraphIndex": 1, "isMemorized": false, "needsReview": true, "partOfSpeech": "동사구", "userNote": ""}, {"id": "vocab-3", "expression": "pulmonary nodule", "koreanMeaning": "폐결절", "contextSentence": "And in the U.S., about 1.6 million patients are diagnosed with pulmonary nodules every year.", "paragraphIndex": 1, "isMemorized": false, "needsReview": true, "partOfSpeech": "명사구", "userNote": ""}, {"id": "vocab-4", "expression": "define as", "koreanMeaning": "~으로 정의하다", "contextSentence": "\"They can vary from different sizes, from, you know, anywhere from one millimeter up to three centimeters, as we kind of define them as a nodule.\"", "paragraphIndex": 2, "isMemorized": false, "needsReview": true, "partOfSpeech": "동사구", "userNote": ""}, {"id": "vocab-5", "expression": "benign", "koreanMeaning": "양성의", "contextSentence": "But they're a spot that can occur for many reasons, many of which are benign, but sometimes they can be cancerous as well.", "paragraphIndex": 2, "isMemorized": false, "needsReview": true, "partOfSpeech": "형용사", "userNote": ""}, {"id": "vocab-6", "expression": "cancerous", "koreanMeaning": "암성의, 암이 있는", "contextSentence": "But they're a spot that can occur for many reasons, many of which are benign, but sometimes they can be cancerous as well.", "paragraphIndex": 2, "isMemorized": false, "needsReview": true, "partOfSpeech": "형용사", "userNote": ""}, {"id": "vocab-7", "expression": "detection", "koreanMeaning": "발견, 조기 발견", "contextSentence": "Dr. Bobby Mahajan with the American Lung Association says early lung nodule detection allows doctors to see if the mass is growing.", "paragraphIndex": 3, "isMemorized": false, "needsReview": true, "partOfSpeech": "명사", "userNote": ""}, {"id": "vocab-8", "expression": "mass", "koreanMeaning": "덩어리, 종괴", "contextSentence": "Dr. Bobby Mahajan with the American Lung Association says early lung nodule detection allows doctors to see if the mass is growing.", "paragraphIndex": 3, "isMemorized": false, "needsReview": true, "partOfSpeech": "명사", "userNote": ""}, {"id": "vocab-9", "expression": "biopsy", "koreanMeaning": "생검, 조직 검사", "contextSentence": "It can either be biopsied or surgically removed, then tested.", "paragraphIndex": 4, "isMemorized": false, "needsReview": true, "partOfSpeech": "동사/명사", "userNote": ""}, {"id": "vocab-10", "expression": "surgically", "koreanMeaning": "수술로", "contextSentence": "It can either be biopsied or surgically removed, then tested.", "paragraphIndex": 4, "isMemorized": false, "needsReview": true, "partOfSpeech": "부사", "userNote": ""}, {"id": "vocab-11", "expression": "resection", "koreanMeaning": "절제, 절제술", "contextSentence": "\"If there are signs of cancer in the nodule, depending on the age of the person, there are other medical issues, we kind of say, well, do we do more of a resection to remove more of the lung itself so that there's a low risk of the nodule coming back?\"", "paragraphIndex": 5, "isMemorized": false, "needsReview": true, "partOfSpeech": "명사", "userNote": ""}, {"id": "vocab-12", "expression": "early treatment", "koreanMeaning": "조기 치료", "contextSentence": "Mahajan says there are very few symptoms with early-stage lung cancer, so finding a nodule that ends up being cancerous allows for early treatment.", "paragraphIndex": 6, "isMemorized": false, "needsReview": true, "partOfSpeech": "명사구", "userNote": ""}, {"id": "vocab-13", "expression": "be eligible for", "koreanMeaning": "~의 자격이 있다, ~의 대상이 되다", "contextSentence": "\"Only about 17 to 20% of individuals who are eligible for lung cancer screening actually get screened.\"", "paragraphIndex": 7, "isMemorized": false, "needsReview": true, "partOfSpeech": "형용사구/숙어", "userNote": ""}, {"id": "vocab-14", "expression": "screening", "koreanMeaning": "검사", "contextSentence": "\"Only about 17 to 20% of individuals who are eligible for lung cancer screening actually get screened.\"", "paragraphIndex": 7, "isMemorized": false, "needsReview": true, "partOfSpeech": "명사", "userNote": ""}],
  comprehensionQuizzes: [{"id": "quiz-1", "question": "기사에 따르면, 폐결절을 조기에 발견하는 것이 중요한 이유는 무엇인가요?", "options": [{"key": "a", "text": "결절이 발견되면 즉시 수술을 진행할 수 있기 때문에"}, {"key": "b", "text": "결절의 크기와 성장 여부를 확인할 수 있기 때문에"}, {"key": "c", "text": "폐암의 재발 가능성을 완전히 없앨 수 있기 때문에"}], "correctAnswer": "b", "explanation": "기사 본문(4번째 문단)에서 미국폐협회의 바비 마하잔 박사는 조기 폐결절 발견을 통해 의사들이 덩어리(결절)가 커지고 있는지 확인할 수 있게 해준다고 명시하고 있습니다(\"allows doctors to see if the mass is growing\")."}, {"id": "quiz-2", "question": "폐암 검진 대상자 중 실제로 검진을 받는 사람의 비율은 어느 정도인가요?", "options": [{"key": "a", "text": "약 5~10%"}, {"key": "b", "text": "약 12~17%"}, {"key": "c", "text": "약 17~20%"}], "correctAnswer": "c", "explanation": "기사 본문(8번째 문단)에서 \"폐암 검진 대상자 중 실제로 검진을 받는 사람은 약 17~20%에 불과하다(Only about 17 to 20% of individuals who are eligible for lung cancer screening actually get screened)\"고 명시하고 있습니다."}],
  dictationQuizzes: [{"id": "dict-1", "displaySentence": "It's an ______ of ______ growth in the ______.", "targetSentence": "It's an area of abnormal growth in the lungs.", "blankAnswers": ["area", "abnormal", "lungs"], "userInputs": ["", "", ""], "isSubmitted": false, "revealed": false}, {"id": "dict-2", "displaySentence": "There are very few symptoms with early-stage ______ cancer, so finding a ______ that ends up being ______ allows for early ______.", "targetSentence": "There are very few symptoms with early-stage lung cancer, so finding a nodule that ends up being cancerous allows for early treatment.", "blankAnswers": ["lung", "nodule", "cancerous", "treatment"], "userInputs": ["", "", "", ""], "isSubmitted": false, "revealed": false}],
  speakingExercises: [{"id": "speak-1", "koreanPrompt": "생검을 하거나 수술로 제거할 수 있다.", "targetEnglish": "It can either be biopsied or surgically removed, then tested.", "userTranscript": "", "userNote": "", "isCompleted": false}],
  shadowingExercises: [{"id": "shadow-1", "targetSentence": "It's an area of abnormal growth in the lungs.", "paragraphIndex": 0, "userNote": "", "isCompleted": false}, {"id": "shadow-2", "targetSentence": "And in the U.S., about 1.6 million patients are diagnosed with pulmonary nodules every year.", "paragraphIndex": 1, "userNote": "", "isCompleted": false}, {"id": "shadow-3", "targetSentence": "It can either be biopsied or surgically removed, then tested.", "paragraphIndex": 4, "userNote": "", "isCompleted": false}, {"id": "shadow-4", "targetSentence": "Mahajan says there are very few symptoms with early-stage lung cancer, so finding a nodule that ends up being cancerous allows for early treatment.", "paragraphIndex": 6, "userNote": "", "isCompleted": false}],
};

export function loadNewsArticles(): CnnNewsArticle[] {
  try {
    const raw = localStorage.getItem(CNN_STORAGE_KEYS.ARTICLES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];

    // 저장소에 시드 기사가 있을 경우 STEP 11 필드 누락 보강
    const seedIdx = list.findIndex((a) => a.id === SEED_ARTICLE_LUNG_NODULES.id);
    if (seedIdx >= 0) {
      const current = list[seedIdx];
      let needsSave = false;
      if (!current.coreVocabularies || current.coreVocabularies.length === 0) {
        current.coreVocabularies = SEED_ARTICLE_LUNG_NODULES.coreVocabularies;
        needsSave = true;
      }
      if (!current.comprehensionQuizzes || current.comprehensionQuizzes.length === 0) {
        current.comprehensionQuizzes = SEED_ARTICLE_LUNG_NODULES.comprehensionQuizzes;
        needsSave = true;
      }
      if (!current.dictationQuizzes || current.dictationQuizzes.length === 0) {
        current.dictationQuizzes = SEED_ARTICLE_LUNG_NODULES.dictationQuizzes;
        needsSave = true;
      }
      if (!current.speakingExercises || current.speakingExercises.length === 0) {
        current.speakingExercises = SEED_ARTICLE_LUNG_NODULES.speakingExercises;
        needsSave = true;
      }
      if (!current.shadowingExercises || current.shadowingExercises.length === 0) {
        current.shadowingExercises = SEED_ARTICLE_LUNG_NODULES.shadowingExercises;
        needsSave = true;
      }
      if (!current.koreanParagraphs || current.koreanParagraphs.length === 0) {
        current.koreanParagraphs = SEED_ARTICLE_LUNG_NODULES.koreanParagraphs;
        needsSave = true;
      }
      if (!current.koreanTitle) {
        current.koreanTitle = SEED_ARTICLE_LUNG_NODULES.koreanTitle;
        needsSave = true;
      }
      if (needsSave) {
        list[seedIdx] = current;
        saveNewsArticles(list);
      }
    }
    return list;
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

export function ensureSeedArticleLungNodules(): CnnNewsArticle {
  const list = loadNewsArticles();
  const found = list.find((a) => a.id === SEED_ARTICLE_LUNG_NODULES.id);
  if (found) return found;
  const updated = [SEED_ARTICLE_LUNG_NODULES, ...list];
  saveNewsArticles(updated);
  return SEED_ARTICLE_LUNG_NODULES;
}

export function getNewsArticleById(id: string): CnnNewsArticle | undefined {
  const list = loadNewsArticles();
  const found = list.find((a) => a.id === id);
  if (found) return found;
  if (id === SEED_ARTICLE_LUNG_NODULES.id) {
    return ensureSeedArticleLungNodules();
  }
  return undefined;
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
// 5-B. STEP 11 통합 학습 엔진 (어휘, 퀴즈, 받아쓰기, 말하기, 섀도잉)
// ============================================================================

export function updateCoreVocabItem(newsId: string, vocab: CnnVocabItem): void {
  const article = getNewsArticleById(newsId);
  if (!article) return;

  const currentList = article.coreVocabularies || [];
  const idx = currentList.findIndex((v) => v.id === vocab.id);
  if (idx >= 0) {
    currentList[idx] = vocab;
  } else {
    currentList.push(vocab);
  }
  article.coreVocabularies = [...currentList];

  if (article.status === 'not_started') {
    article.status = 'in_progress';
  }
  updateNewsArticle(article);
}

export function updateComprehensionQuiz(
  newsId: string,
  quizId: string,
  userSelectedOption: string
): { isCorrect: boolean; quiz?: CnnComprehensionQuiz } {
  const article = getNewsArticleById(newsId);
  if (!article || !article.comprehensionQuizzes) {
    return { isCorrect: false };
  }

  let resultQuiz: CnnComprehensionQuiz | undefined;
  article.comprehensionQuizzes = article.comprehensionQuizzes.map((q) => {
    if (q.id === quizId) {
      const isCorrect = q.correctAnswer.toLowerCase() === userSelectedOption.trim().toLowerCase();
      resultQuiz = {
        ...q,
        userSelectedOption: userSelectedOption.trim(),
        isSubmitted: true,
        isCorrect,
      };
      return resultQuiz;
    }
    return q;
  });

  if (article.status === 'not_started') {
    article.status = 'in_progress';
  }
  updateNewsArticle(article);
  return { isCorrect: !!resultQuiz?.isCorrect, quiz: resultQuiz };
}

export function resetComprehensionQuiz(newsId: string, quizId?: string): void {
  const article = getNewsArticleById(newsId);
  if (!article || !article.comprehensionQuizzes) return;

  article.comprehensionQuizzes = article.comprehensionQuizzes.map((q) => {
    if (!quizId || q.id === quizId) {
      return {
        ...q,
        userSelectedOption: undefined,
        isSubmitted: false,
        isCorrect: undefined,
      };
    }
    return q;
  });
  updateNewsArticle(article);
}

export function updateDictationQuiz(
  newsId: string,
  quizId: string,
  userInputs: string[]
): { isCorrect: boolean; accuracyRate: number; quiz?: CnnDictationQuiz } {
  const article = getNewsArticleById(newsId);
  if (!article || !article.dictationQuizzes) {
    return { isCorrect: false, accuracyRate: 0 };
  }

  let resultQuiz: CnnDictationQuiz | undefined;
  article.dictationQuizzes = article.dictationQuizzes.map((q) => {
    if (q.id === quizId) {
      const total = q.blankAnswers.length;
      let matched = 0;
      q.blankAnswers.forEach((ans, i) => {
        const u = (userInputs[i] || '').trim().toLowerCase();
        if (u === ans.trim().toLowerCase()) {
          matched++;
        }
      });
      const accuracyRate = total > 0 ? Math.round((matched / total) * 100) : 0;
      const isCorrect = matched === total;

      resultQuiz = {
        ...q,
        userInputs,
        isSubmitted: true,
        isCorrect,
        accuracyRate,
      };
      return resultQuiz;
    }
    return q;
  });

  if (article.status === 'not_started') {
    article.status = 'in_progress';
  }
  updateNewsArticle(article);
  return {
    isCorrect: !!resultQuiz?.isCorrect,
    accuracyRate: resultQuiz?.accuracyRate ?? 0,
    quiz: resultQuiz,
  };
}

export function resetDictationQuiz(newsId: string, quizId?: string): void {
  const article = getNewsArticleById(newsId);
  if (!article || !article.dictationQuizzes) return;

  article.dictationQuizzes = article.dictationQuizzes.map((q) => {
    if (!quizId || q.id === quizId) {
      return {
        ...q,
        userInputs: q.blankAnswers.map(() => ''),
        isSubmitted: false,
        isCorrect: undefined,
        accuracyRate: undefined,
        revealed: false,
      };
    }
    return q;
  });
  updateNewsArticle(article);
}

export function revealDictationQuizAnswer(newsId: string, quizId: string, revealed: boolean): void {
  const article = getNewsArticleById(newsId);
  if (!article || !article.dictationQuizzes) return;

  article.dictationQuizzes = article.dictationQuizzes.map((q) => {
    if (q.id === quizId) {
      return { ...q, revealed };
    }
    return q;
  });
  updateNewsArticle(article);
}

export function updateSpeakingExercise(
  newsId: string,
  exerciseId: string,
  updates: Partial<CnnSpeakingExercise>
): void {
  const article = getNewsArticleById(newsId);
  if (!article || !article.speakingExercises) return;

  article.speakingExercises = article.speakingExercises.map((s) => {
    if (s.id === exerciseId) {
      return { ...s, ...updates };
    }
    return s;
  });

  if (article.status === 'not_started') {
    article.status = 'in_progress';
  }
  updateNewsArticle(article);
}

export function updateShadowingExercise(
  newsId: string,
  exerciseId: string,
  updates: Partial<CnnShadowingExercise>
): void {
  const article = getNewsArticleById(newsId);
  if (!article || !article.shadowingExercises) return;

  article.shadowingExercises = article.shadowingExercises.map((s) => {
    if (s.id === exerciseId) {
      return { ...s, ...updates };
    }
    return s;
  });

  if (article.status === 'not_started') {
    article.status = 'in_progress';
  }
  updateNewsArticle(article);
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

  // 단계 도달 순서 우선순위 (STEP 10 5단계 및 STEP 11 8단계 호환)
  const stepRank: Record<GuidedCourseStep, number> = {
    NOT_STARTED: 0,
    READING: 1,
    VOCABULARY: 2,
    ANALYSIS: 3,
    COMPREHENSION: 4,
    DICTATION: 5,
    SPEAKING: 6,
    SHADOWING: 7,
    WRITING: 8,
    REVIEW: 9,
    COMPLETED: 10,
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

  // STEP 11 항목 동기화
  const memorizedVocab = (article.coreVocabularies || []).filter((v) => v.isMemorized).length;
  const passedQuizzes = (article.comprehensionQuizzes || []).filter((q) => q.isCorrect).length;
  const totalQuizzes = (article.comprehensionQuizzes || []).length;
  const completedDict = (article.dictationQuizzes || []).filter((d) => d.isCorrect).length;
  const speakingDone = (article.speakingExercises || []).every((s) => s.isCompleted) && (article.speakingExercises || []).length > 0;
  const completedShadow = (article.shadowingExercises || []).filter((s) => s.isCompleted).length;

  const updatedChecklist = {
    hasReadPassage: current.checklist.hasReadPassage || (article.lastReadParagraphIndex || 0) > 0 || article.paragraphs.length > 0,
    memorizedVocabCount: memorizedVocab,
    analyzedSentenceIds: analyzedIds,
    answeredQuestionIds: answeredIds,
    quizScores: { passedCount: passedQuizzes, totalCount: totalQuizzes },
    dictationCompletedCount: completedDict,
    speakingCompleted: speakingDone,
    shadowingCompletedCount: completedShadow,
    hasCompletedWriting: hasWriting,
    hasReviewedAll: current.checklist.hasReviewedAll,
  };

  return updateGuidedProgress(article.id, {
    checklist: updatedChecklist,
    lastParagraphIndex: article.lastReadParagraphIndex || current.lastParagraphIndex,
  });
}

