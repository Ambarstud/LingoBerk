# LingoBerk — Product Requirements Document (PRD)

> **Version:** 1.0
> **Date:** 15 May 2026
> **Author:** Berkay
> **Purpose:** This document is the single source of truth for any AI coding agent (Claude Code, Gemini, Codex, Cursor, etc.) building this project. Follow this document exactly.

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
- **Data storage:** Browser localStorage (Phase 1), optional Supabase migration later

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
| PWA | **next-pwa** or manual service worker | Installable on mobile home screen |
| Icons | **Lucide React** | Consistent icon set |
| Charts | **Recharts** | Progress/statistics visualizations |
| Animations | **Framer Motion** | Page transitions and micro-interactions |

### Project structure

```
lingoberk/
├── app/
│   ├── layout.tsx              # Root layout with bottom nav
│   ├── page.tsx                # Dashboard (home)
│   ├── flashcards/
│   │   └── page.tsx            # Flashcard module
│   ├── grammar/
│   │   └── page.tsx            # Grammar exercises
│   ├── reading/
│   │   └── page.tsx            # Reading comprehension
│   ├── conversation/
│   │   └── page.tsx            # Daily conversation patterns
│   ├── chat/
│   │   └── page.tsx            # AI free chat
│   ├── stats/
│   │   └── page.tsx            # Detailed statistics
│   ├── settings/
│   │   └── page.tsx            # Settings & data management
│   └── api/
│       ├── ai/
│       │   └── route.ts        # Unified AI endpoint
│       ├── generate-exercise/
│       │   └── route.ts        # AI exercise generation
│       └── check-answer/
│           └── route.ts        # AI answer checking
├── components/
│   ├── ui/                     # Reusable UI components
│   ├── dashboard/              # Dashboard-specific components
│   ├── flashcard/              # Flashcard components
│   ├── grammar/                # Grammar components
│   ├── reading/                # Reading components
│   └── layout/                 # Navigation, header, etc.
├── lib/
│   ├── storage.ts              # localStorage abstraction layer
│   ├── ai-provider.ts          # Unified AI provider interface
│   ├── spaced-repetition.ts    # SM-2 algorithm implementation
│   ├── xp-system.ts            # XP and leveling logic
│   ├── streak.ts               # Streak tracking logic
│   └── types.ts                # Shared TypeScript types
├── data/
│   ├── yds-words.json          # YDS frequent vocabulary (curated list)
│   ├── grammar-topics.json     # Grammar topics & rules
│   ├── reading-passages.json   # Reading comprehension texts
│   └── conversation-patterns.json # Daily conversation scenarios
├── public/
│   ├── manifest.json           # PWA manifest
│   └── icons/                  # App icons (192x192, 512x512)
├── .env.local                  # API keys (never commit)
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
└── package.json
```

---

## 3. Environment variables

```env
# .env.local — never commit this file
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AIza...
```

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
- **No hamburger menus** — everything from bottom nav or dashboard cards
- **Touch targets:** Minimum 44x44px
- **Safe areas:** Respect iOS safe areas with `env(safe-area-inset-bottom)`

### Dark mode

- Support both light and dark themes
- Use `prefers-color-scheme` media query with a manual toggle in settings
- Store preference in localStorage

---

## 5. Modules

### 5.1 Dashboard (Home)

The first screen. Shows daily progress and quick access to all modules.

**Components:**

1. **Header bar** — App name "LingoBerk" (left), streak fire icon + count (right), settings gear (right)

2. **Daily progress card** — Circular progress ring (0–100%), XP earned today / daily goal (e.g., "120 / 200 XP"), current level with progress bar

3. **Streak card** — Current streak count, calendar heatmap for last 30 days, best streak record

4. **Module cards** (tappable grid) — Each shows: icon, name, status (e.g., "12 words due"), badge for due items count

5. **Quick stats row** — Total words learned, exercises completed, average accuracy %

**XP system:**

| Action | XP |
|--------|-----|
| Flashcard review (per card) | 5 XP (10 XP if streak ≥7 days) |
| Grammar exercise (correct) | 15 XP |
| Reading passage (completed) | 20 XP |
| AI Chat (per 5 messages) | 10 XP |
| Daily goal | 200 XP (configurable) |

**Level formula:** `Level = floor(sqrt(totalXP / 100))`

**Streak rules:**
- Day counts as active if ≥50 XP earned
- Resets at midnight local time if previous day had <50 XP
- Data: `{ currentStreak, bestStreak, lastActiveDate, calendar: Record<string, number> }`

---

### 5.2 Flashcards module

Spaced repetition vocabulary learning using the SM-2 algorithm.

**Card data structure:**

