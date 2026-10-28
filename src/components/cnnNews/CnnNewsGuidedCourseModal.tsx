/**
 * Booky STEP 11: 실제 CNN 기사 기반 통합 영어 학습 코스 모달
 * 
 * - STEP 10 5단계 Guided Course 표준 파이프라인 완벽 연동:
 *   1단계: Reading & Vocab (원문 10문단 정독, 1:1 번역 대조 토글, TTS 음성, 문단 메모 + 14대 핵심 어휘 학습 및 플래시카드 연동)
 *   2단계: Sentence Analysis (기사 내 문장 선택 및 9대 통사/함축 구조 정밀 분석)
 *   3단계: Comprehension & Quiz (기사 근거 객관식 독해 퀴즈 2문제 + C2 심층 비판적 독해 질문 8선)
 *   4단계: Writing & Debate (C2 Executive Summary 영어 요약, 찬반 논거 2개 이상, 반론, 재반박, 결론)
 *   5단계: Review & Practice (받아쓰기 2문제, 말하기 연습, 4대 핵심 문장 섀도잉, 전체 학습 리포트 및 완강)
 * 
 * - 가짜 점수/AI 날조 원천 배제, 100% 로컬 저장 및 백업 연동
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CnnNewsArticle,
  GuidedCourseProgress,
  GuidedCourseStep,
  SentenceAnalysisItem,
  KeyExpression,
  WritingOutputData,
  DebateOutputData,
  CnnVocabItem,
  CnnComprehensionQuiz,
  CnnDictationQuiz,
} from '../../types';
import {
  getNewsArticleById,
  updateParagraphNote,
  updateSentenceAnalysis,
  updateQuestionAnswer,
  updateWritingOutput,
  updateDebateOutput,
  saveNewsExpression,
  splitIntoSentences,
  getGuidedProgress,
  updateGuidedProgress,
  syncGuidedProgressWithArticle,
  updateCoreVocabItem,
  updateComprehensionQuiz,
  resetComprehensionQuiz,
  updateDictationQuiz,
  resetDictationQuiz,
  revealDictationQuizAnswer,
  updateSpeakingExercise,
  updateShadowingExercise,
} from '../../utils/cnnNewsStorage';
import { audioManager } from '../../utils/audio';

interface CnnNewsGuidedCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
  onCourseCompleted?: () => void;
}

const STEP_LIST: { id: GuidedCourseStep; label: string; number: number; desc: string }[] = [
  { id: 'READING', label: '1. Reading & Vocab', number: 1, desc: '원문 정독 & 번역 대조 & 14대 핵심 어휘' },
  { id: 'ANALYSIS', label: '2. Sentence Analysis', number: 2, desc: '고급 문장 구조 & 9대 통사 분석' },
  { id: 'COMPREHENSION', label: '3. Comprehension & Quiz', number: 3, desc: '객관식 독해 퀴즈 2문제 & C2 질문' },
  { id: 'WRITING', label: '4. Writing & Debate', number: 4, desc: 'C2 영작문 & 찬반 논증 프레임워크' },
  { id: 'REVIEW', label: '5. Review & Practice', number: 5, desc: '받아쓰기 & 말하기 & 섀도잉 & 완강' },
];

export const CnnNewsGuidedCourseModal: React.FC<CnnNewsGuidedCourseModalProps> = ({
  isOpen,
  onClose,
  articleId,
  onCourseCompleted,
}) => {
  const [article, setArticle] = useState<CnnNewsArticle | null>(null);
  const [courseProgress, setCourseProgress] = useState<GuidedCourseProgress | null>(null);
  const [activeStep, setActiveStep] = useState<GuidedCourseStep>('READING');
  const [currentParagraphIdx, setCurrentParagraphIdx] = useState<number>(0);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // 1단계 읽기 상태
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showKoreanTranslation, setShowKoreanTranslation] = useState(false);
  const [editingParagraphIdx, setEditingParagraphIdx] = useState<number | null>(null);
  const [paragraphNoteInput, setParagraphNoteInput] = useState<string>('');

  // 1단계 어휘 상태
  const [vocabSearch, setVocabSearch] = useState('');
  const [vocabFilter, setVocabFilter] = useState<'all' | 'memorized' | 'needs_review'>('all');
  const [editingVocabId, setEditingVocabId] = useState<string | null>(null);
  const [vocabNoteInput, setVocabNoteInput] = useState<string>('');

  // 2단계 문장 분석 상태
  const [selectedSentence, setSelectedSentence] = useState<string>('');
  const [sentenceForm, setSentenceForm] = useState<Omit<SentenceAnalysisItem, 'id' | 'updatedAt'>>({
    sentence: '',
    paragraphIndex: 0,
    sentenceStructure: '',
    keyGrammar: '',
    logicalConnectors: '',
    referents: '',
    implicitMeaning: '',
    toneAndAttitude: '',
    koreanTranslation: '',
    questions: '',
  });

  // 4단계 작문/토론 상태
  const [writingForm, setWritingForm] = useState<WritingOutputData>({
    summary: '',
    stance: 'neutral',
    opinionEssay: '',
    alternativeProposals: '',
    koreanDraft: '',
    createdAt: '',
    updatedAt: '',
  });
  const [debateForm, setDebateForm] = useState<DebateOutputData>({
    coreIssue: '',
    argumentsFor: '',
    argumentsAgainst: '',
    counterArguments: '',
    rebuttal: '',
    finalPosition: '',
    updatedAt: '',
  });

  // 5단계 받아쓰기 인풋 상태
  const [dictationInputs, setDictationInputs] = useState<Record<string, string[]>>({});

  // 5단계 말하기 상태
  const [speakingTranscript, setSpeakingTranscript] = useState('');
  const [speakingNote, setSpeakingNote] = useState('');
  const [isSpeakingRecording, setIsSpeakingRecording] = useState(false);
  const [speakingAudioUrl, setSpeakingAudioUrl] = useState<string | null>(null);
  const [speakingMicError, setSpeakingMicError] = useState<string | null>(null);
  const speakingMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speakingAudioChunksRef = useRef<Blob[]>([]);

  // 5단계 섀도잉 상태
  const [selectedShadowId, setSelectedShadowId] = useState<string>('shadow-1');
  const [shadowSpeechRate, setShadowSpeechRate] = useState<number>(1.0);
  const [isShadowRecording, setIsShadowRecording] = useState(false);
  const [shadowAudioUrls, setShadowAudioUrls] = useState<Record<string, string>>({});
  const [shadowMicError, setShadowMicError] = useState<string | null>(null);
  const shadowMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const shadowAudioChunksRef = useRef<Blob[]>([]);

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const refreshData = () => {
    const art = getNewsArticleById(articleId);
    if (art) {
      setArticle(art);
      const prog = getGuidedProgress(art.id);
      setCourseProgress(prog);

      if (art.writingOutput) setWritingForm(art.writingOutput);
      if (art.debateOutput) setDebateForm(art.debateOutput);

      if (art.dictationQuizzes) {
        const dMap: Record<string, string[]> = {};
        art.dictationQuizzes.forEach((d) => {
          dMap[d.id] = d.userInputs && d.userInputs.length === d.blankAnswers.length
            ? [...d.userInputs]
            : d.blankAnswers.map(() => '');
        });
        setDictationInputs(dMap);
      }

      if (art.speakingExercises && art.speakingExercises[0]) {
        setSpeakingTranscript(art.speakingExercises[0].userTranscript || '');
        setSpeakingNote(art.speakingExercises[0].userNote || '');
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
      const art = getNewsArticleById(articleId);
      if (art) {
        const prog = getGuidedProgress(art.id);
        const validSteps: GuidedCourseStep[] = ['READING', 'ANALYSIS', 'COMPREHENSION', 'WRITING', 'REVIEW'];
        if (validSteps.includes(prog.currentStep)) {
          setActiveStep(prog.currentStep);
        } else {
          setActiveStep('READING');
        }
      }
    } else {
      audioManager.stop();
      setIsPlayingAudio(false);
      if (speakingMediaRecorderRef.current && speakingMediaRecorderRef.current.state === 'recording') {
        speakingMediaRecorderRef.current.stop();
      }
      if (shadowMediaRecorderRef.current && shadowMediaRecorderRef.current.state === 'recording') {
        shadowMediaRecorderRef.current.stop();
      }
    }
  }, [isOpen, articleId]);

  const allSentences = useMemo(() => {
    if (!article) return [];
    const list: { sentence: string; paragraphIndex: number }[] = [];
    article.paragraphs.forEach((p, pIdx) => {
      const sents = splitIntoSentences(p);
      sents.forEach((s) => {
        list.push({ sentence: s, paragraphIndex: pIdx });
      });
    });
    return list;
  }, [article]);

  if (!isOpen || !article || !courseProgress) return null;

  const handleSelectStep = (step: GuidedCourseStep) => {
    audioManager.stop();
    setIsPlayingAudio(false);
    setActiveStep(step);
    updateGuidedProgress(article.id, { currentStep: step });
    setCourseProgress(getGuidedProgress(article.id));
  };

  // 1단계 음성
  const handlePlayParagraph = (idx: number) => {
    if (isPlayingAudio) {
      audioManager.stop();
      setIsPlayingAudio(false);
      return;
    }
    const text = article.paragraphs[idx];
    if (!text) return;
    setIsPlayingAudio(true);
    audioManager.speak(text, undefined, 0.9).finally(() => {
      setIsPlayingAudio(false);
    });
  };

  const handleSaveParagraphNote = (idx: number) => {
    updateParagraphNote(article.id, idx, paragraphNoteInput);
    refreshData();
    setEditingParagraphIdx(null);
    setParagraphNoteInput('');
    showToast(`¶${idx + 1} 문단 메모가 저장되었습니다.`);
  };

  // 1단계 어휘 토글 & 메모 & 플래시카드
  const handleToggleVocabMemorized = (vocab: CnnVocabItem) => {
    const updated: CnnVocabItem = {
      ...vocab,
      isMemorized: !vocab.isMemorized,
      needsReview: vocab.isMemorized ? true : false,
    };
    updateCoreVocabItem(article.id, updated);
    refreshData();
    showToast(`[${vocab.expression}] 상태: ${updated.isMemorized ? '암기 완료' : '복습 필요'}`);
  };

  const handleSaveVocabNote = (vocab: CnnVocabItem) => {
    const updated: CnnVocabItem = { ...vocab, userNote: vocabNoteInput };
    updateCoreVocabItem(article.id, updated);
    refreshData();
    setEditingVocabId(null);
    showToast(`[${vocab.expression}] 메모가 저장되었습니다.`);
  };

  const handleExportToFlashcards = (vocab: CnnVocabItem) => {
    saveNewsExpression({
      expression: vocab.expression,
      inContext: vocab.contextSentence || article.paragraphs[vocab.paragraphIndex || 0] || '',
      everydayMeaning: vocab.koreanMeaning,
      newsId: article.id,
      newsTitle: article.title,
      partOfSpeech: vocab.partOfSpeech,
      userNote: vocab.userNote,
    });
    showToast(`[${vocab.expression}] 플래시카드 단어장에 저장되었습니다.`);
  };

  // 2단계 문장 분석
  const handleSaveSentenceAnalysis = () => {
    if (!selectedSentence.trim()) {
      alert('분석할 문장을 선택해주세요.');
      return;
    }
    const sentId = `sent-${sentenceForm.paragraphIndex}-${selectedSentence.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`;
    const item: SentenceAnalysisItem = {
      ...sentenceForm,
      id: sentId,
      sentence: selectedSentence,
      updatedAt: new Date().toISOString(),
    };
    updateSentenceAnalysis(article.id, item);
    refreshData();
    syncGuidedProgressWithArticle(article);
    showToast('문장 구조 분석이 성공적으로 저장되었습니다.');
  };

  // 3단계 퀴즈
  const handleSelectQuizOption = (quizId: string, optionKey: string) => {
    updateComprehensionQuiz(article.id, quizId, optionKey);
    refreshData();
    syncGuidedProgressWithArticle(article);
  };

  const handleResetQuiz = (quizId: string) => {
    resetComprehensionQuiz(article.id, quizId);
    refreshData();
    syncGuidedProgressWithArticle(article);
    showToast('독해 문제가 초기화되었습니다.');
  };

  const handleSaveC2Answer = (qId: string, answer: string, exp?: string) => {
    updateQuestionAnswer(article.id, qId, answer, exp);
    refreshData();
    syncGuidedProgressWithArticle(article);
    showToast('C2 독해 답변이 저장되었습니다.');
  };

  // 4단계 작문/토론
  const handleSaveWriting = () => {
    updateWritingOutput(article.id, writingForm);
    refreshData();
    syncGuidedProgressWithArticle(article);
    showToast('C2 영작문이 저장되었습니다.');
  };

  const handleSaveDebate = () => {
    updateDebateOutput(article.id, debateForm);
    refreshData();
    syncGuidedProgressWithArticle(article);
    showToast('찬반 토론 프레임워크가 저장되었습니다.');
  };

  // 5단계 받아쓰기
  const handleDictInputChange = (quizId: string, blankIdx: number, val: string) => {
    setDictationInputs((prev) => {
      const current = prev[quizId] ? [...prev[quizId]] : [];
      current[blankIdx] = val;
      return { ...prev, [quizId]: current };
    });
  };

  const handleSubmitDictation = (quizId: string) => {
    const inputs = dictationInputs[quizId] || [];
    const res = updateDictationQuiz(article.id, quizId, inputs);
    refreshData();
    syncGuidedProgressWithArticle(article);
    showToast(res.isCorrect ? '🎉 정답입니다! 정확도 100%' : `정확도: ${res.accuracyRate}%. 다시 확인해보세요.`);
  };

  const handleResetDictation = (quizId: string) => {
    resetDictationQuiz(article.id, quizId);
    refreshData();
    setDictationInputs((prev) => ({
      ...prev,
      [quizId]: prev[quizId] ? prev[quizId].map(() => '') : [],
    }));
    showToast('받아쓰기 문제가 초기화되었습니다.');
  };

  // 5단계 말하기 녹음
  const handleStartSpeakingRecording = async () => {
    setSpeakingMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      speakingMediaRecorderRef.current = recorder;
      speakingAudioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) speakingAudioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(speakingAudioChunksRef.current, { type: 'audio/webm' });
        setSpeakingAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setIsSpeakingRecording(true);
    } catch (err: any) {
      setSpeakingMicError('마이크 장치에 접근할 수 없습니다. 브라우저 주소창 설정에서 마이크 권한을 허용해주세요.');
    }
  };

  const handleStopSpeakingRecording = () => {
    if (speakingMediaRecorderRef.current && speakingMediaRecorderRef.current.state === 'recording') {
      speakingMediaRecorderRef.current.stop();
      setIsSpeakingRecording(false);
    }
  };

  const handleSaveSpeakingExercise = (isCompletedToggle?: boolean) => {
    const targetEx = article.speakingExercises?.[0];
    if (!targetEx) return;
    const nextCompleted = isCompletedToggle !== undefined ? isCompletedToggle : targetEx.isCompleted;
    updateSpeakingExercise(article.id, targetEx.id, {
      userTranscript: speakingTranscript,
      userNote: speakingNote,
      isCompleted: nextCompleted,
      hasRecordedAudio: !!speakingAudioUrl,
    });
    refreshData();
    syncGuidedProgressWithArticle(article);
    showToast('말하기 연습 내용이 저장되었습니다.');
  };

  // 5단계 섀도잉 녹음
  const handleStartShadowRecording = async (shadowId: string) => {
    setShadowMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      shadowMediaRecorderRef.current = recorder;
      shadowAudioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) shadowAudioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(shadowAudioChunksRef.current, { type: 'audio/webm' });
        setShadowAudioUrls((prev) => ({ ...prev, [shadowId]: URL.createObjectURL(audioBlob) }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setIsShadowRecording(true);
    } catch (err: any) {
      setShadowMicError('마이크 권한을 허용해주세요.');
    }
  };

  const handleStopShadowRecording = () => {
    if (shadowMediaRecorderRef.current && shadowMediaRecorderRef.current.state === 'recording') {
      shadowMediaRecorderRef.current.stop();
      setIsShadowRecording(false);
    }
  };

  const handleToggleShadowCompleted = (shadowId: string, currentStatus: boolean) => {
    updateShadowingExercise(article.id, shadowId, { isCompleted: !currentStatus });
    refreshData();
    syncGuidedProgressWithArticle(article);
  };

  // 최종 완강
  const handleCompleteCourse = () => {
    updateGuidedProgress(article.id, {
      currentStep: 'COMPLETED',
      completedAt: new Date().toISOString(),
      checklist: {
        ...courseProgress.checklist,
        hasReviewedAll: true,
      },
    });
    refreshData();
    showToast('🎉 축하합니다! 실전 C2 학습 코스를 완강하셨습니다.');
    if (onCourseCompleted) onCourseCompleted();
  };

  const filteredVocabularies = useMemo(() => {
    const list = article.coreVocabularies || [];
    return list.filter((v) => {
      const matchSearch =
        v.expression.toLowerCase().includes(vocabSearch.toLowerCase()) ||
        v.koreanMeaning.includes(vocabSearch);
      if (!matchSearch) return false;
      if (vocabFilter === 'memorized') return v.isMemorized;
      if (vocabFilter === 'needs_review') return !v.isMemorized;
      return true;
    });
  }, [article.coreVocabularies, vocabSearch, vocabFilter]);

  // 진행률 계산
  let completedCount = 0;
  if (courseProgress.checklist.hasReadPassage) completedCount++;
  if ((courseProgress.checklist.analyzedSentenceIds || []).length > 0) completedCount++;
  if (courseProgress.checklist.quizScores && courseProgress.checklist.quizScores.passedCount === 2) completedCount++;
  if (courseProgress.checklist.hasCompletedWriting) completedCount++;
  if (courseProgress.checklist.hasReviewedAll || courseProgress.currentStep === 'COMPLETED') completedCount++;
  const progressPercent = Math.min(100, Math.round((completedCount / 5) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl h-[92vh] rounded-xl flex flex-col shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-semibold">
              Guided C2 Study
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {article.title}
                {article.koreanTitle && (
                  <span className="text-xs font-normal text-slate-400">({article.koreanTitle})</span>
                )}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span>현재 단계: <strong className="text-red-400">{courseProgress.currentStep}</strong></span>
                <span>•</span>
                <span>코스 진행률: <strong className="text-emerald-400">{progressPercent}%</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 5단계 탭 네비게이션 */}
        <div className="bg-slate-950/70 border-b border-slate-800 px-4 flex items-center overflow-x-auto gap-1">
          {STEP_LIST.map((step) => {
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => handleSelectStep(step.id)}
                className={`py-3 px-4 text-xs font-medium border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'border-red-500 text-white bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
                }`}
              >
                <span>{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* 본문 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/60">
          {/* ==================================================================== */}
          {/* 1단계: READING & VOCABULARY */}
          {/* ==================================================================== */}
          {activeStep === 'READING' && (
            <div className="space-y-8 max-w-4xl mx-auto">
              {/* 섹션 A: 기사 원문 10문단 정독 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">1단계: 기사 원문 정독 & 번역 대조</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      문단별 소리내어 읽고, Web Speech 브라우저 음성으로 들으며 메모를 기록하세요.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowKoreanTranslation(!showKoreanTranslation)}
                    className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                      showKoreanTranslation
                        ? 'bg-amber-600/30 text-amber-300 border-amber-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {showKoreanTranslation ? '한국어 번역 숨기기' : '1:1 한국어 번역 대조'}
                  </button>
                </div>

                <div className="space-y-3">
                  {article.paragraphs.map((p, idx) => {
                    const isCurrent = currentParagraphIdx === idx;
                    const note = article.userNotes?.[idx];
                    const koreanP = article.koreanParagraphs?.[idx];

                    return (
                      <div
                        key={idx}
                        onClick={() => setCurrentParagraphIdx(idx)}
                        className={`p-4 rounded-lg border transition-all ${
                          isCurrent
                            ? 'border-red-500/70 bg-slate-800/60 shadow-lg ring-1 ring-red-500/30'
                            : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs font-mono font-bold text-red-400 px-2 py-0.5 rounded bg-red-950/50 border border-red-900/40">
                            ¶ {idx + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayParagraph(idx);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 flex items-center gap-1"
                            >
                              🔊 {isPlayingAudio && currentParagraphIdx === idx ? '정지' : '듣기'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingParagraphIdx(idx);
                                setParagraphNoteInput(note || '');
                              }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700"
                            >
                              📝 메모
                            </button>
                          </div>
                        </div>

                        <p className="text-sm text-slate-200 mt-2.5 leading-relaxed font-serif">{p}</p>

                        {showKoreanTranslation && koreanP && (
                          <div className="mt-2.5 p-2.5 rounded bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                            <span className="text-amber-400 font-semibold mr-1.5">[번역]</span>
                            {koreanP}
                          </div>
                        )}

                        {editingParagraphIdx === idx ? (
                          <div className="mt-3 p-3 rounded bg-slate-900 border border-slate-700 space-y-2">
                            <textarea
                              value={paragraphNoteInput}
                              onChange={(e) => setParagraphNoteInput(e.target.value)}
                              placeholder="이 문단의 중심 내용이나 의문점을 메모하세요..."
                              className="w-full bg-slate-950 text-xs text-slate-200 p-2 rounded border border-slate-800 focus:border-red-500 focus:outline-none"
                              rows={3}
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingParagraphIdx(null)}
                                className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 text-xs"
                              >
                                취소
                              </button>
                              <button
                                onClick={() => handleSaveParagraphNote(idx)}
                                className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                              >
                                저장
                              </button>
                            </div>
                          </div>
                        ) : (
                          note && (
                            <div className="mt-2 p-2 rounded bg-amber-950/20 border border-amber-900/30 text-xs text-amber-300">
                              <strong>내 메모:</strong> {note}
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 섹션 B: 핵심 어휘 14선 */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>📚 핵심 어휘 14선 및 플래시카드</span>
                      <span className="text-xs text-slate-400 font-normal">
                        ({(article.coreVocabularies || []).filter((v) => v.isMemorized).length} / 14개 암기 완료)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      원문에서 추출한 핵심 의학/고급 어휘를 복습하고 내 단어장에 보관하세요.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={vocabSearch}
                      onChange={(e) => setVocabSearch(e.target.value)}
                      placeholder="어휘/뜻 검색..."
                      className="px-3 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                    />
                    <select
                      value={vocabFilter}
                      onChange={(e: any) => setVocabFilter(e.target.value)}
                      className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300"
                    >
                      <option value="all">전체</option>
                      <option value="needs_review">복습 필요</option>
                      <option value="memorized">암기 완료</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredVocabularies.map((vocab) => (
                    <div
                      key={vocab.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                        vocab.isMemorized
                          ? 'bg-slate-950/40 border-slate-800'
                          : 'bg-slate-800/40 border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-sm font-bold text-white">{vocab.expression}</span>
                            {vocab.partOfSpeech && (
                              <span className="ml-2 text-[10px] text-slate-400 bg-slate-800 px-1 py-0.5 rounded">
                                {vocab.partOfSpeech}
                              </span>
                            )}
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                              vocab.isMemorized
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                                : 'bg-amber-950/60 text-amber-300 border-amber-800'
                            }`}
                          >
                            {vocab.isMemorized ? '암기 완료' : '복습 필요'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-emerald-400 mt-1">{vocab.koreanMeaning}</p>
                        <p className="mt-2 text-xs text-slate-400 font-serif bg-slate-950/60 p-2 rounded border border-slate-800">
                          {vocab.contextSentence}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <button
                          onClick={() => handleToggleVocabMemorized(vocab)}
                          className="text-slate-300 hover:text-white underline text-[11px]"
                        >
                          {vocab.isMemorized ? '복습 대상으로 전환' : '✓ 암기 완료 체크'}
                        </button>
                        <button
                          onClick={() => handleExportToFlashcards(vocab)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] border border-amber-900/40"
                        >
                          ⭐ 플래시카드 저장
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleSelectStep('ANALYSIS')}
                  className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                >
                  다음: 2단계 문장 분석으로 이동 →
                </button>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 2단계: SENTENCE ANALYSIS */}
          {/* ==================================================================== */}
          {activeStep === 'ANALYSIS' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">2단계: 고급 문장 통사/구조 분석</h3>
                <p className="text-xs text-slate-400 mt-1">
                  기사 내 문장을 선택하여 9대 통사 구조를 분석하고 논리적 연결성을 파악하세요.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">
                  분석할 문장 선택 ({allSentences.length}개):
                </label>
                <select
                  value={selectedSentence}
                  onChange={(e) => {
                    const sent = e.target.value;
                    setSelectedSentence(sent);
                    const found = allSentences.find((s) => s.sentence === sent);
                    if (found) {
                      setSentenceForm((prev) => ({
                        ...prev,
                        sentence: sent,
                        paragraphIndex: found.paragraphIndex,
                      }));
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 p-2.5 rounded-lg focus:outline-none"
                >
                  <option value="">-- 문장을 선택하세요 --</option>
                  {allSentences.map((s, idx) => (
                    <option key={idx} value={s.sentence}>
                      [¶{s.paragraphIndex + 1}] {s.sentence.slice(0, 80)}...
                    </option>
                  ))}
                </select>

                {selectedSentence && (
                  <div className="p-3 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 font-serif leading-relaxed">
                    <span className="text-red-400 font-sans font-bold mr-1.5">[선택 문장]</span>
                    {selectedSentence}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    1. 문장 구조 (주어, 본동사, 종속절, 도치 등)
                  </label>
                  <textarea
                    value={sentenceForm.sentenceStructure}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, sentenceStructure: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded text-xs text-white focus:outline-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    2. 핵심 문법 (분사구문, 수동태, 관계사 등)
                  </label>
                  <textarea
                    value={sentenceForm.keyGrammar}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, keyGrammar: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded text-xs text-white focus:outline-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    3. 접속 표현 및 담화표지어
                  </label>
                  <input
                    type="text"
                    value={sentenceForm.logicalConnectors}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, logicalConnectors: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    4. 지시어/대명사 지칭 대상 (Referents)
                  </label>
                  <input
                    type="text"
                    value={sentenceForm.referents}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, referents: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    5. 함축 의미 (Subtext)
                  </label>
                  <textarea
                    value={sentenceForm.implicitMeaning}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, implicitMeaning: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded text-xs text-white focus:outline-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    6. 화자의 태도 / 어조 (Tone and Attitude)
                  </label>
                  <input
                    type="text"
                    value={sentenceForm.toneAndAttitude}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, toneAndAttitude: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    7. 직역 (Literal Translation)
                  </label>
                  <input
                    type="text"
                    value={sentenceForm.koreanTranslation}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, koreanTranslation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    8. 학습자 질문 및 추가 의문점
                  </label>
                  <input
                    type="text"
                    value={sentenceForm.questions}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, questions: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveSentenceAnalysis}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                >
                  ✓ 분석 내용 저장하기
                </button>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleSelectStep('READING')}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  ← 1단계 Reading으로
                </button>
                <button
                  onClick={() => handleSelectStep('COMPREHENSION')}
                  className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                >
                  다음: 3단계 독해 퀴즈 및 질문으로 이동 →
                </button>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 3단계: COMPREHENSION & QUIZ */}
          {/* ==================================================================== */}
          {activeStep === 'COMPREHENSION' && (
            <div className="space-y-8 max-w-4xl mx-auto">
              {/* 섹션 A: 기사 근거 객관식 독해 퀴즈 2문제 */}
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-bold text-white">3단계: 객관식 독해 퀴즈 (2문제)</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    기사 원문에 근거한 정확한 사실 관계를 확인하세요.
                  </p>
                </div>

                <div className="space-y-4">
                  {(article.comprehensionQuizzes || []).map((quiz, qIdx) => (
                    <div key={quiz.id} className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 text-xs font-bold border border-red-900/40">
                            문제 {qIdx + 1}
                          </span>
                          <h4 className="text-sm font-semibold text-white">{quiz.question}</h4>
                        </div>
                        {quiz.isSubmitted && (
                          <span
                            className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                              quiz.isCorrect
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                                : 'bg-red-950/80 text-red-300 border-red-700'
                            }`}
                          >
                            {quiz.isCorrect ? '✓ 정답' : '✗ 오답'}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {quiz.options.map((opt) => {
                          const isSelected = quiz.userSelectedOption === opt.key;
                          const isCorrectOpt = quiz.correctAnswer === opt.key;
                          let optStyle = 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700';

                          if (quiz.isSubmitted) {
                            if (isCorrectOpt) {
                              optStyle = 'border-emerald-500 bg-emerald-950/40 text-emerald-200 font-semibold ring-1 ring-emerald-500/50';
                            } else if (isSelected && !quiz.isCorrect) {
                              optStyle = 'border-red-500 bg-red-950/40 text-red-200 line-through';
                            }
                          } else if (isSelected) {
                            optStyle = 'border-red-500 bg-red-950/30 text-white font-semibold';
                          }

                          return (
                            <button
                              key={opt.key}
                              disabled={quiz.isSubmitted}
                              onClick={() => handleSelectQuizOption(quiz.id, opt.key)}
                              className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center gap-3 ${optStyle}`}
                            >
                              <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] bg-slate-800 border border-slate-700">
                                {opt.key}
                              </span>
                              <span>{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>

                      {quiz.isSubmitted && (
                        <div className="mt-3 p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-400">
                              [정답: {quiz.correctAnswer}] 기사 근거 해설
                            </span>
                            <button
                              onClick={() => handleResetQuiz(quiz.id)}
                              className="text-xs text-slate-400 hover:text-white underline"
                            >
                              다시 풀기
                            </button>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">{quiz.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 섹션 B: 기존 C2 심층 비판적 독해 질문 8선 */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h4 className="text-sm font-bold text-white">C2 비판적 독해 심층 서술</h4>
                <div className="space-y-4">
                  {(article.readingQuestions || []).slice(0, 3).map((q) => (
                    <div key={q.id} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2">
                      <span className="text-xs font-bold text-slate-200">{q.questionLabel}</span>
                      <p className="text-[11px] text-slate-400">{q.prompt}</p>
                      <textarea
                        defaultValue={q.userAnswer}
                        onBlur={(e) => handleSaveC2Answer(q.id, e.target.value)}
                        placeholder="분석 답변을 서술하세요..."
                        className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded text-xs text-white focus:outline-none"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleSelectStep('ANALYSIS')}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  ← 2단계 문장 분석으로
                </button>
                <button
                  onClick={() => handleSelectStep('WRITING')}
                  className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                >
                  다음: 4단계 영작문 및 토론으로 이동 →
                </button>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 4단계: WRITING & DEBATE */}
          {/* ==================================================================== */}
          {activeStep === 'WRITING' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">4단계: C2 영작문 & 찬반 논증 프레임워크</h3>
                <p className="text-xs text-slate-400 mt-1">
                  기사 핵심 내용을 바탕으로 3~5문장의 Executive Summary와 찬반 논거를 작성하세요.
                </p>
              </div>

              {/* 영작문 요약 */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <label className="text-xs font-semibold text-slate-200 block">
                  1. 기사 핵심 요약문 (Executive Summary, 3~5문장):
                </label>
                <textarea
                  value={writingForm.summary}
                  onChange={(e) => setWritingForm({ ...writingForm, summary: e.target.value })}
                  placeholder="In this article from CNN, pulmonary nodules are defined as..."
                  className="w-full bg-slate-900 border border-slate-800 p-3 rounded text-xs text-white font-serif focus:outline-none"
                  rows={4}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveWriting}
                    className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                  >
                    요약문 저장
                  </button>
                </div>
              </div>

              {/* 토론 프레임워크 */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <label className="text-xs font-semibold text-slate-200 block">
                  2. C2 논증 프레임워크 (핵심 쟁점, 찬반 논거, 반론, 결론):
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">핵심 쟁점 (Core Issue)</span>
                    <input
                      type="text"
                      value={debateForm.coreIssue}
                      onChange={(e) => setDebateForm({ ...debateForm, coreIssue: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-xs text-white"
                      placeholder="고위험군 조기 폐암 검진 확대와 의료 비용 효율성"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">찬성 논거 (Arguments For, 2개 이상)</span>
                    <textarea
                      value={debateForm.argumentsFor}
                      onChange={(e) => setDebateForm({ ...debateForm, argumentsFor: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-xs text-white"
                      rows={2}
                      placeholder="1) 5년 생존율 92% 향상, 2) 조기 치료로 폐 절제 범위 최소화"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">예상 반론 (Counterarguments)</span>
                    <textarea
                      value={debateForm.counterArguments}
                      onChange={(e) => setDebateForm({ ...debateForm, counterArguments: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-xs text-white"
                      rows={2}
                      placeholder="위양성(양성 결절)으로 인한 불필요한 생검 및 수술 위험"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">최종 결론 (Final Position)</span>
                    <textarea
                      value={debateForm.finalPosition}
                      onChange={(e) => setDebateForm({ ...debateForm, finalPosition: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-xs text-white"
                      rows={2}
                      placeholder="20갑년 등 명확한 고위험군 중심의 정밀 선별 검진 정책 추진 필요"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveDebate}
                    className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    토론 프레임워크 저장
                  </button>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleSelectStep('COMPREHENSION')}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  ← 3단계 독해 퀴즈로
                </button>
                <button
                  onClick={() => handleSelectStep('REVIEW')}
                  className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                >
                  다음: 5단계 복습 및 실전 연습으로 이동 →
                </button>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 5단계: REVIEW & PRACTICE (받아쓰기, 말하기, 섀도잉, 완강) */}
          {/* ==================================================================== */}
          {activeStep === 'REVIEW' && (
            <div className="space-y-8 max-w-4xl mx-auto">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">5단계: 종합 복습 & 실전 연습 (Practice & Complete)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  받아쓰기, 한국어 제시문 말하기, 4대 문장 섀도잉을 완료하고 최종 코스를 완강하세요.
                </p>
              </div>

              {/* 세션 1: 받아쓰기 2문제 */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>✍️ 받아쓰기 (Dictation) 2문제</span>
                </h4>
                <div className="space-y-4">
                  {(article.dictationQuizzes || []).map((dict, dIdx) => {
                    const userInputs = dictationInputs[dict.id] || dict.blankAnswers.map(() => '');
                    return (
                      <div key={dict.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 text-xs font-bold border border-red-900/40">
                              받아쓰기 {dIdx + 1}
                            </span>
                            <button
                              onClick={() => audioManager.speak(dict.targetSentence, undefined, 0.9)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 flex items-center gap-1"
                            >
                              🔊 원문 듣기
                            </button>
                          </div>
                          {dict.isSubmitted && (
                            <span
                              className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                                dict.isCorrect
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                                  : 'bg-amber-950/80 text-amber-300 border-amber-700'
                              }`}
                            >
                              정확도: {dict.accuracyRate}%
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 font-serif bg-slate-900 p-2.5 rounded border border-slate-800">
                          {dict.displaySentence}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                          {dict.blankAnswers.map((ans, bIdx) => {
                            const userVal = userInputs[bIdx] || '';
                            const isMatch =
                              dict.isSubmitted && userVal.trim().toLowerCase() === ans.trim().toLowerCase();

                            return (
                              <div key={bIdx}>
                                <input
                                  type="text"
                                  value={userVal}
                                  disabled={dict.isSubmitted}
                                  onChange={(e) => handleDictInputChange(dict.id, bIdx, e.target.value)}
                                  placeholder={`빈칸 ${bIdx + 1}`}
                                  className={`w-full p-2 rounded text-xs border ${
                                    dict.isSubmitted
                                      ? isMatch
                                        ? 'bg-emerald-950/30 border-emerald-500 text-emerald-300 font-bold'
                                        : 'bg-red-950/30 border-red-500 text-red-300'
                                      : 'bg-slate-900 border-slate-700 text-white'
                                  }`}
                                />
                                {dict.isSubmitted && !isMatch && (
                                  <span className="text-[10px] text-red-400 block mt-0.5">정답: {ans}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {dict.revealed && (
                          <div className="p-2.5 rounded bg-slate-900 text-xs text-slate-300 font-serif border border-slate-800">
                            <strong>정답 전체 문장:</strong> {dict.targetSentence}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => {
                              revealDictationQuizAnswer(article.id, dict.id, !dict.revealed);
                              refreshData();
                            }}
                            className="text-xs text-slate-400 hover:text-amber-300 underline"
                          >
                            {dict.revealed ? '정답 숨기기' : '정답 문장 보기'}
                          </button>
                          <div className="flex gap-2">
                            {dict.isSubmitted && (
                              <button
                                onClick={() => handleResetDictation(dict.id)}
                                className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                              >
                                다시 풀기
                              </button>
                            )}
                            <button
                              disabled={dict.isSubmitted}
                              onClick={() => handleSubmitDictation(dict.id)}
                              className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white text-xs font-bold"
                            >
                              채점하기
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 세션 2: 말하기 연습 */}
              {article.speakingExercises?.[0] && (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🎙️ 한국어 제시문 말하기 연습</span>
                  </h4>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="p-3 rounded bg-slate-900 border border-slate-800">
                      <span className="text-xs font-semibold text-amber-400 block">[제시문]</span>
                      <p className="text-sm font-bold text-white">"{article.speakingExercises[0].koreanPrompt}"</p>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded bg-slate-900/60 border border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-400 block">[기준 문장]</span>
                        <p className="text-slate-200 font-serif">{article.speakingExercises[0].targetEnglish}</p>
                      </div>
                      <button
                        onClick={() => audioManager.speak(article.speakingExercises![0].targetEnglish, undefined, 0.9)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 shrink-0"
                      >
                        🔊 듣기
                      </button>
                    </div>

                    {speakingMicError && (
                      <div className="p-2 rounded bg-red-950/40 border border-red-800 text-xs text-red-300">
                        {speakingMicError}
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      {!isSpeakingRecording ? (
                        <button
                          onClick={handleStartSpeakingRecording}
                          className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2"
                        >
                          🎙️ 내 음성 녹음 시작
                        </button>
                      ) : (
                        <button
                          onClick={handleStopSpeakingRecording}
                          className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold animate-pulse"
                        >
                          ⏹️ 녹음 정지
                        </button>
                      )}

                      {speakingAudioUrl && (
                        <div className="flex items-center gap-2">
                          <audio controls src={speakingAudioUrl} className="h-8" />
                          <button
                            onClick={() => setSpeakingAudioUrl(null)}
                            className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-400"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={article.speakingExercises[0].isCompleted}
                          onChange={(e) => handleSaveSpeakingExercise(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-700 text-red-600"
                        />
                        <span>말하기 연습 완료</span>
                      </label>
                      <button
                        onClick={() => handleSaveSpeakingExercise()}
                        className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 세션 3: 문장 따라 말하기 (섀도잉 4문장) */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🔁 문장 따라 말하기 (Shadowing 4선)</span>
                  </h4>
                  <p className="text-[11px] text-amber-400/90 mt-1">
                    ※ 본 음성은 브라우저 Web Speech 합성음(TTS)이며, CNN 실제 기자의 원본 방송 음성이 아닙니다.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(article.shadowingExercises || []).map((sh, idx) => (
                    <button
                      key={sh.id}
                      onClick={() => setSelectedShadowId(sh.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        selectedShadowId === sh.id
                          ? 'bg-red-600/20 border-red-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>문장 {idx + 1}</span>
                        {sh.isCompleted && <span className="text-emerald-400">✓</span>}
                      </div>
                      <p className="text-[10px] truncate mt-0.5">{sh.targetSentence}</p>
                    </button>
                  ))}
                </div>

                {(() => {
                  const curShadow = (article.shadowingExercises || []).find((s) => s.id === selectedShadowId);
                  if (!curShadow) return null;
                  const recordedUrl = shadowAudioUrls[curShadow.id];

                  return (
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <p className="text-sm text-slate-200 font-serif bg-slate-900 p-3 rounded border border-slate-800">
                        "{curShadow.targetSentence}"
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded bg-slate-900 text-xs">
                        <button
                          onClick={() => audioManager.speak(curShadow.targetSentence, undefined, shadowSpeechRate)}
                          className="px-3 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 font-semibold"
                        >
                          🔊 음성 듣기 ({shadowSpeechRate}x)
                        </button>
                        <div className="flex items-center gap-1">
                          {[0.8, 1.0, 1.2].map((r) => (
                            <button
                              key={r}
                              onClick={() => setShadowSpeechRate(r)}
                              className={`px-2 py-0.5 rounded border text-[11px] ${
                                shadowSpeechRate === r ? 'bg-red-600 text-white border-red-500' : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {r}x
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {!isShadowRecording ? (
                          <button
                            onClick={() => handleStartShadowRecording(curShadow.id)}
                            className="px-3.5 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                          >
                            🎙️ 섀도잉 녹음
                          </button>
                        ) : (
                          <button
                            onClick={handleStopShadowRecording}
                            className="px-3.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold animate-pulse"
                          >
                            ⏹️ 녹음 정지
                          </button>
                        )}
                        {recordedUrl && <audio controls src={recordedUrl} className="h-7" />}
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 pt-1">
                        <input
                          type="checkbox"
                          checked={curShadow.isCompleted}
                          onChange={() => handleToggleShadowCompleted(curShadow.id, curShadow.isCompleted)}
                          className="rounded bg-slate-900 border-slate-700 text-red-600"
                        />
                        <span>이 문장 섀도잉 완료</span>
                      </label>
                    </div>
                  );
                })()}
              </div>

              {/* 세션 4: 완강 버튼 */}
              <div className="p-5 rounded-xl bg-gradient-to-r from-red-950/40 to-slate-900 border border-red-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {courseProgress.currentStep === 'COMPLETED' ? '🎉 완강된 실전 코스입니다.' : '실전 학습 코스 완강'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    1~5단계 전체 학습을 마친 후 완강을 확정하세요.
                  </p>
                </div>
                <button
                  onClick={handleCompleteCourse}
                  className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg"
                >
                  {courseProgress.currentStep === 'COMPLETED' ? '✓ 완강 상태 다시 확인' : '🏆 코스 완강 확정하기'}
                </button>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleSelectStep('WRITING')}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  ← 4단계 영작문으로
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                >
                  학습창 닫기
                </button>
              </div>
            </div>
          )}
        </div>

        {saveToast && (
          <div className="absolute bottom-5 right-5 z-50 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xl border border-emerald-400/30 flex items-center gap-2">
            <span>✓</span>
            <span>{saveToast}</span>
          </div>
        )}
      </div>
    </div>
  );
};
