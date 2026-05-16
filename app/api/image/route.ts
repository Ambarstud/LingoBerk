import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const prompt = req.nextUrl.searchParams.get('prompt');
  const seed   = req.nextUrl.searchParams.get('seed') ?? String(Math.floor(Math.random() * 9000) + 1000);
  const w      = req.nextUrl.searchParams.get('w') ?? '480';
  const h      = req.nextUrl.searchParams.get('h') ?? '640';

  if (!prompt) return NextResponse.json({ error: 'missing prompt' }, { status: 400 });

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&safe=false`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      return NextResponse.json({ error: `upstream ${res.status}` }, { status: 502 });
    }
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'timeout' }, { status: 504 });
  }
}
