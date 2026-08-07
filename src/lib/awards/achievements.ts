'use client';

import type { Achievement, UserAchievement, Workout } from '@/types';

/**
 * ─── Achievement Definitions Catalog ───
 * 33 achievements across 9 NEUROFIT-inspired categories.
 * Each has a condition evaluator that checks store data.
 *
 * Filosofía CHISPA: NUNCA se gamifican datos corporales (peso/IMC/medidas).
 * Las recompensas celebran el movimiento, no el cuerpo.
 */

export const ACHIEVEMENTS: Achievement[] = [
  // ── Workout Milestones ──
  { id: 'first_workout', category: 'workouts', name: 'Primer Paso', description: 'Completa tu primer entrenamiento', icon: 'Footprints', tier: 'common', condition_type: 'total_workouts', condition_value: { min: 1 }, sort_order: 1 },
  { id: 'five_workouts', category: 'workouts', name: 'Constancia', description: 'Completa 5 entrenamientos', icon: 'Flame', tier: 'uncommon', condition_type: 'total_workouts', condition_value: { min: 5 }, sort_order: 2 },
  { id: 'ten_workouts', category: 'workouts', name: 'Dedicación', description: 'Completa 10 entrenamientos', icon: 'Zap', tier: 'rare', condition_type: 'total_workouts', condition_value: { min: 10 }, sort_order: 3 },
  { id: 'twentyfive_workouts', category: 'workouts', name: 'Atleta', description: 'Completa 25 entrenamientos', icon: 'Trophy', tier: 'epic', condition_type: 'total_workouts', condition_value: { min: 25 }, sort_order: 4 },
  { id: 'fifty_workouts', category: 'workouts', name: 'Guerrero', description: 'Completa 50 entrenamientos', icon: 'Sword', tier: 'epic', condition_type: 'total_workouts', condition_value: { min: 50 }, sort_order: 5 },
  { id: 'hundred_workouts', category: 'workouts', name: 'Legendario', description: 'Completa 100 entrenamientos', icon: 'Crown', tier: 'legendary', condition_type: 'total_workouts', condition_value: { min: 100 }, sort_order: 6 },

  // ── Streak Milestones ──
  { id: 'streak_3', category: 'streak', name: 'Racha Inicial', description: 'Mantén una racha de 3 días seguidos', icon: 'Flame', tier: 'common', condition_type: 'streak_days', condition_value: { min: 3 }, sort_order: 7 },
  { id: 'streak_7', category: 'streak', name: 'Imparable', description: 'Mantén una racha de 7 días seguidos', icon: 'Flame', tier: 'rare', condition_type: 'streak_days', condition_value: { min: 7 }, sort_order: 8 },
  { id: 'streak_14', category: 'streak', name: 'Consagrado', description: 'Mantén una racha de 14 días seguidos', icon: 'Flame', tier: 'epic', condition_type: 'streak_days', condition_value: { min: 14 }, sort_order: 9 },
  { id: 'streak_30', category: 'streak', name: 'Leyenda Viva', description: 'Mantén una racha de 30 días seguidos', icon: 'Crown', tier: 'legendary', condition_type: 'streak_days', condition_value: { min: 30 }, sort_order: 10 },

  // ── Intensity Milestones ──
  { id: 'try_push', category: 'intensity', name: 'Límites', description: 'Completa un entrenamiento intensidad push', icon: 'Zap', tier: 'common', condition_type: 'intensity_count', condition_value: { type: 'push', min: 1 }, sort_order: 11 },
  { id: 'all_intensities', category: 'intensity', name: 'Versatilidad', description: 'Prueba las 4 intensidades (minimal, light, standard, push)', icon: 'Activity', tier: 'rare', condition_type: 'all_intensities', condition_value: { min: 1 }, sort_order: 12 },

  // ── Focus Milestones ──
  { id: 'fullbody_10', category: 'focus', name: 'Full Body Master', description: 'Completa 10 entrenamientos full body', icon: 'Target', tier: 'uncommon', condition_type: 'focus_count', condition_value: { type: 'full', min: 10 }, sort_order: 13 },
  { id: 'upper_10', category: 'focus', name: 'Upper King', description: 'Completa 10 entrenamientos de tren superior', icon: 'Dumbbell', tier: 'uncommon', condition_type: 'focus_count', condition_value: { type: 'upper', min: 10 }, sort_order: 14 },
  { id: 'lower_10', category: 'focus', name: 'Lower Legend', description: 'Completa 10 entrenamientos de tren inferior', icon: 'Dumbbell', tier: 'uncommon', condition_type: 'focus_count', condition_value: { type: 'lower', min: 10 }, sort_order: 15 },
  { id: 'core_10', category: 'focus', name: 'Core Crusher', description: 'Completa 10 entrenamientos de core', icon: 'Target', tier: 'uncommon', condition_type: 'focus_count', condition_value: { type: 'core', min: 10 }, sort_order: 16 },

  // ── Completion Milestones ──
  { id: 'perfect_session', category: 'completion', name: 'Sesión Perfecta', description: 'Completa un entrenamiento al 100%', icon: 'CheckCircle', tier: 'uncommon', condition_type: 'perfect_sessions', condition_value: { min: 1 }, sort_order: 17 },
  { id: 'perfectionist_10', category: 'completion', name: 'Perfeccionista', description: 'Completa 10 entrenamientos al 100%', icon: 'Award', tier: 'epic', condition_type: 'perfect_sessions', condition_value: { min: 10 }, sort_order: 18 },
  { id: 'comeback', category: 'completion', name: 'The Comeback', description: 'Completa un entrenamiento después de 3+ días sin entrenar', icon: 'Activity', tier: 'rare', condition_type: 'comeback', condition_value: { min_days_off: 3 }, sort_order: 19 },

  // ── Level Milestones ──
  { id: 'level_5', category: 'level', name: 'Nivel 5', description: 'Alcanza el nivel 5', icon: 'TrendingUp', tier: 'uncommon', condition_type: 'level', condition_value: { min: 5 }, sort_order: 20 },
  { id: 'level_10', category: 'level', name: 'Nivel 10', description: 'Alcanza el nivel 10', icon: 'TrendingUp', tier: 'epic', condition_type: 'level', condition_value: { min: 10 }, sort_order: 21 },
  { id: 'level_25', category: 'level', name: 'Nivel 25', description: 'Alcanza el nivel 25', icon: 'Crown', tier: 'legendary', condition_type: 'level', condition_value: { min: 25 }, sort_order: 22 },

  // ── Boss (NEUROFIT) ──
  { id: 'boss_first', category: 'boss', name: 'Cazador de Bosses', description: 'Derrota al jefe semanal por primera vez', icon: 'Sword', tier: 'epic', condition_type: 'boss_defeated', condition_value: { min: 1 }, sort_order: 23 },
  { id: 'boss_five', category: 'boss', name: 'Conquistador', description: 'Derrota 5 jefes semanales', icon: 'Crown', tier: 'legendary', condition_type: 'boss_defeated', condition_value: { min: 5 }, sort_order: 24 },

  // ── Hidden / Especiales ──
  { id: 'early_bird', category: 'hidden', name: 'Madrugador', description: 'Entrena antes de las 7:00 AM', icon: 'Sun', tier: 'rare', condition_type: 'time_based', condition_value: { before_hour: 7 }, sort_order: 25 },
  { id: 'night_owl', category: 'hidden', name: 'Noctámbulo', description: 'Entrena después de las 10:00 PM', icon: 'Moon', tier: 'rare', condition_type: 'time_based', condition_value: { after_hour: 22 }, sort_order: 26 },
  { id: 'adapter', category: 'hidden', name: 'Adaptabilidad', description: 'Adapta la intensidad en medio de la sesión 5 veces', icon: 'Wrench', tier: 'rare', condition_type: 'adaptation_count', condition_value: { min: 5 }, sort_order: 27 },
  { id: 'rpe_master', category: 'hidden', name: 'Auto-consciencia', description: 'Califica tu RPE como "justo" 10 veces', icon: 'Smile', tier: 'epic', condition_type: 'rpe_justo_count', condition_value: { min: 10 }, sort_order: 28 },

  // ── Movimiento · sin presión sobre el cuerpo ──
  { id: 'movimiento_7', category: 'movimiento', name: 'Ritmo de movimiento', description: 'Muévete en 7 días distintos (no tienen que ser seguidos)', icon: 'Footprints', tier: 'uncommon', condition_type: 'movement_days', condition_value: { min: 7 }, sort_order: 31 },
  { id: 'rutina_nueva', category: 'movimiento', name: 'Explorador de rutinas', description: 'Prueba 3 tipos de rutina diferentes', icon: 'Compass', tier: 'rare', condition_type: 'focus_variety', condition_value: { min: 3 }, sort_order: 32 },
  { id: 'mini_victoria', category: 'movimiento', name: 'Mini victoria', description: 'Completa una sesión de 1 minuto. Un minuto cuenta.', icon: 'Sparkles', tier: 'common', condition_type: 'min_session', condition_value: { min: 1 }, sort_order: 33 },
  { id: 'cinco_seguidos', category: 'movimiento', name: 'Cinco días en movimiento', description: 'Muévete en 5 días distintos dentro de dos semanas.', icon: 'HeartPulse', tier: 'uncommon', condition_type: 'windowed_days', condition_value: { min_days: 5, window_days: 14 }, sort_order: 34 },
  { id: 'intensidades_2sem', category: 'movimiento', name: 'Variedad en 2 semanas', description: 'Prueba las 4 intensidades en un plazo de 2 semanas.', icon: 'Activity', tier: 'rare', condition_type: 'intensities_in_days', condition_value: { min_days: 14 }, sort_order: 35 },
];

