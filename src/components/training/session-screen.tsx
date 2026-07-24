'use client';

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { fmtTime } from '@/lib/utils/helpers';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { RecRing } from '@/components/ui/ring';

interface SessionExercise {
  exercise_id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: number;
  rest: number;
  status: 'pending' | 'done' | 'skipped';
  progressed?: boolean;
}

/* ─── Animation Variants ─── */

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -15, scale: 0.97 },
};

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
  const plan = useStore((s) => s.plan);
  const setView = useStore((s) => s.setView);
  const setPlan = useStore((s) => s.setPlan);
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
  const [adapted, setAdapted] = React.useState(false);
  const [finished, setFinished] = React.useState(false);
  const [showComplete, setShowComplete] = React.useState(false);
  const completeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Summary data
  const [summary, setSummary] = React.useState<any>(null);

  const ex = exs[idx] || null;
  const totalEx = exs.length;
  const totalSets = exs.reduce((a, e) => a + e.sets, 0);

  useEffect(() => {
    if (plan?.workout?.exercises) {
      const initial = plan.workout.exercises.map((e: any) => ({
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
            endRest();
            return 0;
          }
          return r - 1;
        });
      }

      if (timeRun) {
        setTimeLeft((t) => {
          if (t <= 1) {
            setTimeRun(false);
            completeSet();
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [ex, paused, finished, restLeft, timeRun]);

  const endRest = useCallback(() => {
    const next = exs.findIndex((e, i) => i > idx && e.status === 'pending');
    if (next === -1) {
      finishSession();
      return;
    }
    setIdx(next);
    setSetNum(1);
    setRepsCur(exs[next].reps);
    setRestLeft(0);
    setTimeRun(false);
  }, [exs, idx]);

  const completeSet = useCallback(() => {
    if (!ex) return;
    setDoneSets((d) => d + 1);
    setTimeRun(false);

    if (setNum >= ex.sets) {
      setExs((prev) => prev.map((e, i) => (i === idx ? { ...e, status: 'done' } : e)));
      const next = exs.findIndex((e, i) => i > idx && e.status === 'pending');
      if (next === -1) {
        finishSession();
        return;
      }
      setRestTotal(ex.rest);
      setRestLeft(ex.rest);
    } else {
      setSetNum((s) => s + 1);
      setRepsCur(ex.reps);
    }
  }, [ex, setNum, exs, idx]);

  const skipExercise = useCallback(() => {
    if (!ex) return;
    setExs((prev) => prev.map((e, i) => (i === idx ? { ...e, status: 'skipped' } : e)));
    const next = exs.findIndex((e, i) => i > idx && e.status === 'pending');
    if (next === -1) {
      finishSession();
      return;
    }
    setIdx(next);
    setSetNum(1);
    setRepsCur(exs[next].reps);
    setRestLeft(0);
    setTimeRun(false);
  }, [ex, exs, idx]);

  const finishSession = useCallback(() => {
    if (finished) return;
    setFinished(true);
    const doneEx = exs.filter((e) => e.status === 'done').length;
    const rate = totalSets > 0 ? doneSets / totalSets : 0;
    setSummary({
      minutes: Math.max(1, Math.round(elapsed / 60)),
      doneEx,
      totalEx,
      doneSets,
      plannedSets: totalSets,
      rate,
      adapted,
      rpe: null,
      motiv: null,
    });
    setView('summary');
  }, [finished, exs, doneSets, totalSets, elapsed, adapted, setView]);

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
      completeSet();
    }, 400);
  }, [completeSet]);

  const handleEasier = () => {
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
    logEvent('adaptation', {});
  };

  if (!ex) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[#94a0b8]"
        >
          Preparando sesión...
        </motion.p>
      </div>
    );
  }

  const isTime = typeof ex.reps === 'number' && ex.reps > 50;

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
        className="text-xs text-[#94a0b8] uppercase tracking-widest mb-4"
      >
        Descanso
      </motion.p>
      <motion.div
        animate={restLeft <= 5 ? { scale: [1, 1.05, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
      >
        <RecRing pct={restTotal > 0 ? ((restTotal - restLeft) / restTotal) * 100 : 0} size={140} strokeWidth={10}>
          <span className={`text-4xl font-bold transition-colors ${restLeft <= 5 ? 'text-[#ffb454]' : ''}`}>{restLeft}</span>
          <span className="text-xs text-[#94a0b8]">seg</span>
        </RecRing>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-[#94a0b8] mt-4"
      >
        Siguiente: {ex.name}
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button variant="ghost" className="mt-4" onClick={() => setRestLeft(0)}>
          Saltar descanso <Icons.ChevronRight />
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
          className="text-5xl mb-2"
        >
          {EX_EMOJIS[ex.name] || '🏋️'}
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
          className="text-sm text-[#94a0b8] my-3 leading-relaxed"
        >
          {EX_CUES[ex.name] || 'Mantén la forma'}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="flex justify-center gap-2 mb-5"
        >
          <Badge variant="ghost">Serie {setNum} de {ex.sets}</Badge>
          {ex.progressed && <Badge variant="accent">Progresión +2 reps</Badge>}
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
            <p className="text-xs text-[#94a0b8] uppercase mt-1">segundos</p>
            {!timeRun && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button variant="primary" className="mt-4" onClick={() => { setTimeRun(true); setTimeLeft(ex.reps); }}>
                  <Icons.Play /> Iniciar serie
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
              whileHover={{ scale: 1.05 }}
              className="w-14 h-14 rounded-full border border-white/[.07] bg-[#151b2a] flex items-center justify-center text-white transition-shadow hover:shadow-[0_0_20px_rgba(255,180,84,0.15)]"
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
              <p className="text-xs text-[#94a0b8] uppercase mt-1">repeticiones</p>
            </motion.div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.05 }}
              className="w-14 h-14 rounded-full border border-white/[.07] bg-[#151b2a] flex items-center justify-center text-white transition-shadow hover:shadow-[0_0_20px_rgba(255,180,84,0.15)]"
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
              <Icons.Check /> {setNum >= ex.sets ? 'Terminar ejercicio' : 'Serie hecha'}
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
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="ghost" onClick={skipExercise}>Saltar</Button>
            <Button variant="ghost" onClick={() => setPaused(true)}><Icons.Pause /> Pausa</Button>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-xs text-[#94a0b8] mt-5"
        >
          Descansa entre series lo que necesites. Sin cronómetro de culpa.
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
          className="w-11 h-11 rounded-2xl border border-white/[.07] bg-[#151b2a] flex items-center justify-center text-white hover:bg-white/[.08] transition-colors"
          onClick={() => setPaused(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 5l-7 7 7 7"/></svg>
        </motion.button>
        <div className="text-center">
          <span className="text-lg font-bold tabular-nums">{fmtTime(elapsed)}</span>
          <p className="text-xs text-[#94a0b8]">Ejercicio {idx + 1} de {totalEx}</p>
        </div>
        <Badge variant="light">{doneSets}/{totalSets} series</Badge>
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
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              i === idx ? 'bg-[#ffb454] scale-125 shadow-[0_0_6px_rgba(255,180,84,0.5)]' :
              e.status === 'done' ? 'bg-[#34d399]' :
              e.status === 'skipped' ? 'bg-white/[.22]' : 'bg-white/[.12]'
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
                <h3 className="text-xl font-black text-center mb-2">Pausa ⏸</h3>
                <p className="text-sm text-[#94a0b8] text-center mb-4">¿Cómo vas de energía?</p>
                <motion.div
                  initial="initial"
                  animate="animate"
                  className="space-y-2.5"
                >
                  {[
                    { emoji: '⚡', label: 'Bien, sigo', action: () => setPaused(false) },
                    { emoji: '😮‍💨', label: 'Cansado/a · Quitar 1 serie', action: handleEasier },
                    { emoji: '🛑', label: 'Terminar aquí · Guardamos lo hecho', action: finishSession },
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
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="font-semibold text-sm">{opt.label}</span>
                    </motion.button>
                  ))}
                </motion.div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const EX_EMOJIS: Record<string, string> = {
  'Sentadilla': '🦵', 'Zancadas': '🚶', 'Puente de glúteos': '🌉',
  'Gemelos de pie': '🦶', 'Sentadilla en pared': '🧱', 'Sentadilla con salto': '🦘',
  'Equilibrio a una pierna': '🦩',
  'Flexiones': '🙌', 'Flexiones inclinadas': '🙌', 'Flexión diamante': '💎',
  'Fondos en silla': '🪑',
  'Superman': '🦸',
  'Plancha': '🧘', 'Plancha lateral': '🧘', 'Escaladores': '⛰️',
  'Toque de hombros': '👋', 'Crunch': '🧎',
  'Jumping jacks': '⭐', 'Rodillas arriba': '🏃', 'Burpees': '💥',
  'Medio burpee': '💫',
  'Círculos de brazos': '🔄', 'Yoga flow suave': '🌊',
  'Press de pecho con mancuernas': '🏋️', 'Press de hombros': '🏋️',
  'Press francés': '🇫🇷', 'Curl de bíceps': '💪',
  'Elevaciones laterales': '🕊️', 'Remo con mancuerna': '🚣',
  'Aperturas inversas': '🕊️',
  'Sentadilla goblet': '🏆', 'Peso muerto rumano': '🏋️',
  'Zancada con mancuernas': '🚶', 'Hip thrust con mancuerna': '🌉',
  'Gemelos con mancuernas': '🦶', 'Russian twist con mancuerna': '🔄',
  'Press de banca': '🛋️', 'Press inclinado': '🛋️',
  'Press militar': '🎖️', 'Fondos en paralelas': '📐',
  'Dominadas': '🐒', 'Jalón al pecho': '⬇️',
  'Remo en máquina': '🚣', 'Face pull': '🎯',
  'Remo con barra': '🚣',
  'Sentadilla con barra': '🏋️', 'Peso muerto': '🏋️',
  'Hip thrust con barra': '🌉', 'Prensa de piernas': '🦵',
  'Curl femoral': '🦵', 'Extensión de cuádriceps': '🦵',
  'Curl con barra': '💪', 'Extensión tríceps en polea': '🔽',
  'Crunch en polea': '🧎', 'Elevación de piernas colgado': '🤸',
  'Elíptica': '🌀', 'Bicicleta estática': '🚴',
  'Caminata en pendiente': '⛰️', 'Remo ergómetro': '🚣',
};

const EX_CUES: Record<string, string> = {
  'Sentadilla': 'Baja como si te sentaras, espalda recta',
  'Zancadas': 'Paso largo, rodilla trasera al suelo',
  'Puente de glúteos': 'Tumbado, eleva la cadera y aprieta',
  'Gemelos de pie': 'Eleva los talones y baja despacio',
  'Sentadilla en pared': 'Espalda en la pared, muslos paralelos',
  'Sentadilla con salto': 'Sentadilla y salta al subir',
  'Equilibrio a una pierna': 'Mantén el equilibrio, cambia de pierna',
  'Flexiones': 'Cuerpo en línea, baja lentamente',
  'Flexiones inclinadas': 'Manos en una superficie alta',
  'Flexión diamante': 'Manos juntas bajo el pecho',
  'Fondos en silla': 'Manos en la silla, baja el cuerpo',
  'Superman': 'Boca abajo, eleva brazos y piernas',
  'Plancha': 'Cuerpo recto, aprieta el abdomen',
  'Plancha lateral': 'Cadera arriba, cuerpo alineado',
  'Escaladores': 'En plancha, rodillas al pecho rápido',
  'Toque de hombros': 'En plancha, toca el hombro contrario',
  'Crunch': 'Encoge el abdomen, baja controlado',
  'Jumping jacks': 'Salta abriendo brazos y piernas',
  'Rodillas arriba': 'Corre en el sitio, rodillas altas',
  'Burpees': 'Sentadilla, plancha, flexión, salto',
  'Medio burpee': 'Sentadilla, plancha y vuelve',
  'Círculos de brazos': 'Brazos extendidos, círculos amplios',
  'Yoga flow suave': 'Plancha → cobra → perro boca abajo',
  'Press de pecho con mancuernas': 'Tumbado, empuja las mancuernas',
  'Press de hombros': 'Empuja sobre la cabeza',
  'Press francés': 'Codos arriba, extiende el antebrazo',
  'Curl de bíceps': 'Codos fijos, sube la mancuerna',
  'Elevaciones laterales': 'Brazos hasta la altura del hombro',
  'Remo con mancuerna': 'Inclinado, tira del codo hacia atrás',
  'Aperturas inversas': 'Inclinado, abre los brazos hacia atrás',
  'Sentadilla goblet': 'Mancuerna al pecho, baja profundo',
  'Peso muerto rumano': 'Cadera atrás, espalda neutra',
  'Zancada con mancuernas': 'Zancada con peso a los lados',
  'Hip thrust con mancuerna': 'Espalda en banco, empuja la cadera',
  'Gemelos con mancuernas': 'Eleva los talones con peso',
  'Russian twist con mancuerna': 'Rota el torso lado a lado',
  'Press de banca': 'Empuja la barra sobre el pecho',
  'Press inclinado': 'Banca inclinada, empuja hacia arriba',
  'Press militar': 'Empuja la barra sobre la cabeza',
  'Fondos en paralelas': 'Baja hasta 90° y sube',
  'Dominadas': 'Tira hasta la barbilla sobre la barra',
  'Jalón al pecho': 'Tira de la barra hacia el pecho',
  'Remo en máquina': 'Tira hacia tu abdomen',
  'Face pull': 'Tira de la cuerda hacia la cara',
  'Remo con barra': 'Inclinado, tira la barra al abdomen',
  'Sentadilla con barra': 'Barra en la espalda, baja profundo',
  'Peso muerto': 'Barra al suelo, cadera y rodillas a la vez',
  'Hip thrust con barra': 'Espalda en banco, empuja la cadera',
  'Prensa de piernas': 'Empuja sin bloquear rodillas',
  'Curl femoral': 'Dobla la rodilla contra resistencia',
  'Extensión de cuádriceps': 'Extiende la rodilla controlado',
  'Curl con barra': 'Sube la barra con los bíceps',
  'Extensión tríceps en polea': 'Codos pegados, extiende hacia abajo',
  'Crunch en polea': 'De rodillas, encoge el abdomen',
  'Elevación de piernas colgado': 'Cuélgate, sube las piernas a 90°',
  'Elíptica': 'Ritmo suave y constante',
  'Bicicleta estática': 'Pedaleo constante, resistencia media',
  'Caminata en pendiente': 'Cinta inclinada, paso constante',
  'Remo ergómetro': 'Empuje de piernas, luego brazos',
};
