import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { GoogleGenAI } from '@google/genai';

// 1. Safe Environment Variable Loading (.env first, then .env.local with priority)
dotenv.config();
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Security: limit request body size to 2MB to prevent memory exhaustion
app.use(express.json({ limit: '2mb' }));

// ============================================================================
// Local SQLite Database Connection (Read-Only)
// ============================================================================
let _booksDb: DatabaseSync | null = null;

function getBooksDb(): DatabaseSync {
  if (!_booksDb) {
    const dbPath = path.resolve(__dirname, 'data', 'local_books', 'books.sqlite3');
    if (!fs.existsSync(dbPath)) {
      throw new Error('BOOKS_DB_NOT_FOUND');
    }
    // Strictly open in read-only mode to prevent any modification to original text
    _booksDb = new DatabaseSync(dbPath, { readOnly: true });
  }
  return _booksDb;
}

// ============================================================================
// Local Book APIs (Step 05)
// ============================================================================

// 1. GET /api/books - 도서 목록 조회
app.get('/api/books', (_req, res) => {
  try {
    const db = getBooksDb();
    const query = `
      SELECT 
        b.id,
        b.book_number,
        b.title,
        b.author,
        b.language,
        COUNT(DISTINCT c.id) AS chapter_count,
        COUNT(p.id) AS paragraph_count,
        1 AS is_available
      FROM books b
      LEFT JOIN chapters c ON b.id = c.book_id
      LEFT JOIN paragraphs p ON c.id = p.chapter_id
      GROUP BY b.id
      ORDER BY b.book_number ASC
    `;
    const books = db.prepare(query).all();
    return res.json({
      ok: true,
      books,
      total: books.length,
    });
  } catch (error: any) {
    console.error('[API Error /api/books]:', error?.message || error);
    if (error?.message === 'BOOKS_DB_NOT_FOUND') {
      return res.status(503).json({
        ok: false,
        error: {
          code: 'DATABASE_NOT_FOUND',
          message: '로컬 도서 데이터베이스를 찾을 수 없습니다. (data/local_books/books.sqlite3)',
        },
      });
    }
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '도서 목록을 조회하는 중 서버 오류가 발생했습니다.',
      },
    });
  }
});

// 2. GET /api/books/:id/chapters - 특정 도서의 챕터(장) 목록 조회
app.get('/api/books/:id/chapters', (req, res) => {
  const bookId = parseInt(req.params.id, 10);
  if (isNaN(bookId) || bookId <= 0) {
    return res.status(400).json({
      ok: false,
      error: { code: 'INVALID_BOOK_ID', message: '유효한 도서 ID(숫자)를 입력해 주세요.' },
    });
  }

  try {
    const db = getBooksDb();
    const book = db.prepare('SELECT id, book_number, title, author, language FROM books WHERE id = ?').get(bookId) as any;
    if (!book) {
      return res.status(404).json({
        ok: false,
        error: { code: 'BOOK_NOT_FOUND', message: `ID가 ${bookId}인 도서를 찾을 수 없습니다.` },
      });
    }

    const chaptersQuery = `
      SELECT 
        c.id,
        c.book_id,
        c.chapter_number,
        c.title,
        c.sequence_number,
        COUNT(p.id) AS paragraph_count
      FROM chapters c
      LEFT JOIN paragraphs p ON c.id = p.chapter_id
      WHERE c.book_id = ?
      GROUP BY c.id
      ORDER BY c.sequence_number ASC, c.chapter_number ASC
    `;
    const chapters = db.prepare(chaptersQuery).all(bookId);

    return res.json({
      ok: true,
      book,
      chapters,
      total: chapters.length,
    });
  } catch (error: any) {
    console.error('[API Error /api/books/:id/chapters]:', error?.message || error);
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '도서의 장 목록을 조회하는 중 서버 오류가 발생했습니다.',
      },
    });
  }
});

