/**
 * 📓 Journal helpers — utilities for grouping and formatting workout history.
 * Diseñado bajo el principio ND: muestra datos reales, sin crear presión.
 */
import type { Workout } from '@/types';
import type { Lang } from '@/lib/i18n/use-t';
import { format } from 'date-fns/format';
import { startOfWeek } from 'date-fns/startOfWeek';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import type { Locale } from 'date-fns';
import { INTENSITY_COLORS } from './constants';

const DATE_LOCALES = { es, en: enUS } satisfies Record<string, Locale>;

const RPE_EMOJIS = {
  suave: '😊',
  justo: '👍',
  duro: '😓',
} as const;

export type WeekGroup = {
  key: string;
  label: string;
  sessions: Workout[];
  duration: number;
};

export function intensityChipClass(
  intensity: Workout['intensity'],
): string {
  return INTENSITY_COLORS[intensity] ?? "bg-[var(--muted)]/20 text-[var(--muted)]";
}

export function rpeEmoji(rpe?: Workout['rpe']): string {
  return rpe ? (RPE_EMOJIS[rpe] ?? '✨') : '✨';
}

export function formatWorkoutDate(date: string, locale: Lang = 'es'): string {
  const d = new Date(date);
  const loc = DATE_LOCALES[locale] ?? enUS;
  return format(d, 'eee d MMM', { locale: loc });
}

export function groupByWeek(workouts: Workout[], locale: Lang = 'es'): WeekGroup[] {
  const loc = DATE_LOCALES[locale] ?? enUS;
  const groups: Record<string, Workout[]> = {};
  const weekLabels: Record<string, string> = {};

  workouts.forEach((w) => {
    const start = startOfWeek(new Date(w.date), { locale: loc });
    const key = start.toISOString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(w);
    weekLabels[key] = format(start, 'eee d MMM • eee d MMM', { locale: loc });
  });

  return Object.keys(groups)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((key) => ({
      key,
      label: weekLabels[key],
      sessions: groups[key].sort((a, b) => (a.date < b.date ? 1 : -1)),
      duration: groups[key].reduce((sum, w) => sum + (w.actual_minutes ?? w.duration), 0),
    }));
}

export function weekSessionCount(sessions: Workout[]): number {
  return sessions.length;
}
