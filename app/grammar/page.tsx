'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  BookOpen, 
  Loader2, 
  Info,
  ChevronRight,
  Sparkles,
  Lightbulb,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { useStore } from '@/store/useStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { GrammarExercise } from '@/lib/types';
import grammarTopicsData from '@/data/grammar-topics.json';

interface GrammarTopic {
  id: string;
  name: string;
  summary: string;
  keyRules: string[];
  subtopics: string[];
  exercises: GrammarExercise[];
  // New fields for study mode
  detailedExplanation?: string;
  examples?: { en: string; tr: string; note?: string }[];
  tips?: string[];
}

interface TopicProgress {
  correct: number;
  total: number;
  lastPlayed: string;
}

type GrammarProgress = Record<string, TopicProgress>;

type Screen = 'topics' | 'study' | 'exercise' | 'feedback' | 'summary';

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
  const { addXP } = useStore();
  const [screen, setScreen] = useState<Screen>('topics');
  const [progress, setProgress] = useState<GrammarProgress>({});
  const [selectedTopic, setSelectedTopic] = useState<GrammarTopic | null>(null);
  const [exercises, setExercises] = useState<GrammarExercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string>('');
  
  // Study mode states
  const [loadingStudyContent, setLoadingStudyContent] = useState(false);
  const [studyContent, setStudyContent] = useState<{
    explanation: string;
    examples: { en: string; tr: string; note?: string }[];
    tips: string[];
  } | null>(null);

  useEffect(() => {
    const saved = storage.get<GrammarProgress>(STORAGE_KEYS.GRAMMAR_PROGRESS);
    if (saved) setProgress(saved);
  }, []);

  const getTopicStats = (topic: GrammarTopic) => {
    const p = progress[topic.id];
    const totalExercises = topic.exercises.length;
    const answered = Math.min(p?.total ?? 0, totalExercises);
    const completion = totalExercises > 0 ? Math.round((answered / totalExercises) * 100) : 0;
    const accuracy = p && p.total > 0 ? Math.round((p.correct / p.total) * 100) : null;

    return {
      answered,
      totalExercises,
      completion,
      accuracy,
      isComplete: totalExercises > 0 && answered >= totalExercises,
      attempts: p?.total ?? 0,
    };
  };

  const startStudy = async (topic: GrammarTopic) => {
    setSelectedTopic(topic);
    setScreen('study');
    setLoadingStudyContent(true);
    
    // Check if we already have study content in JSON or state
    if (topic.detailedExplanation) {
      setStudyContent({
        explanation: topic.detailedExplanation,
        examples: topic.examples || [],
        tips: topic.tips || []
      });
      setLoadingStudyContent(false);
      return;
    }

    // Try to get from AI if not in JSON (Dynamic teaching!)
    try {
      const systemPrompt = `You are an expert English teacher for Turkish students preparing for YDS. 
      Provide a concise, clear, and highly educational explanation for the grammar topic.
      Format your response as a JSON object with:
      {
        "explanation": "Simple B1-B2 level explanation in English with Turkish nuances",
        "examples": [{"en": "English sentence", "tr": "Turkish translation", "note": "Why this example matters"}],
        "tips": ["Tip 1", "Tip 2"]
      }`;

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'groq',
          systemPrompt,
          userMessage: `Explain the grammar topic: ${topic.name}. Focus on YDS exam requirements and common traps.`,
          responseFormat: 'json'
        }),
      });
      
      const data = await res.json();
      if (data.content) {
        const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
        setStudyContent(parsed);
      }
    } catch (err) {
      console.error('Failed to load study content', err);
    } finally {
      setLoadingStudyContent(false);
    }
  };

  const startPractice = (topic: GrammarTopic) => {
    setSelectedTopic(topic);
    setExercises([...topic.exercises].sort(() => Math.random() - 0.5).slice(0, 10));
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setSessionCorrect(0);
    setSessionXP(0);
    setAiExplanation('');
    setSessionStartTime(Date.now());
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
          provider: 'groq',
        }),
      });
      const data = (await res.json()) as { exercises?: GrammarExercise[]; error?: string };
      if (data.error) {
        setGenerateError(data.error.includes('API key') ? 'AI özelliği için API key gerekli.' : data.error);
      } else if (data.exercises && data.exercises.length > 0) {
        setSelectedTopic(topic);
        setExercises(data.exercises);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setSessionCorrect(0);
        setSessionXP(0);
        setAiExplanation('');
        setSessionStartTime(Date.now());
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
              provider: 'groq',
            }),
          });
          const data = (await res.json()) as { explanation?: string; error?: string };
          setAiExplanation(data.explanation || exercise.explanation);
        } catch {
          setAiExplanation(exercise.explanation);
        } finally {
          setLoadingExplanation(false);
        }
      }

      setScreen('feedback');
    },
    [selectedAnswer, exercises, currentIndex, selectedTopic, progress, addXP]
  );

  const handleNext = () => {
    if (currentIndex + 1 >= exercises.length) {
      setScreen('summary');
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setAiExplanation('');
      setScreen('exercise');
    }
  };

  const currentExercise = exercises[currentIndex];

  return (
    <div className="px-4 pt-6 pb-20 max-w-lg mx-auto min-h-screen bg-white dark:bg-[#1A1A1A]">
      <AnimatePresence mode="wait">
        {screen === 'topics' && (
          <motion.div key="topics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                  <ArrowLeft size={20} />
                </Link>
                <h1 className="text-xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">Grammar</h1>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                <GraduationCap size={16} className="text-accent" />
                <span className="text-xs font-bold text-accent">YDS Focus</span>
              </div>
            </div>

            {generateError && (
              <Card className="mb-6 bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle size={18} />
                  <p className="text-sm font-medium">{generateError}</p>
                </div>
              </Card>
            )}

            <div className="space-y-4">
              {allTopics.map((topic) => {
                const stats = getTopicStats(topic);
                return (
                  <Card 
                    key={topic.id} 
                    className="overflow-hidden hover:border-accent/30 transition-colors"
                    
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-2xl">
                            {TOPIC_ICONS[topic.id] || '📖'}
                          </div>
                          <div>
                            <h3 className="font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{topic.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                {topic.subtopics.length} SUBTOPICS
                              </span>
                              {stats.accuracy !== null && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  stats.accuracy > 75 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {stats.accuracy}% ACCURACY
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {stats.isComplete && <CheckCircle size={20} className="text-success" />}
                      </div>

                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                        {topic.summary}
                      </p>

                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 text-xs gap-1.5"
                          onClick={() => startStudy(topic)}
                        >
                          <BookOpen size={14} />
                          Learn
                        </Button>
                        <Button 
                          variant="primary" 
                          size="sm" 
                          className="flex-1 text-xs gap-1.5"
                          onClick={() => startPractice(topic)}
                        >
                          <Zap size={14} />
                          Practice
                        </Button>
                      </div>
                    </div>
                    {/* Progress Bar at the bottom of card */}
                    <div className="h-1 w-full bg-gray-100 dark:bg-gray-800">
                      <div 
                        className="h-full bg-accent transition-all duration-500" 
                        style={{ width: `${stats.completion}%` }}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        {screen === 'study' && selectedTopic && (
          <motion.div key="study" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setScreen('topics')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-bold">{selectedTopic.name}</h1>
            </div>

            {loadingStudyContent ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <Loader2 size={40} className="animate-spin text-accent" />
                <p className="text-gray-500">AI Teacher is preparing the lesson...</p>
              </div>
            ) : studyContent ? (
              <div className="space-y-6">
                <section>
                  <h2 className="text-sm font-bold text-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Info size={16} />
                    Overview
                  </h2>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                      {studyContent.explanation}
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-sm font-bold text-success uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Sparkles size={16} />
                    Key Examples
                  </h2>
                  <div className="space-y-3">
                    {studyContent.examples.map((ex, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-white dark:bg-[#242424] border border-gray-100 dark:border-gray-800 shadow-sm">
                        <p className="font-semibold text-lg mb-1">{ex.en}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-2">{ex.tr}</p>
                        {ex.note && (
                          <div className="flex items-start gap-2 pt-2 border-t border-gray-50 dark:border-gray-800 text-xs text-blue-600 dark:text-blue-400">
                            <Lightbulb size={14} className="shrink-0 mt-0.5" />
                            <span>{ex.note}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-sm font-bold text-warning uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap size={16} />
                    YDS Tips & Traps
                  </h2>
                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4">
                    <ul className="space-y-3">
                      {studyContent.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-amber-900 dark:text-amber-200">
                          <ChevronRight size={18} className="shrink-0 text-amber-500" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                <Button 
                  fullWidth 
                  size="lg" 
                  className="rounded-2xl h-14 text-lg font-bold"
                  onClick={() => startPractice(selectedTopic)}
                >
                  Start Practice Test
                </Button>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-red-500">Could not load study content. Please try again.</p>
                <Button variant="ghost" className="mt-4" onClick={() => startStudy(selectedTopic)}>Retry</Button>
              </div>
            )}
          </motion.div>
        )}

        {screen === 'exercise' && currentExercise && (
          <motion.div key={`exercise-${currentIndex}`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => setScreen('topics')} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1 px-4">
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-bold text-gray-400">{currentIndex + 1}/{exercises.length}</span>
            </div>

            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-accent text-[10px] font-bold uppercase tracking-wider mb-4">
                <Sparkles size={12} />
                {currentExercise.type.replace(/_/g, ' ')}
              </div>
              <h2 className="text-xl font-medium leading-relaxed text-[#1A1A1A] dark:text-[#F5F5F5]">
                {currentExercise.question}
              </h2>
            </div>

            <div className="grid gap-3">
              {currentExercise.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  className="group relative w-full text-left p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-accent hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-200 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 text-sm font-bold group-hover:bg-accent group-hover:text-white transition-colors">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1 text-[#1A1A1A] dark:text-[#F5F5F5] font-medium">
                      {option.replace(/^[A-D]\)\s*/, '')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {screen === 'feedback' && currentExercise && (
          <motion.div key="feedback" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
             <div className="flex items-center justify-between mb-8">
              <button onClick={() => setScreen('topics')} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1 px-4">
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent"
                    style={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-bold text-gray-400">{currentIndex + 1}/{exercises.length}</span>
            </div>

            <Card className="mb-6 opacity-60">
              <p className="text-lg leading-relaxed">{currentExercise.question}</p>
            </Card>

            <div className={`p-6 rounded-3xl mb-6 border-2 transition-all ${
              selectedAnswer === currentExercise.correctIndex 
                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50' 
                : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                {selectedAnswer === currentExercise.correctIndex ? (
                  <CheckCircle size={32} className="text-green-500" />
                ) : (
                  <XCircle size={32} className="text-red-500" />
                )}
                <h3 className={`text-2xl font-black ${
                  selectedAnswer === currentExercise.correctIndex ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selectedAnswer === currentExercise.correctIndex ? 'GENIUS!' : 'NOT QUITE'}
                </h3>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">Correct Answer</p>
                    <p className="font-semibold">{currentExercise.options[currentExercise.correctIndex]}</p>
                  </div>
                </div>

                {selectedAnswer !== currentExercise.correctIndex && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                      <XCircle size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">Your Answer</p>
                      <p className="font-semibold">{currentExercise.options[selectedAnswer!]}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white/50 dark:bg-black/20 p-4 rounded-2xl">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <BookOpen size={14} />
                  Lesson
                </h4>
                {loadingExplanation ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 italic">
                    <Loader2 size={14} className="animate-spin" />
                    AI Tutor is explaining...
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    {aiExplanation || currentExercise.explanation}
                  </p>
                )}
              </div>
            </div>

            <Button fullWidth size="lg" className="h-14 rounded-2xl font-bold" onClick={handleNext}>
              {currentIndex + 1 >= exercises.length ? 'Show Results' : 'Continue'}
            </Button>
          </motion.div>
        )}

        {screen === 'summary' && selectedTopic && (
          <motion.div key="summary" className="text-center py-10" initial={{ opacity: 0, scale: 0.9 }}>
            <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy size={48} className="text-accent" />
            </div>
            <h1 className="text-3xl font-black mb-2">Well Done!</h1>
            <p className="text-gray-500 mb-8">You finished practicing {selectedTopic.name}</p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Accuracy</p>
                <p className="text-2xl font-black text-accent">{Math.round((sessionCorrect / exercises.length) * 100)}%</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">XP Earned</p>
                <p className="text-2xl font-black text-warning">+{sessionXP}</p>
              </div>
            </div>

            <div className="space-y-3">
              <Button fullWidth size="lg" className="h-14 rounded-2xl" onClick={() => startPractice(selectedTopic)}>
                <RefreshCw size={18} className="mr-2" />
                Practice Again
              </Button>
              <Button fullWidth variant="ghost" size="lg" className="h-14 rounded-2xl" onClick={() => setScreen('topics')}>
                Back to Topics
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Trophy(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
