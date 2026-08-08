import { storage, STORAGE_KEYS } from './storage';

/** Bugünün tarihi "YYYY-MM-DD" formatında (uygulama genelinde tutarlı). */
export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/** Verilen ISO tarihe kalan gün sayısı (geçmişse negatif). */
export function daysUntil(dateStr: string): number {
  if (!dateStr) return 0;
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

interface NewLog {
  date: string;
  count: number;
}

/** Bugün kaç YENİ kelime çalışmaya başlandı. */
export function getNewToday(): number {
  const log = storage.get<NewLog>(STORAGE_KEYS.NEW_CARDS_LOG);
  if (!log || log.date !== todayStr()) return 0;
  return log.count;
}

/** Bugünkü yeni kelime sayacını artır. */
export function addNewToday(n = 1): number {
  const today = todayStr();
  const log = storage.get<NewLog>(STORAGE_KEYS.NEW_CARDS_LOG);
  const count = (log && log.date === today ? log.count : 0) + n;
  storage.set(STORAGE_KEYS.NEW_CARDS_LOG, { date: today, count });
  return count;
}
