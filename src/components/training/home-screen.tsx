'use client';

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT, useLocale } from '@/lib/i18n/use-t';
import {
  DecisionEngine,
  TrainingAgent,
  MotivationEngine,
  calculateRecoveryScore,
  calculateConsistency,
} from '@/lib/agents/decision-engine';
import { todayKey, recWord } from '@/lib/utils/helpers';
import { energyBudget } from '@/lib/utils/energy-budget';
import {
  anchorLabel,
  currentAnchorWindow,
  anchorNudgeKey,
} from '@/lib/utils/anchor-utils';
import type { WorkoutExercise, Workout, CheckIn, EmotionalMode } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RecRing } from '@/components/ui/ring';
import {
  Zap,
  Dumbbell,
  Footprints,
  StretchHorizontal,
  Wind,
  Battery,
  Sparkles,
  TrendingUp,
   Lightbulb,
    Plus,
    Calendar,
    Settings,
    BookMarked,
    Armchair,
    Waves,
 } from 'lucide-react';
import { Icons } from '@/components/ui/icons';
import { WarningIcon } from '@/components/ui/icons-rpg';
import { supabaseSync } from '@/lib/sync/supabase-sync';
import { computeTotalXp, computeLevel } from '@/lib/awards/achievements';
import { logError } from '@/lib/utils/logger';
import { useExercises } from '@/lib/utils/use-exercises';
import { ExerciseImage, getExerciseVisual } from '@/lib/utils/exercise-visuals';
import { MyRoutines } from '@/components/training/my-routines';
import { LiveNowCard } from '@/components/training/live-now-card';
import {
  deduceEmotionalMode,
  modeInfo,
  mapTapCheckinToModel,
  needsEmotionalSafety,
} from '@/lib/emotional-mode';
import { ChevronLeft, Sprout } from 'lucide-react';

type ActionTint = 'orange' | 'green' | 'purple';

const ACTION_TINT: Record<ActionTint, { icon: string; border: string }> = {
  orange: { icon: 'text-[#ffb454]', border: 'hover:border-[#ffb454]/40' },
  green: { icon: 'text-[#34d399]', border: 'hover:border-[#34d399]/40' },
  purple: { icon: 'text-[#a78bfa]', border: 'hover:border-[#a78bfa]/40' },
};

type RawDecision = ReturnType<typeof DecisionEngine.decide>;

/**
 * Salvaguardas del plan (spec CHISPA-UX §3):
 * - El modo emocional se DEDUCE del check-in (nunca se elige como menú).
 * - Caos (ansiedad/activación alta) → nunca HIIT: el motor propone recarga
 *   (respiración, estiramiento, silla, grounding + disclaimer profesional).
 * - Silla/Microhábito → intensidad mínima, sesión corta.
 * - El tiempo elegido es un límite: nunca una sesión más larga que lo disponible.
 * - Victoria garantizada día 1: sin historial, la primera rutina es minimal de 2 min.
 */
function applyModeGuardrails(
  decision: RawDecision,
  checkin: CheckIn,
  workouts: Workout[]
): { decision: RawDecision; mode: EmotionalMode; restoreOnly: boolean } {
  const mode = deduceEmotionalMode(checkin);
  if (mode === 'caos') {
    // Seguridad emocional: el plan es de recarga, nunca una sesión de HIIT.
    return { decision: { ...decision, action: 'restore' as const }, mode, restoreOnly: true };
  }
  let d = decision;
  if (needsEmotionalSafety(mode)) {
    d = { ...d, intensity: 'minimal', duration: Math.min(d.duration, 5) };
  }
  if (checkin.time && d.duration > checkin.time) {
    d = { ...d, duration: checkin.time };
  }
  if (workouts.length === 0) {
    d = { ...d, intensity: 'minimal', duration: Math.min(d.duration, 2) };
  }
  return { decision: d, mode, restoreOnly: false };
}

/** Card de acción del grid de 3 (Crear rutina / Bitácora). Igual talla que Registro rápido. */
function ActionCard({
  icon: Icon,
  tint,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tint: ActionTint;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  const tintClasses = ACTION_TINT[tint];
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`h-full w-full rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 flex flex-col gap-2 text-left min-h-[84px] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] ${tintClasses.border}`}
    >
      <Icon size={18} className={tintClasses.icon} />
      <span className="block text-xs font-bold">{title}</span>
      <span className="block text-[10px] text-[var(--muted)] leading-tight">{subtitle}</span>
    </motion.button>
  );
}

/* ─── Check-in visual de 3 taps (spec CHISPA-UX §3) ───
 * El usuario informa con toques: dónde estás · energía · tiempo (+cabeza opcional).
 * CHISPA deduce el modo emocional y decide. Nunca un menú de modos. */
type CheckinLocation = 'casa' | 'gym' | 'calle' | 'silla';
type CheckinEnergy = 'baja' | 'media' | 'alta';
type CheckinTime = 2 | 5 | 10;
type CheckinHead = 'chispa' | 'caos' | 'calma' | 'agotado';

const LOC_OPTIONS: { value: CheckinLocation; emoji: string; labelKey: string; descKey: string }[] = [
  { value: 'casa', emoji: '🏠', labelKey: 'Casa', descKey: 'Sin equipamiento, donde estás' },
  { value: 'gym', emoji: '🏋️', labelKey: 'Gimnasio', descKey: 'Con máquinas o pesas' },
  { value: 'calle', emoji: '🌳', labelKey: 'Calle', descKey: 'Al aire libre' },
  { value: 'silla', emoji: '🪑', labelKey: 'Silla o cama', descKey: 'Todo sin levantarte' },
];

