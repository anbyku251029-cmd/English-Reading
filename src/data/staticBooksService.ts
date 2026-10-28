/**
 * Booky 28권 정적 도서 서비스 (StaticBooksService)
 * 
 * Vercel 정적 호스팅 또는 로컬 백엔드 미실행(404) 환경에서도
 * Magic Tree House 28권(총 300장, 14,963문단)을 브라우저에서 100% 온전히
 * 탐색, 선택, 읽기·듣기·말하기 학습할 수 있도록 지원하는 무결점 데이터 서비스입니다.
 */

import staticData from './static28BooksData.json';

export interface StaticBook {
  id: number;
  book_number: number;
  title: string;
  author: string;
  chapter_count: number;
  paragraph_count: number;
  is_available: number;
}

export interface StaticChapter {
  id: number;
  book_id: number;
  chapter_number: number;
  title: string;
  paragraph_count: number;
}

export interface StaticParagraph {
  id: number;
  chapter_id: number;
  paragraph_number: number;
  content: string;
  char_length: number;
}

// 28권 전체 목록 조회
export function getStatic28Books(): StaticBook[] {
  return staticData.books as StaticBook[];
}

// 특정 권의 챕터 목록 조회
export function getStaticBookChapters(bookId: number): StaticChapter[] {
  return (staticData.chapters as StaticChapter[]).filter((c) => c.book_id === bookId);
}

// 특정 챕터의 본문 문단 및 챕터/도서 상세 정보 조회
export function getStaticChapterParagraphs(chapterId: number): {
  chapter: StaticChapter & { book_title: string; book_number: number; author: string };
  paragraphs: StaticParagraph[];
} | null {
  const chapter = (staticData.chapters as StaticChapter[]).find((c) => c.id === chapterId);
  if (!chapter) return null;

  const book = (staticData.books as StaticBook[]).find((b) => b.id === chapter.book_id);
  const paragraphs: StaticParagraph[] = (staticData.paragraphs as any[])
    .filter((p) => p.chapter_id === chapterId)
    .map((p) => ({
      id: p.id,
      chapter_id: p.chapter_id,
      paragraph_number: p.paragraph_number,
      content: p.content,
      char_length: p.char_length || p.content.length,
    }));

  return {
    chapter: {
      ...chapter,
      book_title: book?.title || 'Magic Tree House',
      book_number: book?.book_number || 1,
      author: book?.author || 'Mary Pope Osborne',
    },
    paragraphs,
  };
}

// 권 번호 및 챕터 번호로 챕터와 본문 조회
export function getStaticChapterByNumbers(bookNumber: number, chapterNumber: number) {
  const book = (staticData.books as StaticBook[]).find((b) => b.book_number === bookNumber);
  if (!book) return null;

  const chapter = (staticData.chapters as StaticChapter[]).find(
    (c) => c.book_id === book.id && c.chapter_number === chapterNumber
  );
  if (!chapter) return null;

  return getStaticChapterParagraphs(chapter.id);
}

// 다음 챕터 조회
export function getStaticNextChapter(bookId: number, currentChapterId: number) {
  const chapters = getStaticBookChapters(bookId);
  const currentIndex = chapters.findIndex((c) => c.id === currentChapterId);
  if (currentIndex >= 0 && currentIndex < chapters.length - 1) {
    return chapters[currentIndex + 1];
  }
  return null;
}

// 이전 챕터 조회
export function getStaticPrevChapter(bookId: number, currentChapterId: number) {
  const chapters = getStaticBookChapters(bookId);
  const currentIndex = chapters.findIndex((c) => c.id === currentChapterId);
  if (currentIndex > 0) {
    return chapters[currentIndex - 1];
  }
  return null;
}
