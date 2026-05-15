# LingoBerk — Product Requirements Document (PRD)

> **Version:** 1.2
> **Oluşturulma:** 15 May 2026
> **Son güncelleme:** 15 May 2026
> **Author:** Berkay
> **Purpose:** This document is the single source of truth for any AI coding agent (Claude Code, Gemini, Codex, Cursor, etc.) building this project. Follow this document exactly.

---

## 0. Proje durumu (canlı özet)

| Durum | Detay |
|-------|-------|
| **Canlı URL** | https://lingoberk.vercel.app |
| **GitHub** | https://github.com/Ambarstud/LingoBerk |
| **Vercel project** | `denbat/lingoberk` |
| **Phase 1** | ✅ Tamamlandı — 2026-05-15 |
| **Phase 2** | 🔄 Kodlanıyor (AI/Grammar/Reading/Chat) |
| **Phase 3** | 🔄 Kodlanıyor (Conversation/Stats/Polish) |
| **Claude API key** | ✅ `.env.local` + Vercel Production & Development'a eklendi |
| **OpenAI API key** | ✅ `.env.local` + Vercel Production & Development'a eklendi; ⚠️ account quota/billing gerekli |
| **Google AI key** | ⏳ Henüz eklenmedi |

---

## 1. Project overview

**LingoBerk** is a personal English learning web application with a YDS exam focus (Turkish national foreign language proficiency exam, scheduled September 2026). Target score: 60–70 (B1–B2 level).

The app is designed for a single user (the developer) and must feel like a polished mobile app when accessed from a phone browser. It includes AI-powered features using multiple LLM providers.

### Core identity

- **Name:** LingoBerk
- **Type:** Progressive Web App (PWA)
- **Primary use case:** Daily English practice (30+ min/day) with YDS exam preparation
- **Secondary use case:** Maritime English vocabulary (COLREG, bridge communication, IMO terms)
- **Deployment:** Vercel — https://lingoberk.vercel.app
- **GitHub:** https://github.com/Ambarstud/LingoBerk
- **Data storage:** Browser localStorage (Phase 1–3), optional Supabase migration later

---

## 2. Tech stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | **Next.js 14+ (App Router)** | Use `app/` directory, not `pages/` |
| Language | **TypeScript** | Strict mode enabled |
| Styling | **Tailwind CSS 3+** | Mobile-first responsive design |
| State management | **Zustand** | Client-side global state (progress, settings) |
| Data persistence | **localStorage** with JSON | Wrapped in a storage utility for future migration |
| AI backend | **Next.js Route Handlers** (`app/api/`) | Server-side API calls to LLM providers |
| AI providers | **Anthropic (Claude)**, **OpenAI (GPT)**, **Google (Gemini)** | Abstracted behind a unified interface |
| Deployment | **Vercel** | Auto-deploy from GitHub main branch |
| PWA | **next-pwa** | Installable on mobile home screen |
| Icons | **Lucide React** | Consistent icon set |
| Charts | **Recharts** | Progress/statistics visualizations |
| Animations | **Framer Motion** | Page transitions and micro-interactions |

### Gerçek proje yapısı (oluşturulan dosyalar)

