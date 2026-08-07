/**
 * CHISPA — Visuales de patrones de movimiento (UNA sola fuente de verdad).
 *
 * Los iconos de categoría viven AQUÍ y están alineados con la taxonomía de
 * patrones real de la app (selector-engine → `Pattern`), NO con músculos.
 * Antes de v3.3, `exercise-selector.tsx` definía sus propios PATTERN_ICON /
 * PATTERN_COLOR y el spec documentaba iconos de categoría por músculo
 * (PushIcon=pecho, PressIcon=hombros…) que chocaban con push/pull/hinge/squat.
 * Todo lo que pinte un patrón importa de este módulo.
 */

import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDown,
  MoveHorizontal,
  Circle,
  Activity,
  PersonStanding,
  Dumbbell,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { Pattern } from '@/lib/agents/selector-engine';

export const PATTERN_ICON: Record<Pattern, ComponentType<{ size?: number; className?: string }>> = {
  push: ArrowUpRight,
  pull: ArrowDownLeft,
  squat: ArrowDown,
  hinge: MoveHorizontal,
  core: Circle,
  cardio: Activity,
  mobility: PersonStanding,
  arms: Dumbbell,
};

export const PATTERN_COLOR: Record<Pattern, string> = {
  push: '#4CC9F0',
  pull: '#a78bfa',
  squat: '#34d399',
  hinge: '#fbbf24',
  core: '#ffb454',
  cardio: '#f87171',
  mobility: '#60a5fa',
  arms: '#f472b6',
};
