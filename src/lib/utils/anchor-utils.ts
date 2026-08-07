/**
 * Habit stacking ("anclas") — helpers puros del ancla de rutina.
 *
 * Principio ND:
 * - El usuario elige UNA ancla + una ventana ("después de tu café", "en la mañana").
 * - Un solo nudge por ventana/día, nunca repetido (sin nagging).
 * - Nada expira, nada castiga: si hoy no se hace, el ancla sigue ahí mañana.
 */
import type { AnchorWindow } from '@/types';

export interface AnchorOption {
  id: string;
  /** Traducción listo para usar tras "Después de …" en ES */
  es: string;
  en: string;
}

export const ANCHOR_OPTIONS: AnchorOption[] = [
  { id: 'coffee', es: 'tu café', en: 'your coffee' },
  { id: 'wake', es: 'despertarte', en: 'waking up' },
  { id: 'lunch', es: 'tu almuerzo', en: 'your lunch' },
  { id: 'work', es: 'volver del trabajo', en: 'coming home from work' },
  { id: 'dinner', es: 'tu cena', en: 'your dinner' },
  { id: 'shower', es: 'tu ducha', en: 'your shower' },
];

export const ANCHOR_WINDOWS: { id: AnchorWindow; es: string; en: string }[] = [
  { id: 'morning', es: 'en la mañana', en: 'in the morning' },
  { id: 'afternoon', es: 'en la tarde', en: 'in the afternoon' },
  { id: 'evening', es: 'en la noche', en: 'in the evening' },
];

export const ANCHOR_MINUTES = [1, 2, 5] as const;

export function anchorLabel(id: string, lang: 'es' | 'en'): string {
  const a = ANCHOR_OPTIONS.find((o) => o.id === id);
  return a ? (lang === 'en' ? a.en : a.es) : id;
}

export function anchorWindowLabel(w: AnchorWindow, lang: 'es' | 'en'): string {
  const opt = ANCHOR_WINDOWS.find((x) => x.id === w);
  return opt ? (lang === 'en' ? opt.en : opt.es) : w;
}

/** Ventana actual según la hora local (mañana < 12h, tarde < 18h, noche >= 18h). */
export function currentAnchorWindow(date: Date = new Date()): AnchorWindow {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

/** Clave de nudge visible: `fecha:ventana` — garantiza "un solo nudge por ventana". */
export function anchorNudgeKey(dateKey: string, window: AnchorWindow): string {
  return `${dateKey}:${window}`;
}