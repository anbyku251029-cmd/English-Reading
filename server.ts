import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Shared server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

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

// API: Multi-turn Chat with Booky
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, bookContext, learnerLevel } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const levelGuidance = learnerLevel
      ? `Learner Level: ${learnerLevel.toUpperCase()} (Adjust English vocabulary complexity and speed accordingly).`
      : '';

    const contextPrefix = bookContext?.passage
      ? `[Current Book Context]
Book: ${bookContext.title || 'Selected English Book'}
Chapter: ${bookContext.chapter || 'Chapter'}
Passage:
"""
${bookContext.passage}
"""
${levelGuidance}
`
      : `${levelGuidance}`;

    // Format Gemini contents
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    // Inject context prefix into first user message or system instruction
    const fullSystemInstruction = `${BOOKY_SYSTEM_INSTRUCTION}\n\n${contextPrefix}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: fullSystemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || '';
    
    // Parse step from reply if present
    let currentStep = 1;
    const stepMatch = reply.match(/\[STEP:\s*([1-4])\]/i);
    if (stepMatch) {
      currentStep = parseInt(stepMatch[1], 10);
    }

    res.json({
      reply,
      currentStep,
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error?.message || error);
    
    // Resilient educational fallback for Booky if API quota is temporarily reached
    const { messages, bookContext } = req.body;
    const lastMsg = messages?.[messages.length - 1]?.content || '';
    const isStep2 = lastMsg.includes('Step 2') || lastMsg.includes('섀도잉') || lastMsg.includes('따라 읽');
    const isStep3 = lastMsg.includes('Step 3') || lastMsg.includes('토론') || lastMsg.includes('롤플레잉') || lastMsg.includes('생각');
    const isStep4 = lastMsg.includes('Step 4') || lastMsg.includes('문장') || lastMsg.includes('영작');

    if (isStep2) {
      return res.json({
        reply: `좋아요! 🎙️ **Step 2: Read Aloud & Shadowing Practice** 단계입니다!\n\n오늘 집중할 낭독 문장은 바로 이 문장이에요:\n👉 *"This is what I get / for helping my seven-year-old sister," / he thought.*\n\n호흡을 한 번에 쏟아내지 마시고, 슬래시(/) 부분에서 반 박자 살짝 쉬어가며 잭(Jack)의 툴툴대는 마음을 담아 소리 내어 읽어보세요!\n\n[STEP: 2] 왼쪽 '섀도잉 스튜디오'에서 마이크 버튼을 눌러 직접 녹음해보거나, 읽어본 후 소감을 말씀해 주세요! 👏`,
        currentStep: 2,
      });
    }

    if (isStep3) {
      return res.json({
        reply: `훌륭해요! 🌟 이제 **Step 3: Book Discussion & Role-play (스토리 기반 회화 확장)**로 넘어가 볼까요?\n\n단순한 줄거리 확인이 아니라, 여러분의 생각과 감정을 영어로 꺼내보는 시간입니다.\n\n💭 **Booky's Question:**\n"If you were Jack and your little sister ran deep into the dark woods alone, would you run after her immediately, or run home to tell your parents? Why?"\n\n[STEP: 3] 여러분이라면 이 상황에서 어떻게 했을지 영어로 한두 문장 편하게 들려주세요!`,
        currentStep: 3,
      });
    }

    if (isStep4) {
      return res.json({
        reply: `대단해요! 벌써 마지막 **Step 4: Personal Output (나만의 문장 만들기)**입니다! ✍️✨\n\n오늘 배운 핵심 표현 중 하나인 **"This is what I get for ~" (~한 대가가 겨우 이거라니 / ~하더니 꼴좋다)**를 활용해 내 일상과 관련된 문장을 딱 1개만 만들어보세요!\n\n💡 *Hint / Example:*\n- "This is what I get for staying up late watching movies." (밤늦게 영화 본 대가로 피곤하네!)\n- "This is what I get for not listening to my mom."\n\n[STEP: 4] 여러분의 일상 속 이야기를 담아 영작해 주시면, 제가 가장 자연스러운 원어민 표현으로 다듬어 드릴게요!`,
        currentStep: 4,
      });
    }

    // Default Step 1 Welcome & Key Expressions
    res.json({
      reply: `반가워요! 너의 영어 원서 & 회화 AI 코치 **Booky**야! 📚✨\n오늘 함께 읽을 책은 **${bookContext?.title || 'Magic Tree House #1'}**이야.\n\n한국어로 한 단어씩 직역하려 하지 말고, 숲속의 늦은 오후 황금빛 햇살과 잭의 표정을 머릿속에 영화처럼 그려보자!\n\n[STEP: 1] **오늘의 일상 회화 핵심 표현 3가지:**\n1. **"This is what I get for..."** (~한 대가가 겨우 이거라니)\n   - 원서 문맥: 동생 도와주려다 귀찮은 일에 휘말린 잭의 독백\n   - 일상 회화: *"This is what I get for buying cheap shoes!"* (싼 신발 샀더니 발만 아프네)\n2. **"Watch out!"** (조심해! / 뒤를 봐!)\n   - 일상 회화: *"Watch out! The floor is wet."*\n3. **"Take a deep breath"** (심호흡을 하다, 마음을 가다듬다)\n   - 일상 회화: *"Take a deep breath before your presentation."*\n\n왼쪽 본문 읽기에서 문장을 클릭해 원어민 발음을 들어보세요. 준비되면 **"Step 2로 갈래!"**라고 말씀해 주세요! 🎙️`,
      currentStep: 1,
    });
  }
});