const ENERGY_OPTIONS: { value: CheckinEnergy; emoji: string; labelKey: string; descKey: string }[] = [
  { value: 'baja', emoji: '🪫', labelKey: 'Baja', descKey: 'Poca batería hoy' },
  { value: 'media', emoji: '🔋', labelKey: 'Media', descKey: 'Algo de gasolina' },
  { value: 'alta', emoji: '⚡', labelKey: 'Alta', descKey: 'Energía de sobra' },
];

const TIME_OPTIONS: { value: CheckinTime; labelKey: string; descKey: string }[] = [
  { value: 2, labelKey: '2 min', descKey: 'Lo justo para encender' },
  { value: 5, labelKey: '5 min', descKey: 'Un respiro para el cuerpo' },
  { value: 10, labelKey: '10+ min', descKey: 'Con tiempo, sin prisa' },
];

const HEAD_OPTIONS: { value: CheckinHead; emoji: string; labelKey: string; descKey: string }[] = [
  { value: 'chispa', emoji: '✨', labelKey: 'Chispa', descKey: 'Con ganas de empezar' },
  { value: 'caos', emoji: '🌀', labelKey: 'Caos', descKey: 'La cabeza va a mil' },
  { value: 'calma', emoji: '🌙', labelKey: 'Calma', descKey: 'Tranquilo, centrado' },
  { value: 'agotado', emoji: '🛌', labelKey: 'Agotado', descKey: 'Sin batería mental' },
];

