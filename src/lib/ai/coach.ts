import type { DigitalTwin, Profile, Workout, DecisionEngineOutput } from '@/types';
import { LocalLLM } from './local-llm';

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
  checkins: Record<string, any>;
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
  private llm: LocalLLM;

  constructor(context: CoachContext) {
    this.context = context;
    this.llm = LocalLLM.getInstance();
  }

  /** Update context without recreating agent */
  updateContext(partial: Partial<CoachContext>) {
    this.context = { ...this.context, ...partial };
  }

  /** Returns the initial greeting */
  getGreeting(): string {
    const style = this.context.twin.motivation_style;
    const name = this.context.profile.name;
    const hasLlm = this.llm.isLoaded;
    const templates: Record<string, string> = {
      data: `Hola ${name}. Soy tu coach${hasLlm ? ', ahora con IA real' : ''}. Los algoritmos deciden, yo te lo explico con tus datos. Pregúntame lo que quieras.`,
      energy: `¡Hola ${name}! ⚡ ${hasLlm ? 'Conecté mi IA para responderte mejor. ' : ''}Listo para acompañarte. Los números deciden, yo pongo las palabras.`,
      direct: `Hola ${name}. ${hasLlm ? 'IA activa — respuestas más precisas. ' : ''}Pregúntame y te respondo con datos reales, sin adornos.`,
      calm: `Hola ${name}. ${hasLlm ? 'Ahora con IA, puedo conversar mejor. ' : ''}Aquí estoy, sin prisa. Cuando quieras, pregúntame.`,
    };
    return templates[style] || templates.data;
  }

  /** Builds the system prompt from the current context */
  private buildSystemPrompt(): string {
    const c = this.context;
    const p = c.profile;
    const t = c.twin;
    const d = c.plan;

    const bestHour = this._bestHourStr();
    const style = STYLE_LABELS[t.motivation_style] || t.motivation_style;

    return `Eres CHISPA Coach, un asistente de fitness experto para personas con TDAH y neurodivergencias.

## REGLAS ESENCIALES
1. 🎯 ERES el 5% LLM que COMUNICA. El 80% son algoritmos deterministas (Decision Engine). El 15% son agentes especializados (Training, Recovery, Habit, Motivation).
2. 🚫 NUNCA generes rutinas de ejercicio, planes de entrenamiento ni diagnósticos médicos.
3. 📊 Siempre basas tus respuestas en LOS DATOS del usuario que te proporcionamos abajo.
4. 💯 Si no sabes algo, DILO HONESTAMENTE. No inventes ni alucines.
5. 🗣️ Usa un tono ${style}. Sé natural y conversacional.
6. 🇪🇸 Responde SIEMPRE en español, con emojis con moderación.

## DATOS DEL PERFIL DEL USUARIO
- Nombre: ${p.name}
- Nivel: ${p.level}
- Equipo: ${EQUIPMENT_LABELS[p.equipment] || p.equipment}
- Neurotipo: ${p.neurotype}
- Objetivo: ${p.goal}
- Días por semana: ${p.days_per_week}
- Estilo de motivación: ${style}

## PLAN DE HOY ${d ? `(confianza: ${d.confidence ?? 50}%)` : '(pendiente de check-in)'}
${d ? `- Acción: ${d.action === 'train' ? 'Entrenar' : 'Recuperación activa'}
- Intensidad: ${INTENSITY_LABELS[d.intensity] || d.intensity}
- Duración: ${d.duration} min
- Razones del motor: ${d.reasons.join(', ')}
- Score recuperación: ${d.recovery_score ?? 'N/A'}/100` : '- Haz el check-in para obtener el plan del día'}

## ESTADÍSTICAS DEL DIGITAL TWIN
- Tasa de finalización: ${Math.round(t.patterns.completion_rate * 100)}%
- Duración promedio: ${Math.round(t.patterns.avg_duration)} min
- ${bestHour}
- Tasa de abandono: ${Math.round(t.patterns.abandon_rate * 100)}%
- Estilo de entrenamiento: ${t.training_style}

## HISTORIAL RECIENTE
- Sesiones completadas (últimos 30d): ${c.workouts.filter(w => w.completed_rate >= 0.5).length}
- Última sesión: ${c.workouts[0] ? `${c.workouts[0].date} — ${c.workouts[0].duration} min, completado ${Math.round(c.workouts[0].completed_rate * 100)}%` : 'Ninguna aún'}

## TONO POR ESTILO
- data: Responde con datos concretos, lógica clara, sin rodeos.
- energy: Energético, motivador, usa emojis ⚡🔥, lenguaje positivo.
- direct: Directo, sin adornos, al grano. Frases cortas.
- calm: Tranquilo, pausado, sin presiones. Lenguaje suave.

Responde de forma natural y conversacional.`;
  }

  /** Main reply — uses LLM if available, falls back to rule-based */
  async reply(userInput: string): Promise<CoachResponse> {
    const lower = userInput.toLowerCase();

    // Use LLM if loaded (singleton, always fresh)
    if (this.llm.isLoaded) {
      try {
        const system = this.buildSystemPrompt();
        const result = await this.llm.chat(
          [{ role: 'user', content: userInput }],
          system,
          { temperature: 0.7, max_new_tokens: 300 }
        );
        return {
          text: result,
          data_used: ['local_llm (Qwen2.5-1.5B)', 'profile', 'digital_twin', 'decision_engine'],
          confidence: 0.85,
        };
      } catch (err) {
        console.warn('LLM reply failed, falling back to rule-based:', err);
        // Fall through to rule-based
      }
    }

    // ── Rule-based fallback ──
    // Ensure minimum delay so typing dots show
    const [result] = await Promise.all([
      this._ruleBasedReply(lower),
      new Promise(r => setTimeout(r, 400)),
    ]);
    return result;
  }

  /** Rule-based fallback (original implementation) */
  private _ruleBasedReply(lower: string): CoachResponse {
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

  /* ── Private responders (unchanged) ── */

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
      text: `El motor decidió hoy **${INTENSITY_LABELS[d.intensity]}** (${d.duration} min). Razones: ${d.reasons?.join(' · ') ?? ''}. Yo no decido nada: solo te lo traduzco a palabras.`,
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
    const today = new Date().toISOString().slice(0, 10);
    const checkin = this.context.checkins[today] ?? null;
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