/** Build a lookup map by id */
export const ACHIEVEMENT_MAP = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
);

/* ─── Tier display config ─── */

export const TIER_CONFIG: Record<string, { label: string; glow: string; bg: string; text: string; border: string }> = {
  common:    { label: 'Común',     glow: '',                                 bg: 'bg-white/[.04]', text: 'text-[var(--muted)]', border: 'border-white/[.10]' },
  uncommon:  { label: 'Poco común', glow: 'shadow-[0_0_12px_rgba(76,201,240,0.15)]',  bg: 'bg-[rgba(76,201,240,0.06)]', text: 'text-[#4CC9F0]', border: 'border-[rgba(76,201,240,0.3)]' },
  rare:      { label: 'Raro',      glow: 'shadow-[0_0_14px_rgba(167,139,250,0.2)]', bg: 'bg-[rgba(167,139,250,0.08)]', text: 'text-[#a78bfa]', border: 'border-[rgba(167,139,250,0.35)]' },
  epic:      { label: 'Épico',     glow: 'shadow-[0_0_18px_rgba(255,107,53,0.25)]', bg: 'bg-[rgba(255,107,53,0.08)]', text: 'text-[#FF6B35]', border: 'border-[rgba(255,107,53,0.35)]' },
  legendary: { label: 'Legendario', glow: 'shadow-[0_0_22px_rgba(255,184,0,0.3)]',  bg: 'bg-[rgba(255,184,0,0.08)]',  text: 'text-[#fbbf24]', border: 'border-[rgba(255,184,0,0.4)]' },
};