function CheckInCard() {
  const t = useT();
  // Wizard de 3 taps (+1 opcional): ubicación → energía → tiempo → cabeza.
  const [step, setStep] = React.useState(0);
  const [location, setLocation] = React.useState<CheckinLocation | null>(null);
  const [energy, setEnergy] = React.useState<CheckinEnergy | null>(null);
  const [time, setTime] = React.useState<CheckinTime | null>(null);
  const [head, setHead] = React.useState<CheckinHead | null>(null);
  const setCheckin = useStore((s) => s.setCheckin);
  const logEvent = useStore((s) => s.logEvent);
  const setPlan = useStore((s) => s.setPlan);
  const lang = useStore((s) => s.lang);
  const profile = useStore((s) => s.profile);
  const twin = useStore((s) => s.twin);
  const workouts = useStore((s) => s.workouts);

  // Vista previa orientativa (no decide): con lo respondido hasta ahora.
  const model = mapTapCheckinToModel({ energy: energy ?? 'media', head: head ?? undefined });
  const rec = calculateRecoveryScore({
    user_id: '', date: todayKey(), sleep: model.sleep, energy: model.energy, stress: model.stress, recovery_score: 0, created_at: '',
  });

  /** Confirma el check-in con la cabeza elegida (o undefined si se saltó). */
  const commit = (finalHead?: CheckinHead | null) => {
    useStore.getState().trackDecision(6);
    const modelNum = mapTapCheckinToModel({
      energy: energy ?? 'media',
      head: finalHead ?? head ?? undefined,
    });
    // El recovery se recalcula con el modelo FINAL (la preview del render usa
    // el estado anterior, p. ej. sin la cabeza recién elegida).
    const finalRec = calculateRecoveryScore({
      user_id: '',
      date: todayKey(),
      sleep: modelNum.sleep,
      energy: modelNum.energy,
      stress: modelNum.stress,
      recovery_score: 0,
      created_at: '',
    });
    const checkin: CheckIn = {
      user_id: '',
      date: todayKey(),
      sleep: modelNum.sleep,
      energy: modelNum.energy,
      stress: modelNum.stress,
      recovery_score: finalRec.score,
      created_at: '',
      location: location ?? undefined,
      time: time ?? undefined,
      head: finalHead ?? head ?? undefined,
    };
    setCheckin(todayKey(), checkin);
    logEvent('checkin', {
      recovery: finalRec.score,
      location,
      time,
      head: finalHead ?? head,
      mode: deduceEmotionalMode(checkin),
    });

    if (profile && twin) {
      const cons = calculateConsistency(
        workouts.filter((w) => {
          const d = Math.floor((new Date(todayKey()).getTime() - new Date(w.date).getTime()) / 86400000);
          return d <= 29 && w.completed_rate >= 0.5;
        }).length,
        profile.days_per_week === '4-5' ? 4 : 3
      );

      const guarded = applyModeGuardrails(
        DecisionEngine.decide({
          checkin,
          consistency: cons,
          twin,
          profile,
          last_workout: workouts[workouts.length - 1],
        }),
        checkin,
        workouts
      );
      const decision = guarded.decision;
      const mode = guarded.mode;

      // Seguridad emocional (spec §3): Caos nunca recibe HIIT. El motor
      // propone respiración, estiramiento suave, silla o grounding.
      if (guarded.restoreOnly || decision.action === 'restore') {
        setPlan({
          ...decision,
          date: todayKey(),
          done: false,
          mode,
          message: MotivationEngine.restMessage(twin.motivation_style, lang),
        });
      } else {
        const clientLastFocus = typeof window !== 'undefined' ? (localStorage.getItem('chispa_last_focus') ?? undefined) : undefined;
        const recentExerciseIds = (workouts[workouts.length - 1]?.exercises ?? []).map((e) => e.exercise_id);
        const workout = TrainingAgent.generate(decision, twin, profile.equipment, undefined, clientLastFocus, { goal: profile.goal, recentExerciseIds });
        setPlan({
          ...decision,
          date: todayKey(),
          done: false,
          mode,
          workout,
          message: MotivationEngine.message(
            twin.motivation_style,
            decision.recovery_score ?? 60,
            decision.consistency.consistency_pct,
            decision.duration,
            lang
          ),
        });
      }

      supabaseSync.push({ checkins: { [todayKey()]: checkin } }).catch(logError('home:push-checkin'));
      logEvent('decision', { intensity: decision.intensity, confidence: decision.confidence });
    }
  };

  const steps: { titleKey: string; hintKey?: string }[] = [
    { titleKey: '¿Dónde estás?' },
    { titleKey: '¿Energía?' },
    { titleKey: '¿Cuánto tiempo tienes?' },
    { titleKey: '¿Cómo estás de cabeza? (opcional)' },
  ];

  const back = () => setStep((s) => Math.max(0, s - 1));
  const canNext = step === 0 ? location !== null : step === 1 ? energy !== null : step === 2 ? time !== null : true;

  return (
    <Card className="overflow-hidden animate-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base">{t('Check-in diario')}</span>
          <Badge variant="ghost">3 {t('toques')}</Badge>
        </div>
        <div className="text-right">
          <span key={rec.score} className="text-2xl font-black text-[var(--accent)] counter-pop inline-block">{rec.score}</span>
          <div className="text-[10px] text-[var(--muted)] -mt-1">recovery</div>
        </div>
      </div>
      <p className="text-sm text-[var(--muted)] mb-4 leading-relaxed">
        {t('Cuéntanos con 3 toques: dónde estás, tu energía y tu tiempo. El motor hace el resto.')}
      </p>

      {/* Progreso del wizard */}
      <div className="flex items-center gap-1.5 mb-4">
        {steps.map((s, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-[#ffb454]' : 'bg-[var(--line)]'}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-[var(--muted)]">
          {t('Paso {a} de {b}', { a: step + 1, b: 4 })}
          {step === 3 && <span className="text-[10px] text-[var(--muted-soft)]"> · {t('opcional')}</span>}
        </span>
        {step > 0 && (
          <button
            onClick={back}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors min-h-8 px-1"
          >
            <ChevronLeft size={13} /> {t('Atrás')}
          </button>
        )}
      </div>

      {/* Pregunta del paso actual */}
      <h3 className="text-lg font-black mb-3">{t(steps[step].titleKey)}</h3>

      {/* Paso 0 — dónde */}
      {step === 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {LOC_OPTIONS.map((o) => (
            <TapOption
              key={o.value}
              emoji={o.emoji}
              label={t(o.labelKey)}
              desc={t(o.descKey)}
              selected={location === o.value}
              onClick={() => { setLocation(o.value); setStep(1); }}
            />
          ))}
        </div>
      )}

      {/* Paso 1 — energía */}
      {step === 1 && (
        <div className="grid grid-cols-3 gap-2.5">
          {ENERGY_OPTIONS.map((o) => (
            <TapOption
              key={o.value}
              emoji={o.emoji}
              label={t(o.labelKey)}
              desc={t(o.descKey)}
              selected={energy === o.value}
              onClick={() => { setEnergy(o.value); setStep(2); }}
            />
          ))}
        </div>
      )}

      {/* Paso 2 — tiempo */}
      {step === 2 && (
        <div className="grid grid-cols-3 gap-2.5">
          {TIME_OPTIONS.map((o) => (
            <TapOption
              key={o.value}
              emoji={o.value <= 5 ? '⏱️' : '🧘'}
              label={o.labelKey}
              desc={t(o.descKey)}
              selected={time === o.value}
              onClick={() => { setTime(o.value); setStep(3); }}
            />
          ))}
        </div>
      )}

      {/* Paso 3 — cabeza (opcional) */}
      {step === 3 && (
        <>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {HEAD_OPTIONS.map((o) => (
              <TapOption
                key={o.value}
                emoji={o.emoji}
                label={t(o.labelKey)}
                desc={t(o.descKey)}
                selected={head === o.value}
                onClick={() => { setHead(o.value); commit(o.value); }}
              />
            ))}
          </div>
          <Button variant="primary" size="large" className="w-full" onClick={() => commit(null)} disabled={!canNext}>
            {t('Calcular mi día')} <Icons.Spark />
          </Button>
          <p className="text-[11px] text-[var(--muted-soft)] text-center mt-2.5 leading-relaxed">
            {t('Puedes continuar sin responder. El motor se adapta igual.')}
          </p>
        </>
      )}
    </Card>
  );
}

/** Opción grande de un toque del check-in visual (target ≥ 44px). */
function TapOption({
  emoji,
  label,
  desc,
  selected,
  onClick,
}: {
  emoji: string;
  label: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      aria-pressed={selected}
      className={`flex flex-col items-center justify-center gap-1 min-h-[92px] p-3 rounded-2xl border-2 text-center transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] ${
        selected
          ? 'border-[#ffb454] bg-[rgba(255,180,84,0.10)] shadow-[0_0_18px_rgba(255,180,84,0.15)]'
          : 'border-[var(--line)] bg-[var(--card2)] hover:border-[rgba(255,180,84,0.35)]'
      }`}
    >
      <span className="text-2xl leading-none">{emoji}</span>
      <span className="text-sm font-bold leading-tight">{label}</span>
      <span className="text-[10px] text-[var(--muted)] leading-tight">{desc}</span>
    </motion.button>
  );
}

function ExerciseItem({
  ex,
  index,
  visual,
}: {
  ex: WorkoutExercise;
  index: number;
  visual?: { src: string | null; fallbackIcon: React.ComponentType<{ size?: number; className?: string }> };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}              className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-[var(--card2)] border border-[var(--line)]"
    >
      <span className="flex items-center justify-center text-xs font-bold text-[var(--muted)] shrink-0 w-5">
        {index + 1}
      </span>
      <span className="w-9 h-9 rounded-lg overflow-hidden bg-[var(--card2)] border border-[var(--line)] shrink-0">
        {visual ? (
          <ExerciseImage src={visual.src} fallbackIcon={visual.fallbackIcon} size={16} />
        ) : (
          <span className="w-full h-full flex items-center justify-center">
            <Dumbbell size={16} className="text-[#ffb454]" />
          </span>
        )}
      </span>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold">{ex.name}</span>
        <span className="text-xs text-[var(--muted)]">
          {ex.sets} × {ex.reps} reps
          {ex.progressed && <span className="text-emerald-400 font-bold ml-2">+2 reps</span>}
        </span>
      </div>
    </motion.div>
  );
}

function PlanCard() {
  const t = useT();
  const plan = useStore((s) => s.plan);
  const setView = useStore((s) => s.setView);
  const { exercises: catalog } = useExercises();

  // Name → visual lookup (only when catalog is loaded; icons while loading).
  // Declared BEFORE the early return — hooks must run unconditionally.
  const visuals = React.useMemo(() => {
    const m: Record<string, { src: string | null; fallbackIcon: React.ComponentType<{ size?: number; className?: string }> }> = {};
    catalog.forEach((e) => { m[e.name] = getExerciseVisual(e); });
    return m;
  }, [catalog]);

  if (!plan || plan.action === 'restore' || !plan.workout) return null;

  const w = plan.workout;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="animate-in">
        <div className="flex justify-between items-center mb-3">
          <Badge variant={plan.intensity}>{plan.intensity === 'push' ? t('Al máximo') : plan.intensity === 'light' ? t('Suave') : plan.intensity === 'minimal' ? t('Express') : t('Estándar')}</Badge>
          <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
            <Icons.Spark size={14} /> {plan.confidence}%
          </span>
        </div>
        {plan.mode && (
          <div className="flex items-center gap-1.5 mb-2 -mt-1">
            <Sprout size={14} className="text-[#34d399] shrink-0" />
            <span className="text-xs font-bold text-[#34d399]">
              {t('Tu modo de hoy: {mode}', { mode: t(modeInfo(plan.mode).labelKey) })}
            </span>
          </div>
        )}
        <h2 className="text-2xl font-black tracking-tight mb-1">{t(w.title)}</h2>
        <div className="flex items-center gap-3 text-sm text-[var(--muted)] mb-4">
          <span className="flex items-center gap-1"><Icons.Clock /> {t('{n} min', { n: w.duration })}</span>
          <span className="flex items-center gap-1"><Icons.Dumbbell size={16} /> {t('{n} ejercicios', { n: w.exercises.length })}</span>
        </div>
        <p className="italic border-l-4 border-[#ffb454] pl-3 py-2 text-sm leading-relaxed mb-4 bg-[rgba(255,180,84,0.06)] rounded-r-xl">
          &ldquo;{plan.message}&rdquo;
        </p>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {plan.reasons.map((r: string, i: number) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-[var(--card2)] border border-[var(--line)] text-[var(--muted)]">
              {r}
            </span>
          ))}
        </div>

        <div className="space-y-2 mb-5">
          {w.exercises.map((ex: WorkoutExercise, i: number) => (
            <ExerciseItem key={i} ex={ex} index={i} visual={visuals[ex.name]} />
          ))}
        </div>

        <div className="flex gap-2">
          <motion.div
            className="flex-1"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button variant="primary" size="large" className="w-full" onClick={() => { useStore.getState().trackDecision(5); setView('session'); }}>
              <Icons.Play /> {t('Empezar ahora')}
            </Button>
          </motion.div>
        </div>
        <p className="text-xs text-[var(--muted)] text-center mt-3 leading-relaxed">
          {t('Puedes parar cuando quieras. Guardamos todo lo hecho.')}
        </p>
      </Card>
    </motion.div>
  );
}

