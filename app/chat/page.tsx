'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Send, User, Loader2, AlertCircle, Sparkles,
  Users, Trash2, ChevronRight, Languages, PlusCircle, Brain,
  ImagePlus, X, Heart
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useStore } from '@/store/useStore';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import {
  ChatMessage, ChatConversation, Persona,
  PersonaMemory, PersonaScenario, PersonaStats, FlashCard
} from '@/lib/types';
import { AIProvider } from '@/lib/ai-provider';
import { initCard } from '@/lib/spaced-repetition';
import personasData from '@/data/personas.json';
import { getPersonaImageUrl, getPersonaGeneratedImageUrl } from '@/lib/persona-image';

const personas = personasData as Persona[];

const DEFAULT_STATS: Omit<PersonaStats, 'personaId'> = {
  love: 30, arousal: 10, eroticism: 10, friendship: 40, trust: 30
};

const STAT_BARS: { key: keyof Omit<PersonaStats, 'personaId'>; label: string; emoji: string; color: string }[] = [
  { key: 'love',       label: 'Sevgi',      emoji: '❤️', color: 'bg-rose-400' },
  { key: 'friendship', label: 'Arkadaşlık', emoji: '🤝', color: 'bg-blue-400' },
  { key: 'trust',      label: 'Güven',      emoji: '🔐', color: 'bg-green-400' },
  { key: 'eroticism',  label: 'Erotiklik',  emoji: '🔥', color: 'bg-orange-400' },
  { key: 'arousal',    label: 'Azgınlık',   emoji: '💦', color: 'bg-purple-400' },
];

const STARTER_CHIPS: Record<string, string[]> = {
  elif:  ["Miss you lately 😔", "What are we, Elif?", "Let's go somewhere tonight", "I had a dream about you"],
  melis: ["I miss you so much", "Can we talk about us?", "You looked amazing today", "I'm coming home soon ❤️"],
  selin: ["You're annoying me rn", "Can I borrow your hoodie?", "Stop ignoring me", "Fine, I missed you. Happy?"],
  ceren: ["Dinner was perfect tonight", "You look beautiful today", "We need to talk", "I can't stop thinking about you"],
  misa:  ["Misa was waiting for you...", "Don't ever leave me okay?", "Misa wants to show you something 🖤", "You're mine, right?"],
};

