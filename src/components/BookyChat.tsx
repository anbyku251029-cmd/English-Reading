import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  BookOpen,
  Headphones,
  HelpCircle,
  MessageSquare,
  PenTool,
} from 'lucide-react';
import { Message, LearnerLevel } from '../types';
import { BookPreset } from '../data/presetBooks';
import { audioManager, speechService } from '../utils/audio';

interface BookyChatProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  currentBook: BookPreset;
  currentStep: number;
  onSetStep: (step: number) => void;
  learnerLevel: LearnerLevel;
}

export const BookyChat: React.FC<BookyChatProps> = ({
  messages,
  isLoading,
  onSendMessage,
  currentBook,
  currentStep,
  onSetStep,
  learnerLevel,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [activeVoiceSentence, setActiveVoiceSentence] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  // Toggle Voice Input
  const handleToggleMic = () => {
    if (isListeningMic) {
      speechService.stop();
      setIsListeningMic(false);
    } else {
      const started = speechService.start((res) => {
        if (res.transcript) {
          setInputText((prev) => (prev ? `${prev} ${res.transcript}` : res.transcript));
        }
      });
      if (started) {
        setIsListeningMic(true);
      } else {
        alert('마이크 사용이 지원되지 않거나 권한이 필요합니다.');
      }
    }
  };

  // Play audio of a message
  const handlePlayAudio = async (text: string) => {
    // Extract English portion or full text
    setActiveVoiceSentence(text);
    try {
      await audioManager.speak(text);
    } finally {
      setActiveVoiceSentence(null);
    }
  };

  // Quick Action Suggestions depending on current step
  const quickSuggestions = React.useMemo(() => {
    switch (currentStep) {
      case 1:
        return [
          '첫 번째 표현을 실생활에서 쓰는 다른 예문도 알려줘!',
          '표현 뜻은 이해했어! Step 2 섀도잉으로 넘어가자 🎙️',
          '원서 장면을 머릿속에 어떻게 그리면 좋을까?',
        ];
      case 2:
        return [
          '발음과 호흡 끊어읽기(리듬)를 한 번 더 강조해줘!',
          '소리 내어 따라 읽었어! 👏',
          '이제 책 스토리로 이야기 나누는 Step 3로 가자!',
        ];
      case 3:
        return [
          '내가 주인공이라면 너무 무서웠을 것 같아. 어떻게 생각해?',
          '이 상황으로 짧은 일상 롤플레잉(Role-play) 해보자!',
          '토론 재밌었어! Step 4 나만의 문장 만들기로 갈래 ✍️',
        ];
      case 4:
        return [
          '오늘 배운 표현으로 문장을 만들어봤어: ',
          '원어민들이 더 자주 쓰는 세련된 표현으로 다듬어줘!',
          '오늘 배운 4단계를 깔끔하게 총정리해줘! 📚',
        ];
      default:
        return [
          '오늘 공부 시작하자!',
          '1단계 핵심 표현부터 알려줘',
        ];
    }
  }, [currentStep]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Coaching Header */}
      <div className="px-5 py-3.5 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="font-bold text-sm text-slate-900">Booky</h3>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                Level: {learnerLevel.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">직독직해 &amp; 4단계 회화 확장 코칭 중</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-full">
            Step {currentStep} 진행 중
          </span>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/40">
        {messages.map((message) => {
          const isUser = message.role === 'user';
          const isSpeaking = activeVoiceSentence === message.content;

          return (
            <div
              key={message.id}
              className={`flex items-start gap-2.5 sm:gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                  isUser
                    ? 'bg-slate-900 text-white'
                    : 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>

              {/* Message Content */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-xs relative text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-xs'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                }`}
              >
                {/* Step Tag */}
                {!isUser && message.step && (
                  <div className="mb-2 flex items-center space-x-1.5">
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      Step {message.step}
                    </span>
                  </div>
                )}

                {/* Formatted Text */}
                <div className="whitespace-pre-wrap space-y-1 font-normal break-words">
                  {message.content.replace(/\[STEP:\s*[1-4]\]/gi, '').trim()}
                </div>

                {/* Audio button for Coach messages */}
                {!isUser && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <button
                      onClick={() => handlePlayAudio(message.content)}
                      className={`flex items-center space-x-1 hover:text-amber-700 transition ${
                        isSpeaking ? 'text-amber-600 font-bold' : ''
                      }`}
                      title="소리 내어 듣기"
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-bounce' : ''}`} />
                      <span>{isSpeaking ? '재생 중...' : '원어민 음성 듣기'}</span>
                    </button>
                    <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex items-center space-x-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              <span>Booky가 문맥과 발음을 분석하여 답변을 작성하고 있습니다...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestions */}
      <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-200/60 overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-2 min-w-max">
          <span className="text-[11px] font-bold text-amber-700 shrink-0">추천 대화:</span>
          {quickSuggestions.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (prompt.endsWith(': ')) {
                  setInputText(prompt);
                } else {
                  onSendMessage(prompt);
                }
              }}
              className="text-xs bg-white hover:bg-amber-50 hover:text-amber-900 border border-slate-200/80 text-slate-700 px-3 py-1 rounded-full transition shadow-xs whitespace-nowrap"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          {/* Microphone toggle */}
          <button
            type="button"
            onClick={handleToggleMic}
            className={`p-2.5 rounded-xl border transition ${
              isListeningMic
                ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title={isListeningMic ? '음성 인식 멈추기' : '음성으로 말하기 (Speech-to-Text)'}
          >
            {isListeningMic ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isListeningMic
                ? '마이크로 말씀해주세요... (음성이 텍스트로 자동 입력됩니다)'
                : 'Booky에게 영어 또는 한국어로 자유롭게 답변해보세요...'
            }
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:bg-white transition"
            disabled={isLoading}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white transition shadow-xs shrink-0 cursor-pointer"
            title="메시지 전송"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
