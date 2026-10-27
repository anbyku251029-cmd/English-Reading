/**
 * Booky STEP 09: CNN News C2 카테고리 메인 뷰 (CnnNewsCategoryView.tsx)
 * 
 * - 카테고리명: CNN News English (C2 Advanced English Study)
 * - 뉴스 자료 등록, 목록 조회, 검색, 필터링, 정렬, 삭제
 * - C2 학습 통계 요약 카드
 * - 뉴스 선택 시 C2 상세 학습 스튜디오로 진입
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CnnNewsArticle,
  NewsStudyStatus,
} from '../../types';
import {
  loadNewsArticles,
  deleteNewsArticle,
  calculateNewsStats,
  getGuidedProgress,
  CnnNewsStatsSummary,
} from '../../utils/cnnNewsStorage';
import { CnnNewsRegisterModal } from './CnnNewsRegisterModal';

interface CnnNewsCategoryViewProps {
  onSelectArticle: (articleId: string) => void;
  onBackToBooks: () => void;
}

export const CnnNewsCategoryView: React.FC<CnnNewsCategoryViewProps> = ({
  onSelectArticle,
  onBackToBooks,
}) => {
  const [articles, setArticles] = useState<CnnNewsArticle[]>([]);
  const [stats, setStats] = useState<CnnNewsStatsSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | NewsStudyStatus>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const refreshList = () => {
    const list = loadNewsArticles();
    setArticles(list);
    setStats(calculateNewsStats());
  };

  useEffect(() => {
    refreshList();
  }, []);

  // 주제 목록 추출
  const availableTopics = useMemo(() => {
    const set = new Set(articles.map((a) => a.topic).filter(Boolean));
    return Array.from(set);
  }, [articles]);

  // 필터 및 정렬
  const filteredArticles = useMemo(() => {
    return articles
      .filter((a) => {
        const matchesQuery =
          !searchQuery.trim() ||
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.rawContent.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (a.koreanSummary && a.koreanSummary.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesTopic = selectedTopic === 'ALL' || a.topic === selectedTopic;
        const matchesStatus = selectedStatus === 'ALL' || a.status === selectedStatus;

        return matchesQuery && matchesTopic && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return a.title.localeCompare(b.title);
      });
  }, [articles, searchQuery, selectedTopic, selectedStatus, sortBy]);

  // 기사 삭제 핸들러
  const handleDelete = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (window.confirm(`정말 "${title}" 기사 자료를 삭제하시겠습니까? (작성된 문장 분석과 메모도 함께 삭제됩니다)`)) {
      deleteNewsArticle(id);
      refreshList();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 text-slate-100 overflow-y-auto">
      {/* 1. 카테고리 헤더 배너 (Deep Red & Charcoal C2 브랜딩) */}
      <section className="bg-gradient-to-r from-red-950 via-slate-900 to-black border-b border-red-900/50 px-4 sm:px-6 lg:px-8 py-8 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-red-400 mb-2">
              <span className="px-2 py-0.5 rounded bg-red-950 border border-red-800/80">CEFR C2 Mastery</span>
              <span>•</span>
              <span>Advanced News English</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center space-x-3">
              <span className="text-red-500 font-extrabold">CNN</span>
              <span>News English</span>
            </h1>
            <p className="text-sm sm:text-base font-medium text-slate-300 mt-1">
              C2 Advanced English Study
            </p>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              시사 뉴스로 배우는 고급 영어 독해, 어휘, 문장 분석, 작문 및 토론. 
              수집하신 CNN 뉴스 자료를 등록하고 심층 행간 추론과 고급 논증을 직접 훈련하세요.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-900/40 transition flex items-center space-x-2 cursor-pointer"
            >
              <span>➕ 새 뉴스 자료 등록</span>
            </button>
            <button
              onClick={onBackToBooks}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl border border-slate-700 transition cursor-pointer"
            >
              📚 원서 읽기로 전환
            </button>
          </div>
        </div>

        {/* C2 학습 통계 카드 바 */}
        {stats && (
          <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-red-950/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
            <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl">
              <div className="text-xl font-black text-white">{stats.totalArticles}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">등록된 뉴스</div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl">
              <div className="text-xl font-black text-emerald-400">{stats.completedArticles}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">완독한 뉴스</div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl">
              <div className="text-xl font-black text-red-400">{stats.totalAnalyzedSentences}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">분석한 문장</div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl">
              <div className="text-xl font-black text-amber-400">{stats.totalNewsExpressions}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">C2 어휘 표현</div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl">
              <div className="text-xl font-black text-indigo-400">{stats.totalAnsweredQuestions}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">독해 답변 작성</div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl">
              <div className="text-xl font-black text-purple-400">
                {stats.totalWritingDrafts + stats.totalDebateDrafts}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">작문 & 토론문</div>
            </div>
          </div>
        )}
      </section>

      {/* 2. 검색 및 필터 컨트롤 바 */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5">
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-md">
          {/* 검색창 */}
          <div className="w-full md:w-80 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="뉴스 제목, 내용, 요약 검색..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
            <span className="absolute left-2.5 top-2.5 text-slate-500 text-xs">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* 필터 그룹 */}
          <div className="w-full md:w-auto flex flex-wrap items-center gap-2 text-xs">
            {/* 주제 필터 */}
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">모든 주제 (ALL)</option>
              {availableTopics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* 학습 상태 필터 */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">모든 상태</option>
              <option value="not_started">학습 전</option>
              <option value="in_progress">학습 중</option>
              <option value="completed">학습 완료</option>
            </select>

            {/* 정렬 */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 focus:outline-none focus:border-red-500"
            >
              <option value="newest">최신 등록순</option>
              <option value="oldest">오래된순</option>
              <option value="title">제목 가나다순</option>
            </select>
          </div>
        </div>
      </section>

      {/* 3. 기사 목록 그리드 */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12 flex-1">
        {filteredArticles.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-12 text-center my-6">
            <span className="text-4xl block mb-3">📰</span>
            <h3 className="text-base font-bold text-white mb-1">
              {articles.length === 0
                ? '등록된 CNN 뉴스 자료가 없습니다'
                : '검색 조건과 일치하는 뉴스가 없습니다'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
              {articles.length === 0
                ? '가지고 계신 CNN 뉴스 기사(.txt, .md, .html)를 등록하여 C2 고급 영어 독해 및 문장 분석을 시작해보세요!'
                : '검색어 또는 필터 조건을 변경해보세요.'}
            </p>
            {articles.length === 0 && (
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                ➕ 첫 번째 CNN 뉴스 자료 등록하기
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredArticles.map((article) => {
              const analyzedCount = Object.keys(article.sentenceAnalyses || {}).length;
              const answeredQCount = (article.readingQuestions || []).filter(
                (q) => q.userAnswer?.trim().length > 0
              ).length;

              return (
                <div
                  key={article.id}
                  onClick={() => onSelectArticle(article.id)}
                  className="bg-slate-800 border border-slate-700 hover:border-red-500/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-red-950/20 cursor-pointer group"
                >
                  <div>
                    {/* 상단 태그 및 상태 뱃지 */}
                    <div className="flex items-center justify-between mb-3 text-[11px]">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 rounded font-bold bg-red-950 text-red-400 border border-red-900/60">
                          {article.topic}
                        </span>
                        <span className="text-slate-500">{article.source}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {getGuidedProgress(article.id).currentStep !== 'NOT_STARTED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950 text-red-300 border border-red-800">
                            🎯 {getGuidedProgress(article.id).currentStep}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            article.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : article.status === 'in_progress'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {article.status === 'completed'
                            ? '완독 완료'
                            : article.status === 'in_progress'
                            ? '학습 중'
                            : '학습 전'}
                        </span>
                      </div>
                    </div>

                    {/* 제목 */}
                    <h3 className="text-base font-bold text-white group-hover:text-red-400 transition line-clamp-2 leading-snug mb-2">
                      {article.title}
                    </h3>

                    {/* 한국어 요약 또는 원문 일부 */}
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed font-serif">
                      {article.koreanSummary || article.paragraphs[0] || article.rawContent}
                    </p>
                  </div>

                  {/* 하단 메타 & 액션 */}
                  <div className="pt-3 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div>
                        작성일: <span className="text-slate-300">{article.articleDate}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        문단 {article.paragraphs.length}개 • 분석 {analyzedCount}문장 • 질문답변 {answeredQCount}개
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => handleDelete(e, article.id, article.title)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-700 rounded transition"
                        title="기사 삭제"
                        aria-label="기사 삭제"
                      >
                        🗑️
                      </button>
                      <span className="px-3 py-1 bg-red-600/90 group-hover:bg-red-600 text-white font-semibold text-xs rounded-lg transition shadow-xs">
                        학습하기 →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 등록 모달 */}
      <CnnNewsRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onArticleRegistered={(newArticle) => {
          refreshList();
          onSelectArticle(newArticle.id);
        }}
      />
    </div>
  );
};