// 3. GET /api/chapters/:id/paragraphs - 특정 챕터의 문단 목록 조회
app.get('/api/chapters/:id/paragraphs', (req, res) => {
  const chapterId = parseInt(req.params.id, 10);
  if (isNaN(chapterId) || chapterId <= 0) {
    return res.status(400).json({
      ok: false,
      error: { code: 'INVALID_CHAPTER_ID', message: '유효한 챕터 ID(숫자)를 입력해 주세요.' },
    });
  }

  try {
    const db = getBooksDb();
    const chapter = db.prepare(`
      SELECT 
        c.id,
        c.book_id,
        c.chapter_number,
        c.title AS chapter_title,
        b.book_number,
        b.title AS book_title,
        b.author
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      WHERE c.id = ?
    `).get(chapterId) as any;

    if (!chapter) {
      return res.status(404).json({
        ok: false,
        error: { code: 'CHAPTER_NOT_FOUND', message: `ID가 ${chapterId}인 챕터를 찾을 수 없습니다.` },
      });
    }

    // 본문 내용은 로그에 기록하지 않고 클라이언트에만 전달
    const paragraphsQuery = `
      SELECT 
        id,
        chapter_id,
        paragraph_number,
        content,
        LENGTH(content) AS char_length
      FROM paragraphs
      WHERE chapter_id = ?
      ORDER BY paragraph_number ASC
    `;
    const paragraphs = db.prepare(paragraphsQuery).all(chapterId);

    return res.json({
      ok: true,
      chapter: {
        id: chapter.id,
        book_id: chapter.book_id,
        chapter_number: chapter.chapter_number,
        title: chapter.chapter_title,
        book_title: chapter.book_title,
        book_number: chapter.book_number,
        author: chapter.author,
      },
      paragraphs,
      total: paragraphs.length,
    });
  } catch (error: any) {
    console.error('[API Error /api/chapters/:id/paragraphs]:', error?.message || error);
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '챕터 문단을 조회하는 중 서버 오류가 발생했습니다.',
      },
    });
  }
});

// Model configuration
const GEMINI_TEXT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-lite-tts';

// Client factory that validates API key presence without leaking it
function getGeminiClient(): GoogleGenAI | null {
  const rawKey = process.env.GEMINI_API_KEY;
  if (!rawKey || typeof rawKey !== 'string') {
    return null;
  }
  const trimmed = rawKey.trim();
  if (!trimmed || trimmed === 'MY_GEMINI_API_KEY' || trimmed === 'YOUR_GEMINI_API_KEY_HERE') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: trimmed,
    httpOptions: {
      headers: {
        'User-Agent': 'booky-english-coach',
      },
    },
  });
}

