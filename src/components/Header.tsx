import React from 'react';
import { BookOpen, Sparkles, Bookmark, Settings, Download, Bot, Home, HardDrive } from 'lucide-react';
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
  isChatOpen?: boolean;
  onToggleChat?: () => void;
  onOpenDashboard?: () => void;
  onOpenBackupModal?: () => void;
}

const LEARNING_STEPS = [
  { step: 1, label: '1. 핵심 표현', title: 'Step 1: 원서 분석 & 핵심 표현' },
  { step: 2, label: '2. 낭독·섀도잉', title: 'Step 2: 낭독 & 섀도잉' },
  { step: 3, label: '3. 회화 토론', title: 'Step 3: 스토리 회화 토론' },
  { step: 4, label: '4. 나만의 문장', title: 'Step 4: 나만의 문장 만들기' },
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
  isChatOpen = true,
  onToggleChat,
  onOpenDashboard,
  onOpenBackupModal,
}) => {
  return (
    <header className="bg-white border-b border-amber-100/80 sticky top-0 z-30 shadow-xs">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Book Switcher */}
          <div className="flex items-center space-x-3 sm:space-x-4">
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
              type="button"
              onClick={onOpenBookModal}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/60 text-slate-800 transition group text-left max-w-[180px] sm:max-w-xs md:max-w-sm cursor-pointer"
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

          {/* Center: 4-Step Learning Navigation (Desktop) */}
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

          {/* Right Action buttons */}
          <div className="flex items-center space-x-1 sm:space-x-1.5">
            {/* Learning Home Dashboard */}
            {onOpenDashboard && (
              <button
                type="button"
                onClick={onOpenDashboard}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100/80 hover:bg-amber-200/80 border border-amber-300/80 transition cursor-pointer"
                title="나의 학습 대시보드 (목표 & 진도)"
              >
                <Home className="w-4 h-4 text-amber-700" />
                <span className="hidden md:inline">학습 홈</span>
              </button>
            )}

            {/* Toggle AI Coach Chat */}
            <button
              type="button"
              onClick={onToggleChat}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isChatOpen
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200/80'
              }`}
              title={isChatOpen ? 'AI 코치 창 닫기' : 'AI 코치 창 열기'}
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AI 코치</span>
              <span className={`w-2 h-2 rounded-full ${isChatOpen ? 'bg-emerald-300' : 'bg-emerald-500'}`} />
            </button>

            {/* Expression Notebook */}
            <button
              type="button"
              onClick={onOpenNotebook}
              className="relative p-2 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
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
                className="p-2 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                title="로컬 데이터 백업 & 복원"
              >
                <HardDrive className="w-5 h-5" />
              </button>
            )}

            {/* Export Notes */}
            <button
              type="button"
              onClick={onExportNotes}
              className="p-2 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
              title="학습 기록 마크다운 내보내기"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
              title="설정 (레벨, 음성)"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4-Step Learning Navigation Bar (Mobile / Tablet / Small Desktop) */}
      <div className="xl:hidden border-t border-amber-100/60 bg-amber-50/40 px-3 py-1.5 flex items-center justify-between overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-bold text-amber-900 shrink-0 mr-2 flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-amber-600" />
          <span>학습 4단계:</span>
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
    </header>
  );
};
