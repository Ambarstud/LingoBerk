'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, AlertTriangle, CheckCircle, XCircle, RefreshCw, BookOpen, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { useStore } from '@/store/useStore';
import type { GrammarExercise } from '@/lib/types';
import grammarTopicsData from '@/data/grammar-topics.json';

interface GrammarTopic {
  id: string;
  name: string;
  subtopics: string[];
  exercises: GrammarExercise[];
}

interface TopicProgress {
  correct: number;
  total: number;
  lastPlayed: string;
}

type GrammarProgress = Record<string, TopicProgress>;

type Screen = 'topics' | 'exercise' | 'feedback' | 'summary';

const TOPIC_ICONS: Record<string, string> = {
  tenses: '🕐',
  conditionals: '🔀',
  passive: '🔄',
  relative_clauses: '🔗',
  connectors: '🔌',
  modals: '💭',
  gerund_infinitive: '✍️',
  reported_speech: '💬',
  inversion: '🔃',
  noun_clauses: '📝',
};

const allTopics = grammarTopicsData as GrammarTopic[];

export default function GrammarPage() {
  const { addXP, settings } = useStore();
  const [screen, setScreen] = useState<Screen>('topics');
  const [progress, setProgress] = useState<GrammarProgress>({});
  const [selectedTopic, setSelectedTopic] = useState<GrammarTopic | null>(null);
  const [exercises, setExercises] = useState<GrammarExercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [exerciseStartTime, setExerciseStartTime] = useState<number>(0);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string>('');

  useEffect(() => {
    const saved = storage.get<GrammarProgress>(STORAGE_KEYS.GRAMMAR_PROGRESS);
    if (saved) setProgress(saved);
  }, []);

  const getAccuracy = (topicId: string) => {
    const p = progress[topicId];
    if (!p || p.total === 0) return null;
    return Math.round((p.correct / p.total) * 100);
  };

  const sortedTopics = [...allTopics].sort((a, b) => {
    const accA = getAccuracy(a.id);
    const accB = getAccuracy(b.id);
    if (accA === null && accB === null) return 0;
    if (accA === null) return -1;
    if (accB === null) return 1;
    return accA - accB;
  });

  const startTopic = (topic: GrammarTopic) => {
    setSelectedTopic(topic);
    setExercises([...topic.exercises].sort(() => Math.random() - 0.5).slice(0, 10));
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setSessionCorrect(0);
    setSessionXP(0);
    setAiExplanation('');
    setSessionStartTime(Date.now());
    setExerciseStartTime(Date.now());
    setScreen('exercise');
  };

  const handleGenerateNew = async (topic: GrammarTopic) => {
    setGenerating(true);
    setGenerateError('');
    try {
      const res = await fetch('/api/generate-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.name,
          subtopic: topic.subtopics[0],
          count: 8,
          provider: settings.preferredProvider,
        }),
      });
      const data = (await res.json()) as { exercises?: GrammarExercise[]; error?: string };
      if (data.error) {
        setGenerateError(data.error.includes('API key') ? 'AI özelliği için API key gerekli. Ayarlar sayfasından ekleyin.' : data.error);
      } else if (data.exercises && data.exercises.length > 0) {
        setSelectedTopic(topic);
        setExercises(data.exercises);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setSessionCorrect(0);
        setSessionXP(0);
        setAiExplanation('');
        setSessionStartTime(Date.now());
        setExerciseStartTime(Date.now());
        setScreen('exercise');
      }
    } catch {
      setGenerateError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = useCallback(
    async (index: number) => {
      if (selectedAnswer !== null) return;
      setSelectedAnswer(index);
      const exercise = exercises[currentIndex];
      const isCorrect = index === exercise.correctIndex;

      if (isCorrect) {
        const xp = 15;
        addXP(xp);
        setSessionCorrect((c) => c + 1);
        setSessionXP((x) => x + xp);
      }

      const topicId = selectedTopic!.id;
      const prev = progress[topicId] ?? { correct: 0, total: 0, lastPlayed: '' };
      const updated: GrammarProgress = {
        ...progress,
        [topicId]: {
          correct: prev.correct + (isCorrect ? 1 : 0),
          total: prev.total + 1,
          lastPlayed: new Date().toISOString(),
        },
      };
      setProgress(updated);
      storage.set(STORAGE_KEYS.GRAMMAR_PROGRESS, updated);

      if (!isCorrect) {
        setLoadingExplanation(true);
        setAiExplanation('');
        try {
          const res = await fetch('/api/check-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: exercise.question,
              userAnswer: exercise.options[index],
              correctAnswer: exercise.options[exercise.correctIndex],
              provider: settings.preferredProvider,
            }),
          });
          const data = (await res.json()) as { explanation?: string; error?: string };
          if (data.error) {
            if (data.error.includes('API key')) {
              setAiExplanation('AI özelliği için API key gerekli. Ayarlar sayfasından ekleyin.');
            } else {
              setAiExplanation(exercise.explanation);
            }
          } else {
            setAiExplanation(data.explanation ?? exercise.explanation);
          }
        } catch {
          setAiExplanation(exercise.explanation);
        } finally {
          setLoadingExplanation(false);
        }
      }

      setScreen('feedback');
    },
    [selectedAnswer, exercises, currentIndex, selectedTopic, progress, addXP, settings.preferredProvider]
  );

  const handleNext = () => {
    if (currentIndex + 1 >= exercises.length) {
      setScreen('summary');
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setAiExplanation('');
      setExerciseStartTime(Date.now());
      setScreen('exercise');
    }
  };

  const currentExercise = exercises[currentIndex];

  return (
    <div className="px-4 pt-6 pb-4">
      <AnimatePresence mode="wait">
        {screen === 'topics' && (
          <motion.div key="topics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <Link
                href="/"
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">Grammar</h1>
            </div>

            {generateError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
                {generateError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {sortedTopics.map((topic) => {
                const acc = getAccuracy(topic.id);
                const isWeak = acc !== null && acc < 60;
                return (
                  <div
                    key={topic.id}
                    className="bg-white dark:bg-[#242424] rounded-xl border border-gray-100 dark:border-gray-800 p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">{TOPIC_ICONS[topic.id] ?? '📖'}</span>
                      {isWeak && <AlertTriangle size={14} className="text-warning mt-0.5" />}
                    </div>
                    <p className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] mb-1">{topic.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{topic.exercises.length} exercises</p>

                    {acc !== null && (
                      <div className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={isWeak ? 'text-warning' : 'text-success'}>{acc}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isWeak ? 'bg-warning' : 'bg-success'}`}
                            style={{ width: `${acc}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => startTopic(topic)}
                      className="w-full text-xs py-1.5 rounded-lg bg-accent text-white font-medium min-h-[32px] active:scale-95 transition-transform mb-1"
                    >
                      Practice
                    </button>
                    <button
                      onClick={() => handleGenerateNew(topic)}
                      disabled={generating}
                      className="w-full text-xs py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium min-h-[32px] active:scale-95 transition-transform flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {generating ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                      AI New
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {screen === 'exercise' && currentExercise && (
          <motion.div key={`exercise-${currentIndex}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setScreen('topics')}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{selectedTopic?.name}</span>
                  <span>{currentIndex + 1} / {exercises.length}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#242424] rounded-xl p-4 border border-gray-100 dark:border-gray-800 mb-4">
              <span className="inline-block text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-accent px-2 py-0.5 rounded-full mb-3">
                {currentExercise.type.replace(/_/g, ' ')}
              </span>
              <p className="text-[#1A1A1A] dark:text-[#F5F5F5] text-base leading-relaxed">{currentExercise.question}</p>
            </div>

            <div className="space-y-3">
              {currentExercise.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  className="w-full text-left p-4 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-[#242424] text-[#1A1A1A] dark:text-[#F5F5F5] min-h-[52px] active:scale-[0.98] transition-transform hover:border-accent"
                >
                  <span className="font-medium text-accent mr-2">{String.fromCharCode(65 + idx)}.</span>
                  {option.replace(/^[A-D]\)\s*/, '')}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {screen === 'feedback' && currentExercise && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setScreen('topics')}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{selectedTopic?.name}</span>
                  <span>{currentIndex + 1} / {exercises.length}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#242424] rounded-xl p-4 border border-gray-100 dark:border-gray-800 mb-4 opacity-60">
              <p className="text-[#1A1A1A] dark:text-[#F5F5F5] text-sm leading-relaxed">{currentExercise.question}</p>
            </div>

            <div
              className={`rounded-xl p-4 mb-4 border-2 ${
                selectedAnswer === currentExercise.correctIndex
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {selectedAnswer === currentExercise.correctIndex ? (
                  <>
                    <CheckCircle size={20} className="text-success" />
                    <span className="font-bold text-success text-lg">Correct! +15 XP</span>
                  </>
                ) : (
                  <>
                    <XCircle size={20} className="text-error" />
                    <span className="font-bold text-error text-lg">Incorrect</span>
                  </>
                )}
              </div>

              <div className="space-y-2">
                {currentExercise.options.map((option, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg text-sm ${
                      idx === currentExercise.correctIndex
                        ? 'bg-green-100 dark:bg-green-800/40 text-green-800 dark:text-green-200 font-medium'
                        : idx === selectedAnswer && idx !== currentExercise.correctIndex
                        ? 'bg-red-100 dark:bg-red-800/40 text-red-800 dark:text-red-200 line-through'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    <span className="font-semibold mr-1">{String.fromCharCode(65 + idx)}.</span>
                    {option.replace(/^[A-D]\)\s*/, '')}
                  </div>
                ))}
              </div>
            </div>

            {selectedAnswer !== currentExercise.correctIndex && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={16} className="text-warning" />
                  <span className="text-sm font-semibold text-warning">Explanation</span>
                </div>
                {loadingExplanation ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 size={14} className="animate-spin" />
                    Getting AI explanation...
                  </div>
                ) : (
                  <p className="text-sm text-[#1A1A1A] dark:text-[#F5F5F5] leading-relaxed">
                    {aiExplanation || currentExercise.explanation}
                  </p>
                )}
              </div>
            )}

            {selectedAnswer === currentExercise.correctIndex && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  <span className="font-medium">Why: </span>{currentExercise.explanation}
                </p>
              </div>
            )}

            <button
              onClick={handleNext}
              className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold text-base min-h-[52px] active:scale-[0.98] transition-transform"
            >
              {currentIndex + 1 >= exercises.length ? 'See Results' : 'Next Question'}
            </button>
          </motion.div>
        )}

        {screen === 'summary' && selectedTopic && (
          <motion.div key="summary" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setScreen('topics')}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">Results</h1>
            </div>

            <div className="bg-white dark:bg-[#242424] rounded-xl p-6 border border-gray-100 dark:border-gray-800 mb-4 text-center">
              <p className="text-4xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5] mb-1">
                {sessionCorrect}/{exercises.length}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                {Math.round((sessionCorrect / exercises.length) * 100)}% accuracy
              </p>
              <div className="flex items-center justify-center gap-2 text-warning font-semibold">
                <Zap size={18} />
                <span>+{sessionXP} XP earned</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Time: {Math.round((Date.now() - sessionStartTime) / 1000)}s
              </p>
            </div>

            {Math.round((sessionCorrect / exercises.length) * 100) < 60 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-warning" />
                  <p className="text-sm text-warning font-medium">
                    Accuracy below 60% — this is a weak area. Keep practicing!
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => startTopic(selectedTopic)}
                className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold flex items-center justify-center gap-2 min-h-[52px] active:scale-[0.98] transition-transform"
              >
                <RefreshCw size={18} />
                Try Again
              </button>
              <button
                onClick={() => setScreen('topics')}
                className="w-full py-3.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-[#1A1A1A] dark:text-[#F5F5F5] font-semibold min-h-[52px] active:scale-[0.98] transition-transform"
              >
                Back to Topics
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
