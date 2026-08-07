/**
 * CHISPA — Selector Engine.
 *
 * Capa determinista del "Elige ejercicios" (80% de lo que el usuario ve lo
 * decide código, nunca el LLM). Implementa, sin red y en O(n), el flujo del
 * spec del selector:
 *
 *   - Capa 01 · Relevancia + huecos  → score = afinidad + bonus_hueco + gancho
 *   - Capa 02 · Coach de balance     → present / missing / duration / dopa
 *   - Capa 03 · Suficiencia          → isSufficient() y umbrales del CTA
 *
 * La afinidad (capa 01) es un score ENTRENADO sobre el historial real de
 * interacción del usuario — el ex_progress del Digital Twin: los ejercicios
 * que el usuario domina (easy) y el esfuerzo percibido (last_rpe) desplazan
 * gradualmente la tabla estática, con arranque en frío (sin historial → la
 * fórmula transparente intacta).
 *
 * Las "razones" que muestra el modo Guíame son plantillas deterministas
 * (tmpl_why_*) — el UI las traduce, nunca texto libre.
 */

import type { Exercise } from '@/types';
import { clamp } from '@/lib/utils/helpers';

// ─── Tipos ────────────────────────────────────────────────────────────────

export type Pattern =
  | 'push'
  | 'pull'
  | 'squat'
  | 'hinge'
  | 'core'
  | 'cardio'
  | 'mobility'
  | 'arms';

export type SelectorFocus = 'full' | 'upper' | 'lower' | 'core';

export type ReasonKind = 'gap' | 'affinity' | 'easy';

export interface SuggestionReason {
  kind: ReasonKind;
  /** Patrón implicado (solo gap/affinity) */
  pattern?: Pattern;
}

export interface ScoredExercise {
  exercise: Exercise;
  score: number;
  /** Patrón primario usado para el score */
  pattern: Pattern;
  /** Por qué se sugiere — plantilla determinista que el UI traduce */
  reasons: SuggestionReason[];
  /** True si cubre un patrón que la rutina aún no tiene */
  coversGap: boolean;
}

/** Un ejercicio del historial real del Digital Twin (ex_progress). */
export interface ExProgressEntry {
  /** Veces que el usuario completó el ejercicio con RPE bajo (lo domina) */
  easy: number;
  /** Último RPE percibido (escala 1–10) */
  last_rpe?: number;
  /** Veces que el usuario lo percibió muy duro (RPE ≥ 7) */
  hard?: number;
  /** Nº total de interacciones registradas */
  total?: number;
}

/** Historial de interacción por ejercicio, tal como vive en el Digital Twin. */
export type ExProgressMap = Record<string, ExProgressEntry>;

