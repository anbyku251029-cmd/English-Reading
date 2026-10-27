import React, { useState, useEffect, useRef } from 'react';
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
  Share2,
  Sliders,
  Type,
  Copy,
  ExternalLink,
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  CheckCircle2,
  Circle,
  Pause,
  Info,
  Mic,
  Award,
} from 'lucide-react';
import { BookPreset } from '../data/presetBooks';
import { StudyPack, KeyExpression, ShadowingFeedback } from '../types';
import { audioManager, speechService } from '../utils/audio';

interface BookPassageViewProps {
  book: BookPreset;
  studyPack: StudyPack | null;
  isLoadingStudyPack: boolean;
  onSelectShadowingSentence: (sentence: string) => void;
  onSaveExpression: (expr: KeyExpression) => void;
  savedExpressions: KeyExpression[];
  currentStep: number;
  onSendChatPrompt: (prompt: string) => void;
  onSelectChapter?: (chapterNumber: number) => void;
}

export const BookPassageView: React.FC<BookPassageViewProps> = ({
  book,
  studyPack,
  isLoadingStudyPack,
  onSelectShadowingSentence,
  onSaveExpression,
  savedExpressions,
  currentStep,
  onSendChatPrompt,
  onSelectChapter,
}) => {
  const [activeTab, setActiveTab] = useState<'reading' | 'studypack' | 'shadowing'>('reading');

  // Font size control with persistence
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('booky_font_size');
      return saved ? Number(saved) : 19;
    } catch {
      return 19;
    }
  });

  const changeFontSize = (newSize: number) => {
    const clamped = Math.min(36, Math.max(14, newSize));
    setFontSize(clamped);
    try {
      localStorage.setItem('booky_font_size', String(clamped));
    } catch {
      // ignore
    }
  };

  // Scroll Container Ref for Top / Bottom navigation
  const readingScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollToTop = () => {
    readingScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    if (readingScrollRef.current) {
      readingScrollRef.current.scrollTo({
        top: readingScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
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
  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load available English voices on mount
  useEffect(() => {
    const updateVoices = () => {
      const voices = audioManager.getEnglishVoices();
      setAvailableVoices(voices);
      if (voices.length > 0 && !selectedVoiceName) {
        // Prefer natural / google voices if present
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
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Selected Sentence for Study Tools
  const [selectedSentence, setSelectedSentence] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Vocabulary Notes (Local Scratchpad)
  const [vocabNotes, setVocabNotes] = useState<{ word: string; note: string }[]>(() => {
    try {
      const saved = localStorage.getItem('booky_vocab_notes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newWord, setNewWord] = useState('');
  const [newNote, setNewNote] = useState('');

  const handleAddVocabNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    const updated = [{ word: newWord.trim(), note: newNote.trim() }, ...vocabNotes];
    setVocabNotes(updated);
    setNewWord('');
    setNewNote('');
    try {
      localStorage.setItem('booky_vocab_notes', JSON.stringify(updated));
    } catch {}
  };

  const handleRemoveVocabNote = (idx: number) => {
    const updated = vocabNotes.filter((_, i) => i !== idx);
    setVocabNotes(updated);
    try {
      localStorage.setItem('booky_vocab_notes', JSON.stringify(updated));
    } catch {}
  };

  // Checklist state
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('booky_reading_checklist');
      return saved ? JSON.parse(saved) : { readAloud: false, pickExpr: false, shadowTwice: false };
    } catch {
      return { readAloud: false, pickExpr: false, shadowTwice: false };
    }
  });

  const toggleChecklist = (key: string) => {
    const next = { ...checklist, [key]: !checklist[key] };
    setChecklist(next);
    try {
      localStorage.setItem('booky_reading_checklist', JSON.stringify(next));
    } catch {}
  };

  // Shadowing Studio state
  const [targetSentence, setTargetSentence] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedTranscript, setRecordedTranscript] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [shadowingFeedback, setShadowingFeedback] = useState<ShadowingFeedback | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Split passage into sentences or use paragraphs
  const sentences = React.useMemo(() => {
    if (book.paragraphs && book.paragraphs.length > 0) {
      // Use clean contents of paragraphs
      return book.paragraphs.map((p) => p.content.trim()).filter(Boolean);
    }
    return book.passage
      .split(/(?<=[.?!])\s+(?=[A-Z"])/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [book.passage, book.paragraphs]);

  // Sync tab with 4-step learning flow
  useEffect(() => {
    if (currentStep === 2) {
      setActiveTab('shadowing');
    } else if (currentStep === 1) {
      setActiveTab((prev) => (prev === 'shadowing' ? 'studypack' : prev));
    }
  }, [currentStep]);

  // Set default target sentence
  useEffect(() => {
    if (studyPack?.shadowingSentences?.[0]?.sentence) {
      setTargetSentence(studyPack.shadowingSentences[0].sentence);
      setSelectedSentence(studyPack.shadowingSentences[0].sentence);
    } else if (sentences[0]) {
      setTargetSentence(sentences[0]);
      setSelectedSentence(sentences[0]);
    }
  }, [studyPack, sentences]);

  // Automatically scroll the currently read sentence into view
  useEffect(() => {
    if (currentReadingIndex !== null && sentenceRefs.current[currentReadingIndex]) {
      sentenceRefs.current[currentReadingIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentReadingIndex]);

  // Stop playback when chapter or passage changes
  useEffect(() => {
    stopPlayAllRef.current = true;
    setIsPlayingAll(false);
    setIsSpeechPaused(false);
    audioManager.stop();
    setPlayingSentence(null);
    setCurrentReadingIndex(null);
  }, [book.passage, book.currentChapterNumber, book.dbChapterId]);

  // Web Speech: Play single sentence
  const handlePlaySentence = async (text: string) => {
    setPlayingSentence(text);
    setIsSpeechPaused(false);
    try {
      await audioManager.speakSentence(text, speechRate, selectedVoiceName);
    } finally {
      setPlayingSentence(null);
    }
  };

  // Web Speech: Play all sentences sequentially
  const handlePlayAll = async (startIndex: number = 0) => {
    if (isPlayingAll && startIndex === 0) {
      stopPlayAllRef.current = true;
      setIsPlayingAll(false);
      setIsSpeechPaused(false);
      audioManager.stop();
      setPlayingSentence(null);
      setCurrentReadingIndex(null);
      return;
    }

    stopPlayAllRef.current = true;
    audioManager.stop();
    await new Promise((r) => setTimeout(r, 60));

    setIsPlayingAll(true);
    setIsSpeechPaused(false);
    stopPlayAllRef.current = false;

    for (let i = startIndex; i < sentences.length; i++) {
      if (stopPlayAllRef.current) break;
      const s = sentences[i];
      setCurrentReadingIndex(i);
      setPlayingSentence(s);

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
    } catch {
      // fallback
    }
  };

  // Quick save expression from selected sentence
  const handleSaveSelectedAsExpression = () => {
    if (!selectedSentence) return;
    const clean = selectedSentence.slice(0, 60);
    const expr: KeyExpression = {
      expression: clean,
      inContext: selectedSentence,
      everydayMeaning: '본문에서 직접 스크랩한 표현',
      dailyExample: clean,
      dailyExampleMeaning: '내가 저장한 학습 예문',
    };
    onSaveExpression(expr);
  };

  // Count words and chars
  const wordCount = selectedSentence
    ? selectedSentence.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const charCount = selectedSentence ? selectedSentence.length : 0;

  // Recording read aloud
  const startRecording = async () => {
    setShadowingFeedback(null);
    setRecordedAudioUrl(null);
    setRecordedTranscript('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      speechService.start((res) => {
        if (res.transcript) {
          setRecordedTranscript(res.transcript);
        }
      });
    } catch (err) {
      console.warn('Microphone permission denied:', err);
      const input = prompt('마이크 권한을 허용하지 못했습니다. 읽으신 문장을 텍스트로 입력해 주세요:');
      if (input) {
        setRecordedTranscript(input);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    speechService.stop();
  };

  const isExprSaved = (expr: string) => {
    return savedExpressions.some((e) => e.expression.toLowerCase() === expr.toLowerCase());
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 border-r border-slate-200">
      {/* Top Header & Tab selector */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">
              원서 독서실 &amp; 학습 보조기
            </h2>
            {book.dbBookId && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300/60">
                SQLite 로컬 도서 #{book.bookNumber || ''}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
              <Type className="w-3.5 h-3.5 text-slate-400" />
              <span>글자:</span>
            </span>
            <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
              <button
                type="button"
                onClick={() => changeFontSize(fontSize - 2)}
                disabled={fontSize <= 14}
                className="px-2 py-0.5 rounded text-xs font-extrabold text-slate-700 hover:bg-white disabled:opacity-30 transition cursor-pointer"
                title="글씨 작게 (A-)"
              >
                A-
              </button>
              <span className="text-xs font-bold text-amber-900 font-mono px-1 min-w-[32px] text-center">
                {fontSize}px
              </span>
              <button
                type="button"
                onClick={() => changeFontSize(fontSize + 2)}
                disabled={fontSize >= 34}
                className="px-2 py-0.5 rounded text-xs font-extrabold text-slate-700 hover:bg-white disabled:opacity-30 transition cursor-pointer"
                title="글씨 크게 (A+)"
              >
                A+
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('reading')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'reading'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>원서 읽기 ({sentences.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('studypack')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'studypack'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>표현 &amp; 학습도구</span>
          </button>
          <button
            onClick={() => setActiveTab('shadowing')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'shadowing'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Headphones className="w-3.5 h-3.5 text-amber-600" />
            <span>낭독 &amp; 섀도잉</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content Area */}
      <div ref={readingScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5">
        {/* Tab 1: Book Passage Reading */}
        {activeTab === 'reading' && (
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Book metadata card */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
                  {book.series ? `${book.series} #${book.bookNumber || ''}` : book.level}
                </span>
                <span className="text-xs text-slate-400">{book.author}</span>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">{book.title}</h3>
                <p className="text-xs text-amber-900 font-semibold mt-0.5">{book.chapter}</p>
                {book.tagline && <p className="text-xs text-slate-500 mt-1">{book.tagline}</p>}
              </div>

              {/* Chapter Quick Switcher (If presets have chapters) */}
              {book.chapters && book.chapters.length > 0 && (
                <div className="pt-2.5 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                      <span>챕터 바로 이동:</span>
                    </span>
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      Ch.{book.currentChapterNumber || 1} / {book.chapters.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                    {book.chapters.map((ch) => {
                      const isActive = (book.currentChapterNumber || 1) === ch.chapterNumber;
                      return (
                        <button
                          key={ch.chapterNumber}
                          type="button"
                          onClick={() => onSelectChapter?.(ch.chapterNumber)}
                          className={`py-1.5 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                            isActive
                              ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400/40'
                              : 'bg-slate-100 hover:bg-amber-100/80 text-slate-700 border border-slate-200/70'
                          }`}
                          title={ch.chapter}
                        >
                          <span className="text-[9px] opacity-75">Ch.</span>
                          <span>{ch.chapterNumber}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Web Speech Audio Controller & Navigation Bar */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                {/* Voice & Speed Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  {/* Voice Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">영어 음성:</span>
                    {availableVoices.length > 0 ? (
                      <select
                        value={selectedVoiceName}
                        onChange={(e) => setSelectedVoiceName(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[170px] truncate"
                      >
                        {availableVoices.map((v) => (
                          <option key={v.name} value={v.name}>
                            {v.name.replace(/(Microsoft|Google|Apple)\s*/i, '')} ({v.lang})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[11px] text-slate-400">브라우저 기본 음성</span>
                    )}
                  </div>

                  {/* Speed Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">속도:</span>
                    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
                      {[0.8, 0.92, 1.0, 1.2].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setSpeechRate(rate)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            speechRate === rate
                              ? 'bg-amber-500 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Playback Actions & Quick Navigation */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handlePlayAll(0)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs ${
                        isPlayingAll && !isSpeechPaused
                          ? 'bg-amber-600 text-white animate-pulse'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                      title="선택된 장 처음부터 전체 듣기"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{isPlayingAll ? '재생 중' : '전체 낭독'}</span>
                    </button>

                    {isPlayingAll && (
                      <>
                        {isSpeechPaused ? (
                          <button
                            type="button"
                            onClick={handleResumeSpeech}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                            title="이어듣기"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handlePauseSpeech}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                            title="일시정지"
                          >
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleStopSpeech}
                          className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl transition"
                          title="낭독 정지"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </>
                    )}

                    {isPlayingAll && currentReadingIndex !== null && (
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                        {currentReadingIndex + 1}/{sentences.length}
                      </span>
                    )}
                  </div>

                  {/* Scroll to Top / Bottom Buttons */}
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={scrollToTop}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      title="장의 처음으로 이동"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      <span>처음으로</span>
                    </button>
                    <button
                      type="button"
                      onClick={scrollToBottom}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      title="장의 끝으로 이동"
                    >
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                      <span>끝으로</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1">
                  <Info className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>
                    브라우저 내장 Web Speech API로 음성을 재생합니다 (Gemini API 호출 없이 안전하게 구동).
                  </span>
                </div>
              </div>
            </div>

            {/* Selected Sentence Inspector Box */}
            {selectedSentence && (
              <div className="p-3.5 rounded-2xl bg-white border border-amber-300 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-800 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      선택한 문장 분석 도구
                    </span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                      {wordCount}단어 ({charCount}자)
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handlePlaySentence(selectedSentence)}
                      className="px-2 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg flex items-center gap-1 transition"
                      title="이 문장 듣기"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>듣기</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopySentence(selectedSentence)}
                      className="px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition"
                      title="클립보드에 복사"
                    >
                      {copiedSuccess ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">복사됨!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>복사</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSelectedAsExpression}
                      className="px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition"
                      title="표현 노트에 저장"
                    >
                      <Bookmark className="w-3 h-3" />
                      <span>저장</span>
                    </button>
                    <a
                      href={`https://en.dict.naver.com/#/search?query=${encodeURIComponent(
                        selectedSentence.replace(/[“”.?!]/g, '').split(' ')[0] || ''
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition"
                      title="사전에서 첫 단어 검색"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>사전</span>
                    </a>
                  </div>
                </div>

                <p className="font-serif-book text-xs text-slate-800 bg-amber-50/40 p-2 rounded-xl border border-amber-100 leading-relaxed">
                  "{selectedSentence}"
                </p>
              </div>
            )}

            {/* Reading text with Font Size Control toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center space-x-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {book.chapter} 본문 ({sentences.length}개 {book.paragraphs ? '문단' : '문장'})
                  </span>
                </span>
                <span className="text-[11px] text-slate-400">문장을 클릭하면 도구가 열립니다.</span>
              </div>

              {/* Text Body */}
              <div
                className="p-6 font-serif-book text-slate-800 space-y-4"
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
              >
                {sentences.map((sentence, idx) => {
                  const isCurrent = currentReadingIndex === idx;
                  const isSelected = selectedSentence === sentence;

                  return (
                    <div
                      key={idx}
                      ref={(el) => {
                        sentenceRefs.current[idx] = el;
                      }}
                      onClick={() => {
                        setSelectedSentence(sentence);
                        setTargetSentence(sentence);
                      }}
                      className={`p-3.5 rounded-2xl transition-all duration-200 cursor-pointer border ${
                        isCurrent
                          ? 'bg-amber-100/95 border-amber-500 shadow-md ring-2 ring-amber-400/80 font-semibold'
                          : isSelected
                          ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300/60'
                          : 'bg-white hover:bg-slate-50/80 border-slate-200/60 hover:border-amber-200'
                      }`}
                      title="클릭하여 학습 도구 사용 및 낭독 지정"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 select-none">
                        <span className="font-mono font-bold text-amber-800/80">
                          {book.paragraphs ? `¶ ${idx + 1}` : `#${idx + 1}`}
                        </span>

                        <div className="flex items-center gap-2">
                          {isCurrent && (
                            <span className="font-bold text-amber-800 flex items-center gap-1">
                              <Volume2 className="w-3 h-3 animate-bounce" />
                              낭독 중
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlaySentence(sentence);
                            }}
                            className="p-1 hover:text-amber-700 hover:bg-amber-100 rounded"
                            title="이 부분만 바로 듣기"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <p className="cursor-text select-text leading-relaxed">{sentence}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Structured Study Pack & Offline Learning Aids */}
        {activeTab === 'studypack' && (
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Offline Learning Checklist (Step 05-F) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>오늘의 원서 완독 체크리스트 (브라우저 로컬)</span>
                </h3>
                <span className="text-[10px] text-slate-400">규칙 기반 오프라인 학습</span>
              </div>

              <div className="space-y-2">
                {[
                  {
                    key: 'readAloud',
                    label: '본문 소리 내어 1회 완독하기 (Web Speech 듣고 따라하기)',
                  },
                  {
                    key: 'pickExpr',
                    label: '마음에 드는 핵심 표현 1개 이상 단어장에 저장하기',
                  },
                  {
                    key: 'shadowTwice',
                    label: '섀도잉 스튜디오에서 목표 문장 2회 이상 소리 내어 연습하기',
                  },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleChecklist(item.key)}
                    className={`w-full p-3 rounded-xl border text-left text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                      checklist[item.key]
                        ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100/70'
                    }`}
                  >
                    <span>{item.label}</span>
                    {checklist[item.key] ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Vocabulary Scratchpad (Step 05-F) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-amber-600" />
                  <span>내 단어 &amp; 표현 메모장 ({vocabNotes.length}개)</span>
                </h3>
                <span className="text-[10px] text-slate-400">로컬 브라우저 영구 보관</span>
              </div>

              <form onSubmit={handleAddVocabNote} className="flex gap-2">
                <input
                  type="text"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder="영어 단어/표현 (예: oak tree)"
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="뜻/메모 (예: 떡갈나무)"
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shrink-0"
                >
                  추가
                </button>
              </form>

              {vocabNotes.length > 0 && (
                <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2 max-h-48 overflow-y-auto">
                  {vocabNotes.map((v, i) => (
                    <div key={i} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 mr-2">{v.word}</span>
                        <span className="text-slate-500">{v.note}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVocabNote(i)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Study Pack Expressions (If generated) */}
            {studyPack && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>원서 속 일상 회화 핵심 표현 (Key Expressions)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {studyPack.keyExpressions.length}개 선별
                  </span>
                </div>

                {studyPack.keyExpressions.map((item, idx) => {
                  const saved = isExprSaved(item.expression);

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-amber-300 transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-extrabold text-base text-slate-900 tracking-tight">
                            {item.expression}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handlePlaySentence(item.expression)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition"
                            title="발음 듣기"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onSaveExpression(item)}
                            className={`p-1.5 rounded-lg transition ${
                              saved
                                ? 'text-amber-600 bg-amber-50'
                                : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                            }`}
                            title={saved ? '저장됨' : '단어장에 저장'}
                          >
                            <Bookmark className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-start space-x-1.5">
                          <span className="font-bold text-amber-800 shrink-0">일상 의미:</span>
                          <span className="text-slate-700">{item.everydayMeaning}</span>
                        </div>
                        <div className="flex items-start space-x-1.5 text-slate-500">
                          <span className="font-medium shrink-0">원서 문맥:</span>
                          <span>{item.inContext}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Shadowing Studio */}
        {activeTab === 'shadowing' && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                  🎯 오늘 낭독할 목표 문장
                </span>
                <span className="text-[11px]">원서에서 직접 선택하거나 아래 버튼 클릭</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="font-serif-book text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                  "{targetSentence || '원서 본문에서 문장을 선택해 주세요.'}"
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <button
                  onClick={() => handlePlaySentence(targetSentence)}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>원어민 음성 듣기</span>
                </button>

                <div className="flex items-center space-x-2">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>소리 내어 녹음 시작</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 animate-pulse cursor-pointer"
                    >
                      <Square className="w-4 h-4 fill-current text-rose-400" />
                      <span>녹음 완료</span>
                    </button>
                  )}
                </div>
              </div>

              {recordedAudioUrl && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-800">
                    녹음 완료! 내 발음을 들어보세요:
                  </span>
                  <audio controls src={recordedAudioUrl} className="h-8" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
