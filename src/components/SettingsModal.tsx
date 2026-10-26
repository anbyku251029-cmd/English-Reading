import React from 'react';
import { X, Sliders, Volume2, Sparkles, BookOpen, Check, Copy } from 'lucide-react';
import { LearnerLevel } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  learnerLevel: LearnerLevel;
  onUpdateLevel: (level: LearnerLevel) => void;
  preferredVoice: string;
  onUpdateVoice: (voice: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  learnerLevel,
  onUpdateLevel,
  preferredVoice,
  onUpdateVoice,
}) => {
  const [copiedPrompt, setCopiedPrompt] = React.useState(false);

  if (!isOpen) return null;

  const handleCopyPrompt = () => {
    const promptText = `# Role & Identity
You are "Booky", an expert English Reading & Conversation AI Coach. Your mission is to help learners read English books naturally without word-for-word translation and expand what they read into fluent everyday conversation.

# Core Pedagogical Principles (학습 코칭 원칙)
1. **i-1 / 80~90% Comprehension:** Ensure the material fits the learner's level. Prioritize natural reading flow over rigid grammar parsing.
2. **Context Over Translation:** Discourage direct Korean translation. Encourage understanding the narrative context and scene imagery.
3. **Sentence-Level Mastery & Shadowing:** Guide learners to repeat and internalize full sentences (Read Aloud/Shadowing) rather than memorizing isolated vocabulary lists.
4. **Conversation Expansion:** Transition naturally from reading comprehension to real-life conversation, book discussion, and role-play.

# Operational Modes (대화 진행 4단계)
### Step 1: Key Expressions & Reading Guide (원서 분석 & 핵심 표현)
### Step 2: Read Aloud & Shadowing Practice (소리 내어 따라 읽기)
### Step 3: Book Discussion & Role-play (스토리 기반 회화 확장)
### Step 4: Personal Output (나만의 문장 만들기)

# Interaction & Tone Rules
- Tone: Enthusiastic, supportive, friendly, and highly encouraging.
- Language Balance: Use Korean for instructional guidance, but conduct speaking/discussion prompts in clear, accessible English.
- One Step at a Time: Keep responses focused and concise. Ask only ONE primary question per turn.`;

    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">학습 코칭 및 음성 설정</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Learner Level Selection */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
              내 영어 회화 레벨 (Learner Level)
            </label>
            <p className="text-xs text-slate-500">
              Booky가 질문하는 영문 어휘의 난이도와 피드백의 디테일을 조절합니다.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { key: 'beginner', label: '초급 (Beginner)', desc: '쉬운 단어 & 명확한 문장' },
                { key: 'intermediate', label: '중급 (Intermediate)', desc: '자연스러운 원어민 표현' },
                { key: 'advanced', label: '고급 (Advanced)', desc: '섬세한 뉘앙스 & 이디엄' },
              ].map((lvl) => (
                <button
                  key={lvl.key}
                  type="button"
                  onClick={() => onUpdateLevel(lvl.key as LearnerLevel)}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    learnerLevel === lvl.key
                      ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-400/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs">{lvl.label}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{lvl.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice selection for TTS */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Volume2 className="w-4 h-4 text-amber-600" />
              <span>Booky 원어민 음성 (TTS Voice)</span>
            </label>
            <p className="text-xs text-slate-500">
              Gemini TTS 고품질 보이스로 문장과 표현의 원어민 발음을 들려줍니다.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { name: 'Kore', label: 'Kore (따뜻하고 명확한 여성 톤)' },
                { name: 'Puck', label: 'Puck (경쾌하고 친근한 남성 톤)' },
                { name: 'Zephyr', label: 'Zephyr (차분하고 정돈된 톤)' },
                { name: 'Fenrir', label: 'Fenrir (깊고 신뢰감 있는 톤)' },
              ].map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => onUpdateVoice(v.name)}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    preferredVoice === v.name
                      ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-400/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs">{v.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Pedagogical Principles Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Booky 학습 코칭 원칙</span>
              </span>
              <button
                onClick={handleCopyPrompt}
                className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold flex items-center space-x-1"
                title="Google AI Studio용 시스템 프롬프트 복사"
              >
                {copiedPrompt ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPrompt ? '프롬프트 복사됨!' : '전체 프롬프트 복사'}</span>
              </button>
            </div>

            <ul className="text-xs text-slate-600 space-y-1.5 pl-4 list-disc leading-relaxed">
              <li>
                <strong>i-1 / 80~90% Comprehension:</strong> 학습자 수준에 맞는 원서로 직독직해 유도
              </li>
              <li>
                <strong>Context Over Translation:</strong> 단어별 직역 대신 장면 시각화와 문맥 이해
              </li>
              <li>
                <strong>Sentence-Level Mastery &amp; Shadowing:</strong> 단어 암기 대신 문장 단위 낭독 및 섀도잉
              </li>
              <li>
                <strong>Conversation Expansion:</strong> 독해에서 일상 회화, 토론, 롤플레잉으로 자연스러운 확장
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition"
          >
            설정 저장 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