function RestCard() {
  const t = useT();
  const plan = useStore((s) => s.plan);
  const logEvent = useStore((s) => s.logEvent);

  if (!plan || plan.action !== 'restore') return null;

  const suggestions = [
    { icon: Footprints, text: t('Caminata de 15 min'), desc: t('Activa la circulación sin impacto') },
    { icon: StretchHorizontal, text: t('Estiramiento suave'), desc: t('Libera tensión muscular acumulada') },
    { icon: Wind, text: t('Respiración 5 min'), desc: t('Reduce el cortisol y calma el sistema') },
    { icon: Armchair, text: t('Movimiento en silla'), desc: t('Todo sentado, sin levantarte') },
    { icon: Waves, text: t('Grounding 3 min'), desc: t('Pies en el suelo, respira y ancla') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="animate-in">
        <Badge variant="minimal">{t('Recuperación')}</Badge>
        <h2 className="text-2xl font-black tracking-tight mt-3 mb-1">{t('Hoy toca recargar')} <Battery size={20} className="inline" /></h2>
        <p className="italic border-l-4 border-[#ffb454] pl-3 py-2 text-sm leading-relaxed mb-4 bg-[rgba(255,180,84,0.06)] rounded-r-xl">
          &ldquo;{plan.message}&rdquo;
        </p>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {plan.reasons.map((r: string, i: number) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-[var(--card2)] border border-[var(--line)] text-[var(--muted)]">
              {r}
            </span>
          ))}
        </div>
        <div className="space-y-2.5">
          {suggestions.map((s, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                logEvent('rest_activity', { activity: s.text });
              }}
              className="flex items-center gap-3 w-full min-h-[56px] p-4 rounded-2xl border border-[var(--line)] bg-[var(--card2)] text-left transition-colors"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--card2)] text-[var(--accent)]">
                <s.icon size={20} />
              </span>
              <div>
                <div className="font-semibold text-sm">{s.text}</div>
                <div className="text-xs text-[var(--muted)] mt-0.5">{s.desc}</div>
              </div>
            </motion.button>
          ))}
        </div>
        {/* Seguridad emocional (spec §3): la app acompaña, no reemplaza apoyo profesional */}
        <p className="text-[11px] text-[var(--muted-soft)] italic mt-3 text-center leading-relaxed">
          {t('Si hoy te sientes con ansiedad o tristeza profunda, esto no reemplaza apoyo profesional.')}
        </p>
      </Card>
    </motion.div>
  );
}