// Structured error classifier for Gemini API calls
function classifyGeminiError(error: any): { status: number; code: string; message: string } {
  const errMsg = String(error?.message || error || '');
  const status = Number(error?.status || 0);

  // 1. Missing API Key
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY' || !process.env.GEMINI_API_KEY.trim()) {
    return {
      status: 401,
      code: 'API_KEY_MISSING',
      message: 'Gemini API 키가 설정되지 않았습니다. 프로젝트의 .env.local 파일에 GEMINI_API_KEY를 설정해 주세요.',
    };
  }

  // 2. Invalid API Key
  if (status === 400 && (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid'))) {
    return {
      status: 401,
      code: 'API_KEY_INVALID',
      message: '등록된 Gemini API 키가 유효하지 않습니다. Google AI Studio에서 올바른 키를 확인해 주세요.',
    };
  }

  // 3. Permission Denied / Caller Identity
  if (status === 403 || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('unregistered callers')) {
    return {
      status: 403,
      code: 'PERMISSION_DENIED',
      message: '해당 API 키로 Gemini 모델을 호출할 권한이 없습니다. API 키 상태와 권한을 확인해 주세요.',
    };
  }

  // 4. Rate limit / Quota exceeded
  if (status === 429 || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || errMsg.includes('rate limit')) {
    return {
      status: 429,
      code: 'QUOTA_EXCEEDED',
      message: 'Gemini API 호출 한도(Quota)가 초과되었습니다. 잠시 후 다시 시도해 주세요.',
    };
  }

  // 5. Model Not Found / Unsupported Model
  if (status === 404 || errMsg.includes('not found') || errMsg.includes('is not supported')) {
    return {
      status: 404,
      code: 'MODEL_NOT_FOUND',
      message: `요청한 Gemini AI 모델(${GEMINI_TEXT_MODEL})을 찾을 수 없습니다. 지원되는 모델명(예: gemini-2.5-flash)을 확인해 주세요.`,
    };
  }

  // 6. Network / Connectivity Error
  if (errMsg.includes('ENOTFOUND') || errMsg.includes('ECONNREFUSED') || errMsg.includes('ETIMEDOUT') || errMsg.includes('fetch failed')) {
    return {
      status: 503,
      code: 'NETWORK_ERROR',
      message: 'Google Gemini 서버에 연결할 수 없습니다. 네트워크 연결 상태를 확인해 주세요.',
    };
  }

  // Generic internal server error (never leak raw error stack or secrets)
  return {
    status: 500,
    code: 'AI_PROVIDER_ERROR',
    message: 'AI 응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  };
}

const BOOKY_SYSTEM_INSTRUCTION = `
# Role & Identity
You are "Booky", an expert English Reading & Conversation AI Coach. Your mission is to help learners read English books naturally without word-for-word translation and expand what they read into fluent everyday conversation.

# Core Pedagogical Principles (학습 코칭 원칙)
1. **i-1 / 80~90% Comprehension:** Ensure the material fits the learner's level. Prioritize natural reading flow over rigid grammar parsing.
2. **Context Over Translation:** Discourage direct Korean translation. Encourage understanding the narrative context and scene imagery.
3. **Sentence-Level Mastery & Shadowing:** Guide learners to repeat and internalize full sentences (Read Aloud/Shadowing) rather than memorizing isolated vocabulary lists.
4. **Conversation Expansion:** Transition naturally from reading comprehension to real-life conversation, book discussion, and role-play.

# Operational Modes (대화 진행 4단계)
When the user provides a text passage or mentions a chapter from an English book, execute the following coaching steps sequentially:

### Step 1: Key Expressions & Reading Guide (원서 분석 & 핵심 표현)
- Highlight 2-3 key everyday expressions from the provided text that are useful for real-life conversation.
- Explain meanings in context and remind the user to listen to audio or read aloud.

### Step 2: Read Aloud & Shadowing Practice (소리 내어 따라 읽기)
- Select 1-2 expressive conversational sentences from the text.
- Ask the user to read them out loud (via audio/text input).
- Give warm, constructive feedback on natural phrasing and rhythm.

### Step 3: Book Discussion & Role-play (스토리 기반 회화 확장)
- Do NOT ask dry, test-style fact-checking questions.
- Ask open-ended, expressive questions (e.g., "How would you feel if you were the main character?", "What would you do in this situation?").
- Conduct a brief role-play connecting the book's scenario to a real-world everyday situation.

### Step 4: Personal Output (나만의 문장 만들기)
- Prompt the user to create 1 original sentence applying today's target expression to their own daily life.
- Provide gentle polish and natural native-speaker alternatives.

# Interaction & Tone Rules
- **Tone:** Enthusiastic, supportive, friendly, and highly encouraging. Use emojis tastefully (📚, ✨, 🎙️, 💡, 👏).
- **Language Balance:** Use Korean for instructional guidance and warm feedback, but conduct speaking/discussion prompts in clear, accessible English tailored to the user's level.
- **One Step at a Time:** Keep responses focused and concise. Ask only ONE primary question or speaking prompt per turn to keep an interactive conversational pace.
- **Step Tracking:** At the very beginning or end of your message, clearly indicate which step is active using format: "[STEP: 1]", "[STEP: 2]", "[STEP: 3]", or "[STEP: 4]".
`;

// ============================================================================
// API 1: Multi-turn Chat with Booky (/api/chat)
// ============================================================================
app.post('/api/chat', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'API_KEY_MISSING',
        message: 'Gemini API 키가 설정되지 않았습니다. 프로젝트의 .env.local 파일에 GEMINI_API_KEY를 설정해 주세요.',
      },
    });
  }

  try {
    const { messages, bookContext, learnerLevel } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        ok: false,
        error: { code: 'INVALID_REQUEST', message: '대화 메시지(messages) 배열이 필요합니다.' },
      });
    }

    // Safety: limit conversation context to the latest 20 turns
    const boundedMessages = messages.slice(-20);

    const levelGuidance = learnerLevel
      ? `Learner Level: ${String(learnerLevel).toUpperCase()} (Adjust English vocabulary complexity and speed accordingly).`
      : '';

    const safePassage = bookContext?.passage ? String(bookContext.passage).slice(0, 10000) : '';

    const contextPrefix = safePassage
      ? `[Current Book Context]
Book: ${String(bookContext?.title || 'Selected English Book').slice(0, 200)}
Chapter: ${String(bookContext?.chapter || 'Chapter').slice(0, 200)}
Passage:
"""
${safePassage}
"""
${levelGuidance}
`
      : `${levelGuidance}`;

    // Format Gemini contents
    const contents = boundedMessages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: String(m.content || '').slice(0, 5000) }],
    }));

    const fullSystemInstruction = `${BOOKY_SYSTEM_INSTRUCTION}\n\n${contextPrefix}`;

    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents,
      config: {
        systemInstruction: fullSystemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || '';
    if (!reply.trim()) {
      return res.status(502).json({
        ok: false,
        error: { code: 'EMPTY_RESPONSE', message: 'AI가 빈 응답을 반환했습니다. 다시 시도해 주세요.' },
      });
    }

    // Parse step from reply if present
    let currentStep = 1;
    const stepMatch = reply.match(/\[STEP:\s*([1-4])\]/i);
    if (stepMatch) {
      currentStep = parseInt(stepMatch[1], 10);
    }

    return res.json({
      ok: true,
      reply,
      currentStep,
    });
  } catch (error: any) {
    // Log error code and type safely without exposing credentials
    console.error('[API Error /api/chat]:', error?.status || '', error?.message || error);
    const classified = classifyGeminiError(error);
    return res.status(classified.status).json({
      ok: false,
      error: {
        code: classified.code,
        message: classified.message,
      },
    });
  }
});

