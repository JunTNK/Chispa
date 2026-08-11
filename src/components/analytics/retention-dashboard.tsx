'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { getRetentionMetrics, getRetentionInfo } from '@/lib/analytics';
import { Calendar, TrendingUp, BarChart3, CheckCircle } from 'lucide-react';

export function RetentionDashboard() {
  const t = useT();
  const { firstDay, currentStreak } = getRetentionInfo();
  const { totalActiveDays, d1Retained, d7Retained, d30Retained } = getRetentionMetrics();

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
            <span className="text-xs font-mono uppercase text-[var(--muted)]">D1</span>
          </div>
          <p className="text-2xl font-bold">{d1Retained ? '✓' : '—'}</p>
          <p className="text-[10px] text-[var(--muted)]">{t('Regresaste al día 1')}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-[#fbbf24]" />
            <span className="text-xs font-mono uppercase text-[var(--muted)]">D7</span>
          </div>
          <p className="text-2xl font-bold">{d7Retained ? '✓' : '—'}</p>
          <p className="text-[10px] text-[var(--muted)]">{t('Regresaste a la semana')}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-[#a78bfa]" />
            <span className="text-xs font-mono uppercase text-[var(--muted)]">D30</span>
          </div>
          <p className="text-2xl font-bold">{d30Retained ? '✓' : '—'}</p>
          <p className="text-[10px] text-[var(--muted)]">{t('Regresaste al mes')}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={16} className="text-[#22d3ee]" />
            <span className="text-xs font-mono uppercase text-[var(--muted)]">DAU</span>
          </div>
          <p className="text-2xl font-bold">{currentStreak}</p>
          <p className="text-[10px] text-[var(--muted)]">{t('racha actual')}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-[#4ade80]" />
          <span className="text-xs font-mono uppercase text-[var(--muted)]">{t('Progreso de retención')}</span>
        </div>
        <p className="text-sm text-[var(--muted)] mb-2">
          {totalActiveDays === 0
            ? t('Primer día registrado')
            : t('{n} días activos desde {date}', { n: totalActiveDays, date: firstDay ? new Date(firstDay).toLocaleDateString() : '' })}
        </p>
        <div className="flex gap-2 text-xs">
          <span className={d1Retained ? 'text-[#34d399]' : 'text-[var(--muted)]'}>
            {d1Retained ? t('✓ D1') : t('— D1')}
          </span>
          <span className={d7Retained ? 'text-[#fbbf24]' : 'text-[var(--muted)]'}>
            {d7Retained ? t('✓ D7') : t('— D7')}
          </span>
          <span className={d30Retained ? 'text-[#a78bfa]' : 'text-[var(--muted)]'}>
            {d30Retained ? t('✓ D30') : t('— D30')}
          </span>
        </div>
      </Card>

      {firstDay && (
        <Card className="p-4 border border-white/[.07]">
          <div className="flex items-start gap-2">
            <CheckCircle size={16} className="text-[#34d399] mt-0.5" />
            <p className="text-[11px] text-[var(--muted)]">
              {t('Tu primer día registrado es {date}. Cada sesión te acerca más a tus metas.', {
                date: new Date(firstDay).toLocaleDateString(),
              })}
            </p>
          </div>
        </Card>
      )}
    </motion.div>
  );
}
