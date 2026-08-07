import { CheckIn } from '@/types';
import { clamp } from '@/lib/utils/helpers';

/**
 * Recovery Engine — Calcula el score de recuperación basado en el check-in diario.
 *
 * Pesos: sueño 40%, energía 30%, estrés 30%
 * Normaliza y clampea los inputs antes de calcular.
 *
 * ⚠️ La fórmula del score está fijada por tests de integración (contribuciones
 * exactas por componente). Los mejoradores de inteligencia viven en
 * `recoveryInsights`, que NO altera el score: solo lo interpreta.
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

export type WeakestFactor = 'sleep' | 'energy' | 'stress';

/**
 * Interpretación cualitativa del check-in (capa de inteligencia).
 * NO toca el score: devuelve etiquetas y el factor más débil para que el
 * Decision Engine y el Coach puedan dar razones con matiz humano.
 */
export function recoveryInsights(checkin: CheckIn): {
  weakest: WeakestFactor;
  sleepLabel: string;
  energyLabel: string;
  stressLabel: string;
} {
  const sleepScore = clamp((checkin.sleep - 4) / 4.5, 0, 1);
  const energyScore = checkin.energy / 10;
  const stressScore = (10 - checkin.stress) / 10;

  const weakest = (['sleep', 'energy', 'stress'] as WeakestFactor[]).reduce((w, f) => {
    const s = f === 'sleep' ? sleepScore : f === 'energy' ? energyScore : stressScore;
    const ws = w === 'sleep' ? sleepScore : w === 'energy' ? energyScore : stressScore;
    return s < ws ? f : w;
  }, 'sleep' as WeakestFactor);

  return {
    weakest,
    sleepLabel: checkin.sleep >= 8 ? 'sueño reparador' : checkin.sleep >= 6 ? 'sueño ajustado' : 'sueño escaso',
    energyLabel: checkin.energy >= 7 ? 'energía alta' : checkin.energy >= 4 ? 'energía media' : 'energía baja',
    stressLabel: checkin.stress <= 3 ? 'estrés bajo' : checkin.stress <= 6 ? 'estrés medio' : 'estrés alto',
  };
}