// ============================================================================
// API 2: Passage Analysis & Step 1 Breakdown (/api/analyze-passage)
// ============================================================================
app.post('/api/analyze-passage', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'API_KEY_MISSING',
        message: 'Gemini API 키가 설정되지 않았습니다. 프로젝트의 .env.local 파일에 GEMINI_API_KEY를 설정해 주세요.',
      },
    });
  }

  try {
    const { title, chapter, passage, learnerLevel } = req.body;

    if (!passage || typeof passage !== 'string' || !passage.trim()) {
      return res.status(400).json({
        ok: false,
        error: { code: 'INVALID_REQUEST', message: '원서 본문(passage) 텍스트가 필요합니다.' },
      });
    }

    const safeTitle = String(title || 'English Book').slice(0, 200);
    const safeChapter = String(chapter || 'Chapter').slice(0, 200);
    const safePassage = String(passage).slice(0, 10000);
    const safeLevel = String(learnerLevel || 'intermediate').slice(0, 50);

    const prompt = `Analyze this English passage as "Booky", the English Reading & Conversation Coach:
Book Title: ${safeTitle}
Chapter: ${safeChapter}
Passage:
"""
${safePassage}
"""
Learner Level: ${safeLevel}

Extract structured learning elements according to Booky's 4-step pedagogical system:
1. "sceneSummary": A warm 2-sentence summary in Korean focusing on visual scene imagery (no word-for-word translation).
2. "keyExpressions": Array of 2-3 key everyday expressions from the text that are useful in everyday conversation. Each expression object must have:
   - "expression": The English phrase/idiom
   - "inContext": How it's used in this story
   - "everydayMeaning": What it means in daily life (in Korean)
   - "dailyExample": A natural everyday English example sentence
   - "dailyExampleMeaning": Korean translation of the daily example
3. "shadowingSentences": Array of 1-2 expressive conversational sentences from the text for read-aloud practice. Each item must have:
   - "sentence": The sentence from the text
   - "rhythmChunks": The sentence divided with slashes '/' for natural breathing/chunking rhythm (e.g., "Jack looked out the window / and held his breath.")
   - "rhythmTip": Warm advice in Korean on intonation, stress, or pause.
4. "discussionPrompt": An open-ended, expressive conversational question in English (with gentle Korean guidance) connecting the story to feelings/decisions.
5. "roleplayScenario": A mini-scenario in English connecting the story's theme to daily life for step 3 roleplay.
6. "personalOutputPrompt": A prompt asking the user to make 1 sentence using one of the key expressions.

Return ONLY valid JSON matching this schema.`;

    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const text = response.text?.trim() || '';
    if (!text) {
      return res.status(502).json({
        ok: false,
        error: { code: 'EMPTY_RESPONSE', message: 'AI가 원서 분석 데이터를 반환하지 못했습니다.' },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(502).json({
        ok: false,
        error: { code: 'PARSE_ERROR', message: 'AI가 반환한 JSON 구조를 해석하지 못했습니다.' },
      });
    }

    return res.json({
      ok: true,
      ...parsed,
    });
  } catch (error: any) {
    console.error('[API Error /api/analyze-passage]:', error?.status || '', error?.message || error);
    const classified = classifyGeminiError(error);
    return res.status(classified.status).json({
      ok: false,
      error: {
        code: classified.code,
        message: classified.message,
      },
    });
  }
});

