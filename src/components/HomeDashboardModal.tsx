/**
 * Booky STEP 08: 개인 맞춤형 영어 학습 대시보드 모달
 * 
 * - 오늘 일일 학습 목표 (챕터 읽기 / 표현 복습) 실시간 달성률
 * - 최근 읽던 원서 바로가기 (이어 읽기)
 * - 오늘 학습 현황 및 복습 필요 표현 미리보기
 * - 서재, 학습 노트, 백업/복원 원클릭 바로가기
 */

import React, { useState, useEffect } from 'react';
import {
  DailyGoals,
  KeyExpression,
  ReadingProgress,
  LearningStatsSummary,
} from '../types';
import {
  loadDailyGoals,
  saveDailyGoals,
  calculateGoalProgress,
  calculateLearningStats,
  loadSavedExpressions,
} from '../utils/studyStorage';

interface HomeDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastProgress: ReadingProgress | null;
  onJumpToPassage: (bookId: number, chapterId: number, paragraphIndex?: number) => void;
  onOpenLibrary: () => void;
  onOpenNotebook: (initialTab?: 'expressions' | 'logs' | 'stats' | 'review') => void;
  onOpenBackupModal: () => void;
}

export const HomeDashboardModal: React.FC<HomeDashboardModalProps> = ({
  isOpen,
  onClose,
  lastProgress,
  onJumpToPassage,
  onOpenLibrary,
  onOpenNotebook,
  onOpenBackupModal,
}) => {
  const [goals, setGoals] = useState<DailyGoals>(loadDailyGoals());
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [inputTargetChapters, setInputTargetChapters] = useState(1);
  const [inputTargetExpressions, setInputTargetExpressions] = useState(3);
  const [stats, setStats] = useState<LearningStatsSummary | null>(null);
  const [expressions, setExpressions] = useState<KeyExpression[]>([]);

  // 데이터 갱신
  const refreshData = () => {
    const loadedGoals = loadDailyGoals();
    setGoals(loadedGoals);
    setInputTargetChapters(loadedGoals.targetChapters);
    setInputTargetExpressions(loadedGoals.targetExpressions);
    setStats(calculateLearningStats());
    setExpressions(loadSavedExpressions());
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const goalProgress = calculateGoalProgress(goals);

  // 복습 필요 표현 (어려움 또는 다시 복습 대상)
  const urgentReviewExpressions = expressions.filter(
    (item) => item.reviewStatus === 'review_again' || item.reviewStatus === 'hard'
  );

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveDailyGoals({
      targetChapters: Math.max(1, inputTargetChapters),
      targetExpressions: Math.max(1, inputTargetExpressions),
    });
    setGoals(updated);
    setIsEditingGoals(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        role="dialog"
        aria-labelledby="dashboard-title"
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800/80">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-xl">
              🏠
            </span>
            <div>
              <h2 id="dashboard-title" className="text-xl font-bold text-slate-900 dark:text-white">
                나의 맞춤 학습 홈 대시보드
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                오늘의 독서 목표를 달성하고, 나만의 원서 학습 기록을 점검하세요
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
            aria-label="대시보드 닫기"
          >
            ✕
          </button>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. 일일 학습 목표 섹션 */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🎯</span>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  오늘의 일일 학습 목표
                </h3>
              </div>
              <button
                onClick={() => setIsEditingGoals(!isEditingGoals)}
                className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline"
              >
                {isEditingGoals ? '취소' : '목표 수정'}
              </button>
            </div>

            {isEditingGoals ? (
              <form onSubmit={handleSaveGoals} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-amber-200 dark:border-amber-700/50 mb-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      하루 목표 챕터 수 (최소 1장)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={inputTargetChapters}
                      onChange={(e) => setInputTargetChapters(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      하루 표현 복습 목표 (최소 1개)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={inputTargetExpressions}
                      onChange={(e) => setInputTargetExpressions(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingGoals(false)}
                    className="px-3 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs rounded bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-sm"
                  >
                    저장하기
                  </button>
                </div>
              </form>
            ) : null}

            {/* 목표 게이지 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 챕터 읽기 목표 */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    📖 챕터 읽기 진행
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {goalProgress.actualChaptersToday} / {goalProgress.targetChapters} 장
                    {goalProgress.isChapterGoalAchieved && (
                      <span className="ml-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-normal">
                        (달성 완료! 🎉)
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      goalProgress.isChapterGoalAchieved
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${goalProgress.chapterProgressPercent}%` }}
                  />
                </div>
                <div className="text-right text-xs text-slate-400 mt-1">
                  {goalProgress.chapterProgressPercent}% 달성
                </div>
              </div>

              {/* 표현 복습 목표 */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    🔄 표현 복습 진행
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {goalProgress.actualReviewedToday} / {goalProgress.targetExpressions} 개
                    {goalProgress.isExpressionGoalAchieved && (
                      <span className="ml-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-normal">
                        (달성 완료! 🎉)
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      goalProgress.isExpressionGoalAchieved
                        ? 'bg-emerald-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${goalProgress.expressionProgressPercent}%` }}
                  />
                </div>
                <div className="text-right text-xs text-slate-400 mt-1">
                  {goalProgress.expressionProgressPercent}% 달성
                </div>
              </div>
            </div>
          </div>

          {/* 2. 최근 읽던 도서 & 빠른 액션 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 최근 읽던 도서 카드 */}
            <div className="md:col-span-2 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-slate-800 dark:to-slate-800/60 border border-indigo-200 dark:border-indigo-900/50 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <span>📌 최근 읽던 위치</span>
                </div>
                {lastProgress ? (
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                      {lastProgress.bookTitle || `도서 #${lastProgress.bookId}`}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                      {lastProgress.chapterTitle || `챕터 #${lastProgress.chapterId}`}
                      {lastProgress.lastParagraphIndex !== undefined && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                          (문단 {lastProgress.lastParagraphIndex + 1})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      최근 읽은 시간: {lastProgress.lastReadAt ? new Date(lastProgress.lastReadAt).toLocaleString('ko-KR') : '기록 없음'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 my-2">
                    아직 읽던 도서 기록이 없습니다. 서재에서 28권의 매직트리하우스 원서를 시작해보세요!
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                {lastProgress ? (
                  <button
                    onClick={() => {
                      onJumpToPassage(
                        lastProgress.bookId,
                        lastProgress.chapterId,
                        lastProgress.lastParagraphIndex
                      );
                      onClose();
                    }}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    ▶ 이어서 읽기
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onOpenLibrary();
                      onClose();
                    }}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    📚 첫 권 읽기 시작하기
                  </button>
                )}

                <button
                  onClick={() => {
                    onOpenLibrary();
                    onClose();
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  다른 도서 둘러보기 →
                </button>
              </div>
            </div>

            {/* 빠른 액션 패널 */}
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5 flex flex-col justify-between space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center space-x-1.5">
                <span>⚡ 빠른 바로가기</span>
              </h4>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    onOpenLibrary();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-amber-400 dark:hover:border-amber-500 transition shadow-sm text-left"
                >
                  <span className="flex items-center space-x-2">
                    <span>📚</span>
                    <span className="text-slate-800 dark:text-slate-200">28권 도서 서재</span>
                  </span>
                  <span className="text-slate-400">→</span>
                </button>

                <button
                  onClick={() => {
                    onOpenNotebook('review');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-amber-400 dark:hover:border-amber-500 transition shadow-sm text-left"
                >
                  <span className="flex items-center space-x-2">
                    <span>🗂️</span>
                    <span className="text-slate-800 dark:text-slate-200">표현 플래시카드 복습</span>
                  </span>
                  <span className="text-slate-400">→</span>
                </button>

                <button
                  onClick={() => {
                    onOpenBackupModal();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-amber-400 dark:hover:border-amber-500 transition shadow-sm text-left"
                >
                  <span className="flex items-center space-x-2">
                    <span>💾</span>
                    <span className="text-slate-800 dark:text-slate-200">데이터 백업 & 복원</span>
                  </span>
                  <span className="text-slate-400">→</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. 누적 학습 요약 & 복습 필요 목록 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 누적 통계 지표 */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-3 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <span>📊</span>
                  <span>누적 학습 성취</span>
                </span>
                <button
                  onClick={() => {
                    onOpenNotebook('stats');
                    onClose();
                  }}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                >
                  상세 통계 보기
                </button>
              </h4>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {stats?.totalStudyDays || 0}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">총 학습일수</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {stats?.uniqueChaptersVisited || 0}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">읽은 챕터</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {stats?.completedChaptersCount || 0}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">완독한 챕터</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {stats?.totalSavedExpressions || 0}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">저장된 표현</div>
                </div>
              </div>
            </div>

            {/* 복습 대기 표현 미리보기 */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-3 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <span>🔁</span>
                    <span>복습 대기 표현 ({urgentReviewExpressions.length}개)</span>
                  </span>
                  {urgentReviewExpressions.length > 0 && (
                    <button
                      onClick={() => {
                        onOpenNotebook('review');
                        onClose();
                      }}
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      전체 복습
                    </button>
                  )}
                </h4>

                {urgentReviewExpressions.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    👍 복습 대기 중인 어려운 표현이 없습니다! 원서를 읽으며 새로운 핵심 표현을 수집해보세요.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {urgentReviewExpressions.slice(0, 3).map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs flex justify-between items-center"
                      >
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.expression}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[200px]">
                            {item.everydayMeaning || item.inContext}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                          {item.reviewStatus === 'hard' ? '어려움' : '다시 복습'}
                        </span>
                      </div>
                    ))}
                    {urgentReviewExpressions.length > 3 && (
                      <p className="text-center text-[11px] text-slate-400 pt-1">
                        외 {urgentReviewExpressions.length - 3}개의 복습 대기 표현이 더 있습니다.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {urgentReviewExpressions.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    onClick={() => {
                      onOpenNotebook('review');
                      onClose();
                    }}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    플래시카드로 바로 복습 시작하기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span>💡 100% 브라우저 로컬 저장으로 안전하게 학습 기록이 보존됩니다.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-medium rounded-lg transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
