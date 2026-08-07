import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ema(prev: number, current: number, weight: number) {
  return prev * (1 - weight) + current * weight;
}

export function uid() {
  // UUID v4 válido: la DB espera uuid en workouts.id/chat.id (migración 001).
  // Fallback a base36 si crypto.randomUUID no está disponible (SSR/edge).
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function calculateBmi(weightKg: number, heightCm: number): number | null {
  if (weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
}

export type BmiResult = {
  value: number;
  category: string;
};

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoKey(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string) {
  return Math.floor(
    (new Date(todayKey()).getTime() - new Date(from).getTime()) / 86400000
  );
}

/**
 * Map user profile equipment level to allowed exercise equipment values.
 *
 * Profile values: 'ninguno' | 'mancuernas' | 'gimnasio'
 * Exercise values from free-exercise-db: ninguno, mancuernas, barra, barra Z,
 *   máquina, polea, bandas, kettlebell, balón medicinal, pelota suiza, rodillo, otro
 *
 * - ninguno → solo ejercicios sin equipo
 * - mancuernas → sin equipo + mancuernas
 * - gimnasio → todo (barra, máquina, polea, etc.)
 */
export function matchesEquipment(
  profileEquipment: string,
  exerciseEquipment: string
): boolean {
  switch (profileEquipment) {
    case 'ninguno':
      return exerciseEquipment === 'ninguno';
    case 'mancuernas':
      return exerciseEquipment === 'ninguno' || exerciseEquipment === 'mancuernas';
    case 'gimnasio':
      return true; // All equipment available
    default:
      return exerciseEquipment === profileEquipment;
  }
}

export function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

export function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function recColor(r: number) {
  return r >= 75
    ? 'var(--good)'
    : r >= 55
      ? 'var(--accent)'
      : r >= 35
        ? 'var(--warn)'
        : 'var(--bad)';
}

export function recWord(r: number) {
  if (r >= 75) return 'Óptimo';
  if (r >= 55) return 'Listo';
  if (r >= 35) return 'A medio gas';
  return 'Pide calma';
}

export function localGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function localSet(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/**
 * Copia texto al portapapeles con fallback legacy.
 * Devuelve `true` si la copia tuvo éxito (para feedback de UI).
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Clipboard API bloqueada — probamos fallback legacy
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
