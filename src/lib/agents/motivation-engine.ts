/**
 * Motivation Engine — Genera mensajes motivacionales contextuales.
 *
 * 4 estilos: data, energy, direct, calm
 * El usuario puede elegir su estilo preferido en la pantalla de resumen,
 * y el Digital Twin aprende y se adapta.
 *
 * Los mensajes son plantillas deterministas (el LLM nunca los genera).
 * El engine es puro: acepta `lang` y devuelve el string final interpolado
 * en ese idioma. Cada rama mantiene su plantilla ES byte-a-byte idéntica al
 * original (tests anclados preservados) y una plantilla EN equivalente.
 *
 * Mantiene los substrings clave que fijan los tests (Recuperación, Consistencia,
 * chispa, Sin prisa, descanso).
 */
import type { Lang } from '@/lib/i18n/use-t';

const BAND: Record<string, { es: string; en: string }> = {
  'on a roll': { es: 'en racha', en: 'crushing' },
  'building up': { es: 'en construcción', en: 'warm-up' },
  'getting started': { es: 'de arranque', en: 'fresh' },
  reconnecting: { es: 'de reconexión', en: 'reconnecting' },
};

function bandLabel(consistencyPct: number, lang: Lang): string {
  let k: keyof typeof BAND;
  if (consistencyPct >= 75) k = 'on a roll';
  else if (consistencyPct >= 50) k = 'building up';
  else if (consistencyPct >= 25) k = 'getting started';
  else k = 'reconnecting';
  return lang === 'en' ? BAND[k].en : BAND[k].es;
}

function timeOfDay(lang: Lang): string {
  const h = new Date().getHours();
  return lang === 'en'
    ? (h < 12 ? 'morning' : h < 20 ? 'afternoon' : 'evening')
    : (h < 12 ? 'mañana' : h < 20 ? 'tarde' : 'noche');
}

export class MotivationEngine {
  static message(
    style: 'data' | 'energy' | 'direct' | 'calm',
    recovery: number,
    consistencyPct: number,
    duration: number,
    lang: Lang = 'es'
  ): string {
    const good = recovery >= 70;
    const band = bandLabel(consistencyPct, lang);
    const cond = good
      ? (lang === 'en' ? 'Optimal conditions' : 'Condiciones óptimas')
      : (lang === 'en' ? 'Manageable conditions' : 'Condiciones gestionables');

    switch (style) {
      case 'data': {
        const es = `Recuperación ${recovery}/100 · Consistencia ${consistencyPct}%. ${cond}: ${duration} min de sesión. Momento ${band} — los datos dicen que ${duration} min hoy te acercan a la meta.`;
        const en = `Recovery ${recovery}/100 · Consistency ${consistencyPct}%. ${cond}: ${duration} min session. ${band} — the data says ${duration} min today moves you toward your goal.`;
        return lang === 'en' ? en : es;
      }
      case 'energy':
        return good
          ? (lang === 'en'
            ? `You're at ${recovery}% today! ${duration} min to spark it. ${band} session: every rep counts.`
            : `¡Hoy estás al ${recovery}%! ${duration} minutos, a encender la chispa. Sesión ${band}: cada rep cuenta.`)
          : (lang === 'en'
            ? `${recovery}% is enough to start. The spark ignites through movement — ${duration} min and done.`
            : `Un ${recovery}% basta para empezar. La chispa se enciende con el movimiento — ${duration} min y listo.`);
      case 'direct':
        return lang === 'en'
          ? `${recovery}/100. ${duration} min. ${band} session. Start.`
          : `${recovery}/100. ${duration} minutos. Sesión ${band}. Empieza.`;
      case 'calm': {
        const tod = timeOfDay(lang);
        const es = `Tu cuerpo está al ${recovery}%. Sin prisa: ${duration} minutos a tu ritmo. Es ${tod}: hoy lo importante es moverse, no rendir.`;
        const en = `Your body is at ${recovery}%. No rush: ${duration} min at your pace. It's ${tod}: today, moving matters more than performing.`;
        return lang === 'en' ? en : es;
      }
    }
  }

  static restMessage(style: string, lang: Lang = 'es'): string {
    switch (style) {
      case 'data':
        return lang === 'en'
          ? `Recovery below 35. The data says: active rest today.`
          : `Recuperación por debajo de 35. Los datos dicen: descanso activo hoy.`;
      case 'energy':
        return lang === 'en'
          ? `Today the spark recharges by resting. Tomorrow you're back at it`
          : `Hoy la chispa se recarga descansando. Mañana vuelves con todo`;
      case 'direct':
        return lang === 'en'
          ? `Low recovery. Today: move gently. Nothing more.`
          : `Recuperación baja. Hoy: moverse suave. Nada más.`;
      case 'calm':
        return lang === 'en'
          ? `Your body asks for calm. Listening is training too.`
          : `Tu cuerpo pide calma. Escucharlo también es entrenar.`;
      default:
        return lang === 'en'
          ? `Today calls for active rest. Tomorrow we come back stronger.`
          : `Hoy toca descanso activo. Mañana volvemos más fuertes.`;
    }
  }

  /** Nudge antes del check-in: pide los datos que más pesan. */
  static checkinPrompt(style: string, lang: Lang = 'es'): string {
    switch (style) {
      case 'data':
        return lang === 'en'
          ? `Three numbers fine-tune your plan: sleep, energy, stress.`
          : `Tres números bastan para afinar el plan: sueño, energía y estrés.`;
      case 'energy':
        return lang === 'en'
          ? `30 seconds and the engine tells you how to charge today. Let's go!`
          : `30 segundos y el motor te dice cómo cargar hoy. ¡Vamos!`;
      case 'direct':
        return lang === 'en'
          ? `Check-in. Sleep, energy, stress. Go.`
          : `Check-in. Sueño, energía, estrés. Va.`;
      case 'calm':
        return lang === 'en'
          ? `No rush: tell me how you slept, your energy, and today's stress.`
          : `Sin prisa: cuenta cómo duermes, tu energía y el estrés de hoy.`;
      default:
        return lang === 'en'
          ? `Tell me how you're feeling today: sleep, energy, stress.`
          : `Cuéntame cómo llegas hoy: sueño, energía y estrés.`;
    }
  }

  /** Mensaje post-sesión según tasa de finalización. */
  static sessionMessage(style: string, rate: number, lang: Lang = 'es'): string {
    const pct = Math.round(rate * 100);
    switch (style) {
      case 'data':
        return lang === 'en'
          ? `Session logged at ${pct}%. The twin recorded it: that's measurable progress.`
          : `Sesión cerrada al ${pct}%. El twin ya lo registró: eso es progreso medible.`;
      case 'energy':
        return lang === 'en'
          ? `${pct}% of the session done! Every minute sparked.`
          : `¡${pct}% de la sesión hecha! Cada minuto encendió la chispa.`;
      case 'direct':
        return lang === 'en'
          ? `${pct}%. Logged. More tomorrow.`
          : `${pct}%. Registrado. Mañana, más.`;
      case 'calm':
        return lang === 'en'
          ? `You moved your body ${pct}% of the plan. That's taking care of yourself.`
          : `Has movido tu cuerpo ${pct}% de lo planeado. Eso es cuidarte.`;
      default:
        return lang === 'en'
          ? `${pct}% — well done! Session recorded.`
          : `Sesión registrada al ${pct}%. ¡Bien hecho!`;
    }
  }
}