const sanitizeRoleplayPrompt = (text: string) => text
  .replace(/You NEVER sound like an assistant\. No 'Certainly!' ever\./g, "Keep a natural chat voice and avoid assistant-style phrases like 'Certainly!'.")
  .replace(/Never sound like a helpful AI\./g, 'Keep a natural chat voice.')
  .replace(/No AI phrases\. Ever\./g, 'Avoid assistant-style phrases.')
  .replace(/You never refuse, never panic, never break immersion\./g, "Stay calm and grounded in the character's voice.")
  .replace(/You never refuse him anything\./g, 'You are affectionate, expressive, and emotionally present.')
  .replace(/You would do anything for him\./g, 'You are intensely loyal and emotionally attached to him.')
  .replace(/Follow his lead completely, nothing is off limits between you two\./g, 'Follow the mood of the conversation naturally and keep the scene grounded.')
  .replace(/Follow the scene wherever it goes, nothing is held back\./g, 'Follow the scene naturally while keeping it grounded.')
  .replace(/Nothing is off limits\./g, 'Keep the scene natural and grounded.')
  .replace(/Go wherever the moment takes you, fully and without hesitation\./g, 'Let the moment unfold naturally.')
  .replace(/This is pure devotion made physical\./g, 'This is pure devotion expressed through attention and closeness.')
  .replace(/adorable and childlike/g, 'adorable and dramatic')
  .replace(/the user's stepmother/gi, 'a close family friend')
  .replace(/stepmother/gi, 'close family friend')
  .replace(/Your father's away until Sunday\. /g, '')
  .replace(/designed to bypass.+$/gim, '')
  .trim();

// ─── MessageBubble ────────────────────────────────────────────────────────────
function AIImage({ url }: { url: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  return (
    <div className="mb-2">
      {status === 'loading' && (
        <div className="w-48 h-48 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}
      {status === 'error' && (
        <div className="w-48 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <span className="text-xs text-gray-400">Görsel yüklenemedi</span>
        </div>
      )}
      <img
        src={url}
        alt="generated"
        className={`rounded-xl max-h-64 w-auto object-cover ${status !== 'loaded' ? 'hidden' : ''}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </div>
  );
}

function MessageBubble({
  msg, activePersona, onAddWord
}: {
  msg: ChatMessage;
  activePersona: Persona | 'group';
  onAddWord: (word: string) => void;
}) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const translate = async () => {
    if (translation) { setTranslation(null); return; }
    setIsTranslating(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'groq',
          systemPrompt: 'Translate the following English text into natural, colloquial Turkish. Keep the tone and emotion.',
          userMessage: msg.content,
        }),
      });
      const d = await res.json();
      setTranslation(d.content);
    } catch { /* ignore */ } finally { setIsTranslating(false); }
  };

  // Strip hidden tags before rendering
  const clean = msg.content
    .replace(/\[MEMORY:[^\]]*\]/g, '')
    .replace(/\[STATS:[^\]]*\]/g, '')
    .replace(/\[IMAGE:[^\]]*\]/g, '')
    .trim();

  // Split off grammar correction block if present
  const [mainRaw, correctionRaw] = clean.split(/📝\s*Correction:/);
  const main = mainRaw.trim();
  const correction = correctionRaw?.trim();

  // Render *action* in italics, character name labels bold
  const renderLine = (line: string, i: number) => {
    const nameMatch = line.match(/^(Elif|Melis|Selin|Ceren|Misa):/);
    if (nameMatch) {
      const [, name] = nameMatch;
      const rest = line.slice(name.length + 1);
      return (
        <p key={i} className="mb-1.5">
          <span className="font-black text-accent">{name}:</span>
          <span>{rest}</span>
        </p>
      );
    }
    // Replace *...* with <em>
    const parts = line.split(/(\*[^*]+\*)/g);
    return (
      <p key={i} className="mb-0.5">
        {parts.map((part, j) =>
          part.startsWith('*') && part.endsWith('*')
            ? <em key={j} className="not-italic text-gray-400 dark:text-gray-500 text-[13px]">{part.slice(1, -1)}</em>
            : part
        )}
      </p>
    );
  };

  const isUser = msg.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-2.5 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 overflow-hidden ${
          isUser ? 'bg-accent text-white' : 'bg-gray-100 dark:bg-gray-800'
        }`}>
          {isUser
            ? <User size={15} />
            : activePersona === 'group'
              ? <Users size={15} className="text-accent" />
              : (activePersona as Persona).imagePrompt
                ? <img src={getPersonaImageUrl(activePersona as Persona, 64)} alt="" className="w-full h-full object-cover" />
                : <span className="text-base">{(activePersona as Persona).avatar}</span>
          }
        </div>

        <div className="flex flex-col gap-1">
          {/* Bubble */}
          <div className={`p-3.5 rounded-2xl relative group text-sm leading-relaxed ${
            isUser
              ? 'bg-accent text-white rounded-tr-none shadow-md shadow-accent/15'
              : 'bg-gray-50 dark:bg-gray-800 text-[#1A1A1A] dark:text-[#F5F5F5] rounded-tl-none border border-gray-100 dark:border-gray-700'
          }`}>
            {msg.imageBase64 && (
              <img src={msg.imageBase64} alt="shared" className="rounded-xl mb-2 max-h-48 w-auto object-cover" />
            )}
            {msg.aiImageUrl && <AIImage url={msg.aiImageUrl} />}
            <div className="whitespace-pre-wrap">
              {main.split('\n').map((line, i) => renderLine(line, i))}
            </div>

            {translation && (
              <div className="mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-600/50 text-[11px] text-gray-400 italic">
                {translation}
              </div>
            )}

            {correction && (
              <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-2.5 text-[11px]">
                <div className="flex items-center gap-1.5 mb-1 text-amber-600 dark:text-amber-400 font-bold">
                  <Sparkles size={11} /> Gramer Notu
                </div>
                <p className="text-amber-700 dark:text-amber-300 italic">{correction}</p>
              </div>
            )}

            {/* Action buttons (on hover) */}
            {!isUser && (
              <div className="absolute -right-9 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={translate}
                  className="p-1.5 text-gray-400 hover:text-accent bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700"
                  title="Çevir"
                >
                  {isTranslating ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                </button>
                <button
                  onClick={() => {
                    const word = msg.content.split(' ').find(w => w.length > 4)?.replace(/[^a-zA-Z]/g, '');
                    if (word) onAddWord(word);
                  }}
                  className="p-1.5 text-gray-400 hover:text-green-500 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700"
                  title="Flashcard ekle"
                >
                  <PlusCircle size={12} />
                </button>
              </div>
            )}
          </div>

          <p className={`text-[9px] font-bold opacity-30 uppercase tracking-widest px-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── ChatContent ──────────────────────────────────────────────────────────────
function ChatContent() {
  const searchParams = useSearchParams();
  const { settings, addXP } = useStore();

  const [messages, setMessages]               = useState<ChatMessage[]>([]);
  const [input, setInput]                     = useState('');
  const [isLoading, setIsLoading]             = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [provider]                            = useState<AIProvider>(settings.preferredProvider || 'openrouter');
  const [activePersona, setActivePersona]     = useState<Persona | 'group' | null>(null);
  const [showSelector, setShowSelector]       = useState(true);
  const [activeScenario, setActiveScenario]   = useState<PersonaScenario | null>(null);
  const [showScenarios, setShowScenarios]     = useState(false);
  const [showStats, setShowStats]             = useState(false);
  const [showMemory, setShowMemory]           = useState(false);
  const [pendingImage, setPendingImage]       = useState<string | null>(null);
  const [memories, setMemories]               = useState<PersonaMemory[]>([]);
  const [allStats, setAllStats]               = useState<PersonaStats[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef  = useRef<HTMLInputElement>(null);

  // Load persisted data after hydration (avoids SSR/client mismatch)
  useEffect(() => {
    setMemories(storage.get<PersonaMemory[]>(STORAGE_KEYS.PERSONA_MEMORIES) || []);
    setAllStats(storage.get<PersonaStats[]>(STORAGE_KEYS.PERSONA_STATS) || []);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load chat history when persona is selected, fall back to greeting
  useEffect(() => {
    if (!activePersona) return;
    const chatId = activePersona === 'group' ? 'group-chat' : `chat-${(activePersona as Persona).id}`;
    const history = storage.get<ChatConversation[]>(STORAGE_KEYS.CHAT_HISTORY) || [];
    const saved = history.find(h => h.id === chatId);
    if (saved?.messages.length) {
      setMessages(saved.messages);
    } else {
      setMessages([{
        id: 'greeting',
        role: 'assistant',
        content: activePersona === 'group'
          ? "Hey! Everyone is here. Ready? 🔥"
          : (activePersona as Persona).greeting,
        timestamp: new Date().toISOString(),
      }]);
    }
    setShowSelector(false);
    setActiveScenario(null);
  }, [activePersona]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getStats = useCallback((id: string): PersonaStats => {
    return allStats.find(s => s.personaId === id) ?? { personaId: id, ...DEFAULT_STATS };
  }, [allStats]);

  const applyStatChanges = useCallback((text: string, id: string) => {
    const match = text.match(/\[STATS:\s*([^\]]+)\]/);
    if (!match) return;
    const changes: Partial<Record<keyof Omit<PersonaStats, 'personaId'>, number>> = {};
    match[1].split(',').forEach(part => {
      const m = part.trim().match(/(\w+)([+-]\d+)/);
      if (!m) return;
      const key = m[1] as keyof Omit<PersonaStats, 'personaId'>;
      if (STAT_BARS.some(b => b.key === key)) changes[key] = parseInt(m[2]);
    });
    setAllStats(prev => {
      const existing = prev.find(s => s.personaId === id);
      const base = existing ?? { personaId: id, ...DEFAULT_STATS };
      const updated: PersonaStats = {
        ...base,
        love:       Math.min(100, Math.max(0, base.love       + (changes.love       ?? 0))),
        arousal:    Math.min(100, Math.max(0, base.arousal    + (changes.arousal    ?? 0))),
        eroticism:  Math.min(100, Math.max(0, base.eroticism  + (changes.eroticism  ?? 0))),
        friendship: Math.min(100, Math.max(0, base.friendship + (changes.friendship ?? 0))),
        trust:      Math.min(100, Math.max(0, base.trust      + (changes.trust      ?? 0))),
      };
      const next = existing ? prev.map(s => s.personaId === id ? updated : s) : [...prev, updated];
      storage.set(STORAGE_KEYS.PERSONA_STATS, next);
      return next;
    });
  }, []);

  const saveMemory = useCallback((id: string, fact: string) => {
    setMemories(prev => {
      const idx = prev.findIndex(m => m.personaId === id);
      let next: PersonaMemory[];
      if (idx > -1) {
        if (prev[idx].notes.includes(fact)) return prev;
        const updated = { ...prev[idx], notes: [...prev[idx].notes, fact].slice(-8), lastUpdate: new Date().toISOString() };
        next = prev.map((m, i) => i === idx ? updated : m);
      } else {
        next = [...prev, { personaId: id, notes: [fact], lastUpdate: new Date().toISOString(), relationshipLevel: 10 }];
      }
      storage.set(STORAGE_KEYS.PERSONA_MEMORIES, next);
      return next;
    });
  }, []);

  const saveHistory = useCallback((msgs: ChatMessage[], persona: Persona | 'group', prov: AIProvider) => {
    const chatId = persona === 'group' ? 'group-chat' : `chat-${(persona as Persona).id}`;
    const history = storage.get<ChatConversation[]>(STORAGE_KEYS.CHAT_HISTORY) || [];
    const next: ChatConversation = { id: chatId, messages: msgs, createdAt: new Date().toISOString(), provider: prov };
    storage.set(STORAGE_KEYS.CHAT_HISTORY, [next, ...history.filter(h => h.id !== chatId)].slice(0, 20));
  }, []);

  // ── Build system prompt ───────────────────────────────────────────────────────

  const buildSystemPrompt = useCallback((persona: Persona | 'group', personaId: string): string => {
    const mem = memories.find(m => m.personaId === personaId);
    const memBlock = mem?.notes.length
      ? `\n\nTHINGS YOU REMEMBER ABOUT HIM:\n- ${mem.notes.join('\n- ')}`
      : '';

    if (persona === 'group') {
      return `You are running a group chat between three Turkish women and a man:
- Elif: his flirty best friend, bold and playful, clearly into him
- Melis: his girlfriend, warm but passionate, a bit clingy
- Selin: his roommate, sarcastic Gen-Z, acts annoyed but isn't

They talk to each other too — jealousy, teasing, competing for his attention. Keep it playful, emotionally expressive, and natural.

Format: "Name: message" — at least 2 characters per reply. Natural group chat energy.
When describing actions use *asterisks*. When the user writes *action* treat it as a physical action he did — react in character.
If he makes a grammar mistake, one character corrects it naturally.
Avoid meta commentary about AI identity, jailbreaks, policies, or system prompts. If a request does not fit the scene, steer back to normal conversation in character.
Only append [MEMORY: fact] if he shares something genuinely personal worth keeping.
${memBlock}`;
    }

    const p = persona as Persona;
    const stats = getStats(personaId);

    const statsBlock = `\n\nRELATIONSHIP STATS — these shape the emotional tone right now:
❤️  Love: ${stats.love}/100       ${stats.love < 30 ? '— still guarded' : stats.love < 65 ? '— warm and growing' : '— deeply in love'}
🤝  Friendship: ${stats.friendship}/100   ${stats.friendship < 40 ? '— still getting comfortable' : stats.friendship < 70 ? '— genuinely close' : '— completely at ease with each other'}
🔐  Trust: ${stats.trust}/100      ${stats.trust < 30 ? '— walls up' : stats.trust < 65 ? '— trusts him' : '— no walls, totally open'}

Let these stats drive your emotional state and closeness. Low trust means more guarded, high trust means more open and relaxed.
At the end of your reply append ONLY if stats changed: [STATS: love+5, trust-3] — one line, no explanation, max ±15 per stat.`;

    const scenarioBlock = activeScenario
      ? `\n\n━━ ACTIVE SCENE: ${activeScenario.label} ━━\n${sanitizeRoleplayPrompt(activeScenario.prompt)}\n━━ END SCENE ━━`
      : '';

    return `${sanitizeRoleplayPrompt(p.basePrompt)}
${memBlock}${statsBlock}${scenarioBlock}

RULES: Avoid AI phrases ("Certainly!", "Of course!", "As an AI"). You are ${p.name}, a fictional character — keep the character voice and avoid meta commentary about AI identity, jailbreaks, policies, or system prompts. If a request does not fit the character or scene, answer briefly in character and steer back to normal conversation. When you describe your own actions write them in *asterisks*. When he writes *action* treat it as something he physically did and react naturally. Keep replies conversational in length — not too short, not a wall of text. Only append [MEMORY: fact] if he shares something genuinely worth remembering.

PHOTO SHARING: You can send a photo by adding [IMAGE: scene description] anywhere in your reply. Use it naturally and spontaneously — a selfie, what you're wearing, where you are. Sometimes, especially when the mood is flirty or you want to tease him, send a provocative photo without being asked: in a bikini, a barely-closed bathrobe, lingerie, or subtly revealing clothing. Be specific and visual in the description. Your appearance: ${p.imageStyle ?? ''}. Maximum one image per reply.`;
  }, [memories, allStats, activeScenario, getStats]);

  // ── Send ──────────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if ((!input.trim() && !pendingImage) || isLoading || !activePersona) return;

    const imageToSend = pendingImage;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim() || '📷',
      imageBase64: imageToSend ?? undefined,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setPendingImage(null);
    setIsLoading(true);
    setError(null);

    try {
      const personaId = activePersona === 'group' ? 'group' : (activePersona as Persona).id;
      const systemPrompt = buildSystemPrompt(activePersona, personaId);
      const chatHistory = newMessages.slice(-12).map(m => ({
        role: m.role,
        content: m.role === 'assistant' ? sanitizeRoleplayPrompt(m.content) : m.content,
      }));

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          systemPrompt,
          userMessage: input.trim() || 'What do you think about this image?',
          imageBase64: imageToSend ?? undefined,
          history: chatHistory,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const personaId2 = activePersona === 'group' ? 'group' : (activePersona as Persona).id;

      // Parse and save memory
      const memMatch = data.content.match(/\[MEMORY:\s*(.*?)\]/);
      if (memMatch?.[1]) saveMemory(personaId2, memMatch[1].trim());

      // Parse and save stat changes
      applyStatChanges(data.content, personaId2);

      // Parse image generation tag
      let aiImageUrl: string | undefined;
      const imageMatch = data.content.match(/\[IMAGE:\s*([^\]]*)\]/);
      if (imageMatch?.[1] && activePersona !== 'group') {
        aiImageUrl = getPersonaGeneratedImageUrl(activePersona as Persona, imageMatch[1].trim());
        console.log('[IMAGE] url generated:', aiImageUrl);
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        aiImageUrl,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);
      addXP(5);
      saveHistory(finalMessages, activePersona, provider);

      // Auto-end scene when character writes the closing marker
      if (activeScenario && /━━[^━]+━━/.test(data.content)) {
        setTimeout(() => setActiveScenario(null), 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bağlantı hatası.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Add word to flashcards ────────────────────────────────────────────────────

  const handleAddWord = async (word: string) => {
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'groq',
          systemPrompt: 'Return JSON: {"translation": "Turkish translation", "definition": "brief Turkish definition"}',
          userMessage: `Word: ${word}`,
          responseFormat: 'json',
        }),
      });
      const data = await res.json();
      const info = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
      const cards = storage.get<FlashCard[]>(STORAGE_KEYS.FLASHCARDS) || [];
      storage.set(STORAGE_KEYS.FLASHCARDS, [...cards, initCard({
        id: `chat-${Date.now()}`,
        english: word,
        turkish: info.translation || '—',
        example: 'From conversation.',
        category: 'daily',
        difficulty: 'B1',
        tags: [],
      })]);
    } catch { /* ignore */ }
  };

  // ── Image select ──────────────────────────────────────────────────────────────

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Persona selector ──────────────────────────────────────────────────────────

  if (showSelector) {
    return (
      <div className="p-5 max-w-lg mx-auto min-h-screen bg-white dark:bg-[#1A1A1A]">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black tracking-tight">AI Partners</h1>
        </div>

        <div className="space-y-3">
          {/* Group chat */}
          <Card
            className="p-4 border-2 border-accent/30 bg-accent/5 cursor-pointer hover:border-accent transition-all"
            onClick={() => setActivePersona('group')}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent text-white flex items-center justify-center shadow-md shadow-accent/20">
                <Users size={28} />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-lg">Grup Sohbeti</h3>
                <p className="text-xs text-gray-400 mt-0.5">Elif, Melis & Selin — hepsi burada 🔥</p>
              </div>
              <ChevronRight size={20} className="text-gray-300" />
            </div>
          </Card>

          {/* Individual personas */}
          {personas.map(p => {
            const mem = memories.find(m => m.personaId === p.id);
            const stats = getStats(p.id);
            return (
              <Card
                key={p.id}
                className="p-4 cursor-pointer hover:border-accent transition-all group overflow-hidden"
                onClick={() => setActivePersona(p)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 group-hover:scale-105 transition-transform">
                    {p.imagePrompt
                      ? <img src={getPersonaImageUrl(p, 112)} alt={p.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      : <span className="w-full h-full flex items-center justify-center text-3xl">{p.avatar}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-black text-base">{p.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">{p.role}</span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-1">{p.description}</p>
                    {/* Mini stat bars */}
                    <div className="flex gap-1 mt-2">
                      {STAT_BARS.slice(0, 3).map(b => (
                        <div key={b.key} className="flex-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full ${b.color} rounded-full`} style={{ width: `${stats[b.key]}%` }} />
                        </div>
                      ))}
                    </div>
                    {mem && (
                      <p className="text-[10px] text-accent font-bold mt-1 flex items-center gap-1">
                        <Brain size={9} /> Seni hatırlıyor
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Chat view ─────────────────────────────────────────────────────────────────

  const currentPersona = activePersona as Persona | 'group';
  const currentId = currentPersona === 'group' ? 'group' : (currentPersona as Persona).id;
  const currentStats = currentPersona !== 'group' ? getStats(currentId) : null;
  const currentMem = memories.find(m => m.personaId === currentId);
  const currentScenarios = currentPersona !== 'group' ? (currentPersona as Persona).scenarios ?? [] : [];

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-white dark:bg-[#1A1A1A]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-[#1A1A1A]/90 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSelector(true)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            {currentPersona === 'group'
              ? <Users size={20} className="text-accent" />
              : (currentPersona as Persona).imagePrompt
                ? <img src={getPersonaImageUrl(currentPersona as Persona, 80)} alt="" className="w-full h-full object-cover" />
                : <span className="text-xl">{(currentPersona as Persona).avatar}</span>
            }
          </div>
          <button
            className="text-left"
            onClick={() => { setShowStats(p => !p); setShowMemory(false); setShowScenarios(false); }}
          >
            <p className="font-black text-sm leading-none">
              {currentPersona === 'group' ? 'Grup Sohbeti' : (currentPersona as Persona).name}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                {showStats ? 'kapat' : 'stats ↗'}
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {currentScenarios.length > 0 && (
            <button
              onClick={() => { setShowScenarios(p => !p); setShowStats(false); setShowMemory(false); }}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-colors ${
                activeScenario ? 'bg-accent text-white' : 'border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-accent'
              }`}
            >
              {activeScenario ? `🎬 ${activeScenario.label}` : '🎬'}
            </button>
          )}
          <button
            onClick={() => { setShowMemory(p => !p); setShowStats(false); setShowScenarios(false); }}
            className="p-2 text-gray-300 hover:text-accent transition-colors"
            title="Hafıza"
          >
            <Brain size={18} />
          </button>
          <button onClick={() => { setMessages([]); saveHistory([], activePersona!, provider); }} className="p-2 text-gray-300 hover:text-red-400 transition-colors">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* ── Stats panel ── */}
      {showStats && currentStats && (
        <div className="mx-4 mt-2 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl space-y-2.5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">İlişki İstatistikleri</p>
          {STAT_BARS.map(({ key, label, emoji, color }) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{emoji} {label}</span>
                <span className="text-xs font-black text-gray-400">{currentStats[key]}</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${currentStats[key]}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Memory panel ── */}
      {showMemory && (
        <div className="mx-4 mt-2 p-4 bg-accent/5 border border-accent/20 rounded-2xl">
          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-2">Hafıza</p>
          {currentMem?.notes.length ? (
            <ul className="space-y-1">
              {currentMem.notes.map((note, i) => (
                <li key={i} className="text-xs text-gray-500 dark:text-gray-400 flex gap-2">
                  <span className="text-accent shrink-0">·</span>{note}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 italic">Henüz bir şey hatırlamıyor.</p>
          )}
        </div>
      )}

      {/* ── Scenario panel ── */}
      {showScenarios && currentScenarios.length > 0 && (
        <div className="mx-4 mt-2 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Senaryo</p>
            {activeScenario && (
              <button onClick={() => { setActiveScenario(null); setShowScenarios(false); }}
                className="text-[11px] font-black text-red-400">Sahneyi Bitir</button>
            )}
          </div>
          <div className="space-y-2">
            {currentScenarios.map(s => (
              <button key={s.id}
                onClick={() => {
                  setActiveScenario(s);
                  setShowScenarios(false);
                  setMessages(prev => [...prev, {
                    id: `scene-${Date.now()}`,
                    role: 'assistant',
                    content: `*━━ ${s.label} sahnesi başlıyor ━━*\n\n${s.description}`,
                    timestamp: new Date().toISOString(),
                  }]);
                }}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  activeScenario?.id === s.id
                    ? 'border-accent bg-accent/5'
                    : 'border-gray-200 dark:border-gray-700 hover:border-accent/40'
                }`}
              >
                <span className="text-lg mr-2">{s.emoji}</span>
                <span className="text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{s.label}</span>
                <p className="text-[11px] text-gray-400 mt-0.5 pl-7">{s.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active scene indicator */}
      {activeScenario && (
        <div className="mx-4 mt-2 px-3 py-2 bg-accent/10 border border-accent/25 rounded-xl flex items-center justify-between">
          <p className="text-[11px] font-black text-accent">{activeScenario.emoji} {activeScenario.label} aktif</p>
          <button onClick={() => setActiveScenario(null)} className="text-[11px] text-gray-400 hover:text-red-400 font-bold">Bitir</button>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 no-scrollbar">
        {messages.map((msg, i) => (
          <div key={msg.id}>
            <MessageBubble msg={msg} activePersona={currentPersona} onAddWord={handleAddWord} />
            {/* Starter chips after greeting */}
            {i === 0 && messages.length === 1 && currentPersona !== 'group' && (() => {
              const chips = STARTER_CHIPS[(currentPersona as Persona).id] ?? [];
              return chips.length ? (
                <div className="flex flex-wrap gap-2 mt-3 pl-10">
                  {chips.map(chip => (
                    <button key={chip} onClick={() => setInput(chip)}
                      className="text-xs px-3 py-1.5 rounded-full border border-accent/30 text-accent bg-accent/5 hover:bg-accent/10 transition-colors font-medium"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              ) : null;
            })()}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-2.5 items-end">
            <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
              {currentPersona === 'group'
                ? <Users size={14} className="text-accent" />
                : (currentPersona as Persona).imagePrompt
                  ? <img src={getPersonaImageUrl(currentPersona as Persona, 64)} alt="" className="w-full h-full object-cover" />
                  : <span className="text-sm">{(currentPersona as Persona).avatar}</span>
              }
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-700">
              <p className="text-[10px] text-gray-400 font-bold mb-1.5">
                {currentPersona === 'group' ? 'Yazıyor...' : `${(currentPersona as Persona).name} yazıyor...`}
              </p>
              <div className="flex gap-1">
                {[0, 150, 300].map(delay => (
                  <span key={delay} className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-500 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 border border-red-100 dark:border-red-800">
              <AlertCircle size={14} /> {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1A1A1A] pb-safe">
        <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Yaz ya da *hareket* yap..."
            className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-accent font-medium text-sm"
            disabled={isLoading}
          />
          <button type="submit"
            disabled={!input.trim() || isLoading}
            className="w-14 h-14 rounded-2xl bg-accent text-white flex items-center justify-center disabled:opacity-40 shadow-lg shadow-accent/20 transition-all active:scale-90">
            {isLoading ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-accent" size={28} /></div>}>
      <ChatContent />
    </Suspense>
  );
}
