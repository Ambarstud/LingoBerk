'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { hasSecret, pull, push } from '@/lib/sync';

export function StoreInitializer() {
  const initStore = useStore((s) => s.initStore);

  useEffect(() => {
    initStore();

    if (!hasSecret()) return;

    let cancelled = false;

    // Açılışta buluttan çek; bulut daha yeniyse veriyi uygula ve sayfayı bir kez yenile.
    // (Yenileme sonrası zaman damgaları eşit olacağı için tekrar yenilenmez.)
    (async () => {
      const res = await pull();
      if (cancelled) return;
      if (res.status === 'pulled') {
        window.location.reload();
      } else if (res.status === 'ok' || res.status === 'empty') {
        push(); // yerelde bekleyen değişiklik varsa gönder
      }
    })();

    // Periyodik gönder (değişiklik varsa)
    const interval = setInterval(() => { push(); }, 30_000);

    // Uygulamadan çıkarken / sekme gizlenince gönder
    const onHide = () => { if (document.visibilityState === 'hidden') push(); };
    document.addEventListener('visibilitychange', onHide);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [initStore]);

  return null;
}
