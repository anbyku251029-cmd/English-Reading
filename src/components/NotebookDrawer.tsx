import React from 'react';
import { X, Bookmark, Volume2, Trash2, Copy, Check, Download, BookOpen } from 'lucide-react';
import { KeyExpression } from '../types';
import { audioManager } from '../utils/audio';

interface NotebookDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedExpressions: KeyExpression[];
  onRemoveExpression: (expression: string) => void;
  onClearAll: () => void;
}

export const NotebookDrawer: React.FC<NotebookDrawerProps> = ({
  isOpen,
  onClose,
  savedExpressions,
  onRemoveExpression,
  onClearAll,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopyAll = () => {
    if (savedExpressions.length === 0) return;
    const text = savedExpressions
      .map(
        (e, i) =>
          `${i + 1}. ${e.expression}\n- 일상 의미: ${e.everydayMeaning}\n- 문맥: ${e.inContext}\n- 예문: ${e.dailyExample} (${e.dailyExampleMeaning})\n`
      )
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (savedExpressions.length === 0) return;
    const content = `# 📚 Booky 영어 원서 표현 노트\n\n저장 일시: ${new Date().toLocaleDateString()}\n\n` +
      savedExpressions
        .map(
          (e, i) =>
            `### ${i + 1}. **${e.expression}**\n- **일상 의미:** ${e.everydayMeaning}\n- **원서 문맥:** ${e.inContext}\n- **실전 예문:** *${e.dailyExample}*\n  > ${e.dailyExampleMeaning}\n`
        )
        .join('\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Booky_StudyNotes_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bookmark className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">내 표현 노트 (My Expressions)</h2>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              {savedExpressions.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        {savedExpressions.length > 0 && (
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyAll}
                className="flex items-center space-x-1 text-slate-600 hover:text-amber-800 font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '복사됨!' : '전체 복사'}</span>
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="flex items-center space-x-1 text-slate-600 hover:text-amber-800 font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.md 다운로드</span>
              </button>
            </div>
            <button
              onClick={onClearAll}
              className="text-slate-400 hover:text-rose-600 transition"
              title="단어장 전체 비우기"
            >
              전체 삭제
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {savedExpressions.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">저장된 표현이 없습니다.</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                '원서 분석 &amp; 표현' 탭에서 북마크 아이콘을 클릭하여 마음에 드는 핵심 표현을 내 단어장에 보관하세요!
              </p>
            </div>
          ) : (
            savedExpressions.map((e, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-amber-300 transition space-y-2 relative group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-slate-900 text-sm">{e.expression}</span>
                    <button
                      onClick={() => audioManager.speak(e.expression)}
                      className="text-slate-400 hover:text-amber-600 transition"
                      title="발음 듣기"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemoveExpression(e.expression)}
                    className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition p-1"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs font-medium text-amber-900 bg-amber-50/60 p-2 rounded-lg">
                  💡 {e.everydayMeaning}
                </p>

                <div className="text-xs text-slate-600 space-y-0.5 pt-1">
                  <p className="font-medium text-slate-800">예문: {e.dailyExample}</p>
                  <p className="text-slate-400 text-[11px]">{e.dailyExampleMeaning}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
