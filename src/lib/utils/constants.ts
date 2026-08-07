export const GOAL_LABELS: Record<string, string> = {
  fuerza: 'Fuerza y músculo',
  energia: 'Energía y salud',
  grasa: 'Perder grasa',
};

export const LEVEL_LABELS: Record<string, string> = {
  inicio: 'Empezando',
  medio: 'Intermedio',
  regular: 'Avanzado',
};

export const EQUIP_LABELS: Record<string, string> = {
  ninguno: 'Sin equipo',
  mancuernas: 'Mancuernas',
  gimnasio: 'Gimnasio',
};

/** Alias de EQUIP_LABELS para consistencia con nombres usados en coach.ts */
export const EQUIPMENT_LABELS = EQUIP_LABELS;

export const NEURO_LABELS: Record<string, string> = {
  'adh-c': 'TDAH combinado',
  'adh-i': 'TDAH inatento',
  audhd: 'AuDHD',
  spd: 'Alta sensibilidad',
  curious: 'Explorando',
  other: 'Otra neurodivergencia',
};

export const DAYS_LABELS: Record<string, string> = {
  '2-3': '2-3 días',
  '4-5': '4-5 días',
  flex: 'Flexible',
};

export const INTENSITY_LABELS: Record<string, string> = {
  minimal: 'Suave',
  light: 'Ligero',
  standard: 'Estándar',
  push: 'Progreso',
};

/** 🎨 Colores consistentes para los chips de intensidad (reutilizado en JournalScreen + SessionScreen). */
export const INTENSITY_COLORS: Record<string, string> = {
  minimal: 'bg-[#a78bfa]/20 text-[#a78bfa]',
  light: 'bg-[#fbbf24]/20 text-[#fbbf24]',
  standard: 'bg-[#34d399]/20 text-[#34d399]',
  push: 'bg-[#f87171]/20 text-[#f87171]',
};

export const FOCUS_LABELS: Record<string, string> = {
  full: 'Cuerpo completo',
  upper: 'Tren superior',
  lower: 'Tren inferior',
  core: 'Core y cardio',
};

export const STYLE_LABELS: Record<string, string> = {
  data: 'Datos y lógica',
  energy: 'Energía',
  direct: 'Directo',
  calm: 'Calma',
};

export const SEX_LABELS: { es: Record<string, string>; en: Record<string, string> } = {
  es: {
    masculine: 'Hombre',
    feminine: 'Mujer',
  },
  en: {
    masculine: 'Male',
    feminine: 'Female',
  },
};

export const UNITS_LABELS: Record<string, string> = {
  imperial: 'Imperial (lb · ft)',
  metric: 'Métrico (kg · cm)',
};

export const TITLES: Record<string, string> = {
  minimal: 'Movimiento suave',
  light: 'Sesión ligera',
  standard: 'Tu entrenamiento está listo',
  push: 'Día para progresar',
};

export const REC_WORDS: Record<string, string> = {
  75: 'Óptimo',
  55: 'Listo',
  35: 'A medio gas',
  0: 'Pide calma',
};

export const FOCUS_MUSCLES: Record<string, string[]> = {
  // Alineado con el registro canónico de muscles.ts (los 8 músculos del catálogo).
  full: ['piernas', 'gluteos', 'pecho', 'espalda', 'hombros', 'brazos', 'core', 'cardio'],
  upper: ['pecho', 'espalda', 'hombros', 'brazos', 'core'],
  lower: ['piernas', 'gluteos', 'core'],
  core: ['core', 'cardio', 'piernas', 'gluteos'],
};
