/**
 * CHISPA — Barrel de agentes.
 *
 * Cada agente vive en su propio archivo para facilitar el mantenimiento y testing:
 *
 * - recovery-engine.ts  → calculateRecoveryScore (40% sueño, 30% energía, 30% estrés)
 * - habit-engine.ts      → calculateConsistency (ventana móvil 30 días, sin rachas)
 * - decision-agent.ts    → DecisionEngine (80% determinista, decide train/restore)
 * - training-agent.ts    → TrainingAgent (genera rutinas con rotación muscular)
 * - motivation-engine.ts → MotivationEngine (mensajes contextuales, 4 estilos)
 * - twin-updater.ts      → updateTwin (EMA, mejor franja, progresión por ejercicio)
 *
 * El LLM (CoachAgent) solo comunica — nunca decide.
 */

export { calculateRecoveryScore } from './recovery-engine';
export { calculateConsistency } from './habit-engine';
export { DecisionEngine } from './decision-agent';
export { TrainingAgent } from './training-agent';
export { MotivationEngine } from './motivation-engine';
export { updateTwin } from './twin-updater';
