'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Search, X, CheckCircle, RotateCcw } from 'lucide-react';
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
    setQueue([...due]);
    setCurrentIndex(0);
    setIsFlipped(false);
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
      <div className="flex flex-col min-h-[calc(100vh-80px)]">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 fixed top-0 left-0 right-0 z-40 max-w-[480px] mx-auto">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="px-4 pt-8 pb-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setScreen('queue')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center">
              <ArrowLeft size={20} />
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {currentIndex + 1} / {queue.length}
            </span>
            <div className="w-10" />
          </div>

          {/* Flashcard */}
          <div className="mb-6" style={{ perspective: 1000 }}>
            <motion.div
              className="relative w-full cursor-pointer"
              style={{ height: 280 }}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <AnimatePresence mode="wait" initial={false}>
                {!isFlipped ? (
                  <motion.div
                    key="front"
                    initial={{ rotateY: -90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: 90 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-white dark:bg-[#242424] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-md flex flex-col items-center justify-center p-6"
                  >
                    <div className="flex gap-2 mb-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        currentCard.difficulty === 'B1' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {currentCard.difficulty}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium capitalize">
                        {currentCard.category}
                      </span>
                    </div>
                    <h2 className="text-3xl font-bold text-center text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">
                      {currentCard.english}
                    </h2>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">Tap to reveal</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="back"
                    initial={{ rotateY: -90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: 90 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-white dark:bg-[#242424] rounded-2xl border border-accent/30 shadow-md flex flex-col items-center justify-center p-6"
                  >
                    <p className="text-2xl font-bold text-accent text-center mb-3">{currentCard.turkish}</p>
                    <div className="h-px bg-gray-100 dark:bg-gray-800 w-full my-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center italic leading-relaxed">
                      &ldquo;{currentCard.example}&rdquo;
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Rating buttons — only show after flip */}
          <AnimatePresence>
            {isFlipped && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-4 gap-2"
              >
                {RATING_CONFIG.map(({ rating, label, color }) => (
                  <button
                    key={rating}
                    onClick={() => handleRating(rating)}
                    className={`${color} rounded-xl py-3 text-sm font-semibold active:scale-[0.96] transition-transform min-h-[52px]`}
                  >
                    {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {!isFlipped && (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setIsFlipped(true)}
              className="mt-2"
            >
              Show Answer
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'complete') {
    const accuracy = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;

    return (
      <div className="px-4 pt-12 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <CheckCircle size={64} className="text-success mb-6" />
        </motion.div>
        <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5] mb-2">Session Complete!</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Great job keeping up your streak</p>

        <div className="w-full grid grid-cols-3 gap-3 mb-8">
          <Card padding="sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{sessionStats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Cards</p>
            </div>
          </Card>
          <Card padding="sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{accuracy}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Accuracy</p>
            </div>
          </Card>
          <Card padding="sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">+{sessionStats.xp}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">XP</p>
            </div>
          </Card>
        </div>

        <Button
          variant="primary"
          fullWidth
          onClick={() => { setScreen('queue'); setAllCards(ensureCardsLoaded()); }}
        >
          Back to Queue
        </Button>
      </div>
    );
  }

  if (screen === 'add') {
    return (
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setScreen('queue')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">Add Card</h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">English *</label>
            <input
              type="text"
              value={newCard.english}
              onChange={(e) => setNewCard({ ...newCard, english: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#242424] text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g. however"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turkish *</label>
            <input
              type="text"
              value={newCard.turkish}
              onChange={(e) => setNewCard({ ...newCard, turkish: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#242424] text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g. ancak, bununla birlikte"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Example sentence</label>
            <textarea
              value={newCard.example}
              onChange={(e) => setNewCard({ ...newCard, example: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#242424] text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              placeholder="e.g. The plan was good; however, it failed."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={newCard.category}
                onChange={(e) => setNewCard({ ...newCard, category: e.target.value as FlashCard['category'] })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#242424] text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="yds">YDS</option>
                <option value="maritime">Maritime</option>
                <option value="daily">Daily</option>
                <option value="academic">Academic</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
              <select
                value={newCard.difficulty}
                onChange={(e) => setNewCard({ ...newCard, difficulty: e.target.value as FlashCard['difficulty'] })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#242424] text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
              </select>
            </div>
          </div>
          <Button
            variant="primary"
            fullWidth
            onClick={handleAddCard}
            disabled={!newCard.english.trim() || !newCard.turkish.trim()}
          >
            Add Card
          </Button>
        </div>
      </div>
    );
  }

  // Queue screen
  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">Flashcards</h1>
        </div>
        <button
          onClick={() => setScreen('add')}
          className="p-2 rounded-full bg-accent text-white hover:bg-blue-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px] ${
              category === cat
                ? 'bg-accent text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cards..."
          className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#242424] text-[#1A1A1A] dark:text-[#F5F5F5] text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-[24px] min-w-[24px] flex items-center justify-center">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Stats card */}
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-xl font-bold text-error">{dueCards.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Due</p>
          </div>
          <div className="w-px h-8 bg-gray-100 dark:bg-gray-800" />
          <div className="text-center flex-1">
            <p className="text-xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{filteredCards.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
          </div>
          <div className="w-px h-8 bg-gray-100 dark:bg-gray-800" />
          <div className="text-center flex-1">
            <p className="text-xl font-bold text-success">{filteredCards.filter((c) => c.interval > 21).length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Mastered</p>
          </div>
        </div>
      </Card>

      {/* Start button */}
      <Button
        variant="primary"
        fullWidth
        size="lg"
        onClick={startReview}
        disabled={dueCards.length === 0}
        className="mb-6"
      >
        <RotateCcw size={18} />
        {dueCards.length > 0 ? `Review ${dueCards.length} Cards` : 'No cards due!'}
      </Button>

      {/* Card list preview */}
      {filteredCards.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">All Cards</h2>
          <div className="space-y-2">
            {filteredCards.slice(0, 20).map((card) => (
              <div
                key={card.id}
                className="flex items-center justify-between bg-white dark:bg-[#242424] rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-800"
              >
                <div>
                  <p className="font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">{card.english}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.turkish}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    card.difficulty === 'B1' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                  }`}>
                    {card.difficulty}
                  </span>
                </div>
              </div>
            ))}
            {filteredCards.length > 20 && (
              <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-2">
                +{filteredCards.length - 20} more cards
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
