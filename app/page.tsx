'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  BookOpen,
  FileText,
  Flame,
  MessageCircle,
  MessagesSquare,
  PenLine,
  Settings,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Card } from '@/components/ui/Card';
import { useStore } from '@/store/useStore';
import { getLevel, getXPToNextLevel } from '@/lib/xp-system';
import { getCalendar } from '@/lib/streak';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import type { FlashCard, ReadingResult } from '@/lib/types';
import { getDueCards, getMasteredCards } from '@/lib/spaced-repetition';
import grammarTopics from '@/data/grammar-topics.json';
import readingPassages from '@/data/reading-passages.json';
import conversationScenarios from '@/data/conversation-patterns.json';

interface GrammarProgressItem {
  correct: number;
  total: number;
  lastPlayed: string;
}

interface DashboardMetrics {
  dueCount: number;
  masteredWords: number;
  grammarAnswered: number;
  grammarTotal: number;
  grammarAccuracy: number | null;
  readingCompleted: number;
  readingTotal: number;
  conversationCompleted: number;
  conversationTotal: number;
  nextReadingTitle: string;
  weakGrammarTopic: string;
}

const modules = [
  {
    href: '/flashcards',
    label: 'Flashcards',
    icon: BookOpen,
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  {
    href: '/grammar',
    label: 'Grammar',
    icon: PenLine,
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  },
  {
    href: '/reading',
    label: 'Reading',
    icon: FileText,
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  },
  {
    href: '/conversation',
    label: 'Conversation',
    icon: MessagesSquare,
    color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
  },
  {
    href: '/chat',
    label: 'AI Chat',
    icon: MessageCircle,
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  },
  {
    href: '/stats',
    label: 'Stats',
    icon: BarChart3,
    color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
  },
];

const defaultMetrics: DashboardMetrics = {
  dueCount: 0,
  masteredWords: 0,
  grammarAnswered: 0,
  grammarTotal: 0,
  grammarAccuracy: null,
  readingCompleted: 0,
  readingTotal: 0,
  conversationCompleted: 0,
  conversationTotal: 0,
  nextReadingTitle: 'Start your first reading passage',
  weakGrammarTopic: 'Start with Tenses',
};

export default function DashboardPage() {
  const { userStats, streakData, settings } = useStore();
  const [calendar, setCalendar] = useState<{ date: string; xp: number; active: boolean }[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>(defaultMetrics);

  const level = getLevel(userStats.totalXP);
  const xpProgress = getXPToNextLevel(userStats.totalXP);
  const dailyProgress = Math.min(100, Math.round((userStats.todayXP / settings.dailyGoal) * 100));
  const xpRemaining = Math.max(0, settings.dailyGoal - userStats.todayXP);

  useEffect(() => {
    const cards = storage.get<FlashCard[]>(STORAGE_KEYS.FLASHCARDS) ?? [];
    const grammarProgress = storage.get<Record<string, GrammarProgressItem>>(STORAGE_KEYS.GRAMMAR_PROGRESS) ?? {};
    const readingProgress = storage.get<Record<string, ReadingResult>>(STORAGE_KEYS.READING_PROGRESS) ?? {};
    const conversationProgress = storage.get<Record<string, boolean>>(STORAGE_KEYS.CONVERSATION_PROGRESS) ?? {};

    const grammarTotal = (grammarTopics as { exercises: unknown[] }[]).reduce((sum, topic) => sum + topic.exercises.length, 0);
    const grammarAnswered = Object.values(grammarProgress).reduce((sum, item) => sum + item.total, 0);
    const grammarCorrect = Object.values(grammarProgress).reduce((sum, item) => sum + item.correct, 0);
    const grammarAccuracy = grammarAnswered > 0 ? Math.round((grammarCorrect / grammarAnswered) * 100) : null;
    const weakTopic =
      (grammarTopics as { id: string; name: string }[])
        .map((topic) => {
          const progress = grammarProgress[topic.id];
          const accuracy = progress && progress.total > 0 ? Math.round((progress.correct / progress.total) * 100) : null;
          return { name: topic.name, attempts: progress?.total ?? 0, accuracy };
        })
        .filter((topic) => topic.attempts === 0 || (topic.accuracy !== null && topic.accuracy < 70))
        .sort((a, b) => {
          if (a.attempts === 0 && b.attempts !== 0) return -1;
          if (b.attempts === 0 && a.attempts !== 0) return 1;
          return (a.accuracy ?? 0) - (b.accuracy ?? 0);
        })[0]?.name ?? 'Mixed review';

    const nextReading =
      (readingPassages as { id: string; title: string }[]).find((passage) => !readingProgress[passage.id])?.title ??
      'Review a completed passage';

    setMetrics({
      dueCount: getDueCards(cards).length,
      masteredWords: getMasteredCards(cards).length,
      grammarAnswered,
      grammarTotal,
      grammarAccuracy,
      readingCompleted: Object.keys(readingProgress).length,
      readingTotal: (readingPassages as unknown[]).length,
      conversationCompleted: Object.values(conversationProgress).filter(Boolean).length,
      conversationTotal: (conversationScenarios as unknown[]).length,
      nextReadingTitle: nextReading,
      weakGrammarTopic: weakTopic,
    });
    setCalendar(getCalendar(30));
  }, []);

  const dailyPlan = useMemo(
    () => [
      {
        href: '/flashcards',
        title: metrics.dueCount > 0 ? `Review ${metrics.dueCount} due cards` : 'Learn 10 new YDS cards',
        detail: 'Vocabulary first keeps the rest easier.',
      },
      {
        href: '/grammar',
        title: `Practice ${metrics.weakGrammarTopic}`,
        detail: metrics.grammarAccuracy === null ? 'Build your first grammar baseline.' : `Current grammar accuracy: ${metrics.grammarAccuracy}%`,
      },
      {
        href: '/reading',
        title: metrics.nextReadingTitle,
        detail: `${metrics.readingCompleted}/${metrics.readingTotal} passages completed.`,
      },
      {
        href: '/conversation',
        title: 'Shadow one conversation scenario',
        detail: `${metrics.conversationCompleted}/${metrics.conversationTotal} speaking scenarios done.`,
      },
    ],
    [metrics]
  );

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">LingoBerk</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Level {level} student dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-full">
            <Flame size={16} className="text-warning" />
            <span className="text-sm font-bold text-warning">{streakData.currentStreak}</span>
          </div>
          <Link href="/settings" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
            <Settings size={20} className="text-gray-500 dark:text-gray-400" />
          </Link>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <ProgressRing progress={dailyProgress} size={100} strokeWidth={8} color="#2563EB" trackColor="var(--border, #E5E7EB)">
            <div className="text-center">
              <div className="text-lg font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{dailyProgress}%</div>
            </div>
          </ProgressRing>
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Zap size={14} className="text-accent" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Today&apos;s study goal</span>
              </div>
              <p className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                {userStats.todayXP}
                <span className="text-base font-normal text-gray-400"> / {settings.dailyGoal} XP</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {xpRemaining > 0 ? `${xpRemaining} XP left for today` : 'Daily goal completed'}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Level {level}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{xpProgress.current}/{xpProgress.needed} XP</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${xpProgress.progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">Today&apos;s study plan</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Vocabulary, grammar, reading, speaking</p>
          </div>
          <Target size={20} className="text-success" />
        </div>
        <div className="space-y-2">
          {dailyPlan.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/70 p-3 active:scale-[0.98] transition-transform"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-[#242424] text-xs font-bold text-accent">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] truncate">{item.title}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{item.detail}</span>
              </span>
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame size={20} className="text-warning" />
            <h2 className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">Streak</h2>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-warning">{streakData.currentStreak}</span>
            <span className="text-sm text-gray-400 ml-1">days</span>
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Best: {streakData.bestStreak} days</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Last 30 days</span>
        </div>
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
          {calendar.slice(-30).map(({ date, active }) => (
            <div key={date} title={date} className={`aspect-square rounded-sm ${active ? 'bg-accent' : 'bg-gray-100 dark:bg-gray-800'}`} />
          ))}
        </div>
      </Card>

      <div>
        <h2 className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">Modules</h2>
        <div className="grid grid-cols-2 gap-3">
          {modules.map(({ href, label, icon: Icon, color }) => {
            const badge = href === '/flashcards' && metrics.dueCount > 0 ? metrics.dueCount : null;
            return (
              <Link
                key={href}
                href={href}
                className="rounded-xl bg-white dark:bg-[#242424] border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-3 active:scale-[0.97] transition-transform shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-lg ${color}`}>
                    <Icon size={20} />
                  </div>
                  {badge !== null && <span className="bg-error text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{badge}</span>}
                </div>
                <div>
                  <p className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">{label}</p>
                  {href === '/flashcards' && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{metrics.dueCount > 0 ? `${metrics.dueCount} cards due` : 'All caught up'}</p>}
                  {href === '/grammar' && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{metrics.grammarAnswered}/{metrics.grammarTotal} answered</p>}
                  {href === '/reading' && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{metrics.readingCompleted}/{metrics.readingTotal} passages</p>}
                  {href === '/conversation' && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{metrics.conversationCompleted}/{metrics.conversationTotal} scenarios</p>}
                  {href === '/chat' && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">AI practice</p>}
                  {href === '/stats' && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">YDS readiness</p>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card padding="sm">
          <div className="text-center">
            <Trophy size={16} className="text-accent mx-auto mb-1" />
            <p className="text-lg font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{metrics.masteredWords}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Mastered</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <Target size={16} className="text-success mx-auto mb-1" />
            <p className="text-lg font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{userStats.exercisesCompleted}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Exercises</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <Zap size={16} className="text-warning mx-auto mb-1" />
            <p className="text-lg font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
              {userStats.averageAccuracy > 0 ? `${Math.round(userStats.averageAccuracy)}%` : '--'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Accuracy</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
