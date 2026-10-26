import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText } from 'lucide-react';
import { BookPreset } from '../data/presetBooks';
import { StudyPack, Message, KeyExpression } from '../types';

interface ExportNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBook: BookPreset;
  studyPack: StudyPack | null;
  messages: Message[];
  savedExpressions: KeyExpression[];
}

export const ExportNotesModal: React.FC<ExportNotesModalProps> = ({
  isOpen,
  onClose,
  currentBook,
  studyPack,
  messages,
  savedExpressions,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Build Markdown summary
  const generateMarkdown = () => {
    const dateStr = new Date().toLocaleDateString();
    let md = `# 📖 Booky 영어 원서 코칭 학습 노트\n\n`;
    md += `- **학습 일자:** ${dateStr}\n`;
    md += `- **선택 원서:** ${currentBook.title} (${currentBook.chapter})\n`;
    md += `- **작가:** ${currentBook.author} | **레벨:** ${currentBook.level}\n\n`;
    md += `---\n\n`;

    if (studyPack?.sceneSummary) {
      md += `## 🌟 장면 시각화 (Context Summary)\n${studyPack.sceneSummary}\n\n`;
    }

    if (studyPack?.keyExpressions && studyPack.keyExpressions.length > 0) {
      md += `## 🔑 Step 1: 핵심 회화 표현 (Key Expressions)\n`;
      studyPack.keyExpressions.forEach((k, i) => {
        md += `### ${i + 1}. **${k.expression}**\n`;
        md += `- **일상 의미:** ${k.everydayMeaning}\n`;
        md += `- **원서 문맥:** ${k.inContext}\n`;
        md += `- **실전 예문:** *${k.dailyExample}* (${k.dailyExampleMeaning})\n\n`;
      });
    }

    if (studyPack?.shadowingSentences && studyPack.shadowingSentences.length > 0) {
      md += `## 🎙️ Step 2: 낭독 & 섀도잉 연습 문장\n`;
      studyPack.shadowingSentences.forEach((s, i) => {
        md += `${i + 1}. **"${s.sentence}"**\n`;
        md += `   - 끊어읽기: \`${s.rhythmChunks}\`\n`;
        md += `   - 리듬 코칭: ${s.rhythmTip}\n\n`;
      });
    }

    if (messages.length > 1) {
      md += `## 💬 오늘 Booky와 나눈 대화 하이라이트\n`;
      messages.slice(1).forEach((m) => {
        const sender = m.role === 'user' ? '👤 Learner' : '📚 Booky Coach';
        md += `**${sender}:**\n> ${m.content.replace(/\n/g, '\n> ')}\n\n`;
      });
    }

    return md;
  };

  const mdContent = generateMarkdown();

  const handleCopy = () => {
    navigator.clipboard.writeText(mdContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Booky_${currentBook.title.replace(/[^a-zA-Z0-9]/g, '_')}_Notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">오늘의 원서 코칭 노트 내보내기</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>마크다운(.md) 형식 미리보기:</span>
            <span>노션(Notion), 옵시디언, 굿노트에 바로 붙여넣을 수 있습니다.</span>
          </div>

          <pre className="p-4 bg-white border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-[350px]">
            {mdContent}
          </pre>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">총 {messages.length}개 대화 기록 포함</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '복사 완료!' : '클립보드에 복사'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>.md 파일로 다운로드</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