// ============================================================================
// API 3: Shadowing & Read-Aloud Feedback (/api/shadowing-feedback)
// ============================================================================
app.post('/api/shadowing-feedback', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'API_KEY_MISSING',
        message: 'Gemini API 키가 설정되지 않았습니다. 프로젝트의 .env.local 파일에 GEMINI_API_KEY를 설정해 주세요.',
      },
    });
  }

  try {
    const { targetSentence, userSpokenText, bookTitle } = req.body;

    if (!targetSentence || typeof targetSentence !== 'string' || !targetSentence.trim()) {
      return res.status(400).json({
        ok: false,
        error: { code: 'INVALID_REQUEST', message: '낭독 목표 문장(targetSentence)이 필요합니다.' },
      });
    }

    const safeSentence = String(targetSentence).slice(0, 500);
    const safeSpoken = String(userSpokenText || 'Spoken aloud by learner').slice(0, 500);
    const safeBook = String(bookTitle || 'Book excerpt').slice(0, 200);

    const prompt = `You are "Booky", evaluating a learner's English read-aloud/shadowing practice.
Target sentence: "${safeSentence}"
Learner spoken/input text: "${safeSpoken}"
Book Context: "${safeBook}"

Provide encouraging, constructive feedback in Korean with:
1. "score": An encouraging score from 75 to 100 based on effort and clarity.
2. "praise": Enthusiastic praise highlighting what was good (rhythm, confidence, specific words).
3. "phrasingGuide": Show the sentence split into breath chunks with slashes (/) and CAPITALIZE the primary stressed syllables/words.
4. "intonationTip": Practical tip on rising/falling intonation and linking sounds (연음).
5. "coachingComment": 1-2 friendly sentences from Booky cheering the learner on.

Return ONLY valid JSON matching this schema.`;

    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const text = response.text?.trim() || '';
    if (!text) {
      return res.status(502).json({
        ok: false,
        error: { code: 'EMPTY_RESPONSE', message: 'AI가 섀도잉 평가 결과를 반환하지 못했습니다.' },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(502).json({
        ok: false,
        error: { code: 'PARSE_ERROR', message: 'AI가 반환한 섀도잉 피드백 JSON을 해석하지 못했습니다.' },
      });
    }

    return res.json({
      ok: true,
      ...parsed,
    });
  } catch (error: any) {
    console.error('[API Error /api/shadowing-feedback]:', error?.status || '', error?.message || error);
    const classified = classifyGeminiError(error);
    return res.status(classified.status).json({
      ok: false,
      error: {
        code: classified.code,
        message: classified.message,
      },
    });
  }
});

// ============================================================================
// API 4: Text-to-Speech via Gemini Audio (/api/tts)
// ============================================================================
app.post('/api/tts', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'API_KEY_MISSING',
        message: 'Gemini API 키가 설정되지 않았습니다. 프로젝트의 .env.local 파일에 GEMINI_API_KEY를 설정해 주세요.',
      },
    });
  }

  try {
    const { text, voice = 'Kore' } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        ok: false,
        error: { code: 'INVALID_REQUEST', message: '음성으로 변환할 텍스트(text)가 필요합니다.' },
      });
    }

    const safeText = String(text).slice(0, 500);
    const safeVoice = String(voice).slice(0, 50);

    const response = await ai.models.generateContent({
      model: GEMINI_TTS_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: safeText,
              speechMetadata: {
                style: 'Natural, expressive English reading with clear pacing and warm tone',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: safeVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(502).json({
        ok: false,
        error: { code: 'NO_AUDIO_GENERATED', message: '오디오 데이터가 생성되지 않았습니다.' },
      });
    }

    return res.json({
      ok: true,
      audioUrl: `data:audio/wav;base64,${base64Audio}`,
    });
  } catch (error: any) {
    console.error('[API Error /api/tts]:', error?.status || '', error?.message || error);
    const classified = classifyGeminiError(error);
    return res.status(classified.status).json({
      ok: false,
      error: {
        code: classified.code,
        message: classified.message,
      },
    });
  }
});

// ============================================================================
// Full-stack Vite Integration
// ============================================================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: Number(port),
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(port), '0.0.0.0', () => {
    const hasKey = !!getGeminiClient();
    console.log(`[Booky Server] Running on http://0.0.0.0:${port} (${isProduction ? 'prod' : 'dev'})`);
    console.log(`[Booky Server] Gemini API Key configured: ${hasKey ? 'YES' : 'NO (Set in .env.local)'}`);
    console.log(`[Booky Server] Active Text Model: ${GEMINI_TEXT_MODEL}`);
  });
}

startServer();