export interface Balance {
  /** Patrones del enfoque ya cubiertos por la rutina */
  present: Pattern[];
  /** Patrones del enfoque que todavía faltan */
  missing: Pattern[];
  /** Duración total estimada (trabajo + descanso) en minutos */
  durationMin: number;
  /** Solo trabajo (sin descanso) en minutos */
  workMin: number;
  /** Score de dopamina 0–100 */
  dopa: number;
  /** True cuando la rutina cruza el umbral de "ya está bien" */
  sufficient: boolean;
  /** Nº de ejercicios en la rutina */
  count: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────

/** Patrones que exige cada enfoque (invariante de dominio, no aprende). */
export const DESIRED_PATTERNS: Record<SelectorFocus, Pattern[]> = {
  full: ['push', 'pull', 'squat', 'core'],
  upper: ['push', 'pull', 'arms'],
  lower: ['squat', 'hinge'],
  core: ['core', 'cardio'],
};

/** Afinidad base de cada patrón por enfoque (0–5). */
export const AFFINITY: Record<SelectorFocus, Record<Pattern, number>> = {
  full: { push: 3, pull: 3, squat: 3, hinge: 2, core: 2, arms: 1, cardio: 1, mobility: 1 },
  upper: { push: 4, pull: 4, arms: 4, core: 1, squat: 1, hinge: 1, cardio: 1, mobility: 1 },
  lower: { squat: 4, hinge: 4, core: 1, push: 1, pull: 1, arms: 1, cardio: 1, mobility: 1 },
  core: { core: 4, cardio: 4, mobility: 2, push: 1, pull: 1, squat: 1, hinge: 1, arms: 1 },
};

/**
 * Bonus deliberadamente dominante: garantiza que Guíame *complete* la rutina
 * (cubra un hueco) antes que repetir patrones ya presentes.
 */
export const GAP_BONUS = 5;

/**
 * Peso del historial: cuánto manda la experiencia real frente a la prior
 * estática. Crece con cada interacción y satura ~4 (arranque en frío = 0).
 */
export function historyWeight(entry?: ExProgressEntry): number {
  if (!entry) return 0;
  const interactions =
    (entry.easy ?? 0) +
    (entry.last_rpe !== undefined ? 1 : 0) +
    (entry.hard !== undefined ? 1 : 0);
  return clamp(interactions / 4, 0, 1);
}

/**
 * Afinidad entrenada (capa 01): mezcla la prior estática AFFINITY con la
 * señal real del historial del usuario (ex_progress del Digital Twin).
 *
 *   - familiarity: cada finalización "fácil" suma (el usuario lo domina)
 *   - effort: RPE bajo suma, RPE alto resta (el esfuerzo percibido)
 *
 * Sin historial devuelve exactamente la base (fórmula transparente); con
 * historial, la experiencia del usuario gana peso gradualmente. El resultado
 * nunca sale del rango 0–6, así el bonus por hueco (+5) sigue dominando.
 */
export function personalAffinity(
  base: number,
  entry?: ExProgressEntry
): number {
  if (!entry) return base;
  const w = historyWeight(entry);
  const familiarity = clamp(entry.easy ?? 0, 0, 5) * 0.6;
  let effort = 0;
  if (entry.last_rpe !== undefined) {
    effort = entry.last_rpe <= 3 ? 1 : entry.last_rpe >= 7 ? -1 : 0;
  }
  // Historial de sesiones muy duras (RPE ≥ 7) baja la afinidad de forma
  // persistente — el usuario no disfruta ese ejercicio.
  if ((entry.hard ?? 0) >= 2) effort -= 1;
  const learned = clamp(base + familiarity + effort, 0, 6);
  return base * (1 - w) + learned * w;
}

/** Umbrales del spec: ex ≥ 4 ∧ cubiertos ≥ min(3, |desired|) ∧ 12 ≤ min ≤ 50 */
export const SUFFICIENT = {
  minExercises: 4,
  minDuration: 12,
  maxDuration: 50,
} as const;

export const PATTERN_LABEL: Record<Pattern, string> = {
  push: 'Empuje',
  pull: 'Tirón',
  squat: 'Sentadilla',
  hinge: 'Bisagra',
  core: 'Core',
  cardio: 'Cardio',
  mobility: 'Movilidad',
  arms: 'Brazo',
};

// ─── Clasificación de patrones ────────────────────────────────────────────

/**
 * Clasifica un ejercicio en uno o más patrones de movimiento usando señales
 * deterministas: nombre (es/en), grupo muscular, categoría y fuerza.
 * Un ejercicio compuesto puede aportar varios patrones.
 */
const NAME_PATTERNS: { pattern: Pattern; re: RegExp }[] = [
  { pattern: 'squat', re: /squat|sentadilla|zancada|lunge|step[-_ ]?up|box jump|salto al caj|jump squat|hack squat|goblet/i },
  { pattern: 'hinge', re: /deadlift|peso muerto|hip thrust|glute bridge|puente de gl|good morning|buenos d[ií]as|romanian|rumano|swing|snatch|arrancada|clean|carada|hiperextensi|hyperextension|pull[-_ ]?through|kickback/i },
  { pattern: 'core', re: /crunch|abdominal|plancha|plank|sit[-_ ]?up|russian twist|giro ruso|bird dog|p[aá]jaro|dead bug|bicho muerto|jackknife|rollout|rodillo abdominal|torso|side bend|flexi[oó]n lateral|hanging leg|elevaci[oó]n de piernas|side plank|plancha lateral|hollow body|hueco|pallof/i },
  { pattern: 'cardio', re: /correr|run|bicicleta|bike|rowing|remar|el[ií]ptica|elliptical|burpee|jump rope|cuerda|treadmill|cinta|climber|escalador|sprint|mountain climber|bear crawl|walking|marcha|saltar a la cuerda/i },
  { pattern: 'mobility', re: /stretch|estiramiento|movilidad|mobility|yoga|balance|equilibrio|mobilization|movilizaci[oó]n|foam roll|rodillo de espuma/i },
  { pattern: 'arms', re: /curl|b[ií]ceps|biceps|tr[ií]ceps|triceps|martillo|hammer|pushdown|french press|extensi[oó]n de tr[ií]ceps|skull crusher|pronaci[oó]n/i },
  { pattern: 'push', re: /press|flexi[oó]n|push[-_ ]?up|pushup|fondo|dips|fly|apertura|elevaci[oó]n lateral|elevaciones|lateral raise|empuje|empujar/i },
  { pattern: 'pull', re: /pull|remo|row|jal[oó]n|pulldown|chin|dominada|tir[oó]n|face pull|encogimiento|shrug|tracci[oó]n|jalar/i },
];

/** Grupo muscular → patrón dominante (señal fuerte, no se sobre-escribe). */
const MUSCLE_PATTERN: Partial<Record<string, Pattern>> = {
  pecho: 'push',
  hombros: 'push',
  espalda: 'pull',
  brazos: 'arms',
  core: 'core',
  cardio: 'cardio',
  gluteos: 'hinge',
};

/**
 * Patrones de un ejercicio (caché en un Map por id para O(1) en listas largas).
 */
const patternCache = new Map<string, Pattern[]>();

export function getPatterns(ex: Exercise): Pattern[] {
  const cached = patternCache.get(ex.id);
  if (cached) return cached;

  const name = ex.name.toLowerCase();
  const out = new Set<Pattern>();

  // 1 · Señal fuerte: grupo muscular
  const musclePat = MUSCLE_PATTERN[ex.muscle];
  if (musclePat) out.add(musclePat);

  // 2 · Señal de nombre: frases inequívocas por patrón
  for (const { pattern, re } of NAME_PATTERNS) {
    if (re.test(name)) out.add(pattern);
  }

  // 3 · Categorías específicas
  if (ex.category === 'cardio') out.add('cardio');
  if (ex.category === 'estiramiento') out.add('mobility');

  // 4 · Fallback determinista si nada matcheó
  if (out.size === 0) {
    if (ex.force === 'push') out.add('push');
    else if (ex.force === 'pull') out.add('pull');
    else out.add('mobility');
  }

  const result = [...out];
  patternCache.set(ex.id, result);
  return result;
}

/** Patrón primario (mayor afinidad con el enfoque; desempate por orden fijo). */
export function primaryPattern(ex: Exercise, focus: SelectorFocus): Pattern {
  const patterns = getPatterns(ex);
  const order: Pattern[] = ['push', 'pull', 'squat', 'hinge', 'core', 'cardio', 'mobility', 'arms'];
  let best = patterns[0];
  let bestScore = -1;
  for (const p of patterns) {
    const s = AFFINITY[focus][p];
    if (s > bestScore || (s === bestScore && order.indexOf(p) < order.indexOf(best))) {
      best = p;
      bestScore = s;
    }
  }
  return best;
}

// ─── Relevancia ───────────────────────────────────────────────────────────

/** Gancho ADHD: arrancar con baja carga cognitiva vale puntos. */
export function hook(ex: Exercise): number {
  switch (ex.cognitive_load) {
    case 'low': return 1;
    case 'med': return 0;
    default: return -1;
  }
}

/** Score del spec: afinidad entrenada + bonus por hueco + gancho. */
export function scoreExercise(
  ex: Exercise,
  focus: SelectorFocus,
  missing: Pattern[],
  exProgress?: ExProgressMap
): ScoredExercise {
  const pattern = primaryPattern(ex, focus);
  const coversGap = missing.includes(pattern);
  const affinity = Math.round(
    personalAffinity(AFFINITY[focus][pattern], exProgress?.[ex.id])
  );
  const score = affinity + (coversGap ? GAP_BONUS : 0) + hook(ex);

  const reasons: SuggestionReason[] = [];
  if (coversGap) reasons.push({ kind: 'gap', pattern });
  if (affinity >= 3) reasons.push({ kind: 'affinity', pattern });
  if (hook(ex) >= 1) reasons.push({ kind: 'easy' });
  // La persona lo ha dominado: arranque fácil con historial real.
  // Dedupe: el hook (carga low) ya pudo empujar { kind: 'easy' }.
  if ((exProgress?.[ex.id]?.easy ?? 0) >= 2 && !reasons.some((r) => r.kind === 'easy')) {
    reasons.push({ kind: 'easy' });
  }

  return { exercise: ex, score, pattern, reasons, coversGap };
}

/**
 * Top-k del modo Guíame: ordena por score (desc), dificultad (asc) y nombre.
 * Excluye ejercicios ya elegidos para nunca proponer duplicados. Acepta el
 * historial real del Digital Twin para la afinidad entrenada (opcional).
 */
export function rankSuggestions(
  catalog: Exercise[],
  focus: SelectorFocus,
  missing: Pattern[],
  selectedIds: Set<string> = new Set(),
  count = 4,
  exProgress?: ExProgressMap,
  recentIds?: Set<string>
): ScoredExercise[] {
  return catalog
    .filter((e) => !selectedIds.has(e.id))
    .map((e) => {
      const sc = scoreExercise(e, focus, missing, exProgress);
      // Novedad: restar prioridad a ejercicios de la última sesión (variedad = dopamina).
      if (recentIds?.has(e.id)) sc.score -= 2;
      return sc;
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.exercise.difficulty ?? 2) - (b.exercise.difficulty ?? 2) ||
        a.exercise.name.localeCompare(b.exercise.name)
    )
    .slice(0, count);
}

// ─── Balance, duración, dopamina, suficiencia ─────────────────────────────

export interface RoutineItem {
  exercise_id: string;
  sets: number;
  reps: number;
  rest: number;
}

/** Segundos de trabajo por serie (time → reps como segundos; reps → reps·3s). */
export function workSeconds(loadType: string, reps: number): number {
  return loadType === 'time' ? reps : reps * 3;
}

/**
 * Duración total estimada (trabajo + descanso) en minutos, redondeada al alza.
 * La métrica que informa, nunca "~X min de descanso" que suena a castigo.
 */
export function computeDurationMin(items: RoutineItem[], catalogById: Map<string, Exercise>): number {
  let total = 0;
  for (const it of items) {
    const ex = catalogById.get(it.exercise_id);
    const work = ex ? workSeconds(ex.load_type, it.reps) : it.reps * 3;
    total += it.sets * (work + it.rest);
  }
  return Math.ceil(total / 60);
}

/** Score de dopamina 0–100: variedad de patrones + gancho + volumen. */
export function computeDopamine(
  items: RoutineItem[],
  catalogById: Map<string, Exercise>,
  focus: SelectorFocus
): number {
  if (items.length === 0) return 0;
  const desired = DESIRED_PATTERNS[focus];
  const presentSet = new Set<Pattern>();
  let lowLoad = 0;
  for (const it of items) {
    const ex = catalogById.get(it.exercise_id);
    if (!ex) continue;
    for (const p of getPatterns(ex)) presentSet.add(p);
    if (ex.cognitive_load === 'low') lowLoad += 1;
  }
  const covered = desired.filter((p) => presentSet.has(p)).length;
  const variety = desired.length > 0 ? covered / desired.length : 0;
  const lowPct = lowLoad / items.length;
  const dopa = Math.round(
    Math.min(100, Math.max(0, 30 + variety * 15 + Math.min(items.length, 6) * 4 + lowPct * 18))
  );
  return dopa;
}

/** Evalúa el umbral de "ya está bien" (spec §04). */
export function isSufficient(
  count: number,
  present: Pattern[],
  durationMin: number,
  focus: SelectorFocus
): boolean {
  const desired = DESIRED_PATTERNS[focus];
  const covered = desired.filter((p) => present.includes(p)).length;
  return (
    count >= SUFFICIENT.minExercises &&
    covered >= Math.min(3, desired.length) &&
    durationMin >= SUFFICIENT.minDuration &&
    durationMin <= SUFFICIENT.maxDuration
  );
}

/** Derivado en cada toque: lo que el UI pinta como mapa + medidor. */
export function deriveBalance(
  items: RoutineItem[],
  catalog: Exercise[],
  focus: SelectorFocus
): Balance {
  const catalogById = new Map(catalog.map((e) => [e.id, e]));

  const presentSet = new Set<Pattern>();
  for (const it of items) {
    const ex = catalogById.get(it.exercise_id);
    if (!ex) continue;
    for (const p of getPatterns(ex)) presentSet.add(p);
  }
  const present = DESIRED_PATTERNS[focus].filter((p) => presentSet.has(p));
  const missing = DESIRED_PATTERNS[focus].filter((p) => !presentSet.has(p));

  const durationMin = computeDurationMin(items, catalogById);
  const workMin = computeDurationMin(
    items.map((it) => ({ ...it, rest: 0 })),
    catalogById
  );
  const dopa = computeDopamine(items, catalogById, focus);

  return {
    present,
    missing,
    durationMin,
    workMin,
    dopa,
    sufficient: isSufficient(items.length, present, durationMin, focus),
    count: items.length,
  };
}

/** Índice invertido pattern→ex[] para filtrar el catálogo en O(k). */
export function buildPatternIndex(catalog: Exercise[]): Map<Pattern, Exercise[]> {
  const index = new Map<Pattern, Exercise[]>();
  for (const ex of catalog) {
    for (const p of getPatterns(ex)) {
      const list = index.get(p);
      if (list) list.push(ex);
      else index.set(p, [ex]);
    }
  }
  return index;
}

export function clearSelectorCache() {
  patternCache.clear();
}
