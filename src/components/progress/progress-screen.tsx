'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { RecRing } from '@/components/ui/ring';
import { calculateConsistency } from '@/lib/agents/decision-engine';
import { cap, daysAgoKey, daysBetween } from '@/lib/utils/helpers';
import { Badge } from '@/components/ui/badge';

/* ─── Animation Variants ─── */

const containerVariants = {
  animate: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
};

const calendarContainer = {
  animate: {
    transition: { staggerChildren: 0.015, delayChildren: 0.25 },
  },
};

const calendarCell = {
  initial: { opacity: 0, scale: 0.7 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 200, damping: 18 } },
};

const barVariants = {
  initial: { height: 0, opacity: 0 },
  animate: (h: number) => ({
    height: h,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const, delay: 0.3 },
  }),
};

const insightVariants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

const eventVariants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

export function ProgressScreen() {
  const workouts = useStore((s) => s.workouts);
  const events = useStore((s) => s.events);
  const profile = useStore((s) => s.profile);
  const twin = useStore((s) => s.twin);

  const today = new Date().toISOString().slice(0, 10);

  const target = profile?.days_per_week === '4-5' ? 4 : 3;
  const cons = React.useMemo(() => {
    const done = workouts.filter((w) => {
      const d = Math.floor((new Date(today).getTime() - new Date(w.date).getTime()) / 86400000);
      return d <= 29 && w.completed_rate >= 0.5;
    }).length;
    return calculateConsistency(done, target);
  }, [workouts, target, today]);

  // Calendar grid
  const start = new Date();
  start.setDate(start.getDate() - 27);
  const pad = (start.getDay() + 6) % 7;
  const trained = new Set(workouts.filter((w) => w.completed_rate >= 0.5).map((w) => w.date));

  // Pre-compute calendar cells with stagger indices
  const cellData = React.useMemo(() => {
    const items: { key: string; day: number; trained: boolean; today: boolean; blank: boolean; idx: number }[] = [];
    let idx = 0;
    for (let i = 0; i < pad; i++) {
      items.push({ key: `blank-${i}`, day: 0, trained: false, today: false, blank: true, idx: idx++ });
    }
    for (let i = 27; i >= 0; i--) {
      const k = daysAgoKey(i);
      const dn = new Date(k).getDate();
      items.push({ key: k, day: dn, trained: trained.has(k), today: i === 0, blank: false, idx: idx++ });
    }
    return items;
  }, [pad, trained]);

  // Week bars
  const wkCounts = React.useMemo(() =>
    [[27, 21], [20, 14], [13, 7], [6, 0]].map(([lo, hi]) =>
      workouts.filter((w) => {
        const d = daysBetween(w.date);
        return d >= lo && d <= hi && w.completed_rate >= 0.5;
      }).length
    ), [workouts]);
  const maxWk = Math.max(...wkCounts, 1);

  // Insights
  const insights = React.useMemo(() => {
    if (!twin) return [];
    const items: string[] = [];
    items.push(`Prefieres sesiones de ~${Math.round(twin.patterns.avg_duration)} min`);
    const hours = Object.entries(twin.patterns.best_hours).sort((a, b) => b[1] - a[1]);
    if (hours.length) {
      items.push(`Tu mejor franja: sobre las ${hours[0][0]}:00`);
    }
    items.push(`Completas el ${Math.round(twin.patterns.completion_rate * 100)}% de tus sesiones`);
    if (twin.patterns.abandon_rate > 0.3) {
      items.push('El motor acorta tus sesiones automáticamente');
    }
    items.push(`Respondes mejor a mensajes tipo: ${STYLE_LABELS[twin.motivation_style]}`);
    return items;
  }, [twin]);

  const recentEvents = events.slice(0, 5);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={containerVariants}
      className="px-4 pb-6 space-y-3.5"
    >
      {/* Consistency Ring Card */}
      <motion.div variants={cardVariants}>
        <Card className="text-center py-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
          >
            <RecRing pct={cons.consistency_pct} size={150} strokeWidth={12} color="#ffb454">
              <span className="text-4xl font-black">{cons.consistency_pct}%</span>
            </RecRing>
          </motion.div>
          <p className="font-bold mt-4">Consistencia · últimos 30 días</p>
          <p className="text-sm text-[#94a0b8]">{cons.sessions_done} de {cons.sessions_target} sesiones objetivo</p>
          <p className="text-xs text-[#ffb454] italic mt-2">Sin rachas. Sin culpa. Solo datos.</p>
        </Card>
      </motion.div>

      {/* Calendar Card */}
      <motion.div variants={cardVariants}>
        <Card>
          <span className="font-bold text-sm mb-3 block">Últimas 4 semanas</span>
          <div className="grid grid-cols-7 gap-1.5 mb-1">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
              <span key={d} className="text-center text-[10px] font-semibold text-[#94a0b8]">{d}</span>
            ))}
          </div>
          <motion.div
            initial="initial"
            animate="animate"
            variants={calendarContainer}
            className="grid grid-cols-7 gap-1.5"
          >
            {cellData.map((c) =>
              c.blank ? (
                <motion.span
                  key={c.key}
                  variants={calendarCell}
                  className="aspect-square rounded-lg"
                />
              ) : (
                <motion.span
                  key={c.key}
                  variants={calendarCell}
                  whileHover={{ scale: 1.15 }}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xs transition-all cursor-default
                    ${c.trained
                      ? 'bg-gradient-to-br from-[#ffb454] to-[#ff7a3d] text-[#241309] font-bold shadow-[0_2px_8px_rgba(255,122,61,0.25)]'
                      : 'bg-white/[.05] text-[#94a0b8] hover:bg-white/[.08]'
                    }
                    ${c.today ? 'ring-2 ring-[#ffb454] ring-offset-1 ring-offset-[#0a0d14]' : ''}
                  `}
                >
                  {c.day}
                </motion.span>
              )
            )}
          </motion.div>
        </Card>
      </motion.div>

      {/* Weekly Bars Card */}
      <motion.div variants={cardVariants}>
        <Card>
          <span className="font-bold text-sm mb-4 block">Sesiones por semana</span>
          <div className="flex items-end gap-3 h-28 pt-3">
            {wkCounts.map((c, i) => {
              const h = Math.max(6, (c / maxWk) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <motion.div
                    custom={h}
                    variants={barVariants}
                    initial="initial"
                    animate="animate"
                    className="w-full bg-gradient-to-t from-[#ff7a3d] to-[#ffb454] rounded-lg relative origin-bottom"
                  >
                    <motion.span
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-[#94a0b8]"
                    >
                      {c}
                    </motion.span>
                  </motion.div>
                  <span className="text-[10px] text-[#94a0b8] text-center">
                    {i === 3 ? 'Esta' : `Hace ${3 - i} sem`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Digital Twin Insights Card */}
      {insights.length > 0 && (
        <motion.div variants={cardVariants}>
          <Card>
            <span className="font-bold text-sm mb-3 block">Lo que sabe tu Digital Twin</span>
            <motion.ul
              initial="initial"
              animate="animate"
              className="space-y-2.5"
            >
              {insights.map((ins, i) => (
                <motion.li
                  key={i}
                  variants={insightVariants}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-2 text-sm leading-relaxed"
                >
                  <motion.span
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.15 + i * 0.08, type: 'spring' as const, stiffness: 300 }}
                    className="text-[#ffb454] mt-0.5 shrink-0"
                  >
                    ✦
                  </motion.span>
                  {ins}
                </motion.li>
              ))}
            </motion.ul>
          </Card>
        </motion.div>
      )}

      {/* Events Card */}
      {recentEvents.length > 0 && (
        <motion.div variants={cardVariants}>
          <Card>
            <span className="font-bold text-sm mb-3 block">Transparencia del motor</span>
            <motion.div
              initial="initial"
              animate="animate"
              className="space-y-2"
            >
              {recentEvents.map((ev, i) => {
                const d = new Date(ev.timestamp);
                const time = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) +
                  ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                let txt = ev.event;
                if (ev.event === 'decision') txt = `Motor: sesión ${ev.decision?.intensity || ''}`;
                if (ev.event === 'workout_completed') txt = `Entrenamiento completado (${Math.round((ev.decision?.rate as number || 0) * 100)}%)`;
                return (
                  <motion.div
                    key={i}
                    variants={eventVariants}
                    transition={{ delay: i * 0.06 }}
                    className="border-b border-white/[.07] last:border-0 pb-2 last:pb-0"
                  >
                    <span className="text-[10px] text-[#94a0b8]">{time}</span>
                    <p className="text-xs mt-0.5">{txt}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

const STYLE_LABELS: Record<string, string> = {
  data: 'Datos y lógica',
  energy: 'Energía',
  direct: 'Directo',
  calm: 'Calma',
};
