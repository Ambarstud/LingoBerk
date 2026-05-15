import { storage, STORAGE_KEYS } from './storage';
import type { UserStats } from './types';

export const XP_VALUES = {
  flashcard: 5,
  flashcardStreakBonus: 10, // when streak >= 7 days
  grammar: 15,
  reading: 20,
  conversation: 5,
  chat: 10, // per 5 messages
  dailyGoal: 200,
} as const;

export function getLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 100));
}

export function getXPForLevel(level: number): number {
  return level * level * 100;
}

export function getXPToNextLevel(totalXP: number): { current: number; needed: number; progress: number } {
  const level = getLevel(totalXP);
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const current = totalXP - currentLevelXP;
  const needed = nextLevelXP - currentLevelXP;
  return {
    current,
    needed,
    progress: needed > 0 ? Math.round((current / needed) * 100) : 100,
  };
}

export function getDefaultStats(): UserStats {
  return {
    totalXP: 0,
    todayXP: 0,
    lastXPDate: new Date().toISOString().split('T')[0],
    cardsReviewed: 0,
    exercisesCompleted: 0,
    passagesRead: 0,
    chatMessages: 0,
    studyMinutes: 0,
    totalWordsLearned: 0,
    averageAccuracy: 0,
  };
}

export function addXP(amount: number): UserStats {
  const today = new Date().toISOString().split('T')[0];
  const existing = storage.get<UserStats>(STORAGE_KEYS.USER_STATS) ?? getDefaultStats();

  const todayXP = existing.lastXPDate === today ? existing.todayXP + amount : amount;

  const updated: UserStats = {
    ...existing,
    totalXP: existing.totalXP + amount,
    todayXP,
    lastXPDate: today,
  };

  storage.set(STORAGE_KEYS.USER_STATS, updated);
  return updated;
}

export function getTodayXP(): number {
  const today = new Date().toISOString().split('T')[0];
  const stats = storage.get<UserStats>(STORAGE_KEYS.USER_STATS);
  if (!stats || stats.lastXPDate !== today) return 0;
  return stats.todayXP;
}
