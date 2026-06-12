'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, BookOpen, FileText, MessagesSquare, PenLine, Target, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { getCalendar } from '@/lib/streak';
import { getDueCards, getMasteredCards } from '@/lib/spaced-repetition';
import type { FlashCard, ReadingResult, UserStats } from '@/lib/types';
import { getDefaultStats, getLevel } from '@/lib/xp-system';
import grammarTopics from '@/data/grammar-topics.json';
import readingPassages from '@/data/reading-passages.json';
import conversationScenarios from '@/data/conversation-patterns.json';

interface GrammarProgressItem {
  correct: number;
  total: number;
  lastPlayed: string;
}

interface StatsSnapshot {
  userStats: UserStats;
  totalCards: number;
  dueCards: number;
  masteredCards: number;
  grammarAccuracy: number;
  grammarAttempts: number;
  grammarCoverage: number;
  readingAccuracy: number;
  readingCompleted: number;
  conversationCompleted: number;
  weakGrammarTopics: { id: string; name: string; accuracy: number | null; attempts: number }[];
}

const defaultSnapshot: StatsSnapshot = {
  userStats: getDefaultStats(),
  totalCards: 0,
  dueCards: 0,
  masteredCards: 0,
  grammarAccuracy: 0,
  grammarAttempts: 0,
  grammarCoverage: 0,
  readingAccuracy: 0,
  readingCompleted: 0,
  conversationCompleted: 0,
  weakGrammarTopics: [],
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function StatsPage() {
  const [snapshot, setSnapshot] = useState<StatsSnapshot>(defaultSnapshot);
  const [calendar, setCalendar] = useState<{ date: string; xp: number; active: boolean }[]>([]);

  useEffect(() => {
    const cards = storage.get<FlashCard[]>(STORAGE_KEYS.FLASHCARDS) ?? [];
    const grammarProgress = storage.get<Record<string, GrammarProgressItem>>(STORAGE_KEYS.GRAMMAR_PROGRESS) ?? {};
    const readingProgress = storage.get<Record<string, ReadingResult>>(STORAGE_KEYS.READING_PROGRESS) ?? {};
    const conversationProgress = storage.get<Record<string, boolean>>(STORAGE_KEYS.CONVERSATION_PROGRESS) ?? {};
    const userStats = storage.get<UserStats>(STORAGE_KEYS.USER_STATS) ?? getDefaultStats();

    const grammarTotals = Object.values(grammarProgress).reduce(
      (acc, item) => ({ correct: acc.correct + item.correct, total: acc.total + item.total }),
      { correct: 0, total: 0 }
    );
    const allGrammarQuestions = (grammarTopics as { exercises: unknown[] }[]).reduce((total, topic) => total + topic.exercises.length, 0);
    const readingTotals = Object.values(readingProgress).reduce(
      (acc, item) => ({ correct: acc.correct + item.score, total: acc.total + item.totalQuestions }),
      { correct: 0, total: 0 }
    );

    const weakGrammarTopics = (grammarTopics as { id: string; name: string }[])
      .map((topic) => {
        const progress = grammarProgress[topic.id];
        const accuracy = progress && progress.total > 0 ? Math.round((progress.correct / progress.total) * 100) : null;
        return { id: topic.id, name: topic.name, accuracy, attempts: progress?.total ?? 0 };
      })
      .filter((topic) => topic.attempts === 0 || (topic.accuracy !== null && topic.accuracy < 70))
      .sort((a, b) => {
        if (a.attempts === 0 && b.attempts !== 0) return -1;
        if (b.attempts === 0 && a.attempts !== 0) return 1;
        return (a.accuracy ?? 0) - (b.accuracy ?? 0);
      })
      .slice(0, 4);

    setSnapshot({
      userStats,
      totalCards: cards.length,
      dueCards: getDueCards(cards).length,
      masteredCards: getMasteredCards(cards).length,
      grammarAccuracy: grammarTotals.total > 0 ? Math.round((grammarTotals.correct / grammarTotals.total) * 100) : 0,
      grammarAttempts: grammarTotals.total,
      grammarCoverage: allGrammarQuestions > 0 ? Math.min(100, Math.round((grammarTotals.total / allGrammarQuestions) * 100)) : 0,
      readingAccuracy: readingTotals.total > 0 ? Math.round((readingTotals.correct / readingTotals.total) * 100) : 0,
      readingCompleted: Object.keys(readingProgress).length,
      conversationCompleted: Object.values(conversationProgress).filter(Boolean).length,
      weakGrammarTopics,
    });
    setCalendar(getCalendar(90));
  }, []);

  const ydsReadiness = useMemo(() => {
    const vocabularyScore = snapshot.totalCards > 0 ? (snapshot.masteredCards / snapshot.totalCards) * 100 : 0;
    const conversationScore = (conversationScenarios as unknown[]).length > 0
      ? (snapshot.conversationCompleted / (conversationScenarios as unknown[]).length) * 100
      : 0;
    return clampScore(vocabularyScore * 0.3 + snapshot.grammarAccuracy * 0.35 + snapshot.readingAccuracy * 0.25 + conversationScore * 0.1);
  }, [snapshot]);

  const level = getLevel(snapshot.userStats.totalXP);
  const vocabularyMastery = snapshot.totalCards > 0 ? Math.round((snapshot.masteredCards / snapshot.totalCards) * 100) : 0;
  const readingProgress = Math.round((snapshot.readingCompleted / (readingPassages as unknown[]).length) * 100);
  const conversationProgress = Math.round((snapshot.conversationCompleted / (conversationScenarios as unknown[]).length) * 100);

  const breakdown = [
    { label: 'Vocabulary mastery', value: vocabularyMastery, icon: BookOpen, href: '/flashcards' },
    { label: 'Grammar accuracy', value: snapshot.grammarAccuracy, icon: PenLine, href: '/grammar' },
    { label: 'Reading accuracy', value: snapshot.readingAccuracy, icon: FileText, href: '/reading' },
    { label: 'Conversation progress', value: conversationProgress, icon: MessagesSquare, href: '/conversation' },
  ];

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">Stats</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">YDS readiness and study balance</p>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-center py-2">
          <ProgressRing progress={ydsReadiness} size={160} strokeWidth={12} color="#2563EB" trackColor="var(--border, #E5E7EB)">
            <div className="text-center">
              <p className="text-4xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{ydsReadiness}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">YDS readiness</p>
            </div>
          </ProgressRing>
        </div>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Vocabulary, grammar, reading and speaking practice are weighted together.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card padding="sm">
          <div className="text-center">
            <Trophy size={18} className="text-accent mx-auto mb-1" />
            <p className="text-xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">Level {level}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{snapshot.userStats.totalXP} XP</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <Target size={18} className="text-success mx-auto mb-1" />
            <p className="text-xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{snapshot.userStats.studyMinutes}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Study minutes</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <BookOpen size={18} className="text-warning mx-auto mb-1" />
            <p className="text-xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{snapshot.masteredCards}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Mastered words</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <BarChart3 size={18} className="text-rose-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{snapshot.dueCards}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Cards due</p>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">Module breakdown</h2>
        <div className="space-y-3">
          {breakdown.map(({ label, value, icon: Icon, href }) => (
            <Link key={label} href={href} className="block">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Icon size={16} className="text-accent" />
                  <span className="text-sm font-medium text-[#1A1A1A] dark:text-[#F5F5F5]">{label}</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{value}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">Coverage</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/70 p-3">
            <p className="text-lg font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{snapshot.grammarCoverage}%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Grammar</p>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/70 p-3">
            <p className="text-lg font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{readingProgress}%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Reading</p>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/70 p-3">
            <p className="text-lg font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{conversationProgress}%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Speaking</p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">Weak grammar topics</h2>
        <div className="space-y-2">
          {snapshot.weakGrammarTopics.length > 0 ? (
            snapshot.weakGrammarTopics.map((topic) => (
              <Link key={topic.id} href="/grammar" className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/70 p-3">
                <span>
                  <span className="block text-sm font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">{topic.name}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {topic.attempts === 0 ? 'Not practiced yet' : `${topic.accuracy}% accuracy from ${topic.attempts} attempts`}
                  </span>
                </span>
                <span className="text-xs font-semibold text-accent">Practice</span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No weak grammar topic yet. Keep the streak alive.</p>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">90-day activity</h2>
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(15, 1fr)' }}>
          {calendar.slice(-90).map(({ date, xp }) => (
            <div
              key={date}
              title={`${date}: ${xp} XP`}
              className={`aspect-square rounded-sm ${xp >= 100 ? 'bg-accent' : xp > 0 ? 'bg-blue-300 dark:bg-blue-700' : 'bg-gray-100 dark:bg-gray-800'}`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
