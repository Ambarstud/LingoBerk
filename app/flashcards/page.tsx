'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  X, 
  CheckCircle, 
  RotateCcw, 
  Sparkles, 
  Loader2, 
  BookOpen, 
  Lightbulb, 
  Link as LinkIcon,
  HelpCircle,
  History
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useStore } from '@/store/useStore';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { applyReview, getDueCards, initCard } from '@/lib/spaced-repetition';
import { XP_VALUES } from '@/lib/xp-system';
import type { FlashCard, FlashcardRating } from '@/lib/types';
import ydsWords from '@/data/yds-words.json';

type Screen = 'queue' | 'review' | 'complete' | 'add';
type Category = 'all' | 'yds' | 'maritime' | 'daily' | 'academic';

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All',
  yds: 'YDS',
  maritime: 'Maritime',
  daily: 'Daily',
  academic: 'Academic',
};

const RATING_CONFIG = [
  { rating: 1 as FlashcardRating, label: 'Again', color: 'bg-error text-white', shortcut: '1' },
  { rating: 2 as FlashcardRating, label: 'Hard', color: 'bg-warning text-white', shortcut: '2' },
  { rating: 3 as FlashcardRating, label: 'Good', color: 'bg-success text-white', shortcut: '3' },
  { rating: 4 as FlashcardRating, label: 'Easy', color: 'bg-accent text-white', shortcut: '4' },
];

function ensureCardsLoaded(): FlashCard[] {
  const seedCards: FlashCard[] = (ydsWords as Omit<FlashCard, 'interval' | 'repetition' | 'easeFactor' | 'nextReview' | 'lastReview'>[]).map(
    (w) => initCard(w)
  );
  const existing = storage.get<FlashCard[]>(STORAGE_KEYS.FLASHCARDS);
  if (existing && existing.length > 0) {
    const existingById = new Map(existing.map((card) => [card.id, card]));
    const seedIds = new Set(seedCards.map((card) => card.id));
    const mergedSeedCards = seedCards.map((seedCard) => {
      const existingCard = existingById.get(seedCard.id);
      if (!existingCard) return seedCard;

      return {
        ...seedCard,
        interval: existingCard.interval,
        repetition: existingCard.repetition,
        easeFactor: existingCard.easeFactor,
        nextReview: existingCard.nextReview,
        lastReview: existingCard.lastReview,
      };
    });
    const nonSeedCards = existing.filter((card) => !seedIds.has(card.id));
    const mergedCards = [...mergedSeedCards, ...nonSeedCards];
    storage.set(STORAGE_KEYS.FLASHCARDS, mergedCards);
    return mergedCards;
  }

  storage.set(STORAGE_KEYS.FLASHCARDS, seedCards);
  return seedCards;
}

