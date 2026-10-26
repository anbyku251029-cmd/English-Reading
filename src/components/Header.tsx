import React from 'react';
import { BookOpen, Sparkles, Bookmark, Settings, Download } from 'lucide-react';
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
}

export const Header: React.FC<HeaderProps> = ({
  currentBook,
  onOpenBookModal,
  onOpenNotebook,
  onOpenSettings,
  onExportNotes,
  savedExpressionsCount,
}) => {

  return (
    <header className="bg-white border-b border-amber-100/80 sticky top-0 z-30 shadow-xs">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Book Switcher */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-xl tracking-tight text-slate-900">Booky</span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                    AI Coach
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">영어 원서 직독직해 &amp; 회화 코칭</p>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden md:block" />

            {/* Current Book Pill */}
            <button
              onClick={onOpenBookModal}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/60 text-slate-800 transition group text-left max-w-[220px] sm:max-w-xs md:max-w-sm"
              title="클릭하여 원서 바꾸기"
            >
              <BookOpen className="w-4 h-4 text-amber-600 shrink-0 group-hover:scale-105 transition" />
              <div className="truncate">
                <div className="text-xs font-semibold truncate text-slate-800 group-hover:text-amber-900">
                  {currentBook.title}
                </div>
                <div className="text-[10px] text-slate-500 truncate">{currentBook.chapter}</div>
              </div>
              <span className="text-[10px] text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded font-medium shrink-0 hidden lg:inline-block">
                변경
              </span>
            </button>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Expression Notebook */}
            <button
              onClick={onOpenNotebook}
              className="relative p-2 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition"
              title="표현 노트 열기"
            >
              <Bookmark className="w-5 h-5" />
              {savedExpressionsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {savedExpressionsCount}
                </span>
              )}
            </button>

            {/* Export Notes */}
            <button
              onClick={onExportNotes}
              className="p-2 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition"
              title="오늘 학습 내용 내보내기"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition"
              title="설정 (레벨, 음성)"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
