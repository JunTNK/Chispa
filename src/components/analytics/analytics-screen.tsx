'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { getRetentionInfo } from '@/lib/analytics';
import { computeTotalXp } from '@/lib/awards/achievements';
import {
  BarChart3, Calendar, TrendingUp, Sparkles, Flame,
} from 'lucide-react';

export function AnalyticsScreen() {
  const t = useT();
  const workouts = useStore((s) => s.workouts);
  const subscription = useStore((s) => s.subscription);

  // Only accessible if Pro
  if (!subscription || (subscription.tier !== 'pro' && subscription.tier !== 'lifetime')) {
    return (
      <div className="px-4 pb-6 space-y-4">
        <Card className="p-6 text-center">
          <BarChart3 size={48} className="mx-auto mb-3 text-[var(--muted)]" />
          <h2 className="text-xl font-bold mb-2">{t('Analíticas avanzadas')}</h2>
          <p className="text-sm text-[var(--muted)] mb-4">
            {t('Estadísticas detalladas, patrones de energía y score de dopamina. Pro exclusivo.')}
          </p>
        </Card>
      </div>
    );
  }

  const { firstDay, currentStreak } = getRetentionInfo();
  const totalXp = computeTotalXp(workouts.filter((w) => w.completed_rate >= 0.5));
  const completedWorkouts = workouts.filter((w) => w.completed_rate >= 0.5);
  const movementDays = new Set(completedWorkouts.map((w) => w.date)).size;

  // Hourly distribution (dopamine pattern)
  const hourPattern: Record<number, number> = {};
  completedWorkouts.forEach((w) => {
    const h = new Date(w.date).getHours();
    hourPattern[h] = (hourPattern[h] || 0) + 1;
  });
  const peakHour = Object.entries(hourPattern).reduce(
    (max, [h, c]) => (c > max[1] ? [parseInt(h), c] : max),
    [0, 0]
  )[0];

  // Intensity spread
  const intensitySpread: Record<string, number> = {};
  completedWorkouts.forEach((w) => {
    intensitySpread[w.intensity] = (intensitySpread[w.intensity] || 0) + 1;
  });

  return (
    <motion.div
      className="px-4 pb-6 space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h1 className="text-2xl font-black mb-4">{t('Tus patrones')}</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-[#34d399]" />
            <span className="text-xs font-mono uppercase text-[var(--muted)]">D7</span>
          </div>
          <p className="text-2xl font-bold">{movementDays >= 7 ? '✓' : `${movementDays}/7`}</p>
          <p className="text-[10px] text-[var(--muted)]">{t('días de movimiento')}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={16} className="text-[#fbbf24]" />
            <span className="text-xs font-mono uppercase text-[var(--muted)]">DAU</span>
          </div>
          <p className="text-2xl font-bold">{currentStreak}</p>
          <p className="text-[10px] text-[var(--muted)]">{t('racha actual')}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-[#4ade80]" />
          <span className="text-xs font-mono uppercase text-[var(--muted)]">{t('Progreso de XP')}</span>
        </div>
        <p className="text-3xl font-black text-[#34d399] mb-1">{totalXp} XP</p>
        <p className="text-[10px] text-[var(--muted)]">
          {t(firstDay ? `Usuario desde ${new Date(firstDay).toLocaleDateString()}` : 'Primer día registrado')}
        </p>
      </Card>

      {peakHour > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-[#a78bfa]" />
            <span className="text-xs font-mono uppercase text-[var(--muted)]">{t('Patrón de dopamina')}</span>
          </div>
          <p className="text-sm">
            {t('Tu hora pico de movimiento')}
            <span className="font-bold"> {peakHour}:00</span>
          </p>
          <p className="text-[11px] text-[var(--muted)] mt-1">
            {t('Programa sesiones en esta ventana para máxima adherencia')}
          </p>
        </Card>
      )}
    </motion.div>
  );
}
