/**
 * Booky STEP 09: CNN 뉴스 파일 안전 파서 유틸리티
 * 
 * - .txt, .md, .html/htm 파일 안전 파싱
 * - HTML 파싱 시 스크립트 실행 방지 (DOMParser 사용 및 유해 태그 완전 제거)
 * - 자동 제목 및 문단 추출
 * - 비지원 형식(.pdf, .docx 등)에 대한 친절한 안내 메시지 반환
 */

export interface ParsedNewsFileResult {
  success: boolean;
  error?: string;
  title?: string;
  articleDate?: string;
  source?: string;
  rawContent?: string;
  paragraphs?: string[];
  fileType?: 'txt' | 'md' | 'html';
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 최대 5MB

export function parseNewsFile(
  fileName: string,
  rawText: string,
  fileSizeBytes: number
): ParsedNewsFileResult {
  // 1. 크기 검증
  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: `파일 크기가 너무 큽니다 (최대 허용: 5MB). 선택한 파일 크기: ${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB`,
    };
  }

  const ext = fileName.split('.').pop()?.toLowerCase();

  // 2. 비지원 형식 검사
  if (ext === 'pdf' || ext === 'docx' || ext === 'doc') {
    return {
      success: false,
      error: `.${ext} 파일은 직접 업로드가 지원되지 않습니다. 본문 텍스트를 복사하여 .txt나 .md 파일로 저장하거나, [직접 텍스트 입력] 탭을 이용해주세요.`,
    };
  }

  if (ext !== 'txt' && ext !== 'md' && ext !== 'html' && ext !== 'htm') {
    return {
      success: false,
      error: `지원하지 않는 파일 형식(.${ext || 'unknown'})입니다. (.txt, .md, .html 형식 지원)`,
    };
  }

  // 3. 빈 내용 검사
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      success: false,
      error: '파일에 읽을 수 있는 텍스트 내용이 없습니다.',
    };
  }

  // 4. 형식별 파싱
  if (ext === 'html' || ext === 'htm') {
    return parseHtmlNewsContent(trimmed, fileName);
  } else if (ext === 'md') {
    return parseMarkdownNewsContent(trimmed, fileName);
  } else {
    return parsePlainTextNewsContent(trimmed, fileName);
  }
}

/**
 * HTML 파싱 (보안: 스크립트 실행 없음 + 유해 태그 제거)
 */
function parseHtmlNewsContent(htmlContent: string, fileName: string): ParsedNewsFileResult {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // 유해 및 불필요한 태그 완전 제거
    const elementsToRemove = doc.querySelectorAll(
      'script, style, noscript, iframe, object, embed, svg, header, footer, nav, aside'
    );
    elementsToRemove.forEach((el) => el.remove());

    // 1) 제목 추출
    let title = '';
    const h1 = doc.querySelector('h1');
    if (h1 && h1.textContent?.trim()) {
      title = h1.textContent.trim();
    } else {
      const docTitle = doc.querySelector('title');
      if (docTitle && docTitle.textContent?.trim()) {
        title = docTitle.textContent.trim().replace(/\s*[-|]\s*CNN.*$/i, '');
      } else {
        title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      }
    }

    // 2) 날짜 추출 시도 (meta 태그 또는 time 태그)
    let articleDate = '미확인';
    const timeEl = doc.querySelector('time');
    if (timeEl) {
      const dt = timeEl.getAttribute('datetime') || timeEl.textContent?.trim();
      if (dt) articleDate = dt.slice(0, 10);
    }
    if (articleDate === '미확인') {
      const pubMeta = doc.querySelector(
        'meta[property="article:published_time"], meta[name="pubdate"], meta[name="date"]'
      );
      const metaContent = pubMeta?.getAttribute('content');
      if (metaContent) {
        articleDate = metaContent.slice(0, 10);
      }
    }

    // 3) 문단 추출
    // article 태그가 있으면 우선 검사, 없으면 body 전체의 p 태그 검사
    const articleRoot = doc.querySelector('article, main') || doc.body;
    const pElements = Array.from(articleRoot.querySelectorAll('p'));

    let paragraphs: string[] = [];
    if (pElements.length > 0) {
      paragraphs = pElements
        .map((p) => p.textContent?.trim() || '')
        .filter((text) => text.length > 25); // 너무 짧은 광고/바이라인 제외
    }

    // 만약 p 태그가 충분치 않으면 줄바꿈 단위로 분할
    if (paragraphs.length < 2) {
      const bodyText = articleRoot.textContent || '';
      paragraphs = bodyText
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 25);
    }

    if (paragraphs.length === 0) {
      return {
        success: false,
        error: 'HTML 문서에서 본문 기사 텍스트를 추출할 수 없습니다.',
      };
    }

    return {
      success: true,
      title,
      articleDate,
      source: 'CNN',
      rawContent: paragraphs.join('\n\n'),
      paragraphs,
      fileType: 'html',
    };
  } catch (e: any) {
    return {
      success: false,
      error: `HTML 파싱 중 오류가 발생했습니다: ${e?.message || '알 수 없는 오류'}`,
    };
  }
}

/**
 * Markdown 파싱
 */
function parseMarkdownNewsContent(mdContent: string, fileName: string): ParsedNewsFileResult {
  const lines = mdContent.split('\n');
  let title = '';
  const contentLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!title && trimmedLine.startsWith('# ')) {
      title = trimmedLine.replace(/^#\s+/, '').trim();
    } else {
      contentLines.push(line);
    }
  }

  if (!title) {
    title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  }

  // 문단 분할 (빈 줄 기준)
  const rawBody = contentLines.join('\n');
  const paragraphs = rawBody
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return {
    success: true,
    title,
    articleDate: '미확인',
    source: 'CNN',
    rawContent: paragraphs.join('\n\n'),
    paragraphs: paragraphs.length > 0 ? paragraphs : [mdContent],
    fileType: 'md',
  };
}

/**
 * 일반 텍스트 (.txt) 파싱
 */
function parsePlainTextNewsContent(textContent: string, fileName: string): ParsedNewsFileResult {
  const paragraphs = textContent
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  let title = '';
  if (paragraphs.length > 0 && paragraphs[0].length < 150) {
    title = paragraphs[0];
  } else {
    title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  }

  return {
    success: true,
    title,
    articleDate: '미확인',
    source: 'CNN',
    rawContent: paragraphs.join('\n\n'),
    paragraphs: paragraphs.length > 0 ? paragraphs : [textContent],
    fileType: 'txt',
  };
}
