'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  ChevronDown,
  FileText,
  Plus,
  RotateCcw,
  Search,
  Timer,
  XCircle,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { initCard } from '@/lib/spaced-repetition';
import { XP_VALUES, getDefaultStats } from '@/lib/xp-system';
import { useStore } from '@/store/useStore';
import type { FlashCard, ReadingPassage, ReadingResult, UserStats, VocabularyItem } from '@/lib/types';
import readingPassagesData from '@/data/reading-passages.json';

type Screen = 'list' | 'passage' | 'questions' | 'results';
type DifficultyFilter = 'all' | ReadingPassage['difficulty'];
type CategoryFilter = 'all' | ReadingPassage['category'];
type ReadingProgress = Record<string, ReadingResult>;

const passages = readingPassagesData as ReadingPassage[];

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'All',
  science: 'Science',
  social: 'Social',
  technology: 'Technology',
  environment: 'Environment',
  history: 'History',
  maritime: 'Maritime',
};

const QUESTION_TYPE_LABELS: Record<ReadingPassage['questions'][number]['type'], string> = {
  main_idea: 'Main idea',
  detail: 'Detail',
  inference: 'Inference',
  vocabulary_in_context: 'Vocabulary',
  author_purpose: 'Author purpose',
};

function normalizeWord(value: string) {
  return value.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '');
}

function getReadingMinutes(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.ceil(words / 140));
}

function getPassageAccuracy(result?: ReadingResult) {
  if (!result || result.totalQuestions === 0) return null;
  return Math.round((result.score / result.totalQuestions) * 100);
}

