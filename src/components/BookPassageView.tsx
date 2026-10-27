import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Mic,
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
  Award,
  Zap,
  Type,
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

  const [playingSentence, setPlayingSentence] = useState<string | null>(null);

  // Shadowing Studio state
  const [targetSentence, setTargetSentence] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedTranscript, setRecordedTranscript] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [shadowingFeedback, setShadowingFeedback] = useState<ShadowingFeedback | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Split passage into sentences
  const sentences = React.useMemo(() => {
    return book.passage
      .split(/(?<=[.?!])\s+(?=[A-Z"])/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [book.passage]);

  // Sync tab with 4-step learning flow
  useEffect(() => {
    if (currentStep === 2) {
      setActiveTab('shadowing');
    } else if (currentStep === 1) {
      setActiveTab((prev) => (prev === 'shadowing' ? 'studypack' : prev));
    }
  }, [currentStep]);

  // Set default target sentence when studyPack arrives
  useEffect(() => {
    if (studyPack?.shadowingSentences?.[0]?.sentence) {
      setTargetSentence(studyPack.shadowingSentences[0].sentence);
    } else if (sentences[0]) {
      setTargetSentence(sentences[0]);
    }
  }, [studyPack, sentences]);

  // Play audio for a given sentence
  const handlePlaySentence = async (text: string) => {
    setPlayingSentence(text);
    try {
      await audioManager.speak(text);
    } finally {
      setPlayingSentence(null);
    }
  };

  const [isPlayingAll, setIsPlayingAll] = useState<boolean>(false);
  const [currentReadingIndex, setCurrentReadingIndex] = useState<number | null>(null);
  const stopPlayAllRef = useRef<boolean>(false);
  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);

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
    audioManager.stop();
    setPlayingSentence(null);
    setCurrentReadingIndex(null);
  }, [book.passage, book.currentChapterNumber]);

  // Read all sentences of the selected chapter sequentially with visual tracking
  const handlePlayAll = async (startIndex: number = 0) => {
    if (isPlayingAll && startIndex === 0) {
      stopPlayAllRef.current = true;
      setIsPlayingAll(false);
      audioManager.stop();
      setPlayingSentence(null);
      setCurrentReadingIndex(null);
      return;
    }

    stopPlayAllRef.current = true;
    audioManager.stop();
    await new Promise((r) => setTimeout(r, 60));

    setIsPlayingAll(true);
    stopPlayAllRef.current = false;

    for (let i = startIndex; i < sentences.length; i++) {
      if (stopPlayAllRef.current) break;
      const s = sentences[i];
      setCurrentReadingIndex(i);
      setPlayingSentence(s);

      try {
        await audioManager.speakSentence(s);
      } catch (err) {
        console.warn('Playback error for sentence:', err);
      }

      if (stopPlayAllRef.current) break;
      await new Promise((resolve) => setTimeout(resolve, 280));
    }

    setIsPlayingAll(false);
    setPlayingSentence(null);
    setCurrentReadingIndex(null);
  };

  // Start recording user's read aloud
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

      // Also start speech recognition if available to capture transcript
      speechService.start((res) => {
        if (res.transcript) {
          setRecordedTranscript(res.transcript);
        }
      });
    } catch (err) {
      console.warn('Microphone permission denied or not available:', err);
      // Fallback: ask user to type
      const input = prompt('마이크 권한을 허용하지 못했습니다. 읽으신 문장을 텍스트로 입력해주셔도 코칭해 드려요!');
      if (input) {
        setRecordedTranscript(input);
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    speechService.stop();
  };

  // Submit shadowing for feedback
  const handleEvaluateShadowing = async () => {
    if (!targetSentence) return;
    setIsEvaluating(true);
    try {
      const res = await fetch('/api/shadowing-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSentence,
          userSpokenText: recordedTranscript || 'Spoken aloud by learner',
          bookTitle: book.title,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error?.message || `섀도잉 평가 실패 (${res.status})`);
      }

      setShadowingFeedback(data);

      // Also tell Booky in chat
      onSendChatPrompt(
        `[Step 2 섀도잉 완료] "${targetSentence}" 문장을 소리 내어 연습했어요! Booky 코치님, 발음과 리듬 피드백을 부탁드려요.`
      );
    } catch (err: any) {
      console.error('Failed to get feedback:', err);
      alert(err?.message || '섀도잉 피드백 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const isExprSaved = (expr: string) => {
    return savedExpressions.some((e) => e.expression.toLowerCase() === expr.toLowerCase());
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 border-r border-slate-200">
      {/* Top Companion Header & Tab selector */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">원서 읽기 &amp; 학습 도우미</h2>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
              <Type className="w-3.5 h-3.5 text-slate-400" />
              <span>글자 크기:</span>
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
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition ${
              activeTab === 'reading'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>본문 읽기</span>
          </button>
          <button
            onClick={() => setActiveTab('studypack')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition ${
              activeTab === 'studypack'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>원서 분석 &amp; 표현</span>
            {studyPack && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
          </button>
          <button
            onClick={() => setActiveTab('shadowing')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition ${
              activeTab === 'shadowing'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Headphones className="w-3.5 h-3.5 text-amber-600" />
            <span>섀도잉 스튜디오</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {/* Tab 1: Book Passage Reading */}
        {activeTab === 'reading' && (
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Context Imagery Banner (Principle: Context Over Translation) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/60 shadow-xs">
              <div className="flex items-start space-x-2.5">
                <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-700 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs text-amber-950 leading-relaxed">
                  <span className="font-bold text-amber-900 block mb-0.5">
                    💡 직독직해 코칭 팁: 번역하지 말고 장면을 떠올려보세요!
                  </span>
                  단어 하나하나 한국어로 번역하는 대신, 주인공의 표정과 숲속의 빛, 긴박한 상황의 분위기를 마음속 영화처럼 상상하며 소리 내어 읽어보세요.
                </div>
              </div>
            </div>

            {/* Book metadata card */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
                  {book.level}
                </span>
                <span className="text-xs text-slate-400">{book.author}</span>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">{book.title}</h3>
                <p className="text-xs text-amber-900 font-semibold mt-0.5">{book.chapter}</p>
                {book.tagline && <p className="text-xs text-slate-500 mt-1">{book.tagline}</p>}
              </div>

              {/* Chapter 1~10 Selector under title */}
              {book.chapters && book.chapters.length > 0 && (
                <div className="pt-2.5 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                      <span>챕터 선택 (Chapter 1~10)</span>
                    </span>
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      Ch.{book.currentChapterNumber || 1} / 10
                    </span>
                  </div>

                  {/* Chapter Buttons 1~10 */}
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
                              ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/40'
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

                  {/* Chapter Quick Switch Dropdown */}
                  <div className="mt-2.5">
                    <select
                      value={book.currentChapterNumber || 1}
                      onChange={(e) => onSelectChapter?.(Number(e.target.value))}
                      className="w-full bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 transition cursor-pointer"
                    >
                      {book.chapters.map((ch) => (
                        <option key={ch.chapterNumber} value={ch.chapterNumber}>
                          {ch.chapter} — {ch.tagline}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Actions bar moved below chapter selection */}
              <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-700">전체 문장: {sentences.length}개</span>
                  {isPlayingAll && currentReadingIndex !== null && (
                    <span className="text-[11px] font-bold text-amber-900 bg-amber-100/95 px-2.5 py-0.5 rounded-full flex items-center space-x-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                      <span>
                        {currentReadingIndex + 1} / {sentences.length}번째 읽는 중
                      </span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handlePlayAll(0)}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs ${
                    isPlayingAll
                      ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                  title={isPlayingAll ? '낭독 중지' : '선택된 챕터 전체 문장 듣기'}
                >
                  {isPlayingAll ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>재생 중지</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>전체 듣기</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Reading text with Font Size Control toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {/* Reading header with Font Size Adjuster */}
              <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-700 flex items-center space-x-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>원서 본문</span>
                </span>

                {/* Font Size Adjuster Controls */}
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center space-x-1">
                    <Type className="w-3.5 h-3.5 text-slate-400" />
                    <span>본문 글씨 크기:</span>
                  </span>

                  <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => changeFontSize(fontSize - 2)}
                      disabled={fontSize <= 14}
                      className="px-2 py-0.5 rounded text-xs font-extrabold text-slate-700 hover:bg-amber-100 hover:text-amber-900 disabled:opacity-30 transition cursor-pointer"
                      title="글씨 작게 (A-)"
                    >
                      A-
                    </button>
                    <span className="text-xs font-bold text-amber-900 font-mono px-1.5 min-w-[36px] text-center">
                      {fontSize}px
                    </span>
                    <button
                      type="button"
                      onClick={() => changeFontSize(fontSize + 2)}
                      disabled={fontSize >= 34}
                      className="px-2 py-0.5 rounded text-xs font-extrabold text-slate-700 hover:bg-amber-100 hover:text-amber-900 disabled:opacity-30 transition cursor-pointer"
                      title="글씨 크게 (A+)"
                    >
                      A+
                    </button>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex items-center space-x-1">
                    {[
                      { label: '보통', size: 17 },
                      { label: '크게', size: 21 },
                      { label: '아주 크게', size: 26 },
                    ].map((p) => (
                      <button
                        key={p.size}
                        type="button"
                        onClick={() => changeFontSize(p.size)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                          fontSize === p.size
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Text Body with dynamic font size */}
              <div
                className="p-6 font-serif-book text-slate-800 space-y-3"
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
              >
                {sentences.map((sentence, idx) => {
                  const isCurrent = currentReadingIndex === idx;

                  return (
                    <div
                      key={idx}
                      ref={(el) => {
                        sentenceRefs.current[idx] = el;
                      }}
                      onClick={() => handlePlayAll(idx)}
                      className={`p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-100/95 border-l-4 border-amber-500 shadow-md ring-2 ring-amber-400/80 font-semibold scale-[1.01]'
                          : 'hover:bg-slate-50 border-l-4 border-transparent'
                      }`}
                      title="클릭하면 이 문장부터 낭독 시작"
                    >
                      {isCurrent && (
                        <div className="flex items-center space-x-1.5 text-amber-900 font-bold text-xs mb-1.5 select-none">
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
                          </span>
                          <Volume2 className="w-3.5 h-3.5 animate-bounce text-amber-700" />
                          <span>
                            현재 낭독 중 (문장 {idx + 1} / {sentences.length})
                          </span>
                        </div>
                      )}
                      <p className="cursor-text select-text">{sentence}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Structured Study Pack (Step 1 analysis) */}
        {activeTab === 'studypack' && (
          <div className="max-w-2xl mx-auto space-y-5">
            {isLoadingStudyPack ? (
              <div className="text-center py-16 space-y-3">
                <div className="inline-block animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full"></div>
                <p className="text-sm font-semibold text-slate-700">Booky가 원서를 분석하고 있습니다...</p>
                <p className="text-xs text-slate-400">핵심 표현, 낭독 리듬, 회화 확장 질문을 추출 중입니다 ✨</p>
              </div>
            ) : studyPack ? (
              <>
                {/* Scene Imagery Summary */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      장면 시각화 &amp; 배경 이해 (Context)
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    {studyPack.sceneSummary}
                  </p>
                </div>

                {/* Key Expressions (Step 1) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>원서 속 일상 회화 핵심 표현 (Key Expressions)</span>
                    </h3>
                    <span className="text-[11px] text-slate-400">{studyPack.keyExpressions.length}개 선별</span>
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

                        {/* Meanings */}
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

                        {/* Daily Real-life Example */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">{item.dailyExample}</span>
                            <button
                              onClick={() => handlePlaySentence(item.dailyExample)}
                              className="text-slate-400 hover:text-amber-600"
                              title="예문 듣기"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-slate-500 text-[11px]">{item.dailyExampleMeaning}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Shadowing Sentences Preview */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>추천 낭독 &amp; 섀도잉 문장 (Step 2 준비)</span>
                  </h3>

                  {studyPack.shadowingSentences.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm font-serif-book">
                            {s.sentence}
                          </p>
                          <div className="mt-1.5 text-xs text-amber-800 bg-amber-50/80 p-2 rounded-lg font-mono">
                            <span className="font-bold mr-1">호흡 끊어읽기 (/):</span>
                            {s.rhythmChunks}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">💡 {s.rhythmTip}</p>
                        </div>
                        <button
                          onClick={() => {
                            setTargetSentence(s.sentence);
                            setActiveTab('shadowing');
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shrink-0 transition shadow-xs flex items-center space-x-1"
                        >
                          <Headphones className="w-3.5 h-3.5" />
                          <span>연습하기</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                원서 분석 정보를 불러오지 못했습니다. 본문 읽기 탭을 이용해 주세요.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Shadowing Studio */}
        {activeTab === 'shadowing' && (
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Target Sentence Card */}
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

              {/* Action buttons: Listen Native vs Record */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => handlePlaySentence(targetSentence)}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-xs"
                >
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span>원어민 발음 듣기 (Native)</span>
                </button>

                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <Mic className="w-4 h-4" />
                    <span>내 목소리 녹음하기</span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 text-rose-400 text-xs font-bold animate-pulse transition shadow-xs"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>녹음 완료 (중지)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Recording Result & Speech-to-text */}
            {recordedAudioUrl && (
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>내 낭독 음성 확인</span>
                  </h4>
                  <audio controls src={recordedAudioUrl} className="h-8 max-w-[200px]" />
                </div>

                {recordedTranscript && (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">인식된 텍스트:</span>
                    <p className="font-medium italic">"{recordedTranscript}"</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={startRecording}
                    className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>다시 녹음하기</span>
                  </button>

                  <button
                    onClick={handleEvaluateShadowing}
                    disabled={isEvaluating}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{isEvaluating ? 'Booky 분석 중...' : 'Booky 코칭 피드백 받기'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Shadowing AI Feedback Card */}
            {shadowingFeedback && (
              <div className="bg-white p-5 rounded-3xl border-2 border-emerald-400 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-sm">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Booky의 낭독 리듬 코칭</h4>
                      <p className="text-[11px] text-slate-500">자연스러운 호흡과 억양 체크 완료</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-600">{shadowingFeedback.score}</span>
                    <span className="text-xs text-slate-400 font-bold">/100</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-xs text-emerald-950 font-medium">
                  {shadowingFeedback.praise}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 font-mono">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      추천 호흡 단위 (Phrasing &amp; Stress):
                    </span>
                    <span className="text-slate-900 font-semibold">{shadowingFeedback.phrasingGuide}</span>
                  </div>

                  <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-100 text-amber-950 space-y-1">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">
                      💡 억양 &amp; 연음 팁 (Intonation):
                    </span>
                    <span>{shadowingFeedback.intonationTip}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 italic">
                  💬 Booky: "{shadowingFeedback.coachingComment}"
                </p>
              </div>
            )}

            {/* Shadowing Sentences Quick Switcher */}
            {studyPack?.shadowingSentences && (
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-500 mb-2 block">
                  원서에서 추천하는 다른 문장으로 바꾸기:
                </span>
                <div className="space-y-2">
                  {studyPack.shadowingSentences.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setTargetSentence(s.sentence);
                        setShadowingFeedback(null);
                        setRecordedAudioUrl(null);
                      }}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition ${
                        targetSentence === s.sentence
                          ? 'border-amber-500 bg-amber-50/50 text-slate-900 font-semibold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="font-serif-book font-medium">"{s.sentence}"</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
