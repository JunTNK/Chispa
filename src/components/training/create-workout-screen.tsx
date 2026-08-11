'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useExercises } from '@/lib/utils/use-exercises';
import { ExerciseImage, getExerciseVisual } from '@/lib/utils/exercise-visuals';
import { FOCUS_LABELS } from '@/lib/utils/constants';
import { uid, matchesEquipment } from '@/lib/utils/helpers';
import type { WorkoutExercise, WorkoutTemplate } from '@/types';
import {
  Dumbbell,
  Plus,
  Minus,
  Trash2,
  Save,
  Play,
  ArrowLeft,
  GripVertical,
  ChevronRight,
  Check,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { ExerciseSelector } from '@/components/training/exercise-selector';
import { deriveBalance } from '@/lib/agents/selector-engine';
import {
  MuscleGroupIcon,
  MUSCLE_GROUPS as MUSCLE_REGISTRY,
} from '@/components/ui/muscle-icons';
import type { MuscleGroupKey } from '@/components/ui/muscle-icons';
import { FOCUS_MUSCLES } from '@/lib/utils/muscles';

// Derivado del registro tipado (muscle-icons) + FOCUS_MUSCLES (muscles.ts,
// única fuente de verdad de músculos por foco). Cualquier cambio en ambos
// registros se refleja aquí; TypeScript forza a añadir entradas si se agrega
// una key al foco.
const MUSCLE_GROUPS = (Object.keys(MUSCLE_REGISTRY) as MuscleGroupKey[]).map((key) => ({
  key,
  label: MUSCLE_REGISTRY[key].label,
  muscles: FOCUS_MUSCLES[key],
}));

const DURATION_PRESETS = [10, 15, 20, 30, 45];

// ─── Steps ───
type Step = 'focus' | 'exercises' | 'done';

export function CreateWorkoutScreen() {
  const t = useT();
  const setView = useStore((s) => s.setView);
  const addTemplate = useStore((s) => s.addTemplate);
  const updateTemplate = useStore((s) => s.updateTemplate);
  const setEditingTemplate = useStore((s) => s.setEditingTemplate);
  const setPlan = useStore((s) => s.setPlan);
  const profile = useStore((s) => s.profile);
  const equipment = profile?.equipment ?? 'ninguno';

  // Modo edición desde Mis rutinas: la plantilla viaja pre-cargada.
  const editingTemplateId = useStore((s) => s.editingTemplateId);
  const templates = useStore((s) => s.workoutTemplates);
  const editingTemplate = editingTemplateId
    ? templates.find((t) => t.id === editingTemplateId) ?? null
    : null;
  const isEditing = editingTemplate !== null;

  const [step, setStep] = React.useState<Step>(isEditing ? 'exercises' : 'focus');
  const [name, setName] = React.useState(editingTemplate?.name ?? '');
  const [focus, setFocus] = React.useState<'full' | 'upper' | 'lower' | 'core'>(editingTemplate?.focus ?? 'full');
  const [exercises, setExercises] = React.useState<WorkoutExercise[]>(editingTemplate?.exercises ?? []);
  const [duration, setDuration] = React.useState(editingTemplate?.balance?.durationMin ?? 20);
  const { exercises: catalog } = useExercises();

  // Name → visual lookup for exercise thumbnails
  const exerciseVisual = React.useMemo(() => {
    const m: Record<string, { src: string | null; fallbackIcon: React.ComponentType<{ size?: number; className?: string }> }> = {};
    catalog.forEach((e) => { m[e.name] = getExerciseVisual(e); });
    return m;
  }, [catalog]);

  const availableExercises = React.useMemo(() => {
    const group = MUSCLE_GROUPS.find((g) => g.key === focus);
    const muscleSet = group ? new Set(group.muscles) : new Set<string>();
    return catalog.filter(
      (e) => muscleSet.has(e.muscle) && matchesEquipment(equipment, e.equipment)
    );
  }, [focus, equipment, catalog]);

  const addExercise = (exId: string) => {
    const found = catalog.find((e) => e.id === exId);
    if (!found) return;
    const newEx: WorkoutExercise = {
      exercise_id: found.id,
      name: found.name,
      muscle: found.muscle,
      sets: 3,
      reps: found.load_type === 'time' ? 30 : 10,
      rest: 60,
      completed_sets: 0,
      completed_reps: [],
      status: 'pending',
    };
    // Dedupe funcional: un doble toque en la misma frame no duplica el id
    // (la clave estable del row depende de que exercise_id sea único).
    setExercises((prev) =>
      prev.some((e) => e.exercise_id === exId) ? prev : [...prev, newEx]
    );
  };

  const removeExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateExercise = (idx: number, patch: Partial<WorkoutExercise>) => {
    setExercises((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, ...patch } : e))
    );
  };

  const moveExercise = (idx: number, dir: -1 | 1) => {
    setExercises((prev) => {
      const to = idx + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  };

  const totalSets = exercises.reduce((a, e) => a + e.sets, 0);

  // Balance derivado en cada toque (capa 02 del selector): mapa + suficiencia
  const balance = React.useMemo(
    () =>
      deriveBalance(
        exercises.map((e) => ({ exercise_id: e.exercise_id, sets: e.sets, reps: e.reps, rest: e.rest })),
        catalog,
        focus
      ),
    [exercises, catalog, focus]
  );

  const startWorkout = () => {
    if (exercises.length === 0) return;
    // Salir del modo edición: evita que un futuro "+ Nueva" herede la plantilla
    setEditingTemplate(null);
    useStore.getState().trackDecision(7);
    setPlan({
      action: 'train',
      intensity: 'standard',
      duration,
      reasons: ['Entrenamiento personalizado'],
      confidence: 85,
      recovery_score: 60,
      consistency: { user_id: '', period_start: '', period_end: '', consistency_pct: 50, sessions_done: 0, sessions_target: 4 },
      date: new Date().toISOString().slice(0, 10),
      done: false,
      workout: {
        focus,
        intensity: 'standard',
        duration,
        exercises,
        title: name || t('Rutina {foco}', { foco: t(FOCUS_LABELS[focus]) }),
        sets: totalSets,
        rest: 60,
      },
    });
    setView('session');
  };

  const saveTemplate = () => {
    if (exercises.length === 0) return;
    const snapshot: WorkoutTemplate['balance'] = {
      present: balance.present,
      missing: balance.missing,
      dopa: balance.dopa,
      durationMin: balance.durationMin,
      sufficient: balance.sufficient,
    };
    if (isEditing && editingTemplate) {
      // Edición: preserva id y created_at, refresca el snapshot del coach.
      updateTemplate(editingTemplate.id, {
        name: name || editingTemplate.name || t('Mi rutina {foco}', { foco: t(FOCUS_LABELS[focus]) }),
        focus,
        exercises: exercises.map((e) => ({ ...e, status: 'pending' as const })),
        balance: snapshot,
      });
      setEditingTemplate(null);
      setView('home');
      return;
    }
    const template: WorkoutTemplate = {
      id: uid(),
      name: name || t('Mi rutina {foco}', { foco: t(FOCUS_LABELS[focus]) }),
      focus,
      exercises: exercises.map((e) => ({ ...e, status: 'pending' as const })),
      created_at: new Date().toISOString(),
      // Snapshot del coach de balance (spec CHISPA-UX-002 · capa 02): la tarjeta
      // de Mis rutinas pinta patrones presentes/faltantes y el score de dopamina.
      balance: snapshot,
    };
    addTemplate(template);
    setStep('done');
  };

  const totalEx = exercises.length;
  const canProceed = totalEx > 0;

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
          aria-label={t('Volver')}
          className="w-11 h-11 rounded-2xl border border-white/[.07] bg-[#151b2a] flex items-center justify-center hover:bg-white/[.08]"
          onClick={() => {
            if (isEditing) {
              setEditingTemplate(null);
              setView('home');
            } else if (step === 'exercises') setStep('focus');
            else setView('home');
          }}
        >
          <ArrowLeft size={20} />
        </motion.button>
        <div className="text-center">
          <span className="text-lg font-bold">
            {isEditing
              ? t('Editar rutina')
              : step === 'focus'
                ? t('Crear entrenamiento')
                : step === 'exercises'
                  ? t('Elige ejercicios')
                  : t('¡Listo!')}
          </span>
          <p className="text-xs text-[var(--muted)]">
            {isEditing
              ? t('Paso 2 de 2')
              : step === 'focus'
                ? t('Paso 1 de 2')
                : step === 'exercises'
                  ? t('Paso 2 de 2')
                  : ''}
          </p>
        </div>
        {step === 'exercises' && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-11 h-11 rounded-2xl border border-white/[.07] bg-[#151b2a] flex items-center justify-center text-[#ffb454] hover:bg-white/[.08]"
            onClick={() => setExercises([])}
          >
            <Trash2 size={18} />
          </motion.button>
        )}
        {step !== 'exercises' && <div className="w-11" />}
      </div>

      {/* Step indicators */}
      <div className="flex gap-2 px-4 mb-4">
        {(['focus', 'exercises'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === s || (step === 'done' && s === 'exercises')
                  ? 'bg-[#ffb454] text-[#0a0d14]'
                  : 'bg-white/[.08] text-[var(--muted)]'
              }`}
            >
              {step === 'done' && s === 'exercises' ? '✓' : i + 1}
            </div>
            <span className="text-xs text-[var(--muted)] hidden sm:block">
              {s === 'focus' ? t('Enfoque') : t('Ejercicios')}
            </span>
            {i === 0 && <div className="flex-1 h-0.5 bg-white/[.08]" />}
          </div>
        ))}
      </div>

      <div className="flex-1 px-4 pb-4 overflow-y-auto space-y-4">
        <AnimatePresence mode="wait">
          {step === 'focus' && (
            <motion.div
              key="focus"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Name */}
              <Card>
                <label className="text-sm font-semibold mb-2 block">
                  {t('Nombre de la rutina')} <span className="text-[var(--muted)] font-normal">({t('opcional')})</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('Ej: Full body express, Día de piernas...')}
                  className="w-full bg-white/[.06] border border-white/[.10] rounded-xl px-4 py-3 text-sm text-white placeholder-[#5c6577] outline-none focus:border-[#ffb454] transition-colors"
                  autoFocus
                />
              </Card>

              {/* Focus selection */}
              <Card>
                <label className="text-sm font-semibold mb-3 block">
                  {t('¿Qué grupo muscular quieres trabajar?')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {MUSCLE_GROUPS.map((g) => (
                    <motion.button
                      key={g.key}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setFocus(g.key as typeof focus);
                        setStep('exercises');
                      }}
                      className={`group flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all duration-300 ${
                        focus === g.key
                          ? 'border-[#ffb454] bg-[rgba(255,180,84,0.12)] shadow-[0_0_24px_rgba(255,180,84,0.18)]'
                          : 'border-white/[.07] bg-[#151b2a] hover:border-[#ffb454]/40 hover:shadow-[0_0_28px_rgba(255,180,84,0.10)] hover:bg-[rgba(255,180,84,0.03)]'
                      }`}
                    >
                      <motion.span
                        className="text-[#ffb454] block"
                        whileHover={{
                          scale: 1.15,
                          rotate: [0, -6, 6, 0],
                          transition: { duration: 0.45, ease: 'easeInOut' },
                        }}
                      >
                        <MuscleGroupIcon name={g.key} size={28} title={g.label} />
                      </motion.span>
                      <span className="text-sm font-bold group-hover:text-white transition-colors duration-300">
                        {t(g.label)}
                      </span>
                      <span className="text-[10px] text-[var(--muted)] group-hover:text-[#b0c4d8] transition-colors duration-300">
                        {g.muscles.join(' · ')}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </Card>

              {/* Duration */}
              <Card>
                <label className="text-sm font-semibold mb-3 block">
                  {t('Duración estimada')}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {DURATION_PRESETS.map((d) => (
                    <motion.button
                      key={d}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setDuration(d)}
                      className={`px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                        duration === d
                          ? 'bg-[#ffb454] text-[#0a0d14]'
                          : 'bg-white/[.06] text-[var(--muted)] border border-white/[.07]'
                      }`}
                    >
                      {t('{n} min', { n: d })}
                    </motion.button>
                  ))}
                </div>
              </Card>

              {/* Go to exercises */}
              <Button
                variant="primary"
                size="large"
                className="w-full"
                onClick={() => setStep('exercises')}
              >
                {t('Elegir ejercicios')} <ChevronRight size={18} />
              </Button>
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
              {/* Selector: Guíame / Yo elijo · balance tocable · suficiencia · catálogo */}
              <ExerciseSelector
                focus={focus}
                pool={availableExercises}
                catalog={catalog}
                selected={exercises}
                onAddMany={(exs) => exs.forEach((ex) => addExercise(ex.id))}
                onRemove={(id) =>
                  removeExercise(exercises.findIndex((e) => e.exercise_id === id))
                }
              />

              {/* Selected exercises */}
              {exercises.length > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold">
                      {t('Tus ejercicios ({n})', { n: totalEx })}
                    </span>
                    <Badge variant={balance.sufficient ? 'success' : 'light'}>
                      {t('{n} min total · dopa {d}', {
                        n: balance.durationMin,
                        d: balance.dopa,
                      })}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {exercises.map((ex, i) => (
                      <motion.div
                        key={ex.exercise_id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[.04] border border-white/[.06]"
                      >
                        <GripVertical size={14} className="text-[var(--muted)] shrink-0" />
                        {/* Reordenar: la secuencia importa en el player (spec CHISPA-UX-002) */}
                        <div className="flex flex-col shrink-0">
                          <button
                            onClick={() => moveExercise(i, -1)}
                            disabled={i === 0}
                            aria-label={t('Subir')}
                            className="w-6 h-5 rounded-md bg-white/[.06] flex items-center justify-center text-[var(--muted)] hover:text-[#ffb454] disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ArrowUp size={10} />
                          </button>
                          <button
                            onClick={() => moveExercise(i, 1)}
                            disabled={i === exercises.length - 1}
                            aria-label={t('Bajar')}
                            className="w-6 h-5 rounded-md bg-white/[.06] flex items-center justify-center text-[var(--muted)] hover:text-[#ffb454] disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ArrowDown size={10} />
                          </button>
                        </div>
                        <span className="w-8 h-8 rounded-lg overflow-hidden bg-[#0f1420] border border-white/[.06] shrink-0">
                          <ExerciseImage {...(exerciseVisual[ex.name] ?? { src: null, fallbackIcon: Dumbbell })} size={14} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{ex.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {/* Sets */}
                            <button
                              onClick={() => updateExercise(i, { sets: Math.max(1, ex.sets - 1) })}
                              className="w-6 h-6 rounded-md bg-white/[.06] flex items-center justify-center text-[10px] text-[var(--muted)]"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-xs font-bold tabular-nums min-w-[20px] text-center">{ex.sets}</span>
                            <button
                              onClick={() => updateExercise(i, { sets: Math.min(6, ex.sets + 1) })}
                              className="w-6 h-6 rounded-md bg-white/[.06] flex items-center justify-center text-[10px] text-[var(--muted)]"
                            >
                              <Plus size={10} />
                            </button>
                            <span className="text-[10px] text-[var(--muted)] ml-1">{t('series')}</span>

                            {/* Reps */}
                            <button
                              onClick={() => updateExercise(i, { reps: Math.max(1, ex.reps - 5) })}
                              className="w-6 h-6 rounded-md bg-white/[.06] flex items-center justify-center text-[10px] text-[var(--muted)]"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-xs font-bold tabular-nums min-w-[20px] text-center">{ex.reps}</span>
                            <button
                              onClick={() => updateExercise(i, { reps: Math.min(120, ex.reps + 5) })}
                              className="w-6 h-6 rounded-md bg-white/[.06] flex items-center justify-center text-[10px] text-[var(--muted)]"
                            >
                              <Plus size={10} />
                            </button>
                            <span className="text-[10px] text-[var(--muted)]">{t('reps')}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeExercise(i)}
                          className="w-8 h-8 rounded-lg bg-white/[.04] flex items-center justify-center text-[#ff5470] hover:bg-[rgba(255,84,112,0.1)]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Action buttons */}
              <div className="space-y-2.5 pb-4">
                <Button
                  variant="primary"
                  size="large"
                  className={`w-full ${balance.sufficient ? 'glow-pulse' : ''}`}
                  disabled={!canProceed}
                  onClick={startWorkout}
                >
                  <Play size={18} /> {t('Empezar ahora')}
                </Button>
                <Button
                  variant="ghost"
                  size="large"
                  className="w-full"
                  disabled={!canProceed}
                  onClick={saveTemplate}
                >
                  <Save size={18} /> {isEditing ? t('Guardar cambios') : t('Guardar como plantilla')}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                className="w-20 h-20 rounded-full bg-[rgba(52,211,153,0.15)] flex items-center justify-center mb-4"
              >
                <Check size={36} className="text-[#34d399]" />
              </motion.div>
              <h2 className="text-2xl font-black mb-2">{t('Plantilla guardada')}</h2>
              <p className="text-sm text-[var(--muted)] mb-2">
                {name || t('Mi rutina {foco}', { foco: t(FOCUS_LABELS[focus]) })}
              </p>
              <p className="text-xs text-[var(--muted)] mb-8">
                {t('{a} ejercicios · {b} series · ~{c} min', { a: totalEx, b: totalSets, c: duration })}
              </p>
              <div className="flex gap-3 w-full max-w-xs">
                <Button variant="primary" className="flex-1" onClick={startWorkout}>
                  <Play size={16} /> {t('Empezar')}
                </Button>
                <Button variant="ghost" className="flex-1" onClick={() => setView('home')}>
                  {t('Ir al inicio')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
