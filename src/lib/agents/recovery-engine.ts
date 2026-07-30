import { CheckIn } from '@/types';
import { clamp } from '@/lib/utils/helpers';

/**
 * Recovery Engine — Calcula el score de recuperación basado en el check-in diario.
 *
 * Pesos: sueño 40%, energía 30%, estrés 30%
 * Normaliza y clampea los inputs antes de calcular.
 */
export function calculateRecoveryScore(
  checkin: CheckIn
): { score: number; sleep_contribution: number; energy_contribution: number; stress_contribution: number } {
  const sleep = clamp((checkin.sleep - 4) / 4.5, 0, 1) * 100;
  const energy = checkin.energy * 10;
  const stress = (10 - checkin.stress) * 10;
  return {
    sleep_contribution: Math.round(sleep * 0.4),
    energy_contribution: Math.round(energy * 0.3),
    stress_contribution: Math.round(stress * 0.3),
    score: Math.round(sleep * 0.4 + energy * 0.3 + stress * 0.3),
  };
}
