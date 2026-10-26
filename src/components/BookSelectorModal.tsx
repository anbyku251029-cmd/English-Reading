import React, { useState } from 'react';
import { X, BookOpen, PlusCircle, Check, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { PRESET_BOOKS, BookPreset } from '../data/presetBooks';

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
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  // Custom Book Form State
  const [customTitle, setCustomTitle] = useState('');
  const [customChapter, setCustomChapter] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [customLevel, setCustomLevel] = useState<'Beginner (A2)' | 'Intermediate (B1-B2)' | 'Upper-Intermediate (B2-C1)'>('Intermediate (B1-B2)');
  const [customPassage, setCustomPassage] = useState('');

  if (!isOpen) return null;

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

  const loadSampleCustom = () => {
    setCustomTitle('The Little Prince');
    setCustomChapter('Chapter 1: The Boa Constrictor');
    setCustomAuthor('Antoine de Saint-Exupéry');
    setCustomLevel('Intermediate (B1-B2)');
    setCustomPassage(
      `Once when I was six years old I saw a magnificent picture in a book, called True Stories from Nature, about the primeval forest. It was a picture of a boa constrictor in the act of swallowing an animal.
In the book it said: "Boa constrictors swallow their prey whole, without chewing it. After that they are not able to move, and they sleep through the six months that they need for digestion."
I pondered deeply, then, over the adventures of the jungle. And after some work with a colored pencil I succeeded in making my first drawing. My Drawing Number One. It looked something like this.
I showed my masterpiece to the grown-ups, and asked them whether the drawing frightened them.
They answered: "Frighten? Why should any one be frightened by a hat?"
My drawing was not a picture of a hat. It was a picture of a boa constrictor digesting an elephant.`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">원서 선택 &amp; 텍스트 변경</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-3 pb-1 border-b border-slate-100 flex space-x-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-2.5 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'presets'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>추천 명작 원서 라이브러리 ({PRESET_BOOKS.length})</span>
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
            <span>내 원서 / 직접 텍스트 붙여넣기</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'presets' ? (
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

                      {/* Chapters 1~10 list if available */}
                      {b.chapters && b.chapters.length > 0 && (
                        <div
                          className="mt-3 pt-2 border-t border-slate-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between mb-1.5 text-[11px] font-bold text-slate-600">
                            <span>챕터 바로 선택 (Chapter 1~10):</span>
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold">
                              전 10장 수록
                            </span>
                          </div>
                          <div className="grid grid-cols-5 gap-1">
                            {b.chapters.map((ch) => {
                              const isCurrentCh =
                                isSelected &&
                                (currentBook.currentChapterNumber || 1) === ch.chapterNumber;
                              return (
                                <button
                                  key={ch.chapterNumber}
                                  type="button"
                                  onClick={() => {
                                    onSelectChapter?.(ch.chapterNumber);
                                    onClose();
                                  }}
                                  className={`py-1 text-center rounded-lg text-xs font-bold transition cursor-pointer ${
                                    isCurrentCh
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-amber-100 text-slate-700 border border-slate-200/60'
                                  }`}
                                  title={ch.chapter}
                                >
                                  Ch.{ch.chapterNumber}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>핵심 표현 {b.keyExpressionsPreview.length}개 수록</span>
                      <span className="text-amber-600 font-semibold group-hover:translate-x-0.5 transition flex items-center">
                        학습 시작 <ArrowRight className="w-3 h-3 ml-0.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleApplyCustom} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    원서 제목 (Title)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="예: The Great Gatsby, Holes..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    챕터 또는 페이지 (Chapter)
                  </label>
                  <input
                    type="text"
                    value={customChapter}
                    onChange={(e) => setCustomChapter(e.target.value)}
                    placeholder="예: Chapter 3: The Party"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    작가 (Author - 선택)
                  </label>
                  <input
                    type="text"
                    value={customAuthor}
                    onChange={(e) => setCustomAuthor(e.target.value)}
                    placeholder="예: F. Scott Fitzgerald"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    체감 난이도 (Level)
                  </label>
                  <select
                    value={customLevel}
                    onChange={(e) => setCustomLevel(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                  >
                    <option value="Beginner (A2)">초급 (A2) - 쉬운 챕터북 수준</option>
                    <option value="Intermediate (B1-B2)">중급 (B1-B2) - 일반 청소년/성인 소설</option>
                    <option value="Upper-Intermediate (B2-C1)">고급 (B2-C1) - 고전/전문 원서</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    원서 본문 영문 텍스트 (Passage) *
                  </label>
                  <button
                    type="button"
                    onClick={loadSampleCustom}
                    className="text-[11px] text-amber-700 hover:underline font-semibold"
                  >
                    샘플 텍스트 채우기
                  </button>
                </div>
                <textarea
                  rows={7}
                  value={customPassage}
                  onChange={(e) => setCustomPassage(e.target.value)}
                  placeholder="공부하고 싶은 영어 원서의 문단이나 챕터를 그대로 복사하여 붙여넣으세요..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 font-serif-book leading-relaxed"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>추천 분량: 150~400단어 (i-1 원칙)</span>
                  <span>단어 수: {customPassage.trim() ? customPassage.trim().split(/\s+/).length : 0} words</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition"
                >
                  이 본문으로 코칭 시작하기
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