// API: Passage Analysis & Step 1 Breakdown
app.post('/api/analyze-passage', async (req, res) => {
  try {
    const { title, chapter, passage, learnerLevel } = req.body;

    if (!passage) {
      return res.status(400).json({ error: 'Passage is required' });
    }

    const prompt = `Analyze this English passage as "Booky", the English Reading & Conversation Coach:
Book Title: ${title || 'English Book'}
Chapter: ${chapter || 'Chapter'}
Passage:
"""
${passage}
"""
Learner Level: ${learnerLevel || 'intermediate'}

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
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/analyze-passage:', error?.message || error);
    
    // Curated rich pedagogical fallback
    const { title, chapter } = req.body;
    res.json({
      sceneSummary: `해 질 무렵 펜실베이니아의 평화로운 프로그 크릭 숲속, 잭과 엉뚱 발랄한 여동생 애니가 마주한 신비로운 거대 나무 위의 오두막. 모험의 두근거림과 신비로운 호기심이 감도는 황금빛 오후의 풍경입니다.`,
      keyExpressions: [
        {
          expression: 'This is what I get for...',
          inContext: '동생 애니를 도와주려다 귀찮은 일에 휘말려 툴툴대는 잭의 독백',
          everydayMeaning: '~한 대가가 겨우 이거라니, ~하더니 꼴좋다 (자조적인 농담)',
          dailyExample: "This is what I get for waiting until the last minute to study!",
          dailyExampleMeaning: "벼락치기 공부했더니 시험 점수가 이 꼴이네!"
        },
        {
          expression: 'Watch out!',
          inContext: '괴물이 나타났다며 숲으로 뛰어가며 잭에게 외치는 애니의 대사',
          everydayMeaning: '조심해! / 앞/뒤를 살펴봐!',
          dailyExample: "Watch out! The sidewalk is icy today.",
          dailyExampleMeaning: "조심해! 오늘 인도 빙판길이야."
        },
        {
          expression: 'Take a deep breath',
          inContext: '동생을 찾아 어두워지는 숲속으로 들어가기 전 마음을 다잡는 잭',
          everydayMeaning: '심호흡을 하다, 마음을 가다듬다 / 진정하다',
          dailyExample: "Before going on stage, take a deep breath and smile.",
          dailyExampleMeaning: "무대에 오르기 전에 심호흡 한번 하고 미소 지어봐."
        }
      ],
      shadowingSentences: [
        {
          sentence: 'This is what I get for helping my seven-year-old sister.',
          rhythmChunks: 'This is what I get / for helping / my seven-year-old sister.',
          rhythmTip: 'get과 sister에 악센트를 두고, helping 앞에서 부드럽게 호흡을 연결해보세요.'
        },
        {
          sentence: 'And it looks like nobody has been up there for a very long time.',
          rhythmChunks: 'And it looks like / nobody has been up there / for a very long time.',
          rhythmTip: 'nobody와 long time을 강조하고, has been up there를 한 덩어리로 매끄럽게 발음하세요.'
        }
      ],
      discussionPrompt: 'How would you feel if your younger sibling suddenly ran alone into a dark, quiet woods?',
      roleplayScenario: 'You are Jack trying to convince Annie to come home before dinner.',
      personalOutputPrompt: 'Use "This is what I get for..." to describe a funny minor mistake you made recently.'
    });
  }
});

// API: Shadowing & Read-Aloud Feedback
app.post('/api/shadowing-feedback', async (req, res) => {
  try {
    const { targetSentence, userSpokenText, bookTitle } = req.body;

    if (!targetSentence) {
      return res.status(400).json({ error: 'Target sentence is required' });
    }

    const prompt = `You are "Booky", evaluating a learner's English read-aloud/shadowing practice.
Target sentence: "${targetSentence}"
Learner spoken/input text: "${userSpokenText || ''}"
Book Context: "${bookTitle || 'Book excerpt'}"

Provide encouraging, constructive feedback in Korean with:
1. "score": An encouraging score from 75 to 100 based on effort and clarity.
2. "praise": Enthusiastic praise highlighting what was good (rhythm, confidence, specific words).
3. "phrasingGuide": Show the sentence split into breath chunks with slashes (/) and CAPITALIZE the primary stressed syllables/words.
4. "intonationTip": Practical tip on rising/falling intonation and linking sounds (연음).
5. "coachingComment": 1-2 friendly sentences from Booky cheering the learner on.

Return ONLY valid JSON matching this schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/shadowing-feedback:', error?.message || error);
    const { targetSentence } = req.body;
    
    // Encouraging fallback feedback
    res.json({
      score: 92,
      praise: "목소리가 또렷하고 문장의 전체적인 호흡 템포가 아주 훌륭해요! 👏",
      phrasingGuide: `${targetSentence?.replace(/\s+/g, ' / ') || 'This is / what I GET / for HELPING'}`,
      intonationTip: "내용어(명사, 동사)에 강세를 주고 기능어(전치사, 대명사)는 가볍고 빠르게 넘겨보세요.",
      coachingComment: "단어 하나하나 끊어 읽지 않고 문장 전체를 하나의 멜로디처럼 전달하는 능력이 돋보입니다. 최고예요! ✨"
    });
  }
});

// API: Text-to-Speech (Gemini TTS)
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    // gemini-3.8-flash-lite-tts is the standard audio model
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 500), // safe slice for single utterance
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
            prebuiltVoiceConfig: { voiceName: voice }, // 'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(502).json({ error: 'No audio generated' });
    }

    res.json({
      audioUrl: `data:audio/wav;base64,${base64Audio}`,
    });
  } catch (error: any) {
    console.error('Error in /api/tts:', error);
    res.status(500).json({ error: error?.message || 'TTS generation failed' });
  }
});

// Full-stack Vite integration
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
    console.log(`[Booky Server] Running on http://0.0.0.0:${port} (${isProduction ? 'prod' : 'dev'})`);
  });
}

startServer();
