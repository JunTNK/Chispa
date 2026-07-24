'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils/helpers';

const NAV_ITEMS = [
  { view: 'home', label: 'Inicio', icon: Icons.Home },
  { view: 'train', label: 'Entrenar', icon: Icons.Dumbbell },
  { view: 'coach', label: 'Coach', icon: Icons.Chat },
  { view: 'progress', label: 'Progreso', icon: Icons.Chart },
  { view: 'profile', label: 'Perfil', icon: Icons.User },
] as const;

export function NavBar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const checkins = useStore((s) => s.checkins);

  const handleNav = (v: string) => {
    if (v === 'train' && !checkins[new Date().toISOString().slice(0, 10)]) {
      return;
    }
    setView(v);
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] z-50 bg-[rgba(13,17,27,0.88)] backdrop-blur-xl border-t border-white/[.07] flex px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-1.5">
      {NAV_ITEMS.map(({ view: v, label, icon: Icon }) => (
        <button
          key={v}
          onClick={() => handleNav(v)}
          className={cn(
            'flex-1 flex flex-col items-center gap-0.5 py-2 border-none bg-transparent text-[#94a0b8] text-[11px] font-semibold cursor-pointer rounded-xl transition-colors',
            view === v && 'text-[#ffb454] drop-shadow-[0_0_8px_rgba(255,180,84,0.5)]'
          )}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
