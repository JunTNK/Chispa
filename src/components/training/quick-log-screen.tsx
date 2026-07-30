'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useExercises } from '@/lib/utils/use-exercises';
import { uid, todayKey, matchesEquipment } from '@/lib/utils/helpers';
import { supabaseSync } from '@/lib/sync/supabase-sync';
import { pushLeaderboard } from '@/lib/sync/leaderboard';
import { computeTotalXp, computeLevel, computeWorkoutXp } from '@/lib/awards/achievements';
import { useSound } from '@/lib/awards/use-sound';
import { logError } from '@/lib/utils/logger';
import type { QuickLogEntry, Workout } from '@/types';
import {
  Check,
  ArrowLeft,
  Plus,
  Clock,
  StickyNote,
  Dumbbell,
} from 'lucide-react';
import { FitnessIcon } from '@/components/ui/fitness-icon';
import {
  CalmFaceIcon,
  HappyFaceIcon,
  TiredFaceIcon,
  NeutralFaceIcon,
  EnergyIcon,
  SleepyFaceIcon,
  SmileIcon as RpgSmile,
  FlexIcon,
  FlameIcon as RpgFlame,
  TimerIcon as RpgTimer,
} from '@/components/ui/icons-rpg';

const QUICK_DURATIONS = [10, 15, 20, 30, 45, 60];

const RPE_OPTIONS = [
  { value: 'suave' as const, label: 'Suave', icon: <RpgSmile size={28} />, desc: 'Fue fácil' },
  { value: 'justo' as const, label: 'Justo', icon: <FlexIcon size={28} />, desc: 'Bien, sin pasarse' },
  { value: 'duro' as const, label: 'Duro', icon: <RpgFlame size={28} />, desc: 'Le dí todo' },
];

const MOOD_OPTIONS = [
  { icon: <CalmFaceIcon size={22} />, label: 'Tranquilo' },
  { icon: <HappyFaceIcon size={22} />, label: 'Feliz' },
  { icon: <TiredFaceIcon size={22} />, label: 'Agotado' },
  { icon: <NeutralFaceIcon size={22} />, label: 'Neutral' },
  { icon: <EnergyIcon size={22} />, label: 'Energético' },
  { icon: <SleepyFaceIcon size={22} />, label: 'Con sueño' },
];

const MUSCLE_ICON: Record<string, React.ReactNode> = {
  piernas: <FitnessIcon name="lower-body" size={20} />,
  gluteos: <FitnessIcon name="lower-body" size={20} />,
  pecho:   <FitnessIcon name="bench-press" size={20} />,
  espalda: <FitnessIcon name="upper-body" size={20} />,
  hombros: <FitnessIcon name="upper-body" size={20} />,
  brazos:  <FitnessIcon name="biceps" size={20} />,
  core:    <FitnessIcon name="core" size={20} />,
  cardio:  <FitnessIcon name="running" size={20} />,
};

