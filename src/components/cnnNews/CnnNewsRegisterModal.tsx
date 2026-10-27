/**
 * Booky STEP 09: CNN 뉴스 자료 등록 모달 (CnnNewsRegisterModal.tsx)
 * 
 * - .txt, .md, .html 파일 업로드 또는 직접 텍스트 입력 지원
 * - 스크립트 실행 없는 안전 파싱 및 XSS 방지
 * - 제목, 출처, 작성일, 주제, 한국어 요약, 문단 미리보기 및 수정
 * - 비지원 형식(.pdf, .docx 등) 친절한 안내 제공
 */

import React, { useState, useRef } from 'react';
import { parseNewsFile } from '../../utils/newsFileParser';
import { addNewsArticle } from '../../utils/cnnNewsStorage';
import { CnnNewsArticle } from '../../types';

interface CnnNewsRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onArticleRegistered: (newArticle: CnnNewsArticle) => void;
}

const TOPIC_OPTIONS = [
  'World',
  'Politics',
  'Economy & Business',
  'Science & Technology',
  'Climate & Environment',
  'Society & Culture',
  'Health',
  'Opinion & Analysis',
];

export const CnnNewsRegisterModal: React.FC<CnnNewsRegisterModalProps> = ({
  isOpen,
  onClose,
  onArticleRegistered,
}) => {
  const [tab, setTab] = useState<'file' | 'direct'>('file');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 등록할 폼 데이터
  const [title, setTitle] = useState<string>('');
  const [source, setSource] = useState<string>('CNN');
  const [articleDate, setArticleDate] = useState<string>('미확인');
  const [topic, setTopic] = useState<string>('World');
  const [koreanSummary, setKoreanSummary] = useState<string>('');
  const [rawContent, setRawContent] = useState<string>('');
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [fileType, setFileType] = useState<'txt' | 'md' | 'html' | 'manual'>('manual');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setSelectedFileName('');
    setErrorMessage(null);
    setTitle('');
    setSource('CNN');
    setArticleDate('미확인');
    setTopic('World');
    setKoreanSummary('');
    setRawContent('');
    setParagraphs([]);
    setFileType('manual');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 1. 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      const result = parseNewsFile(file.name, text, file.size);

      if (!result.success) {
        setErrorMessage(result.error || '파일을 분석할 수 없습니다.');
        return;
      }

      setTitle(result.title || file.name.replace(/\.[^/.]+$/, ''));
      setSource(result.source || 'CNN');
      setArticleDate(result.articleDate || '미확인');
      setRawContent(result.rawContent || text);
      setParagraphs(result.paragraphs || [text]);
      setFileType(result.fileType || 'txt');
    };

    reader.onerror = () => {
      setErrorMessage('파일을 읽는 도중 오류가 발생했습니다.');
    };

    reader.readAsText(file, 'utf-8');
  };

  // 2. 직접 텍스트 입력 시 실시간 문단 분할
  const handleDirectContentChange = (content: string) => {
    setRawContent(content);
    const parsed = content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    setParagraphs(parsed);
    setFileType('manual');
  };

  // 3. 등록 제출
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMessage('뉴스 제목을 입력해주세요.');
      return;
    }

    if (!rawContent.trim() || paragraphs.length === 0) {
      setErrorMessage('뉴스 원문 본문을 입력하거나 파일을 업로드해주세요.');
      return;
    }

    try {
      const created = addNewsArticle({
        title: title.trim(),
        source: source.trim() || 'CNN',
        articleDate: articleDate.trim() || '미확인',
        topic,
        rawContent,
        paragraphs,
        koreanSummary: koreanSummary.trim(),
        fileName: selectedFileName || 'manual-input.txt',
        fileType,
      });

      onArticleRegistered(created);
      handleClose();
    } catch (err: any) {
      setErrorMessage(`기사 등록 실패: ${err?.message || '알 수 없는 오류'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        role="dialog"
        aria-labelledby="register-news-title"
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-red-50 to-rose-50 dark:from-slate-800 dark:to-slate-800/80">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-red-600/10 text-red-600 dark:text-red-400 rounded-xl text-xl font-black">
              CNN
            </span>
            <div>
              <h2 id="register-news-title" className="text-xl font-bold text-slate-900 dark:text-white">
                CNN 뉴스 자료 등록 (C2 Study)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                보유하신 CNN 뉴스 기사를 안전하게 등록하고 C2 고급 독해·어휘·작문 학습을 시작하세요
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 탭 전환 (파일 업로드 vs 직접 입력) */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex space-x-4 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-semibold">
          <button
            onClick={() => setTab('file')}
            className={`pb-2.5 border-b-2 transition ${
              tab === 'file'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📁 파일 업로드 (.txt, .md, .html)
          </button>
          <button
            onClick={() => setTab('direct')}
            className={`pb-2.5 border-b-2 transition ${
              tab === 'direct'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ✍️ 직접 텍스트 붙여넣기
          </button>
        </div>

        {/* 오류 메시지 배너 */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex justify-between items-center">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* 본문 폼 스크롤 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === 'file' ? (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 text-center bg-slate-50/40 dark:bg-slate-800/40">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.html,.htm"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 dark:file:bg-slate-700 dark:file:text-slate-200"
              />
              <p className="text-[11px] text-slate-400 mt-2">
                지원 형식: <strong>.txt, .md, .html</strong> (최대 5MB, 스크립트 실행 없는 안전 파싱)
              </p>
              {selectedFileName && (
                <div className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ 선택된 파일: {selectedFileName} ({paragraphs.length}개 문단 추출 완료)
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                뉴스 원문 붙여넣기 (빈 줄로 문단을 구분합니다)
              </label>
              <textarea
                rows={6}
                value={rawContent}
                onChange={(e) => handleDirectContentChange(e.target.value)}
                placeholder="CNN 뉴스 기사 영문 본문을 여기에 붙여넣으세요..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white font-mono leading-relaxed"
              />
            </div>
          )}

          {/* 기사 메타데이터 입력 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                기사 제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: Global Central Banks Face Complex Dilemma"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                주제 분야 (Topic)
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                {TOPIC_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                출처 (Source)
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="CNN"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                기사 작성일 (알 수 없으면 미확인)
              </label>
              <input
                type="text"
                value={articleDate}
                onChange={(e) => setArticleDate(e.target.value)}
                placeholder="YYYY-MM-DD 또는 미확인"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* 한국어 요약 (선택 사항) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              한국어 배경 요약 (사용자가 작성하는 핵심 개요, 선택)
            </label>
            <textarea
              rows={2}
              value={koreanSummary}
              onChange={(e) => setKoreanSummary(e.target.value)}
              placeholder="기사의 핵심 배경이나 개인적인 관심 사항을 자유롭게 적어두세요."
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* 추출된 문단 미리보기 */}
          {paragraphs.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <span>📖 본문 문단 미리보기 ({paragraphs.length}개 문단)</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  총 {rawContent.length.toLocaleString()} 글자
                </span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto text-xs text-slate-600 dark:text-slate-300 font-serif leading-relaxed pr-1">
                {paragraphs.slice(0, 3).map((p, idx) => (
                  <p key={idx} className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <span className="font-bold text-red-600 mr-1.5">¶{idx + 1}</span>
                    {p}
                  </p>
                ))}
                {paragraphs.length > 3 && (
                  <p className="text-center text-[11px] text-slate-400 pt-1">
                    외 {paragraphs.length - 3}개의 문단이 더 등록됩니다.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 푸터 액션 */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="text-[11px] text-slate-400">
              🔒 100% 브라우저 로컬 저장으로 기사가 안전하게 보관됩니다.
            </span>
            <div className="space-x-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!title.trim() || paragraphs.length === 0}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:opacity-50 transition"
              >
                뉴스 등록 확정
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
