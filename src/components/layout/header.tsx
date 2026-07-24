'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { cap } from '@/lib/utils/helpers';

export function Header() {
  const profile = useStore((s) => s.profile);

  const date = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="flex items-center justify-between px-4 pt-5 pb-2">
      <div>
        <h1 className="font-black text-xl tracking-tight">
          Hola, {profile?.name || 'amigo'} 👋
        </h1>
        <p className="text-sm text-[#94a0b8] capitalize">{cap(date)}</p>
      </div>
      <img
        src="https://image.qwenlm.ai/public_source/6293bf56-c9cc-4349-841d-cdde04e9d74e/1d08f0a58-ea85-4e8b-b799-e65c81f037a6.png"
        alt="CHISPA"
        className="w-9 h-9 rounded-xl object-cover"
      />
    </header>
  );
}