```typescript
interface FlashCard {
  id: string;
  english: string;
  turkish: string;
  example: string;           // Example sentence in English
  category: 'yds' | 'maritime' | 'daily' | 'academic';
  difficulty: 'A2' | 'B1' | 'B2' | 'C1';
  tags: string[];
  // SM-2 fields
  interval: number;          // Days until next review
  repetition: number;        // Successful review count
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
1. Review queue screen → due card count, "Start Review" button
2. Card front → English word, large centered. Tap to reveal.
3. Card back → Turkish translation + example. Four buttons: Again (red), Hard (orange), Good (green), Easy (blue)
4. Session complete → summary: cards reviewed, accuracy, XP earned

**Features:**
- "Add custom card" button
- Filter by category (YDS, Maritime, Daily, Academic)
- Search all cards
- Progress bar during review

**Initial data:** 200+ curated YDS high-frequency words in `data/yds-words.json`. Each: english, turkish, example, category, difficulty, tags.

---

### 5.3 Grammar module

Interactive exercises mirroring YDS question types.

**Exercise types:**

1. **Gap fill (cloze):** Sentence with blank, 4 options
2. **Sentence completion:** First half given, choose correct completion from 4 options
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

**AI integration — wrong answer explanation prompt:**

```
You are an English grammar tutor helping a Turkish speaker prepare for the YDS exam.

The student answered this question:
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

**AI exercise generation:** User can request new exercises for any topic. Route Handler calls AI with structured prompt, returns JSON array of exercises stored in localStorage.

**UI flow:**
1. Topic selection grid → progress % and exercise count per topic
2. Exercise screen → one question, A/B/C/D buttons
3. Feedback panel → slides up, green/red header, AI explanation if wrong
4. Topic summary → accuracy, time, XP

---

### 5.4 Reading module

YDS-style paragraph questions.

**Data structures:**

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

interface ReadingQuestion {
  id: string;
  type: 'main_idea' | 'detail' | 'inference' | 'vocabulary_in_context' | 'author_purpose';
  question: string;
  options: string[];               // 4 options
  correctIndex: number;            // 0-3
  explanation: string;
}

interface VocabularyItem {
  word: string;
  definition: string;
  turkishTranslation: string;
}
```

**Question types (YDS format):**
- Main idea: "What is the main point of the passage?"
- Detail: "According to the passage, which is true?"
- Inference: "It can be inferred from the passage that..."
- Vocabulary in context: "The word '___' in line X is closest in meaning to..."
- Author's purpose: "The author mentions X in order to..."

**UI flow:**
1. Passage list → title, difficulty badge, category, completion status
2. Reading screen → passage text with tappable words (definition popup), questions below
3. Results → score, time, vocabulary words auto-added to flashcards

**AI integration:** Word definition on tap (if not in predefined list), passage generation on request.

**Initial data:** 10+ passages in `data/reading-passages.json` with 5 questions each.

---

### 5.5 Conversation module

Scenario-based dialogues and key phrases.

**Data structure:**

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

**Categories:** Travel, Work, Social, Maritime, Academic, Daily

**UI flow:**
1. Scenario grid → category tabs, scenario cards with difficulty + completion
2. Dialogue view → chat-bubble layout, tap bubble for Turkish translation, key phrases section
3. "Practice with AI" button → opens AI Chat with scenario context
4. Key phrases drill → flashcard-style review

**Initial data:** 15+ scenarios in `data/conversation-patterns.json`.

---

### 5.6 AI Chat module

Free-form English conversation with real-time grammar correction.

**System prompt (works with any LLM):**

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
7. If user seems stuck, offer a topic or question

Context: {scenarioContext or "free conversation"}
```

**UI:**
- Standard chat interface with message bubbles
- Corrections in highlighted box below AI response
- Topic suggestion chips: "Daily life", "Travel", "Work", "News", "Maritime", "Random"
- Provider selector in header (Claude / GPT / Gemini)
- Store last 10 conversations in localStorage

---

### 5.7 Statistics module

**Track:**
- Cumulative: totalXP, cards reviewed, exercises completed, passages read, chat messages, study minutes
- Streaks: current, best, last active date
- Daily log: xp, cards, exercises, accuracy, minutes per day
- Flashcard stats: total, mastered (>21 day interval), learning, new, avg ease factor
- Grammar stats: accuracy per topic, weak topics (<60%)
- Reading stats: avg score, passages completed, vocabulary collected

**UI sections:**
1. Overview cards (level, XP, time, accuracy)
2. Streak calendar (GitHub-style heatmap, 90 days)
3. Weekly XP bar chart (Recharts)
4. Module breakdown chart
5. Grammar weak areas (sorted by accuracy, "Practice" button)
6. Vocabulary growth line chart
7. YDS readiness score

**YDS readiness formula:**
```
ydsEstimate = (
  flashcardMasteryRate * 25 +     // Vocabulary: 25%
  grammarAccuracy * 30 +           // Grammar: 30%
  readingAccuracy * 35 +           // Reading: 35%
  min(10, chatMessages / 10)       // Practice bonus: 10%
)
```

---

## 6. Data layer

### Storage abstraction

All persistence through a single utility class (swappable to Supabase later):