/* ─── XP Calculation ─── */

const XP_PER_WORKOUT_BASE = 50;
const XP_PER_MINUTE = 1;
const XP_PERFECT_BONUS = 20;
/** Minutos mínimos para merecer el bonus de sesión perfecta (anti-farming XP) */
const MINUTES_FOR_PERFECT_BONUS = 5;

/**
 * Calculate total XP from all completed workouts.
 * Each workout contributes: completed_rate * XP_PER_WORKOUT_BASE + actual_minutes * XP_PER_MINUTE
 * Perfect sessions (100%) get a bonus.
 */
export function computeTotalXp(workouts: Workout[]): number {
  return workouts.reduce((total, w) => {
    const base = w.completed_rate * XP_PER_WORKOUT_BASE;
    const mins = (w.actual_minutes || w.duration) * XP_PER_MINUTE;
    const perfect =
      w.completed_rate >= 1 && (w.actual_minutes || w.duration) >= MINUTES_FOR_PERFECT_BONUS
        ? XP_PERFECT_BONUS
        : 0;
    return total + Math.round(base + mins + perfect);
  }, 0);
}

/**
 * Calculate level from XP.
 * Formula: level = floor(XP / 200) + 1
 * Each level requires 200 XP.
 */
export function computeLevel(xp: number): number {
  return Math.max(1, Math.floor(xp / 200) + 1);
}

