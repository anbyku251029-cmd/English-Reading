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
import { HomeDashboardModal } from './components/HomeDashboardModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { CnnNewsCategoryView } from './components/cnnNews/CnnNewsCategoryView';
import { CnnNewsReaderView } from './components/cnnNews/CnnNewsReaderView';
import { PRESET_BOOKS, BookPreset } from './data/presetBooks';
import { Message, StudyPack, KeyExpression, LearnerLevel, ReadingProgress } from './types';
import {
  loadSavedExpressions,
  addOrUpdateExpression,
  saveExpressions,
  recordChapterActivity,
} from './utils/studyStorage';

export default function App() {
  const [currentBook, setCurrentBook] = useState<BookPreset>(PRESET_BOOKS[0]);
  const [currentCategory, setCurrentCategory] = useState<'books' | 'cnn_news'>('books');
  const [selectedNewsArticleId, setSelectedNewsArticleId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [learnerLevel, setLearnerLevel] = useState<LearnerLevel>('beginner');
  const [preferredVoice, setPreferredVoice] = useState<string>('Kore');

  // Study Pack & Analysis (Local context)
  const [studyPack, setStudyPack] = useState<StudyPack | null>(null);
  const [isLoadingStudyPack, setIsLoadingStudyPack] = useState<boolean>(false);

  // Modals & Drawers
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [notebookInitialTab, setNotebookInitialTab] = useState<'list' | 'review' | 'stats'>('list');
  const [lastReadingProgress, setLastReadingProgress] = useState<ReadingProgress | null>(null);

  const updateLastProgressFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem('booky_reading_progress');
      if (raw) setLastReadingProgress(JSON.parse(raw));
    } catch (e) {
      console.warn('Failed to parse reading progress', e);
    }
  }, []);

  // Saved expressions in Notebook (persist to localStorage via studyStorage)
  const [savedExpressions, setSavedExpressions] = useState<KeyExpression[]>(() => {
    return loadSavedExpressions();
  });

  useEffect(() => {
    saveExpressions(savedExpressions);
  }, [savedExpressions]);

  // Load study session for a book (Safe local initialization)
  const initBookSession = useCallback(async (book: BookPreset) => {
    setIsLoadingStudyPack(false);
    setStudyPack(null);
    setCurrentStep(1);

    // Save reading progress to localStorage and record daily activity log
    if (book.dbBookId && book.dbChapterId) {
      try {
        const progress = {
          bookId: book.dbBookId,
          chapterId: book.dbChapterId,
          lastParagraphIndex: 0,
          lastReadAt: new Date().toISOString(),
        };
        localStorage.setItem('booky_reading_progress', JSON.stringify(progress));
      } catch (e) {
        console.warn('Failed to save reading progress', e);
      }

      recordChapterActivity(
        book.dbBookId,
        book.title,
        book.dbChapterId,
        book.chapter,
        1,
        false
      );
    }
  }, []);

  // Initialize on mount: check localStorage for saved reading progress
  useEffect(() => {
    const restoreProgress = async () => {
      try {
        const saved = localStorage.getItem('booky_reading_progress');
        if (saved) {
          const progress = JSON.parse(saved);
          if (progress.chapterId) {
            const res = await fetch(`/api/chapters/${progress.chapterId}/paragraphs`);
            if (res.ok) {
              const data = await res.json();
              if (data.ok && data.paragraphs && data.paragraphs.length > 0) {
                const ch = data.chapter;
                const bookPreset: BookPreset = {
                  id: `sqlite-${ch.book_id}-${ch.id}`,
                  dbBookId: ch.book_id,
                  dbChapterId: ch.id,
                  bookNumber: ch.book_number,
                  title: ch.book_title,
                  author: ch.author,
                  series: 'Magic Tree House',
                  level: 'Beginner (A2)',
                  levelKey: 'beginner',
                  chapter: ch.title,
                  currentChapterNumber: ch.chapter_number,
                  coverGradient: 'from-amber-600 via-amber-700 to-indigo-950',
                  tagline: `Magic Tree House #${ch.book_number} — ${ch.book_title}`,
                  passage: data.paragraphs.map((p: any) => p.content).join('\n\n'),
                  paragraphs: data.paragraphs,
                  starterPrompt: `오늘 함께 읽을 책은 Magic Tree House #${ch.book_number} "${ch.book_title}"의 "${ch.title}"이야!`,
                  keyExpressionsPreview: ['로컬 SQLite 원서', `${data.paragraphs.length}개 문단`],
                };
                setCurrentBook(bookPreset);
                initBookSession(bookPreset);
                return;
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to restore progress, fallback to preset book', e);
      }
      // fallback
      initBookSession(PRESET_BOOKS[0]);
    };

    restoreProgress();
    updateLastProgressFromStorage();
  }, [initBookSession, updateLastProgressFromStorage]);

  const handleRestoreSuccess = () => {
    setSavedExpressions(loadSavedExpressions());
    updateLastProgressFromStorage();
  };

  // Handle changing the current book
  const handleSelectBook = (newBook: BookPreset) => {
    setCurrentBook(newBook);
    setLearnerLevel(newBook.levelKey);
    initBookSession(newBook);
  };

  // Handle changing chapter within current book
  const handleSelectChapter = async (chapterNum: number) => {
    // If it's an SQLite book with dbBookId
    if (currentBook.dbBookId) {
      try {
        const resCh = await fetch(`/api/books/${currentBook.dbBookId}/chapters`);
        if (resCh.ok) {
          const chData = await resCh.json();
          const target = chData.chapters?.find((c: any) => c.chapter_number === chapterNum);
          if (target) {
            const resPar = await fetch(`/api/chapters/${target.id}/paragraphs`);
            if (resPar.ok) {
              const parData = await resPar.json();
              const updatedBook: BookPreset = {
                ...currentBook,
                dbChapterId: target.id,
                chapter: target.title,
                currentChapterNumber: target.chapter_number,
                passage: parData.paragraphs.map((p: any) => p.content).join('\n\n'),
                paragraphs: parData.paragraphs,
              };
              setCurrentBook(updatedBook);
              initBookSession(updatedBook);
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to switch chapter from db:', e);
      }
    }

    // Fallback for preset chapters
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

  // Next / Prev chapter navigation (Step 06-D)
  const handleNextChapter = async () => {
    if (currentBook.dbBookId) {
      try {
        const resCh = await fetch(`/api/books/${currentBook.dbBookId}/chapters`);
        if (resCh.ok) {
          const chData = await resCh.json();
          const chapters = (chData.chapters || []).filter((c: any) => c.paragraph_count > 0);
          const currentIndex = chapters.findIndex((c: any) => c.id === currentBook.dbChapterId);
          if (currentIndex >= 0 && currentIndex < chapters.length - 1) {
            const nextCh = chapters[currentIndex + 1];
            handleSelectChapter(nextCh.chapter_number);
          }
        }
      } catch (e) {
        console.warn('Failed to switch to next chapter', e);
      }
    } else if (currentBook.chapters) {
      const curNum = currentBook.currentChapterNumber || 1;
      if (curNum < currentBook.chapters.length) {
        handleSelectChapter(curNum + 1);
      }
    }
  };

  const handlePrevChapter = async () => {
    if (currentBook.dbBookId) {
      try {
        const resCh = await fetch(`/api/books/${currentBook.dbBookId}/chapters`);
        if (resCh.ok) {
          const chData = await resCh.json();
          const chapters = (chData.chapters || []).filter((c: any) => c.paragraph_count > 0);
          const currentIndex = chapters.findIndex((c: any) => c.id === currentBook.dbChapterId);
          if (currentIndex > 0) {
            const prevCh = chapters[currentIndex - 1];
            handleSelectChapter(prevCh.chapter_number);
          }
        }
      } catch (e) {
        console.warn('Failed to switch to prev chapter', e);
      }
    } else if (currentBook.chapters) {
      const curNum = currentBook.currentChapterNumber || 1;
      if (curNum > 1) {
        handleSelectChapter(curNum - 1);
      }
    }
  };

  // Save expression to notebook with origin tracking (Step 07-C)
  const handleSaveExpression = (expr: KeyExpression) => {
    const enriched: KeyExpression = {
      ...expr,
      bookId: currentBook.dbBookId || currentBook.id,
      bookTitle: currentBook.title,
      chapterId: currentBook.dbChapterId || currentBook.currentChapterNumber,
      chapterTitle: currentBook.chapter,
    };
    const updated = addOrUpdateExpression(enriched);
    setSavedExpressions(updated);
  };

  const handleRemoveExpression = (expression: string) => {
    setSavedExpressions((prev) => {
      const updated = prev.filter((e) => e.expression !== expression);
      saveExpressions(updated);
      return updated;
    });
  };

  const handleClearExpressions = () => {
    if (confirm('저장된 표현 노트를 모두 비우시겠습니까?')) {
      setSavedExpressions([]);
      saveExpressions([]);
    }
  };

  // Jump to book and chapter from Notebook (Step 07-C)
  const handleJumpToPassage = async (bookId?: number | string, chapterId?: number | string) => {
    if (!chapterId) return;
    try {
      const res = await fetch(`/api/chapters/${chapterId}/paragraphs`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.paragraphs && data.paragraphs.length > 0) {
          const ch = data.chapter;
          const bookPreset: BookPreset = {
            id: `sqlite-${ch.book_id}-${ch.id}`,
            dbBookId: ch.book_id,
            dbChapterId: ch.id,
            bookNumber: ch.book_number,
            title: ch.book_title,
            author: ch.author,
            series: 'Magic Tree House',
            level: 'Beginner (A2)',
            levelKey: 'beginner',
            chapter: ch.title,
            currentChapterNumber: ch.chapter_number,
            coverGradient: 'from-amber-600 via-amber-700 to-indigo-950',
            tagline: `Magic Tree House #${ch.book_number} — ${ch.book_title}`,
            passage: data.paragraphs.map((p: any) => p.content).join('\n\n'),
            paragraphs: data.paragraphs,
            starterPrompt: `오늘 함께 읽을 책은 Magic Tree House #${ch.book_number} "${ch.book_title}"의 "${ch.title}"이야!`,
            keyExpressionsPreview: ['로컬 SQLite 원서', `${data.paragraphs.length}개 문단`],
          };
          setCurrentBook(bookPreset);
          initBookSession(bookPreset);
        }
      }
    } catch (e) {
      console.warn('Failed to jump to passage:', e);
    }
  };

  // Switch step directly from header or studio tabs (1: 읽기, 2: 듣기, 3: 말하기)
  const handleSelectStep = (step: number) => {
    setCurrentStep(step);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans">
      {/* Header with 3-step progress (1. 읽기, 2. 듣기, 3. 말하기) */}
      <Header
        currentBook={currentBook}
        currentStep={currentStep}
        onSelectStep={handleSelectStep}
        onOpenBookModal={() => setIsBookModalOpen(true)}
        onOpenNotebook={() => {
          setNotebookInitialTab('list');
          setIsNotebookOpen(true);
        }}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportNotes={() => setIsExportOpen(true)}
        currentCategory={currentCategory}
        onSelectCategory={(cat) => {
          setCurrentCategory(cat);
          if (cat === 'books') setSelectedNewsArticleId(null);
        }}
        savedExpressionsCount={savedExpressions.length}
      />

      {/* Main Workspace (Full Width Single View) */}
      <main className="flex-1 w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col min-h-0 max-w-5xl transition-all">
        {currentCategory === 'cnn_news' ? (
          selectedNewsArticleId ? (
            <CnnNewsReaderView
              articleId={selectedNewsArticleId}
              onBackToList={() => setSelectedNewsArticleId(null)}
            />
          ) : (
            <CnnNewsCategoryView
              onSelectArticle={(id) => setSelectedNewsArticleId(id)}
              onBackToBooks={() => setCurrentCategory('books')}
            />
          )
        ) : (
          <section className="rounded-3xl overflow-hidden shadow-sm bg-white border border-slate-200/80 flex flex-col min-h-[600px] h-[calc(100vh-120px)]">
            <BookPassageView
              book={currentBook}
              studyPack={studyPack}
              isLoadingStudyPack={isLoadingStudyPack}
              onSaveExpression={handleSaveExpression}
              savedExpressions={savedExpressions}
              currentStep={currentStep}
              onSetStep={handleSelectStep}
              onSelectChapter={handleSelectChapter}
              onNextChapter={handleNextChapter}
              onPrevChapter={handlePrevChapter}
              hasPrevChapter={true}
              hasNextChapter={true}
            />
          </section>
        )}
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
        onJumpToPassage={handleJumpToPassage}
        initialTab={notebookInitialTab}
      />

      <HomeDashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        lastProgress={lastReadingProgress}
        onJumpToPassage={(bookId, chapterId) => {
          handleJumpToPassage(bookId, chapterId);
        }}
        onOpenLibrary={() => setIsBookModalOpen(true)}
        onOpenNotebook={(tab) => {
          if (tab === 'review') setNotebookInitialTab('review');
          else if (tab === 'stats') setNotebookInitialTab('stats');
          else setNotebookInitialTab('list');
          setIsNotebookOpen(true);
        }}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenCnnNews={() => setCurrentCategory('cnn_news')}
      />

      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onRestoreSuccess={handleRestoreSuccess}
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
        messages={[]}
        savedExpressions={savedExpressions}
      />
    </div>
  );
}
