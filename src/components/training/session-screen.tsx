'use client';

import React, { useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { fmtTime } from '@/lib/utils/helpers';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { RecRing } from '@/components/ui/ring';
import { useExercises } from '@/lib/utils/use-exercises';
import { ExerciseImage, ExerciseMedia, getExerciseVisual, getExerciseMediaUrls } from '@/lib/utils/exercise-visuals';
import type { Exercise, WorkoutExercise } from '@/types';
import { Dumbbell, Zap, Wind, StopCircle, Camera } from 'lucide-react';

// Lazy-load FormCheck (heavy: imports pose engine + onnxruntime)
// Only loaded when user opens the camera form-check overlay
const FormCheck = React.lazy(() => import('./form-check').then(m => ({ default: m.FormCheck })));

// Fallback shown while FormCheck chunk loads
function FormCheckFallback() {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,8,14,0.8)] backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#4CC9F0] border-t-transparent animate-spin" />
        <p className="text-sm text-[var(--muted)]">{t('Cargando cámara...')}</p>
      </div>
    </div>
  );
}

interface SessionExercise {
  exercise_id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: number;
  rest: number;
  completed_sets: number;
  completed_reps: number[];
  status: 'pending' | 'done' | 'skipped';
  progressed?: boolean;
  load_type?: 'reps' | 'time';
}

const dotVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: { delay: i * 0.04, type: 'spring' as const, stiffness: 300, damping: 20 },
  }),
};

const completeVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: [0, 1.2, 1], opacity: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
};

