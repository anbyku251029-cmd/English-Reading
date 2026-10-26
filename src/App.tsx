/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { BookPassageView } from './components/BookPassageView';
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
      }
    } catch (err) {
      console.error('Initialization error:', err);
      // Fallback welcome message if network error
      setMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          content: `안녕! 나는 너의 영어 원서 & 회화 코치 Booky야! 📚✨\n오늘 함께 읽을 책은 **${book.title}** (${book.chapter})이야.\n\n먼저 억지로 한 줄 한 줄 한국어로 번역하려 하지 말고, 숲속의 늦은 오후 햇살과 잭, 애니의 표정을 머릿속에 떠올려보자!\n\n[STEP: 1] 원서 속 핵심 표현 2~3가지를 함께 살펴볼까? 준비되면 '준비됐어!'라고 말해줘!`,
          step: 1,
          timestamp: new Date(),
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

      if (!res.ok) {
        throw new Error(`Chat API error: ${res.status}`);
      }

      const data = await res.json();
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
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `model-err-${Date.now()}`,
          role: 'model',
          content: '죄송해요, 일시적인 네트워크 오류가 발생했습니다. 잠시 후 다시 말씀해 주세요! 💡',
          step: currentStep,
          timestamp: new Date(),
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
      {/* Header with 4-step progress */}
      <Header
        currentBook={currentBook}
        currentStep={currentStep}
        onSelectStep={handleSelectStep}
        onOpenBookModal={() => setIsBookModalOpen(true)}
        onOpenNotebook={() => setIsNotebookOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportNotes={() => setIsExportOpen(true)}
        savedExpressionsCount={savedExpressions.length}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col min-h-0">
        <section className="flex-1 min-h-[600px] lg:h-[calc(100vh-100px)] rounded-3xl overflow-hidden shadow-sm bg-white border border-slate-200/80 flex flex-col">
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
            onSendChatPrompt={handleSendMessage}
            onSelectChapter={handleSelectChapter}
          />
        </section>
      </main>

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