export default function FlashcardsPage() {
  const { addXP } = useStore();

  const [screen, setScreen] = useState<Screen>('queue');
  const [allCards, setAllCards] = useState<FlashCard[]>([]);
  const [queue, setQueue] = useState<FlashCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0, xp: 0 });

  // AI Deep Learning states
  const [loadingDeepAnalysis, setLoadingDeepAnalysis] = useState(false);
  const [deepAnalysis, setDeepAnalysis] = useState<{
    etymology?: string;
    synonyms?: string[];
    ydsContext?: string;
    mnemonic?: string;
  } | null>(null);

  // Add card form
  const [newCard, setNewCard] = useState({ english: '', turkish: '', example: '', category: 'daily' as FlashCard['category'], difficulty: 'B1' as FlashCard['difficulty'] });

  useEffect(() => {
    const cards = ensureCardsLoaded();
    setAllCards(cards);
  }, []);

  const filteredCards = allCards.filter((c) => {
    const matchCat = category === 'all' || c.category === category;
    const matchSearch = !search || c.english.toLowerCase().includes(search.toLowerCase()) || c.turkish.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const dueCards = getDueCards(filteredCards);

  const startReview = useCallback(() => {
    const due = getDueCards(filteredCards);
    if (due.length === 0) return;
    setQueue([...due].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setIsFlipped(false);
    setDeepAnalysis(null);
    setSessionStats({ correct: 0, total: 0, xp: 0 });
    setScreen('review');
  }, [filteredCards]);

  const currentCard = queue[currentIndex];

  const handleRating = (rating: FlashcardRating) => {
    if (!currentCard) return;

    const updated = applyReview(currentCard, rating);
    const newAllCards = allCards.map((c) => (c.id === updated.id ? updated : c));
    storage.set(STORAGE_KEYS.FLASHCARDS, newAllCards);
    setAllCards(newAllCards);

    const xpEarned = XP_VALUES.flashcard;
    const isCorrect = rating >= 3;

    setSessionStats((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
      xp: prev.xp + xpEarned,
    }));

    addXP(xpEarned);

    const next = currentIndex + 1;
    if (next >= queue.length) {
      setScreen('complete');
    } else {
      setCurrentIndex(next);
      setIsFlipped(false);
      setDeepAnalysis(null);
    }
  };

  const explainMore = async () => {
    if (!currentCard || loadingDeepAnalysis) return;
    setLoadingDeepAnalysis(true);
    try {
      const systemPrompt = `You are a linguistic expert helping a Turkish student with YDS English. 
      Analyze the word provided and return a JSON object with:
      {
        "etymology": "Brief origin story or word root (Turkish/English mix)",
        "synonyms": ["synonym1", "synonym2"],
        "ydsContext": "How this word typically appears in YDS (which sections, typical collocations)",
        "mnemonic": "A memorable story or trick to remember the word (in Turkish)"
      }`;

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'groq',
          systemPrompt,
          userMessage: `Analyze the word: "${currentCard.english}" (Turkish: ${currentCard.turkish}). Context: ${currentCard.category}`,
          responseFormat: 'json'
        }),
      });
      const data = await res.json();
      if (data.content) {
        setDeepAnalysis(typeof data.content === 'string' ? JSON.parse(data.content) : data.content);
      }
    } catch (err) {
      console.error('AI Analysis failed', err);
    } finally {
      setLoadingDeepAnalysis(false);
    }
  };

  const handleAddCard = () => {
    if (!newCard.english.trim() || !newCard.turkish.trim()) return;
    const card = initCard({
      id: `custom-${Date.now()}`,
      english: newCard.english.trim(),
      turkish: newCard.turkish.trim(),
      example: newCard.example.trim() || `Example: ${newCard.english}`,
      category: newCard.category,
      difficulty: newCard.difficulty,
      tags: ['custom'],
    });
    const customCards = storage.get<FlashCard[]>(STORAGE_KEYS.CUSTOM_CARDS) ?? [];
    storage.set(STORAGE_KEYS.CUSTOM_CARDS, [...customCards, card]);
    const newAll = [...allCards, card];
    storage.set(STORAGE_KEYS.FLASHCARDS, newAll);
    setAllCards(newAll);
    setNewCard({ english: '', turkish: '', example: '', category: 'daily', difficulty: 'B1' });
    setScreen('queue');
  };

  if (screen === 'review' && currentCard) {
    const progress = ((currentIndex) / queue.length) * 100;

    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-[#1A1A1A] max-w-lg mx-auto">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 sticky top-0 left-0 right-0 z-40">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="px-4 pt-6 pb-20 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setScreen('queue')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <ArrowLeft size={20} />
            </button>
            <div className="text-center">
              <span className="text-xs font-bold text-gray-400 block tracking-widest uppercase">REVIEWING</span>
              <span className="text-sm font-black text-accent">{currentIndex + 1} / {queue.length}</span>
            </div>
            <div className="w-10" />
          </div>

          {/* Flashcard */}
          <div className="mb-8" style={{ perspective: 1000 }}>
            <motion.div
              className="relative w-full cursor-pointer h-72"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <AnimatePresence mode="wait" initial={false}>
                {!isFlipped ? (
                  <motion.div
                    key="front"
                    initial={{ rotateY: -90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: 90, opacity: 0 }}
                    className="absolute inset-0 bg-white dark:bg-[#242424] rounded-[2.5rem] border-2 border-gray-100 dark:border-gray-800 shadow-xl flex flex-col items-center justify-center p-8 text-center"
                  >
                    <div className="flex gap-2 mb-6">
                      <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-accent uppercase tracking-widest">
                        {currentCard.difficulty}
                      </span>
                      <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 uppercase tracking-widest">
                        {currentCard.category}
                      </span>
                    </div>
                    <h2 className="text-4xl font-black text-[#1A1A1A] dark:text-[#F5F5F5] tracking-tight">
                      {currentCard.english}
                    </h2>
                    <p className="text-xs text-gray-400 mt-8 font-medium animate-pulse">Tap to reveal translation</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="back"
                    initial={{ rotateY: -90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: 90, opacity: 0 }}
                    className="absolute inset-0 bg-white dark:bg-[#242424] rounded-[2.5rem] border-2 border-accent/20 shadow-xl flex flex-col items-center justify-center p-8 text-center"
                  >
                    <p className="text-xs font-black text-accent uppercase tracking-widest mb-4">TRANSLATION</p>
                    <p className="text-3xl font-black text-[#1A1A1A] dark:text-[#F5F5F5] mb-6">{currentCard.turkish}</p>
                    <div className="h-px bg-gray-50 dark:bg-gray-800 w-full mb-6" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                      &ldquo;{currentCard.example}&rdquo;
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* AI Analysis Button & Panel */}
          {isFlipped && (
            <div className="mb-8">
              {!deepAnalysis && !loadingDeepAnalysis ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); explainMore(); }}
                  className="w-full py-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-bold flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors"
                >
                  <Sparkles size={18} />
                  Explain More with AI
                </button>
              ) : loadingDeepAnalysis ? (
                <div className="w-full py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center gap-2 text-gray-500 text-sm">
                  <Loader2 size={18} className="animate-spin" />
                  AI is analyzing the word...
                </div>
              ) : deepAnalysis ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Card padding="sm" className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100">
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <History size={12} /> Root
                      </h4>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug">{deepAnalysis.etymology}</p>
                    </Card>
                    <Card padding="sm" className="bg-green-50/50 dark:bg-green-900/10 border-green-100">
                      <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <LinkIcon size={12} /> Synonyms
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {deepAnalysis.synonyms?.map(s => (
                          <span key={s} className="text-[10px] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded-md border border-green-100">{s}</span>
                        ))}
                      </div>
                    </Card>
                  </div>
                  
                  <Card padding="sm" className="bg-purple-50/50 dark:bg-purple-900/10 border-purple-100">
                    <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <BookOpen size={12} /> YDS Context
                    </h4>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug">{deepAnalysis.ydsContext}</p>
                  </Card>

                  <Card padding="sm" className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-100">
                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Lightbulb size={12} /> Mnemonic (Akılda Tutma)
                    </h4>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug font-medium">{deepAnalysis.mnemonic}</p>
                  </Card>
                </motion.div>
              ) : null}
            </div>
          )}
        </div>

        {/* Rating buttons at the very bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-md max-w-lg mx-auto">
          <AnimatePresence>
            {isFlipped ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="grid grid-cols-4 gap-2"
              >
                {RATING_CONFIG.map(({ rating, label, color }) => (
                  <button
                    key={rating}
                    onClick={() => handleRating(rating)}
                    className={`${color} rounded-2xl py-4 text-sm font-black active:scale-[0.96] transition-transform min-h-[56px] shadow-lg`}
                  >
                    {label}
                  </button>
                ))}
              </motion.div>
            ) : (
              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={() => setIsFlipped(true)}
                className="rounded-2xl h-14 text-lg font-bold shadow-xl"
              >
                Reveal Answer
              </Button>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (screen === 'complete') {
    const accuracy = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;

    return (
      <div className="px-4 pt-12 flex flex-col items-center max-w-lg mx-auto min-h-screen bg-white dark:bg-[#1A1A1A]">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-8"
        >
          <CheckCircle size={48} className="text-success" />
        </motion.div>
        
        <h2 className="text-3xl font-black text-[#1A1A1A] dark:text-[#F5F5F5] mb-2">Power Session!</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-10 font-medium">Your vocabulary is growing stronger</p>

        <div className="w-full grid grid-cols-3 gap-4 mb-10">
          <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-[2rem] text-center border border-gray-100 dark:border-gray-700">
            <p className="text-3xl font-black text-[#1A1A1A] dark:text-[#F5F5F5]">{sessionStats.total}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Words</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-[2rem] text-center border border-gray-100 dark:border-gray-700">
            <p className="text-3xl font-black text-success">{accuracy}%</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Recall</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-[2rem] text-center border border-gray-100 dark:border-gray-700">
            <p className="text-3xl font-black text-warning">+{sessionStats.xp}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">XP</p>
          </div>
        </div>

        <div className="w-full space-y-4">
          <Button
            variant="primary"
            fullWidth
            size="lg"
            className="rounded-2xl h-14 text-lg font-bold"
            onClick={() => { setScreen('queue'); setAllCards(ensureCardsLoaded()); }}
          >
            Done for now
          </Button>
          <Button
            variant="ghost"
            fullWidth
            size="lg"
            className="rounded-2xl h-14 text-lg font-bold"
            onClick={startReview}
          >
            Review Again
          </Button>
        </div>
      </div>
    );
  }

  if (screen === 'add') {
    return (
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => setScreen('queue')} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">New Flashcard</h1>
        </div>

        <div className="space-y-6">
          <Card className="p-6 space-y-5">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">English Term</label>
              <input
                type="text"
                value={newCard.english}
                onChange={(e) => setNewCard({ ...newCard, english: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/20 focus:ring-2 focus:ring-accent outline-none font-bold text-lg"
                placeholder="e.g. Inevitable"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Turkish Translation</label>
              <input
                type="text"
                value={newCard.turkish}
                onChange={(e) => setNewCard({ ...newCard, turkish: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/20 focus:ring-2 focus:ring-accent outline-none font-bold text-lg"
                placeholder="e.g. Kaçınılmaz"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Contextual Example</label>
              <textarea
                value={newCard.example}
                onChange={(e) => setNewCard({ ...newCard, example: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/20 focus:ring-2 focus:ring-accent outline-none text-sm leading-relaxed"
                placeholder="How is it used in a sentence?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Category</label>
                <select
                  value={newCard.category}
                  onChange={(e) => setNewCard({ ...newCard, category: e.target.value as FlashCard['category'] })}
                  className="w-full px-3 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/20 focus:ring-2 focus:ring-accent outline-none text-xs font-bold"
                >
                  <option value="yds">YDS</option>
                  <option value="maritime">Maritime</option>
                  <option value="daily">Daily</option>
                  <option value="academic">Academic</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Difficulty</label>
                <select
                  value={newCard.difficulty}
                  onChange={(e) => setNewCard({ ...newCard, difficulty: e.target.value as FlashCard['difficulty'] })}
                  className="w-full px-3 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/20 focus:ring-2 focus:ring-accent outline-none text-xs font-bold"
                >
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                </select>
              </div>
            </div>
          </Card>

          <Button
            variant="primary"
            fullWidth
            size="lg"
            className="rounded-2xl h-14 font-bold"
            onClick={handleAddCard}
            disabled={!newCard.english.trim() || !newCard.turkish.trim()}
          >
            Create Card
          </Button>
        </div>
      </div>
    );
  }

  // Queue screen
  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto bg-white dark:bg-[#1A1A1A] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black text-[#1A1A1A] dark:text-[#F5F5F5] tracking-tight">Flashcards</h1>
        </div>
        <button
          onClick={() => setScreen('add')}
          className="w-10 h-10 rounded-2xl bg-accent text-white hover:bg-blue-700 transition-all flex items-center justify-center shadow-lg shadow-accent/20"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-2xl border border-red-100 dark:border-red-900/30">
          <p className="text-xl font-black text-error">{dueCards.length}</p>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">To Review</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/30">
          <p className="text-xl font-black text-accent">{filteredCards.length}</p>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Total</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-2xl border border-green-100 dark:border-green-900/30">
          <p className="text-xl font-black text-success">{filteredCards.filter((c) => c.interval > 21).length}</p>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Mastered</p>
        </div>
      </div>

      {/* Start button */}
      <Button
        variant="primary"
        fullWidth
        size="lg"
        onClick={startReview}
        disabled={dueCards.length === 0}
        className="rounded-[2rem] h-16 text-lg font-black shadow-xl shadow-accent/20 mb-8"
      >
        <RotateCcw size={20} className="mr-2" />
        {dueCards.length > 0 ? `Practice ${dueCards.length} Words` : 'Goal Reached!'}
      </Button>

      {/* Search & Filter Section */}
      <div className="space-y-4 mb-8">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a word..."
            className="w-full pl-12 pr-12 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-[#1A1A1A] dark:text-[#F5F5F5] text-sm font-medium focus:ring-2 focus:ring-accent outline-none"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                category === cat
                  ? 'bg-[#1A1A1A] dark:bg-[#F5F5F5] text-white dark:text-black'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border border-gray-100 dark:border-gray-800'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Card list preview */}
      {filteredCards.length > 0 && (
        <div className="space-y-3">
          {filteredCards.slice(0, 15).map((card) => (
            <motion.div
              layout
              key={card.id}
              className="flex items-center justify-between bg-white dark:bg-[#242424] rounded-2xl p-4 border border-gray-100 dark:border-gray-800 hover:border-accent/30 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-accent/20" />
                <div>
                  <p className="font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{card.english}</p>
                  <p className="text-xs text-gray-400 font-medium">{card.turkish}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-gray-50 dark:bg-gray-800 text-gray-400 uppercase tracking-widest">
                  {card.difficulty}
                </span>
                {card.repetition > 0 && (
                  <div className="flex gap-0.5">
                    {[...Array(Math.min(3, card.repetition))].map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-success" />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
