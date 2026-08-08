// Supabase şema migration'ı — bir kez çalıştırılır (idempotent).
// Çalıştırma:  node --env-file=.env.local scripts/migrate.mjs
import pg from 'pg';

let url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!url) {
  console.error('POSTGRES_URL bulunamadı. .env.local yüklendi mi?');
  process.exit(1);
}
// sslmode parametresini kaldır; SSL'i aşağıdaki ssl objesiyle yöneteceğiz.
url = url.replace(/[?&]sslmode=[^&]*/g, '');

const SQL = `
create table if not exists public.sync_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- RLS açık, POLICY YOK: sadece service_role (sunucu API) erişir.
alter table public.sync_state enable row level security;
`;

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(SQL);
  const { rows } = await client.query(
    "select relrowsecurity from pg_class where relname = 'sync_state'"
  );
  console.log('✅ sync_state tablosu hazır. RLS açık:', rows[0]?.relrowsecurity);
} catch (err) {
  console.error('Migration hatası:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
