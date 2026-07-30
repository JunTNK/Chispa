/**
 * Pack 24 iconos fitness · HugeIcons Stroke Rounded
 * viewBox 0 0 24 24 · strokeWidth=2 · strokeLinecap="round" · strokeLinejoin="round"
 * Todos los SVGs usan stroke="currentColor" para heredar el color del padre (Tailwind: text-amber-500, etc.)
 *
 * Fuente: HugeIcons (https://hugeicons.com) — adaptación stroke-rounded para fitness.
 * Categorías: Grupos Musculares, Equipamiento, Actividades, Métricas y Salud, Bienestar.
 */
export const ICONS = {
  // ── Grupos Musculares ──
  'full-body': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><path d="M12 6v5"/><path d="M8 8l-3 3"/><path d="M16 8l3 3"/><path d="M12 11l-3 7"/><path d="M12 11l3 7"/></svg>`,
  'upper-body': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14c-3 0-5-2-5-5V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2c0 3-2 5-5 5z"/><path d="M7 9l-2 2"/><path d="M17 9l2 2"/><path d="M12 14v4"/><path d="M9 18h6"/></svg>`,
  'lower-body': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><path d="M12 11l-4 7"/><path d="M12 11l4 7"/><path d="M8 18h8"/></svg>`,
  'core': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="5" width="10" height="14" rx="2"/><path d="M12 5v14"/><path d="M7 10h10"/><path d="M7 15h10"/></svg>`,

  // ── Equipamiento ──
  'dumbbell': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h12"/><path d="M4 9v6"/><path d="M20 9v6"/><path d="M7 10v4"/><path d="M17 10v4"/></svg>`,
  'kettlebell': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12a4 4 0 0 1 8 0v4H8v-4z"/><path d="M10 12V8a2 2 0 0 1 4 0v4"/></svg>`,
  'bench-press': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16h16"/><path d="M7 16v-3"/><path d="M17 16v-3"/><path d="M7 13h10"/><path d="M9 10v3"/><path d="M15 10v3"/></svg>`,
  'jump-rope': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12c0-4 3-7 8-7s8 3 8 7"/><path d="M4 12v4h2"/><path d="M20 12v4h-2"/></svg>`,

  // ── Actividades ──
  'running': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="5" r="2"/><path d="M15 7l-3 4 3 5"/><path d="M12 11l-3-1"/><path d="M12 11l3-1"/><path d="M15 16l2 4"/><path d="M15 16l3 1"/></svg>`,
  'cycling': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="15" r="3"/><circle cx="17" cy="15" r="3"/><path d="M7 15l3-6h4l3 6"/><path d="M12 12v3"/></svg>`,
  'swimming': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M4 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><circle cx="6" cy="7" r="2"/></svg>`,
  'yoga': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><path d="M9 13l-3 3"/><path d="M15 13l3 3"/><path d="M10 18h4"/></svg>`,
  'boxing': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a4 4 0 0 0-4 4v2H8a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h6a4 4 0 0 0 4-4V8z"/><path d="M12 14v4"/></svg>`,

  // ── Métricas y Salud ──
  'timer': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M12 5V3"/><path d="M9 3h6"/></svg>`,
  'fire': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c0 4-4 5-4 9a4 4 0 0 0 8 0c0-4-4-5-4-9z"/></svg>`,
  'chart': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V11"/><path d="M9 21V7"/><path d="M13 21V13"/><path d="M17 21V5"/></svg>`,
  'target': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>`,
  'trophy': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"/><path d="M9 17h6v-2a5 5 0 0 0 5-5V6H4v4a5 5 0 0 0 5 5v2z"/><path d="M4 8H2"/><path d="M22 8h-2"/></svg>`,

  // ── Bienestar ──
  'nutrition': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8 2 5 5 5 9c0 5 7 11 7 11s7-6 7-11c0-4-3-7-7-7z"/><path d="M12 2v3"/></svg>`,
  'water': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z"/></svg>`,
  'sleep': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.5A8.5 8.5 0 1 1 11.5 3 6.5 6.5 0 0 0 21 12.5z"/><path d="M16 7l2 2"/><path d="M16 9l2-2"/></svg>`,
  'energy': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  'shaker': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10l-1 16H8L7 4z"/><path d="M7 8h10"/><path d="M7 12h10"/></svg>`,
  'biceps': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18V10a4 4 0 0 1 8 0v8"/><path d="M6 14h8"/></svg>`,
} as const;

