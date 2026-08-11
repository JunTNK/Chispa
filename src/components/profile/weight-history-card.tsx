'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT, useLocale } from '@/lib/i18n/use-t';
import { supabaseSync } from '@/lib/sync/supabase-sync';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';
import { formatWeight, fmtMeasure, kgToLbs } from '@/lib/utils/units';
import type { WeightEntry } from '@/types';

const NO_ENTRIES: WeightEntry[] = [];

/** Gráfico de línea SVG (últimas N entradas). */
function Sparkline({ entries }: { entries: WeightEntry[] }) {
  const t = useT();
  const W = 320;
  const H = 72;
  const PAD = 6;
  const data = entries.slice(-14);

  if (data.length < 2) return null;

  const values = data.map((e) => e.weight_kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const pts = data.map((e, i) => {
    const x = PAD + (i * (W - 2 * PAD)) / (data.length - 1);
    const y = H - PAD - ((e.weight_kg - min) / span) * (H - 2 * PAD);
    return { x, y };
  });

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" role="img" aria-label={t('Evolución de peso')}>
      <defs>
        <linearGradient id="weight-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4CC9F0" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4CC9F0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="weight-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00D4AA" />
          <stop offset="100%" stopColor="#4CC9F0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#weight-area)" />
      <motion.path
        d={line}
        fill="none"
        stroke="url(#weight-line)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* Punto de la última entrada */}
      <circle
        cx={pts[pts.length - 1].x}
        cy={pts[pts.length - 1].y}
        r="3.5"
        fill="#4CC9F0"
        stroke="#06221b"
        strokeWidth="1.5"
      />
      <circle cx={pts[0].x} cy={pts[0].y} r="2.5" fill="rgba(76,201,240,0.4)" />
    </svg>
  );
}

export function WeightHistoryCard() {
  const t = useT();
  const locale = useLocale();
  const history = useStore((s) => s.weightHistory) ?? NO_ENTRIES;
  const units = useStore((s) => s.profile?.units ?? 'imperial');
  const removeWeightEntry = useStore((s) => s.removeWeightEntry);

  const sorted = React.useMemo(
    () => [...history].sort((a, b) => (a.date < b.date ? -1 : 1)),
    [history]
  );

  const handleRemove = (date: string) => {
    removeWeightEntry(date);
    const remaining = useStore.getState().weightHistory;
    // Propaga el borrado al servidor (también cuando se vacía el historial)
    supabaseSync
      .push({ weightHistory: remaining, weightHistoryDeleted: [date] })
      .catch(() => {});
  };

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  // Delta en la unidad de display (canónico en kg → convertir)
  const deltaKg = first && last ? last.weight_kg - first.weight_kg : null;
  const delta = deltaKg === null ? null : units === 'imperial' ? kgToLbs(deltaKg) : deltaKg;
  const unitSuffix = units === 'imperial' ? 'lb' : 'kg';
  const showList = sorted.slice(-5).reverse();

  return (
    <Card>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4CC9F0] to-[#00D4AA] flex items-center justify-center text-[#06221b]">
          <Icons.Chart size={18} />
        </span>
        <div>
          <h2 className="font-bold text-sm">{t('Historial de peso')}</h2>
          <p className="text-[10px] text-[var(--muted)] leading-tight">{t('Tu evolución, día a día.')}</p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-[var(--muted)] leading-relaxed mt-1">
          {t('Registra tu peso en Tu cuerpo para ver tu evolución aquí.')}
        </p>
      ) : (
        <>
          {/* Gráfico */}
          <div className="mt-2 mb-3">
            <Sparkline entries={sorted} />
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-2xl bg-white/[.04] border border-white/[.07] py-2.5 px-2 text-center">
              <div className="text-sm font-black">{formatWeight(first?.weight_kg, units)}</div>
              <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider mt-0.5">{t('Inicio')}</div>
            </div>
            <div className="rounded-2xl bg-white/[.04] border border-white/[.07] py-2.5 px-2 text-center">
              <div className="text-sm font-black text-[#4CC9F0]">{formatWeight(last?.weight_kg, units)}</div>
              <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider mt-0.5">{t('Actual')}</div>
            </div>
            <div className="rounded-2xl bg-white/[.04] border border-white/[.07] py-2.5 px-2 text-center">
              <div className={`text-sm font-black ${delta === null || delta === 0 ? '' : delta < 0 ? 'text-[#34d399]' : 'text-[#ffb454]'}`}>
                {delta === null ? '—' : `${delta < 0 ? '▼' : delta > 0 ? '▲' : ''} ${fmtMeasure(Math.abs(delta))} ${unitSuffix}`}
              </div>
              <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider mt-0.5">{t('Cambio')}</div>
            </div>
          </div>

          {/* Últimas entradas */}
          <div className="space-y-1.5">
            {showList.map((e) => {
              const dateLabel = new Date(`${e.date}T00:00:00`).toLocaleDateString(locale, {
                day: 'numeric',
                month: 'short',
              });
              return (
                <AnimatePresence key={e.date} initial={false}>
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    className="flex items-center justify-between rounded-xl bg-white/[.03] border border-white/[.06] px-3 py-2"
                  >
                    <span className="text-xs text-[var(--muted)] font-mono">{dateLabel}</span>
                    <span className="text-sm font-bold">{formatWeight(e.weight_kg, units)}</span>
                    <button
                      onClick={() => handleRemove(e.date)}
                      aria-label={`${t('Eliminar entrada')} ${dateLabel}`}
                      className="text-[var(--muted)] hover:text-[#f87171] transition-colors p-0.5"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </motion.div>
                </AnimatePresence>
              );
            })}
          </div>
        </>
      )}

      {/* Filosofía: los datos no juzgan */}
      <p className="text-[10px] text-[var(--muted)] italic mt-3 leading-relaxed">
        {t('Sin juicios. Solo tu evolución.')}
      </p>
    </Card>
  );
}
