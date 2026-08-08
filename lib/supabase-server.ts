import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Sunucu tarafı Supabase istemcisi (service_role — RLS'i bypass eder).
// ASLA client'a gönderilmez; sadece /api rotalarında kullanılır.
let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase env değişkenleri (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) ayarlı değil.');
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

// Tek kullanıcılı uygulama: tüm veri tek satırda tutulur.
export const SYNC_ROW_ID = 'main';