/** Tipo unión de los IDs válidos de iconos (24 iconos). */
export type FitnessIconName = keyof typeof ICONS;

/** Metadata de cada icono: nombre amigable, categoría, descripción, paths. */
export const ICONS_META: Record<FitnessIconName, { name: string; category: string; desc: string; paths: number }> = {
  'full-body':    { name: 'Todo el cuerpo',   category: 'Grupos Musculares', desc: 'Full body / Jumping jack', paths: 5 },
  'upper-body':   { name: 'Tren superior',    category: 'Grupos Musculares', desc: 'Upper body / Torso', paths: 5 },
  'lower-body':   { name: 'Tren inferior',    category: 'Grupos Musculares', desc: 'Lower body / Legs', paths: 4 },
  'core':         { name: 'Core y Abs',       category: 'Grupos Musculares', desc: 'Core / Abs grid', paths: 3 },
  'dumbbell':     { name: 'Pesas',            category: 'Equipamiento',      desc: 'Dumbbell / Weights', paths: 5 },
  'kettlebell':   { name: 'Kettlebell',       category: 'Equipamiento',      desc: 'Kettlebell / Russian', paths: 2 },
  'bench-press':  { name: 'Press de banca',   category: 'Equipamiento',      desc: 'Bench press', paths: 6 },
  'jump-rope':    { name: 'Saltar cuerda',    category: 'Equipamiento',      desc: 'Jump rope / Skipping', paths: 2 },
  'running':      { name: 'Correr',           category: 'Actividades',       desc: 'Running / Cardio', paths: 6 },
  'cycling':      { name: 'Ciclismo',         category: 'Actividades',       desc: 'Cycling / Bike', paths: 4 },
  'swimming':     { name: 'Natación',         category: 'Actividades',       desc: 'Swimming / Pool', paths: 3 },
  'yoga':         { name: 'Yoga',             category: 'Actividades',       desc: 'Yoga / Meditation', paths: 4 },
  'boxing':       { name: 'Boxeo',            category: 'Actividades',       desc: 'Boxing / Glove', paths: 2 },
  'timer':        { name: 'Cronómetro',       category: 'Métricas y Salud', desc: 'Timer / Stopwatch', paths: 4 },
  'fire':         { name: 'Calorías',         category: 'Métricas y Salud', desc: 'Calories / Fire', paths: 1 },
  'chart':        { name: 'Progreso',         category: 'Métricas y Salud', desc: 'Progress / Chart', paths: 5 },
  'target':       { name: 'Objetivo',         category: 'Métricas y Salud', desc: 'Target / Goal', paths: 3 },
  'trophy':       { name: 'Logro',            category: 'Métricas y Salud', desc: 'Achievement / Trophy', paths: 5 },
  'nutrition':    { name: 'Nutrición',        category: 'Bienestar',         desc: 'Diet / Apple', paths: 2 },
  'water':        { name: 'Hidratación',      category: 'Bienestar',         desc: 'Hydration / Water drop', paths: 1 },
  'sleep':        { name: 'Descanso',         category: 'Bienestar',         desc: 'Rest / Sleep', paths: 3 },
  'energy':       { name: 'Energía',          category: 'Bienestar',         desc: 'Energy / Power', paths: 1 },
  'shaker':       { name: 'Proteína',         category: 'Bienestar',         desc: 'Protein / Shaker', paths: 3 },
  'biceps':       { name: 'Fuerza',           category: 'Bienestar',         desc: 'Strength / Biceps', paths: 2 },
};

/** Categorías con sus iconos, para navegación / filtros. */
export const ICONS_BY_CATEGORY = [
  { id: 'Grupos Musculares', icons: ['full-body', 'upper-body', 'lower-body', 'core'] as FitnessIconName[] },
  { id: 'Equipamiento',      icons: ['dumbbell', 'kettlebell', 'bench-press', 'jump-rope'] as FitnessIconName[] },
  { id: 'Actividades',       icons: ['running', 'cycling', 'swimming', 'yoga', 'boxing'] as FitnessIconName[] },
  { id: 'Métricas y Salud',  icons: ['timer', 'fire', 'chart', 'target', 'trophy'] as FitnessIconName[] },
  { id: 'Bienestar',         icons: ['nutrition', 'water', 'sleep', 'energy', 'shaker', 'biceps'] as FitnessIconName[] },
] as const;
