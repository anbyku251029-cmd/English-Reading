/**
 * Booky STEP 09: CNN 뉴스 C2 상세 학습 스튜디오 (CnnNewsReaderView.tsx)
 * 
 * - 6대 학습 탭:
 *   1. 📖 원문 및 문단 읽기 (Web Speech API 낭독 + 문단 메모)
 *   2. 🔍 고급 문장 분석 (9개 C2 정밀 분석 항목)
 *   3. ❓ C2 8대 독해 질문 & 답변
 *   4. 📑 C2 고급 어휘 노트 (품사, 영영정의, 유의어, 격식도)
 *   5. ✍️ C2 작문 및 토론 연습 (에세이, 찬반논거, 재반박)
 *   6. 📊 기사 학습 통계
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CnnNewsArticle,
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
  deleteSentenceAnalysis,
  updateQuestionAnswer,
  updateWritingOutput,
  updateDebateOutput,
  saveNewsExpression,
  loadNewsExpressions,
  splitIntoSentences,
} from '../../utils/cnnNewsStorage';
import { audioManager } from '../../utils/audio';
import { CnnNewsGuidedCourseModal } from './CnnNewsGuidedCourseModal';

interface CnnNewsReaderViewProps {
  articleId: string;
  onBackToList: () => void;
}

type ReaderTab = 'reading' | 'sentence' | 'questions' | 'vocab' | 'writing' | 'stats';

export const CnnNewsReaderView: React.FC<CnnNewsReaderViewProps> = ({
  articleId,
  onBackToList,
}) => {
  const [article, setArticle] = useState<CnnNewsArticle | null>(null);
  const [activeTab, setActiveTab] = useState<ReaderTab>('reading');
  const [fontSize, setFontSize] = useState<number>(16);
  const [isGuidedModalOpen, setIsGuidedModalOpen] = useState(false);

  // 음성 재생 상태
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingParagraphIndex, setPlayingParagraphIndex] = useState<number | null>(null);

  // 문단 메모 상태
  const [editingParagraphIdx, setEditingParagraphIdx] = useState<number | null>(null);
  const [paragraphNoteText, setParagraphNoteText] = useState<string>('');

  // 문장 분석 상태
  const [selectedSentence, setSelectedSentence] = useState<string>('');
  const [selectedSentenceParagraphIdx, setSelectedSentenceParagraphIdx] = useState<number>(0);
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

  // 어휘 추가 상태
  const [newsExpressions, setNewsExpressions] = useState<KeyExpression[]>([]);
  const [isAddingVocab, setIsAddingVocab] = useState(false);
  const [vocabForm, setVocabForm] = useState({
    expression: '',
    partOfSpeech: '',
    inContext: '',
    everydayMeaning: '',
    englishDefinition: '',
    synonymsAntonyms: '',
    formalityLevel: 'journalistic' as const,
    usageContext: '',
    userNote: '',
  });

  // 작문/토론 상태
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

  const [saveToast, setSaveToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const refreshArticle = () => {
    const data = getNewsArticleById(articleId);
    if (data) {
      setArticle(data);
      setNewsExpressions(loadNewsExpressions(articleId));
      if (data.writingOutput) setWritingForm(data.writingOutput);
      if (data.debateOutput) setDebateForm(data.debateOutput);
    }
  };

  useEffect(() => {
    refreshArticle();
  }, [articleId]);

  // 기사의 모든 문장 목록 (중복 제거)
  const allSentences = useMemo(() => {
    if (!article) return [];
    const list: { sentence: string; paragraphIndex: number }[] = [];
    article.paragraphs.forEach((p, pIdx) => {
      const sentences = splitIntoSentences(p);
      sentences.forEach((s) => {
        if (s.length > 10) {
          list.push({ sentence: s, paragraphIndex: pIdx });
        }
      });
    });
    return list;
  }, [article]);

  if (!article) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 text-slate-400 text-xs">
        기사 데이터를 찾을 수 없습니다.{' '}
        <button onClick={onBackToList} className="ml-2 text-red-400 underline">
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  // 1. 학습 상태 토글
  const handleStatusChange = (newStatus: 'not_started' | 'in_progress' | 'completed') => {
    const updated = { ...article, status: newStatus };
    updateNewsArticle(updated);
    setArticle(updated);
    showToast(`학습 상태가 [${newStatus === 'completed' ? '완독 완료' : newStatus === 'in_progress' ? '학습 중' : '학습 전'}]로 변경되었습니다.`);
  };

  // 2. Web Speech API 음성 재생
  const handlePlayParagraph = (index: number) => {
    if (isPlayingAudio && playingParagraphIndex === index) {
      audioManager.stop();
      setIsPlayingAudio(false);
      setPlayingParagraphIndex(null);
      return;
    }

    const text = article.paragraphs[index];
    if (!text) return;

    audioManager.stop();
    setIsPlayingAudio(true);
    setPlayingParagraphIndex(index);

    audioManager.speak(text, undefined, 0.9).finally(() => {
      setIsPlayingAudio(false);
      setPlayingParagraphIndex(null);
    });
  };

  // 3. 문단 메모 저장
  const handleSaveParagraphNote = (idx: number) => {
    updateParagraphNote(article.id, idx, paragraphNoteText);
    refreshArticle();
    setEditingParagraphIdx(null);
    setParagraphNoteText('');
    showToast(`¶${idx + 1} 문단 메모가 저장되었습니다.`);
  };

  // 4. 문장 선택 및 분석 폼 세팅
  const handleSelectSentenceForAnalysis = (sent: string, pIdx: number) => {
    setSelectedSentence(sent);
    setSelectedSentenceParagraphIdx(pIdx);

    const existingId = `sent-${pIdx}-${sent.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`;
    const existing = article.sentenceAnalyses?.[existingId];

    if (existing) {
      setSentenceForm({
        sentence: existing.sentence,
        paragraphIndex: existing.paragraphIndex,
        sentenceStructure: existing.sentenceStructure,
        keyGrammar: existing.keyGrammar,
        logicalConnectors: existing.logicalConnectors,
        referents: existing.referents,
        implicitMeaning: existing.implicitMeaning,
        toneAndAttitude: existing.toneAndAttitude,
        koreanTranslation: existing.koreanTranslation,
        questions: existing.questions,
      });
    } else {
      setSentenceForm({
        sentence: sent,
        paragraphIndex: pIdx,
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

    setActiveTab('sentence');
  };

  // 문장 분석 저장
  const handleSaveSentenceAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentenceForm.sentence.trim()) return;

    const sentId = `sent-${sentenceForm.paragraphIndex}-${sentenceForm.sentence.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`;
    const analysisItem: SentenceAnalysisItem = {
      id: sentId,
      ...sentenceForm,
      updatedAt: new Date().toISOString(),
    };

    updateSentenceAnalysis(article.id, analysisItem);
    refreshArticle();
    showToast('문장 정밀 분석이 저장되었습니다.');
  };

  // 5. C2 질문 답변 저장
  const handleSaveQuestionAnswer = (qId: string, answer: string, explanation?: string) => {
    updateQuestionAnswer(article.id, qId, answer, explanation);
    refreshArticle();
    showToast('독해 답변이 저장되었습니다.');
  };

  // 6. C2 어휘 저장
  const handleSaveVocab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vocabForm.expression.trim()) return;

    saveNewsExpression({
      expression: vocabForm.expression,
      partOfSpeech: vocabForm.partOfSpeech,
      inContext: vocabForm.inContext,
      everydayMeaning: vocabForm.everydayMeaning,
      englishDefinition: vocabForm.englishDefinition,
      synonymsAntonyms: vocabForm.synonymsAntonyms,
      formalityLevel: vocabForm.formalityLevel,
      usageContext: vocabForm.usageContext,
      userNote: vocabForm.userNote,
      newsId: article.id,
      newsTitle: article.title,
    });

    refreshArticle();
    setIsAddingVocab(false);
    setVocabForm({
      expression: '',
      partOfSpeech: '',
      inContext: '',
      everydayMeaning: '',
      englishDefinition: '',
      synonymsAntonyms: '',
      formalityLevel: 'journalistic',
      usageContext: '',
      userNote: '',
    });
    showToast('C2 어휘 표현이 저장되었습니다.');
  };

  // 7. 작문/토론 저장
  const handleSaveWriting = (e: React.FormEvent) => {
    e.preventDefault();
    updateWritingOutput(article.id, writingForm);
    refreshArticle();
    showToast('C2 작문 에세이가 저장되었습니다.');
  };

  const handleSaveDebate = (e: React.FormEvent) => {
    e.preventDefault();
    updateDebateOutput(article.id, debateForm);
    refreshArticle();
    showToast('C2 토론 논거가 저장되었습니다.');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 text-slate-100">
      {/* 1. 최상단 헤더 네비게이션 */}
      <header className="bg-slate-950 border-b border-red-950 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToList}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <span>←</span>
            <span>뉴스 목록</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-900/80">
                {article.topic}
              </span>
              <span className="text-xs text-slate-400">
                {article.source} • {article.articleDate}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-md sm:max-w-xl">
              {article.title}
            </h2>
          </div>
        </div>

        {/* Guided C2 Study & 상태 변경 및 글꼴 조절 */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            type="button"
            onClick={() => setIsGuidedModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
            title="5단계 실전 C2 학습 코스 시작"
          >
            <span>🎯</span>
            <span className="hidden sm:inline">Guided C2 Study (단계별 학습)</span>
            <span className="sm:hidden">단계별 학습</span>
          </button>
          {/* 상태 드롭다운 */}
          <select
            value={article.status}
            onChange={(e) => handleStatusChange(e.target.value as any)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
              article.status === 'completed'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : article.status === 'in_progress'
                ? 'bg-amber-950 text-amber-300 border-amber-800'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <option value="not_started">학습 전</option>
            <option value="in_progress">학습 중</option>
            <option value="completed">완독 완료 🎉</option>
          </select>

          {/* 폰트 크기 */}
          <div className="hidden sm:flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400">가</span>
            <button
              onClick={() => setFontSize((f) => Math.max(13, f - 1))}
              className="px-1 text-xs text-slate-300 hover:text-white"
            >
              -
            </button>
            <span className="text-[10px] text-slate-300 font-mono">{fontSize}</span>
            <button
              onClick={() => setFontSize((f) => Math.min(24, f + 1))}
              className="px-1 text-xs text-slate-300 hover:text-white"
            >
              +
            </button>
          </div>
        </div>
      </header>

      {/* 2. 탭 네비게이션 바 */}
      <nav className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 flex space-x-2 overflow-x-auto scrollbar-none text-xs font-semibold shrink-0">
        <button
          onClick={() => setActiveTab('reading')}
          className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'reading'
              ? 'border-red-500 text-red-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📖 원문 독해 & 문단 메모</span>
        </button>

        <button
          onClick={() => setActiveTab('sentence')}
          className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'sentence'
              ? 'border-red-500 text-red-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🔍 고급 문장 분석</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-950 text-red-400">
            {Object.keys(article.sentenceAnalyses || {}).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'questions'
              ? 'border-red-500 text-red-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>❓ C2 8대 독해 질문</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {(article.readingQuestions || []).filter((q) => q.userAnswer?.trim()).length}/8
          </span>
        </button>

        <button
          onClick={() => setActiveTab('vocab')}
          className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'vocab'
              ? 'border-red-500 text-red-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📑 C2 고급 어휘 노트</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950 text-amber-400">
            {newsExpressions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('writing')}
          className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'writing'
              ? 'border-red-500 text-red-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>✍️ C2 작문 & 토론</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`py-3 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'stats'
              ? 'border-red-500 text-red-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📊 학습 통계</span>
        </button>
      </nav>

      {/* 토스트 메시지 */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xl animate-in fade-in">
          ✓ {saveToast}
        </div>
      )}

      {/* 3. 본문 탭 콘텐츠 */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
        {/* ==================================================================== */}
        {/* TAB 1: 원문 및 문단 읽기 (Reading & Paragraph Notes)                */}
        {/* ==================================================================== */}
        {activeTab === 'reading' && (
          <div className="space-y-6">
            {/* 한국어 요약 안내 카드 */}
            {article.koreanSummary && (
              <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4 text-xs leading-relaxed text-red-200/90 font-sans">
                <strong className="text-red-400 block mb-1">📌 기사 핵심 배경 요약:</strong>
                {article.koreanSummary}
              </div>
            )}

            <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
              <span>💡 문장을 클릭하면 <strong>[고급 문장 분석]</strong>으로 바로 이동합니다.</span>
              <span className="text-[11px] text-slate-500">총 {article.paragraphs.length}개 문단</span>
            </div>

            {/* 문단 리스트 */}
            <div className="space-y-6 font-serif">
              {article.paragraphs.map((paragraphText, pIdx) => {
                const sentences = splitIntoSentences(paragraphText);
                const hasNote = !!article.userNotes?.[pIdx];
                const isPlayingThis = isPlayingAudio && playingParagraphIndex === pIdx;

                return (
                  <article
                    key={pIdx}
                    className={`p-5 rounded-2xl border transition-all duration-200 ${
                      isPlayingThis
                        ? 'bg-red-950/30 border-red-500/80 shadow-md'
                        : 'bg-slate-800/60 border-slate-700/70 hover:border-slate-600'
                    }`}
                  >
                    {/* 문단 헤더 (문단 번호 & 오디오 & 메모 버튼) */}
                    <div className="flex items-center justify-between text-xs mb-3 font-sans border-b border-slate-700/50 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-red-500">¶ {pIdx + 1}</span>
                        <button
                          onClick={() => handlePlayParagraph(pIdx)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition flex items-center space-x-1 ${
                            isPlayingThis
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                          }`}
                        >
                          <span>{isPlayingThis ? '⏹ 정지' : '🔊 문단 낭독'}</span>
                        </button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingParagraphIdx(editingParagraphIdx === pIdx ? null : pIdx);
                            setParagraphNoteText(article.userNotes?.[pIdx] || '');
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                            hasNote
                              ? 'bg-amber-950 text-amber-300 border border-amber-800/80'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                          }`}
                        >
                          {hasNote ? '📝 문단 메모 보기/수정' : '+ 문단 메모'}
                        </button>
                      </div>
                    </div>

                    {/* 문단 텍스트 (문장별 클릭 상호작용) */}
                    <div
                      style={{ fontSize: `${fontSize}px` }}
                      className="leading-relaxed text-slate-200 font-serif tracking-normal selection:bg-red-600 selection:text-white"
                    >
                      {sentences.map((sent, sIdx) => {
                        const sentId = `sent-${pIdx}-${sent.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`;
                        const isAnalyzed = !!article.sentenceAnalyses?.[sentId];

                        return (
                          <span
                            key={sIdx}
                            onClick={() => handleSelectSentenceForAnalysis(sent, pIdx)}
                            className={`inline cursor-pointer rounded px-0.5 transition-colors ${
                              isAnalyzed
                                ? 'bg-red-950/60 border-b border-red-500 text-white font-medium hover:bg-red-900/60'
                                : 'hover:bg-slate-700/60'
                            }`}
                            title="클릭하여 C2 정밀 문장 분석 스튜디오로 이동"
                          >
                            {sent}{' '}
                          </span>
                        );
                      })}
                    </div>

                    {/* 문단 메모 표시 및 편집창 */}
                    {(editingParagraphIdx === pIdx || hasNote) && (
                      <div className="mt-4 pt-3 border-t border-slate-700/60 font-sans text-xs">
                        {editingParagraphIdx === pIdx ? (
                          <div className="space-y-2 bg-slate-900 p-3 rounded-xl border border-amber-800/60">
                            <label className="block text-[11px] font-semibold text-amber-400">
                              ¶{pIdx + 1} 문단 메모 및 독해 요약
                            </label>
                            <textarea
                              rows={3}
                              value={paragraphNoteText}
                              onChange={(e) => setParagraphNoteText(e.target.value)}
                              placeholder="이 문단의 핵심 논지나 모르는 구조, 단어 메모를 자유롭게 적어두세요..."
                              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                            />
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => setEditingParagraphIdx(null)}
                                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                              >
                                닫기
                              </button>
                              <button
                                onClick={() => handleSaveParagraphNote(pIdx)}
                                className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs"
                              >
                                저장
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 text-amber-200/90 text-xs flex justify-between items-start">
                            <div className="space-y-1">
                              <span className="font-bold text-amber-400 text-[10px] uppercase tracking-wider block">
                                📌 ¶{pIdx + 1} 문단 메모:
                              </span>
                              <p className="whitespace-pre-wrap">{article.userNotes[pIdx]}</p>
                            </div>
                            <button
                              onClick={() => {
                                setEditingParagraphIdx(pIdx);
                                setParagraphNoteText(article.userNotes[pIdx]);
                              }}
                              className="text-[11px] text-amber-400 hover:underline shrink-0 ml-3"
                            >
                              수정
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: 고급 문장 분석 (C2 Sentence Dissection)                      */}
        {/* ==================================================================== */}
        {activeTab === 'sentence' && (
          <div className="space-y-6">
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-xs text-slate-300">
              <strong className="text-white block mb-1">🔍 C2 고급 문장 정밀 분석 스튜디오:</strong>
              원문 문장을 선택하고, 통사 구조(Syntax), 함축 의미(Subtext), 수사적 전략, 논리 접속 관계를 직접 분석하여 저장하세요.
            </div>

            {/* 문장 선택기 */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                분석할 문장 선택 ({allSentences.length}개 문장 중 선택):
              </label>
              <select
                value={sentenceForm.sentence}
                onChange={(e) => {
                  const target = allSentences.find((s) => s.sentence === e.target.value);
                  if (target) {
                    handleSelectSentenceForAnalysis(target.sentence, target.paragraphIndex);
                  }
                }}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-serif"
              >
                <option value="">-- 분석할 문장을 선택하세요 --</option>
                {allSentences.map((s, idx) => (
                  <option key={idx} value={s.sentence}>
                    [¶{s.paragraphIndex + 1}] {s.sentence.slice(0, 100)}...
                  </option>
                ))}
              </select>
            </div>

            {/* 문장 분석 폼 (9대 분석 항목) */}
            {sentenceForm.sentence && (
              <form onSubmit={handleSaveSentenceAnalysis} className="bg-slate-800 p-6 rounded-2xl border border-red-900/50 space-y-5">
                {/* 1. 원문 문장 표시 */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-red-400 block mb-1 uppercase tracking-wider">
                    TARGET SENTENCE (¶{sentenceForm.paragraphIndex + 1})
                  </span>
                  <p className="text-base font-serif text-white leading-relaxed">
                    "{sentenceForm.sentence}"
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 2. 문장 구조 메모 */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      1) 문장 구조 메모 (주어·본동사, 도치, 복문 구조)
                    </label>
                    <textarea
                      rows={2}
                      value={sentenceForm.sentenceStructure}
                      onChange={(e) => setSentenceForm({ ...sentenceForm, sentenceStructure: e.target.value })}
                      placeholder="예: 주어(Not only does...) 도치 구문, 본동사 확인, 삽입절 분리"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>

                  {/* 3. 핵심 문법 */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      2) 핵심 문법 (분사구문, 가정법, 복합관계사)
                    </label>
                    <textarea
                      rows={2}
                      value={sentenceForm.keyGrammar}
                      onChange={(e) => setSentenceForm({ ...sentenceForm, keyGrammar: e.target.value })}
                      placeholder="예: 완료분사구문(Having surveyed...), 가정법 과거완료 귀결절"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>

                  {/* 4. 접속 표현과 논리 관계 */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      3) 접속 표현 및 논리 관계 (대조, 양보, 인과)
                    </label>
                    <textarea
                      rows={2}
                      value={sentenceForm.logicalConnectors}
                      onChange={(e) => setSentenceForm({ ...sentenceForm, logicalConnectors: e.target.value })}
                      placeholder="예: Notwithstanding the surge (양보) -> 이전 단락의 낙관론을 반박"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>

                  {/* 5. 지시어가 가리키는 내용 */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      4) 지시어가 가리키는 내용 (Referents)
                    </label>
                    <textarea
                      rows={2}
                      value={sentenceForm.referents}
                      onChange={(e) => setSentenceForm({ ...sentenceForm, referents: e.target.value })}
                      placeholder="예: 'this predicament' -> 앞 문장의 금리 인상과 경기 둔화의 이중고"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>

                  {/* 6. 생략 및 함축된 의미 */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      5) 생략 및 행간의 함축 의미 (Subtext/Implication)
                    </label>
                    <textarea
                      rows={2}
                      value={sentenceForm.implicitMeaning}
                      onChange={(e) => setSentenceForm({ ...sentenceForm, implicitMeaning: e.target.value })}
                      placeholder="예: 공식 성명에는 없으나 정책 입안자들의 무력감을 암시"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>

                  {/* 7. 어조와 필자의 태도 */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      6) 문장의 어조와 필자의 태도 (Tone & Attitude)
                    </label>
                    <textarea
                      rows={2}
                      value={sentenceForm.toneAndAttitude}
                      onChange={(e) => setSentenceForm({ ...sentenceForm, toneAndAttitude: e.target.value })}
                      placeholder="예: 회의적(Skeptical), 경고성(Admonitory), 냉정한 객관성"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                {/* 8. 한국어 정밀 직독직해 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    7) 한국어 정밀 해석 (문맥을 살린 직독직해)
                  </label>
                  <textarea
                    rows={2}
                    value={sentenceForm.koreanTranslation}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, koreanTranslation: e.target.value })}
                    placeholder="문장의 정확한 뉘앙스를 반영하여 한국어로 해석하세요..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                  />
                </div>

                {/* 9. 추가 질문 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    8) 추가 의문점 및 학습 질문
                  </label>
                  <input
                    type="text"
                    value={sentenceForm.questions}
                    onChange={(e) => setSentenceForm({ ...sentenceForm, questions: e.target.value })}
                    placeholder="예: 여기서 분사구문 대신 관계절을 썼다면 강조점이 어떻게 바뀌었을까?"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                  >
                    이 문장 분석 저장하기
                  </button>
                </div>
              </form>
            )}

            {/* 분석 완료된 문장 카드 리스트 */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>📚 분석 완료된 문장 목록</span>
                <span className="text-xs text-red-400 font-normal">
                  ({Object.keys(article.sentenceAnalyses || {}).length}개 완료)
                </span>
              </h3>

              {Object.keys(article.sentenceAnalyses || {}).length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  아직 분석된 문장이 없습니다. 위 선택기에서 문장을 골라 첫 분석을 작성해보세요!
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.values(article.sentenceAnalyses).map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl text-xs space-y-2 hover:border-red-500/60 transition"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-red-400 font-mono">
                          ¶{item.paragraphIndex + 1}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSentenceForm({ ...item });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="text-[11px] text-slate-400 hover:text-white"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('이 문장 분석을 삭제하시겠습니까?')) {
                                deleteSentenceAnalysis(article.id, item.id);
                                refreshArticle();
                              }
                            }}
                            className="text-[11px] text-rose-400 hover:text-rose-300"
                          >
                            삭제
                          </button>
                        </div>
                      </div>

                      <p className="font-serif text-white font-medium">"{item.sentence}"</p>

                      {item.koreanTranslation && (
                        <p className="text-slate-300 text-[11px] bg-slate-900/60 p-2 rounded">
                          <strong>해석:</strong> {item.koreanTranslation}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                        {item.sentenceStructure && (
                          <div>
                            <span className="text-slate-500">구조:</span> {item.sentenceStructure}
                          </div>
                        )}
                        {item.toneAndAttitude && (
                          <div>
                            <span className="text-slate-500">어조:</span> {item.toneAndAttitude}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: C2 독해 질문 (Critical Reading Q&A)                           */}
        {/* ==================================================================== */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-xs text-slate-300 leading-relaxed">
              <strong className="text-white block mb-1">❓ C2 8대 심층 독해 가이드 (Critical Reading Questions):</strong>
              단순 사실 확인이 아닌, 논증의 타당성·수사적 전략·행간의 암시를 파악하는 최고급 독해 훈련입니다. 각 질문에 대해 본인의 답변과 해설을 기록하세요.
            </div>

            <div className="space-y-5">
              {(article.readingQuestions || []).map((q, idx) => (
                <div key={q.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                    <h4 className="text-xs font-bold text-red-400">{q.questionLabel}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      q.userAnswer?.trim() ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {q.userAnswer?.trim() ? '답변 완료' : '미작성'}
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
                        const newAnswer = e.target.value;
                        setArticle({
                          ...article,
                          readingQuestions: article.readingQuestions.map((item) =>
                            item.id === q.id ? { ...item, userAnswer: newAnswer } : item
                          ),
                        });
                      }}
                      onBlur={(e) => handleSaveQuestionAnswer(q.id, e.target.value, q.userExplanation)}
                      placeholder="기사의 근거와 본인의 논리를 담아 답변을 작성하세요..."
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      모범 해설 및 심층 근거 (Explanation / Evidence):
                    </label>
                    <textarea
                      rows={2}
                      value={q.userExplanation || ''}
                      onChange={(e) => {
                        const newExp = e.target.value;
                        setArticle({
                          ...article,
                          readingQuestions: article.readingQuestions.map((item) =>
                            item.id === q.id ? { ...item, userExplanation: newExp } : item
                          ),
                        });
                      }}
                      onBlur={(e) => handleSaveQuestionAnswer(q.id, q.userAnswer, e.target.value)}
                      placeholder="관련 인용문이나 모범 논리를 메모해 두세요..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-300 focus:outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleSaveQuestionAnswer(q.id, q.userAnswer, q.userExplanation)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg transition"
                    >
                      답변 저장
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: C2 고급 어휘 노트 (Vocabulary Notes)                         */}
        {/* ==================================================================== */}
        {activeTab === 'vocab' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">C2 고급 어휘 및 표현 노트</h3>
                <p className="text-xs text-slate-400">
                  CNN 기사에서 수집한 시사·학술 어휘를 품사, 영영 정의, 격식 수준과 함께 체계적으로 관리하세요.
                </p>
              </div>
              <button
                onClick={() => setIsAddingVocab(!isAddingVocab)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                {isAddingVocab ? '취소' : '➕ 새 표현 저장'}
              </button>
            </div>

            {/* 신규 어휘 등록 폼 */}
            {isAddingVocab && (
              <form onSubmit={handleSaveVocab} className="bg-slate-800 p-5 rounded-2xl border border-red-900/60 space-y-4">
                <h4 className="text-xs font-bold text-red-400">새 C2 어휘 등록</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      영어 단어/표현 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vocabForm.expression}
                      onChange={(e) => setVocabForm({ ...vocabForm, expression: e.target.value })}
                      placeholder="예: watershed moment, visceral, intransigent"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">품사 (Part of Speech)</label>
                    <input
                      type="text"
                      value={vocabForm.partOfSpeech}
                      onChange={(e) => setVocabForm({ ...vocabForm, partOfSpeech: e.target.value })}
                      placeholder="예: adj, noun phrase, transitive verb"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">문맥 속 원문 문장</label>
                  <textarea
                    rows={2}
                    value={vocabForm.inContext}
                    onChange={(e) => setVocabForm({ ...vocabForm, inContext: e.target.value })}
                    placeholder="기사에서 사용된 실제 전체 문장을 입력하세요..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-serif"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">한국어 의미 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={vocabForm.everydayMeaning}
                      onChange={(e) => setVocabForm({ ...vocabForm, everydayMeaning: e.target.value })}
                      placeholder="예: 분수령, 결정적 전환점"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">격식 수준 (Formality)</label>
                    <select
                      value={vocabForm.formalityLevel}
                      onChange={(e) => setVocabForm({ ...vocabForm, formalityLevel: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                    >
                      <option value="journalistic">Journalistic (시사·언론)</option>
                      <option value="academic">Academic (학술·논문)</option>
                      <option value="formal">Formal (격식)</option>
                      <option value="informal">Informal (구어체)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">영영 정의 (English Definition)</label>
                    <input
                      type="text"
                      value={vocabForm.englishDefinition}
                      onChange={(e) => setVocabForm({ ...vocabForm, englishDefinition: e.target.value })}
                      placeholder="An event marking a unique or important turning point"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">유의어 / 반의어</label>
                    <input
                      type="text"
                      value={vocabForm.synonymsAntonyms}
                      onChange={(e) => setVocabForm({ ...vocabForm, synonymsAntonyms: e.target.value })}
                      placeholder="Syn: turning point, milestone / Ant: stagnation"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingVocab(false)}
                    className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-xs"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-semibold text-xs"
                  >
                    어휘 노트에 저장
                  </button>
                </div>
              </form>
            )}

            {/* 어휘 목록 그리드 */}
            {newsExpressions.length === 0 ? (
              <div className="bg-slate-800/40 p-8 rounded-2xl border border-slate-700/60 text-center text-xs text-slate-400">
                아직 이 기사에서 저장된 표현이 없습니다. 상단의 <strong>[➕ 새 표현 저장]</strong> 버튼으로 첫 표현을 등록해보세요.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {newsExpressions.map((item, idx) => (
                  <div key={idx} className="bg-slate-800 border border-slate-700 p-4 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-base font-bold text-white mr-2">{item.expression}</span>
                        {item.partOfSpeech && (
                          <span className="text-[10px] text-slate-400 font-mono italic">({item.partOfSpeech})</span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-red-950 text-red-300 border border-red-900/60">
                        {item.formalityLevel || 'journalistic'}
                      </span>
                    </div>

                    <p className="font-semibold text-amber-300">{item.everydayMeaning}</p>

                    {item.englishDefinition && (
                      <p className="text-[11px] text-slate-300 italic">Def: {item.englishDefinition}</p>
                    )}

                    {item.inContext && (
                      <p className="text-[11px] text-slate-400 font-serif bg-slate-900 p-2 rounded leading-relaxed">
                        "{item.inContext}"
                      </p>
                    )}

                    {item.synonymsAntonyms && (
                      <p className="text-[10px] text-slate-500">{item.synonymsAntonyms}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 5: C2 작문 및 토론 (Writing & Debate)                            */}
        {/* ==================================================================== */}
        {activeTab === 'writing' && (
          <div className="space-y-8">
            {/* 1. 작문 섹션 */}
            <form onSubmit={handleSaveWriting} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
              <div className="border-b border-slate-700 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-white">✍️ C2 고급 영작문 스튜디오</h3>
                  <p className="text-xs text-slate-400">기사 핵심 요약과 근거 기반 비판적 의견문(Opinion Essay)을 작성하세요.</p>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  작문 저장하기
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  1) 뉴스 핵심 요약 (Executive Summary, 3~5 sentences in English)
                </label>
                <textarea
                  rows={3}
                  value={writingForm.summary}
                  onChange={(e) => setWritingForm({ ...writingForm, summary: e.target.value })}
                  placeholder="Summarize the core conflict, key developments, and stakes..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-serif leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    2) 필자의 주장에 대한 나의 입장 (Stance)
                  </label>
                  <select
                    value={writingForm.stance}
                    onChange={(e) => setWritingForm({ ...writingForm, stance: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="agree">찬성 / 동의 (Agree)</option>
                    <option value="disagree">반대 / 비판 (Disagree)</option>
                    <option value="neutral">중립적 관망 (Neutral)</option>
                    <option value="nuanced">조건부 / 다각적 입장 (Nuanced)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    3) 한국어 개요 초안 (Korean Draft)
                  </label>
                  <input
                    type="text"
                    value={writingForm.koreanDraft}
                    onChange={(e) => setWritingForm({ ...writingForm, koreanDraft: e.target.value })}
                    placeholder="에세이 전개 논리를 한국어로 간단히 메모하세요"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  4) 의견문 본문 (Argumentative Opinion Essay)
                </label>
                <textarea
                  rows={6}
                  value={writingForm.opinionEssay}
                  onChange={(e) => setWritingForm({ ...writingForm, opinionEssay: e.target.value })}
                  placeholder="Draft your essay with premises, supporting evidence, and logical transitions..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-serif leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  5) 정책적 대안 및 해결책 (Alternative Proposals)
                </label>
                <textarea
                  rows={2}
                  value={writingForm.alternativeProposals}
                  onChange={(e) => setWritingForm({ ...writingForm, alternativeProposals: e.target.value })}
                  placeholder="Propose viable alternatives to resolve the dilemma highlighted in the article..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-serif"
                />
              </div>
            </form>

            {/* 2. 토론 섹션 */}
            <form onSubmit={handleSaveDebate} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
              <div className="border-b border-slate-700 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-white">🗣️ C2 토론 논증 프레임워크 (Debate Framework)</h3>
                  <p className="text-xs text-slate-400">양측의 찬반 논거와 반론, 재반박 논리를 체계화하세요.</p>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  토론 논증 저장하기
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  1) 핵심 쟁점 (Core Issue / Motion)
                </label>
                <input
                  type="text"
                  value={debateForm.coreIssue}
                  onChange={(e) => setDebateForm({ ...debateForm, coreIssue: e.target.value })}
                  placeholder="예: Should central banks prioritize inflation targets over economic growth?"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    2) 찬성 논거 (Arguments For)
                  </label>
                  <textarea
                    rows={4}
                    value={debateForm.argumentsFor}
                    onChange={(e) => setDebateForm({ ...debateForm, argumentsFor: e.target.value })}
                    placeholder="List strong supporting arguments with data and precedents..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-serif"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    3) 반대 논거 (Arguments Against)
                  </label>
                  <textarea
                    rows={4}
                    value={debateForm.argumentsAgainst}
                    onChange={(e) => setDebateForm({ ...debateForm, argumentsAgainst: e.target.value })}
                    placeholder="List potential risks, unintended consequences, and rebuttal points..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-serif"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    4) 예상 반론 (Anticipated Counterarguments)
                  </label>
                  <textarea
                    rows={3}
                    value={debateForm.counterArguments}
                    onChange={(e) => setDebateForm({ ...debateForm, counterArguments: e.target.value })}
                    placeholder="How would opponents attack our premise?"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-serif"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    5) 재반박 (Rebuttal / Synthesis)
                  </label>
                  <textarea
                    rows={3}
                    value={debateForm.rebuttal}
                    onChange={(e) => setDebateForm({ ...debateForm, rebuttal: e.target.value })}
                    placeholder="Refute the opponent's objections and reinforce the thesis..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-serif"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  6) 나의 최종 입장 (Final Conclusion / Standpoint)
                </label>
                <textarea
                  rows={2}
                  value={debateForm.finalPosition}
                  onChange={(e) => setDebateForm({ ...debateForm, finalPosition: e.target.value })}
                  placeholder="State your overarching synthesized conclusion..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-serif"
                />
              </div>
            </form>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 6: 학습 통계 (Study Stats)                                      */}
        {/* ==================================================================== */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
                <span>📊</span>
                <span>이 기사의 C2 학습 성취 현황</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                  <span className="text-2xl font-black text-white">{article.paragraphs.length}</span>
                  <span className="block text-xs text-slate-400 mt-1">총 문단 수</span>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                  <span className="text-2xl font-black text-red-400">
                    {Object.keys(article.sentenceAnalyses || {}).length}
                  </span>
                  <span className="block text-xs text-slate-400 mt-1">정밀 분석 문장</span>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                  <span className="text-2xl font-black text-indigo-400">
                    {(article.readingQuestions || []).filter((q) => q.userAnswer?.trim()).length} / 8
                  </span>
                  <span className="block text-xs text-slate-400 mt-1">C2 질문 답변</span>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                  <span className="text-2xl font-black text-amber-400">{newsExpressions.length}</span>
                  <span className="block text-xs text-slate-400 mt-1">저장된 C2 어휘</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-700/60 space-y-3 text-xs text-slate-300">
                <div className="flex justify-between items-center py-1">
                  <span>작문 요약 작성 여부:</span>
                  <span className={writingForm.summary ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    {writingForm.summary ? '✓ 작성 완료' : '미작성'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>비판적 의견문(Essay) 작성 여부:</span>
                  <span className={writingForm.opinionEssay ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    {writingForm.opinionEssay ? '✓ 작성 완료' : '미작성'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>토론 쟁점 및 찬반 논거 수립 여부:</span>
                  <span className={debateForm.coreIssue ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    {debateForm.coreIssue ? '✓ 수립 완료' : '미작성'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>최종 독서 상태:</span>
                  <span className="font-bold text-red-400 uppercase">
                    {article.status === 'completed' ? '완독 완료' : article.status === 'in_progress' ? '학습 중' : '학습 전'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Guided C2 Study 단계별 코스 모달 */}
      <CnnNewsGuidedCourseModal
        isOpen={isGuidedModalOpen}
        onClose={() => {
          setIsGuidedModalOpen(false);
          refreshArticle();
        }}
        articleId={article.id}
        onCourseCompleted={() => {
          refreshArticle();
        }}
      />
    </div>
  );
};
