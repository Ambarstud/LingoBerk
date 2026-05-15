'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

export function StoreInitializer() {
  const initStore = useStore((s) => s.initStore);

  useEffect(() => {
    initStore();
  }, [initStore]);

  return null;
}