export default function ReadingPage() {
  const { addXP, refreshStats } = useStore();
  const [screen, setScreen] = useState<Screen>('list');
  const [progress, setProgress] = useState<ReadingProgress>({});
  const [selectedPassage, setSelectedPassage] = useState<ReadingPassage | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [activeVocab, setActiveVocab] = useState<VocabularyItem | null>(null);
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set());
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setProgress(storage.get<ReadingProgress>(STORAGE_KEYS.READING_PROGRESS) ?? {});
  }, []);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(passages.map((p) => p.category)))] as CategoryFilter[],
    []
  );

  const filteredPassages = useMemo(
    () =>
      passages.filter((passage) => {
        const matchesDifficulty = difficulty === 'all' || passage.difficulty === difficulty;
        const matchesCategory = category === 'all' || passage.category === category;
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          passage.title.toLowerCase().includes(query) ||
          passage.text.toLowerCase().includes(query) ||
          passage.vocabulary.some((item) => item.word.toLowerCase().includes(query));

        return matchesDifficulty && matchesCategory && matchesSearch;
      }),
    [category, difficulty, search]
  );

  const startPassage = (passage: ReadingPassage) => {
    setSelectedPassage(passage);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setStartedAt(Date.now());
    setSessionXP(0);
    setActiveVocab(null);
    setAddedWords(new Set());
    setScreen('passage');
  };

  const handleAnswer = (index: number) => {
    if (!selectedPassage) return;
    const question = selectedPassage.questions[currentQuestionIndex];
    setSelectedAnswers((answers) => ({ ...answers, [question.id]: index }));
  };

  const goToNextQuestion = () => {
    if (!selectedPassage) return;
    if (currentQuestionIndex + 1 >= selectedPassage.questions.length) {
      finishPassage();
    } else {
      setCurrentQuestionIndex((index) => index + 1);
    }
  };

  const finishPassage = () => {
    if (!selectedPassage) return;

    const score = selectedPassage.questions.reduce((total, question) => {
      return total + (selectedAnswers[question.id] === question.correctIndex ? 1 : 0);
    }, 0);
    const previousResult = progress[selectedPassage.id];
    const earnedXP = previousResult ? 0 : XP_VALUES.reading;
    const timeSpent = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const updatedProgress: ReadingProgress = {
      ...progress,
      [selectedPassage.id]: {
        passageId: selectedPassage.id,
        score,
        totalQuestions: selectedPassage.questions.length,
        completedAt: new Date().toISOString(),
        timeSpent,
      },
    };

    setProgress(updatedProgress);
    storage.set(STORAGE_KEYS.READING_PROGRESS, updatedProgress);

    if (earnedXP > 0) {
      addXP(earnedXP);
      setSessionXP(earnedXP);
    } else {
      setSessionXP(0);
    }

    const stats = storage.get<UserStats>(STORAGE_KEYS.USER_STATS) ?? getDefaultStats();
    const totalQuestions = selectedPassage.questions.length;
    const previousAccuracy = stats.averageAccuracy || 0;
    const completedCount = stats.exercisesCompleted;
    const updatedStats: UserStats = {
      ...stats,
      passagesRead: stats.passagesRead + (previousResult ? 0 : 1),
      exercisesCompleted: stats.exercisesCompleted + totalQuestions,
      studyMinutes: stats.studyMinutes + Math.max(1, Math.round(timeSpent / 60)),
      averageAccuracy:
        completedCount + totalQuestions > 0
          ? ((previousAccuracy * completedCount) + (score / totalQuestions) * 100 * totalQuestions) / (completedCount + totalQuestions)
          : (score / totalQuestions) * 100,
    };
    storage.set(STORAGE_KEYS.USER_STATS, updatedStats);
    refreshStats();
    setScreen('results');
  };

  const addVocabularyToFlashcards = (item: VocabularyItem) => {
    if (!selectedPassage) return;
    const cards = storage.get<FlashCard[]>(STORAGE_KEYS.FLASHCARDS) ?? [];
    const id = `reading-${selectedPassage.id}-${normalizeWord(item.word)}`;
    if (cards.some((card) => card.id === id || normalizeWord(card.english) === normalizeWord(item.word))) {
      setAddedWords((words) => new Set(words).add(item.word));
      return;
    }

    const card = initCard({
      id,
      english: item.word,
      turkish: item.turkishTranslation,
      example: `${item.word}: ${item.definition}`,
      category: selectedPassage.category === 'maritime' ? 'maritime' : 'academic',
      difficulty: selectedPassage.difficulty,
      tags: ['reading', selectedPassage.category, selectedPassage.id],
    });
    storage.set(STORAGE_KEYS.FLASHCARDS, [...cards, card]);
    setAddedWords((words) => new Set(words).add(item.word));
  };

  const renderPassageText = (passage: ReadingPassage) => {
    const vocabularyByWord = new Map(passage.vocabulary.map((item) => [normalizeWord(item.word), item]));

    return passage.text.split('\n\n').map((paragraph, paragraphIndex) => (
      <p key={paragraphIndex} className="text-sm leading-7 text-gray-700 dark:text-gray-300">
        {paragraph.split(/(\s+)/).map((token, tokenIndex) => {
          const vocabItem = vocabularyByWord.get(normalizeWord(token));
          if (!vocabItem) return token;

          return (
            <button
              key={`${paragraphIndex}-${tokenIndex}`}
              onClick={() => setActiveVocab(vocabItem)}
              className="rounded-md bg-green-50 dark:bg-green-900/20 px-1 font-semibold text-green-700 dark:text-green-300 underline decoration-green-300 underline-offset-2"
              type="button"
            >
              {token}
            </button>
          );
        })}
      </p>
    ));
  };

  const completedCount = Object.keys(progress).length;
  const selectedResult = selectedPassage ? progress[selectedPassage.id] : undefined;
  const currentQuestion = selectedPassage?.questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? selectedAnswers[currentQuestion.id] : undefined;
  const score = selectedPassage
    ? selectedPassage.questions.reduce((total, question) => total + (selectedAnswers[question.id] === question.correctIndex ? 1 : 0), 0)
    : 0;

  return (
    <div className="px-4 pt-6 pb-4">
      <AnimatePresence mode="wait">
        {screen === 'list' && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <Link
                href="/"
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ArrowLeft size={20} />
              </Link>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">Reading</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {completedCount}/{passages.length} passages complete
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-xl bg-white dark:bg-[#242424] border border-gray-100 dark:border-gray-800 p-3">
              <div className="flex items-center gap-2 mb-3">
                <Search size={16} className="text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search passages or vocabulary"
                  className="w-full bg-transparent text-sm text-[#1A1A1A] dark:text-[#F5F5F5] placeholder:text-gray-400 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value as DifficultyFilter)}
                  className="min-h-[40px] rounded-lg bg-gray-50 dark:bg-gray-800 px-3 text-sm text-[#1A1A1A] dark:text-[#F5F5F5] outline-none"
                >
                  <option value="all">All levels</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                </select>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as CategoryFilter)}
                  className="min-h-[40px] rounded-lg bg-gray-50 dark:bg-gray-800 px-3 text-sm text-[#1A1A1A] dark:text-[#F5F5F5] outline-none"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {CATEGORY_LABELS[item]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {filteredPassages.map((passage) => {
                const result = progress[passage.id];
                const accuracy = getPassageAccuracy(result);
                return (
                  <Card key={passage.id} padding="sm" className="text-left">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                          <FileText size={18} />
                        </div>
                        <div>
                          <h2 className="font-semibold text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">{passage.title}</h2>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {CATEGORY_LABELS[passage.category]} • {passage.difficulty} • {getReadingMinutes(passage.text)} min
                          </p>
                        </div>
                      </div>
                      {result && <CheckCircle size={18} className="text-success mt-1 shrink-0" />}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {passage.vocabulary.slice(0, 4).map((item) => (
                        <span
                          key={item.word}
                          className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-1 text-[11px] text-gray-600 dark:text-gray-300"
                        >
                          {item.word}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {result ? `${result.score}/${result.totalQuestions} correct • ${accuracy}%` : `${passage.questions.length} YDS questions`}
                      </div>
                      <button
                        onClick={() => startPassage(passage)}
                        className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white min-h-[36px] active:scale-95 transition-transform"
                      >
                        {result ? 'Review' : 'Start'}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        {screen === 'passage' && selectedPassage && (
          <motion.div key="passage" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setScreen('list')}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                type="button"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1">
                <h1 className="text-lg font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{selectedPassage.title}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {CATEGORY_LABELS[selectedPassage.category]} • {selectedPassage.difficulty} • {getReadingMinutes(selectedPassage.text)} min
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#242424] rounded-xl border border-gray-100 dark:border-gray-800 p-4 mb-4 space-y-4">
              {renderPassageText(selectedPassage)}
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-green-600 dark:text-green-400" />
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">Vocabulary</p>
                </div>
                <ChevronDown size={16} className="text-green-600 dark:text-green-400" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {selectedPassage.vocabulary.map((item) => (
                  <button
                    key={item.word}
                    onClick={() => setActiveVocab(item)}
                    className="rounded-lg bg-white/80 dark:bg-[#242424]/80 p-2 text-left text-xs text-gray-700 dark:text-gray-300"
                    type="button"
                  >
                    <span className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">{item.word}</span>
                    <span className="block text-gray-500 dark:text-gray-400">{item.turkishTranslation}</span>
                  </button>
                ))}
              </div>
            </div>

            {activeVocab && (
              <div className="bg-white dark:bg-[#242424] border border-green-200 dark:border-green-800 rounded-xl p-4 mb-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{activeVocab.word}</p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">{activeVocab.turkishTranslation}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{activeVocab.definition}</p>
                  </div>
                  <button
                    onClick={() => addVocabularyToFlashcards(activeVocab)}
                    className="rounded-lg bg-gray-100 dark:bg-gray-800 p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-accent"
                    type="button"
                    title="Add to flashcards"
                  >
                    {addedWords.has(activeVocab.word) ? <CheckCircle size={18} /> : <Plus size={18} />}
                  </button>
                </div>
              </div>
            )}

            <Button fullWidth onClick={() => setScreen('questions')}>
              Start Questions
            </Button>
          </motion.div>
        )}

        {screen === 'questions' && selectedPassage && currentQuestion && (
          <motion.div key={`question-${currentQuestion.id}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setScreen('passage')}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                type="button"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{QUESTION_TYPE_LABELS[currentQuestion.type]}</span>
                  <span>Question {currentQuestionIndex + 1} / {selectedPassage.questions.length}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${(currentQuestionIndex / selectedPassage.questions.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#242424] rounded-xl p-4 border border-gray-100 dark:border-gray-800 mb-4">
              <span className="inline-block text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full mb-3">
                {QUESTION_TYPE_LABELS[currentQuestion.type]}
              </span>
              <p className="text-[#1A1A1A] dark:text-[#F5F5F5] text-base leading-relaxed">{currentQuestion.question}</p>
            </div>

            <div className="space-y-3 mb-4">
              {currentQuestion.options.map((option, index) => {
                const isSelected = currentAnswer === index;
                const hasAnswered = currentAnswer !== undefined;
                const isCorrect = index === currentQuestion.correctIndex;

                return (
                  <button
                    key={option}
                    onClick={() => handleAnswer(index)}
                    className={`w-full text-left p-4 rounded-xl border-2 min-h-[52px] active:scale-[0.98] transition-transform ${
                      hasAnswered && isCorrect
                        ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                        : hasAnswered && isSelected
                        ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-[#242424] hover:border-accent'
                    }`}
                    type="button"
                  >
                    <span className="font-medium text-accent mr-2">{String.fromCharCode(65 + index)}.</span>
                    <span className="text-[#1A1A1A] dark:text-[#F5F5F5]">{option.replace(/^[A-D]\)\s*/, '')}</span>
                  </button>
                );
              })}
            </div>

            {currentAnswer !== undefined && (
              <div
                className={`rounded-xl border p-4 mb-4 ${
                  currentAnswer === currentQuestion.correctIndex
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {currentAnswer === currentQuestion.correctIndex ? (
                    <CheckCircle size={18} className="text-success" />
                  ) : (
                    <XCircle size={18} className="text-warning" />
                  )}
                  <p className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    {currentAnswer === currentQuestion.correctIndex ? 'Correct' : 'Review the clue'}
                  </p>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{currentQuestion.explanation}</p>
              </div>
            )}

            <Button fullWidth disabled={currentAnswer === undefined} onClick={goToNextQuestion}>
              {currentQuestionIndex + 1 >= selectedPassage.questions.length ? 'See Results' : 'Next Question'}
            </Button>
          </motion.div>
        )}

        {screen === 'results' && selectedPassage && (
          <motion.div key="results" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setScreen('list')}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                type="button"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">Results</h1>
            </div>

            <div className="bg-white dark:bg-[#242424] rounded-xl p-6 border border-gray-100 dark:border-gray-800 mb-4 text-center">
              <p className="text-4xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5] mb-1">
                {score}/{selectedPassage.questions.length}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                {Math.round((score / selectedPassage.questions.length) * 100)}% reading accuracy
              </p>
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-warning font-semibold">
                  <Zap size={16} />
                  <span>+{sessionXP} XP</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <Timer size={16} />
                  <span>{selectedResult ? Math.round(selectedResult.timeSpent / 60) : 0} min</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#242424] rounded-xl p-4 border border-gray-100 dark:border-gray-800 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={16} className="text-green-600 dark:text-green-400" />
                <p className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">Add passage vocabulary</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {selectedPassage.vocabulary.map((item) => (
                  <button
                    key={item.word}
                    onClick={() => addVocabularyToFlashcards(item)}
                    className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-left"
                    type="button"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">{item.word}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{item.turkishTranslation}</span>
                    </span>
                    {addedWords.has(item.word) ? <CheckCircle size={18} className="text-success" /> : <Plus size={18} className="text-accent" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => startPassage(selectedPassage)}
                className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold flex items-center justify-center gap-2 min-h-[52px] active:scale-[0.98] transition-transform"
                type="button"
              >
                <RotateCcw size={18} />
                Try Again
              </button>
              <button
                onClick={() => setScreen('list')}
                className="w-full py-3.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-[#1A1A1A] dark:text-[#F5F5F5] font-semibold min-h-[52px] active:scale-[0.98] transition-transform"
                type="button"
              >
                Back to Passages
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
