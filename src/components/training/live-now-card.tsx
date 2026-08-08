/**
 * 🟢 LiveNowCard — "Estoy entrenando ahora" / card "Registro rápido"
 *
 * Principio ND aplicado:
 * - Presente, no pasado. Un toque arranca el timer.
 * - Si el usuario ya entrenó, puede "Terminar y guardar".
 * - El timer persiste en el store para sobrevivir refresh.
 * - Link secundario: "Registrar algo que ya hice" → ruta a quick-log.
 *
 * `variant="card"`: caja compacta para el grid de 3 acciones del Home
 * (lápiz + "Registro rápido"). Al tocar se transforma en el timer en vivo.
 * `variant="banner"`: banner a ancho completo (comportamiento anterior).
 */
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { useToast } from '@/components/ui/toast';
import { PenLine } from 'lucide-react';

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function LiveTimer({ since, className = '' }: { since: number; className?: string }) {
  const [elapsed, setElapsed] = useState(Date.now() - since);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - since);
    }, 1000);
    return () => clearInterval(interval);
  }, [since]);

  return <span className={`font-mono font-bold text-[#34d399] tabular-nums ${className}`}>{formatElapsed(elapsed)}</span>;
}

export function LiveNowCard({ variant = 'banner' }: { variant?: 'banner' | 'card' }) {
  const t = useT();
  const toast = useToast();
  const startedAt = useStore((s) => s.liveNowStartedAt);
  const startLive = useStore((s) => s.startLive);
  const finishLive = useStore((s) => s.finishLive);
  const setView = useStore((s) => s.setView);
  const addWorkout = useStore((s) => s.addWorkout);

  const handleFinish = () => {
    const elapsedMs = Date.now() - (startedAt ?? Date.now());
    const minutes = Math.ceil(elapsedMs / 60000);

    addWorkout({
      id: `live_${Date.now()}`,
      user_id: '',
      date: new Date().toISOString(),
      duration: minutes,
      focus: 'full',
      intensity: minutes >= 30 ? 'standard' : 'light',
      score: 75,
      completed_rate: 1,
      exercises: [],
      actual_minutes: minutes,
      rpe: 'justo',
      created_at: new Date().toISOString(),
    });

    finishLive();
    toast.success(t('Cada minuto cuenta.'));
  };

  if (startedAt) {
    const active = (
      <>
        <p className="text-xs font-semibold flex items-center gap-1.5">
          {t('Te estás moviendo')}{' '}
          <span role="img" aria-label="corazón">
            💚
          </span>
        </p>
        <div className="flex items-center justify-between">
          <LiveTimer since={startedAt} className={variant === 'card' ? 'text-lg' : 'text-2xl'} />
          <button
            onClick={() => {
              finishLive();
              toast.info(t('Cancelar'));
            }}
            className="text-[10px] underline text-[var(--muted)] hover:text-[var(--text)]"
          >
            {t('Cancelar')}
          </button>
        </div>
        <button
          onClick={handleFinish}
          className="w-full py-2 rounded-xl bg-gradient-to-r from-[#34d399] to-[#10b981] text-[#0a0d14] font-bold text-sm transition-all hover:brightness-110"
        >
          {t('Terminar y guardar')}
        </button>
      </>
    );

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className={
          variant === 'card'
            ? 'rounded-xl border border-[#34d399]/30 bg-[rgba(52,211,153,0.06)] p-3 flex flex-col gap-2 justify-between h-full'
            : 'rounded-xl border border-[#34d399]/30 bg-[rgba(52,211,153,0.06)] p-4'
        }
      >
        {active}
      </motion.div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="flex flex-col gap-1 h-full">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={startLive}
          className="flex-1 rounded-xl border border-white/[.07] bg-[#151b2a] hover:border-[#34d399]/40 p-3 flex flex-col gap-2 text-left min-h-[84px] transition-all focus-visible:ring-2 focus-visible:ring-[#34d399] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d14]"
        >
          <PenLine size={18} className="text-[#34d399]" />
          <span className="block text-xs font-bold">{t('Registro rápido')}</span>
          <span className="block text-[10px] text-[var(--muted)] leading-tight">{t('Registra lo que estás haciendo')}</span>
        </motion.button>
        <button
          onClick={() => setView('quick-log')}
          className="w-full text-center text-[9px] text-[var(--muted)] hover:text-[var(--text)] underline underline-offset-1"
        >
          {t('Registrar algo que ya hice')}
        </button>
      </div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
    >
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={startLive}
        className="w-full py-4 rounded-2xl border border-white/[.07] bg-gradient-to-b from-[#0a0d14] to-[#151b2a] text-left px-4 flex flex-col gap-1 transition-all hover:border-[#34d399]/30 focus-visible:ring-2 focus-visible:ring-[#34d399] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d14]"
      >
        <span className="text-base font-bold flex items-center gap-2">
          <span>▶</span>{t('Estoy entrenando ahora')}
        </span>
        <span className="text-xs text-[var(--muted)]">{t('Un toque y cuenta el tiempo por ti')}</span>
      </motion.button>

      <button
        onClick={() => setView('quick-log')}
        className="mt-2 w-full text-center text-xs text-[var(--muted)] hover:text-[var(--text)] underline underline-offset-1"
      >
        {t('Registrar algo que ya hice')}
      </button>
    </motion.div>
  );
}
