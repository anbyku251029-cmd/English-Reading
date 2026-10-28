import React from 'react';
import {
  BookOpen,
  Sparkles,
  Bookmark,
  Settings,
  Download,
  Bot,
  Home,
  HardDrive,
  Newspaper,
} from 'lucide-react';
import { BookPreset } from '../data/presetBooks';

interface HeaderProps {
  currentBook: BookPreset;
  currentStep?: number;
  onSelectStep?: (step: number) => void;
  onOpenBookModal: () => void;
  onOpenNotebook: () => void;
  onOpenSettings: () => void;
  onExportNotes: () => void;
  savedExpressionsCount: number;
  onOpenDashboard?: () => void;
  onOpenBackupModal?: () => void;
  currentCategory?: 'books' | 'cnn_news';
  onSelectCategory?: (category: 'books' | 'cnn_news') => void;
}

const LEARNING_STEPS = [
  { step: 1, label: '1. 읽기 (READ)', title: 'Step 1: 원문 정독 & 문단 탐색' },
  { step: 2, label: '2. 듣기 (LISTEN)', title: 'Step 2: Web Speech 음성 듣기' },
  { step: 3, label: '3. 말하기 (SPEAK)', title: 'Step 3: 발음 녹음 & 섀도잉' },
];

export const Header: React.FC<HeaderProps> = ({
  currentBook,
  currentStep = 1,
  onSelectStep,
  onOpenBookModal,
  onOpenNotebook,
  onOpenSettings,
  onExportNotes,
  savedExpressionsCount,
  onOpenDashboard,
  onOpenBackupModal,
  currentCategory = 'books',
  onSelectCategory,
}) => {
  const isCnnNews = currentCategory === 'cnn_news';

  return (
    <header className={`border-b sticky top-0 z-30 shadow-xs transition-colors duration-200 ${
      isCnnNews
        ? 'bg-slate-950 border-red-950 text-white'
        : 'bg-white border-amber-100/80 text-slate-900'
    }`}>
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Category Switcher */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${
                isCnnNews
                  ? 'bg-gradient-to-tr from-red-700 via-rose-600 to-red-800 shadow-red-900/30'
                  : 'bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 shadow-amber-500/20'
              }`}>
                {isCnnNews ? <Newspaper className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className={`font-extrabold text-xl tracking-tight ${isCnnNews ? 'text-white' : 'text-slate-900'}`}>
                    Booky
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    isCnnNews
                      ? 'bg-red-900 text-red-200 border border-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {isCnnNews ? 'C2 News' : 'Studio'}
                  </span>
                </div>
                <p className={`text-[11px] hidden sm:block ${isCnnNews ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isCnnNews ? 'CNN 시사 뉴스 & C2 고급 영어 연구' : '영어 원서 읽기·듣기·말하기 중심 학습'}
                </p>
              </div>
            </div>

            <div className={`h-6 w-px hidden md:block ${isCnnNews ? 'bg-slate-800' : 'bg-slate-200'}`} />

            {/* Category Toggle Tabs (원서 vs CNN 뉴스) */}
            {onSelectCategory && (
              <div className={`flex items-center p-1 rounded-xl border text-xs font-semibold ${
                isCnnNews
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-slate-100/90 border-slate-200/80'
              }`}>
                <button
                  type="button"
                  onClick={() => onSelectCategory('books')}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1 cursor-pointer ${
                    !isCnnNews
                      ? 'bg-amber-500 text-white shadow-xs font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="영어 원서 읽기 카테고리"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">28권 원서</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCategory('cnn_news')}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1 cursor-pointer ${
                    isCnnNews
                      ? 'bg-red-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="CNN 뉴스 C2 고급 영어 학습 카테고리"
                >
                  <Newspaper className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">CNN News (C2)</span>
                </button>
              </div>
            )}

            {/* Current Book Pill (Only shown in books category) */}
            {!isCnnNews && (
              <button
                type="button"
                onClick={onOpenBookModal}
                className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/60 text-slate-800 transition group text-left max-w-[160px] xl:max-w-xs cursor-pointer"
                title="클릭하여 원서 바꾸기"
              >
                <BookOpen className="w-4 h-4 text-amber-600 shrink-0 group-hover:scale-105 transition" />
                <div className="truncate">
                  <div className="text-xs font-semibold truncate text-slate-800 group-hover:text-amber-900">
                    {currentBook.title}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{currentBook.chapter}</div>
                </div>
                <span className="text-[10px] text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded font-medium shrink-0">
                  변경
                </span>
              </button>
            )}
          </div>

          {/* Center: 4-Step Learning Navigation (Desktop, only for books) */}
          {!isCnnNews ? (
            <nav className="hidden xl:flex items-center space-x-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70">
              {LEARNING_STEPS.map((s) => {
                const isActive = currentStep === s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => onSelectStep?.(s.step)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                    title={s.title}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-amber-500/70'}`} />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </nav>
          ) : (
            <div className="hidden xl:flex items-center space-x-2 text-xs text-red-400 font-semibold px-3 py-1 rounded-xl bg-red-950/60 border border-red-900/60">
              <span>📰 CNN News English • CEFR C2 Mastery Studio</span>
            </div>
          )}

          {/* Right Action buttons */}
          <div className="flex items-center space-x-1 sm:space-x-1.5">
            {/* Learning Home Dashboard */}
            {onOpenDashboard && (
              <button
                type="button"
                onClick={onOpenDashboard}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isCnnNews
                    ? 'text-red-300 bg-red-950/60 hover:bg-red-900/80 border-red-900/80'
                    : 'text-amber-900 bg-amber-100/80 hover:bg-amber-200/80 border-amber-300/80'
                }`}
                title="나의 학습 대시보드 (목표 & 진도)"
              >
                <Home className={`w-4 h-4 ${isCnnNews ? 'text-red-400' : 'text-amber-700'}`} />
                <span className="hidden md:inline">학습 홈</span>
              </button>
            )}


            {/* Expression Notebook */}
            <button
              type="button"
              onClick={onOpenNotebook}
              className={`relative p-2 rounded-lg transition cursor-pointer ${
                isCnnNews
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
              }`}
              title="표현 노트 & 복습 모드 열기"
            >
              <Bookmark className="w-5 h-5" />
              {savedExpressionsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {savedExpressionsCount}
                </span>
              )}
            </button>

            {/* Backup & Restore */}
            {onOpenBackupModal && (
              <button
                type="button"
                onClick={onOpenBackupModal}
                className={`p-2 rounded-lg transition cursor-pointer ${
                  isCnnNews
                    ? 'text-slate-300 hover:text-blue-400 hover:bg-slate-800'
                    : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                }`}
                title="로컬 데이터 백업 & 복원"
              >
                <HardDrive className="w-5 h-5" />
              </button>
            )}

            {/* Export Notes (Books only) */}
            {!isCnnNews && (
              <button
                type="button"
                onClick={onExportNotes}
                className="p-2 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                title="학습 기록 마크다운 내보내기"
              >
                <Download className="w-5 h-5" />
              </button>
            )}

            {/* Settings */}
            <button
              type="button"
              onClick={onOpenSettings}
              className={`p-2 rounded-lg transition cursor-pointer ${
                isCnnNews
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
              }`}
              title="설정 (레벨, 음성)"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4-Step Learning Navigation Bar (Mobile / Tablet, only for books) */}
      {!isCnnNews && (
        <div className="xl:hidden border-t border-amber-100/60 bg-amber-50/40 px-3 py-1.5 flex items-center justify-between overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-bold text-amber-900 shrink-0 mr-2 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>핵심 3단계:</span>
          </span>
          <div className="flex items-center space-x-1.5">
            {LEARNING_STEPS.map((s) => {
              const isActive = currentStep === s.step;
              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => onSelectStep?.(s.step)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                  }`}
                  title={s.title}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
