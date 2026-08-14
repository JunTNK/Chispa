'use client';

/**
 * Jardín de chispas (spec §7).
 *
 * La brasa/planta crece con el movimiento real. Los días vacíos NO la matan:
 * las pausas largas solo la atenúan. Sin rachas, sin castigos, sin
 * comparaciones: el jardín es tuyo y solo se compara contra tu yo pasado.
 *
 * Métricas reales: días con algún movimiento, minutos reales, veces que
 * volviste tras una pausa y rutinas de 2 min completadas.
 */
import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { CalendarCheck, Timer, Undo2, Sparkles } from 'lucide-react';

const DAY_MS = 86400000;

/** Etapas del jardín: de brasa a árbol. Los nombres son emocionales, no rangos. */
type GardenStage = 'brasa' | 'brote' | 'planta' | 'arbusto' | 'arbol';

interface GardenStats {
  stage: GardenStage;
  /** 0–1: qué viva se ve la brasa hoy (las pausas la atenúan, no la matan). */
  glow: number;
  daysWithMovement30: number;
  totalMinutes90: number;
  returnsAfterPause: number;
  twoMinRoutines: number;
  daysSinceLast: number;
  totalMovementDays90: number;
}

export function computeGardenStats(workouts: { date: string; actual_minutes: number; completed_rate: number }[]): GardenStats {
  const now = Date.now();
  const days = (iso: string) => Math.floor((now - new Date(iso).getTime()) / DAY_MS);

  // Ventana de 90 días: el jardín vive de movimiento reciente.
  const recent = workouts.filter((w) => days(w.date) <= 90);
  const movementDays90 = new Set(recent.map((w) => w.date.slice(0, 10))).size;

  const daysWithMovement30 = new Set(
    recent.filter((w) => days(w.date) <= 30).map((w) => w.date.slice(0, 10))
  ).size;

  const totalMinutes90 = recent.reduce((a, w) => a + (w.actual_minutes || 0), 0);

  // Volver tras una pausa de 7+ días = victoria de regreso (se cuenta una por día).
  // Se mide el hueco REAL entre sesiones consecutivas, no la antigüedad de hoy.
  const sorted = [...recent].sort((a, b) => (a.date < b.date ? -1 : 1));
  let returnsAfterPause = 0;
  let lastDate: string | null = null;
  for (const w of sorted) {
    const iso = w.date.slice(0, 10);
    if (lastDate !== null && iso !== lastDate) {
      const gap = Math.round((new Date(w.date).getTime() - new Date(lastDate).getTime()) / DAY_MS);
      if (gap >= 7) returnsAfterPause += 1;
    }
    lastDate = iso;
  }

  const twoMinRoutines = workouts.filter((w) => (w.actual_minutes || 0) <= 2 && w.completed_rate >= 0.5).length;

  const lastWorkout = recent.reduce<string | null>((max, w) => (max === null || w.date > max ? w.date : max), null);
  const daysSinceLast = lastWorkout === null ? Infinity : days(lastWorkout);

  // Crecimiento: cada día con movimiento y cada minuto suman; satura para que
  // el jardín nunca se "termine" (cuidado, no competencia).
  const growth = Math.min(100, daysWithMovement30 * 7 + totalMinutes90 / 6);
  const stage: GardenStage =
    growth <= 0 ? 'brasa' : growth < 20 ? 'brote' : growth < 45 ? 'planta' : growth < 75 ? 'arbusto' : 'arbol';

  // Las pausas atenúan el brillo, nunca matan la planta. Sin historial, la
  // brasa está lista para encender (brillo pleno, invitación, no culpa).
  const glow =
    daysSinceLast === Infinity
      ? 1
      : daysSinceLast >= 30
        ? 0.35
        : daysSinceLast >= 14
          ? 0.6
          : daysSinceLast >= 7
            ? 0.8
            : 1;

  return {
    stage,
    glow,
    daysWithMovement30,
    totalMinutes90,
    returnsAfterPause,
    twoMinRoutines,
    daysSinceLast,
    totalMovementDays90: movementDays90,
  };
}

