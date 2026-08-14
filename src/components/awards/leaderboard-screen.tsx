'use client';

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { TrendingUp, Minus } from 'lucide-react';

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

function ComparisonCard({
  title,
  current,
  previous,
}: {
  title: string;
  current: number;
  previous: number;
}) {
  const t = useT();
  const delta = current - previous;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp size={15} className="text-[#34d399]" />
        <span className="text-sm font-bold">{title}</span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-black tabular-nums">{current}</div>
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
            {t('sesiones')}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums text-[var(--muted)]">{previous}</div>
          <div className="text-[10px] text-[var(--muted)]">{t('período anterior')}</div>
        </div>
      </div>

      <div className="pt-2 border-t border-white/[.06]">
        {delta > 0 ? (
          <span className="text-xs font-bold text-[#34d399]">
            +{delta} {t('vs el período anterior')}
          </span>
        ) : delta < 0 ? (
          <span className="text-xs font-semibold text-[var(--muted)]">
            {delta} {t('vs el período anterior')}
          </span>
        ) : (
          <span className="text-xs font-semibold text-[var(--muted)] inline-flex items-center gap-1">
            <Minus size={12} /> {t('Igual que el período anterior')}
          </span>
        )}
      </div>
    </Card>
  );
}

export function LeaderboardScreen() {
  const t = useT();
  const workouts = useStore((s) => s.workouts);

  const counts = useMemo(() => {
    const done = workouts.filter((w) => w.completed_rate >= 0.5);
    return {
      thisWeek: countSessions(done, 0, 7),
      lastWeek: countSessions(done, 7, 14),
      thisMonth: countSessions(done, 0, 30),
      lastMonth: countSessions(done, 30, 60),
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
      </div>

      <ComparisonCard
        title={t('Esta semana vs la anterior')}
        current={counts.thisWeek}
        previous={counts.lastWeek}
      />

      <ComparisonCard
        title={t('Este mes vs el anterior')}
        current={counts.thisMonth}
        previous={counts.lastMonth}
      />

      <p className="text-[10px] text-center text-[var(--muted)] pt-2 leading-relaxed">
        {t('Sin rachas. Sin culpa. Solo datos.')}
      </p>
    </motion.div>
  );
}