```typescript
// lib/storage.ts
interface StorageProvider {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

class LocalStorageProvider implements StorageProvider {
  private prefix = 'lingoberk_';
  
  get<T>(key: string): T | null {
    const raw = localStorage.getItem(this.prefix + key);
    return raw ? JSON.parse(raw) as T : null;
  }
  
  set<T>(key: string, value: T): void {
    localStorage.setItem(this.prefix + key, JSON.stringify(value));
  }
  
  remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }
  
  clear(): void {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.prefix))
      .forEach(k => localStorage.removeItem(k));
  }
}

export const storage: StorageProvider = new LocalStorageProvider();
```

### Storage keys

| Key | Type | Description |
|-----|------|-------------|
| `flashcards` | `FlashCard[]` | All cards with SM-2 fields |
| `custom_cards` | `FlashCard[]` | User-added cards |
| `grammar_progress` | `Record<topicId, ExerciseResult[]>` | Exercise history |
| `reading_progress` | `Record<passageId, ReadingResult>` | Completion data |
| `chat_history` | `ChatConversation[]` | Last 10 conversations |
| `user_stats` | `UserStats` | Aggregated statistics |
| `settings` | `UserSettings` | App settings |
| `streak` | `StreakData` | Streak tracking |

---

## 7. AI provider abstraction

Unified interface — any module calls any AI provider without knowing specifics.

```typescript
// lib/ai-provider.ts
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
}
```

**Provider details (server-side only):**

| Provider | Endpoint | Model | Auth |
|----------|----------|-------|------|
| Claude | `api.anthropic.com/v1/messages` | **claude-haiku-4-5-20251001** | `x-api-key` header |
| GPT | `api.openai.com/v1/chat/completions` | gpt-4o-mini | `Authorization: Bearer` |
| Gemini | `generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` | gemini-2.0-flash | `key` query param |

> **Model seçimi notu:** B1–B2 seviye eğitim uygulaması için en hızlı ve en ucuz modeller seçildi. Haiku 4.5, grammar explanation ve AI chat için fazlasıyla yeterli.

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

**Service worker:** Cache static assets + JSON data for offline. Network-first for AI calls.

---

## 9. Development phases

### Phase 1 — Foundation + Flashcards ✅ TAMAMLANDI (2026-05-15)

- [x] Next.js project: TypeScript + Tailwind + Zustand
- [x] Project structure (Section 2)
- [x] Storage utility (lib/storage.ts)
- [x] Bottom navigation
- [x] Dashboard with XP, streak, level
- [x] Flashcard module with SM-2
- [x] XP and streak system
- [x] PWA manifest + service worker
- [x] YDS vocabulary dataset (205 words)
- [x] Deploy to Vercel → https://lingoberk.vercel.app
- [x] Dark mode

### Phase 2 — AI + Grammar + Reading (Week 3–5)

- [ ] AI provider abstraction (lib/ai-provider.ts)
- [ ] API Route Handlers
- [ ] Grammar module (4 exercise types)
- [ ] Grammar AI explanations
- [ ] Reading module (passages + questions)
- [ ] Tappable word definitions
- [ ] AI Chat with corrections
- [ ] Provider selector (Claude/GPT/Gemini)
- [ ] Grammar dataset
- [ ] Reading dataset (10+ passages)

### Phase 3 — Conversations + Stats + Polish (Week 6–8)

- [ ] Conversation module with dialogues
- [ ] Key phrases drill
- [ ] "Practice with AI" from conversation context
- [ ] Statistics page with charts
- [ ] YDS readiness score
- [ ] Streak heatmap
- [ ] Settings (daily goal, dark mode, export/import)
- [ ] Data export/import JSON
- [ ] Maritime English vocabulary
- [ ] Conversation dataset (15+ scenarios)

---

## 10. Quality checklist

Before any module is complete:

- [ ] Works on mobile (375px width)
- [ ] Works on desktop (centered, max 480px)
- [ ] Dark mode correct
- [ ] Touch targets ≥44px
- [ ] localStorage reads/writes work
- [ ] XP awarded correctly
- [ ] Loading states during AI calls
- [ ] Error states handled (network, AI failures)
- [ ] No TypeScript errors
- [ ] No console errors

---

## 11. Rules for AI agents

1. **Single-user app.** No auth, no user management, no database. Just localStorage.

2. **Mobile-first.** Design for 375px first. Use `max-w-lg mx-auto` to center on desktop.

3. **Cheap AI calls.** Use smallest capable model per provider. These are educational prompts.

4. **Offline capability.** Flashcards and grammar with preloaded data must work without internet.

5. **Data portability.** Export/import JSON must include ALL user data.

6. **YDS focus.** Prioritize YDS-relevant material. Connectors (however, nevertheless, moreover, although, despite) are especially important.

7. **UI language.** English interface. Turkish translations available for vocabulary and tooltips.

8. **Do not over-engineer.** No ORMs, no complex state machines, no microservices.

9. **Content data files.** The JSON files in `data/` must be well-structured with enough initial content. An app without content is useless.

10. **Use storage abstraction.** Never call localStorage directly from components. Always use `lib/storage.ts`.