function DoneCard() {
  const t = useT();
  const plan = useStore((s) => s.plan);
  const setView = useStore((s) => s.setView);

  if (!plan?.result) return null;

  const r = plan.result;
  const pct = Math.round(r.rate * 100);
  const title = r.rate >= 0.8 ? t('Hoy ya entrenaste') : r.rate >= 0.4 ? t('Sesión guardada') : t('Movimiento registrado');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="text-center animate-in">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 12 }}
          className="text-4xl mb-2"
        >
          {r.rate >= 0.8 ? <Sparkles size={48} className="mx-auto text-emerald-400" /> : <TrendingUp size={48} className="mx-auto text-[#ffb454]" />}
        </motion.div>
        <h2 className="text-2xl font-black tracking-tight mb-1">{title}</h2>
        <p className="text-sm text-[var(--muted)] mb-5">
          {t('{a} min · {b}/{c} ejercicios · {d}% completado', { a: r.minutes, b: r.doneEx, c: r.totalEx, d: pct })}
        </p>
        <p className="italic border-l-4 border-[#ffb454] pl-3 py-2 text-sm leading-relaxed mb-5 bg-[rgba(255,180,84,0.06)] rounded-r-xl">
          &ldquo;{t('La consistencia se construye así: un día cada vez.')}&rdquo;
        </p>
        <Button variant="ghost" className="w-full" onClick={() => setView('coach')}>
          {t('Hablar con el Coach')} <Icons.ChevronRight />
        </Button>
      </Card>
    </motion.div>
  );
}

/**
 * Mensaje de regreso tras días (spec §5): nada se rompió, la brasa siguió ahí.
 * Se muestra una vez por sesión (sessionStorage) cuando la última sesión tiene
 * 7+ días. Sin culpa: pausa larga ≠ pérdida de progreso.
 */
function ReturnBanner() {
  const t = useT();
  const workouts = useStore((s) => s.workouts);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('_chispa_return_banner')) return;
    if (workouts.length === 0) return;
    const lastDate = workouts.reduce((max, w) => (w.date > max ? w.date : max), '');
    if (!lastDate) return;
    const days = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000);
    if (days >= 7) {
      sessionStorage.setItem('_chispa_return_banner', '1');
      setVisible(true);
    }
  }, [workouts]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[rgba(255,180,84,0.3)] bg-[rgba(255,180,84,0.08)] p-4 flex items-start gap-3"
    >
      <span className="text-xl shrink-0">🔥</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-[var(--text)] leading-tight">{t('Bienvenido de nuevo')}</p>
        <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
          {t('Nada se rompió. Tu brasa siguió aquí esperando. Empecemos con 2 minutos, sin juicio.')}
        </p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="ml-1 text-xs font-semibold text-[var(--muted)] underline-offset-2 hover:underline shrink-0"
      >
        {t('Entendido')}
      </button>
    </motion.div>
  );
}

function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 space-y-4">
      <div className="skeleton h-5 w-28" />
      <div className="skeleton h-4 w-48" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-12 w-full" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
      <div className="skeleton h-14 w-full" />
    </div>
  );
}

