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
} from 'lucide-react';
import { PRESET_BOOKS, BookPreset } from '../data/presetBooks';
import { LocalBook, LocalChapter, LocalParagraph } from '../types';

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

  // Fetch local books from SQLite API
  const fetchLocalBooks = async () => {
    setIsLoadingBooks(true);
    setBooksError(null);
    try {
      const res = await fetch('/api/books');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `서버 오류 (${res.status})`);
      }
      const data = await res.json();
      if (data.ok && Array.isArray(data.books)) {
        setLocalBooks(data.books);
      } else {
        throw new Error('도서 목록 형식이 올바르지 않습니다.');
      }
    } catch (err: any) {
      console.error('Failed to fetch books:', err);
      setBooksError(err.message || '도서 목록을 불러오는 중 오류가 발생했습니다.');
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

    try {
      const res = await fetch(`/api/books/${book.id}/chapters`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `챕터 로드 오류 (${res.status})`);
      }
      const data = await res.json();
      if (data.ok && Array.isArray(data.chapters)) {
        setChapters(data.chapters);
      } else {
        throw new Error('챕터 데이터 형식이 올바르지 않습니다.');
      }
    } catch (err: any) {
      console.error('Failed to fetch chapters:', err);
      setChaptersError(err.message || '챕터 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingChapters(false);
    }
  };

  // Load actual paragraphs for chosen chapter and update App state
  const handleSelectChapterFromDb = async (book: LocalBook, chapter: LocalChapter) => {
    setIsLoadingParagraphs(true);
    try {
      const res = await fetch(`/api/chapters/${chapter.id}/paragraphs`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `본문 로드 오류 (${res.status})`);
      }
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.paragraphs) || data.paragraphs.length === 0) {
        throw new Error('해당 챕터의 본문 문단이 비어 있습니다.');
      }

      const paragraphs: LocalParagraph[] = data.paragraphs;
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
        starterPrompt: `오늘 함께 읽을 책은 Magic Tree House #${book.book_number} "${book.title}"의 "${chapter.title}"이야! 직독직해와 회화 코칭을 시작해줘.`,
        keyExpressionsPreview: ['로컬 SQLite 원서', `${paragraphs.length}개 문단`],
      };

      onSelectBook(bookPreset);
      onClose();
    } catch (err: any) {
      alert(`본문 로드 실패: ${err.message}`);
    } finally {
      setIsLoadingParagraphs(false);
    }
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
      levelKey,
      coverGradient: 'from-amber-600 via-orange-600 to-indigo-900',
      tagline: '직접 입력한 원서 텍스트로 진행하는 1:1 맞춤 코칭',
      passage: customPassage.trim(),
      starterPrompt: `오늘 함께 읽을 책은 "${customTitle || '내가 고른 원서'}"의 "${customChapter || '본문'}"이야! 직독직해와 회화 코칭을 시작해줘.`,
      keyExpressionsPreview: ['직접 입력 텍스트', '문맥 분석 진행'],
    };

    onSelectBook(customBook);
    onClose();
  };

  if (!isOpen) return null;

  const filteredLocalBooks = localBooks.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      `#${b.book_number}`.includes(q) ||
      String(b.book_number) === q
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 to-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>원서 서재 &amp; 챕터 선택</span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  SQLite 로컬 원서 28권 완비
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                원하는 권과 챕터를 선택하면 전체 본문이 즉시 독서실로 로드됩니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-3 pb-1 border-b border-slate-100 flex space-x-4 text-xs font-bold bg-slate-50/50">
          <button
            onClick={() => setActiveTab('sqlite')}
            className={`pb-2.5 border-b-2 transition flex items-center space-x-1.5 ${
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
            className={`pb-2.5 border-b-2 transition flex items-center space-x-1.5 ${
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
            className={`pb-2.5 border-b-2 transition flex items-center space-x-1.5 ${
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
                    placeholder="도서 제목 검색 (예: Dinosaurs, Titanic, Knight...)"
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
                  className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
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
                  <p className="text-xs font-medium">SQLite 데이터베이스에서 도서 목록을 불러오는 중입니다...</p>
                </div>
              )}

              {/* Error State */}
              {!isLoadingBooks && booksError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold mb-1">도서 목록을 불러오지 못했습니다.</p>
                    <p className="text-rose-600 mb-2">{booksError}</p>
                    <button
                      onClick={fetchLocalBooks}
                      className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition"
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              )}

              {/* Books Grid */}
              {!isLoadingBooks && !booksError && (
                <div>
                  {filteredLocalBooks.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      검색 조건에 맞는 도서가 없습니다.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {filteredLocalBooks.map((book) => {
                        const isExpanded = selectedBookForChapters?.id === book.id;
                        const isCurrentActiveBook =
                          currentBook.dbBookId === book.id ||
                          currentBook.title.toLowerCase() === book.title.toLowerCase();

                        return (
                          <div
                            key={book.id}
                            className={`rounded-2xl border transition overflow-hidden ${
                              isExpanded
                                ? 'border-amber-500 bg-amber-50/20 ring-2 ring-amber-400/30'
                                : isCurrentActiveBook
                                ? 'border-amber-400 bg-amber-50/40 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50/60 shadow-xs'
                            }`}
                          >
                            {/* Card Header (Click to expand chapters) */}
                            <div
                              onClick={() => handleSelectBookCard(book)}
                              className="p-4 cursor-pointer flex items-start justify-between gap-3"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex flex-col items-center justify-center font-bold shrink-0 shadow-xs">
                                  <span className="text-[9px] uppercase tracking-tighter opacity-80">Book</span>
                                  <span className="text-sm leading-none">#{book.book_number}</span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                                      Magic Tree House
                                    </span>
                                    {isCurrentActiveBook && (
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                        <Check className="w-3 h-3" />
                                        현재 도서
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="font-bold text-slate-900 text-sm leading-snug">
                                    {book.title}
                                  </h3>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    저자: {book.author}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-[11px] font-bold text-slate-700 flex items-center justify-end gap-1">
                                  <Layers className="w-3 h-3 text-slate-400" />
                                  <span>{book.chapter_count}개 장</span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {book.paragraph_count.toLocaleString()}개 문단
                                </div>
                                <div className="mt-2 text-[11px] font-semibold text-amber-700 flex items-center justify-end gap-0.5">
                                  <span>{isExpanded ? '챕터 닫기' : '챕터 선택'}</span>
                                  <ChevronRight
                                    className={`w-3 h-3 transition-transform ${
                                      isExpanded ? 'rotate-90' : ''
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Expanded Chapters Drawer */}
                            {isExpanded && (
                              <div className="p-4 pt-3 border-t border-amber-200/60 bg-white/90">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                                    <span>읽을 챕터(장)를 선택하세요:</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    총 {chapters.length}개 챕터
                                  </span>
                                </div>

                                {isLoadingChapters && (
                                  <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                                    <span>챕터 목록을 불러오는 중...</span>
                                  </div>
                                )}

                                {!isLoadingChapters && chaptersError && (
                                  <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center justify-between">
                                    <span>{chaptersError}</span>
                                    <button
                                      onClick={() => handleSelectBookCard(book)}
                                      className="font-bold underline"
                                    >
                                      재시도
                                    </button>
                                  </div>
                                )}

                                {!isLoadingChapters && !chaptersError && chapters.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                                    {chapters.map((ch) => {
                                      const isCurrentCh =
                                        isCurrentActiveBook &&
                                        (currentBook.dbChapterId === ch.id ||
                                          currentBook.currentChapterNumber === ch.chapter_number);

                                      return (
                                        <button
                                          key={ch.id}
                                          type="button"
                                          disabled={isLoadingParagraphs}
                                          onClick={() => handleSelectChapterFromDb(book, ch)}
                                          className={`px-2.5 py-2 text-left rounded-xl text-xs font-medium transition flex items-center justify-between border cursor-pointer ${
                                            isCurrentCh
                                              ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                              : 'bg-slate-50 hover:bg-amber-50 hover:text-amber-900 border-slate-200/80 text-slate-800'
                                          }`}
                                        >
                                          <div className="truncate pr-2">
                                            <span className="font-bold mr-1">
                                              Ch.{ch.chapter_number}
                                            </span>
                                            <span>{ch.title.replace(/^\d+\.\s*/, '')}</span>
                                          </div>
                                          <span
                                            className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded ${
                                              isCurrentCh
                                                ? 'bg-amber-700/60 text-amber-100'
                                                : 'bg-white text-slate-500 border border-slate-200/60'
                                            }`}
                                          >
                                            {ch.paragraph_count}문단
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 추천 명작 원서 (PRESETS) */}
          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PRESET_BOOKS.map((b) => {
                const isSelected = currentBook.id === b.id;

                return (
                  <div
                    key={b.id}
                    onClick={() => handleSelectPreset(b)}
                    className={`p-4 rounded-2xl border transition text-left cursor-pointer relative group flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-400/30'
                        : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50/80 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                          {b.level}
                        </span>
                        {isSelected && (
                          <span className="flex items-center space-x-1 text-xs font-bold text-emerald-600">
                            <Check className="w-3.5 h-3.5" />
                            <span>선택됨</span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-amber-900 transition">
                        {b.title}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">{b.chapter}</p>
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                        {b.tagline}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span>{b.author}</span>
                      <span className="text-amber-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center">
                        독서 시작 &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: 사용자 직접 입력 (CUSTOM) */}
          {activeTab === 'custom' && (
            <form onSubmit={handleApplyCustom} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    원서 제목 (Title)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="예: The Little Prince"
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    챕터 / 장 (Chapter)
                  </label>
                  <input
                    type="text"
                    value={customChapter}
                    onChange={(e) => setCustomChapter(e.target.value)}
                    placeholder="예: Chapter 1: The Secret"
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    저자 (Author)
                  </label>
                  <input
                    type="text"
                    value={customAuthor}
                    onChange={(e) => setCustomAuthor(e.target.value)}
                    placeholder="예: Antoine de Saint-Exupéry"
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    학습 난이도
                  </label>
                  <select
                    value={customLevel}
                    onChange={(e: any) => setCustomLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  >
                    <option value="Beginner (A2)">Beginner (초급 A2)</option>
                    <option value="Intermediate (B1-B2)">Intermediate (중급 B1-B2)</option>
                    <option value="Upper-Intermediate (B2-C1)">Upper-Intermediate (고급 B2-C1)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  영어 본문 내용 (Passage)
                </label>
                <textarea
                  rows={8}
                  value={customPassage}
                  onChange={(e) => setCustomPassage(e.target.value)}
                  placeholder="영어 원서의 본문을 붙여넣으세요..."
                  className="w-full p-3.5 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition font-serif leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-xs"
                >
                  본문 로드하여 학습 시작
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