export function QuickLogScreen() {
  const setView = useStore((s) => s.setView);
  const addWorkout = useStore((s) => s.addWorkout);
  const addQuickLog = useStore((s) => s.addQuickLog);
  const profile = useStore((s) => s.profile);
  const logEvent = useStore((s) => s.logEvent);
  const setTwin = useStore((s) => s.setTwin);
  const twin = useStore((s) => s.twin);
  const { play: playSound } = useSound();

  const [step, setStep] = React.useState<'duration' | 'exercises' | 'rpe' | 'done'>('duration');
  const [duration, setDuration] = React.useState(20);
  const [selectedExercises, setSelectedExercises] = React.useState<
    { name: string; muscle: string }[]
  >([]);
  const [rpe, setRpe] = React.useState<'suave' | 'justo' | 'duro' | null>(null);
  const [mood, setMood] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState('');
  const [customEx, setCustomEx] = React.useState('');

  const equipment = profile?.equipment ?? 'ninguno';
  const { exercises: catalog, isLoading } = useExercises();

  const commonExercises = React.useMemo(() => {
    return catalog.filter((e) => matchesEquipment(equipment, e.equipment)).slice(0, 20);
  }, [equipment, catalog]);

  const toggleExercise = (name: string, muscle: string) => {
    setSelectedExercises((prev) => {
      const exists = prev.find((e) => e.name === name);
      if (exists) return prev.filter((e) => e.name !== name);
      return [...prev, { name, muscle }];
    });
  };

  const addCustomExercise = () => {
    const trimmed = customEx.trim();
    if (!trimmed) return;
    setSelectedExercises((prev) => [
      ...prev,
      { name: trimmed, muscle: 'otro' },
    ]);
    setCustomEx('');
  };

  const handleSave = () => {
    if (duration <= 0) return;
    useStore.getState().trackDecision(5);

    const exList = selectedExercises.length > 0
      ? selectedExercises
      : [{ name: 'Movimiento libre', muscle: 'otro' }];

    const completedRate = 1; // It's a log — they did it!
    const w: Workout = {
      id: uid(),
      user_id: '',
      date: todayKey(),
      focus: 'full',
      intensity: rpe === 'duro' ? 'standard' : rpe === 'suave' ? 'light' : 'standard',
      duration,
      score: 85,
      completed_rate: completedRate,
      exercises: exList.map((ex) => ({
        exercise_id: ex.muscle,
        name: ex.name,
        muscle: ex.muscle,
        sets: 1,
        reps: 0,
        rest: 0,
        completed_sets: 1,
        completed_reps: [],
        status: 'done' as const,
      })),
      actual_minutes: duration,
      rpe: rpe ?? undefined,
      created_at: new Date().toISOString(),
    };

    addWorkout(w);

    const logEntry: QuickLogEntry = {
      id: uid(),
      user_id: '',
      date: todayKey(),
      duration,
      exercises: exList,
      rpe: rpe ?? undefined,
      mood: mood ?? undefined,
      notes: notes || undefined,
      created_at: new Date().toISOString(),
    };
    addQuickLog(logEntry);

    // Update twin
    if (twin) {
      const updated = {
        ...twin,
        patterns: {
          ...twin.patterns,
          completion_rate: twin.patterns.completion_rate * 0.9 + 1 * 0.1,
          avg_duration: twin.patterns.avg_duration * 0.9 + duration * 0.1,
        },
      };
      setTwin(updated);
      supabaseSync.push({ twin: updated, workouts: [...useStore.getState().workouts, w] }).catch(
        logError('quicklog:push')
      );
    } else {
      supabaseSync.push({ workouts: [...useStore.getState().workouts, w] }).catch(
        logError('quicklog:push')
      );
    }

    // Push XP to leaderboard
    const totalXp = computeTotalXp([...useStore.getState().workouts, w]);
    const level = computeLevel(totalXp);
    pushLeaderboard(totalXp, level).catch(logError('quicklog:push-leaderboard'));

    logEvent('quick_log', { duration, exercises: exList.length, rpe });
    playSound('levelUp');
    setStep('done');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-dvh flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          aria-label="Volver"
          className="w-11 h-11 rounded-2xl border border-white/[.07] bg-[#151b2a] flex items-center justify-center hover:bg-white/[.08]"
          onClick={() => {
            if (step === 'duration') setView('home');
            else if (step === 'exercises') setStep('duration');
            else if (step === 'rpe') setStep('exercises');
            else setStep('rpe');
          }}
        >
          <ArrowLeft size={20} />
        </motion.button>
        <div className="text-center">
          <span className="text-lg font-bold">Registro rápido</span>
          <p className="text-xs text-[#94a0b8]">Vitacoriza tu movimiento</p>
        </div>
        <div className="w-11" />
      </div>

      {/* Steps progress */}
      <div className="flex items-center gap-2 px-4 mb-4">
        {[['Duración', <RpgTimer key="timer" size={18} />], ['Ejercicios', <Dumbbell key="dumbbell" size={18} />], ['Intensidad', <RpgFlame key="flame" size={18} />]].map(([label, icon], i) => {
          const stepNames: (typeof step)[] = ['duration', 'exercises', 'rpe'];
          const currentIdx = stepNames.indexOf(step);
          const doneIdx = step === 'done' ? 3 : currentIdx;
          const isDone = i < doneIdx;
          const isCurrent = i === currentIdx;
          return (
            <React.Fragment key={i}>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isDone
                      ? 'bg-[#34d399] text-white'
                      : isCurrent
                        ? 'bg-[#ffb454] text-[#0a0d14]'
                        : 'bg-white/[.08] text-[#5c6577]'
                  }`}
                >
                  {isDone ? '✓' : icon}
                </div>
                <span
                  className={`text-[10px] font-semibold hidden sm:block ${
                    isCurrent ? 'text-white' : 'text-[#5c6577]'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < 2 && (
                <div
                  className={`flex-1 h-0.5 rounded-full ${
                    isDone ? 'bg-[#34d399]' : 'bg-white/[.08]'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 'duration' && (
            <motion.div
              key="duration"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock size={20} className="text-[#ffb454]" />
                  <span className="text-lg font-bold">¿Cuánto duró?</span>
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                  {QUICK_DURATIONS.map((d) => (
                    <motion.button
                      key={d}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setDuration(d)}
                      className={`w-16 h-16 rounded-2xl font-bold text-lg transition-all flex flex-col items-center justify-center ${
                        duration === d
                          ? 'bg-[#ffb454] text-[#0a0d14]'
                          : 'bg-white/[.06] text-[#94a0b8] border border-white/[.07] hover:bg-white/[.10]'
                      }`}
                    >
                      {d}
                      <span className="text-[9px] font-normal">min</span>
                    </motion.button>
                  ))}
                </div>
                {/* Custom duration slider */}
                <div className="mt-4">
                  <label className="sr-only" htmlFor="quicklog-duration">Duración en minutos</label>
                  <input
                    id="quicklog-duration"
                    type="range"
                    min={5}
                    max={90}
                    step={5}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full accent-[#ffb454]"
                  />
                  <div className="flex justify-between text-xs text-[#5c6577] mt-1">
                    <span>5 min</span>
                    <span className="font-bold text-[#ffb454]">{duration} min</span>
                    <span>90 min</span>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="ghost" size="large" onClick={() => setView('home')}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => setStep('exercises')}
                >
                  Siguiente <ArrowLeft size={16} className="rotate-180" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'exercises' && (
            <motion.div
              key="exercises"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold">¿Qué hiciste?</span>
                  <Badge variant="light">{selectedExercises.length} ejercicios</Badge>
                </div>

                {/* Common exercises grid */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={`skel-${i}`}
                        className="skeleton flex flex-col items-center gap-1 p-2.5 rounded-xl"
                        style={{ animationDelay: `${i * 0.06}s`, minHeight: 64 }}
                      />
                    ))
                  ) : (
                    commonExercises.map((ex) => {
                      const selected = selectedExercises.some((e) => e.name === ex.name);
                      return (
                        <motion.button
                          key={ex.id}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => toggleExercise(ex.name, ex.muscle)}
                          className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                            selected
                              ? 'border-[#ffb454] bg-[rgba(255,180,84,0.1)]'
                              : 'border-white/[.07] bg-[#151b2a] hover:border-white/[.15]'
                          }`}
                        >
                          <span className="text-[#94a0b8]">{MUSCLE_ICON[ex.muscle] || <Dumbbell size={18} />}</span>
                          <span className="text-[9px] font-semibold text-center leading-tight">
                            {ex.name.split(' ').slice(0, 2).join(' ')}
                          </span>
                        </motion.button>
                      );
                    })
                  )}
                </div>

                {/* Custom exercise input */}
                <div className="flex gap-2">
                  <label className="sr-only" htmlFor="quicklog-custom-ex">Agregar otro ejercicio</label>
                  <input
                    id="quicklog-custom-ex"
                    type="text"
                    value={customEx}
                    onChange={(e) => setCustomEx(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCustomExercise();
                    }}
                    placeholder="Otro ejercicio..."
                    className="flex-1 bg-white/[.06] border border-white/[.10] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#5c6577] outline-none focus:border-[#ffb454] transition-colors"
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={addCustomExercise}
                    className="w-10 h-10 rounded-xl bg-[#ffb454] text-[#0a0d14] flex items-center justify-center font-bold"
                  >
                    <Plus size={18} />
                  </motion.button>
                </div>
              </Card>

              {/* Selected exercises */}
              {selectedExercises.length > 0 && (
                <Card>
                  <span className="text-sm font-bold mb-2 block">Seleccionados</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedExercises.map((ex, i) => (
                      <motion.span
                        key={`${ex.name}-${i}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[rgba(255,180,84,0.12)] text-[#ffb454] border border-[rgba(255,180,84,0.3)]"
                      >
              {MUSCLE_ICON[ex.muscle] || null}
              {ex.name}
                        <button
                          onClick={() => toggleExercise(ex.name, ex.muscle)}
                          className="ml-1 hover:text-white"
                        >
                          ✕
                        </button>
                      </motion.span>
                    ))}
                  </div>
                </Card>
              )}

              {/* No exercise selected — skip button */}
              {selectedExercises.length === 0 && (
                <p className="text-xs text-[#94a0b8] text-center">
                  No pasa nada si no recuerdas. Puedes continuar sin detalles.
                </p>
              )}

              <Button
                variant="primary"
                size="large"
                className="w-full"
                onClick={() => setStep('rpe')}
              >
                {selectedExercises.length > 0
                  ? `Siguiente (${selectedExercises.length} ej.)`
                  : 'Continuar sin detalles'}{' '}
                <ArrowLeft size={16} className="rotate-180" />
              </Button>
            </motion.div>
          )}

          {step === 'rpe' && (
            <motion.div
              key="rpe"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* RPE */}
              <Card>
                <span className="text-sm font-bold mb-3 block text-center">
                  ¿Qué tal el esfuerzo?
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {RPE_OPTIONS.map((opt) => (
                    <motion.button
                      key={opt.value}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setRpe(opt.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        rpe === opt.value
                          ? 'border-[#ffb454] bg-[rgba(255,180,84,0.1)]'
                          : 'border-white/[.07] bg-[#151b2a] hover:border-white/[.15]'
                      }`}
                    >
                      <span className="text-[#ffb454]">{opt.icon}</span>
                      <span className="text-sm font-bold">{opt.label}</span>
                      <span className="text-[10px] text-[#94a0b8]">{opt.desc}</span>
                    </motion.button>
                  ))}
                </div>
                {!rpe && (
                  <p className="text-xs text-[#5c6577] text-center mt-3">
                    Toca uno para continuar (o elige abajo)
                  </p>
                )}
              </Card>

              {/* Mood */}
              <Card>
                <span className="text-sm font-bold mb-3 block text-center">
                  ¿Cómo te sientes ahora?
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  {MOOD_OPTIONS.map((opt) => (
                    <motion.button
                      key={opt.label}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setMood(mood === opt.label ? null : opt.label)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                        mood === opt.label
                          ? 'border-[#ffb454] bg-[rgba(255,180,84,0.1)]'
                          : 'border-white/[.07] bg-[#151b2a]'
                      }`}
                    >
                      <span className="text-[#94a0b8]">{opt.icon}</span>
                      <span className="text-[10px] font-semibold text-[#94a0b8]">
                        {opt.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </Card>

              {/* Notes */}
              <Card>
                <label className="text-sm font-bold mb-2 flex items-center gap-2">
                  <StickyNote size={16} /> Notas <span className="text-[#5c6577] font-normal">(opcional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="¿Algo que quieras recordar? Cómo te fue, qué aprendiste..."
                  rows={2}
                  className="w-full bg-white/[.06] border border-white/[.10] rounded-xl px-4 py-3 text-sm text-white placeholder-[#5c6577] outline-none focus:border-[#ffb454] transition-colors resize-none"
                />
              </Card>

              {/* Summary */}
              <Card className="bg-[rgba(52,211,153,0.06)] border-[rgba(52,211,153,0.2)]">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} /> {duration} min
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Dumbbell size={14} /> {selectedExercises.length || '—'} ejercicios
                  </span>
                <span className="flex items-center gap-1.5">
                  <RpgFlame size={14} /> {computeWorkoutXp(1, duration)} XP
                </span>
                </div>
              </Card>

              <Button
                variant="primary"
                size="large"
                className="w-full"
                onClick={handleSave}
              >
                <Check size={18} /> ¡Listo! Guardar
              </Button>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                className="w-24 h-24 rounded-full bg-[rgba(52,211,153,0.15)] flex items-center justify-center mb-5"
              >
                <Check size={44} className="text-[#34d399]" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl font-black mb-2"
              >
                ¡Registrado!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-[#94a0b8] mb-1"
              >
                {duration} min · {selectedExercises.length} ejercicios
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xs text-[#94a0b8] mb-8"
              >
                {rpe && RPE_OPTIONS.find((o) => o.value === rpe)?.icon}{' '}
                {mood && `· Te sientes ${mood.toLowerCase()}`}
              </motion.p>
              {rpe && (
                <motion.p
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25, type: 'spring' }}
                  className="text-xs px-4 py-2 rounded-full bg-[rgba(255,180,84,0.1)] text-[#ffb454] border border-[rgba(255,180,84,0.3)] mb-8"
                >
                  +{computeWorkoutXp(1, duration)} XP
                </motion.p>
              )}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="flex gap-3 w-full max-w-xs"
              >
                <Button variant="primary" className="flex-1" onClick={() => setView('home')}>
                  Ir al inicio
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setStep('duration');
                    setSelectedExercises([]);
                    setRpe(null);
                    setMood(null);
                    setNotes('');
                  }}
                >
                  Otro registro
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
