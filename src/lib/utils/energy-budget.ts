/**
 * Energy budget — convierte la recuperación (0-100) en una decisión visible.
 *
 * Principio ND: el número de recuperación *toma la decisión* por el usuario
 * (menos carga ejecutiva). Los umbrales son los mismos que usa DecisionEngine
 * (decision-agent.ts), importados de una única fuente: RECOVERY_THRESHOLDS —
 * la tarjeta de Home muestra exactamente lo que el motor decidiría.
 */

import { RECOVERY_THRESHOLDS } from '@/lib/utils/constants';

export type EnergyBudget = {
  /** `restore` cuando el cuerpo pide suavidad (recuperación < 35) */
  kind: 'restore' | 'train';
  intensity: 'minimal' | 'light' | 'standard' | 'push';
  /** Duración sugerida en minutos */
  duration: number;
};

export function energyBudget(rec: number, preferredDuration = 60, consistencyPct = 0): EnergyBudget {
  if (rec < RECOVERY_THRESHOLDS.low) {
    return {
      kind: 'restore',
      intensity: 'minimal',
      duration: Math.min(Math.max(preferredDuration - 8, 5), 12),
    };
  }
  if (rec < RECOVERY_THRESHOLDS.mid) {
    return { kind: 'train', intensity: 'light', duration: Math.min(preferredDuration, 20) || 15 };
  }
  if (rec >= RECOVERY_THRESHOLDS.high && consistencyPct >= 60) {
    return { kind: 'train', intensity: 'push', duration: Math.min(preferredDuration + 5, 40) };
  }
  return { kind: 'train', intensity: 'standard', duration: preferredDuration };
}