/**
 * Calculate XP earned for a single workout result.
 */
export function computeWorkoutXp(
  completedRate: number,
  actualMinutes: number
): number {
  const perfect =
    completedRate >= 1 && actualMinutes >= MINUTES_FOR_PERFECT_BONUS
      ? XP_PERFECT_BONUS
      : 0;
  return Math.round(completedRate * XP_PER_WORKOUT_BASE + actualMinutes * XP_PER_MINUTE + perfect);
}

/* ─── Category config ─── */

export const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  workouts:   { label: 'Entrenamientos', icon: 'Dumbbell' },
  streak:     { label: 'Rachas',         icon: 'Flame' },
  intensity:  { label: 'Intensidad',     icon: 'Zap' },
  focus:      { label: 'Enfoque',        icon: 'Target' },
  completion: { label: 'Completitud',    icon: 'CheckCircle' },
  level:      { label: 'Niveles',        icon: 'TrendingUp' },
  boss:       { label: 'Jefes',          icon: 'Sword' },
  hidden:     { label: 'Especiales',     icon: 'Sparkles' },
  movimiento: { label: 'Movimiento',     icon: 'Footprints' },
};

/* ─── Achievement Evaluation Engine ─── */

export interface AchievementContext {
  workouts: Workout[];
  totalWorkouts: number;
  streak: number;
  currentLevel: number;
  bossDefeated?: number;
  adaptationCount?: number;
  rpeJustoCount?: number;
  completedIntensities?: Set<string>;
  completedFocuses?: Record<string, number>;
  /** Nº de días distintos con sesión completada (movimiento, no consecutivos) */
  movementDays?: number;
  /** Nº de días distintos con sesión en la última ventana (rolling) */
  windowedDays?: number;
  /** Nº de tipos de rutina (focus) distintos probados */
  focusVariety?: number;
  /** Nº de sesiones de 1 minuto o menos (mini victorias) */
  minSessions?: number;
}

/**
 * Compute the achievement context from workouts data and optional extra stats.
 */
