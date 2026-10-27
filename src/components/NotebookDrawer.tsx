import React, { useState, useMemo } from 'react';
import {
  X,
  Bookmark,
  Volume2,
  Trash2,
  Copy,
  Check,
  Download,
  BookOpen,
  Search,
  Filter,
  RotateCcw,
  Sparkles,
  BarChart3,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Edit3,
  CheckCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { KeyExpression, DailyStudyLog, LearningStatsSummary } from '../types';
import { audioManager } from '../utils/audio';
import {
  loadSavedExpressions,
  recordExpressionReview,
  calculateLearningStats,
  exportExpressionsToMarkdown,
  saveExpressions,
} from '../utils/studyStorage';

interface NotebookDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedExpressions: KeyExpression[];
  onRemoveExpression: (expression: string) => void;
  onClearAll: () => void;
  onJumpToPassage?: (bookId?: number | string, chapterId?: number | string) => void;
  initialTab?: 'list' | 'review' | 'stats';
}

export const NotebookDrawer: React.FC<NotebookDrawerProps> = ({
  isOpen,
  onClose,
  savedExpressions,
  onRemoveExpression,
  onClearAll,
  onJumpToPassage,
  initialTab = 'list',
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'review' | 'stats'>(initialTab);

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookFilter, setSelectedBookFilter] = useState('ALL');

  // Flashcard Review State (Step 07-D)
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [userGuess, setUserGuess] = useState('');
  const [reviewComplete, setReviewComplete] = useState(false);

  // Edit Note State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMeaning, setEditMeaning] = useState('');
  const [editNote, setEditNote] = useState('');

  // Stats
  const stats: LearningStatsSummary = useMemo(() => {
    return calculateLearningStats();
  }, [isOpen, activeTab, savedExpressions]);

  if (!isOpen) return null;

  // Unique books for filter dropdown
  const uniqueBooks = Array.from(
    new Set(savedExpressions.map((e) => e.bookTitle).filter(Boolean))
  ) as string[];

  // Filtered expressions
  const filteredExpressions = savedExpressions.filter((e) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      e.expression.toLowerCase().includes(q) ||
      e.everydayMeaning.toLowerCase().includes(q) ||
      (e.userNote && e.userNote.toLowerCase().includes(q));

    const matchBook =
      selectedBookFilter === 'ALL' || !e.bookTitle || e.bookTitle === selectedBookFilter;

    return matchQuery && matchBook;
  });

  // Handle Review Answer
  const handleReviewAnswer = (result: 'remembered' | 'review_again' | 'hard') => {
    const currentExpr = filteredExpressions[reviewIndex];
    if (currentExpr && currentExpr.id) {
      recordExpressionReview(currentExpr.id, result);
    }
    setIsAnswerRevealed(false);
    setUserGuess('');

    if (reviewIndex + 1 < filteredExpressions.length) {
      setReviewIndex((prev) => prev + 1);
    } else {
      setReviewComplete(true);
    }
  };

  const handleStartReview = () => {
    setReviewIndex(0);
    setIsAnswerRevealed(false);
    setUserGuess('');
    setReviewComplete(false);
    setActiveTab('review');
  };

  // Handle Edit Save
  const handleStartEdit = (expr: KeyExpression) => {
    setEditingId(expr.id || expr.expression);
    setEditMeaning(expr.everydayMeaning || '');
    setEditNote(expr.userNote || '');
  };

  const handleSaveEdit = (expr: KeyExpression) => {
    const current = loadSavedExpressions();
    const updated = current.map((e) => {
      if ((e.id && e.id === expr.id) || e.expression === expr.expression) {
        return {
          ...e,
          everydayMeaning: editMeaning.trim() || e.everydayMeaning,
          userNote: editNote.trim(),
        };
      }
      return e;
    });
    saveExpressions(updated);
    setEditingId(null);
  };

  // Copy all
  const handleCopyAll = () => {
    if (savedExpressions.length === 0) return;
    const text = savedExpressions
      .map((e, i) => `${i + 1}. ${e.expression} — ${e.everydayMeaning}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download Markdown
  const handleDownloadMarkdown = () => {
    if (savedExpressions.length === 0) return;
    const md = exportExpressionsToMarkdown(savedExpressions);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Booky_StudyNotes_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentReviewCard = filteredExpressions[reviewIndex];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/60 to-white">
          <div className="flex items-center space-x-2">
            <Bookmark className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">학습 서랍 &amp; 복습 센터</h2>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              {savedExpressions.length}개
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-5 pt-2.5 pb-1 border-b border-slate-100 flex space-x-2 text-xs font-bold bg-slate-50/50">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-2 px-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'list'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>표현 노트 ({filteredExpressions.length})</span>
          </button>
          <button
            onClick={handleStartReview}
            className={`pb-2 px-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'review'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>플래시카드 복습</span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`pb-2 px-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'stats'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>학습 통계</span>
          </button>
        </div>

        {/* TAB 1: EXPRESSIONS LIST */}
        {activeTab === 'list' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search & Filter Toolbar */}
            <div className="p-3 bg-slate-50 border-b border-slate-100 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="표현, 뜻, 메모 검색..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {uniqueBooks.length > 0 && (
                  <select
                    value={selectedBookFilter}
                    onChange={(e) => setSelectedBookFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-700 max-w-[130px] truncate"
                  >
                    <option value="ALL">모든 도서</option>
                    {uniqueBooks.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyAll}
                    disabled={savedExpressions.length === 0}
                    className="flex items-center space-x-1 text-slate-600 hover:text-amber-800 font-semibold cursor-pointer disabled:opacity-40"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? '복사됨!' : '전체 복사'}</span>
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    disabled={savedExpressions.length === 0}
                    className="flex items-center space-x-1 text-slate-600 hover:text-amber-800 font-semibold cursor-pointer disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>.md 내보내기</span>
                  </button>
                </div>
                {savedExpressions.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="text-slate-400 hover:text-rose-600 transition cursor-pointer text-[11px]"
                  >
                    전체 삭제
                  </button>
                )}
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredExpressions.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">저장된 표현이 없습니다.</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    본문 읽기 화면에서 마음에 드는 문장을 선택한 뒤 <strong>'노트저장'</strong>을
                    누르면 여기에 보관됩니다!
                  </p>
                </div>
              ) : (
                filteredExpressions.map((e, idx) => {
                  const isEditing = editingId === (e.id || e.expression);

                  return (
                    <div
                      key={e.id || idx}
                      className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-amber-300 transition space-y-2 relative group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {e.expression}
                          </span>
                          <button
                            onClick={() => audioManager.speak(e.expression)}
                            className="text-slate-400 hover:text-amber-600 transition p-0.5"
                            title="발음 듣기"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            onClick={() => (isEditing ? handleSaveEdit(e) : handleStartEdit(e))}
                            className="text-slate-400 hover:text-amber-600 p-1"
                            title={isEditing ? '저장' : '메모 수정'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onRemoveExpression(e.expression)}
                            className="text-slate-300 hover:text-rose-500 p-1"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Meaning / Edit Area */}
                      {isEditing ? (
                        <div className="space-y-2 pt-1">
                          <input
                            type="text"
                            value={editMeaning}
                            onChange={(ev) => setEditMeaning(ev.target.value)}
                            placeholder="의미 수정..."
                            className="w-full px-2.5 py-1 text-xs border border-amber-300 rounded-lg focus:outline-none"
                          />
                          <input
                            type="text"
                            value={editNote}
                            onChange={(ev) => setEditNote(ev.target.value)}
                            placeholder="개인 메모 추가..."
                            className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(e)}
                            className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[11px] font-bold"
                          >
                            저장 완료
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs font-medium text-amber-950 bg-amber-50/70 p-2 rounded-xl">
                          💡 {e.everydayMeaning}
                        </p>
                      )}

                      {/* Origin & Note Badges */}
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 truncate">
                          {e.bookTitle && (
                            <span className="text-amber-800 font-semibold truncate">
                              📚 {e.bookTitle} {e.chapterTitle ? `(${e.chapterTitle})` : ''}
                            </span>
                          )}
                          {e.userNote && (
                            <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              메모: {e.userNote}
                            </span>
                          )}
                        </div>

                        {e.bookId && e.chapterId && onJumpToPassage && (
                          <button
                            type="button"
                            onClick={() => {
                              onJumpToPassage(e.bookId, e.chapterId);
                              onClose();
                            }}
                            className="text-amber-700 font-bold hover:underline shrink-0 text-[10px] flex items-center gap-0.5"
                          >
                            <span>원문 보기</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FLASHCARD REVIEW MODE (Step 07-D) */}
        {activeTab === 'review' && (
          <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
            {filteredExpressions.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-xs">
                복습할 저장된 표현이 없습니다. 표현 노트에 표현을 먼저 추가해 주세요.
              </div>
            ) : reviewComplete ? (
              <div className="text-center py-16 space-y-4 my-auto">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCheck className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900">오늘의 복습을 마쳤습니다! 🎉</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  총 {filteredExpressions.length}개 표현을 확인했습니다. 꾸준한 복습이 자연스러운 회화의
                  지름길입니다!
                </p>
                <button
                  type="button"
                  onClick={handleStartReview}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-amber-700 transition"
                >
                  처음부터 다시 복습
                </button>
              </div>
            ) : currentReviewCard ? (
              <div className="space-y-5 my-auto">
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500 font-semibold">
                    <span>
                      진행도: {reviewIndex + 1} / {filteredExpressions.length}
                    </span>
                    <span>
                      {Math.round(((reviewIndex + 1) / filteredExpressions.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{
                        width: `${((reviewIndex + 1) / filteredExpressions.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Flashcard */}
                <div className="bg-gradient-to-br from-amber-50/50 via-white to-orange-50/40 p-6 rounded-3xl border border-amber-200/80 shadow-md text-center space-y-4 min-h-[220px] flex flex-col justify-center">
                  <div className="text-xs text-amber-800 font-bold tracking-wider uppercase">
                    영어 표현을 보고 뜻을 떠올려보세요
                  </div>

                  <h3 className="text-xl sm:text-2xl font-serif-book font-extrabold text-slate-900">
                    "{currentReviewCard.expression}"
                  </h3>

                  <button
                    type="button"
                    onClick={() => audioManager.speak(currentReviewCard.expression)}
                    className="inline-flex items-center justify-center gap-1 text-xs text-amber-700 bg-amber-100/70 hover:bg-amber-100 px-3 py-1 rounded-full mx-auto transition"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>발음 듣기</span>
                  </button>

                  {/* Guess Input */}
                  {!isAnswerRevealed && (
                    <div className="pt-2">
                      <input
                        type="text"
                        value={userGuess}
                        onChange={(e) => setUserGuess(e.target.value)}
                        placeholder="한국어 뜻을 입력하거나 머릿속으로 떠올려보세요..."
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  )}

                  {/* Revealed Answer Box */}
                  {isAnswerRevealed && (
                    <div className="p-4 bg-white/95 rounded-2xl border border-amber-200 text-left space-y-2 animate-fadeIn">
                      <div className="text-xs font-bold text-amber-900">
                        💡 저장된 의미: {currentReviewCard.everydayMeaning}
                      </div>
                      {currentReviewCard.inContext && (
                        <div className="text-[11px] text-slate-500">
                          원서 문맥: {currentReviewCard.inContext}
                        </div>
                      )}
                      {currentReviewCard.userNote && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded">
                          내 메모: {currentReviewCard.userNote}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Answer Toggle / Self Evaluation Buttons */}
                {!isAnswerRevealed ? (
                  <button
                    type="button"
                    onClick={() => setIsAnswerRevealed(true)}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    정답 및 내 메모 확인하기
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="text-center text-[11px] font-semibold text-slate-500">
                      내 기억 상태를 정직하게 선택해 주세요:
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleReviewAnswer('remembered')}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                      >
                        기억함 ✅
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewAnswer('review_again')}
                        className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                      >
                        다시 복습 🔁
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewAnswer('hard')}
                        className="py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                      >
                        어려움 ⚠️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 3: LEARNING STATS DASHBOARD (Step 07-E) */}
        {activeTab === 'stats' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                <span className="text-[10px] text-amber-800 font-bold block mb-1">
                  📅 누적 학습일
                </span>
                <span className="text-xl font-extrabold text-amber-950 font-mono">
                  {stats.totalStudyDays}
                </span>
                <span className="text-xs text-amber-800 ml-1">일째 학습 중</span>
              </div>

              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
                <span className="text-[10px] text-emerald-800 font-bold block mb-1">
                  📖 방문한 고유 챕터
                </span>
                <span className="text-xl font-extrabold text-emerald-950 font-mono">
                  {stats.uniqueChaptersVisited}
                </span>
                <span className="text-xs text-emerald-800 ml-1">개 장</span>
              </div>

              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl">
                <span className="text-[10px] text-indigo-800 font-bold block mb-1">
                  🔖 저장한 표현 수
                </span>
                <span className="text-xl font-extrabold text-indigo-950 font-mono">
                  {stats.totalSavedExpressions}
                </span>
                <span className="text-xs text-indigo-800 ml-1">개</span>
              </div>

              <div className="p-3.5 bg-violet-50/70 border border-violet-200/80 rounded-2xl">
                <span className="text-[10px] text-violet-800 font-bold block mb-1">
                  🔄 복습한 표현 수
                </span>
                <span className="text-xl font-extrabold text-violet-950 font-mono">
                  {stats.reviewedExpressionsCount}
                </span>
                <span className="text-xs text-violet-800 ml-1">개</span>
              </div>
            </div>

            {/* Today's Activity */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>오늘 학습한 챕터 ({stats.todayChapters.length}개)</span>
                </h4>
                <span className="text-[10px] text-slate-400">실제 방문 기록</span>
              </div>

              {stats.todayChapters.length === 0 ? (
                <p className="text-slate-400 text-[11px] py-2">
                  아직 오늘 학습 기록이 없습니다. 본문을 읽어보세요!
                </p>
              ) : (
                <div className="space-y-1 pt-1">
                  {stats.todayChapters.map((c, i) => (
                    <div
                      key={i}
                      className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-800 truncate mr-2">{c.bookTitle}</span>
                      <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                        {c.chapterTitle}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detailed Activity Logs Timeline */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>날짜별 학습 기록 (최신순)</span>
              </h4>

              {stats.dailyLogs.length === 0 ? (
                <p className="text-slate-400 text-[11px] py-2">학습 기록이 없습니다.</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {stats.dailyLogs.slice(0, 15).map((log) => (
                    <div key={log.id} className="py-2 flex items-center justify-between text-[11px]">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {log.bookTitle} — {log.chapterTitle}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {log.date} ({log.lastActiveTime || '기록됨'})
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                          {log.readParagraphsCount}문단 읽음
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-100 rounded-xl text-[10px] text-slate-500 leading-relaxed">
              * 통계 산정 원칙: 브라우저 로컬 저장소에 실제로 기록된 고유 날짜와 방문 챕터 수만
              정직하게 반영합니다. 외부 서버로 전송되지 않습니다.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
