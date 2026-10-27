/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Bot } from 'lucide-react';
import { Header } from './components/Header';
import { BookPassageView } from './components/BookPassageView';
import { BookyChat } from './components/BookyChat';
import { BookSelectorModal } from './components/BookSelectorModal';
import { NotebookDrawer } from './components/NotebookDrawer';
import { SettingsModal } from './components/SettingsModal';
import { ExportNotesModal } from './components/ExportNotesModal';
import { PRESET_BOOKS, BookPreset } from './data/presetBooks';
import { Message, StudyPack, KeyExpression, LearnerLevel } from './types';

export default function App() {
  const [currentBook, setCurrentBook] = useState<BookPreset>(PRESET_BOOKS[0]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [learnerLevel, setLearnerLevel] = useState<LearnerLevel>('beginner');
  const [preferredVoice, setPreferredVoice] = useState<string>('Kore');

  // Study Pack & Analysis
  const [studyPack, setStudyPack] = useState<StudyPack | null>(null);
  const [isLoadingStudyPack, setIsLoadingStudyPack] = useState<boolean>(false);

  // Chat conversation
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);

  // Modals & Drawers
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Saved expressions in Notebook (persist to localStorage)
  const [savedExpressions, setSavedExpressions] = useState<KeyExpression[]>(() => {
    try {
      const saved = localStorage.getItem('booky_saved_expressions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('booky_saved_expressions', JSON.stringify(savedExpressions));
    } catch (e) {
      console.warn('Failed to save expressions to localStorage', e);
    }
  }, [savedExpressions]);

  // Load study pack and start conversation for a book
  const initBookSession = useCallback(async (book: BookPreset) => {
    setIsLoadingStudyPack(true);
    setStudyPack(null);
    setCurrentStep(1);

    // Initial greeting from Booky
    const initialUserMsg: Message = {
      id: `user-init-${Date.now()}`,
      role: 'user',
      content: book.starterPrompt,
      timestamp: new Date(),
    };

    setMessages([initialUserMsg]);
    setIsLoadingChat(true);

    try {
      // Run both study pack extraction and initial chat in parallel
      const [analysisRes, chatRes] = await Promise.all([
        fetch('/api/analyze-passage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: book.title,
            chapter: book.chapter,
            passage: book.passage,
            learnerLevel: book.levelKey,
          }),
        }),
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: book.starterPrompt }],
            bookContext: {
              title: book.title,
              chapter: book.chapter,
              passage: book.passage,
            },
            learnerLevel: book.levelKey,
          }),
        }),
      ]);

      if (analysisRes.ok) {
        const pack = await analysisRes.json();
        setStudyPack(pack);
      } else {
        setStudyPack(null);
      }

      if (chatRes.ok) {
        const chatData = await chatRes.json();
        const modelMsg: Message = {
          id: `model-${Date.now()}`,
          role: 'model',
          content: chatData.reply,
          step: chatData.currentStep || 1,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, modelMsg]);
        if (chatData.currentStep) {
          setCurrentStep(chatData.currentStep);
        }
      } else {
        const errData = await chatRes.json().catch(() => null);
        const errMsg = errData?.error?.message || 'Gemini AI 연결에 실패했습니다. API 키 설정 또는 서버 상태를 확인해 주세요.';
        setMessages((prev) => [
          ...prev,
          {
            id: `model-err-${Date.now()}`,
            role: 'model',
            content: errMsg,
            step: 1,
            timestamp: new Date(),
            isError: true,
          },
        ]);
      }
    } catch (err: any) {
      console.error('Initialization error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `model-err-${Date.now()}`,
          role: 'model',
          content: err?.message || '서버와 통신할 수 없습니다. 로컬 서버 연결 상태를 확인해 주세요.',
          step: 1,
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoadingStudyPack(false);
      setIsLoadingChat(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initBookSession(currentBook);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle changing the current book
  const handleSelectBook = (newBook: BookPreset) => {
    setCurrentBook(newBook);
    setLearnerLevel(newBook.levelKey);
    initBookSession(newBook);
  };

  // Handle changing chapter within current book (Chapters 1~10)
  const handleSelectChapter = (chapterNum: number) => {
    if (!currentBook.chapters) return;
    const targetChapter = currentBook.chapters.find((c) => c.chapterNumber === chapterNum);
    if (!targetChapter) return;

    const updatedBook: BookPreset = {
      ...currentBook,
      chapter: targetChapter.chapter,
      currentChapterNumber: targetChapter.chapterNumber,
      tagline: targetChapter.tagline,
      passage: targetChapter.passage,
      starterPrompt: targetChapter.starterPrompt,
      keyExpressionsPreview: targetChapter.keyExpressionsPreview,
    };

    setCurrentBook(updatedBook);
    initBookSession(updatedBook);
  };

  // Send message in chat
  const handleSendMessage = async (text: string) => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoadingChat(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          bookContext: {
            title: currentBook.title,
            chapter: currentBook.chapter,
            passage: currentBook.passage,
            currentStep,
          },
          learnerLevel,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error?.message || `AI 연결 오류 (${res.status})`);
      }

      const modelMsg: Message = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: data.reply,
        step: data.currentStep || currentStep,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, modelMsg]);
      if (data.currentStep) {
        setCurrentStep(data.currentStep);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `model-err-${Date.now()}`,
          role: 'model',
          content: err?.message || '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
          step: currentStep,
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Save expression to notebook
  const handleSaveExpression = (expr: KeyExpression) => {
    setSavedExpressions((prev) => {
      const exists = prev.some((e) => e.expression.toLowerCase() === expr.expression.toLowerCase());
      if (exists) {
        return prev.filter((e) => e.expression.toLowerCase() !== expr.expression.toLowerCase());
      }
      return [...prev, expr];
    });
  };

  const handleRemoveExpression = (expression: string) => {
    setSavedExpressions((prev) => prev.filter((e) => e.expression !== expression));
  };

  const handleClearExpressions = () => {
    if (confirm('저장된 표현 노트를 모두 비우시겠습니까?')) {
      setSavedExpressions([]);
    }
  };

  // Switch step directly from header
  const handleSelectStep = (step: number) => {
    setCurrentStep(step);
    if (step >= 3) {
      setIsChatOpen(true);
    }
    const stepPrompts: Record<number, string> = {
      1: '[Step 1 원서 분석 & 핵심 표현] 원서 본문 속 핵심 일상 표현을 확인하고 싶어!',
      2: '[Step 2 낭독 & 섀도잉] 소리 내어 문장을 읽고 발음과 호흡 리듬을 연습할래!',
      3: '[Step 3 스토리 회화 토론] 책의 상황으로 생각과 감정을 나누고 롤플레잉 해보자!',
      4: '[Step 4 나만의 문장 만들기] 오늘 배운 표현을 내 일상에 적용해 나만의 문장을 만들어볼래!',
    };
    if (stepPrompts[step]) {
      handleSendMessage(stepPrompts[step]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans">
      {/* Header with 4-step progress and AI coach toggle */}
      <Header
        currentBook={currentBook}
        currentStep={currentStep}
        onSelectStep={handleSelectStep}
        onOpenBookModal={() => setIsBookModalOpen(true)}
        onOpenNotebook={() => setIsNotebookOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportNotes={() => setIsExportOpen(true)}
        savedExpressionsCount={savedExpressions.length}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen((prev) => !prev)}
      />

      {/* Main Workspace */}
      <main
        className={`flex-1 w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col min-h-0 transition-all ${
          isChatOpen ? 'max-w-7xl' : 'max-w-4xl'
        }`}
      >
        <div
          className={`flex-1 min-h-0 grid grid-cols-1 ${
            isChatOpen ? 'lg:grid-cols-12 gap-4 lg:gap-5' : ''
          }`}
        >
          {/* Left: Book Reading & Passage View */}
          <section
            className={`rounded-3xl overflow-hidden shadow-sm bg-white border border-slate-200/80 flex flex-col min-h-[500px] ${
              isChatOpen ? 'lg:col-span-7 xl:col-span-7 lg:h-[calc(100vh-120px)]' : 'h-[calc(100vh-120px)]'
            }`}
          >
            <BookPassageView
              book={currentBook}
              studyPack={studyPack}
              isLoadingStudyPack={isLoadingStudyPack}
              onSelectShadowingSentence={(sentence) => {
                setCurrentStep(2);
              }}
              onSaveExpression={handleSaveExpression}
              savedExpressions={savedExpressions}
              currentStep={currentStep}
              onSendChatPrompt={(prompt) => {
                setIsChatOpen(true);
                handleSendMessage(prompt);
              }}
              onSelectChapter={handleSelectChapter}
            />
          </section>

          {/* Right: AI Coach Booky Chat (Desktop side-by-side) */}
          {isChatOpen && (
            <section className="hidden lg:flex lg:col-span-5 xl:col-span-5 rounded-3xl overflow-hidden shadow-sm bg-white border border-slate-200/80 flex-col lg:h-[calc(100vh-120px)]">
              <BookyChat
                messages={messages}
                isLoading={isLoadingChat}
                onSendMessage={handleSendMessage}
                currentBook={currentBook}
                currentStep={currentStep}
                onSetStep={handleSelectStep}
                learnerLevel={learnerLevel}
                onClose={() => setIsChatOpen(false)}
              />
            </section>
          )}
        </div>
      </main>

      {/* Mobile AI Coach Drawer / Overlay (when isChatOpen on mobile) */}
      {isChatOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg h-full bg-white shadow-2xl flex flex-col border-l border-slate-200">
            <BookyChat
              messages={messages}
              isLoading={isLoadingChat}
              onSendMessage={handleSendMessage}
              currentBook={currentBook}
              currentStep={currentStep}
              onSetStep={handleSelectStep}
              learnerLevel={learnerLevel}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Mobile Floating Button to open AI Coach when closed */}
      {!isChatOpen && (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="lg:hidden fixed bottom-5 right-5 z-30 p-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg flex items-center space-x-1.5 transition cursor-pointer"
          title="AI 코치 열기"
        >
          <Bot className="w-5 h-5" />
          <span className="text-xs font-bold">AI 코치</span>
        </button>
      )}

      {/* Modals & Drawers */}
      <BookSelectorModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        currentBook={currentBook}
        onSelectBook={handleSelectBook}
        onSelectChapter={handleSelectChapter}
      />

      <NotebookDrawer
        isOpen={isNotebookOpen}
        onClose={() => setIsNotebookOpen(false)}
        savedExpressions={savedExpressions}
        onRemoveExpression={handleRemoveExpression}
        onClearAll={handleClearExpressions}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        learnerLevel={learnerLevel}
        onUpdateLevel={setLearnerLevel}
        preferredVoice={preferredVoice}
        onUpdateVoice={setPreferredVoice}
      />

      <ExportNotesModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        currentBook={currentBook}
        studyPack={studyPack}
        messages={messages}
        savedExpressions={savedExpressions}
      />
    </div>
  );
}
