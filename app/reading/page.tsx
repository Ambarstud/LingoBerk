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
  Sparkles,
  Loader2,
  Info,
  Lightbulb,
  Target
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

  // AI Analysis states
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<{
    mainIdea: string;
    tone: string;
    structure: string;
    keyInsights: string[];
    hardWords?: { word: string; meaning: string }[];
  } | null>(null);

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
    setAnalysis(null);
    setScreen('passage');
  };

  const analyzePassage = async () => {
    if (!selectedPassage || loadingAnalysis) return;
    setLoadingAnalysis(true);
    try {
      const systemPrompt = `You are an expert YDS English teacher. Analyze the reading passage provided.
      Format your response as a JSON object with:
      {
        "mainIdea": "One sentence summarizing the whole passage",
        "tone": "The tone of the author (e.g., objective, critical, optimistic)",
        "structure": "Brief overview of how the text is organized",
        "keyInsights": ["Point 1", "Point 2", "Point 3"],
        "hardWords": [{"word": "example", "meaning": "Turkish meaning"}]
      }`;

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'groq',
          systemPrompt,
          userMessage: `Passage Title: ${selectedPassage.title}\nText: ${selectedPassage.text}`,
          responseFormat: 'json'
        }),
      });
      const data = await res.json();
      if (data.content) {
        setAnalysis(typeof data.content === 'string' ? JSON.parse(data.content) : data.content);
      }
    } catch (err) {
      console.error('Passage analysis failed', err);
    } finally {
      setLoadingAnalysis(false);
    }
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

  const addVocabularyToFlashcards = (item: VocabularyItem | { word: string, turkishTranslation: string, definition?: string }) => {
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
      example: `Found in: ${selectedPassage.title}`,
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
    <div className="px-4 pt-6 pb-20 max-w-lg mx-auto min-h-screen bg-white dark:bg-[#1A1A1A]">
      <AnimatePresence mode="wait">
        {screen === 'list' && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-8">
              <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                <ArrowLeft size={20} />
              </Link>
              <div className="flex-1">
                <h1 className="text-2xl font-black text-[#1A1A1A] dark:text-[#F5F5F5] tracking-tight">Reading</h1>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                  {completedCount}/{passages.length} COMPLETE
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <Search size={18} className="text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search passages..."
                  className="w-full bg-transparent text-sm font-medium text-[#1A1A1A] dark:text-[#F5F5F5] placeholder:text-gray-400 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value as DifficultyFilter)}
                  className="rounded-xl bg-white dark:bg-[#242424] px-3 py-2 text-xs font-bold text-gray-500 outline-none border border-gray-100 dark:border-gray-800"
                >
                  <option value="all">Levels</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                </select>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as CategoryFilter)}
                  className="rounded-xl bg-white dark:bg-[#242424] px-3 py-2 text-xs font-bold text-gray-500 outline-none border border-gray-100 dark:border-gray-800"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {CATEGORY_LABELS[item]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredPassages.map((passage) => {
                const result = progress[passage.id];
                const accuracy = getPassageAccuracy(result);
                return (
                  <Card key={passage.id} className="overflow-hidden hover:border-accent/30 transition-colors" padding="none">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
                            <FileText size={24} />
                          </div>
                          <div>
                            <h2 className="font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{passage.title}</h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                              {CATEGORY_LABELS[passage.category]} • {passage.difficulty} • {getReadingMinutes(passage.text)} MIN
                            </p>
                          </div>
                        </div>
                        {result && <CheckCircle size={20} className="text-success" />}
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {passage.vocabulary.slice(0, 3).map((item) => (
                          <span key={item.word} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500">
                            {item.word}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {result ? `${result.score}/${result.totalQuestions} CORRECT` : 'NOT STARTED'}
                        </span>
                        <Button 
                          size="sm" 
                          variant={result ? "ghost" : "primary"}
                          onClick={() => startPassage(passage)}
                          className="h-8 text-[10px] font-black px-4"
                        >
                          {result ? 'REVIEW' : 'START PASSAGE'}
                        </Button>
                      </div>
                    </div>
                    {result && (
                      <div className="h-1 bg-gray-100 dark:bg-gray-800">
                        <div className="h-full bg-success" style={{ width: `${accuracy}%` }} />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        {screen === 'passage' && selectedPassage && (
          <motion.div key="passage" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => setScreen('list')} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-bold">{selectedPassage.title}</h1>
              <button 
                onClick={analyzePassage}
                className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-accent hover:scale-110 transition-transform"
                title="AI Analysis"
              >
                <Sparkles size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="prose dark:prose-invert bg-white dark:bg-[#242424] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm leading-relaxed text-lg">
                {renderPassageText(selectedPassage)}
              </div>

              {loadingAnalysis ? (
                <div className="flex flex-col items-center justify-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-3xl space-y-3">
                  <Loader2 size={32} className="animate-spin text-accent" />
                  <p className="text-xs font-bold text-gray-500 tracking-widest uppercase">AI is analyzing context...</p>
                </div>
              ) : analysis ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <section className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-3xl p-5">
                    <h3 className="text-xs font-black text-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Target size={16} /> Main Idea
                    </h3>
                    <p className="text-sm font-medium leading-relaxed">{analysis.mainIdea}</p>
                  </section>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 rounded-3xl p-4">
                      <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Info size={14} /> Tone
                      </h4>
                      <p className="text-xs font-bold capitalize">{analysis.tone}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 rounded-3xl p-4">
                      <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Lightbulb size={14} /> Structure
                      </h4>
                      <p className="text-xs font-medium leading-snug">{analysis.structure}</p>
                    </div>
                  </div>

                  <section className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-3xl p-5">
                    <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Sparkles size={16} /> Key Insights
                    </h3>
                    <ul className="space-y-2">
                      {analysis.keyInsights.map((insight, i) => (
                        <li key={i} className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                          <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-amber-500" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </section>
                </motion.div>
              ) : null}

              {activeVocab && (
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-[2rem] p-6 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-2xl font-black text-green-800 dark:text-green-300">{activeVocab.word}</h4>
                      <p className="text-sm font-bold text-green-600 mt-1 uppercase tracking-widest">{activeVocab.turkishTranslation}</p>
                    </div>
                    <button 
                      onClick={() => addVocabularyToFlashcards(activeVocab)}
                      className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center text-accent shadow-sm"
                    >
                      {addedWords.has(activeVocab.word) ? <CheckCircle size={24} /> : <Plus size={24} />}
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-medium italic">
                    {activeVocab.definition}
                  </p>
                </div>
              )}

              <Button fullWidth size="lg" className="rounded-2xl h-14 text-lg font-black" onClick={() => setScreen('questions')}>
                Answer YDS Questions
              </Button>
            </div>
          </motion.div>
        )}

        {screen === 'questions' && selectedPassage && currentQuestion && (
          <motion.div key={`question-${currentQuestion.id}`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => setScreen('passage')} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1 px-4 text-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">YDS QUESTION {currentQuestionIndex + 1}/{selectedPassage.questions.length}</span>
              </div>
              <div className="w-10" />
            </div>

            <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-800">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-accent text-[10px] font-black uppercase tracking-widest mb-4">
                {QUESTION_TYPE_LABELS[currentQuestion.type]}
              </div>
              <h2 className="text-lg font-bold leading-relaxed">{currentQuestion.question}</h2>
            </div>

            <div className="space-y-3 mb-8">
              {currentQuestion.options.map((option, index) => {
                const isSelected = currentAnswer === index;
                const hasAnswered = currentAnswer !== undefined;
                const isCorrect = index === currentQuestion.correctIndex;

                return (
                  <button
                    key={option}
                    onClick={() => handleAnswer(index)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all active:scale-[0.98] flex items-center gap-4 ${
                      hasAnswered && isCorrect
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : hasAnswered && isSelected
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-[#242424] hover:border-accent'
                    }`}
                    type="button"
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-black ${
                      hasAnswered && isCorrect ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className={`flex-1 font-bold ${hasAnswered && isCorrect ? 'text-green-700 dark:text-green-300' : ''}`}>
                      {option.replace(/^[A-D]\)\s*/, '')}
                    </span>
                  </button>
                );
              })}
            </div>

            {currentAnswer !== undefined && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-3xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 mb-8">
                 <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <BookOpen size={14} /> EXPLANATION
                </h4>
                <p className="text-sm font-medium leading-relaxed">{currentQuestion.explanation}</p>
              </motion.div>
            )}

            <Button fullWidth size="lg" className="rounded-2xl h-14 font-black" disabled={currentAnswer === undefined} onClick={goToNextQuestion}>
              {currentQuestionIndex + 1 >= selectedPassage.questions.length ? 'FINISH' : 'CONTINUE'}
            </Button>
          </motion.div>
        )}

        {screen === 'results' && selectedPassage && (
          <motion.div key="results" className="text-center py-10" initial={{ opacity: 0, scale: 0.9 }}>
            <div className="w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
              <Zap size={48} className="text-success" />
            </div>
            <h1 className="text-4xl font-black mb-2">PASSAGE COMPLETE</h1>
            <p className="text-gray-500 font-bold mb-10 tracking-widest uppercase">YDS Preparation Insight</p>

            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Accuracy</p>
                <p className="text-3xl font-black text-accent">{score}/{selectedPassage.questions.length}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">XP Gained</p>
                <p className="text-3xl font-black text-warning">+{sessionXP}</p>
              </div>
            </div>

            <div className="space-y-4">
              <Button fullWidth size="lg" className="rounded-2xl h-14 text-lg font-black" onClick={() => setScreen('list')}>
                Finish Lesson
              </Button>
              <Button fullWidth variant="ghost" size="lg" className="h-14 font-bold" onClick={() => startPassage(selectedPassage)}>
                Retry Reading
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
