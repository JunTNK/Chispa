/**
 * 📓 Bitácora — Journal entries
 * Strings for the journal/history screen showing past workout sessions.
 * Patrón ND: celebra movimiento, no presión ni rachas.
 */
type LangKey = 'es' | 'en';

export const journalTranslations: Record<LangKey, Record<string, string>> = {
  es: {
    // Header
    'Bitácora': 'Bitácora',
    'REGISTRO DE MOVIMIENTO': 'REGISTRO DE MOVIMIENTO',

    // Empty state
    'Aún no hay sesiones aquí. Cuando te muevas, aparecerán — sin presión.':
      'Aún no hay sesiones aquí. Cuando te muevas, aparecerán — sin presión.',

    // Week summary
    '{week} · {sessions} sesiones · {minutes} min': '{week} · {sessions} sesiones · {minutes} min',

    // Session row
    '{duration} min · {exercises} ejercicios': '{duration} min · {exercises} ejercicios',

    // Intensity chips
    'minimal': 'Minimal',
    'light': 'Suave',
    'standard': 'Estándar',
    'push': 'Intenso',
  },
  en: {
    'Bitácora': 'Journal',
    'REGISTRO DE MOVIMIENTO': 'MOVEMENT LOG',

    'Aún no hay sesiones aquí. Cuando te muevas, aparecerán — sin presión.':
      "No sessions here yet. When you move, they'll appear — no pressure.",

    '{week} · {sessions} sesiones · {minutes} min': '{week} · {sessions} sessions · {minutes} min',

    '{duration} min · {exercises} ejercicios': '{duration} min · {exercises} exercises',

    'minimal': 'Minimal',
    'light': 'Light',
    'standard': 'Standard',
    'push': 'Intense',
  },
};
