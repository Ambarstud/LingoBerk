import { storage, STORAGE_KEYS } from './storage';

// Buluta senkronlanacak veri anahtarları (uygulamanın tüm ilerlemesi).
const SYNC_KEYS: string[] = [
  STORAGE_KEYS.FLASHCARDS,
  STORAGE_KEYS.CUSTOM_CARDS,
  STORAGE_KEYS.GRAMMAR_PROGRESS,
  STORAGE_KEYS.READING_PROGRESS,
  STORAGE_KEYS.USER_STATS,
  STORAGE_KEYS.SETTINGS,
  STORAGE_KEYS.STREAK,
  STORAGE_KEYS.CONVERSATION_PROGRESS,
  STORAGE_KEYS.TASK_PROGRESS,
  STORAGE_KEYS.NEW_CARDS_LOG,
];

// Senkron meta anahtarları (bunlar buluta gönderilmez).
const SECRET_KEY = 'sync_secret';
const UPDATED_AT_KEY = 'sync_updated_at';
const LAST_HASH_KEY = 'sync_last_hash';

export type SyncStatus =
  | 'pulled' // buluttan yeni veri alındı
  | 'pushed' // yerel veri buluta gönderildi
  | 'ok' // güncel, değişiklik yok
  | 'nochange'
  | 'empty' // bulutta veri yok
  | 'no-secret'
  | 'bad-secret'
  | 'not-configured'
  | 'error';

export interface SyncResult {
  status: SyncStatus;
  changed?: boolean;
  message?: string;
}

export function getSecret(): string | null {
  return storage.get<string>(SECRET_KEY);
}
export function setSecret(secret: string): void {
  storage.set(SECRET_KEY, secret.trim());
}
export function clearSecret(): void {
  storage.remove(SECRET_KEY);
}
export function hasSecret(): boolean {
  return !!getSecret();
}

export function getLastSyncedAt(): string | null {
  return storage.get<string>(UPDATED_AT_KEY);
}
function setLocalUpdatedAt(ts: string): void {
  storage.set(UPDATED_AT_KEY, ts);
}
function getLastHash(): string | null {
  return storage.get<string>(LAST_HASH_KEY);
}
function setLastHash(h: string): void {
  storage.set(LAST_HASH_KEY, h);
}

// Yerel durumu topla (sabit anahtar sırasıyla → kararlı serileştirme).
function collectState(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of SYNC_KEYS) {
    const val = storage.get(key);
    if (val !== null && val !== undefined) out[key] = val;
  }
  return out;
}

function serialize(state: Record<string, unknown>): string {
  return JSON.stringify(state, SYNC_KEYS);
}

function applyState(data: Record<string, unknown>): void {
  for (const key of SYNC_KEYS) {
    if (key in data) storage.set(key, data[key]);
  }
}

async function api(method: 'GET' | 'POST', secret: string, body?: unknown) {
  return fetch('/api/sync', {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-sync-secret': secret,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });
}

/** Buluttan çek: bulut daha yeniyse yereli günceller. */
export async function pull(): Promise<SyncResult> {
  const secret = getSecret();
  if (!secret) return { status: 'no-secret' };

  try {
    const res = await api('GET', secret);
    if (res.status === 401) return { status: 'bad-secret' };
    if (res.status === 503) return { status: 'not-configured' };
    if (!res.ok) return { status: 'error', message: `Sunucu hatası: ${res.status}` };

    const json = (await res.json()) as { data: Record<string, unknown> | null; updatedAt: string | null };
    if (!json.data || !json.updatedAt) return { status: 'empty' };

    const local = getLastSyncedAt();
    if (!local || json.updatedAt > local) {
      applyState(json.data);
      setLocalUpdatedAt(json.updatedAt);
      setLastHash(serialize(collectState()));
      return { status: 'pulled', changed: true };
    }
    return { status: 'ok', changed: false };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Ağ hatası' };
  }
}

/** Yerel veriyi buluta gönder (değişmişse). */
export async function push(force = false): Promise<SyncResult> {
  const secret = getSecret();
  if (!secret) return { status: 'no-secret' };

  const state = collectState();
  const hash = serialize(state);
  if (!force && hash === getLastHash()) return { status: 'nochange' };

  const updatedAt = new Date().toISOString();
  try {
    const res = await api('POST', secret, { data: state, updatedAt });
    if (res.status === 401) return { status: 'bad-secret' };
    if (res.status === 503) return { status: 'not-configured' };
    if (!res.ok) return { status: 'error', message: `Sunucu hatası: ${res.status}` };

    setLocalUpdatedAt(updatedAt);
    setLastHash(hash);
    return { status: 'pushed' };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Ağ hatası' };
  }
}

/** Önce çek (bulut yeniyse), sonra gönder (yerel yeniyse). */
export async function syncNow(): Promise<SyncResult> {
  const p = await pull();
  if (p.status === 'pulled') return p; // veri değişti; çağıran sayfayı yenilesin
  if (p.status === 'empty' || p.status === 'ok') {
    const pushed = await push();
    if (pushed.status === 'pushed' || pushed.status === 'nochange') return { status: pushed.status };
    return pushed;
  }
  return p; // no-secret / bad-secret / not-configured / error
}
