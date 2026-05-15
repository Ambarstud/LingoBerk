'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings, BookOpen, PenLine, FileText, MessageCircle, Flame, Zap, Target, Trophy } from 'lucide-react';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Card } from '@/components/ui/Card';
import { useStore } from '@/store/useStore';
import { getLevel, getXPToNextLevel } from '@/lib/xp-system';
import { getCalendar } from '@/lib/streak';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import type { FlashCard } from '@/lib/types';
import { getDueCards } from '@/lib/spaced-repetition';

const modules = [
  { href: '/flashcards', label: 'Flashcards', icon: BookOpen, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  { href: '/grammar', label: 'Grammar', icon: PenLine, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
  { href: '/reading', label: 'Reading', icon: FileText, color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  { href: '/chat', label: 'Chat', icon: MessageCircle, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' },
];

export default function DashboardPage() {
  const { userStats, streakData, settings } = useStore();
  const [dueCount, setDueCount] = useState(0);
  const [calendar, setCalendar] = useState<{ date: string; xp: number; active: boolean }[]>([]);

  const level = getLevel(userStats.totalXP);
  const xpProgress = getXPToNextLevel(userStats.totalXP);
  const dailyProgress = Math.min(100, Math.round((userStats.todayXP / settings.dailyGoal) * 100));

  useEffect(() => {
    const cards = storage.get<FlashCard[]>(STORAGE_KEYS.FLASHCARDS) ?? [];
    setDueCount(getDueCards(cards).length);
    setCalendar(getCalendar(30));
  }, []);

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">LingoBerk</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Level {level}</p>
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

      {/* Daily Progress Card */}
      <Card>
        <div className="flex items-center gap-4">
          <ProgressRing
            progress={dailyProgress}
            size={100}
            strokeWidth={8}
            color="#2563EB"
            trackColor="var(--border, #E5E7EB)"
          >
            <div className="text-center">
              <div className="text-lg font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{dailyProgress}%</div>
            </div>
          </ProgressRing>
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Zap size={14} className="text-accent" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Today&apos;s XP</span>
              </div>
              <p className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                {userStats.todayXP}
                <span className="text-base font-normal text-gray-400"> / {settings.dailyGoal}</span>
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Level {level}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{xpProgress.current}/{xpProgress.needed} XP</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Streak Card */}
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
        {/* Mini calendar heatmap */}
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
          {calendar.slice(-30).map(({ date, active }) => (
            <div
              key={date}
              title={date}
              className={`aspect-square rounded-sm ${
                active
                  ? 'bg-accent'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            />
          ))}
        </div>
      </Card>

      {/* Module Cards */}
      <div>
        <h2 className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">Modules</h2>
        <div className="grid grid-cols-2 gap-3">
          {modules.map(({ href, label, icon: Icon, color }) => {
            const badge = href === '/flashcards' && dueCount > 0 ? dueCount : null;
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
                  {badge !== null && (
                    <span className="bg-error text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {badge}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-[#1A1A1A] dark:text-[#F5F5F5]">{label}</p>
                  {href === '/flashcards' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {dueCount > 0 ? `${dueCount} cards due` : 'All caught up!'}
                    </p>
                  )}
                  {href === '/grammar' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">YDS topics</p>
                  )}
                  {href === '/reading' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Passages</p>
                  )}
                  {href === '/chat' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">AI conversation</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card padding="sm">
          <div className="text-center">
            <Trophy size={16} className="text-accent mx-auto mb-1" />
            <p className="text-lg font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{userStats.totalWordsLearned}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Words</p>
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
