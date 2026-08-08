import type { StorageProvider } from './types';

class LocalStorageProvider implements StorageProvider {
  private prefix = 'lingoberk_';

  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(this.prefix + key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.prefix + key, JSON.stringify(value));
  }

  remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(this.prefix))
      .forEach((k) => localStorage.removeItem(k));
  }
}

export const storage: StorageProvider = new LocalStorageProvider();

// Storage key constants
export const STORAGE_KEYS = {
  FLASHCARDS: 'flashcards',
  CUSTOM_CARDS: 'custom_cards',
  GRAMMAR_PROGRESS: 'grammar_progress',
  READING_PROGRESS: 'reading_progress',
  USER_STATS: 'user_stats',
  SETTINGS: 'settings',
  STREAK: 'streak',
  CONVERSATION_PROGRESS: 'conversation_progress',
  NEW_CARDS_LOG: 'new_cards_log',
  TASK_PROGRESS: 'task_progress',
} as const;