```
lingoberk/
├── app/
│   ├── layout.tsx                  ✅ Root layout, bottom nav, dark mode, iOS safe area
│   ├── page.tsx                    ✅ Dashboard (home, daily plan, 6 module cards)
│   ├── flashcards/
│   │   └── page.tsx                ✅ SM-2 flashcard modülü
│   ├── grammar/
│   │   └── page.tsx                ✅ Grammar practice, AI açıklama, completion/accuracy ayrımı
│   ├── reading/
│   │   └── page.tsx                ✅ Pasaj listesi, tappable vocabulary, question flow, progress
│   ├── conversation/
│   │   └── page.tsx                ✅ Scenario grid, dialogue view, key phrases
│   ├── chat/
│   │   └── page.tsx                🔄 Phase 2'de tam modüle dönüştürülüyor
│   ├── stats/
│   │   └── page.tsx                ✅ YDS readiness, coverage, weak topics
│   ├── settings/
│   │   └── page.tsx                ✅ Ayarlar (daily goal, dark mode, export/import)
│   └── api/
│       ├── ai/
│       │   └── route.ts            ✅ Provider proxy route
│       ├── generate-exercise/
│       │   └── route.ts            ✅ AI grammar exercise generation
│       └── check-answer/
│           └── route.ts            ✅ AI grammar answer explanation
├── components/
│   ├── ui/
│   │   ├── ProgressRing.tsx        ✅ SVG dairesel ilerleme
│   │   ├── Card.tsx                ✅ Yeniden kullanılabilir kart
│   │   └── Button.tsx              ✅ primary/secondary/danger/success/ghost varyantları
│   └── layout/
│       ├── BottomNav.tsx           ✅ 5 öğeli alt navigasyon
│       └── StoreInitializer.tsx    ✅ Zustand hydration
├── lib/
│   ├── storage.ts                  ✅ localStorage katmanı (prefix: lingoberk_)
│   ├── ai-provider.ts              ✅ Claude/GPT/Gemini provider abstraction
│   ├── spaced-repetition.ts        ✅ SM-2 algoritması
│   ├── xp-system.ts                ✅ XP ve seviye sistemi
│   ├── streak.ts                   ✅ Streak takibi
│   └── types.ts                    ✅ Tüm TypeScript tipleri
├── data/
│   ├── yds-words.json              ✅ 350 YDS kelimesi
│   ├── grammar-topics.json         ✅ 10 grammar topics + summary/keyRules
│   ├── reading-passages.json       ✅ 12 YDS passages + vocabulary/questions
│   └── conversation-patterns.json  ✅ 16 conversation scenarios
├── store/
│   └── useStore.ts                 ✅ Zustand store
├── public/
│   └── manifest.json               ✅ PWA manifest
├── .env.local                       ✅ API keyleri (commit edilmez)
├── .env.example                     ✅ Örnek env dosyası
├── tailwind.config.ts               ✅
├── tsconfig.json                    ✅ (strict mode)
├── next.config.js                   ✅ (next-pwa entegreli)
└── package.json                     ✅
```

---

## 3. Environment variables

```env
# .env.local — ASLA commit etme
# Claude Haiku 4.5 — eklendi ✅
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI gpt-4o-mini — eklendi ✅
OPENAI_API_KEY=sk-...

# Google Gemini Flash — henüz eklenmedi
GOOGLE_AI_API_KEY=AIza...

# Model sabitleri (Phase 2'de kullanılacak)
CLAUDE_MODEL=claude-haiku-4-5-20251001
OPENAI_MODEL=gpt-4o-mini
GEMINI_MODEL=gemini-2.0-flash
```

**Vercel env durumu:**
- `ANTHROPIC_API_KEY` → ✅ Production, ✅ Development
- `OPENAI_API_KEY` → ✅ Production, ✅ Development; canlı test `429 insufficient_quota` döndürüyor, OpenAI billing/quota açılınca çalışır
- `GOOGLE_AI_API_KEY` → ⏳ Eklenmedi

Yeni key eklemek için: `vercel env add KEY_ADI production`

All API calls happen server-side through Next.js Route Handlers. API keys must never be exposed to the client.

---

## 4. Design system

### Visual direction

- **Aesthetic:** Clean, minimal, warm. A serious study tool with satisfying feedback loops — not childishly gamified.
- **Color palette:**
  - Background: `#FAFAF8` (light), `#1A1A1A` (dark)
  - Surface: `#FFFFFF` (light), `#242424` (dark)
  - Accent: `#2563EB` (blue-600) — CTAs, active states, progress indicators
  - Success: `#16A34A` (green-600) — correct answers
  - Error: `#DC2626` (red-600) — wrong answers
  - Warning: `#D97706` (amber-600) — streaks, fire icons
  - Text primary: `#1A1A1A` (light), `#F5F5F5` (dark)
  - Text secondary: `#6B7280` (gray-500)
- **Typography:** System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- **Border radius:** `12px` for cards, `8px` for buttons, `full` for badges/pills
- **Spacing:** 8px grid system

### Mobile-first layout

