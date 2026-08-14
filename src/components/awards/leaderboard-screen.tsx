'use client';

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { TrendingUp, ArrowUp, ArrowDown, Minus, Sprout } from 'lucide-react';

/**
 * Leaderboard PERSONAL (rúbrica §7): la única comparación válida es contra tu
 * yo pasado (esta semana vs la anterior, este mes vs el anterior).
 * Sin ranking social, sin nombres de otros jugadores, sin refresh en vivo.
 * 100% local: no toca Supabase ni muestra datos de nadie más.
 */
function countSessions(
  workouts: { date: string; completed_rate: number }[],
  fromDaysAgo: number,
  toDaysAgo: number
): number {
  const now = Date.now();
  return workouts.filter((w) => {
    if (w.completed_rate < 0.5) return false;
    const t = new Date(w.date).getTime();
    return t >= now - toDaysAgo * 86400000 && t < now - fromDaysAgo * 86400000;
  }).length;
}

type Accent = {
  iconBg: string;
  icon: string;
  bar: string;
  current: string;
};

const WEEK_ACCENT: Accent = {
  iconBg: 'bg-[rgba(52,211,153,0.12)]',
  icon: 'text-[#34d399]',
  bar: 'bg-gradient-to-r from-[#34d399] to-[#10b981]',
  current: 'text-[#34d399]',
};

const MONTH_ACCENT: Accent = {
  iconBg: 'bg-[rgba(251,191,36,0.12)]',
  icon: 'text-[#fbbf24]',
  bar: 'bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]',
  current: 'text-[#fbbf24]',
};

function ComparisonCard({
  title,
  currentLabel,
  previousLabel,
  current,
  previous,
  accent,
}: {
  title: string;
  currentLabel: string;
  previousLabel: string;
  current: number;
  previous: number;
  accent: Accent;
}) {
  const t = useT();
  const delta = current - previous;
  const up = delta > 0;
  const down = delta < 0;
  // Barra de ratio: qué tan lejos está el período actual del anterior.
  const ratio = previous > 0 ? Math.min(100, Math.round((current / previous) * 100)) : current > 0 ? 100 : 0;

  return (
    <Card className="p-4 space-y-3">
      {/* Header + tendencia */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accent.iconBg}`}>
            <TrendingUp size={15} className={accent.icon} />
          </span>
          <span className="text-sm font-bold leading-tight">{title}</span>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${
            up
              ? 'bg-[rgba(52,211,153,0.12)] text-[#34d399]'
              : down
              ? 'bg-white/[.06] text-[var(--muted)]'
              : 'bg-white/[.06] text-[var(--muted)]'
          }`}
        >
          {up ? <ArrowUp size={12} /> : down ? <ArrowDown size={12} /> : <Minus size={12} />}
          {up ? `+${delta}` : down ? `${delta}` : '0'}
        </span>
      </div>

      {/* Valores: actual vs período anterior */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className={`text-4xl font-black tabular-nums leading-none ${up ? accent.current : ''}`}>
            {current}
          </div>
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mt-1">
            {t('sesiones')}
          </div>
          <div className="text-[10px] font-semibold text-[var(--muted)]">{currentLabel}</div>
        </div>
        <div className="text-right pb-0.5">
          <div className="text-xl font-semibold tabular-nums text-[var(--muted)] leading-none">{previous}</div>
          <div className="text-[10px] text-[var(--muted)] mt-1">{previousLabel}</div>
        </div>
      </div>

      {/* Ratio visual */}
      <div className="h-1.5 rounded-full bg-white/[.08] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${ratio}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full ${accent.bar}`}
        />
      </div>

      {/* Lectura */}
      <p className="text-[11px] text-[var(--muted)] leading-relaxed">
        {up
          ? t('+{delta} vs {period}', { delta, period: previousLabel })
          : down
          ? t('{delta} vs {period}', { delta, period: previousLabel })
          : t('Igual que {period}', { period: previousLabel })}
      </p>
    </Card>
  );
}

export function LeaderboardScreen() {
  const t = useT();
  const workouts = useStore((s) => s.workouts);

  const counts = useMemo(() => {
    const done = workouts.filter((w) => w.completed_rate >= 0.5);
    const cutoff = Date.now() - 30 * 86400000;
    const movementDays30 = new Set(
      workouts
        .filter((w) => w.completed_rate >= 0.5 && new Date(w.date).getTime() >= cutoff)
        .map((w) => w.date)
    ).size;
    return {
      thisWeek: countSessions(done, 0, 7),
      lastWeek: countSessions(done, 7, 14),
      thisMonth: countSessions(done, 0, 30),
      lastMonth: countSessions(done, 30, 60),
      movementDays30,
      hasHistory: done.length > 0,
    };
  }, [workouts]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="px-4 pb-6 space-y-3.5"
    >
      {/* Title */}
      <div className="pt-3 pb-1">
        <h1 className="text-2xl font-black tracking-tight">{t('Contra tu yo pasado')}</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5 leading-relaxed">
          {t('La competencia es opcional, y solo contra ti mismo.')}
        </p>
        {/* Resumen de la ventana rodante */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[rgba(52,211,153,0.10)] border border-[rgba(52,211,153,0.25)]">
          <Sprout size={13} className="text-[#34d399]" />
          <span className="text-[11px] font-bold text-[#34d399]">
            {counts.movementDays30} {t('días con movimiento (30 días rodantes)')}
          </span>
        </div>
      </div>

      <ComparisonCard
        title={t('Esta semana vs la anterior')}
        currentLabel={t('esta semana')}
        previousLabel={t('la semana pasada')}
        current={counts.thisWeek}
        previous={counts.lastWeek}
        accent={WEEK_ACCENT}
      />

      <ComparisonCard
        title={t('Este mes vs el anterior')}
        currentLabel={t('este mes')}
        previousLabel={t('el mes pasado')}
        current={counts.thisMonth}
        previous={counts.lastMonth}
        accent={MONTH_ACCENT}
      />

      {!counts.hasHistory && (
        <p className="text-xs text-center text-[var(--muted)] leading-relaxed px-2">
          {t('Tu historial empieza hoy. Muévete cuando puedas y volvé a mirar.')}
        </p>
      )}

      <p className="text-[10px] text-center text-[var(--muted)] pt-2 leading-relaxed">
        {t('Sin rachas. Sin culpa. Solo datos.')}
      </p>
    </motion.div>
  );
}
