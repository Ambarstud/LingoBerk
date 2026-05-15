import { storage, STORAGE_KEYS } from './storage';
import type { StreakData } from './types';

const MIN_XP_FOR_ACTIVE_DAY = 50;

export function getDefaultStreak(): StreakData {
  return {
    currentStreak: 0,
    bestStreak: 0,
    lastActiveDate: null,
    calendar: {},
  };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function daysBetween(a: string, b: string): number {
  const dateA = new Date(a);
  const dateB = new Date(b);
  dateA.setHours(0, 0, 0, 0);
  dateB.setHours(0, 0, 0, 0);
  return Math.round((dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Update streak after XP is added. Should be called whenever XP is awarded.
 * Day is active if total XP for that day >= 50.
 */
export function updateStreak(todayXP: number): StreakData {
  const today = formatDate(new Date());
  const existing = storage.get<StreakData>(STORAGE_KEYS.STREAK) ?? getDefaultStreak();

  // Update calendar with today's XP
  const calendar = { ...existing.calendar };
  calendar[today] = (calendar[today] ?? 0);
  // The caller passes the running today total
  // We store the actual XP total for today from UserStats separately
  // Here we just track whether the day is active
  const isActiveToday = todayXP >= MIN_XP_FOR_ACTIVE_DAY;

  let { currentStreak, bestStreak, lastActiveDate } = existing;

  if (isActiveToday) {
    calendar[today] = todayXP;

    if (lastActiveDate === null) {
      currentStreak = 1;
    } else if (lastActiveDate === today) {
      // Already counted today — just update xp in calendar
    } else {
      const diff = daysBetween(lastActiveDate, today);
      if (diff === 1) {
        // Consecutive day
        currentStreak += 1;
      } else if (diff > 1) {
        // Gap — reset streak
        currentStreak = 1;
      }
    }

    lastActiveDate = today;
    bestStreak = Math.max(bestStreak, currentStreak);
  }

  const updated: StreakData = {
    currentStreak,
    bestStreak,
    lastActiveDate,
    calendar,
  };

  storage.set(STORAGE_KEYS.STREAK, updated);
  return updated;
}

/**
 * Check streak integrity at app load — resets if last active date was > 1 day ago
 */
export function checkStreak(): StreakData {
  const today = formatDate(new Date());
  const existing = storage.get<StreakData>(STORAGE_KEYS.STREAK) ?? getDefaultStreak();

  if (existing.lastActiveDate === null) return existing;

  const diff = daysBetween(existing.lastActiveDate, today);

  if (diff > 1) {
    // Streak broken
    const updated: StreakData = {
      ...existing,
      currentStreak: 0,
    };
    storage.set(STORAGE_KEYS.STREAK, updated);
    return updated;
  }

  return existing;
}

/**
 * Get calendar data for the last N days
 */
export function getCalendar(days: number = 30): { date: string; xp: number; active: boolean }[] {
  const streak = storage.get<StreakData>(STORAGE_KEYS.STREAK) ?? getDefaultStreak();
  const result = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = formatDate(date);
    const xp = streak.calendar[dateStr] ?? 0;
    result.push({
      date: dateStr,
      xp,
      active: xp >= MIN_XP_FOR_ACTIVE_DAY,
    });
  }

  return result;
}