function GreetingHeader() {
  const t = useT();
  const locale = useLocale();
  const profile = useStore((s) => s.profile);
  const workouts = useStore((s) => s.workouts);
  const setView = useStore((s) => s.setView);
  const prefs = useStore((s) => s.prefs);
  const name = profile?.name ?? '';

  // El nombre puede venir como uid crudo (ej. y54657687989) tras registrarse
  // con Google. No mostramos un identificador como si fuera un nombre.
  const looksLikeId = (s: string) => /^\d{6,}$/.test(s) || s.length > 16;
  const displayName = name && !looksLikeId(name) ? name.split(' ')[0] : null;

  const hour = new Date().getHours();
  let greeting = t('Buenas');
  if (hour < 12) greeting = t('Buenos días');
  else if (hour < 20) greeting = t('Buenas tardes');
  else greeting = t('Buenas noches');

  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const dayName = t(dayNames[new Date().getDay()]);
  const dateStr = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(new Date());

  const totalXp = computeTotalXp(workouts);
  const level = computeLevel(totalXp);
  const xpInLevel = totalXp - (level - 1) * 200;
  const xpForNext = 200;
  const xpPct = Math.min(100, Math.round((xpInLevel / xpForNext) * 100));

  // Weekly sessions — data, not consecutive-day streak.
  // Consecutive-day streaks trigger RSD/anxiety in neurodivergent users;
  // we surface weekly totals instead, consistent with the Habit Engine's
  // 30-day rolling-window philosophy (no "romper la racha").
  const weekSessions = React.useMemo(() => {
    const today = new Date();
    return workouts.filter((w) => {
      const d = Math.floor((today.getTime() - new Date(w.date).getTime()) / 86400000);
      return d <= 7 && w.completed_rate >= 0.5;
    }).length;
  }, [workouts]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="pt-1 pb-0.5"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            {greeting}{displayName ? `, ${displayName}` : ''}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 12 }}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[rgba(167,139,250,0.16)] text-[var(--rpg-epic)] border border-[rgba(167,139,250,0.3)]"
            >
              {t('Nv.{n}', { n: level })}
            </motion.span>
          </h1>
            <p className="text-sm text-[var(--muted)] mt-0.5"><span className="capitalize">{dayName}</span> · {dateStr}</p>
        </div>
        {/* Weekly activity badge (data, not streak) */}
        {weekSessions > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
            className="flex items-center gap-1.5 bg-[var(--card2)] rounded-full pl-2 pr-3 py-0.5"
          >
            <Calendar size={14} className="text-[#ffb454]" />
            <span              className="text-[10px] font-bold text-[var(--accent)] tabular-nums">
              {weekSessions} {t('esta semana')}
            </span>
          </motion.div>
        )}
        {/* Sensory quick-access shortcut → Sistema (Perfil sensorial + prefs) */}
        <button
          onClick={() => setView('sistema')}
          aria-label={t('Ajustes')}
          title={t('Acceso rápido a sensorial y gamificación')}
          className={`w-9 h-9 rounded-xl border flex items-center justify-center text-[var(--muted)] hover:bg-[var(--card2)] transition-colors shrink-0 ${
            prefs.hideStreaks
              ? 'bg-[rgba(0,212,170,0.08)] border-[#00D4AA]'
              : 'bg-[var(--card2)] border-[var(--line)]'
          }`}
        >
          <Settings size={17} />
        </button>
      </div>
      {/* XP Bar */}
      <motion.div
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: '100%' }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="mt-2 flex items-center gap-2"
      >
        <div className="flex-1 h-2 rounded-full bg-[var(--card2)] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpPct}%` }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#7c5cfc] xp-bar-glow"
          />
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}            className="text-[10px] text-[var(--rpg-epic)] font-semibold tabular-nums"
        >
          {xpInLevel}/{xpForNext} XP
        </motion.span>
      </motion.div>
    </motion.div>
  );
}

function RecoveryMiniCard({ score, preferredDuration = 20, consistencyPct = 0, isNew }: { score: number; preferredDuration?: number; consistencyPct?: number; isNew?: boolean }) {
  const t = useT();
  const budget = energyBudget(score, preferredDuration, consistencyPct);
  const budgetLine =
    budget.kind === 'restore'
      ? t('Hoy: suave · {n} min', { n: budget.duration })
      : t('Sesión de {n} min sugerida', { n: budget.duration });
  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="flex items-center gap-3 p-4 card-hover">
        <RecRing pct={score} size={56} strokeWidth={6}>
          <span className="text-sm font-bold">{score}</span>
        </RecRing>
        <div>
          <div className="text-sm font-bold">{t('Recuperación')}</div>
          <div className="text-xs text-[var(--muted)]">{t(recWord(score))}</div>
          <div className="text-xs font-semibold text-[var(--accent)]">{budgetLine}</div>
        </div>
      </Card>
    </motion.div>
  );
}

function ConsistencyMiniCard({ cons, isNew }: { cons: { consistency_pct: number; sessions_done: number; sessions_target: number }; isNew?: boolean }) {
  const t = useT();
  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card className="flex items-center gap-3 p-4 card-hover">
        <RecRing pct={cons.consistency_pct} size={56} strokeWidth={6} color="#ffb454">
          <span className="text-sm font-bold">{cons.consistency_pct}%</span>
        </RecRing>
        <div>
          <div className="text-sm font-bold">{t('Consistencia')}</div>
          <div className="text-xs text-[var(--muted)]">{t('{a}/{b} sesiones', { a: cons.sessions_done, b: cons.sessions_target })}</div>
        </div>
      </Card>
    </motion.div>
  );
}

