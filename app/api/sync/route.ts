import { NextResponse } from 'next/server';
import { getServiceClient, SYNC_ROW_ID } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Gizli anahtar kapısı: header'daki x-sync-secret, sunucudaki SYNC_SECRET ile eşleşmeli.
function checkSecret(req: Request): { ok: boolean; configured: boolean } {
  const expected = process.env.SYNC_SECRET;
  if (!expected) return { ok: false, configured: false };
  const provided = req.headers.get('x-sync-secret') ?? '';
  return { ok: provided.length > 0 && provided === expected, configured: true };
}

export async function GET(req: Request) {
  const { ok, configured } = checkSecret(req);
  if (!configured) return NextResponse.json({ error: 'Senkron sunucuda yapılandırılmamış.' }, { status: 503 });
  if (!ok) return NextResponse.json({ error: 'Geçersiz senkron anahtarı.' }, { status: 401 });

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('sync_state')
      .select('data, updated_at')
      .eq('id', SYNC_ROW_ID)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ data: null, updatedAt: null });
    return NextResponse.json({ data: data.data, updatedAt: data.updated_at });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { ok, configured } = checkSecret(req);
  if (!configured) return NextResponse.json({ error: 'Senkron sunucuda yapılandırılmamış.' }, { status: 503 });
  if (!ok) return NextResponse.json({ error: 'Geçersiz senkron anahtarı.' }, { status: 401 });

  try {
    const body = await req.json();
    const payload = body?.data;
    const updatedAt = body?.updatedAt ?? new Date().toISOString();
    if (payload === undefined || payload === null) {
      return NextResponse.json({ error: 'data alanı gerekli.' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { error } = await supabase
      .from('sync_state')
      .upsert({ id: SYNC_ROW_ID, data: payload, updated_at: updatedAt }, { onConflict: 'id' });

    if (error) throw error;
    return NextResponse.json({ ok: true, updatedAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
