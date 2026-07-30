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
  full: ['piernas', 'pecho', 'espalda', 'core', 'gluteos', 'full_body'],
  upper: ['pecho', 'espalda', 'hombros', 'brazos', 'full_body'],
  lower: ['piernas', 'gluteos', 'full_body', 'piernas'],
  core: ['core', 'cardio', 'full_body', 'core'],
};
