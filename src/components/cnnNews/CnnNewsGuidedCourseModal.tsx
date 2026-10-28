/**
 * Booky STEP 12: 실전 C2 통합 영어 학습 코스 모달 (8단계 완벽 파이프라인)
 * 
 * - 8단계 실전 학습 코스 파이프라인:
 *   1단계: READING (원문 정독 & Web Speech 오디오 & 1:1 번역 대조 & 문단 메모)
 *   2단계: VOCABULARY (기사 핵심 C2 어휘 학습 & 암기 체크 & 플래시카드 단어장 연동)
 *   3단계: ANALYSIS (원문 문장 선택 & 9대 통사 구조 정밀 분석 스튜디오)
 *   4단계: COMPREHENSION (기사 근거 객관식 독해 퀴즈 2문제 & C2 심층 비판적 질문 8선)
 *   5단계: DICTATION (핵심 구문 빈칸 받아쓰기 훈련 & 즉시 채점 및 정확도)
 *   6단계: SPEAKING (기사 핵심 논제 영어 구술 발표 & 마이크 녹음 및 재생)
 *   7단계: SHADOWING (기사 대표 문장 4선 배속별 TTS 청취 & 섀도잉 실전 낭독)
 *   8단계: WRITING (Executive Summary C2 영작문 & 찬반 토론 & 8단계 완강 종합 리포트)
 * 
 * - 100% 로컬 저장 및 무결성 보장 (모든 기사 8단계 데이터 자동 보장)
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CnnNewsArticle,
  GuidedCourseProgress,
  GuidedCourseStep,
  SentenceAnalysisItem,
  WritingOutputData,
  DebateOutputData,
  CnnVocabItem,
} from '../../types';
import {
  getNewsArticleById,
  updateNewsArticle,
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
  ensureArticleStudyData,
} from '../../utils/cnnNewsStorage';
import { audioManager } from '../../utils/audio';

interface CnnNewsGuidedCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
  onCourseCompleted?: () => void;
}

const STEP_LIST: { id: GuidedCourseStep; label: string; number: number; desc: string; icon: string }[] = [
  { id: 'READING', label: '1. 원문 정독', number: 1, desc: '원문 정독 & 번역 대조 & 문단별 TTS 낭독', icon: '📖' },
  { id: 'VOCABULARY', label: '2. 핵심 어휘', number: 2, desc: '기사 핵심 C2 어휘 학습 & 플래시카드 저장', icon: '📚' },
  { id: 'ANALYSIS', label: '3. 문장 분석', number: 3, desc: '기사 문장 선택 & 9대 통사 구조 정밀 분석', icon: '🔍' },
  { id: 'COMPREHENSION', label: '4. 심층 독해', number: 4, desc: '기사 팩트 독해 퀴즈 & C2 심층 비판적 질문', icon: '❓' },
  { id: 'DICTATION', label: '5. 받아쓰기', number: 5, desc: '핵심 구문 빈칸 받아쓰기 & 즉시 채점', icon: '🎧' },
  { id: 'SPEAKING', label: '6. 실전 말하기', number: 6, desc: '기사 핵심 논제 영어 구술 발표 & 녹음', icon: '🎙️' },
  { id: 'SHADOWING', label: '7. 문장 섀도잉', number: 7, desc: '핵심 문장 4선 TTS 듣기 & 섀도잉 녹음', icon: '🔁' },
  { id: 'WRITING', label: '8. 작문 & 토론', number: 8, desc: 'Executive Summary 영작문 & 찬반 토론 & 완강', icon: '✍️' },
];

export const CnnNewsGuidedCourseModal: React.FC<CnnNewsGuidedCourseModalProps> = ({
  isOpen,
  onClose,
  articleId,
  onCourseCompleted,
}) => {
  const [article, setArticle] = useState<CnnNewsArticle | null>(() => {
    const art = getNewsArticleById(articleId);
    return art ? ensureArticleStudyData(art) : null;
  });
  const [courseProgress, setCourseProgress] = useState<GuidedCourseProgress | null>(() => {
    const art = getNewsArticleById(articleId);
    return art ? getGuidedProgress(art.id) : null;
  });
  const [activeStep, setActiveStep] = useState<GuidedCourseStep>('READING');
  const [currentParagraphIdx, setCurrentParagraphIdx] = useState<number>(0);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // 1단계 읽기 상태
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showKoreanTranslation, setShowKoreanTranslation] = useState(false);
  const [editingParagraphIdx, setEditingParagraphIdx] = useState<number | null>(null);
  const [paragraphNoteInput, setParagraphNoteInput] = useState<string>('');

  // 2단계 어휘 상태
  const [vocabSearch, setVocabSearch] = useState('');
  const [vocabFilter, setVocabFilter] = useState<'all' | 'memorized' | 'needs_review'>('all');
  const [editingVocabId, setEditingVocabId] = useState<string | null>(null);
  const [vocabNoteInput, setVocabNoteInput] = useState<string>('');

  // 3단계 문장 분석 상태
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

  // 8단계 작문/토론 상태
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

  // 6단계 말하기 상태
  const [speakingTranscript, setSpeakingTranscript] = useState('');
  const [speakingNote, setSpeakingNote] = useState('');
  const [isSpeakingRecording, setIsSpeakingRecording] = useState(false);
  const [speakingAudioUrl, setSpeakingAudioUrl] = useState<string | null>(null);
  const [speakingMicError, setSpeakingMicError] = useState<string | null>(null);
  const speakingMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speakingAudioChunksRef = useRef<Blob[]>([]);
  const speakingStreamRef = useRef<MediaStream | null>(null);

  // 7단계 섀도잉 상태
  const [selectedShadowId, setSelectedShadowId] = useState<string>('shadow-1');
  const [shadowSpeechRate, setShadowSpeechRate] = useState<number>(1.0);
  const [isShadowRecording, setIsShadowRecording] = useState(false);
  const [shadowAudioUrls, setShadowAudioUrls] = useState<Record<string, string>>({});
  const [shadowMicError, setShadowMicError] = useState<string | null>(null);
  const shadowMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const shadowAudioChunksRef = useRef<Blob[]>([]);
  const shadowStreamRef = useRef<MediaStream | null>(null);
  const activeBlobUrlsRef = useRef<Set<string>>(new Set());

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const refreshData = () => {
    const rawArt = getNewsArticleById(articleId);
    if (rawArt) {
      const art = ensureArticleStudyData(rawArt);
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

      if (typeof art.lastReadParagraphIndex === 'number') {
        setCurrentParagraphIdx(art.lastReadParagraphIndex);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
      const rawArt = getNewsArticleById(articleId);
      if (rawArt) {
        const art = ensureArticleStudyData(rawArt);
        const prog = getGuidedProgress(art.id);
        const validSteps: GuidedCourseStep[] = [
          'READING', 'VOCABULARY', 'ANALYSIS', 'COMPREHENSION',
          'DICTATION', 'SPEAKING', 'SHADOWING', 'WRITING', 'REVIEW',
        ];
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
      if (speakingStreamRef.current) {
        speakingStreamRef.current.getTracks().forEach((t) => t.stop());
        speakingStreamRef.current = null;
      }
      if (shadowStreamRef.current) {
        shadowStreamRef.current.getTracks().forEach((t) => t.stop());
        shadowStreamRef.current = null;
      }
    }
  }, [isOpen, articleId]);

  useEffect(() => {
    return () => {
      activeBlobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // ignore
        }
      });
      activeBlobUrlsRef.current.clear();
      if (speakingStreamRef.current) {
        speakingStreamRef.current.getTracks().forEach((t) => t.stop());
        speakingStreamRef.current = null;
      }
      if (shadowStreamRef.current) {
        shadowStreamRef.current.getTracks().forEach((t) => t.stop());
        shadowStreamRef.current = null;
      }
      audioManager.stop();
    };
  }, []);

  const allSentences = useMemo(() => {
    if (!article) return [];
    const list: { sentence: string; paragraphIndex: number }[] = [];
    (article.paragraphs || []).forEach((p, pIdx) => {
      const sents = splitIntoSentences(p);
      sents.forEach((s) => {
        list.push({ sentence: s, paragraphIndex: pIdx });
      });
    });
    return list;
  }, [article]);

  if (!isOpen) return null;

  const currentArticle = article || (articleId ? ensureArticleStudyData(getNewsArticleById(articleId) as any) : null);
  if (!currentArticle) return null;

  const currentProg = courseProgress || getGuidedProgress(currentArticle.id);

  const handleSelectStep = (step: GuidedCourseStep) => {
    audioManager.stop();
    setIsPlayingAudio(false);
    setActiveStep(step);
    updateGuidedProgress(currentArticle.id, { currentStep: step });
    setCourseProgress(getGuidedProgress(currentArticle.id));
  };

  // 1단계 음성 및 문단 이동
  const handleSelectParagraph = (idx: number) => {
    setCurrentParagraphIdx(idx);
    const updated = { ...currentArticle, lastReadParagraphIndex: idx };
    updateNewsArticle(updated);
    setArticle(updated);
  };

  const handlePlayParagraph = (idx: number) => {
    if (isPlayingAudio && currentParagraphIdx === idx) {
      audioManager.stop();
      setIsPlayingAudio(false);
      return;
    }
    const text = currentArticle.paragraphs[idx];
    if (!text) return;
    if (!audioManager.isSpeechSupported()) {
      alert('현재 브라우저 환경에서는 Web Speech 음성 합성(TTS)이 지원되지 않습니다.');
      return;
    }
    handleSelectParagraph(idx);
    audioManager.stop();
    setIsPlayingAudio(true);
    audioManager.speak(text, undefined, 0.9).finally(() => {
      setIsPlayingAudio(false);
    });
  };

  const handleSaveParagraphNote = (idx: number) => {
    updateParagraphNote(currentArticle.id, idx, paragraphNoteInput);
    refreshData();
    setEditingParagraphIdx(null);
    setParagraphNoteInput('');
    showToast(`¶${idx + 1} 문단 메모가 저장되었습니다.`);
  };

  // 2단계 어휘
  const handleToggleVocabMemorized = (vocab: CnnVocabItem) => {
    const updated: CnnVocabItem = {
      ...vocab,
      isMemorized: !vocab.isMemorized,
      needsReview: vocab.isMemorized,
    };
    updateCoreVocabItem(currentArticle.id, updated);
    refreshData();
    showToast(`[${vocab.expression}] 상태: ${updated.isMemorized ? '암기 완료' : '복습 필요'}`);
  };

  const handleSaveVocabNote = (vocab: CnnVocabItem) => {
    const updated: CnnVocabItem = { ...vocab, userNote: vocabNoteInput };
    updateCoreVocabItem(currentArticle.id, updated);
    refreshData();
    setEditingVocabId(null);
    showToast(`[${vocab.expression}] 메모가 저장되었습니다.`);
  };

  const handleExportToFlashcards = (vocab: CnnVocabItem) => {
    saveNewsExpression({
      expression: vocab.expression,
      inContext: vocab.contextSentence || currentArticle.paragraphs[vocab.paragraphIndex || 0] || '',
      everydayMeaning: vocab.koreanMeaning,
      newsId: currentArticle.id,
      newsTitle: currentArticle.title,
      partOfSpeech: vocab.partOfSpeech,
      userNote: vocab.userNote,
    });
    showToast(`[${vocab.expression}] 플래시카드 단어장에 저장되었습니다.`);
  };

  // 3단계 문장 분석
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
    updateSentenceAnalysis(currentArticle.id, item);
    refreshData();
    syncGuidedProgressWithArticle(currentArticle);
    showToast('문장 구조 분석이 성공적으로 저장되었습니다.');
  };

  // 4단계 퀴즈 및 독해 질문
  const handleSelectQuizOption = (quizId: string, optKey: string) => {
    const res = updateComprehensionQuiz(currentArticle.id, quizId, optKey);
    refreshData();
    syncGuidedProgressWithArticle(currentArticle);
    showToast(res.isCorrect ? '🎉 정답입니다!' : '오답입니다. 해설을 확인해보세요.');
  };

  const handleResetQuiz = (quizId: string) => {
    resetComprehensionQuiz(currentArticle.id, quizId);
    refreshData();
    syncGuidedProgressWithArticle(currentArticle);
    showToast('독해 문제가 초기화되었습니다.');
  };

  const handleSaveC2Answer = (qId: string, answer: string, exp?: string) => {
    updateQuestionAnswer(currentArticle.id, qId, answer, exp);
    refreshData();
    syncGuidedProgressWithArticle(currentArticle);
    showToast('C2 독해 답변이 저장되었습니다.');
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
    const res = updateDictationQuiz(currentArticle.id, quizId, inputs);
    refreshData();
    syncGuidedProgressWithArticle(currentArticle);
    showToast(res.isCorrect ? '🎉 정답입니다! 정확도 100%' : `정확도: ${res.accuracyRate}%. 다시 확인해보세요.`);
  };

  const handleResetDictation = (quizId: string) => {
    resetDictationQuiz(currentArticle.id, quizId);
    refreshData();
    setDictationInputs((prev) => ({
      ...prev,
      [quizId]: prev[quizId] ? prev[quizId].map(() => '') : [],
    }));
    showToast('받아쓰기 문제가 초기화되었습니다.');
  };

  // 6단계 말하기 녹음
  const handleStartSpeakingRecording = async () => {
    setSpeakingMicError(null);
    try {
      if (speakingAudioUrl) {
        activeBlobUrlsRef.current.delete(speakingAudioUrl);
        try {
          URL.revokeObjectURL(speakingAudioUrl);
        } catch (e) {}
        setSpeakingAudioUrl(null);
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      speakingStreamRef.current = stream;
      const mr = new MediaRecorder(stream);
      speakingMediaRecorderRef.current = mr;
      speakingAudioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) speakingAudioChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const audioBlob = new Blob(speakingAudioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        activeBlobUrlsRef.current.add(url);
        setSpeakingAudioUrl(url);
        setIsSpeakingRecording(false);
        if (speakingStreamRef.current) {
          speakingStreamRef.current.getTracks().forEach((t) => t.stop());
          speakingStreamRef.current = null;
        }
      };

      mr.start();
      setIsSpeakingRecording(true);
    } catch (err: any) {
      console.warn('Microphone access failed:', err);
      setSpeakingMicError('마이크 권한이 차단되었거나 마이크 장치를 찾을 수 없습니다.');
    }
  };

  const handleStopSpeakingRecording = () => {
    if (speakingMediaRecorderRef.current && speakingMediaRecorderRef.current.state === 'recording') {
      speakingMediaRecorderRef.current.stop();
    }
  };

  const handleSaveSpeaking = (isCompleted: boolean) => {
    const targetEx = currentArticle.speakingExercises?.[0];
    if (!targetEx) return;
    const nextCompleted = isCompleted ? !targetEx.isCompleted : targetEx.isCompleted;
    updateSpeakingExercise(currentArticle.id, targetEx.id, {
      userTranscript: speakingTranscript,
      userNote: speakingNote,
      isCompleted: nextCompleted,
    });
    refreshData();
    syncGuidedProgressWithArticle(currentArticle);
    showToast('말하기 학습 내용이 성공적으로 저장되었습니다.');
  };

  // 7단계 섀도잉 녹음
  const handleStartShadowRecording = async (shadowId: string) => {
    setShadowMicError(null);
    try {
      if (shadowAudioUrls[shadowId]) {
        activeBlobUrlsRef.current.delete(shadowAudioUrls[shadowId]);
        try {
          URL.revokeObjectURL(shadowAudioUrls[shadowId]);
        } catch (e) {}
        setShadowAudioUrls((prev) => {
          const next = { ...prev };
          delete next[shadowId];
          return next;
        });
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      shadowStreamRef.current = stream;
      const mr = new MediaRecorder(stream);
      shadowMediaRecorderRef.current = mr;
      shadowAudioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) shadowAudioChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const audioBlob = new Blob(shadowAudioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        activeBlobUrlsRef.current.add(url);
        setShadowAudioUrls((prev) => ({ ...prev, [shadowId]: url }));
        setIsShadowRecording(false);
        if (shadowStreamRef.current) {
          shadowStreamRef.current.getTracks().forEach((t) => t.stop());
          shadowStreamRef.current = null;
        }
      };

      mr.start();
      setIsShadowRecording(true);
    } catch (err: any) {
      console.warn('Shadowing mic access failed:', err);
      setShadowMicError('마이크 권한이 차단되었거나 마이크 장치를 찾을 수 없습니다.');
    }
  };

  const handleStopShadowRecording = () => {
    if (shadowMediaRecorderRef.current && shadowMediaRecorderRef.current.state === 'recording') {
      shadowMediaRecorderRef.current.stop();
    }
  };

  const handleToggleShadowCompleted = (shadowId: string, currentVal: boolean) => {
    updateShadowingExercise(currentArticle.id, shadowId, { isCompleted: !currentVal });
    refreshData();
    syncGuidedProgressWithArticle(currentArticle);
    showToast(`섀도잉 상태가 [${!currentVal ? '완료' : '미완료'}]로 업데이트되었습니다.`);
  };

  // 8단계 작문 & 토론
  const handleSaveWriting = () => {
    updateWritingOutput(currentArticle.id, writingForm);
    refreshData();
    syncGuidedProgressWithArticle(currentArticle);
    showToast('C2 영작문이 저장되었습니다.');
  };

  const handleSaveDebate = () => {
    updateDebateOutput(currentArticle.id, debateForm);
    refreshData();
    syncGuidedProgressWithArticle(currentArticle);
    showToast('찬반 토론 프레임워크가 저장되었습니다.');
  };

  const handleCompleteAllCourse = () => {
    updateGuidedProgress(currentArticle.id, {
      currentStep: 'COMPLETED',
      highestStepReached: 'COMPLETED',
      checklist: {
        ...currentProg.checklist,
        hasReviewedAll: true,
      },
    });
    const updated = { ...currentArticle, status: 'completed' as const };
    updateNewsArticle(updated);
    setArticle(updated);
    refreshData();
    showToast('🎉 축하합니다! 실전 C2 학습 코스 8단계를 모두 완강하였습니다!');
    if (onCourseCompleted) onCourseCompleted();
  };

  const filteredVocabularies = useMemo(() => {
    const list = currentArticle.coreVocabularies || [];
    return list.filter((v) => {
      const matchSearch =
        v.expression.toLowerCase().includes(vocabSearch.toLowerCase()) ||
        v.koreanMeaning.includes(vocabSearch);
      if (!matchSearch) return false;
      if (vocabFilter === 'memorized') return v.isMemorized;
      if (vocabFilter === 'needs_review') return !v.isMemorized;
      return true;
    });
  }, [currentArticle.coreVocabularies, vocabSearch, vocabFilter]);

  // 8단계 진행률 계산
  let completedCount = 0;
  if (currentProg.checklist?.hasReadPassage) completedCount++;
  if ((currentArticle.coreVocabularies || []).some((v) => v.isMemorized)) completedCount++;
  if ((currentProg.checklist?.analyzedSentenceIds || []).length > 0 || Object.keys(currentArticle.sentenceAnalyses || {}).length > 0) completedCount++;
  if (currentProg.checklist?.quizScores && currentProg.checklist.quizScores.passedCount >= 1) completedCount++;
  if ((currentArticle.dictationQuizzes || []).some((d) => d.isCorrect)) completedCount++;
  if ((currentArticle.speakingExercises || []).some((s) => s.isCompleted)) completedCount++;
  if ((currentArticle.shadowingExercises || []).some((s) => s.isCompleted)) completedCount++;
  if (currentProg.checklist?.hasCompletedWriting || currentProg.checklist?.hasReviewedAll || currentProg.currentStep === 'COMPLETED') completedCount++;
  const progressPercent = Math.min(100, Math.round((completedCount / 8) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl h-[94vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* 모달 상단 헤더 */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-bold flex items-center gap-1.5">
              <span>🎯</span>
              <span>실전 C2 학습 코스 (8단계)</span>
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span className="truncate max-w-xs sm:max-w-md">{currentArticle.title}</span>
                {currentArticle.koreanTitle && (
                  <span className="hidden sm:inline text-xs font-normal text-slate-400">({currentArticle.koreanTitle})</span>
                )}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>진행률: <strong className="text-emerald-400 font-bold">{progressPercent}%</strong> ({completedCount}/8 단계 완료)</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-sm"
            title="학습창 닫기"
          >
            ✕
          </button>
        </div>

        {/* 8단계 탭 네비게이션 바 */}
        <div className="bg-slate-950/80 border-b border-slate-800 px-3 flex items-center overflow-x-auto gap-1 scrollbar-thin">
          {STEP_LIST.map((step) => {
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => handleSelectStep(step.id)}
                className={`py-2.5 px-3 text-xs font-medium border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'border-red-500 text-white bg-slate-800/50 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
                }`}
              >
                <span>{step.icon}</span>
                <span>{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* 토스트 알림 */}
        {saveToast && (
          <div className="bg-emerald-600 text-white text-xs px-4 py-2 text-center font-semibold shadow-md animate-fade-in shrink-0">
            {saveToast}
          </div>
        )}

        {/* 본문 콘텐츠 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-900/60">
          {/* ==================================================================== */}
          {/* 1단계: READING (원문 정독 & 번역 대조 & 문단 낭독)                   */}
          {/* ==================================================================== */}
          {activeStep === 'READING' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>📖 1단계: 기사 원문 정독 & 번역 대조</span>
                    <span className="text-xs text-slate-400 font-normal">({currentArticle.paragraphs.length}개 문단)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    문단별 소리내어 읽고, Web Speech 브라우저 음성으로 들으며 메모를 기록하세요.
                  </p>
                </div>
                <button
                  onClick={() => setShowKoreanTranslation(!showKoreanTranslation)}
                  className={`px-3 py-1.5 rounded text-xs border font-medium transition-colors ${
                    showKoreanTranslation
                      ? 'bg-amber-600/30 text-amber-300 border-amber-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {showKoreanTranslation ? '한국어 번역 숨기기' : '1:1 한국어 번역 대조'}
                </button>
              </div>

              {/* 단일 통합 기사 리더 카드 */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-5">
                {currentArticle.paragraphs.map((p, idx) => {
                  const isCurrent = currentParagraphIdx === idx;
                  const note = currentArticle.userNotes?.[idx];
                  const koreanP = currentArticle.koreanParagraphs?.[idx];

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectParagraph(idx)}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrent
                          ? 'border-red-500/70 bg-slate-850 shadow-md ring-1 ring-red-500/30'
                          : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-mono font-bold text-red-400 px-2 py-0.5 rounded bg-red-950/50 border border-red-900/40">
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
                            <span>{isPlayingAudio && currentParagraphIdx === idx ? '⏹ 정지' : '🔊 듣기'}</span>
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

                      <p className="text-sm text-slate-200 leading-relaxed font-serif">
                        {p}
                      </p>

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

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleSelectStep('VOCABULARY')}
                  className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                >
                  다음: 2단계 핵심 어휘로 이동 →
                </button>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 2단계: VOCABULARY (핵심 어휘 학습 & 플래시카드 연동)                */}
          {/* ==================================================================== */}
          {activeStep === 'VOCABULARY' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>📚 2단계: 핵심 C2 어휘 학습 & 플래시카드</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({(currentArticle.coreVocabularies || []).filter((v) => v.isMemorized).length} / {(currentArticle.coreVocabularies || []).length}개 암기 완료)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    기사 본문에서 엄선한 C2 핵심 어휘를 학습하고 단어장에 보관하세요.
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredVocabularies.map((vocab) => (
                  <div
                    key={vocab.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      vocab.isMemorized
                        ? 'bg-slate-950/40 border-slate-800'
                        : 'bg-slate-850/60 border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-sm font-bold text-white">{vocab.expression}</span>
                          {vocab.partOfSpeech && (
                            <span className="ml-2 text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
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
                      {vocab.contextSentence && (
                        <p className="mt-2 text-xs text-slate-400 font-serif bg-slate-950/60 p-2.5 rounded border border-slate-800">
                          "{vocab.contextSentence}"
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <button
                        onClick={() => handleToggleVocabMemorized(vocab)}
                        className="text-slate-300 hover:text-white underline text-[11px]"
                      >
                        {vocab.isMemorized ? '복습 대상으로 전환' : '✓ 암기 완료 체크'}
                      </button>
                      <button
                        onClick={() => handleExportToFlashcards(vocab)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] border border-amber-900/40"
                      >
                        ⭐ 플래시카드 저장
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleSelectStep('READING')}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  ← 1단계 원문 정독으로
                </button>
                <button
                  onClick={() => handleSelectStep('ANALYSIS')}
                  className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                >
                  다음: 3단계 문장 분석으로 이동 →
                </button>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 3단계: ANALYSIS (고급 문장 분석 & 9대 통사 구조)                     */}
          {/* ==================================================================== */}
          {activeStep === 'ANALYSIS' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🔍 3단계: C2 고급 문장 9대 통사 구조 정밀 분석</span>
                  <span className="text-xs text-red-400 font-normal">
                    ({Object.keys(currentArticle.sentenceAnalyses || {}).length}개 완료)
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  원문에서 문장을 골라 문장 구조, 논리 접속사, 어조, 암시된 의미를 정밀 분석하세요.
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-300">
                  분석할 문장 선택:
                </label>
                <select
                  value={selectedSentence}
                  onChange={(e) => {
                    const sent = e.target.value;
                    setSelectedSentence(sent);
                    const found = allSentences.find((s) => s.sentence === sent);
                    if (found) {
                      setSentenceForm((prev) => ({ ...prev, paragraphIndex: found.paragraphIndex, sentence: sent }));
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-xs text-white"
                >
                  <option value="">-- 기사 내 문장을 선택하세요 --</option>
                  {allSentences.map((item, idx) => (
                    <option key={idx} value={item.sentence}>
                      ¶{item.paragraphIndex + 1}: {item.sentence.slice(0, 80)}...
                    </option>
                  ))}
                </select>
              </div>

              {selectedSentence && (
                <div className="bg-slate-950/70 p-5 rounded-xl border border-slate-800 space-y-4">
                  <p className="text-sm font-serif text-white bg-slate-900 p-3 rounded-lg border border-slate-800">
                    "{selectedSentence}"
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">문장 구조 (Syntax)</label>
                      <input
                        type="text"
                        value={sentenceForm.sentenceStructure}
                        onChange={(e) => setSentenceForm({ ...sentenceForm, sentenceStructure: e.target.value })}
                        placeholder="예: 주절 + 분사구문 + 조건절"
                        className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">논리 접속사 (Connectors)</label>
                      <input
                        type="text"
                        value={sentenceForm.logicalConnectors}
                        onChange={(e) => setSentenceForm({ ...sentenceForm, logicalConnectors: e.target.value })}
                        placeholder="예: however, on the contrary"
                        className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">어조 및 태도 (Tone)</label>
                      <input
                        type="text"
                        value={sentenceForm.toneAndAttitude}
                        onChange={(e) => setSentenceForm({ ...sentenceForm, toneAndAttitude: e.target.value })}
                        placeholder="예: 객관적, 비판적, 설득적"
                        className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">한국어 정밀 해석</label>
                      <input
                        type="text"
                        value={sentenceForm.koreanTranslation}
                        onChange={(e) => setSentenceForm({ ...sentenceForm, koreanTranslation: e.target.value })}
                        placeholder="자연스러운 우리말 완역"
                        className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveSentenceAnalysis}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold"
                    >
                      문장 분석 저장
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleSelectStep('VOCABULARY')}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  ← 2단계 핵심 어휘로
                </button>
                <button
                  onClick={() => handleSelectStep('COMPREHENSION')}
                  className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                >
                  다음: 4단계 심층 독해로 이동 →
                </button>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 4단계: COMPREHENSION (독해 퀴즈 & C2 비판적 질문)                   */}
          {/* ==================================================================== */}
          {activeStep === 'COMPREHENSION' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">4단계: 기사 근거 객관식 독해 퀴즈 & C2 질문</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  원문에 근거한 정확한 사실 관계를 퀴즈로 풀고, 비판적 시각을 서술하세요.
                </p>
              </div>

              <div className="space-y-4">
                {(currentArticle.comprehensionQuizzes || []).map((quiz, qIdx) => (
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

              {/* C2 비판적 독해 질문 서술 */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h4 className="text-sm font-bold text-white">C2 비판적 독해 심층 서술</h4>
                <div className="space-y-4">
                  {(currentArticle.readingQuestions || []).slice(0, 3).map((q) => (
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
                  ← 3단계 문장 분석으로
                </button>
                <button
                  onClick={() => handleSelectStep('DICTATION')}
                  className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                >
                  다음: 5단계 받아쓰기로 이동 →
                </button>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 5단계: DICTATION (빈칸 받아쓰기)                                    */}
          {/* ==================================================================== */}
          {activeStep === 'DICTATION' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🎧 5단계: 핵심 구문 빈칸 받아쓰기 (Dictation)</span>
                  <span className="text-xs text-slate-400 font-normal">
                    ({(currentArticle.dictationQuizzes || []).filter((d) => d.isCorrect).length} / {(currentArticle.dictationQuizzes || []).length}개 완료)
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  원문의 핵심 표현을 소리내어 듣고 빈칸을 정확한 스펠링으로 완성하세요.
                </p>
              </div>

              <div className="space-y-4">
                {(currentArticle.dictationQuizzes || []).map((dict, dIdx) => {
                  const inputs = dictationInputs[dict.id] || dict.blankAnswers.map(() => '');

                  return (
                    <div key={dict.id} className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-400">받아쓰기 문제 {dIdx + 1}</span>
                        {dict.isCorrect && (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800">
                            ✓ 정답 완성 (정확도 {dict.accuracyRate}%)
                          </span>
                        )}
                      </div>

                      <div className="p-4 rounded bg-slate-900 border border-slate-800">
                        <p className="text-sm font-serif text-slate-200 leading-relaxed">
                          {dict.displaySentence}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {dict.blankAnswers.map((ans, bIdx) => (
                          <div key={bIdx} className="flex items-center gap-1.5">
                            <span className="text-slate-400">빈칸 [{bIdx + 1}]:</span>
                            <input
                              type="text"
                              value={inputs[bIdx] || ''}
                              onChange={(e) => handleDictInputChange(dict.id, bIdx, e.target.value)}
                              placeholder={`단어 입력 (${ans.length}글자)`}
                              className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                            />
                          </div>
                        ))}
                      </div>

                      {dict.blankAnswers && (
                        <p className="text-[11px] text-amber-400">💡 힌트: {dict.blankAnswers.map((a, i) => `빈칸 ${i + 1}: ${a.length}글자`).join(', ')}</p>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <div className="space-x-2">
                          <button
                            onClick={() => handleSubmitDictation(dict.id)}
                            className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                          >
                            정답 확인
                          </button>
                          <button
                            onClick={() => handleResetDictation(dict.id)}
                            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                          >
                            다시 쓰기
                          </button>
                        </div>
                        {dict.revealed && (
                          <span className="text-xs text-amber-300 font-bold">
                            정답: {dict.blankAnswers.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleSelectStep('COMPREHENSION')}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  ← 4단계 심층 독해로
                </button>
                <button
                  onClick={() => handleSelectStep('SPEAKING')}
                  className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                >
                  다음: 6단계 실전 말하기로 이동 →
                </button>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 6단계: SPEAKING (실전 말하기 발표 & 녹음)                            */}
          {/* ==================================================================== */}
          {activeStep === 'SPEAKING' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🎙️ 6단계: 기사 핵심 논제 영어 구술 발표</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  제시된 질문을 바탕으로 1분간 영어로 말하고 녹음하여 자신의 발화 내용을 점검하세요.
                </p>
              </div>

              {currentArticle.speakingExercises?.[0] && (
                <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800">
                    <span className="text-[11px] font-bold text-amber-400 block mb-1">발표 주제 및 제시문:</span>
                    <p className="text-sm font-bold text-white font-sans">
                      "{currentArticle.speakingExercises[0].koreanPrompt}"
                    </p>
                  </div>

                  <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                    <span className="text-[11px] font-bold text-emerald-400 block mb-1">권장 영어 표현 모델:</span>
                    <p className="text-xs text-slate-300 font-serif leading-relaxed">
                      {currentArticle.speakingExercises[0].targetEnglish}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      내 발표 요약 또는 녹취록 메모:
                    </label>
                    <textarea
                      rows={3}
                      value={speakingTranscript}
                      onChange={(e) => setSpeakingTranscript(e.target.value)}
                      placeholder="자신이 말한 주요 영어 문장이나 키워드를 기록해보세요..."
                      className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {!isSpeakingRecording ? (
                      <button
                        onClick={handleStartSpeakingRecording}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2"
                      >
                        <span>🎙️</span>
                        <span>발표 녹음 시작</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleStopSpeakingRecording}
                        className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 animate-pulse"
                      >
                        <span>⏹️</span>
                        <span>녹음 정지</span>
                      </button>
                    )}

                    {speakingAudioUrl && (
                      <audio controls src={speakingAudioUrl} className="h-9" />
                    )}

                    <button
                      onClick={() => handleSaveSpeaking(true)}
                      className="ml-auto px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700"
                    >
                      {currentArticle.speakingExercises[0].isCompleted ? '✓ 발표 완료됨' : '말하기 완료 체크 및 저장'}
                    </button>
                  </div>

                  {speakingMicError && (
                    <p className="text-xs text-rose-400 font-medium">{speakingMicError}</p>
                  )}
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleSelectStep('DICTATION')}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  ← 5단계 받아쓰기로
                </button>
                <button
                  onClick={() => handleSelectStep('SHADOWING')}
                  className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                >
                  다음: 7단계 문장 섀도잉으로 이동 →
                </button>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 7단계: SHADOWING (대표 문장 4선 섀도잉)                               */}
          {/* ==================================================================== */}
          {activeStep === 'SHADOWING' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🔁 7단계: 기사 대표 문장 4선 섀도잉 (Shadowing)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ※ 브라우저 Web Speech 음성을 듣고 원문의 속도와 억양을 따라 말하며 녹음하세요.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(currentArticle.shadowingExercises || []).map((sh, idx) => (
                  <button
                    key={sh.id}
                    onClick={() => setSelectedShadowId(sh.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedShadowId === sh.id
                        ? 'bg-red-600/20 border-red-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>문장 {idx + 1}</span>
                      {sh.isCompleted && <span className="text-emerald-400">✓</span>}
                    </div>
                    <p className="text-[10px] truncate mt-1">{sh.targetSentence}</p>
                  </button>
                ))}
              </div>

              {(() => {
                const curShadow = (currentArticle.shadowingExercises || []).find((s) => s.id === selectedShadowId) || currentArticle.shadowingExercises?.[0];
                if (!curShadow) return null;
                const recordedUrl = shadowAudioUrls[curShadow.id];

                return (
                  <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
                    <p className="text-sm text-slate-200 font-serif bg-slate-900 p-4 rounded-lg border border-slate-800 leading-relaxed">
                      "{curShadow.targetSentence}"
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-slate-900 text-xs">
                      <button
                        onClick={() => audioManager.speak(curShadow.targetSentence, undefined, shadowSpeechRate)}
                        className="px-3.5 py-1.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5"
                      >
                        <span>🔊 원문 듣기 ({shadowSpeechRate}x)</span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[11px]">재생 속도:</span>
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

                    <div className="flex flex-wrap items-center gap-3">
                      {!isShadowRecording ? (
                        <button
                          onClick={() => handleStartShadowRecording(curShadow.id)}
                          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                        >
                          🎙️ 섀도잉 녹음 시작
                        </button>
                      ) : (
                        <button
                          onClick={handleStopShadowRecording}
                          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold animate-pulse"
                        >
                          ⏹️ 녹음 정지
                        </button>
                      )}
                      {recordedUrl && (
                        <audio controls src={recordedUrl} className="h-9" />
                      )}
                      <button
                        onClick={() => handleToggleShadowCompleted(curShadow.id, curShadow.isCompleted)}
                        className={`ml-auto px-4 py-2 rounded-lg text-xs font-semibold border ${
                          curShadow.isCompleted
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {curShadow.isCompleted ? '✓ 섀도잉 완료됨' : '섀도잉 완료 체크'}
                      </button>
                    </div>

                    {shadowMicError && (
                      <p className="text-xs text-rose-400 font-medium">{shadowMicError}</p>
                    )}
                  </div>
                );
              })()}

              <div className="flex justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleSelectStep('SPEAKING')}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  ← 6단계 실전 말하기로
                </button>
                <button
                  onClick={() => handleSelectStep('WRITING')}
                  className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                >
                  다음: 8단계 영작문 & 찬반 토론으로 이동 →
                </button>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 8단계: WRITING & DEBATE (영작문 & 토론 & 완강 종합 리포트)           */}
          {/* ==================================================================== */}
          {activeStep === 'WRITING' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>✍️ 8단계: C2 영작문 & 찬반 토론 프레임워크</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  기사의 Executive Summary 영작문과 찬반 논증을 수립하고 실전 코스를 완강하세요.
                </p>
              </div>

              {/* 영작문 요약 */}
              <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-white">
                  1) Executive Summary 영문 요약문 (3~5문장)
                </label>
                <textarea
                  rows={4}
                  value={writingForm.summary}
                  onChange={(e) => setWritingForm({ ...writingForm, summary: e.target.value })}
                  placeholder="In this report, CNN highlights the critical challenges regarding..."
                  className="w-full bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs text-white font-serif focus:outline-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveWriting}
                    className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                  >
                    영작문 저장
                  </button>
                </div>
              </div>

              {/* 찬반 토론 */}
              <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-white">
                  2) 찬반 토론 핵심 쟁점 및 본인의 입장
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">핵심 쟁점 (Core Issue)</label>
                    <input
                      type="text"
                      value={debateForm.coreIssue}
                      onChange={(e) => setDebateForm({ ...debateForm, coreIssue: e.target.value })}
                      placeholder="예: 긴급 공급망 복구 대책의 우선순위"
                      className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">최종 입장 (Final Position)</label>
                    <input
                      type="text"
                      value={debateForm.finalPosition}
                      onChange={(e) => setDebateForm({ ...debateForm, finalPosition: e.target.value })}
                      placeholder="예: 단기적 물류 지원과 장기적 인력 확충의 병행"
                      className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveDebate}
                    className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                  >
                    토론 프레임워크 저장
                  </button>
                </div>
              </div>

              {/* 최종 완강 축하 카드 */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-red-950/60 via-slate-900 to-emerald-950/60 border border-slate-700 text-center space-y-3">
                <span className="text-3xl">🎉</span>
                <h4 className="text-base font-black text-white">실전 C2 학습 코스 (8단계) 최종 완강</h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  원문 정독부터 어휘, 통사 분석, 퀴즈, 받아쓰기, 말하기, 섀도잉, 영작문까지 8단계 전 과정을 성공적으로 완료하셨습니다.
                </p>
                <button
                  onClick={handleCompleteAllCourse}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-transform hover:scale-105"
                >
                  ✓ 8단계 최종 완강 승인 및 기록 저장
                </button>
              </div>

              <div className="flex justify-start pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleSelectStep('SHADOWING')}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  ← 7단계 문장 섀도잉으로
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