- **Max width:** 480px centered on desktop, full-width on mobile
- **Bottom navigation bar:** 5 items — Home, Flashcards, Grammar, Reading, Chat
- **Conversation ve Stats:** Dashboard kartlarından erişilir (alt nav'da değil)
- **No hamburger menus** — everything from bottom nav or dashboard cards
- **Touch targets:** Minimum 44x44px
- **Safe areas:** Respect iOS safe areas with `env(safe-area-inset-bottom)`

### Dark mode

- Class-based dark mode (`dark` class on `<html>`)
- Manual toggle in settings, stored in localStorage
- Her bileşende `dark:` Tailwind prefixleri kullanılıyor

---

## 5. Modules

### 5.1 Dashboard (Home) ✅

The first screen. Shows daily progress and quick access to all modules.

**Components:**

1. **Header bar** — App name "LingoBerk" (left), streak fire icon + count (right), settings gear (right)
2. **Daily progress card** — Circular progress ring (0–100%), XP earned today / daily goal, current level with progress bar
3. **Streak card** — Current streak count, calendar heatmap for last 30 days, best streak record
4. **Daily study plan** — 4-step student plan: vocabulary, weak grammar, next reading, conversation shadowing
5. **Module cards** (tappable 2-column grid, 3 rows = 6 cards) — Flashcards, Grammar, Reading, AI Chat, Conversations, Stats
6. **Quick stats row** — mastered words, exercises completed, average accuracy %

**XP system:**

| Action | XP |
|--------|-----|
| Flashcard review (per card) | 5 XP (10 XP if streak ≥7 days) |
| Grammar exercise (correct) | 15 XP |
| Reading passage (completed) | 20 XP |
| Conversation scenario (completed) | 5 XP |
| AI Chat (per 5 messages) | 10 XP |
| Daily goal | 200 XP (configurable) |

**Level formula:** `Level = floor(sqrt(totalXP / 100))`

**Streak rules:**
- Day counts as active if ≥50 XP earned
- Resets at midnight local time if previous day had <50 XP
- Data: `{ currentStreak, bestStreak, lastActiveDate, calendar: Record<string, number> }`

---

### 5.2 Flashcards module ✅

Spaced repetition vocabulary learning using the SM-2 algorithm.

**Card data structure:**

```typescript
interface FlashCard {
  id: string;
  english: string;
  turkish: string;
  example: string;
  category: 'yds' | 'maritime' | 'daily' | 'academic';
  difficulty: 'A2' | 'B1' | 'B2' | 'C1';
  tags: string[];
  interval: number;
  repetition: number;
  easeFactor: number;        // Default 2.5
  nextReview: string;        // ISO date
  lastReview: string | null;
}
```

**SM-2 algorithm:**

```
User rates: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
Map to quality: 1→q=1, 2→q=2, 3→q=3, 4→q=5

If q < 3: repetition = 0, interval = 1
If q >= 3:
  if repetition == 0: interval = 1
  if repetition == 1: interval = 6
  else: interval = round(interval * easeFactor)
  repetition += 1

easeFactor = max(1.3, easeFactor + (0.1 - (5-q) * (0.08 + (5-q) * 0.02)))
nextReview = today + interval days
```

**UI flow:**
1. Review queue → due count, category filter, search, "Start Review" button
2. Card front → English word, large centered. Tap to reveal.
3. Card back → Turkish translation + example. Four buttons: Again (red), Hard (orange), Good (green), Easy (blue)
4. Session complete → summary: cards reviewed, accuracy, XP earned

**Initial data:** 350 unique curated YDS words in `data/yds-words.json`.

**Seed data update behavior:** `ensureCardsLoaded()` must merge the current `data/yds-words.json` seed list into `localStorage` on page load. Existing seed cards keep their SM-2 progress fields (`interval`, `repetition`, `easeFactor`, `nextReview`, `lastReview`), newly added seed cards are initialized with default SM-2 values, and non-seed/custom cards remain untouched. This prevents older installs with the original 205-card dataset from missing newly added YDS cards.

---

### 5.3 Grammar module 🔄

Interactive exercises mirroring YDS question types.

**Exercise types:**

1. **Gap fill (cloze):** Sentence with blank, 4 options
2. **Sentence completion:** First half given, choose correct completion
3. **Error correction:** Sentence with error, select correct version
4. **Sentence rewriting:** Choose paraphrase preserving meaning (YDS "yakın anlamlı")

**Grammar topics (YDS syllabus):**

| ID | Topic | Subtopics |
|----|-------|-----------|
| tenses | Tenses | present_perfect, past_perfect, future_perfect, mixed |
| conditionals | Conditionals | zero, first, second, third, mixed |
| passive | Passive Voice | basic, advanced, causative |
| relative_clauses | Relative Clauses | defining, non_defining, reduced |
| connectors | Connectors & Transitions | contrast, cause_effect, addition, condition |
| modals | Modal Verbs | obligation, probability, past_modals |
| gerund_infinitive | Gerund & Infinitive | verb_patterns, meaning_changes |
| reported_speech | Reported Speech | statements, questions, commands |
| inversion | Inversion | negative_adverbs, conditional_inversion |
| noun_clauses | Noun Clauses | that_clauses, wh_clauses, subjunctive |

Each topic in `data/grammar-topics.json` includes:
- `summary`: one short B1-B2 explanation of what the topic tests
- `keyRules`: 2-3 compact rules shown before practice
- `exercises`: YDS-style questions with explanations

**AI — wrong answer explanation prompt:**

```
You are an English grammar tutor helping a Turkish speaker prepare for the YDS exam.

Question: {question}
Their answer: {userAnswer}
Correct answer: {correctAnswer}

Explain in clear, simple English:
1. Why the correct answer is right (1-2 sentences)
2. Why their answer was wrong (1 sentence)
3. The grammar rule to remember (1 sentence)
4. Give one similar practice sentence with the answer

Keep it concise. The student is at B1-B2 level.
```

**UI flow:**
1. Topic selection list → answered count, topic completion %, separate accuracy %, weak topics highlighted only after real attempts
2. Exercise screen → quick grammar rule, one question, A/B/C/D buttons, progress bar based on answered questions
3. Feedback panel → slides up, AI explanation if wrong
4. Topic summary → accuracy, XP

---

### 5.4 Reading module ✅

YDS-style paragraph questions.

```typescript
interface ReadingPassage {
  id: string;
  title: string;
  text: string;                    // 150–300 words
  difficulty: 'B1' | 'B2' | 'C1';
  category: 'science' | 'social' | 'technology' | 'environment' | 'history' | 'maritime';
  questions: ReadingQuestion[];
  vocabulary: VocabularyItem[];
}
```

**UI flow:**
1. Passage list → search, difficulty/category filters, completion status, previous score
2. Reading screen → highlighted tappable vocabulary, definition popup, add-to-flashcards action
3. Question flow → YDS question types, immediate explanation, answered-question progress bar
4. Results → score, first-completion XP, vocabulary → add to flashcards, `reading_progress` update

**Initial data:** 12 passages (2 maritime), 5 questions each, 4 vocabulary items each in `data/reading-passages.json`.

---

### 5.5 Conversation module ✅

Scenario-based dialogues and key phrases.

```typescript
interface ConversationScenario {
  id: string;
  title: string;
  description: string;
  category: 'travel' | 'work' | 'social' | 'maritime' | 'academic' | 'daily';
  difficulty: 'A2' | 'B1' | 'B2';
  dialogues: { speaker: 'A' | 'B'; text: string; turkishTranslation: string }[];
  keyPhrases: { phrase: string; meaning: string; usage: string; examples: string[] }[];
  practicePrompts: string[];
}
```

**Initial data:** 16 scenarios (4 maritime) in `data/conversation-patterns.json`.

**UI flow:**
1. Scenario grid → category tabs (All/Travel/Work/Maritime/Daily/Academic/Social), completion status
2. Dialogue view → chat bubbles, tap for Turkish translation
3. Key phrases accordion → phrase meaning, usage, examples, add-to-flashcards
4. Practice prompts → speaking tasks for shadowing/roleplay
5. "Practice with AI" → `/chat?scenario=...` ile AI Chat'e geçiş
6. Mark complete → `conversation_progress` update + 5 XP on first completion

---

### 5.6 AI Chat module 🔄

Free-form English conversation with real-time grammar correction.

**System prompt:**

```
You are a friendly English conversation partner helping a Turkish-speaking naval officer improve their English. The user is at B1-B2 level and preparing for the YDS exam.

Rules:
1. Respond naturally to keep the conversation going
2. Use B1-B2 vocabulary, occasionally introduce B2-C1 words with brief explanations
3. If the user makes errors, add a correction section at the END:

📝 Correction:
- Original: "{what they wrote}"
- Better: "{corrected version}"
- Why: {brief explanation}

4. If grammatically correct, do NOT add a correction section
5. Keep responses concise (2-4 sentences)
6. Occasionally suggest useful phrases related to the topic

Context: {scenarioContext or "free conversation"}
```

**UI:**
- Chat bubbles, corrections in amber box
- Provider selector: Claude / GPT / Gemini
- Topic chips: Daily life / Travel / Work / Maritime / YDS Exam / Random
- Last 10 conversations in localStorage

---

### 5.7 Statistics module ✅

**YDS readiness formula:**
```
ydsScore = (
  flashcardMasteryRate * 25 +   // Vocabulary: 25%
  grammarAccuracy * 30 +         // Grammar: 30%
  readingAccuracy * 35 +         // Reading: 35%
  min(10, chatMessages / 10)     // Practice bonus: 10%
)
```

**UI sections:**
1. Overview cards (level, XP, study days, accuracy)
2. YDS readiness score (büyük dairesel gösterge)
3. Streak calendar (GitHub heatmap, 90 gün)
4. Module breakdown bars (vocabulary/grammar/reading/conversation/chat)
5. Coverage cards (grammar/reading/speaking completion)
6. Weak grammar topics (accuracy <70%, "Practice" link)

---

## 6. Data layer

### Storage keys (güncel)

| Key | Type | Description |
|-----|------|-------------|
| `flashcards` | `FlashCard[]` | All seed + custom cards with SM-2 fields; seed cards are merged from `data/yds-words.json` without losing review progress |
| `custom_cards` | `FlashCard[]` | User-added cards |
| `grammar_progress` | `Record<topicId, { correct: number; total: number; lastPlayed: string }>` | Topic-level grammar attempts; completion and accuracy must be displayed separately |
| `reading_progress` | `Record<passageId, ReadingResult>` | Reading score, total questions, completion timestamp, time spent |
| `chat_history` | `ChatConversation[]` | Last 10 conversations |
| `user_stats` | `UserStats` | Aggregated statistics |
| `settings` | `UserSettings` | App settings |
| `streak` | `StreakData` | Streak tracking |
| `conversation_progress` | `Record<scenarioId, boolean>` | Tamamlanan senaryolar ✅ eklendi |

### TypeScript tipleri (güncel — lib/types.ts)

Phase 2/3 için eklenen tipler:
- `GrammarTopicProgress` — topicId, totalAttempts, correctAttempts, accuracy, lastPracticed ✅ eklendi
- `ChatConversation` — id, messages, createdAt, provider ✅ mevcut

---

## 7. AI provider abstraction

```typescript
// lib/ai-provider.ts (Phase 2'de oluşturulacak)
type AIProvider = 'claude' | 'gpt' | 'gemini';

interface AIRequest {
  provider: AIProvider;
  systemPrompt: string;
  userMessage: string;
  temperature?: number;       // Default 0.7
  maxTokens?: number;         // Default 1000
  responseFormat?: 'text' | 'json';
}

interface AIResponse {
  content: string;
  provider: AIProvider;
  tokensUsed?: number;
  error?: string;             // API key eksikse hata mesajı döner
}
```

**Provider detayları (server-side only):**

| Provider | Model | Auth |
|----------|-------|------|
| Claude | **claude-haiku-4-5-20251001** | `x-api-key: ANTHROPIC_API_KEY` |
| GPT | **gpt-4o-mini** | `Authorization: Bearer OPENAI_API_KEY` |
| Gemini | **gemini-2.0-flash** | `?key=GOOGLE_AI_API_KEY` |

> **Model seçim gerekçesi:** B1–B2 eğitim uygulaması için en ucuz ve hızlı modeller yeterli. Haiku 4.5, grammar açıklama ve AI sohbet için fazlasıyla kapasiteli.

**Provider görev dağılımı:** Aynı kullanıcı görevi için birden fazla LLM çağrısı yapılmaz. Grammar exercise generation ve yanlış cevap açıklamaları varsayılan olarak Claude Haiku 4.5 kullanır. GPT (`gpt-4o-mini`) ileride AI Chat, conversation roleplay ve daha serbest değerlendirme akışları için ayrılır; OpenAI quota/billing aktif değilse GPT çağrıları yerine Claude kullanılmaz, kullanıcıya net hata mesajı gösterilir. Bu politika token tüketimini kontrol altında tutmak içindir.

**Eksik/limitli key davranışı:** API key yoksa UI'da "API key gerekli" mesajı gösterir, uygulama çökmez. OpenAI `insufficient_quota` döndürürse GPT provider kullanıcıya billing/quota gerektiğini söylemeli; varsayılan provider Claude kalır.

---

## 8. PWA configuration

```json
{
  "name": "LingoBerk",
  "short_name": "LingoBerk",
  "description": "Personal English learning app with YDS focus",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FAFAF8",
  "theme_color": "#2563EB",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Service worker: next-pwa ile otomatik. Statik varlıklar + JSON data offline cache'lenir. AI çağrıları network-first.

---

## 9. Development phases

### Phase 1 — Foundation + Flashcards ✅ TAMAMLANDI (2026-05-15)

- [x] Next.js project: TypeScript + Tailwind + Zustand
- [x] Project structure
- [x] Storage utility (lib/storage.ts) — prefix: `lingoberk_`
- [x] Bottom navigation (5 items)
- [x] Dashboard with XP ring, daily study plan, streak calendar, 6 module cards
- [x] Flashcard module with SM-2 algorithm + flip animation
- [x] XP and streak system
- [x] PWA manifest + service worker (next-pwa)
- [x] YDS vocabulary dataset (350 unique words) + seed merge for existing localStorage installs
- [x] Deploy to Vercel → https://lingoberk.vercel.app
- [x] Dark mode (class-based)
- [x] Settings page (daily goal, dark mode toggle, export/import/clear)
- [x] GitHub repo → https://github.com/Ambarstud/LingoBerk

### Phase 2 — AI + Grammar + Reading + Chat 🔄 KODLANIYOR (2026-05-15)

- [x] AI provider abstraction (lib/ai-provider.ts)
- [x] API Route Handler: POST /api/ai
- [x] API Route Handler: POST /api/generate-exercise
- [x] API Route Handler: POST /api/check-answer
- [x] Grammar module tam implementasyon (4 exercise type, AI açıklama, completion vs accuracy ayrımı)
- [x] Grammar dataset (data/grammar-topics.json — 10 konu, 8+ alıştırma/konu, summary/keyRules)
- [x] Reading module tam implementasyon (search/filter, tappable words, question flow, localStorage progress, vocabulary → flashcards)
- [x] Reading dataset (data/reading-passages.json — 12 pasaj, 2 maritime, 5 soru/pasaj)
- [ ] AI Chat (sohbet balonları, grammar düzeltme kutusu, provider seçici)
- [x] Anthropic API key → ✅ `.env.local` ve Vercel'e eklendi
- [x] OpenAI API key → ✅ `.env.local` ve Vercel Production/Development'a eklendi; ⚠️ OpenAI account quota/billing açılmalı

### Phase 3 — Conversations + Stats + Polish 🔄 KODLANIYOR (2026-05-15)

- [x] Conversation module (senaryo grid, diyalog görünümü, key phrases, practice prompts, completion XP)
- [x] Conversation dataset (data/conversation-patterns.json — 16 senaryo, 4 maritime)
- [x] "Practice with AI" — conversation'dan chat'e geçiş (/chat?scenario=...)
- [x] Statistics page (YDS skoru, 90 gün heatmap, module breakdown, weak topics)
- [x] Dashboard güncelleme (daily plan + 6 modül kartı: +Conversations, +Stats)
- [ ] STORAGE_KEYS.CONVERSATION_PROGRESS → ✅ lib/storage.ts'e eklendi
- [ ] GrammarTopicProgress tipi → ✅ lib/types.ts'e eklendi

---

## 10. Quality checklist

Before any module is complete:

- [ ] Works on mobile (375px width)
- [ ] Works on desktop (centered, max 480px)
- [ ] Dark mode correct (light AND dark variants)
- [ ] Touch targets ≥44px
- [ ] localStorage reads/writes work (via storage abstraction)
- [ ] XP awarded correctly (via useStore().addXP)
- [ ] Loading states during AI calls
- [ ] Error states handled — missing API key shows friendly message, not crash
- [ ] No TypeScript errors (`npm run build` clean)
- [ ] No console errors

---

## 11. Rules for AI agents

1. **Single-user app.** No auth, no user management, no database. Just localStorage.

2. **Mobile-first.** Design for 375px first. Use `max-w-lg mx-auto` to center on desktop.

3. **Cheap AI calls.** Use smallest capable model per provider (Haiku, gpt-4o-mini, gemini-flash). Never use Sonnet/Opus/GPT-4o for educational prompts. Never call Claude and GPT for the same task unless the user explicitly asks for model comparison.

4. **Offline capability.** Flashcards and grammar with preloaded data must work without internet.

5. **Data portability.** Export/import JSON must include ALL user data.

6. **YDS focus.** Prioritize YDS-relevant material. Connectors (however, nevertheless, moreover, although, despite, furthermore, consequently, whereas, thus, hence, albeit) are especially important.

7. **UI language.** English interface. Turkish translations available for vocabulary and tooltips.

8. **Do not over-engineer.** No ORMs, no complex state machines, no microservices.

9. **Content data files.** The JSON files in `data/` must be well-structured with real, educational content. An app without content is useless.

10. **Use storage abstraction.** Never call localStorage directly from components. Always use `storage` from `lib/storage.ts`.

11. **Never expose API keys.** All AI calls go through `app/api/` Route Handlers. No key in any client file.

12. **Graceful degradation.** If an API key is missing, show a clear Turkish/English message: "Bu özellik için API key gerekli." Don't throw unhandled errors.
