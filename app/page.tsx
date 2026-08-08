'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  BookOpen,
  CalendarClock,
  CalendarDays,
  FileText,
  Flame,
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
import { daysUntil } from '@/lib/daily';
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
  { href: '/flashcards', label: 'Kartlar', icon: BookOpen, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  { href: '/program', label: 'Program', icon: CalendarDays, color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' },
  { href: '/grammar', label: 'Gramer', icon: PenLine, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
  { href: '/reading', label: 'Okuma', icon: FileText, color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  { href: '/conversation', label: 'Konuşma', icon: MessagesSquare, color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' },
  { href: '/stats', label: 'İstatistik', icon: BarChart3, color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' },
];

const defaultMetrics: DashboardMetrics = {
  dueCount: 0, masteredWords: 0, grammarAnswered: 0, grammarTotal: 0,
  grammarAccuracy: null, readingCompleted: 0, readingTotal: 0,
  conversationCompleted: 0, conversationTotal: 0,
  nextReadingTitle: 'İlk okuma parçana başla',
  weakGrammarTopic: 'Tenses ile başla',
};

export default function DashboardPage() {
  const { userStats, streakData, settings } = useStore();
  const [calendar, setCalendar] = useState<{ date: string; xp: number; active: boolean }[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>(defaultMetrics);

  const level = getLevel(userStats.totalXP);
  const xpProgress = getXPToNextLevel(userStats.totalXP);
  const dailyProgress = Math.min(100, Math.round((userStats.todayXP / settings.dailyGoal) * 100));
  const xpRemaining = Math.max(0, settings.dailyGoal - userStats.todayXP);

  const examDateStr = settings.examDate || '2026-11-22';
  const daysToExam = daysUntil(examDateStr);
  const examDateLabel = new Date(examDateStr + 'T00:00:00').toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
        })[0]?.name ?? 'Karışık tekrar';

    const nextReading =
      (readingPassages as { id: string; title: string }[]).find((passage) => !readingProgress[passage.id])?.title ??
      'Tamamlanan bir parçayı tekrar et';

    setMetrics({
      dueCount: getDueCards(cards).length,
      masteredWords: getMasteredCards(cards).length,
      grammarAnswered, grammarTotal, grammarAccuracy,
      readingCompleted: Object.keys(readingProgress).length,
      readingTotal: (readingPassages as unknown[]).length,
      conversationCompleted: Object.values(conversationProgress).filter(Boolean).length,
      conversationTotal: (conversationScenarios as unknown[]).length,
      nextReadingTitle: nextReading,
      weakGrammarTopic: weakTopic,
    });
    setCalendar(getCalendar(30));
  }, []);

  const dailyPlan = useMemo(() => [
    { href: '/flashcards', title: metrics.dueCount > 0 ? `${metrics.dueCount} kartı tekrar et` : 'Yeni YDS kelimeleri çalış', detail: 'Önce kelime, gerisi kolaylaşır.' },
    { href: '/grammar', title: `${metrics.weakGrammarTopic} çalış`, detail: metrics.grammarAccuracy === null ? 'İlk gramer denemeni yap.' : `Gramer doğruluğun: %${metrics.grammarAccuracy}` },
    { href: '/reading', title: metrics.nextReadingTitle, detail: `${metrics.readingCompleted}/${metrics.readingTotal} okuma parçası bitti.` },
    { href: '/conversation', title: 'Bir konuşma senaryosu çalış', detail: `${metrics.conversationCompleted}/${metrics.conversationTotal} senaryo tamamlandı.` },
  ], [metrics]);

  return (
    <div className="pb-8 space-y-6 max-w-lg mx-auto">

      {/* Header */}
      <div className="px-5 pt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] dark:text-[#F5F5F5] tracking-tight">LingoBerk</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Seviye {level} · bugün {userStats.todayXP} XP</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-full">
            <Flame size={14} className="text-warning" />
            <span className="text-sm font-black text-warning">{streakData.currentStreak}</span>
          </div>
          <Link href="/settings" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Settings size={20} className="text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Sınav geri sayımı */}
      <div className="px-5">
        <Link href="/settings" className="block active:scale-[0.98] transition-transform">
          <div className="rounded-2xl bg-gradient-to-br from-accent to-blue-700 text-white p-4 shadow-lg shadow-accent/20 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-white/15">
              <CalendarClock size={22} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">YDS Sınavına</p>
              {daysToExam > 0 ? (
                <p className="text-2xl font-black leading-tight">{daysToExam} gün</p>
              ) : daysToExam === 0 ? (
                <p className="text-2xl font-black leading-tight">Bugün! 🎯</p>
              ) : (
                <p className="text-2xl font-black leading-tight">Sınav geçti</p>
              )}
            </div>
            <p className="text-xs font-medium text-white/70 text-right">{examDateLabel}</p>
          </div>
        </Link>
      </div>

      {/* XP Progress */}
      <div className="px-5">
        <Card>
          <div className="flex items-center gap-4">
            <ProgressRing progress={dailyProgress} size={88} strokeWidth={7} color="#2563EB" trackColor="var(--border, #E5E7EB)">
              <div className="text-center">
                <div className="text-base font-black text-[#1A1A1A] dark:text-[#F5F5F5]">{dailyProgress}%</div>
              </div>
            </ProgressRing>
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-sm font-black text-[#1A1A1A] dark:text-[#F5F5F5]">
                  {userStats.todayXP}<span className="text-sm font-normal text-gray-400"> / {settings.dailyGoal} XP</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {xpRemaining > 0 ? `${xpRemaining} XP kaldı` : '🎯 Günlük hedef tamam!'}
                </p>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-gray-400 font-bold">Seviye {level}</span>
                  <span className="text-[11px] text-gray-400">{xpProgress.current}/{xpProgress.needed} XP</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${xpProgress.progress}%` }} />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Daily Plan */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-base text-[#1A1A1A] dark:text-[#F5F5F5]">Bugünkü Plan</h2>
          <Target size={16} className="text-success" />
        </div>
        <div className="space-y-2">
          {dailyPlan.map((item, i) => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-gray-800/70 p-3.5 active:scale-[0.98] transition-transform"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-[#242424] text-xs font-black text-accent shrink-0">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5] truncate">{item.title}</span>
                <span className="block text-xs text-gray-400">{item.detail}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="px-5 grid grid-cols-3 gap-3">
        <Card padding="sm">
          <div className="text-center">
            <Trophy size={15} className="text-accent mx-auto mb-1" />
            <p className="text-lg font-black text-[#1A1A1A] dark:text-[#F5F5F5]">{metrics.masteredWords}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Öğrenildi</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <Target size={15} className="text-success mx-auto mb-1" />
            <p className="text-lg font-black text-[#1A1A1A] dark:text-[#F5F5F5]">{userStats.exercisesCompleted}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Alıştırma</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <Zap size={15} className="text-warning mx-auto mb-1" />
            <p className="text-lg font-black text-[#1A1A1A] dark:text-[#F5F5F5]">
              {userStats.averageAccuracy > 0 ? `${Math.round(userStats.averageAccuracy)}%` : '--'}
            </p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Doğruluk</p>
          </div>
        </Card>
      </div>

      {/* Modules */}
      <div className="px-5">
        <h2 className="font-black text-base text-[#1A1A1A] dark:text-[#F5F5F5] mb-3">Modüller</h2>
        <div className="grid grid-cols-2 gap-3">
          {modules.map(({ href, label, icon: Icon, color }) => {
            const badge = href === '/flashcards' && metrics.dueCount > 0 ? metrics.dueCount : null;
            return (
              <Link key={href} href={href}
                className="rounded-2xl bg-white dark:bg-[#242424] border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-3 active:scale-[0.97] transition-transform shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-xl ${color}`}><Icon size={18} /></div>
                  {badge !== null && <span className="bg-error text-white text-xs font-black px-1.5 py-0.5 rounded-full">{badge}</span>}
                </div>
                <div>
                  <p className="font-bold text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">{label}</p>
                  {href === '/flashcards' && <p className="text-xs text-gray-400 mt-0.5">{metrics.dueCount > 0 ? `${metrics.dueCount} kart bekliyor` : 'Hepsi tamam'}</p>}
                  {href === '/program' && <p className="text-xs text-gray-400 mt-0.5">15 haftalık plan</p>}
                  {href === '/grammar' && <p className="text-xs text-gray-400 mt-0.5">{metrics.grammarAnswered}/{metrics.grammarTotal} cevaplandı</p>}
                  {href === '/reading' && <p className="text-xs text-gray-400 mt-0.5">{metrics.readingCompleted}/{metrics.readingTotal} parça</p>}
                  {href === '/conversation' && <p className="text-xs text-gray-400 mt-0.5">{metrics.conversationCompleted}/{metrics.conversationTotal} senaryo</p>}
                  {href === '/stats' && <p className="text-xs text-gray-400 mt-0.5">YDS hazırlık</p>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Streak calendar */}
      <div className="px-5">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-warning" />
              <h2 className="font-black text-sm text-[#1A1A1A] dark:text-[#F5F5F5]">Seri</h2>
            </div>
            <div>
              <span className="text-xl font-black text-warning">{streakData.currentStreak}</span>
              <span className="text-xs text-gray-400 ml-1">gün · en iyi {streakData.bestStreak}</span>
            </div>
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
            {calendar.slice(-30).map(({ date, active }) => (
              <div key={date} title={date} className={`aspect-square rounded-sm ${active ? 'bg-accent' : 'bg-gray-100 dark:bg-gray-800'}`} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
