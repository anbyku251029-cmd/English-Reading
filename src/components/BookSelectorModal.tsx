import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  PlusCircle,
  Check,
  Sparkles,
  Library,
  Search,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Database,
  Layers,
  FileText,
  Zap,
} from 'lucide-react';
import { PRESET_BOOKS, BookPreset } from '../data/presetBooks';
import { LocalBook, LocalChapter, LocalParagraph } from '../types';
import {
  getStatic28Books,
  getStaticBookChapters,
  getStaticChapterParagraphs,
} from '../data/staticBooksService';

interface BookSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBook: BookPreset;
  onSelectBook: (book: BookPreset) => void;
  onSelectChapter?: (chapterNumber: number) => void;
}

export const BookSelectorModal: React.FC<BookSelectorModalProps> = ({
  isOpen,
  onClose,
  currentBook,
  onSelectBook,
  onSelectChapter,
}) => {
  const [activeTab, setActiveTab] = useState<'sqlite' | 'presets' | 'custom'>('sqlite');

  // SQLite Books state
  const [localBooks, setLocalBooks] = useState<LocalBook[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState<boolean>(false);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [isStaticFallback, setIsStaticFallback] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected book for chapter expansion
  const [selectedBookForChapters, setSelectedBookForChapters] = useState<LocalBook | null>(null);
  const [chapters, setChapters] = useState<LocalChapter[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState<boolean>(false);
  const [chaptersError, setChaptersError] = useState<string | null>(null);

  // Loading paragraph content state
  const [isLoadingParagraphs, setIsLoadingParagraphs] = useState<boolean>(false);

  // Custom Book Form State
  const [customTitle, setCustomTitle] = useState('');
  const [customChapter, setCustomChapter] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [customLevel, setCustomLevel] = useState<
    'Beginner (A2)' | 'Intermediate (B1-B2)' | 'Upper-Intermediate (B2-C1)'
  >('Intermediate (B1-B2)');
  const [customPassage, setCustomPassage] = useState('');

  // Fetch local books from SQLite API with automatic static fallback
  const fetchLocalBooks = async () => {
    setIsLoadingBooks(true);
    setBooksError(null);
    try {
      const res = await fetch('/api/books');
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.books) && data.books.length > 0) {
          setLocalBooks(data.books);
          setIsStaticFallback(false);
          setIsLoadingBooks(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Backend /api/books unavailable, activating automatic 28 books dataset', e);
    }

    // Fallback: 28권 전체 정적 데이터를 즉시 자동 로드! (404 에러 미노출)
    try {
      const staticBooks = getStatic28Books() as LocalBook[];
      setLocalBooks(staticBooks);
      setIsStaticFallback(true);
      setBooksError(null);
    } catch (err: any) {
      console.error('Failed to load static books:', err);
      setBooksError('28권 데이터를 로드하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingBooks(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLocalBooks();
    }
  }, [isOpen]);

  // Fetch chapters when a book is selected
  const handleSelectBookCard = async (book: LocalBook) => {
    if (selectedBookForChapters?.id === book.id) {
      // Toggle collapse if already open
      setSelectedBookForChapters(null);
      setChapters([]);
      return;
    }

    setSelectedBookForChapters(book);
    setIsLoadingChapters(true);
    setChaptersError(null);
    setChapters([]);

    // 1. If in static fallback mode, directly fetch static chapters
    if (isStaticFallback) {
      const staticChs = getStaticBookChapters(book.id) as LocalChapter[];
      setChapters(staticChs);
      setIsLoadingChapters(false);
      return;
    }

    // 2. Otherwise try backend API, with fallback on error
    try {
      const res = await fetch(`/api/books/${book.id}/chapters`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.chapters) && data.chapters.length > 0) {
          setChapters(data.chapters);
          setIsLoadingChapters(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch chapters from api, using static chapters', e);
    }

    // Fallback to static chapters
    const fallbackChs = getStaticBookChapters(book.id) as LocalChapter[];
    setChapters(fallbackChs);
    setIsLoadingChapters(false);
  };

  // Load actual paragraphs for chosen chapter and update App state
  const handleSelectChapterFromDb = async (book: LocalBook, chapter: LocalChapter) => {
    setIsLoadingParagraphs(true);

    // 1. If in static fallback mode, directly use static paragraphs
    if (isStaticFallback) {
      const staticResult = getStaticChapterParagraphs(chapter.id);
      if (staticResult && staticResult.paragraphs.length > 0) {
        applyBookSession(book, chapter, staticResult.paragraphs as LocalParagraph[]);
        setIsLoadingParagraphs(false);
        return;
      }
    }

    // 2. Try backend API with automatic fallback
    try {
      const res = await fetch(`/api/chapters/${chapter.id}/paragraphs`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.paragraphs) && data.paragraphs.length > 0) {
          applyBookSession(book, chapter, data.paragraphs);
          setIsLoadingParagraphs(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch paragraphs from api, fallback to static paragraphs', e);
    }

    // Fallback
    const staticResult = getStaticChapterParagraphs(chapter.id);
    if (staticResult && staticResult.paragraphs.length > 0) {
      applyBookSession(book, chapter, staticResult.paragraphs as LocalParagraph[]);
    } else {
      alert('해당 챕터의 본문 문단을 불러오지 못했습니다.');
    }
    setIsLoadingParagraphs(false);
  };

  // Automatically select Book & Chapter 1 directly
  const handleQuickSelectBookChapter1 = async (book: LocalBook, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoadingParagraphs(true);

    // Get chapter 1
    const chs = getStaticBookChapters(book.id);
    const firstChapter = chs.find((c) => c.chapter_number === 1) || chs[0];

    if (!firstChapter) {
      handleSelectBookCard(book);
      setIsLoadingParagraphs(false);
      return;
    }

    const staticResult = getStaticChapterParagraphs(firstChapter.id);
    if (staticResult && staticResult.paragraphs.length > 0) {
      applyBookSession(book, firstChapter as LocalChapter, staticResult.paragraphs as LocalParagraph[]);
    } else {
      handleSelectBookCard(book);
    }
    setIsLoadingParagraphs(false);
  };

  const applyBookSession = (book: LocalBook, chapter: LocalChapter, paragraphs: LocalParagraph[]) => {
    const combinedPassage = paragraphs.map((p) => p.content).join('\n\n');

    const bookPreset: BookPreset = {
      id: `sqlite-${book.id}-${chapter.id}`,
      dbBookId: book.id,
      dbChapterId: chapter.id,
      bookNumber: book.book_number,
      title: book.title,
      author: book.author,
      series: 'Magic Tree House',
      level: 'Beginner (A2)',
      levelKey: 'beginner',
      chapter: chapter.title,
      currentChapterNumber: chapter.chapter_number,
      coverGradient: 'from-amber-600 via-amber-700 to-indigo-950',
      tagline: `Magic Tree House #${book.book_number} — ${book.title}`,
      passage: combinedPassage,
      paragraphs: paragraphs,
      starterPrompt: `오늘 함께 읽을 책은 Magic Tree House #${book.book_number} "${book.title}"의 "${chapter.title}"이야!`,
      keyExpressionsPreview: ['Magic Tree House 원서', `${paragraphs.length}개 문단`],
    };

    onSelectBook(bookPreset);
    onClose();
  };

  const handleSelectPreset = (book: BookPreset) => {
    onSelectBook(book);
    onClose();
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPassage.trim()) {
      alert('원서 본문 텍스트를 입력해주세요.');
      return;
    }

    const levelKey = customLevel.includes('A2')
      ? 'beginner'
      : customLevel.includes('B2-C1')
      ? 'advanced'
      : 'intermediate';

    const customBook: BookPreset = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim() || '내 원서 (My Book)',
      author: customAuthor.trim() || 'Custom Author',
      chapter: customChapter.trim() || 'Selected Passage',
      level: customLevel,
      levelKey: levelKey,
      coverGradient: 'from-indigo-600 via-purple-600 to-slate-900',
      tagline: '직접 입력한 원서 본문으로 시작하는 맞춤형 독서 & 낭독 세션',
      passage: customPassage.trim(),
      starterPrompt: `오늘 함께 읽을 책은 "${customTitle.trim() || '내 원서'}"의 본문이야. 소리 내어 편안하게 읽어보자!`,
      keyExpressionsPreview: ['사용자 등록 원서', '커스텀 텍스트'],
    };

    onSelectBook(customBook);
    onClose();
  };

  // Filter books by search query
  const filteredBooks = localBooks.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      `#${b.book_number}`.includes(q)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-700 rounded-2xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                  원서 서재 & 챕터 선택
                </h2>
                {isStaticFallback ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200" title="28권 전체 정적 데이터가 자동으로 연결되어 오프라인/배포 환경에서도 100% 이용 가능합니다.">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>28권 전권 준비 완료 (자동 선택 모드)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                    <span>로컬 SQLite 서버 연결됨 (28권 완비)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                원하는 권과 챕터를 선택하면 전체 본문이 즉시 독서실로 로드됩니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-6 pt-3 space-x-6 text-sm font-semibold bg-slate-50/50">
          <button
            onClick={() => setActiveTab('sqlite')}
            className={`pb-2.5 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'sqlite'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Library className="w-4 h-4" />
            <span>Magic Tree House 전권 ({localBooks.length || '28'}권)</span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-2.5 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'presets'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>추천 명작 원서 ({PRESET_BOOKS.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-2.5 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'custom'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>내 원서 텍스트 직접 입력</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: SQLite 28권 */}
          {activeTab === 'sqlite' && (
            <div>
              {/* Search bar & Refresh */}
              <div className="flex items-center gap-3 mb-5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="도서 제목 또는 번호 검색 (예: Dinosaurs, Titanic, #1, Knight...)"
                    className="w-full pl-9 pr-4 py-2 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      초기화
                    </button>
                  )}
                </div>
                <button
                  onClick={fetchLocalBooks}
                  disabled={isLoadingBooks}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                  title="도서 목록 새로고침"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBooks ? 'animate-spin' : ''}`} />
                  <span>새로고침</span>
                </button>
              </div>

              {/* Loading State */}
              {isLoadingBooks && (
                <div className="py-16 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600 mb-2" />
                  <p className="text-xs font-medium">28권 원서 서재를 불러오는 중입니다...</p>
                </div>
              )}

              {/* Error State (Only shown if static fallback fails too) */}
              {!isLoadingBooks && booksError && (
                <div className="p-5 rounded-2xl bg-amber-50/90 border border-amber-200 text-slate-800 space-y-3 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs space-y-2">
                      <p className="font-bold text-amber-900 text-sm">도서 목록을 불러오지 못했습니다.</p>
                      <p className="text-slate-600">{booksError}</p>
                      <button
                        onClick={fetchLocalBooks}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700 transition"
                      >
                        다시 시도
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Books Grid */}
              {!isLoadingBooks && filteredBooks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredBooks.map((book) => {
                    const isCurrent = currentBook.dbBookId === book.id || currentBook.bookNumber === book.book_number;
                    const isExpanded = selectedBookForChapters?.id === book.id;

                    return (
                      <div
                        key={book.id}
                        className={`rounded-2xl border transition-all duration-200 ${
                          isExpanded
                            ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/20 shadow-md col-span-1 md:col-span-2'
                            : isCurrent
                            ? 'border-amber-400 bg-amber-50/40 shadow-xs hover:shadow-md'
                            : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50/60 shadow-xs hover:shadow-sm'
                        }`}
                      >
                        {/* Book Card Header */}
                        <div
                          onClick={() => handleSelectBookCard(book)}
                          className="p-4 flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-xs">
                              #{book.book_number}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="font-bold text-slate-800 text-sm truncate">
                                  {book.title}
                                </h3>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 shrink-0">
                                    현재 학습 중
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span>{book.author}</span>
                                <span>•</span>
                                <span className="flex items-center gap-0.5">
                                  <Layers className="w-3 h-3 text-slate-400" />
                                  {book.chapter_count}개 챕터
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-0.5">
                                  <FileText className="w-3 h-3 text-slate-400" />
                                  {book.paragraph_count}문단
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Fast Read Chapter 1 Button */}
                            <button
                              type="button"
                              onClick={(e) => handleQuickSelectBookChapter1(book, e)}
                              disabled={isLoadingParagraphs}
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                              title="1장 본문으로 즉시 이동하여 읽기 시작"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">1장</span> 바로 읽기
                            </button>

                            <button
                              type="button"
                              className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition ${
                                isExpanded ? 'rotate-90 text-amber-600' : ''
                              }`}
                              title={isExpanded ? '챕터 목록 접기' : '챕터 목록 펼치기'}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Chapters Drawer */}
                        {isExpanded && (
                          <div className="border-t border-slate-200/80 bg-slate-50/70 p-4 rounded-b-2xl animate-in slide-in-from-top-2 duration-150">
                            <div className="flex items-center justify-between mb-3 text-xs text-slate-600 font-semibold">
                              <span className="flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-amber-600" />
                                <span>챕터 목록 선택 (클릭 시 해당 챕터 본문으로 즉시 로드)</span>
                              </span>
                              {isLoadingChapters && (
                                <span className="flex items-center gap-1 text-slate-400">
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  불러오는 중...
                                </span>
                              )}
                            </div>

                            {chaptersError && (
                              <p className="text-xs text-rose-600 mb-2">{chaptersError}</p>
                            )}

                            {!isLoadingChapters && chapters.length === 0 && !chaptersError && (
                              <p className="text-xs text-slate-400 py-3 text-center">등록된 챕터가 없습니다.</p>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {chapters.map((ch) => {
                                const isCurrentChapter =
                                  isCurrent && (currentBook.dbChapterId === ch.id || currentBook.chapter === ch.title);

                                return (
                                  <button
                                    key={ch.id}
                                    onClick={() => handleSelectChapterFromDb(book, ch)}
                                    disabled={isLoadingParagraphs}
                                    className={`p-2.5 rounded-xl text-left transition border flex items-center justify-between group cursor-pointer ${
                                      isCurrentChapter
                                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                        : 'bg-white hover:bg-amber-50/80 text-slate-800 border-slate-200 hover:border-amber-300'
                                    }`}
                                  >
                                    <div className="min-w-0 pr-1">
                                      <p className="text-xs font-bold truncate">
                                        {ch.title}
                                      </p>
                                      <p
                                        className={`text-[10px] mt-0.5 ${
                                          isCurrentChapter ? 'text-amber-100' : 'text-slate-400'
                                        }`}
                                      >
                                        Chapter {ch.chapter_number} • {ch.paragraph_count}문단
                                      </p>
                                    </div>
                                    <div
                                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                        isCurrentChapter
                                          ? 'bg-white text-amber-600'
                                          : 'bg-slate-100 text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-600'
                                      }`}
                                    >
                                      <Check className="w-3 h-3" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!isLoadingBooks && filteredBooks.length === 0 && !booksError && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  검색 조건에 맞는 도서가 없습니다.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 추천 명작 원서 (5선) */}
          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PRESET_BOOKS.map((book) => {
                const isSelected = currentBook.id === book.id && !currentBook.dbBookId;
                return (
                  <div
                    key={book.id}
                    onClick={() => handleSelectPreset(book)}
                    className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50/40 shadow-md ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50/60 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${book.coverGradient} shadow-xs flex items-center justify-center text-white font-bold text-xs`}
                        >
                          {book.title.slice(0, 1)}
                        </div>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            book.levelKey === 'beginner'
                              ? 'bg-emerald-100 text-emerald-800'
                              : book.levelKey === 'intermediate'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {book.level}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-base mb-1">{book.title}</h3>
                      <p className="text-xs text-slate-500 mb-2 font-medium">
                        {book.author} · {book.chapter}
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-2">
                        {book.tagline}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {book.chapters?.length ? `${book.chapters.length}개 챕터 수록` : '단일 지문'}
                      </span>
                      <span
                        className={`font-bold flex items-center ${
                          isSelected ? 'text-amber-800' : 'text-slate-600'
                        }`}
                      >
                        {isSelected ? '선택됨' : '선택하기'} →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: Custom Text Direct Input */}
          {activeTab === 'custom' && (
            <form onSubmit={handleApplyCustom} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    도서 제목 (Book Title)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="예: Harry Potter and the Sorcerer's Stone"
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    작가명 (Author)
                  </label>
                  <input
                    type="text"
                    value={customAuthor}
                    onChange={(e) => setCustomAuthor(e.target.value)}
                    placeholder="예: J.K. Rowling"
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    챕터 / 섹션명 (Chapter Title)
                  </label>
                  <input
                    type="text"
                    value={customChapter}
                    onChange={(e) => setCustomChapter(e.target.value)}
                    placeholder="예: Chapter 1: The Boy Who Lived"
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    학습 난이도 (Level)
                  </label>
                  <select
                    value={customLevel}
                    onChange={(e: any) => setCustomLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="Beginner (A2)">초급 (Beginner - A2)</option>
                    <option value="Intermediate (B1-B2)">중급 (Intermediate - B1-B2)</option>
                    <option value="Upper-Intermediate (B2-C1)">고급 (Upper-Intermediate - B2-C1)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  원서 본문 영문 텍스트 (English Passage) *
                </label>
                <textarea
                  value={customPassage}
                  onChange={(e) => setCustomPassage(e.target.value)}
                  rows={8}
                  placeholder="공부하고 싶은 영문 원서 본문을 여기에 복사하여 붙여넣으세요..."
                  className="w-full p-3.5 bg-slate-50 text-xs text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-serif leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  입력한 원서로 독서 시작하기
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