export function SessionScreen() {
  const t = useT();
  const plan = useStore((s) => s.plan);
  const setPlan = useStore((s) => s.setPlan);
  const setView = useStore((s) => s.setView);
  const logEvent = useStore((s) => s.logEvent);

  const [exs, setExs] = React.useState<SessionExercise[]>([]);
  const [idx, setIdx] = React.useState(0);
  const [setNum, setSetNum] = React.useState(1);
  const [repsCur, setRepsCur] = React.useState(0);
  const [elapsed, setElapsed] = React.useState(0);
  const [restLeft, setRestLeft] = React.useState(0);
  const [restTotal, setRestTotal] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [timeRun, setTimeRun] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(0);
  const [doneSets, setDoneSets] = React.useState(0);
  const [, setAdapted] = React.useState(false);
  const [finished, setFinished] = React.useState(false);
  const [showComplete, setShowComplete] = React.useState(false);
  const [showFormCheck, setShowFormCheck] = React.useState(false);
  const completeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for stable callback references (assigned .current right after each useCallback)
  const endRestRef = useRef<() => void>(() => {});
  const completeSetRef = useRef<() => void>(() => {});
  const finishSessionRef = useRef<() => void>(() => {});
  const exsRef = useRef(exs);
  exsRef.current = exs;
  const idxRef = useRef(idx);
  idxRef.current = idx;
  const elapsedRef = useRef(elapsed);
  elapsedRef.current = elapsed;
  const adaptedRef = useRef(false);

  const ex = exs[idx] || null;
  const exRef = useRef(ex);
  exRef.current = ex;
  const totalEx = exs.length;
  const totalSets = exs.reduce((a, e) => a + e.sets, 0);

  const { exercises: catalog, isLoading } = useExercises();

  const exerciseCue = useMemo(() => {
    const lookup: Record<string, string> = {};
    catalog.forEach((e) => { lookup[e.name] = e.cue; });
    return lookup;
  }, [catalog]);

  // Name → visual (image + fallback icon) lookup for the current exercise
  const exerciseVisual = useMemo(() => {
    const lookup: Record<string, { src: string | null; fallbackIcon: React.ComponentType<{ size?: number; className?: string }> }> = {};
    catalog.forEach((e: Exercise) => { lookup[e.name] = getExerciseVisual(e); });
    return lookup;
  }, [catalog]);

  // Name → media URLs (gif + static) lookup for ExerciseMedia
  const exerciseMedia = useMemo(() => {
    const lookup: Record<string, { gifUrl: string; staticUrl: string }> = {};
    catalog.forEach((e: Exercise) => {
      const urls = getExerciseMediaUrls(e);
      if (urls) lookup[e.name] = urls;
    });
    return lookup;
  }, [catalog]);

  useEffect(() => {
    if (plan?.workout?.exercises) {
      const initial = plan.workout.exercises.map((e: WorkoutExercise) => ({
        ...e,
        status: 'pending' as const,
      }));
      setExs(initial);
      setRepsCur(initial[0]?.reps || 0);
    }
  }, [plan]);

  useEffect(() => {
    if (!ex || paused || finished) return;
    const timer = setInterval(() => {
      setElapsed((e) => e + 1);

      if (restLeft > 0) {
        setRestLeft((r) => {
          if (r <= 1) {
            endRestRef.current();
            return 0;
          }
          return r - 1;
        });
      }

      if (timeRun) {
        setTimeLeft((t) => {
          if (t <= 1) {
            setTimeRun(false);
            completeSetRef.current();
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [ex, paused, finished, restLeft, timeRun]);

  const setNumRef = useRef(setNum);
  setNumRef.current = setNum;
  const restTotalRef = useRef(restTotal);
  restTotalRef.current = restTotal;

  // ─── Unified advance() — used by both timer expiry and skip button ───
  // Advances set-by-set within an exercise, then to the next exercise,
  // then finishes the session. This ensures skip-rest and timer-end
  // follow the SAME path (fixes bug: skip-rest was jumping to next exercise
  // instead of next set of the same exercise).
  const advance = useCallback(() => {
    const currentExs = exsRef.current;
    const currentIdx = idxRef.current;
    if (!currentExs[currentIdx]) {
      finishSessionRef.current();
      return;
    }

    const ex = currentExs[currentIdx];
    const currentSetNum = setNumRef.current;

    // Is there another set of THIS exercise to do?
    if (currentSetNum < ex.sets) {
      // Advance to next set of the same exercise
      setSetNum(currentSetNum + 1);
      setRepsCur(ex.reps);
      setRestLeft(0);
      setTimeRun(false);
      return;
    }

    // All sets done — move to next exercise (or finish)
    const next = currentExs.findIndex((e, i) => i > currentIdx && e.status === 'pending');
    if (next === -1) {
      // Mark current exercise as done before finishing
      const doneExs = currentExs.map((e, i) =>
        i === currentIdx ? { ...e, status: 'done' as const } : e
      );
      setExs(doneExs);
      exsRef.current = doneExs;
      finishSessionRef.current();
      return;
    }
    // Mark current exercise done and move to next
    const markedExs = currentExs.map((e, i) =>
      i === currentIdx ? { ...e, status: 'done' as const } : e
    );
    setExs(markedExs);
    exsRef.current = markedExs;
    setIdx(next);
    setSetNum(1);
    setRepsCur(markedExs[next].reps);
    setRestLeft(0);
    setTimeRun(false);
  }, []);
  endRestRef.current = advance;

  const completeSet = useCallback(() => {
    const currentEx = exRef.current;
    const currentIdx = idxRef.current;
    const currentSetNum = setNumRef.current;
    if (!currentEx) return;
    setDoneSets((d) => d + 1);
    setTimeRun(false);

    if (currentSetNum >= currentEx.sets) {
      // Marca el ejercicio como done TAMBIÉN en el ref: setExs es asíncrono y
      // finishSession lee exsRef.current — sin esto, el resultado de la sesión
      // llegaría con status 'pending' y el twin no registraría el ejercicio.
      const nextExs = exsRef.current.map((e, i) => (i === currentIdx ? { ...e, status: 'done' as const } : e));
      setExs(nextExs);
      exsRef.current = nextExs;
      const next = nextExs.findIndex((e, i) => i > currentIdx && e.status === 'pending');
      if (next === -1) {
        finishSessionRef.current();
        return;
      }
      setRestTotal(currentEx.rest);
      setRestLeft(currentEx.rest);
    } else {
      setSetNum((s) => s + 1);
      setRepsCur(currentEx.reps);
    }
  }, []);
  completeSetRef.current = completeSet;

  const skipExercise = useCallback(() => {
    const currentIdx = idxRef.current;
    // Igual que completeSet: marca el estado también en el ref (setExs es
    // asíncrono y finishSession lee exsRef.current).
    const nextExs = exsRef.current.map((e, i) => (i === currentIdx ? { ...e, status: 'skipped' as const } : e));
    setExs(nextExs);
    exsRef.current = nextExs;
    const next = nextExs.findIndex((e, i) => i > currentIdx && e.status === 'pending');
    if (next === -1) {
      finishSessionRef.current();
      return;
    }
    setIdx(next);
    setSetNum(1);
    setRepsCur(nextExs[next].reps);
    setRestLeft(0);
    setTimeRun(false);
  }, []);

  const finishSession = useCallback(() => {
    if (finished) return;
    useStore.getState().trackDecision(4);
    setFinished(true);
    const currentExs = exsRef.current;
    const currentElapsed = elapsedRef.current;
    const doneEx = currentExs.filter((e) => e.status === 'done').length;
    const totalEx = currentExs.length;
    const currentPlan = useStore.getState().plan;
    if (!currentPlan) return;
    setPlan({
      ...currentPlan,
      result: {
        minutes: Math.round(currentElapsed / 60),
        rate: totalEx > 0 ? doneEx / totalEx : 0,
        exs: currentExs,
        doneEx,
        totalEx,
        adapted: adaptedRef.current,
      },
    });
     setView('summary');
     useStore.getState().resetSkipStreak();
   }, [finished, setView, setPlan]);
  finishSessionRef.current = finishSession;

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, []);

  const handleComplete = useCallback(() => {
    setShowComplete(true);
    completeTimerRef.current = setTimeout(() => {
      setShowComplete(false);
      completeSetRef.current();
    }, 400);
  }, []);

  const handleEasier = () => {
    adaptedRef.current = true;
    setExs((prev) =>
      prev.map((e, i) => {
        if (i > idx && e.status === 'pending') {
          return { ...e, sets: Math.max(1, e.sets - 1) };
        }
        return e;
      })
    );
    setAdapted(true);
    setPaused(false);
    useStore.getState().trackDecision(5);
    logEvent('adaptation', {});
  };

  if (!ex) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[var(--muted)]"
        >
          {t('Preparando sesión...')}
        </motion.p>
      </div>
    );
  }

  const isTime = ex.load_type === 'time';

  const renderRest = () => (
    <motion.div
      key="rest"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center py-8"
    >
      <motion.p
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs text-[var(--muted)] uppercase tracking-widest mb-4"
      >
        {t('Descanso')}
      </motion.p>
      <motion.div
        animate={restLeft <= 5 ? { scale: [1, 1.05, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
      >
        <RecRing pct={restTotal > 0 ? ((restTotal - restLeft) / restTotal) * 100 : 0} size={140} strokeWidth={10}>
          <span className={`text-4xl font-bold transition-colors ${restLeft <= 5 ? 'text-[#ffb454]' : ''}`}>{restLeft}</span>
          <span className="text-xs text-[var(--muted)]">{t('seg')}</span>
        </RecRing>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-[var(--muted)] mt-4"
      >
        {t('Siguiente: {name}', { name: ex.name })}
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button variant="ghost" className="mt-4 flex flex-col items-start" onClick={advance}>
          <span>{t('Saltar descanso')}</span>
          <span className="text-xs text-[var(--muted)]">{t('session.skipRestHint')}</span>
        </Button>
      </motion.div>
    </motion.div>
  );

  const renderExercise = () => {
    return (
      <motion.div
        key={`ex-${ex.exercise_id}-${setNum}`}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.25 }}
        className="text-center"
      >
        <motion.div
          key={ex.exercise_id + setNum}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring' as const, stiffness: 200, damping: 15 }}
          className="mb-3"
        >
          <div className="relative w-36 h-36 mx-auto rounded-2xl overflow-hidden border border-white/[.10] bg-[#151b2a] shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
            {exerciseMedia[ex.name] ? (
              <ExerciseMedia
                {...exerciseMedia[ex.name]}
                alt={ex.name}
                className="w-36 h-36 rounded-2xl object-cover"
              />
            ) : (
              <ExerciseImage
                src={exerciseVisual[ex.name]?.src ?? null}
                fallbackIcon={exerciseVisual[ex.name]?.fallbackIcon ?? Dumbbell}
                size={40}
              />
            )}
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-2xl font-black tracking-tight"
        >
          {ex.name}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="text-sm text-[var(--muted)] my-3 leading-relaxed"
        >
          {isLoading ? (
            <span className="skeleton inline-block h-4 w-56 rounded-md" />
          ) : (
            exerciseCue[ex.name] || t('Mantén la forma')
          )}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="flex justify-center gap-2 mb-5"
        >
          <Badge variant="ghost">{t('Serie {a} de {b}', { a: setNum, b: ex.sets })}</Badge>
          {ex.progressed && <Badge variant="accent">{t('Progresión +2 reps')}</Badge>}
        </motion.div>

        {isTime ? (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="py-4"
          >
            <AnimatePresence mode="wait">
              {timeRun ? (
                <motion.span
                  key="timing"
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-6xl font-black"
                >
                  {timeLeft}
                </motion.span>
              ) : (
                <motion.span
                  key="ready"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-6xl font-black"
                >
                  {ex.reps}
                </motion.span>
              )}
            </AnimatePresence>
            <p className="text-xs text-[var(--muted)] uppercase mt-1">{t('segundos')}</p>
            {!timeRun && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button variant="primary" className="mt-4" onClick={() => { setTimeRun(true); setTimeLeft(ex.reps); }}>
                  <Icons.Play /> {t('Iniciar serie')}
                </Button>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-4 py-4"
          >
            <motion.button
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.08 }}
              aria-label={t('Reducir repeticiones')}
              className="w-14 h-14 rounded-full border border-[rgba(255,180,84,0.3)] bg-[#151b2a] flex items-center justify-center text-[#ffb454] transition-all hover:shadow-[0_0_24px_rgba(255,180,84,0.25)] hover:bg-[rgba(255,180,84,0.08)]"
              onClick={() => setRepsCur((r) => Math.max(1, r - 1))}
            >
              <Icons.Minus />
            </motion.button>
            <motion.div
              key={repsCur}
              initial={{ scale: 1.3, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring' as const, stiffness: 400, damping: 15 }}
              className="text-center"
            >
              <span className="text-5xl font-black">{repsCur}</span>
              <p className="text-xs text-[var(--muted)] uppercase mt-1">{t('repeticiones')}</p>
            </motion.div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.08 }}
              aria-label={t('Aumentar repeticiones')}
              className="w-14 h-14 rounded-full border border-[rgba(255,180,84,0.3)] bg-[#151b2a] flex items-center justify-center text-[#ffb454] transition-all hover:shadow-[0_0_24px_rgba(255,180,84,0.25)] hover:bg-[rgba(255,180,84,0.08)]"
              onClick={() => setRepsCur((r) => Math.min(99, r + 1))}
            >
              <Icons.Plus />
            </motion.button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-2.5 mt-4"
        >
          <div className="relative">
            <Button variant="primary" size="large" className="w-full" onClick={handleComplete}>
              <Icons.Check /> {setNum >= ex.sets ? t('Terminar ejercicio') : t('Serie hecha')}
            </Button>
            <AnimatePresence>
              {showComplete && (
                <motion.div
                  variants={completeVariants}
                  initial="initial"
                  animate="animate"
                  exit={{ opacity: 0, scale: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-[#ffb454] to-[#ff7a3d] rounded-lg"
                >
                  <Icons.Check size={28} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={skipExercise}
              className="rounded-xl border border-white/[.07] bg-[#151b2a] px-2 py-2.5 text-xs font-semibold text-[var(--muted)] hover:bg-white/[.08] transition-colors"
            >{t('Saltar')}</motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFormCheck(true)}
              className="flex items-center justify-center gap-1 rounded-xl border bg-[#151b2a] px-2 py-2.5 text-xs font-semibold transition-colors"
              style={{ color: '#4CC9F0', borderColor: 'rgba(76,201,240,0.35)' }}
            ><Camera size={13} /> <span>{t('Postura')}</span></motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setPaused(true)}
              className="flex items-center justify-center gap-1 rounded-xl border border-white/[.07] bg-[#151b2a] px-2 py-2.5 text-xs font-semibold text-[var(--muted)] hover:bg-white/[.08] transition-colors"
            ><Icons.Pause size={13} /> <span>{t('Pausa')}</span></motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { useStore.getState().trackSkip(); logEvent('session_skip', {}); finishSession(); }}
              aria-label={t('Terminar aquí')}
              className="flex items-center justify-center gap-1 rounded-xl border border-white/[.07] bg-[#151b2a] px-2 py-2.5 text-xs font-semibold text-[var(--muted)] hover:bg-white/[.08] hover:text-[#00D4AA] transition-colors"
            ><StopCircle size={13} /> <span>{t('Terminar aquí')}</span></motion.button>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-xs text-[var(--muted)] mt-5"
        >
          {t('Descansa entre series lo que necesites. Sin cronómetro de culpa.')}
        </motion.p>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
      className="min-h-dvh flex flex-col"
    >
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center justify-between px-4 py-4"
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          aria-label={t('Volver')}
          className="w-11 h-11 rounded-2xl border border-white/[.07] bg-[#151b2a] flex items-center justify-center text-white hover:bg-white/[.08] transition-colors"
          onClick={() => setPaused(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 5l-7 7 7 7"/></svg>
        </motion.button>
        <div className="text-center">
          <span className="text-lg font-bold tabular-nums">{fmtTime(elapsed)}</span>
          <p className="text-xs text-[var(--muted)]">{t('Ejercicio {a} de {b}', { a: idx + 1, b: totalEx })}</p>
        </div>
        <Badge variant="light">{t('{a}/{b} series', { a: doneSets, b: totalSets })}</Badge>
      </motion.div>

      {/* Animated progress dots */}
      <motion.div
        initial="initial"
        animate="animate"
        className="flex justify-center gap-1.5 px-4 pb-3 flex-wrap"
      >
        {exs.map((e, i) => (
          <motion.span
            key={i}
            custom={i}
            variants={dotVariants}
            whileHover={{ scale: 1.3 }}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              i === idx
                ? 'bg-[#ffb454] scale-125 dot-glow'
                : e.status === 'done'
                  ? 'bg-[#34d399] shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                  : e.status === 'skipped'
                    ? 'bg-white/[.22]'
                    : 'bg-white/[.12] border border-white/[.20]'
            }`}
          />
        ))}
      </motion.div>

      <div className="flex-1 px-4 pb-4">
        <Card className="min-h-[340px]">
          <AnimatePresence mode="wait">
            {restLeft > 0 ? renderRest() : renderExercise()}
          </AnimatePresence>
        </Card>
      </div>

      {/* Animated pause overlay */}
      <AnimatePresence>
        {paused && (
          <motion.div
            key="pause-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[rgba(5,8,14,0.72)] backdrop-blur-md z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 25 }}
            >
              <Card className="w-full max-w-sm">
                 <h3 className="text-xl font-black text-center mb-2">{t('Pausa')}</h3>
                <p className="text-sm text-[var(--muted)] text-center mb-4">{t('¿Cómo vas de energía?')}</p>
                <motion.div
                  initial="initial"
                  animate="animate"
                  className="space-y-2.5"
                >
                  {[
                    { icon: Zap, label: t('Bien, sigo'), action: () => setPaused(false) },
                    { icon: Wind, label: t('Cansado/a · Quitar 1 serie'), action: handleEasier },
                    { icon: StopCircle, label: t('Terminar aquí · Guardamos lo hecho'), action: finishSession },
                  ].map((opt, oi) => (
                    <motion.button
                      key={oi}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + oi * 0.07 }}
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-3 w-full min-h-[56px] p-4 rounded-2xl border border-white/[.07] bg-[#1a2234] text-left transition-colors"
                      onClick={opt.action}
                    >
                      <span className="text-xl text-[#ffb454]"><opt.icon size={20} /></span>
                      <span className="font-semibold text-sm">{opt.label}</span>
                    </motion.button>
                  ))}
                </motion.div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Check overlay — lazy-loaded (pose engine + onnxruntime) */}
      <AnimatePresence>
        {showFormCheck && ex && (
          <Suspense fallback={<FormCheckFallback />}>
            <FormCheck
              exerciseName={ex.name}
              muscleGroup={ex.muscle}
              onClose={() => setShowFormCheck(false)}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

