/**
 * 📓 Journal Screen — historial de sesiones anteriores.
 *
 * Patrón ND aplicado:
 * - No hay streak, no castigo. Solo se muestra "me moví".
 * - Celebra volumen semanal, no racha diaria.
 * - Empty state honesto: "sin presión".
 */
'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/app-layout';
import { Calendar, Dumbbell } from 'lucide-react';
import {
  groupByWeek,
  formatWorkoutDate,
  intensityChipClass,
  rpeEmoji,
  weekSessionCount,
} from '@/lib/utils/journal-helpers';

export function JournalScreen() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const workouts = useStore((s) => s.workouts);

  const weeks = useMemo(() => groupByWeek(workouts, lang), [workouts, lang]);

  if (workouts.length === 0) {
    return (
      <AppLayout>
        <div className="px-4 py-6 pb-20 space-y-6">
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Calendar size={24} className="text-[#34d399]" />
            {t('Bitácora')}
          </h1>
          <Card className="p-8 text-center">
            <Dumbbell size={48} className="mx-auto mb-4 text-[var(--muted)]" />
            <p className="text-sm text-[var(--muted)]">
              {t(
                'Aún no hay sesiones aquí. Cuando te muevas, aparecerán — sin presión.',
              )}
            </p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 pb-6 space-y-6">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Calendar size={24} className="text-[#34d399]" />
          {t('Bitácora')}
        </h1>

        <div className="space-y-6">
          {weeks.map((week) => (
            <motion.div
              key={week.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase text-[var(--muted)] tracking-wider">
                  {week.label}
                </span>
                <span className="text-[10px] text-[var(--muted)]">
                  {weekSessionCount(week.sessions)} sesiones · {week.duration} min
                </span>
              </div>

              <div className="space-y-2">
                {week.sessions.map((w) => (
                  <motion.div
                    key={w.id}
                    whileHover={{ scale: 1.01 }}
                    className="rounded-xl border border-white/[.07] bg-[#151b2a] p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">
                        {formatWorkoutDate(w.date, lang)}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-mono ${intensityChipClass(w.intensity)}`}
                      >
                        {t(w.intensity)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--muted)]">
                        {t('{a} min · {b} ejercicios', {
                          a: w.actual_minutes ?? w.duration,
                          b: w.exercises.length,
                        })}
                      </span>
                      <span>{rpeEmoji(w.rpe)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