export function computeAchievementContext(
  workouts: Workout[],
  extra?: {
    bossDefeated?: number;
    adaptationCount?: number;
    rpeJustoCount?: number;
  }
): AchievementContext {
  const completed = workouts.filter((w) => w.completed_rate >= 0.5);
  const totalWorkouts = completed.length;

  // Streak: consecutive days going backwards from today
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (completed.some((w) => w.date === key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  const currentLevel = Math.max(1, Math.floor(totalWorkouts / 5) + 1);

  // Completed intensities
  const completedIntensities = new Set(completed.map((w) => w.intensity));

  // Completed focuses count
  const completedFocuses: Record<string, number> = {};
  for (const w of completed) {
    completedFocuses[w.focus] = (completedFocuses[w.focus] || 0) + 1;
  }

  // Movimiento: días distintos con sesión (no exige racha) + variedad de rutinas
  const movementDays = new Set(completed.map((w) => w.date)).size;
  // Windowed days: días distintos con movimiento en los últimos N días (rolling)
  // Cuenta hacia atrás desde today para que "5 en 7" funcione con cualquier dato histórico
  const recentDates = new Set<string>();
  for (const w of completed) {
    const wDate = new Date(w.date);
    const dayDiff = Math.floor((today.getTime() - wDate.getTime()) / 86400000);
    if (dayDiff >= 0 && dayDiff < 7) { // últimos 7 días (0-6)
      recentDates.add(w.date);
    }
  }
  const windowedDays = recentDates.size;
  const focusVariety = Object.keys(completedFocuses).length;
  // Mini victorias: sesiones de 1 minuto o menos (cualquier movimiento cuenta)
  const minSessions = workouts.filter(
    (w) => typeof w.actual_minutes === 'number' && w.actual_minutes > 0 && w.actual_minutes <= 1
  ).length;

  return {
    workouts,
    totalWorkouts,
    streak,
    currentLevel,
    bossDefeated: extra?.bossDefeated,
    adaptationCount: extra?.adaptationCount ?? 0,
    rpeJustoCount: extra?.rpeJustoCount ?? 0,
    completedIntensities,
    completedFocuses,
    movementDays,
    windowedDays,
    focusVariety,
    minSessions,
  };
}

/**
 * Evaluate a single achievement condition against the context.
 * Returns { unlocked, progress_current, progress_target }.
 */
export function evaluateAchievement(
  achievement: Achievement,
  ctx: AchievementContext
): { unlocked: boolean; progressCurrent: number; progressTarget: number } {
  const { condition_type, condition_value } = achievement;
  const { min } = condition_value as { min?: number };

  let unlocked = false;
  let progressCurrent = 0;
  let progressTarget = min ?? 1;

  switch (condition_type) {
    case 'total_workouts': {
      progressCurrent = ctx.totalWorkouts;
      progressTarget = (condition_value as { min: number }).min;
      unlocked = ctx.totalWorkouts >= progressTarget;
      break;
    }
    case 'streak_days': {
      progressCurrent = ctx.streak;
      progressTarget = (condition_value as { min: number }).min;
      unlocked = ctx.streak >= progressTarget;
      break;
    }
    case 'intensity_count': {
      const { type } = condition_value as { type: string; min: number };
      progressCurrent = ctx.workouts.filter((w) => w.intensity === type && w.completed_rate >= 0.5).length;
      progressTarget = (condition_value as { min: number }).min;
      unlocked = progressCurrent >= progressTarget;
      break;
    }
    case 'all_intensities': {
      const all = ['minimal', 'light', 'standard', 'push'];
      progressCurrent = all.filter((i) => ctx.completedIntensities?.has(i)).length;
      progressTarget = 4;
      unlocked = progressCurrent >= 4;
      break;
    }
    case 'focus_count': {
      const { type } = condition_value as { type: string; min: number };
      progressCurrent = ctx.completedFocuses?.[type] ?? 0;
      progressTarget = (condition_value as { min: number }).min;
      unlocked = progressCurrent >= progressTarget;
      break;
    }
    case 'perfect_sessions': {
      progressCurrent = ctx.workouts.filter((w) => w.completed_rate >= 1).length;
      progressTarget = (condition_value as { min: number }).min;
      unlocked = progressCurrent >= progressTarget;
      break;
    }
    case 'comeback': {
      const { min_days_off } = condition_value as { min_days_off: number };
      // Check if the latest workout was preceded by 3+ days off
      const completed = ctx.workouts.filter((w) => w.completed_rate >= 0.5)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (completed.length >= 2) {
        const latest = new Date(completed[0].date);
        const prev = new Date(completed[1].date);
        const diffDays = Math.floor((latest.getTime() - prev.getTime()) / 86400000);
        progressCurrent = diffDays >= min_days_off ? 1 : 0;
        unlocked = diffDays >= min_days_off;
      }
      progressTarget = 1;
      break;
    }
    case 'level': {
      progressCurrent = ctx.currentLevel;
      progressTarget = (condition_value as { min: number }).min;
      unlocked = ctx.currentLevel >= progressTarget;
      break;
    }
    case 'boss_defeated': {
      progressCurrent = ctx.bossDefeated ?? 0;
      progressTarget = (condition_value as { min: number }).min;
      unlocked = (ctx.bossDefeated ?? 0) >= progressTarget;
      break;
    }
    case 'time_based': {
      const { before_hour, after_hour } = condition_value as { before_hour?: number; after_hour?: number };
      const now = new Date();
      const hour = now.getHours();
      if (before_hour !== undefined) {
        progressCurrent = hour < before_hour ? 1 : 0;
        unlocked = hour < before_hour;
      } else if (after_hour !== undefined) {
        progressCurrent = hour >= after_hour ? 1 : 0;
        unlocked = hour >= after_hour;
      }
      progressTarget = 1;
      break;
    }
    case 'adaptation_count': {
      progressCurrent = ctx.adaptationCount ?? 0;
      progressTarget = (condition_value as { min: number }).min;
      unlocked = (ctx.adaptationCount ?? 0) >= progressTarget;
      break;
    }
    case 'rpe_justo_count': {
      progressCurrent = ctx.rpeJustoCount ?? 0;
      progressTarget = (condition_value as { min: number }).min;
      unlocked = (ctx.rpeJustoCount ?? 0) >= progressTarget;
      break;
    }
    case 'movement_days': {
      progressCurrent = ctx.movementDays ?? 0;
      progressTarget = (condition_value as { min: number }).min;
      unlocked = progressCurrent >= progressTarget;
      break;
    }
    case 'windowed_days': {
      const { min_days, window_days } = condition_value as { min_days: number; window_days: number };
      // Calculate distinct days with movement in the rolling window
      const completed = ctx.workouts.filter((w) => w.completed_rate >= 0.5);
      const today = new Date();
      const recentDates = new Set<string>();
      for (const w of completed) {
        const wDate = new Date(w.date);
        const dayDiff = Math.floor((today.getTime() - wDate.getTime()) / 86400000);
        if (dayDiff >= 0 && dayDiff < window_days) {
          recentDates.add(w.date);
        }
      }
      progressCurrent = recentDates.size;
      progressTarget = min_days;
      unlocked = progressCurrent >= min_days;
      break;
    }
    case 'focus_variety': {
      progressCurrent = ctx.focusVariety ?? 0;
      progressTarget = (condition_value as { min: number }).min;
      unlocked = progressCurrent >= progressTarget;
      break;
    }
    case 'min_session': {
      progressCurrent = ctx.minSessions ?? 0;
      progressTarget = (condition_value as { min: number }).min ?? 1;
      unlocked = progressCurrent >= progressTarget;
      break;
    }
    case 'intensities_in_days': {
      // Las 4 intensidades probadas (sesiones completadas) dentro de un plazo
      const { min_days } = condition_value as { min_days: number };
      const ALL = ['minimal', 'light', 'standard', 'push'];
      const byIntensity = new Map<string, string>(); // intensidad → fecha más reciente
      for (const w of ctx.workouts) {
        if (w.completed_rate >= 0.5 && ALL.includes(w.intensity)) {
          byIntensity.set(w.intensity, w.date);
        }
      }
      progressCurrent = byIntensity.size;
      progressTarget = 4;
      if (byIntensity.size === 4) {
        const dates = [...byIntensity.values()].sort();
        const first = new Date(dates[0]).getTime();
        const last = new Date(dates[dates.length - 1]).getTime();
        // Redondea para tolerar horas residuales en fechas con timestamp
        unlocked = Math.round((last - first) / 86400000) <= min_days;
      }
      break;
    }
    default:
      break;
  }

  return { unlocked, progressCurrent, progressTarget };
}

/**
 * Evaluate all achievements and return the full UserAchievement map.
 * Also returns a list of newly unlocked achievement IDs.
 */
export function evaluateAllAchievements(
  ctx: AchievementContext,
  currentProgress: Record<string, UserAchievement>
): {
  progress: Record<string, UserAchievement>;
  newlyUnlocked: string[];
} {
  const now = new Date().toISOString();
  const progress: Record<string, UserAchievement> = {};
  const newlyUnlocked: string[] = [];

  // Excluir categoría 'streak' (legacy) de evaluación activa; 
  // sus logros permanecen en datos históricos pero no se desbloquean nuevos.
  const activeAchievements = ACHIEVEMENTS.filter((a) => a.category !== 'streak');

  for (const achievement of activeAchievements) {
    const existing = currentProgress[achievement.id];
    const wasUnlocked = existing?.unlocked ?? false;
    const evaluation = evaluateAchievement(achievement, ctx);

    // Monotónico: un logro desbloqueado NUNCA se revoca (aunque el progreso
    // pueda bajar, p.ej. al borrar entradas del historial de peso).
    const unlocked = wasUnlocked || evaluation.unlocked;
    progress[achievement.id] = {
      achievement_id: achievement.id,
      unlocked,
      unlocked_at: evaluation.unlocked && !wasUnlocked ? now : (existing?.unlocked_at ?? null),
      progress_current: evaluation.progressCurrent,
      progress_target: evaluation.progressTarget,
    };

    if (evaluation.unlocked && !wasUnlocked) {
      newlyUnlocked.push(achievement.id);
    }
  }

  return { progress, newlyUnlocked };
}
