'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { useToast } from '@/components/ui/toast';
import { Icons } from '@/components/ui/icons';
import { cn } from '@/lib/utils/helpers';
import { Dumbbell, Sparkles, User, ChartBar as ChartIcon, Medal, Trophy, BarChart3, Users } from 'lucide-react';

// Primarios: Inicio + Sistema siempre visibles. Entrenar/Coach son el core loop ND.
// Quest (gamificado) se mueve a "Más" -> menos presión social / RSD (neurodivergente).
const NAV_ITEMS = [
  { view: 'home', label: 'Inicio', icon: Icons.Home },
  { view: 'train', label: 'Entrenar', icon: Icons.Dumbbell },
  { view: 'coach', label: 'Coach', icon: Icons.Chat },
  { view: 'sistema', label: 'Sistema', icon: Icons.Chart },
] as const;

const EXTRA_ITEMS = [
  { view: 'quest', label: 'Quest', icon: Icons.Spark },
  { view: 'catalog', label: 'Ejercicios', icon: Dumbbell },
  { view: 'dopamina', label: 'Dopamina', icon: Sparkles },
   { view: 'logros', label: 'Logros', icon: Medal },
  { view: 'progress', label: 'Progreso', icon: ChartIcon },
  { view: 'analytics', label: 'Patrones', icon: BarChart3 },
  { view: 'comunidad', label: 'Comunidad', icon: Users },
  { view: 'leaderboard', label: 'Ranking', icon: Trophy },
  { view: 'profile', label: 'Perfil', icon: User },
];

export function NavBar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const checkins = useStore((s) => s.checkins);
  const t = useT();
  const toast = useToast();
  const [showExtra, setShowExtra] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const canTrain = !!checkins[today];

  const handleNav = (v: string) => {
    setShowExtra(false);
    if (v === 'train' && !canTrain) {
      // Neurodivergent-friendly: no silent failure.
      // Explain why and guide to the check-in instead of doing nothing.
      toast.info(t('Haz el check-in para entrenar.'));
      if (view !== 'home') setView('home');
      return;
    }
    setView(v);
  };

  return (
    <nav aria-label={t('Navegación principal')} className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] z-50 bg-[var(--bg2)] backdrop-blur-xl border-t border-[var(--line)]">
      {/* Extra menu popup */}
      <AnimatePresence>
        {showExtra && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-4 right-4 rounded-2xl border border-[var(--line)] bg-[var(--bg2)] backdrop-blur-xl p-2 shadow-2xl"
          >
            {EXTRA_ITEMS.map(({ view: v, label, icon: Icon }) => (
              <button
                key={v}
                onClick={() => handleNav(v)}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-colors',
                  view === v ? 'text-[var(--accent)] bg-[rgba(255,180,84,0.08)]' : 'text-[var(--muted)] hover:bg-[var(--card2)]'
                )}
              >
                <Icon size={18} />
                <span>{t(label)}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-1.5">
        {NAV_ITEMS.map(({ view: v, label, icon: Icon }) => {
          const disabled = v === 'train' && !canTrain;
          return (
            <button
              key={v}
              onClick={() => handleNav(v)}
              aria-disabled={disabled || undefined}
className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2 border-none bg-transparent text-[var(--muted)] text-[11px] font-semibold cursor-pointer rounded-xl transition-colors',
                  view === v && 'text-[var(--accent)] drop-shadow-[0_0_8px_rgba(255,180,84,0.5)]',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
              <Icon />
              <span>{t(label)}</span>
            </button>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setShowExtra(!showExtra)}
          className={cn(
            'flex-1 flex flex-col items-center gap-0.5 py-2 border-none bg-transparent text-[11px] font-semibold cursor-pointer rounded-xl transition-colors',
            showExtra ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
          )}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
          </svg>
          <span>{t('Más')}</span>
        </button>
      </div>
    </nav>
  );
}
