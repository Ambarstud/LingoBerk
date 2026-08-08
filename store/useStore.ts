'use client';

import { create } from 'zustand';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { getDefaultStats, addXP as addXPToStorage } from '@/lib/xp-system';
import { updateStreak, checkStreak, getDefaultStreak } from '@/lib/streak';
import type { UserStats, StreakData, UserSettings } from '@/lib/types';

interface AppState {
  userStats: UserStats;
  streakData: StreakData;
  settings: UserSettings;
  immersive: boolean; // tam ekran çalışma modu (alt menüyü gizler)
  // Actions
  setImmersive: (value: boolean) => void;
  addXP: (amount: number) => void;
  refreshStats: () => void;
  updateStreakData: () => void;
  setDarkMode: (dark: boolean) => void;
  setDailyGoal: (goal: number) => void;
  setNewCardsPerDay: (n: number) => void;
  setExamDate: (date: string) => void;
  initStore: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  dailyGoal: 200,
  newCardsPerDay: 30,
  examDate: '2026-11-22',
  darkMode: false,
  notifications: false,
  preferredProvider: 'openrouter',
};

export const useStore = create<AppState>((set, get) => ({
  userStats: getDefaultStats(),
  streakData: getDefaultStreak(),
  settings: DEFAULT_SETTINGS,
  immersive: false,

  setImmersive: (value: boolean) => set({ immersive: value }),

  initStore: () => {
    const stats = storage.get<UserStats>(STORAGE_KEYS.USER_STATS) ?? getDefaultStats();
    const streak = checkStreak();
    // Eski kayıtlarda yeni ayar alanları olmayabilir; varsayılanlarla birleştir.
    const saved = storage.get<Partial<UserSettings>>(STORAGE_KEYS.SETTINGS);
    const settings: UserSettings = { ...DEFAULT_SETTINGS, ...(saved ?? {}) };

    set({ userStats: stats, streakData: streak, settings });

    // Apply dark mode
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  addXP: (amount: number) => {
    const updated = addXPToStorage(amount);
    const streak = updateStreak(updated.todayXP);
    set({ userStats: updated, streakData: streak });
  },

  refreshStats: () => {
    const stats = storage.get<UserStats>(STORAGE_KEYS.USER_STATS) ?? getDefaultStats();
    set({ userStats: stats });
  },

  updateStreakData: () => {
    const streak = checkStreak();
    set({ streakData: streak });
  },

  setDarkMode: (dark: boolean) => {
    const { settings } = get();
    const updated = { ...settings, darkMode: dark };
    storage.set(STORAGE_KEYS.SETTINGS, updated);
    set({ settings: updated });

    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  setDailyGoal: (goal: number) => {
    const { settings } = get();
    const updated = { ...settings, dailyGoal: goal };
    storage.set(STORAGE_KEYS.SETTINGS, updated);
    set({ settings: updated });
  },

  setNewCardsPerDay: (n: number) => {
    const { settings } = get();
    const updated = { ...settings, newCardsPerDay: n };
    storage.set(STORAGE_KEYS.SETTINGS, updated);
    set({ settings: updated });
  },

  setExamDate: (date: string) => {
    const { settings } = get();
    const updated = { ...settings, examDate: date };
    storage.set(STORAGE_KEYS.SETTINGS, updated);
    set({ settings: updated });
  },
}));
