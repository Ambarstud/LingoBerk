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
  // Actions
  addXP: (amount: number) => void;
  refreshStats: () => void;
  updateStreakData: () => void;
  setDarkMode: (dark: boolean) => void;
  setDailyGoal: (goal: number) => void;
  initStore: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  dailyGoal: 200,
  darkMode: false,
  notifications: false,
  preferredProvider: 'openrouter',
};

export const useStore = create<AppState>((set, get) => ({
  userStats: getDefaultStats(),
  streakData: getDefaultStreak(),
  settings: DEFAULT_SETTINGS,

  initStore: () => {
    const stats = storage.get<UserStats>(STORAGE_KEYS.USER_STATS) ?? getDefaultStats();
    const streak = checkStreak();
    const settings = storage.get<UserSettings>(STORAGE_KEYS.SETTINGS) ?? DEFAULT_SETTINGS;

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
}));
