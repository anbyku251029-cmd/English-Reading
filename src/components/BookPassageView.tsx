import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Volume2,
  Square,
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
  Headphones,
  Check,
  Bookmark,
  Sliders,
  Type,
  Copy,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  Circle,
  Pause,
  Info,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Mic,
  MicOff,
  Trash2,
  RefreshCw,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { BookPreset } from '../data/presetBooks';
import { StudyPack, KeyExpression } from '../types';
import { audioManager } from '../utils/audio';

interface VocabNoteItem {
  word: string;
  note: string;
  bookTitle?: string;
  chapterTitle?: string;
  savedAt?: string;
}

interface BookPassageViewProps {
  book: BookPreset;
  studyPack?: StudyPack | null;
  isLoadingStudyPack?: boolean;
  onSelectShadowingSentence?: (sentence: string) => void;
  onSaveExpression: (expr: KeyExpression) => void;
  savedExpressions: KeyExpression[];
  currentStep: number;
  onSetStep?: (step: number) => void;
  onSelectChapter?: (chapterNumber: number) => void;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  hasPrevChapter?: boolean;
  hasNextChapter?: boolean;
}

type CoreStudyTab = 'reading' | 'listening' | 'speaking';

export const BookPassageView: React.FC<BookPassageViewProps> = ({
  book,
  onSaveExpression,
  savedExpressions,
  currentStep,
  onSetStep,
  onSelectChapter,
  onNextChapter,
  onPrevChapter,
  hasPrevChapter,
  hasNextChapter,
}) => {
  // 3대 핵심 학습 탭: 읽기(READ) • 듣기(LISTEN) • 말하기(SPEAK)
  const [activeTab, setActiveTab] = useState<CoreStudyTab>('reading');

  // Font size & line height control with persistence
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('booky_font_size');
      return saved ? Number(saved) : 18;
    } catch {
      return 18;
    }
  });

  const changeFontSize = (newSize: number) => {
    const clamped = Math.min(32, Math.max(14, newSize));
    setFontSize(clamped);
    try {
      localStorage.setItem('booky_font_size', String(clamped));
    } catch {}
  };

  // Scroll Container Ref
  const readingScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollToTop = () => {
    readingScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Web Speech API state
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(0.92);
  const [isSpeechPaused, setIsSpeechPaused] = useState<boolean>(false);
  const [playingSentence, setPlayingSentence] = useState<string | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState<boolean>(false);
  const [currentReadingIndex, setCurrentReadingIndex] = useState<number | null>(null);
  const stopPlayAllRef = useRef<boolean>(false);
  const sentenceRefs = useRef<(HTMLElement | null)[]>([]);

  // Split passage into sentences or use paragraphs
  const sentences = useMemo(() => {
    if (book.paragraphs && book.paragraphs.length > 0) {
      return book.paragraphs.map((p) => p.content.trim()).filter(Boolean);
    }
    return book.passage
      .split(/(?<=[.?!])\s+(?=[A-Z"])/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [book.passage, book.paragraphs]);

  // Load English voices
  useEffect(() => {
    const updateVoices = () => {
      const voices = audioManager.getEnglishVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        if (!selectedVoiceName) {
          const preferred =
            voices.find(
              (v) =>
                v.name.includes('Natural') ||
                v.name.includes('Google') ||
                v.name.includes('Samantha') ||
                v.name.includes('Karen')
            ) || voices[0];
          setSelectedVoiceName(preferred.name);
        }
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
    const t1 = setTimeout(updateVoices, 300);
    const t2 = setTimeout(updateVoices, 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [selectedVoiceName]);

  // Selected Sentence for Study Tools
  const [selectedSentence, setSelectedSentence] = useState<string>('');
  const [selectedSentenceIndex, setSelectedSentenceIndex] = useState<number | null>(null);
  const [targetSentence, setTargetSentence] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Restore saved lastParagraphIndex on chapter load
  useEffect(() => {
    try {
      const saved = localStorage.getItem('booky_reading_progress');
      if (saved) {
        const progress = JSON.parse(saved);
        if (
          progress.bookId === book.dbBookId &&
          progress.chapterId === book.dbChapterId &&
          typeof progress.lastParagraphIndex === 'number' &&
          progress.lastParagraphIndex >= 0 &&
          progress.lastParagraphIndex < sentences.length
        ) {
          const idx = progress.lastParagraphIndex;
          setSelectedSentenceIndex(idx);
          if (sentences[idx]) {
            setSelectedSentence(sentences[idx]);
            setTargetSentence(sentences[idx]);
          }
          setTimeout(() => {
            sentenceRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 350);
        } else if (sentences.length > 0) {
          setSelectedSentenceIndex(0);
          setSelectedSentence(sentences[0]);
          setTargetSentence(sentences[0]);
        }
      } else if (sentences.length > 0) {
        setSelectedSentenceIndex(0);
        setSelectedSentence(sentences[0]);
        setTargetSentence(sentences[0]);
      }
    } catch {}
  }, [book.dbBookId, book.dbChapterId, sentences]);

  // Save reading position helper
  const saveReadingPosition = (index: number) => {
    if (book.dbBookId && book.dbChapterId) {
      try {
        const progress = {
          bookId: book.dbBookId,
          chapterId: book.dbChapterId,
          lastParagraphIndex: index,
          lastReadAt: new Date().toISOString(),
        };
        localStorage.setItem('booky_reading_progress', JSON.stringify(progress));
      } catch {}
    }
  };

  // Tab synchronization with Header & App: 1 = reading, 2 = listening, 3 = speaking
  useEffect(() => {
    if (currentStep === 1) setActiveTab('reading');
    else if (currentStep === 2) setActiveTab('listening');
    else if (currentStep === 3) setActiveTab('speaking');
  }, [currentStep]);

  const handleTabChange = (tab: CoreStudyTab) => {
    setActiveTab(tab);
    if (tab === 'reading') onSetStep?.(1);
    else if (tab === 'listening') onSetStep?.(2);
    else if (tab === 'speaking') onSetStep?.(3);
  };

  // Automatically scroll currently read sentence into view
  useEffect(() => {
    if (currentReadingIndex !== null && sentenceRefs.current[currentReadingIndex]) {
      sentenceRefs.current[currentReadingIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentReadingIndex]);

  // Hard stop speech when chapter or book changes
  useEffect(() => {
    handleStopSpeech();
  }, [book.id, book.chapter]);

  // Web Speech Actions
  const handlePlaySentence = async (text: string) => {
    if (!text.trim()) return;
    if (!audioManager.isSpeechSupported()) {
      alert('현재 브라우저 환경에서는 Web Speech 음성 합성이 지원되지 않습니다.');
      return;
    }
    handleStopSpeech();
    setPlayingSentence(text);
    try {
      await audioManager.speakSentence(text, speechRate, selectedVoiceName);
    } catch (err) {
      console.warn('Speech error:', err);
    } finally {
      setPlayingSentence(null);
    }
  };

  const handlePlayAll = async () => {
    if (isPlayingAll) return;
    if (!audioManager.isSpeechSupported()) {
      alert('현재 브라우저 환경에서는 Web Speech 음성 합성이 지원되지 않습니다.');
      return;
    }
    stopPlayAllRef.current = false;
    setIsPlayingAll(true);
    setIsSpeechPaused(false);

    const startIndex = selectedSentenceIndex !== null ? selectedSentenceIndex : 0;
    for (let i = startIndex; i < sentences.length; i++) {
      if (stopPlayAllRef.current) break;
      const s = sentences[i];
      setCurrentReadingIndex(i);
      setSelectedSentenceIndex(i);
      setSelectedSentence(s);
      setTargetSentence(s);
      setPlayingSentence(s);
      saveReadingPosition(i);

      try {
        await audioManager.speakSentence(s, speechRate, selectedVoiceName);
      } catch (err) {
        console.warn('Playback error for sentence:', err);
      }

      if (stopPlayAllRef.current) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    setIsPlayingAll(false);
    setIsSpeechPaused(false);
    setPlayingSentence(null);
    setCurrentReadingIndex(null);
  };

  const handlePauseSpeech = () => {
    audioManager.pause();
    setIsSpeechPaused(true);
  };

  const handleResumeSpeech = () => {
    audioManager.resume();
    setIsSpeechPaused(false);
  };

  const handleStopSpeech = () => {
    stopPlayAllRef.current = true;
    audioManager.stop();
    setIsPlayingAll(false);
    setIsSpeechPaused(false);
    setPlayingSentence(null);
    setCurrentReadingIndex(null);
  };

  // Copy selected sentence
  const handleCopySentence = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
      showToast('문장이 클립보드에 복사되었습니다.');
    } catch {}
  };

  // Quick save expression from selected sentence
  const handleSaveSelectedAsExpression = (text: string) => {
    if (!text) return;
    const clean = text.slice(0, 60);
    const expr: KeyExpression = {
      expression: clean,
      inContext: text,
      everydayMeaning: `[${book.title} Ch.${book.currentChapterNumber || ''}] 직접 스크랩한 표현`,
      dailyExample: clean,
      dailyExampleMeaning: '내가 저장한 원서 표현 예문',
    };
    onSaveExpression(expr);
    showToast(`단어장에 저장되었습니다: "${clean.slice(0, 25)}..."`);
  };

  // =========================================================================
  // 3. 말하기 (SPEAK) — MediaRecorder 발음 녹음 & 섀도잉
  // =========================================================================
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    setMicError(null);
    if (recordedAudioUrl) {
      try {
        URL.revokeObjectURL(recordedAudioUrl);
      } catch {}
      setRecordedAudioUrl(null);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone access error:', err);
      setMicError('마이크 장치에 접근할 수 없습니다. 브라우저 주소창 설정에서 마이크 권한을 허용해 주시거나, 대체 낭독 연습(소리 내어 3회 읽기)을 진행해 주세요.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteRecording = () => {
    if (recordedAudioUrl) {
      try {
        URL.revokeObjectURL(recordedAudioUrl);
      } catch {}
      setRecordedAudioUrl(null);
      showToast('녹음이 삭제되었습니다.');
    }
  };

  // Cleanup media resources on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (recordedAudioUrl) {
        try {
          URL.revokeObjectURL(recordedAudioUrl);
        } catch {}
      }
    };
  }, [recordedAudioUrl]);

  // Navigate paragraphs
  const handleSelectParagraph = (idx: number) => {
    if (idx < 0 || idx >= sentences.length) return;
    setSelectedSentenceIndex(idx);
    setSelectedSentence(sentences[idx]);
    setTargetSentence(sentences[idx]);
    saveReadingPosition(idx);
    sentenceRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleNextParagraph = () => {
    const cur = selectedSentenceIndex !== null ? selectedSentenceIndex : 0;
    if (cur < sentences.length - 1) {
      handleSelectParagraph(cur + 1);
    }
  };

  const handlePrevParagraph = () => {
    const cur = selectedSentenceIndex !== null ? selectedSentenceIndex : 0;
    if (cur > 0) {
      handleSelectParagraph(cur - 1);
    }
  };

  const isPrologue =
    book.currentChapterNumber === 0 || book.chapter.toLowerCase().includes('prologue');
  const chapterDisplayLabel = isPrologue
    ? 'Prologue'
    : `Chapter ${book.currentChapterNumber || 1}`;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* 1. Header & 3-Mode Tab Selector */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">
              원서 학습 스튜디오 (읽기 • 듣기 • 말하기)
            </h2>
            {book.dbBookId && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300/60">
                SQLite 도서 #{book.bookNumber || ''}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500">
            {/* Font size control */}
            <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
              <button
                type="button"
                onClick={() => changeFontSize(fontSize - 2)}
                disabled={fontSize <= 14}
                className="px-2 py-0.5 rounded text-xs font-extrabold text-slate-700 hover:bg-white disabled:opacity-30 transition cursor-pointer"
                title="글자 축소"
              >
                A-
              </button>
              <span className="px-1 text-[11px] font-mono text-slate-600 font-semibold">{fontSize}</span>
              <button
                type="button"
                onClick={() => changeFontSize(fontSize + 2)}
                disabled={fontSize >= 32}
                className="px-2 py-0.5 rounded text-xs font-extrabold text-slate-700 hover:bg-white disabled:opacity-30 transition cursor-pointer"
                title="글자 확대"
              >
                A+
              </button>
            </div>
          </div>
        </div>

        {/* 3대 핵심 학습 탭 (READ • LISTEN • SPEAK) */}
        <div className="flex rounded-xl bg-slate-100 p-1 space-x-1 text-xs font-bold">
          <button
            onClick={() => handleTabChange('reading')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'reading'
                ? 'bg-amber-500 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>1. 읽기 (READ)</span>
            <span className="text-[10px] opacity-80">({sentences.length}문단)</span>
          </button>
          <button
            onClick={() => handleTabChange('listening')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'listening'
                ? 'bg-amber-500 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>2. 듣기 (LISTEN)</span>
          </button>
          <button
            onClick={() => handleTabChange('speaking')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'speaking'
                ? 'bg-amber-500 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>3. 말하기 (SPEAK)</span>
          </button>
        </div>
      </div>

      {/* 2. Main Tab Content Area */}
      <div ref={readingScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Transparent Local Notice Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-950">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-amber-900 mr-1">[로컬 전용 무결점 학습 모드]</span>
              외부 AI API(Gemini, OpenAI 등) 연결 없이 브라우저 내장 Web Speech API와 안전한 로컬 저장소를 통해 빠르고 사생활 침해 없이 학습합니다.
            </div>
          </div>

          {/* Book Metadata & Chapter Switcher Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/60">
                {book.series ? `${book.series} #${book.bookNumber || ''}` : book.level}
              </span>
              <span className="text-xs text-slate-400">{book.author}</span>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">{book.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-amber-900 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                  {chapterDisplayLabel}
                </span>
                <span className="text-xs text-slate-600 font-semibold truncate">
                  {book.chapter.replace(/^\d+\.\s*/, '')}
                </span>
              </div>
            </div>

            {/* Quick Paragraph Navigation & Position Info */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">
                현재 위치: <strong className="text-amber-800">¶ {(selectedSentenceIndex !== null ? selectedSentenceIndex : 0) + 1}</strong> / {sentences.length} 문단
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevParagraph}
                  disabled={selectedSentenceIndex === 0}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold disabled:opacity-30 transition"
                >
                  이전 문단
                </button>
                <button
                  type="button"
                  onClick={handleNextParagraph}
                  disabled={selectedSentenceIndex === sentences.length - 1}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold disabled:opacity-30 transition"
                >
                  다음 문단
                </button>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* TAB 1: 읽기 — READ                                                */}
          {/* ================================================================= */}
          {activeTab === 'reading' && (
            <div className="space-y-4">
              <div className="space-y-3 font-serif">
                {sentences.map((sentence, idx) => {
                  const isCurrent = currentReadingIndex === idx;
                  const isSelected = selectedSentenceIndex === idx;

                  return (
                    <article
                      key={idx}
                      ref={(el) => {
                        sentenceRefs.current[idx] = el;
                      }}
                      onClick={() => handleSelectParagraph(idx)}
                      className={`p-4 sm:p-5 rounded-2xl transition-all duration-200 cursor-pointer border ${
                        isSelected
                          ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-300/60 shadow-sm'
                          : isCurrent
                          ? 'bg-amber-100/95 border-amber-500 ring-2 ring-amber-400 shadow-sm'
                          : 'bg-white hover:bg-slate-50/80 border-slate-200/80 hover:border-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-sans select-none">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded text-[11px]">
                            ¶ {idx + 1}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                              현재 읽는 위치
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlaySentence(sentence);
                            }}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 text-[11px] font-semibold flex items-center gap-1 transition"
                            title="이 문단 음성 듣기"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                            <span>듣기</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectParagraph(idx);
                              handleTabChange('speaking');
                            }}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 text-[11px] font-semibold flex items-center gap-1 transition"
                            title="이 문단 따라 말하기 스튜디오로 이동"
                          >
                            <Mic className="w-3.5 h-3.5 text-amber-600" />
                            <span>말하기</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveSelectedAsExpression(sentence);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-amber-700 hover:bg-amber-50"
                            title="단어장에 표현 저장"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p
                        style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
                        className="text-slate-800 cursor-text select-text tracking-normal"
                      >
                        {sentence}
                      </p>
                    </article>
                  );
                })}
              </div>

              {/* Step Navigation to Listen */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  원문을 다 읽으셨나요? 원어민 발음으로 본문을 청취해 보세요.
                </span>
                <button
                  type="button"
                  onClick={() => handleTabChange('listening')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <span>2단계: 음성 듣기로 이동</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: 듣기 — LISTEN                                              */}
          {/* ================================================================= */}
          {activeTab === 'listening' && (
            <div className="space-y-4">
              {/* Audio Player Control Bar */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-amber-600" />
                      <span>Web Speech 오디오 플레이어</span>
                    </h4>
                    <p className="text-[11px] text-amber-700/90 mt-0.5">
                      ※ 본 음성은 브라우저 내장 합성 음성(TTS)이며, 외부 서버 연결 없이 로컬에서 즉시 합성됩니다.
                    </p>
                  </div>

                  {/* Speech Rate Controls */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400 text-[11px] mr-1">배속:</span>
                    {[0.8, 0.9, 1.0, 1.2].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSpeechRate(r)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border transition ${
                          speechRate === r
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {r}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice Selection */}
                {availableVoices.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-semibold shrink-0">음성 선택:</span>
                    <select
                      value={selectedVoiceName}
                      onChange={(e) => setSelectedVoiceName(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs w-full max-w-sm focus:outline-none focus:border-amber-500"
                    >
                      {availableVoices.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Playback Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {!isPlayingAll ? (
                    <button
                      type="button"
                      onClick={handlePlayAll}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>현재 문단부터 전체 낭독</span>
                    </button>
                  ) : (
                    <>
                      {!isSpeechPaused ? (
                        <button
                          type="button"
                          onClick={handlePauseSpeech}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
                        >
                          <Pause className="w-4 h-4" />
                          <span>일시 정지</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResumeSpeech}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>계속 듣기</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleStopSpeech}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
                      >
                        <Square className="w-3.5 h-3.5 fill-white" />
                        <span>낭독 정지</span>
                      </button>
                    </>
                  )}

                  {selectedSentence && (
                    <button
                      type="button"
                      onClick={() => handlePlaySentence(selectedSentence)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>현재 선택 문단만 듣기</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Paragraphs in Listening Mode */}
              <div className="space-y-3 font-serif">
                {sentences.map((sentence, idx) => {
                  const isCurrent = currentReadingIndex === idx;
                  const isSelected = selectedSentenceIndex === idx;

                  return (
                    <div
                      key={idx}
                      ref={(el) => {
                        sentenceRefs.current[idx] = el;
                      }}
                      onClick={() => handleSelectParagraph(idx)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-100/95 border-amber-500 shadow-md ring-2 ring-amber-400 font-semibold'
                          : isSelected
                          ? 'bg-amber-50/80 border-amber-300'
                          : 'bg-white border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-sans">
                        <span className="font-mono font-bold text-amber-800">¶ {idx + 1}</span>
                        {isCurrent && (
                          <span className="font-bold text-amber-800 flex items-center gap-1 animate-pulse">
                            <Volume2 className="w-3.5 h-3.5" />
                            낭독 재생 중...
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }} className="text-slate-800">
                        {sentence}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Step Navigation to Speak */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleTabChange('reading')}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>1단계: 읽기로</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('speaking')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <span>3단계: 말하기로 이동</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: 말하기 — SPEAK                                             */}
          {/* ================================================================= */}
          {activeTab === 'speaking' && (
            <div className="space-y-5">
              {/* Target Passage Speaking Studio */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-amber-600" />
                    <span>오늘 소리 내어 연습할 목표 문단 (¶ {(selectedSentenceIndex !== null ? selectedSentenceIndex : 0) + 1})</span>
                  </span>
                  <span className="text-[11px] text-slate-400">직접 낭독 &amp; 녹음 스튜디오</span>
                </div>

                {/* Target Text Box */}
                <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  <p
                    style={{ fontSize: `${fontSize + 1}px`, lineHeight: 1.8 }}
                    className="font-serif font-bold text-slate-900"
                  >
                    "{targetSentence || '학습할 문단을 선택해 주세요.'}"
                  </p>
                </div>

                {/* Listen to reference audio */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePlaySentence(targetSentence)}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>기준 발음 듣기 (Web Speech)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopySentence(targetSentence)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl font-semibold transition flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>복사</span>
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    원어민 음성을 먼저 듣고 호흡과 끊어 읽기를 확인하세요.
                  </span>
                </div>

                {/* Microphone Recording Station */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Mic className="w-4 h-4 text-rose-600" />
                    <span>내 목소리 낭독 녹음 및 확인</span>
                  </h4>

                  {micError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p>{micError}</p>
                        <p className="font-semibold text-rose-900">
                          💡 대체 낭독 팁: 마이크가 없어도 위의 [기준 발음 듣기]를 2회 반복 청취 후, 소리 내어 3회 직접 낭독하시면 동일한 섀도잉 훈련 효과를 얻으실 수 있습니다.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                        <span>🎙️ 녹음 시작</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm animate-pulse"
                      >
                        <Square className="w-3 h-3 fill-white" />
                        <span>⏹ 녹음 정지 ({recordingSeconds}초)</span>
                      </button>
                    )}

                    {recordedAudioUrl && (
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                        <audio controls src={recordedAudioUrl} className="h-8 max-w-[200px] sm:max-w-xs" />
                        <button
                          type="button"
                          onClick={deleteRecording}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 text-xs font-semibold transition"
                          title="녹음 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400">
                    ※ 녹음 파일은 브라우저 세션 메모리(Blob URL)에만 임시 보관되며, 외부 서버로 절대 전송되지 않습니다.
                  </p>
                </div>

                {/* Paragraph Switcher in Speaking Mode */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevParagraph}
                      disabled={selectedSentenceIndex === 0}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold disabled:opacity-30 transition"
                    >
                      이전 문단 낭독
                    </button>
                    <button
                      type="button"
                      onClick={handleNextParagraph}
                      disabled={selectedSentenceIndex === sentences.length - 1}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold disabled:opacity-30 transition"
                    >
                      다음 문단 낭독
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleSaveSelectedAsExpression(targetSentence);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-bold transition flex items-center gap-1"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                    <span>이 문단 단어장 저장</span>
                  </button>
                </div>
              </div>

              {/* Step Navigation Bar */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleTabChange('listening')}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>2단계: 듣기로</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleNextParagraph();
                    handleTabChange('reading');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <span>✓ 학습 완료 &amp; 다음 문단 읽기</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Bottom Chapter Switcher */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                onPrevChapter?.();
                scrollToTop();
              }}
              disabled={!hasPrevChapter}
              className="px-4 py-2 font-bold rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:text-amber-900 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>이전 챕터</span>
            </button>

            <button
              type="button"
              onClick={scrollToTop}
              className="px-3 py-1.5 text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>맨 위로</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onNextChapter?.();
                scrollToTop();
              }}
              disabled={!hasNextChapter}
              className="px-4 py-2 font-bold rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:text-amber-900 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition"
            >
              <span>다음 챕터</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xl animate-in fade-in flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          <span>{saveToast}</span>
        </div>
      )}
    </div>
  );
};
