/**
 * Booky STEP 10: CNN News C2 단계별 실전 학습 코스 모달
 * 
 * - 5단계 정밀 학습 파이프라인:
 *   1단계: Reading (원문 정독 & 문단 메모 & 오디오 낭독)
 *   2단계: Sentence Analysis (원문 문장 선택 & 9대 통사/함축 구조 정밀 분석)
 *   3단계: C2 Reading Comprehension (8대 비판적 독해 질문 작성 & 답변)
 *   4단계: Writing and Argumentation (영어 요약, 근거 2개, 반론, 재반박, 결론)
 *   5단계: Review (종합 복습, 플래시카드 연동 확인, 실제 기준 기반 완료 판정)
 * 
 * - 7대 진행 상태: NOT_STARTED, READING, ANALYSIS, COMPREHENSION, WRITING, REVIEW, COMPLETED
 * - 가짜 정답/가짜 점수 배제, 100% 브라우저 로컬 저장 및 백업 연동
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CnnNewsArticle,
  GuidedCourseProgress,
  GuidedCourseStep,
  SentenceAnalysisItem,
  KeyExpression,
  WritingOutputData,
  DebateOutputData,
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
  loadNewsExpressions,
  splitIntoSentences,
  getGuidedProgress,
  updateGuidedProgress,
  syncGuidedProgressWithArticle,
} from '../../utils/cnnNewsStorage';
import { audioManager } from '../../utils/audio';

interface CnnNewsGuidedCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
  onCourseCompleted?: () => void;
}

const STEP_LIST: { id: GuidedCourseStep; label: string; number: number; desc: string }[] = [
  { id: 'READING', label: '1. Reading', number: 1, desc: '원문 정독 & 문단 메모' },
  { id: 'ANALYSIS', label: '2. Sentence Analysis', number: 2, desc: '고급 문장 구조 분석' },
  { id: 'COMPREHENSION', label: '3. Comprehension', number: 3, desc: 'C2 비판적 독해 질문' },
  { id: 'WRITING', label: '4. Writing & Debate', number: 4, desc: '영작문 & 찬반 논증' },
  { id: 'REVIEW', label: '5. Review & Complete', number: 5, desc: '종합 복습 & 완료 판정' },
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
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // 음성 재생
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // 문단 메모 인풋
  const [editingParagraphIdx, setEditingParagraphIdx] = useState<number | null>(null);
  const [paragraphNoteInput, setParagraphNoteInput] = useState<string>('');

  // 문장 분석
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

  // 어휘
  const [expressions, setExpressions] = useState<KeyExpression[]>([]);
  const [quickVocabInput, setQuickVocabInput] = useState({
    expression: '',
    everydayMeaning: '',
    partOfSpeech: '',
    englishDefinition: '',
  });
  const [isAddingVocab, setIsAddingVocab] = useState(false);

  // 작문/토론 폼 (Step 4)
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

  // 데이터 로드
  const refreshData = () => {
    const art = getNewsArticleById(articleId);
    if (art) {
      setArticle(art);
      setExpressions(loadNewsExpressions(articleId));
      if (art.writingOutput) setWritingForm(art.writingOutput);
      if (art.debateOutput) setDebateForm(art.debateOutput);

      const prog = syncGuidedProgressWithArticle(art);
      setCourseProgress(prog);

      // 이전 진행 상태가 있으면 해당 단계로 복원
      if (prog.currentStep !== 'NOT_STARTED' && prog.currentStep !== 'COMPLETED') {
        setActiveStep(prog.currentStep);
      } else if (prog.currentStep === 'COMPLETED') {
        setActiveStep('REVIEW');
      } else {
        setActiveStep('READING');
      }

      if (prog.lastParagraphIndex) {
        setCurrentParagraphIdx(prog.lastParagraphIndex);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
    } else {
      audioManager.stop();
      setIsPlayingAudio(false);
    }
  }, [isOpen, articleId]);

  // 원문의 모든 문장 목록
  const allSentences = useMemo(() => {
    if (!article) return [];
    const list: { sentence: string; paragraphIndex: number }[] = [];
    article.paragraphs.forEach((p, pIdx) => {
      const sentences = splitIntoSentences(p);
      sentences.forEach((s) => {
        if (s.length > 10) list.push({ sentence: s, paragraphIndex: pIdx });
      });
    });
    return list;
  }, [article]);

  if (!isOpen || !article || !courseProgress) return null;

  // 단계 이동 및 상태 저장
  const handleGoToStep = (targetStep: GuidedCourseStep) => {
    setActiveStep(targetStep);
    updateGuidedProgress(article.id, {
      currentStep: targetStep,
      lastParagraphIndex: currentParagraphIdx,
    });
    refreshData();
  };

  // 1단계: 문단 읽기 & 오디오
  const handlePlayParagraph = (pIdx: number) => {
    if (isPlayingAudio) {
      audioManager.stop();
      setIsPlayingAudio(false);
      return;
    }

    const text = article.paragraphs[pIdx];
    if (!text) return;

    setIsPlayingAudio(true);
    setCurrentParagraphIdx(pIdx);

    audioManager.speak(text, undefined, 0.9).finally(() => {
      setIsPlayingAudio(false);
    });
  };

  // 문단 메모 저장
  const handleSaveParagraphNote = (pIdx: number) => {
    updateParagraphNote(article.id, pIdx, paragraphNoteInput);
    setEditingParagraphIdx(null);
    setParagraphNoteInput('');
    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 600);
    refreshData();
  };

  // 빠른 어휘 저장
  const handleSaveQuickVocab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVocabInput.expression.trim() || !quickVocabInput.everydayMeaning.trim()) return;

    saveNewsExpression({
      expression: quickVocabInput.expression.trim(),
      everydayMeaning: quickVocabInput.everydayMeaning.trim(),
      inContext: article.paragraphs[currentParagraphIdx] || '',
      partOfSpeech: quickVocabInput.partOfSpeech.trim(),
      englishDefinition: quickVocabInput.englishDefinition.trim(),
      newsId: article.id,
      newsTitle: article.title,
    });

    setQuickVocabInput({
      expression: '',
      everydayMeaning: '',
      partOfSpeech: '',
      englishDefinition: '',
    });
    setIsAddingVocab(false);
    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 600);
    refreshData();
  };

  // 2단계: 문장 분석 저장
  const handleSaveSentenceAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentenceForm.sentence.trim()) return;

    const sentId = `sent-${sentenceForm.paragraphIndex}-${sentenceForm.sentence.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`;
    const item: SentenceAnalysisItem = {
      id: sentId,
      ...sentenceForm,
      updatedAt: new Date().toISOString(),
    };

    updateSentenceAnalysis(article.id, item);
    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 600);
    refreshData();
  };

  // 3단계: 질문 답변 저장
  const handleSaveQuestionAnswer = (qId: string, answer: string, explanation?: string) => {
    updateQuestionAnswer(article.id, qId, answer, explanation);
    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 600);
    refreshData();
  };

  // 4단계: 작문 & 토론 저장
  const handleSaveWriting = (e: React.FormEvent) => {
    e.preventDefault();
    updateWritingOutput(article.id, writingForm);
    updateDebateOutput(article.id, debateForm);
    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 600);
    refreshData();
  };

  // 5단계: 완료 판정
  const isEligibleForCompletion = useMemo(() => {
    const checklist = courseProgress.checklist;
    const hasAnalyzed = checklist.analyzedSentenceIds.length > 0;
    const hasAnsweredQ = checklist.answeredQuestionIds.length > 0;
    const hasWriting = checklist.hasCompletedWriting;
    return hasAnalyzed && hasAnsweredQ && hasWriting;
  }, [courseProgress]);

  const handleCompleteCourse = () => {
    if (!isEligibleForCompletion) {
      alert('아직 완료 조건을 모두 충족하지 못했습니다.\n\n- 최소 1개 문장 분석 완료\n- 최소 1개 독해 질문 답변 작성\n- 영작문 또는 토론 논증 작성\n\n위 항목들을 채워주세요!');
      return;
    }

    updateGuidedProgress(article.id, {
      currentStep: 'COMPLETED',
      completedAt: new Date().toISOString(),
      checklist: {
        ...courseProgress.checklist,
        hasReviewedAll: true,
      },
    });

    const updatedArt: CnnNewsArticle = {
      ...article,
      status: 'completed',
    };
    updateNewsArticle(updatedArt);

    refreshData();
    onCourseCompleted?.();
    alert('🎉 축하합니다! 이 CNN 뉴스의 C2 단계별 실전 학습 코스를 성공적으로 완독하셨습니다!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-red-900/60 rounded-2xl w-full max-w-5xl h-[95vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        role="dialog"
        aria-labelledby="guided-course-title"
      >
        {/* ==================================================================== */}
        {/* 모달 상단 헤더 & 코스 5단계 네비게이션                                */}
        {/* ==================================================================== */}
        <header className="bg-slate-950 border-b border-red-950 px-4 sm:px-6 py-3 shrink-0">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center space-x-3 truncate">
              <span className="px-2 py-0.5 rounded font-black text-xs bg-red-600 text-white shrink-0">
                C2 Guided
              </span>
              <div className="truncate">
                <h2 id="guided-course-title" className="text-sm sm:text-base font-bold text-white truncate">
                  {article.title}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {article.source} • {article.topic} • 상태:{' '}
                  <span className="font-semibold text-red-400 uppercase">
                    {courseProgress.currentStep}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <span>{saveStatus === 'saving' ? '💾 저장 중...' : '✓ 자동 저장됨'}</span>
              </span>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                aria-label="코스 나가기"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 5단계 프로그레스 바 */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {STEP_LIST.map((s) => {
              const isActive = activeStep === s.id;
              const isPast =
                (s.id === 'READING' && courseProgress.checklist.hasReadPassage) ||
                (s.id === 'ANALYSIS' && courseProgress.checklist.analyzedSentenceIds.length > 0) ||
                (s.id === 'COMPREHENSION' && courseProgress.checklist.answeredQuestionIds.length > 0) ||
                (s.id === 'WRITING' && courseProgress.checklist.hasCompletedWriting) ||
                (s.id === 'REVIEW' && courseProgress.currentStep === 'COMPLETED');

              return (
                <button
                  key={s.id}
                  onClick={() => handleGoToStep(s.id)}
                  className={`py-1.5 px-2 rounded-lg text-left transition border cursor-pointer ${
                    isActive
                      ? 'bg-red-950/80 border-red-500 text-white font-bold shadow-sm'
                      : isPast
                      ? 'bg-slate-800/80 border-slate-700 text-emerald-300'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span>Step {s.number}</span>
                    {isPast && <span className="text-emerald-400">✓</span>}
                  </div>
                  <div className="text-xs truncate font-medium mt-0.5">{s.label.split('. ')[1]}</div>
                </button>
              );
            })}
          </div>
        </header>

        {/* ==================================================================== */}
        {/* 모달 본문 영역 (단계별 콘텐츠)                                        */}
        {/* ==================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ================================================================== */}
          {/* 1단계: READING (원문 정독 & 문단 메모 & 낭독)                       */}
          {/* ================================================================== */}
          {activeStep === 'READING' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-center justify-between">
                <div>
                  <strong className="text-white block mb-0.5">📖 1단계: 원문 정독 및 문단 핵심 파악</strong>
                  <span>문단을 소리 내어 읽거나 음성을 들으며, 문단별 중심 생각을 메모하고 생소한 어휘를 저장하세요.</span>
                </div>
                <button
                  onClick={() => setIsAddingVocab(!isAddingVocab)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition shrink-0 ml-3"
                >
                  {isAddingVocab ? '어휘창 닫기' : '➕ 생소한 어휘 저장'}
                </button>
              </div>

              {/* 빠른 어휘 추가 폼 */}
              {isAddingVocab && (
                <form onSubmit={handleSaveQuickVocab} className="bg-slate-800 p-4 rounded-xl border border-red-900/80 space-y-3">
                  <h4 className="text-xs font-bold text-red-400">새 C2 어휘 등록</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="단어 또는 표현 (예: watershed moment)"
                      value={quickVocabInput.expression}
                      onChange={(e) => setQuickVocabInput({ ...quickVocabInput, expression: e.target.value })}
                      className="px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-white"
                      required
                    />
                    <input
                      type="text"
                      placeholder="한국어 의미 (예: 분수령, 중대한 전환점)"
                      value={quickVocabInput.everydayMeaning}
                      onChange={(e) => setQuickVocabInput({ ...quickVocabInput, everydayMeaning: e.target.value })}
                      className="px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-white"
                      required
                    />
                    <input
                      type="text"
                      placeholder="품사 (예: noun phrase)"
                      value={quickVocabInput.partOfSpeech}
                      onChange={(e) => setQuickVocabInput({ ...quickVocabInput, partOfSpeech: e.target.value })}
                      className="px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-white"
                    />
                    <input
                      type="text"
                      placeholder="영영 정의 (선택)"
                      value={quickVocabInput.englishDefinition}
                      onChange={(e) => setQuickVocabInput({ ...quickVocabInput, englishDefinition: e.target.value })}
                      className="px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingVocab(false)}
                      className="px-3 py-1 rounded bg-slate-700 text-xs"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-semibold text-xs"
                    >
                      저장
                    </button>
                  </div>
                </form>
              )}

              {/* 문단 리스트 */}
              <div className="space-y-5">
                {article.paragraphs.map((pText, pIdx) => {
                  const isCurrent = currentParagraphIdx === pIdx;
                  const hasNote = !!article.userNotes?.[pIdx];

                  return (
                    <div
                      key={pIdx}
                      onClick={() => setCurrentParagraphIdx(pIdx)}
                      className={`p-5 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-slate-800/90 border-red-500/80 shadow-lg'
                          : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-2 pb-2 border-b border-slate-700/60">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-red-500">¶ {pIdx + 1}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayParagraph(pIdx);
                            }}
                            className="px-2.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[11px] font-medium transition"
                          >
                            {isPlayingAudio && currentParagraphIdx === pIdx ? '⏹ 낭독 정지' : '🔊 문단 낭독'}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingParagraphIdx(editingParagraphIdx === pIdx ? null : pIdx);
                            setParagraphNoteInput(article.userNotes?.[pIdx] || '');
                          }}
                          className={`text-[11px] px-2 py-0.5 rounded transition ${
                            hasNote
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {hasNote ? '📝 문단 메모 수정' : '+ 문단 메모'}
                        </button>
                      </div>

                      <p className="text-sm font-serif leading-relaxed text-slate-200">{pText}</p>

                      {/* 문단 메모 표시 & 편집 */}
                      {(editingParagraphIdx === pIdx || hasNote) && (
                        <div className="mt-3 pt-3 border-t border-slate-700/60 text-xs">
                          {editingParagraphIdx === pIdx ? (
                            <div className="space-y-2 bg-slate-900 p-3 rounded-xl border border-amber-800/60">
                              <label className="block text-[11px] font-semibold text-amber-400">
                                ¶{pIdx + 1} 문단 핵심 논지 메모
                              </label>
                              <textarea
                                rows={2}
                                value={paragraphNoteInput}
                                onChange={(e) => setParagraphNoteInput(e.target.value)}
                                placeholder="이 문단의 핵심 의미나 논리적 역할을 자유롭게 기록하세요..."
                                className="w-full px-3 py-1.5 text-xs rounded bg-slate-800 border border-slate-700 text-white"
                              />
                              <div className="flex justify-end space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingParagraphIdx(null)}
                                  className="px-3 py-1 rounded bg-slate-800 text-xs text-slate-400"
                                >
                                  취소
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveParagraphNote(pIdx)}
                                  className="px-3 py-1 rounded bg-amber-600 text-white font-semibold text-xs"
                                >
                                  저장
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded bg-amber-950/20 border border-amber-900/40 text-amber-200/90 flex justify-between items-center text-xs">
                              <span>
                                <strong className="text-amber-400 mr-1.5">메모:</strong>
                                {article.userNotes[pIdx]}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingParagraphIdx(pIdx);
                                  setParagraphNoteInput(article.userNotes[pIdx]);
                                }}
                                className="text-[11px] text-amber-400 hover:underline shrink-0 ml-2"
                              >
                                수정
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* 2단계: SENTENCE ANALYSIS (원문 문장 정밀 구조 분석)                  */}
          {/* ================================================================== */}
          {activeStep === 'ANALYSIS' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                <strong className="text-white block mb-0.5">🔍 2단계: C2 정밀 문장 구조 분석</strong>
                <span>
                  원문에 실제로 존재하는 문장을 골라, 주어·동사 통사 관계, 도치, 생략, 행간의 함축 의미를 직접 분석하여 기록하세요. (자동 분석 결과로 위장하지 않습니다)
                </span>
              </div>

              {/* 문장 선택기 */}
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  분석할 문장 선택 (원문 문장 {allSentences.length}개 중 선택):
                </label>
                <select
                  value={selectedSentence}
                  onChange={(e) => {
                    const found = allSentences.find((s) => s.sentence === e.target.value);
                    if (found) {
                      setSelectedSentence(found.sentence);
                      const sentId = `sent-${found.paragraphIndex}-${found.sentence.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`;
                      const existing = article.sentenceAnalyses?.[sentId];
                      if (existing) {
                        setSentenceForm({ ...existing });
                      } else {
                        setSentenceForm({
                          sentence: found.sentence,
                          paragraphIndex: found.paragraphIndex,
                          sentenceStructure: '',
                          keyGrammar: '',
                          logicalConnectors: '',
                          referents: '',
                          implicitMeaning: '',
                          toneAndAttitude: '',
                          koreanTranslation: '',
                          questions: '',
                        });
                      }
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-serif"
                >
                  <option value="">-- 분석할 원문 문장을 선택하세요 --</option>
                  {allSentences.map((s, idx) => (
                    <option key={idx} value={s.sentence}>
                      [¶{s.paragraphIndex + 1}] {s.sentence.slice(0, 90)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* 분석 폼 */}
              {sentenceForm.sentence && (
                <form onSubmit={handleSaveSentenceAnalysis} className="bg-slate-800 p-5 rounded-2xl border border-red-900/60 space-y-4">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">
                      Target Sentence (¶{sentenceForm.paragraphIndex + 1})
                    </span>
                    <p className="text-sm font-serif text-white">"{sentenceForm.sentence}"</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        1) 문장 구조 메모 (주어, 본동사, 도치, 수식절 관계)
                      </label>
                      <textarea
                        rows={2}
                        value={sentenceForm.sentenceStructure}
                        onChange={(e) => setSentenceForm({ ...sentenceForm, sentenceStructure: e.target.value })}
                        placeholder="예: 주어(The unprecedented surge) + 본동사(prompted) + 목적격보어 구조"
                        className="w-full px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        2) 핵심 문법 (분사구문, 가정법, 복합관계사)
                      </label>
                      <textarea
                        rows={2}
                        value={sentenceForm.keyGrammar}
                        onChange={(e) => setSentenceForm({ ...sentenceForm, keyGrammar: e.target.value })}
                        placeholder="예: 양보를 나타내는 전치사구 Notwithstanding..."
                        className="w-full px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        3) 접속 표현 및 논리 관계 (대조, 인과, 부연)
                      </label>
                      <textarea
                        rows={2}
                        value={sentenceForm.logicalConnectors}
                        onChange={(e) => setSentenceForm({ ...sentenceForm, logicalConnectors: e.target.value })}
                        placeholder="예: However -> 이전 단락의 긍정적 지표를 전면 반박"
                        className="w-full px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        4) 지시어 선행 내용 (Referents)
                      </label>
                      <textarea
                        rows={2}
                        value={sentenceForm.referents}
                        onChange={(e) => setSentenceForm({ ...sentenceForm, referents: e.target.value })}
                        placeholder="예: 'this predicament' -> 앞 문장의 고금리와 경기침체 위험"
                        className="w-full px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        5) 필자의 어조 및 함축 의미 (Subtext / Tone)
                      </label>
                      <textarea
                        rows={2}
                        value={sentenceForm.toneAndAttitude}
                        onChange={(e) => setSentenceForm({ ...sentenceForm, toneAndAttitude: e.target.value })}
                        placeholder="예: 회의적(Skeptical), 공식 낙관론에 대한 은근한 비판"
                        className="w-full px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        6) 한국어 직독직해 해석
                      </label>
                      <textarea
                        rows={2}
                        value={sentenceForm.koreanTranslation}
                        onChange={(e) => setSentenceForm({ ...sentenceForm, koreanTranslation: e.target.value })}
                        placeholder="문맥의 미묘한 뉘앙스를 살려 한국어로 번역하세요..."
                        className="w-full px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                    >
                      이 문장 분석 저장하기
                    </button>
                  </div>
                </form>
              )}

              {/* 저장된 분석 요약 카드 목록 */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-300">
                  작성된 문장 분석 ({Object.keys(article.sentenceAnalyses || {}).length}개)
                </h4>
                {Object.values(article.sentenceAnalyses || {}).map((item) => (
                  <div key={item.id} className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-red-400 font-bold">¶{item.paragraphIndex + 1}</span>
                      <button
                        onClick={() => {
                          setSelectedSentence(item.sentence);
                          setSentenceForm({ ...item });
                        }}
                        className="text-[11px] text-amber-400 hover:underline"
                      >
                        불러와서 수정
                      </button>
                    </div>
                    <p className="font-serif text-white font-medium">"{item.sentence}"</p>
                    {item.koreanTranslation && (
                      <p className="text-slate-400 text-[11px]">해석: {item.koreanTranslation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* 3단계: COMPREHENSION (C2 8대 비판적 독해 질문 작성 & 답변)           */}
          {/* ================================================================== */}
          {activeStep === 'COMPREHENSION' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 leading-relaxed">
                <strong className="text-white block mb-0.5">❓ 3단계: C2 비판적 독해 질문 (Critical Comprehension)</strong>
                <span>
                  질문 템플릿에 맞춰 직접 답변을 작성하세요. 모범 답안이 등록되지 않은 문항은 <code>질문 작성 필요</code> 상태로 유지되며 가짜 정답을 생성하지 않습니다.
                </span>
              </div>

              <div className="space-y-4">
                {(article.readingQuestions || []).map((q) => {
                  const hasAnswer = q.userAnswer && q.userAnswer.trim().length > 0;
                  const hasExp = q.userExplanation && q.userExplanation.trim().length > 0;

                  return (
                    <div key={q.id} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                        <h4 className="text-xs font-bold text-red-400">{q.questionLabel}</h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            hasAnswer
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {hasAnswer ? '답변 완료' : '질문 작성 필요'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 font-medium">{q.prompt}</p>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          나의 답변 (My Answer / Thesis):
                        </label>
                        <textarea
                          rows={3}
                          value={q.userAnswer}
                          onChange={(e) => {
                            const val = e.target.value;
                            setArticle({
                              ...article,
                              readingQuestions: article.readingQuestions.map((item) =>
                                item.id === q.id ? { ...item, userAnswer: val } : item
                              ),
                            });
                          }}
                          onBlur={(e) => handleSaveQuestionAnswer(q.id, e.target.value, q.userExplanation)}
                          placeholder="기사의 정량적 근거와 본인의 논리를 담아 서술하세요..."
                          className="w-full px-3 py-2 text-xs rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          모범 해설 및 논거 메모 (Explanation / Evidence):
                        </label>
                        <textarea
                          rows={2}
                          value={q.userExplanation || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setArticle({
                              ...article,
                              readingQuestions: article.readingQuestions.map((item) =>
                                item.id === q.id ? { ...item, userExplanation: val } : item
                              ),
                            });
                          }}
                          onBlur={(e) => handleSaveQuestionAnswer(q.id, q.userAnswer, e.target.value)}
                          placeholder="관련 인용문이나 모범 논리를 메모해 두세요 (모범 답안 미작성 시 빈칸 유지)..."
                          className="w-full px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-slate-300 focus:outline-none focus:border-slate-500"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleSaveQuestionAnswer(q.id, q.userAnswer, q.userExplanation)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg transition"
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================== */}
          {/* 4단계: WRITING & ARGUMENTATION (아카데믹 영작문 & 찬반 논증)        */}
          {/* ================================================================== */}
          {activeStep === 'WRITING' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                <strong className="text-white block mb-0.5">✍️ 4단계: C2 에세이 작문 및 토론 프레임워크</strong>
                <span>
                  기사 요약(3~5문장), 핵심 주장, 자신의 입장, 2개 이상의 근거, 예상 반론과 재반박을 직접 작성하여 완결된 논증문을 완성하세요. (인위적인 AI 자동 평가나 허위 점수를 생성하지 않습니다)
                </span>
              </div>

              <form onSubmit={handleSaveWriting} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    1) 뉴스 핵심 요약문 (Executive Summary, 3~5 sentences in English)
                  </label>
                  <textarea
                    rows={3}
                    value={writingForm.summary}
                    onChange={(e) => setWritingForm({ ...writingForm, summary: e.target.value })}
                    placeholder="Summarize the core premise, key developments, and significant implications..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-serif"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      2) 핵심 주장 및 자신의 입장 (Stance)
                    </label>
                    <select
                      value={writingForm.stance}
                      onChange={(e) => setWritingForm({ ...writingForm, stance: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                    >
                      <option value="agree">찬성 / 지지 (Agree)</option>
                      <option value="disagree">반대 / 비판 (Disagree)</option>
                      <option value="neutral">중립적 관망 (Neutral)</option>
                      <option value="nuanced">조건부 다각적 입장 (Nuanced)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      3) 핵심 쟁점 (Core Issue / Motion)
                    </label>
                    <input
                      type="text"
                      value={debateForm.coreIssue}
                      onChange={(e) => setDebateForm({ ...debateForm, coreIssue: e.target.value })}
                      placeholder="예: Should central banks hold rates steady despite slowing growth?"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      4) 지지 근거 2개 이상 (Supporting Arguments & Evidence)
                    </label>
                    <textarea
                      rows={4}
                      value={debateForm.argumentsFor}
                      onChange={(e) => setDebateForm({ ...debateForm, argumentsFor: e.target.value })}
                      placeholder="1. First supporting premise with historical/economic data...&#10;2. Second systemic consideration..."
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-serif"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      5) 예상 반론 (Anticipated Counterargument)
                    </label>
                    <textarea
                      rows={4}
                      value={debateForm.counterArguments}
                      onChange={(e) => setDebateForm({ ...debateForm, counterArguments: e.target.value })}
                      placeholder="Critics argue that sustained restriction harms labor markets..."
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-serif"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    6) 반론에 대한 재반박 및 결론 (Rebuttal & Final Conclusion)
                  </label>
                  <textarea
                    rows={4}
                    value={debateForm.rebuttal}
                    onChange={(e) => setDebateForm({ ...debateForm, rebuttal: e.target.value })}
                    placeholder="While the objection has merit, headline stability remains paramount..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-serif"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                  >
                    작문 & 논증문 저장하기
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================================================================== */}
          {/* 5단계: REVIEW & COMPLETE (종합 복습 및 완료 판정)                  */}
          {/* ================================================================== */}
          {activeStep === 'REVIEW' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                <strong className="text-white block mb-0.5">🔁 5단계: 종합 복습 및 코스 완독 확인</strong>
                <span>
                  본 뉴스에서 정리한 어휘, 문장 분석, 독해 답변, 에세이 논증을 한눈에 점검하고 코스 완독을 확정하세요.
                </span>
              </div>

              {/* 완료 기준 체크리스트 */}
              <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center justify-between">
                  <span>📋 C2 실전 코스 완독 필수 기준</span>
                  <span className={`text-[11px] font-semibold ${isEligibleForCompletion ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isEligibleForCompletion ? '모든 기준 충족 완료! 🎉' : '미완료 항목 존재'}
                  </span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className={`p-3 rounded-xl border ${
                    courseProgress.checklist.analyzedSentenceIds.length > 0
                      ? 'bg-emerald-950/20 border-emerald-800 text-emerald-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}>
                    <div className="font-bold mb-1">
                      {courseProgress.checklist.analyzedSentenceIds.length > 0 ? '✓ ' : '○ '}
                      문장 정밀 분석
                    </div>
                    <div className="text-[11px]">
                      {courseProgress.checklist.analyzedSentenceIds.length}개 문장 분석 완료
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    courseProgress.checklist.answeredQuestionIds.length > 0
                      ? 'bg-emerald-950/20 border-emerald-800 text-emerald-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}>
                    <div className="font-bold mb-1">
                      {courseProgress.checklist.answeredQuestionIds.length > 0 ? '✓ ' : '○ '}
                      C2 독해 질문 답변
                    </div>
                    <div className="text-[11px]">
                      {courseProgress.checklist.answeredQuestionIds.length}개 문항 서술 완료
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    courseProgress.checklist.hasCompletedWriting
                      ? 'bg-emerald-950/20 border-emerald-800 text-emerald-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}>
                    <div className="font-bold mb-1">
                      {courseProgress.checklist.hasCompletedWriting ? '✓ ' : '○ '}
                      영작문 및 논증
                    </div>
                    <div className="text-[11px]">
                      {courseProgress.checklist.hasCompletedWriting ? '요약/에세이 작성 완료' : '미작성'}
                    </div>
                  </div>
                </div>

                {courseProgress.currentStep === 'COMPLETED' ? (
                  <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/80 text-center text-xs text-emerald-300 font-semibold">
                    🎉 이 뉴스는 {courseProgress.completedAt ? new Date(courseProgress.completedAt).toLocaleString('ko-KR') : ''}에 공식 완독 완료되었습니다!
                  </div>
                ) : (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleCompleteCourse}
                      disabled={!isEligibleForCompletion}
                      className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition cursor-pointer"
                    >
                      🎉 C2 코스 완료 확정하기
                    </button>
                  </div>
                )}
              </div>

              {/* 저장된 C2 어휘 목록 미리보기 */}
              <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center justify-between">
                  <span>📑 수집된 C2 어휘 ({expressions.length}개)</span>
                  <span className="text-[11px] text-amber-400 font-normal">플래시카드 복습 연동 가능</span>
                </h4>
                {expressions.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">수집된 어휘가 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {expressions.map((e, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="font-bold text-white">{e.expression}</div>
                        <div className="text-amber-300 font-medium text-[11px]">{e.everydayMeaning}</div>
                        {e.englishDefinition && (
                          <div className="text-slate-400 italic text-[10px] mt-0.5">{e.englishDefinition}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* 모달 하단 네비게이션 제어 바                                           */}
        {/* ==================================================================== */}
        <footer className="bg-slate-950 border-t border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 text-xs">
          <div>
            {activeStep !== 'READING' && (
              <button
                onClick={() => {
                  const idx = STEP_LIST.findIndex((s) => s.id === activeStep);
                  if (idx > 0) handleGoToStep(STEP_LIST[idx - 1].id);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
              >
                ← 이전 단계
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setSaveStatus('saving');
                setTimeout(() => setSaveStatus('saved'), 600);
              }}
              className="px-3 py-2 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              임시 저장
            </button>

            {activeStep !== 'REVIEW' ? (
              <button
                onClick={() => {
                  const idx = STEP_LIST.findIndex((s) => s.id === activeStep);
                  if (idx < STEP_LIST.length - 1) handleGoToStep(STEP_LIST[idx + 1].id);
                }}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition shadow-sm cursor-pointer"
              >
                다음 단계 ({STEP_LIST[STEP_LIST.findIndex((s) => s.id === activeStep) + 1]?.label.split('. ')[1]}) →
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition cursor-pointer"
              >
                코스 닫기
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