function GeneratingPlanCard() {
  const t = useT();
  const [stuck, setStuck] = React.useState(false);
  const setPlan = useStore((s) => s.setPlan);

  // If plan not generated after 5s, show retry
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const state = useStore.getState();
      const today = todayKey();
      const hasPlan = state.plan && state.plan.date === today;
      if (!hasPlan) setStuck(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const retryGeneration = () => {
    setStuck(false);
    const state = useStore.getState();
    const today = todayKey();
    const c = state.checkins[today];
    const p = state.profile;
    const t = state.twin;
    const w = state.workouts;
    if (!c || !p || !t) return;

    try {
      const done = w.filter((w) => {
        const d = Math.floor((new Date(today).getTime() - new Date(w.date).getTime()) / 86400000);
        return d <= 29 && w.completed_rate >= 0.5;
      }).length;
      const target = p.days_per_week === '4-5' ? 4 : 3;
      const cons = calculateConsistency(done, target);
      const guarded = applyModeGuardrails(
        DecisionEngine.decide({ checkin: c, consistency: cons, twin: t, profile: p, last_workout: w[w.length - 1] }),
        c,
        w
      );
      const decision = guarded.decision;

      if (guarded.restoreOnly || decision.action === 'restore') {
        setPlan({ ...decision, date: today, done: false, mode: guarded.mode, message: MotivationEngine.restMessage(t.motivation_style, state.lang) });
      } else {
        const clientLastFocus = typeof window !== 'undefined' ? (localStorage.getItem('chispa_last_focus') ?? undefined) : undefined;
        const recentExerciseIds = (w[w.length - 1]?.exercises ?? []).map((e) => e.exercise_id);
        const workout = TrainingAgent.generate(decision, t, p.equipment, undefined, clientLastFocus, { goal: p.goal, recentExerciseIds });
        setPlan({ ...decision, date: today, done: false, mode: guarded.mode, workout, message: MotivationEngine.message(t.motivation_style, decision.recovery_score ?? 60, decision.consistency.consistency_pct, decision.duration, state.lang) });
      }
    } catch (err) {
      logError('home:retry-generation')(err);
      setStuck(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card className="text-center py-8 space-y-3">
        {!stuck ? (
          <>
            <div className="flex justify-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffb454] pulse-dot" style={{ animationDelay: '0s' }} />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffb454] pulse-dot" style={{ animationDelay: '0.2s' }} />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffb454] pulse-dot" style={{ animationDelay: '0.4s' }} />
            </div>
            <p className="text-sm text-[var(--muted)]">{t('Generando tu entrenamiento...')}</p>
            <div className="skeleton h-2 w-3/4 mx-auto" />
          </>
        ) : (
          <>
            <WarningIcon size={28} className="mx-auto mb-1 text-[#fbbf24]" />
            <p className="text-sm text-[var(--muted)]">{t('No se pudo generar el entrenamiento.')}</p>
            <p className="text-xs text-[var(--muted-soft)]">{t('Completa el check-in e intenta de nuevo.')}</p>
            <Button variant="primary" size="sm" className="mt-2" onClick={retryGeneration}>
              {t('Reintentar')}
            </Button>
          </>
        )}
      </Card>
    </motion.div>
  );
}

export function HomeScreen() {
  const t = useT();
  const checkins = useStore((s) => s.checkins);
   const plan = useStore((s) => s.plan);
   const twin = useStore((s) => s.twin);
   const workouts = useStore((s) => s.workouts);
   const profile = useStore((s) => s.profile);
   const lang = useStore((s) => s.lang);

  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const hasData = profile || Object.keys(checkins).length > 0;
    const timer = setTimeout(() => setLoading(false), hasData ? 100 : 400);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setPlan = useStore((s) => s.setPlan);
  const setView = useStore((s) => s.setView);
  const logEvent = useStore((s) => s.logEvent);
  const suggestShortSession = useStore((s) => s.suggestShortSession);
  const clearShortSuggestion = useStore((s) => s.clearShortSuggestion);

  const today = todayKey();
  const hasCheckin = !!checkins[today];
  const hasPlan = plan && plan.date === today;

  // Ancla de rutina (habit stacking): un solo nudge por ventana/día
  const anchorRoutine = useStore((s) => s.anchorRoutine);
  const anchorNudgeShown = useStore((s) => s.anchorNudgeShown);
  const markAnchorNudgeShown = useStore((s) => s.markAnchorNudgeShown);
  const anchorWin = useMemo(() => (anchorRoutine ? currentAnchorWindow() : null), [anchorRoutine]);
  const anchorVisible = Boolean(
    anchorRoutine &&
      anchorWin === anchorRoutine.window &&
      anchorNudgeShown !== anchorNudgeKey(today, anchorRoutine.window),
  );

  // Auto-generate plan when check-in exists but no plan yet
  React.useEffect(() => {
    if (!hasCheckin || hasPlan || !profile || !twin) return;
    if (!checkins[today]) return;

    try {
      const c = checkins[today];
      const done = workouts.filter((w) => {
        const d = Math.floor((new Date(today).getTime() - new Date(w.date).getTime()) / 86400000);
        return d <= 29 && w.completed_rate >= 0.5;
      }).length;
      const target = profile.days_per_week === '4-5' ? 4 : 3;
      const cons = calculateConsistency(done, target);

      const guarded = applyModeGuardrails(
        DecisionEngine.decide({
          checkin: c,
          consistency: cons,
          twin,
          profile,
          last_workout: workouts[workouts.length - 1],
        }),
        c,
        workouts
      );
      const decision = guarded.decision;

      if (guarded.restoreOnly || decision.action === 'restore') {
        setPlan({
          ...decision,
          date: today,
          done: false,
          mode: guarded.mode,
          message: MotivationEngine.restMessage(twin.motivation_style, lang),
        });
      } else {
        const clientLastFocus = typeof window !== 'undefined'
          ? (localStorage.getItem('chispa_last_focus') ?? undefined)
          : undefined;
        const recentExerciseIds = (workouts[workouts.length - 1]?.exercises ?? []).map((e) => e.exercise_id);
        const workout = TrainingAgent.generate(decision, twin, profile.equipment, undefined, clientLastFocus, { goal: profile.goal, recentExerciseIds });
        setPlan({
          ...decision,
          date: today,
          done: false,
          mode: guarded.mode,
          workout,
          message: MotivationEngine.message(
            twin.motivation_style,
            decision.recovery_score ?? 60,
            decision.consistency.consistency_pct,
            decision.duration,
            lang
          ),
        });
      }

      logEvent('auto_plan', { intensity: decision.intensity, confidence: decision.confidence });
    } catch (err) {
      logError('home:auto-plan')(err);
    }
  }, [hasCheckin, hasPlan, profile, twin, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayRef = React.useRef(today);
  if (todayRef.current !== today) {
    todayRef.current = today;
  }

  const cons = React.useMemo(() => {
    if (!profile) return { consistency_pct: 0, sessions_done: 0, sessions_target: 0 };
    const target = profile.days_per_week === '4-5' ? 4 : 3;
    const todayStr = todayRef.current;
    const done = workouts.filter((w) => {
      const d = Math.floor((new Date(todayStr).getTime() - new Date(w.date).getTime()) / 86400000);
      return d <= 29 && w.completed_rate >= 0.5;
    }).length;
    return calculateConsistency(done, target);
  }, [workouts, profile]);

  const recoveryScore = hasCheckin ? checkins[today].recovery_score : 50;

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 md:px-6 lg:px-8 pb-6 space-y-3.5 w-full max-w-[760px] mx-auto">
        <SkeletonCard lines={1} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
      className="px-4 md:px-6 lg:px-8 pb-6 space-y-3.5 w-full max-w-[760px] mx-auto"
    >
      <GreetingHeader />

      {/* Regreso tras días — mensaje sin culpa (spec §5) */}
      <ReturnBanner />

      {/* Adaptive nudge: 2 consecutive skips → short session suggestion */}
      {suggestShortSession && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[rgba(255,180,84,0.25)] bg-[rgba(255,180,84,0.06)] p-4 flex items-start gap-3"
        >
          <span className="text-xl text-[#ffb454] shrink-0"><Zap size={20} /></span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-[var(--text)] leading-tight">{t('¿5 min hoy?')}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5 leading-tight">{t('¿Quieres una rutina corta de 5 minutos? Aprovechamos tu baja energía.')}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { clearShortSuggestion(); logEvent('short_session_suggested', {}); setView('session'); }}
            className="ml-2 text-xs font-semibold text-[#ffb454] underline-offset-2 hover:underline focus-visible:underline"
          >
            {t('Usar')}
          </motion.button>
        </motion.div>
      )}

      {/* ─── 3 acciones iguales: Crear rutina / Registro rápido / Bitácora ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-3 gap-2.5"
      >
        <ActionCard
          icon={Plus}
          tint="orange"
          title={t('Crear rutina')}
          subtitle={t('Arma tu propia sesión')}
          onClick={() => setView('create-workout')}
        />
        <LiveNowCard variant="card" />
        <ActionCard
          icon={BookMarked}
          tint="purple"
          title={t('Bitácora')}
          subtitle={t('Tu historial de movimiento')}
          onClick={() => setView('journal')}
        />
      </motion.div>

      {/* ─── Ancla de rutina: un solo nudge por ventana, nunca repetido ─── */}
      {anchorRoutine && anchorVisible && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[rgba(52,211,153,0.25)] bg-[rgba(52,211,153,0.06)] p-4 flex items-start gap-3"
        >
          <span className="text-xl text-[#34d399] shrink-0">⏰</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-[var(--text)] leading-tight">{t('Tu ancla de hoy')}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5 leading-tight">
              {t('Después de {anchor}, {n} min de movimiento', {
                anchor: anchorLabel(anchorRoutine.anchorId, lang),
                n: anchorRoutine.minutes,
              })}
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => {
                  markAnchorNudgeShown(anchorNudgeKey(today, anchorRoutine.window));
                  logEvent('anchor_done', { minutes: anchorRoutine.minutes });
                }}
                className="text-xs font-semibold text-[#34d399] underline-offset-2 hover:underline"
              >
                {t('Lo hago')}
              </button>
              <button
                onClick={() => {
                  markAnchorNudgeShown(anchorNudgeKey(today, anchorRoutine.window));
                  logEvent('anchor_later', {});
                }}
                className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
              >
                {t('Ahora no')}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Mis rutinas: plantillas guardadas con balance y dopamina ─── */}
      <MyRoutines />

      {!hasCheckin && <CheckInCard />}

      {hasCheckin && (
        <div className="grid grid-cols-2 gap-3">
          <RecoveryMiniCard
            score={recoveryScore}
            preferredDuration={profile?.preferred_duration ?? 20}
            consistencyPct={cons.consistency_pct}
            isNew
          />
          <ConsistencyMiniCard cons={cons} isNew />
        </div>
      )}

      {hasCheckin && hasPlan && plan.done && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <DoneCard />
        </motion.div>
      )}
      {hasCheckin && hasPlan && !plan.done && plan.action === 'restore' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <RestCard />
        </motion.div>
      )}
      {hasCheckin && hasPlan && !plan.done && plan.action === 'train' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <PlanCard />
        </motion.div>
      )}

      {hasCheckin && !hasPlan && <GeneratingPlanCard />}

      {twin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="flex items-center gap-3 p-4 card-hover">
            <Lightbulb size={24} className="text-[#ffb454]" />
            <div>
              <div className="text-sm font-bold">{t('Tu Digital Twin')}</div>
              <div className="text-xs text-[var(--muted)]">
                {t('{n}% completado · ~{m} min', { n: Math.round(twin.patterns.completion_rate * 100), m: Math.round(twin.patterns.avg_duration) })}
              </div>
              <div className="text-xs text-[var(--muted)]">
                {t('{n} sesiones completas', { n: workouts.filter((w) => w.completed_rate >= 0.5).length })}
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
