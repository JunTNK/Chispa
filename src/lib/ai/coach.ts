import type { DigitalTwin, Profile, Workout, DecisionEngineOutput } from '@/types';

/* ─── Interfaces ─── */

export interface CoachResponse {
  text: string;
  data_used: string[];
  confidence: number;
}

interface CoachContext {
  profile: Profile;
  twin: DigitalTwin;
  plan: (DecisionEngineOutput & { date?: string; workout?: any; message?: string; done?: boolean; result?: any }) | null;
  workouts: Workout[];
}

/* ─── Labels (reused from constants, defined here for self-containment) ─── */

const INTENSITY_LABELS: Record<string, string> = {
  minimal: 'Suave', light: 'Ligero', standard: 'Estándar', push: 'Progreso',
};
const FOCUS_LABELS: Record<string, string> = {
  full: 'Cuerpo completo', upper: 'Tren superior', lower: 'Tren inferior', core: 'Core y cardio',
};
const STYLE_LABELS: Record<string, string> = {
  data: 'Datos y lógica', energy: 'Energía', direct: 'Directo', calm: 'Calma',
};
const EQUIPMENT_LABELS: Record<string, string> = {
  ninguno: 'Sin equipo', mancuernas: 'Mancuernas', gimnasio: 'Gimnasio',
};

/* ─── CoachAgent ─── */

export class CoachAgent {
  private context: CoachContext;

  constructor(context: CoachContext) {
    this.context = context;
  }

  /** Returns the initial greeting */
  getGreeting(): string {
    const style = this.context.twin.motivation_style;
    const name = this.context.profile.name;
    const templates: Record<string, string> = {
      data: `Hola ${name}. Soy tu coach. Los algoritmos deciden, yo te lo explico con tus datos. Pregúntame lo que quieras.`,
      energy: `¡Hola ${name}! ⚡ Listo para acompañarte. Los números deciden, yo pongo las palabras.`,
      direct: `Hola ${name}. Pregúntame y te respondo con datos reales, sin adornos.`,
      calm: `Hola ${name}. Aquí estoy, sin prisa. Cuando quieras, pregúntame.`,
    };
    return templates[style] || templates.data;
  }

  /** Returns a context-aware reply with data_used and confidence */
  reply(userInput: string): CoachResponse {
    const lower = userInput.toLowerCase();

    if (/(por qu|porque|raz[oó]n|explica)/.test(lower)) return this.explainPlan();
    if (/(cansad|ganas|pereza|motiv|anim|agotad|flojera)/.test(lower)) return this.addressMotivation();
    if (/(consisten|progres|cómo voy|como voy|datos|n[úu]meros|numeros)/.test(lower)) return this.showProgress();
    if (/(dolor|duele|lesi[oó]n|molestia|lastim)/.test(lower)) return this.addressPain();
    if (/(twin|gemelo|memoria|perfil)/.test(lower)) return this.explainTwin();
    if (/(funciona|chispa|arquitectura|ia|inteligencia)/.test(lower)) return this.explainArchitecture();
    if (/(rutina|ejercici|entren|plan|sesi[oó]n)/.test(lower)) return this.explainWorkout();
    if (/(sueñ|suen|dormir|estres|estr[ée]s|ansie|descans)/.test(lower)) return this.explainRecovery();
    if (/(consejo|tip|ayuda|recomien)/.test(lower)) return this.giveAdvice();
    if (/(hola|buenas|hey|qu[eé] tal|que tal)/.test(lower)) {
      return {
        text: `¡Hola ${this.context.profile.name}! Pregúntame por tu plan de hoy, tu progreso o cómo funciona el motor. Te respondo con tus datos reales.`,
        data_used: [],
        confidence: 1,
      };
    }

    const d = this.context.plan;
    const next = d?.action === 'restore' ? 'un descanso activo' : `tu sesión de ${d?.duration} min`;
    return {
      text: `No tengo una respuesta perfecta para eso — y prefiero decírtelo antes que inventarla. Lo que sí sé con datos: tu próximo paso es ${next}. ¿Te explico el porqué?`,
      data_used: ['decision_engine'],
      confidence: 0.7,
    };
  }

  /* ── Private responders ── */

  private explainPlan(): CoachResponse {
    const d = this.context.plan;
    if (!d) {
      return {
        text: 'Aún no hay plan para hoy. Haz el check-in para que el motor decida.',
        data_used: [],
        confidence: 1,
      };
    }
    return {
      text: `El motor decidió hoy **${INTENSITY_LABELS[d.intensity]}** (${d.duration} min). Razones: ${d.reasons.join(' · ')}. Yo no decido nada: solo te lo traduzco a palabras.`,
      data_used: ['decision_engine', 'recovery_score', 'consistency', 'twin_patterns'],
      confidence: (d.confidence ?? 50) / 100,
    };
  }

