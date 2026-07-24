'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';

export function useClientStore() {
  const store = useStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return { store, hydrated };
}