const STAGE_VISUAL: Record<GardenStage, { emoji: string; size: string; labelKey: string }> = {
  brasa: { emoji: '🔥', size: 'text-7xl', labelKey: 'Tu brasa está lista' },
  brote: { emoji: '🌱', size: 'text-7xl', labelKey: 'Tu brote asoma' },
  planta: { emoji: '🌿', size: 'text-7xl', labelKey: 'Tu planta respira' },
  arbusto: { emoji: '🌳', size: 'text-8xl', labelKey: 'Tu jardín florece' },
  arbol: { emoji: '🌲', size: 'text-8xl', labelKey: 'Tu árbol da sombra' },
};

export function JardinScreen() {
  const t = useT();
  const workouts = useStore((s) => s.workouts);
  const quickLogs = useStore((s) => s.quickLogs);

  const stats = React.useMemo(() => computeGardenStats(workouts), [workouts]);
  const visual = STAGE_VISUAL[stats.stage];

  const isEmpty = workouts.length === 0 && quickLogs.length === 0;
  const glowStyle = {
    opacity: stats.glow,
    filter: `drop-shadow(0 0 ${12 + stats.glow * 26}px rgba(255,138,76,${0.35 + stats.glow * 0.5}))`,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 pb-6 space-y-3.5"
    >
      <div className="pt-2">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Sparkles size={20} className="text-[#ffb454]" />
          {t('Jardín de chispas')}
        </h1>
        <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
          {t('Aquí no hay rachas que se rompan. Los días vacíos no matan tu jardín: solo lo atenúan, y vuelve contigo.')}
        </p>
      </div>

      {/* La planta */}
      <Card className="overflow-hidden text-center">
        <div className="relative flex flex-col items-center py-10">
          {/* Suelo */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-14 rounded-t-full bg-[rgba(255,138,76,0.06)] border-t border-[rgba(255,138,76,0.15)]" aria-hidden="true" />
          <motion.div
            key={stats.stage}
            initial={{ scale: 0.6, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            className={`relative ${visual.size}`}
          >
            <span style={glowStyle}>{visual.emoji}</span>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-sm font-bold mt-3"
          >
            {t(visual.labelKey)}
          </motion.p>
          <p className="text-xs text-[var(--muted)] mt-1 max-w-[34ch] leading-relaxed">
            {isEmpty
              ? t('Hoy puedes encenderla: 2 minutos de movimiento bastan.')
              : stats.daysSinceLast >= 7
                ? t('Vuelves tras una pausa. Nada se rompió: tu brasa siguió aquí esperando.')
                : t('{n} días con movimiento en el último mes', { n: stats.daysWithMovement30 })}
          </p>
        </div>
      </Card>

      {/* Métricas reales — contra tu yo pasado, nunca contra otros */}
      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard icon={CalendarCheck} value={String(stats.daysWithMovement30)} label={t('días con movimiento · 30d')} />
        <MetricCard icon={Timer} value={String(stats.totalMinutes90)} label={t('minutos reales · 90d')} />
        <MetricCard icon={Undo2} value={String(stats.returnsAfterPause)} label={t('veces que volviste tras una pausa')} />
        <MetricCard icon={Sparkles} value={String(stats.twoMinRoutines)} label={t('rutinas de 2 min completadas')} />
      </div>

      <p className="text-[11px] text-[var(--muted-soft)] text-center leading-relaxed">
        {t('Gamificación como cuidado, no como competencia. Solo tú y tu jardín.')}
      </p>
    </motion.div>
  );
}

function MetricCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={14} className="text-[#ffb454]" />
      </div>
      <span className="text-2xl font-black tabular-nums block">{value}</span>
      <span className="text-[11px] text-[var(--muted)] leading-tight">{label}</span>
    </Card>
  );
}