  private addressMotivation(): CoachResponse {
    const d = this.context.plan;
    const rec = d?.recovery_score ?? 60;
    if (rec < 55) {
      return {
        text: `Con recuperación ${rec}/100, esa sensación tiene base física, no es "falta de disciplina". Opción mínima viable: ${d?.duration} min en modo suave. Empezar es el 90%. ¿Activamos el modo mínimo?`,
        data_used: ['recovery_score', 'decision_engine'],
        confidence: 0.9,
      };
    }
    return {
      text: `Tu recuperación es ${rec}/100: físicamente estás bien. A veces la chispa se enciende *después* de empezar. Prueba solo el primer ejercicio. Si a los 2 min no puedes, paramos y lo guardamos.`,
      data_used: ['recovery_score'],
      confidence: 0.85,
    };
  }

  private showProgress(): CoachResponse {
    const twin = this.context.twin;
    const total = this.context.workouts.filter((w) => w.completed_rate >= 0.5).length;
    const c = twin.patterns.completion_rate;
    return {
      text: `**Consistencia 30 días: ${Math.round(c * 100)}%** (${total} sesiones completadas). ${
        c >= 0.6
          ? 'Estás construyendo hábito real: la constancia importa más que la intensidad.'
          : 'Cada sesión que hagas sube el porcentaje. Aquí no hay rachas que romper: solo datos que mejoran.'
      }`,
      data_used: ['habit_engine', 'workout_history', 'digital_twin'],
      confidence: 1,
    };
  }

  private addressPain(): CoachResponse {
    return {
      text: 'Importante: no soy médico y no voy a inventar un diagnóstico. Si el dolor es agudo o articular, para y consulta a un profesional. Si es fatiga muscular normal, el motor puede generar hoy una sesión suave o un día de recuperación activa.',
      data_used: ['safety_guardrails'],
      confidence: 1,
    };
  }

  private explainTwin(): CoachResponse {
    const t = this.context.twin;
    return {
      text: `Tu Digital Twin es tu memoria viva: ahora mismo sabe que completas el ${Math.round(t.patterns.completion_rate * 100)}% de tus sesiones, que tu mejor franja es ${this._bestHourStr()} y que respondes a mensajes tipo **${STYLE_LABELS[t.motivation_style]}**. Se actualiza tras cada entrenamiento.`,
      data_used: ['digital_twin', 'behavior_memory', 'motivation_engine'],
      confidence: 1,
    };
  }

  private explainArchitecture(): CoachResponse {
    return {
      text: 'CHISPA es 80% algoritmos deterministas (el motor que decide), 15% modelos especializados (agentes de recuperación, hábitos y motivación) y 5% LLM — que soy yo, y solo comunico. Nunca genero rutinas ni tomo decisiones críticas.',
      data_used: ['architecture_docs'],
      confidence: 1,
    };
  }

  private explainWorkout(): CoachResponse {
    const d = this.context.plan;
    const w = this.context.plan?.workout;
    if (!d || !w) {
      return {
        text: 'Haz el check-in primero para que el motor cree tu plan.',
        data_used: [],
        confidence: 1,
      };
    }
    return {
      text: `Tu plan lo crea el Training Engine: filtra por tu equipo (${EQUIPMENT_LABELS[this.context.profile.equipment]}), rota grupos musculares para no sobrecargar, y ajusta series/reps según tu recuperación de hoy (${d.recovery_score ?? '?'}/100). Hoy toca: ${d.duration} min, enfoque ${FOCUS_LABELS[w.focus]}.`,
      data_used: ['training_engine', 'decision_engine', 'equipment_filter', 'muscle_rotation'],
      confidence: 0.95,
    };
  }

  private explainRecovery(): CoachResponse {
    const checkin = this.context.workouts.find(
      (w) => w.date === new Date().toISOString().slice(0, 10)
    );
    return {
      text: `El sueño pesa 40% en tu Recovery Score, la energía 30% y el estrés 30%. Tu check-in de hoy: ${checkin ? 'registrado' : 'pendiente'}. Con eso el motor ya adaptó la sesión — no tienes que decidir nada.`,
      data_used: ['recovery_engine', 'checkin_data'],
      confidence: 0.9,
    };
  }

  private giveAdvice(): CoachResponse {
    const t = this.context.twin;
    const insights = [
      `Prefieres sesiones de ~${Math.round(t.patterns.avg_duration)} min`,
      `Tu mejor franja: ${this._bestHourStr()}`,
      `Completas el ${Math.round(t.patterns.completion_rate * 100)}% de tus sesiones`,
    ];
    return {
      text: `Mi consejo basado en tus datos: ${insights[0].toLowerCase()}. Y la regla de los 2 minutos: si no hay ganas, comprométete solo a empezar. El motor ya hizo el plan; tú solo da el primer paso.`,
      data_used: ['digital_twin', 'habit_engine'],
      confidence: 0.9,
    };
  }

  private _bestHourStr(): string {
    const hours = this.context.twin.patterns.best_hours;
    const entries = Object.entries(hours).sort((a, b) => b[1] - a[1]);
    return entries.length ? `Sobre las ${entries[0][0]}:00` : '—';
  }
}
