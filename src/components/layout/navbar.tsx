'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils/helpers';
import { Dumbbell, Sparkles, User, ChartBar as ChartIcon, Medal, Trophy } from 'lucide-react';

const NAV_ITEMS = [
  { view: 'home', label: 'Inicio', icon: Icons.Home },
  { view: 'train', label: 'Entrenar', icon: Icons.Dumbbell },
  { view: 'quest', label: 'Quest', icon: Icons.Spark },
  { view: 'coach', label: 'Coach', icon: Icons.Chat },
  { view: 'sistema', label: 'Sistema', icon: Icons.Chart },
] as const;

const EXTRA_ITEMS = [
  { view: 'catalog', label: 'Ejercicios', icon: Dumbbell },
  { view: 'dopamina', label: 'Dopamina', icon: Sparkles },
  { view: 'logros', label: 'Logros', icon: Medal },
  { view: 'leaderboard', label: 'Ranking', icon: Trophy },
  { view: 'progress', label: 'Progreso', icon: ChartIcon },
  { view: 'profile', label: 'Perfil', icon: User },
];

export function NavBar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const checkins = useStore((s) => s.checkins);
  const [showExtra, setShowExtra] = useState(false);

  const handleNav = (v: string) => {
    setShowExtra(false);
    if (v === 'train' && !checkins[new Date().toISOString().slice(0, 10)]) {
      return;
    }
    setView(v);
  };

  return (
    <nav aria-label="Navegación principal" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] z-50 bg-[rgba(13,17,27,0.88)] backdrop-blur-xl border-t border-white/[.07]">
      {/* Extra menu popup */}
      <AnimatePresence>
        {showExtra && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-4 right-4 rounded-2xl border border-white/[.10] bg-[rgba(13,17,27,0.96)] backdrop-blur-xl p-2 shadow-2xl"
          >
            {EXTRA_ITEMS.map(({ view: v, label, icon: Icon }) => (
              <button
                key={v}
                onClick={() => handleNav(v)}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-colors',
                  view === v ? 'text-[#ffb454] bg-[rgba(255,180,84,0.08)]' : 'text-[#94a0b8] hover:bg-white/[.06]'
                )}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-1.5">
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

        {/* More button */}
        <button
          onClick={() => setShowExtra(!showExtra)}
          className={cn(
            'flex-1 flex flex-col items-center gap-0.5 py-2 border-none bg-transparent text-[11px] font-semibold cursor-pointer rounded-xl transition-colors',
            showExtra ? 'text-[#ffb454]' : 'text-[#94a0b8]'
          )}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
          </svg>
          <span>Más</span>
        </button>
      </div>
    </nav>
  );
}
