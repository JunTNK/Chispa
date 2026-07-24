'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import {
  DecisionEngine,
  TrainingAgent,
  MotivationEngine,
  calculateRecoveryScore,
  calculateConsistency,
} from '@/lib/agents/decision-engine';
import { todayKey, recColor, recWord } from '@/lib/utils/helpers';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RecRing } from '@/components/ui/ring';
import { Slider } from '@/components/ui/slider';
import { Icons } from '@/components/ui/icons';

function CheckInCard() {
  const [sleep, setSleep] = React.useState(7);
  const [energy, setEnergy] = React.useState(6);
  const [stress, setStress] = React.useState(4);
  const setCheckin = useStore((s) => s.setCheckin);
  const logEvent = useStore((s) => s.logEvent);
  const setPlan = useStore((s) => s.setPlan);
  const profile = useStore((s) => s.profile);
  const twin = useStore((s) => s.twin);
  const workouts = useStore((s) => s.workouts);

  const rec = calculateRecoveryScore({
    user_id: '', date: todayKey(), sleep, energy, stress, recovery_score: 0, created_at: '',
  });

  const handleSave = () => {
    setCheckin(todayKey(), {
      user_id: '', date: todayKey(), sleep, energy, stress, recovery_score: rec.score, created_at: '',
    });
    logEvent('checkin', { recovery: rec.score });

    if (profile && twin) {
      const cons = calculateConsistency(
        workouts.filter((w) => {
          const d = Math.floor((new Date(todayKey()).getTime() - new Date(w.date).getTime()) / 86400000);
          return d <= 29 && w.completed_rate >= 0.5;
        }).length,
        profile.days_per_week === '4-5' ? 4 : 3
      );

      const decision = DecisionEngine.decide({
        checkin: { user_id: '', date: todayKey(), sleep, energy, stress, recovery_score: rec.score, created_at: '' },
        consistency: cons,
        twin,
        profile: profile as any,
      });

      const plan: any = { ...decision, date: todayKey(), done: false };

      if (decision.action === 'restore') {
        plan.message = MotivationEngine.restMessage(twin.motivation_style);
      } else {
        const workout = TrainingAgent.generate(decision, twin, profile.equipment);
        plan.workout = workout;
        plan.message = MotivationEngine.message(
          twin.motivation_style,
          decision.recovery_score ?? 60,
          decision.consistency.consistency_pct,
          decision.duration
        );
      }

      setPlan(plan);
      logEvent('decision', { intensity: decision.intensity, confidence: decision.confidence });
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold text-base">Check-in diario</span>
        <Badge variant="ghost">30 segundos</Badge>
      </div>
      <p className="text-sm text-[#94a0b8] mb-4">
        El motor necesita saber cómo llegas hoy para adaptar tu sesión.
      </p>

      <div className="flex justify-center mb-4">
        <RecRing pct={rec.score} size={90} strokeWidth={8}>
          <span className="text-2xl font-bold">{rec.score}</span>
          <span className="text-[10px] text-[#94a0b8]">recovery</span>
        </RecRing>
      </div>
      <div className="text-center -mt-2 mb-5">
        <Badge variant={rec.score >= 55 ? 'light' : rec.score >= 35 ? 'standard' : 'minimal'}>
          {recWord(rec.score)}
        </Badge>
      </div>

      <div className="space-y-5">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>😴 Sueño anoche</span>
            <span className="font-bold text-[#ffb454]">{sleep}h</span>
          </div>
          <Slider value={[sleep]} onValueChange={([v]) => setSleep(v)} min={3} max={10} step={0.5} />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>⚡ Energía ahora</span>
            <span className="font-bold text-[#ffb454]">{energy}/10</span>
          </div>
          <Slider value={[energy]} onValueChange={([v]) => setEnergy(v)} min={1} max={10} step={1} />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>😰 Estrés / tensión</span>
            <span className="font-bold text-[#ffb454]">{stress}/10</span>
          </div>
          <Slider value={[stress]} onValueChange={([v]) => setStress(v)} min={1} max={10} step={1} />
        </div>
      </div>

      <Button variant="primary" size="large" className="w-full mt-5" onClick={handleSave}>
        Calcular mi día <Icons.Spark />
      </Button>
    </Card>
  );
}

function PlanCard() {
  const plan = useStore((s) => s.plan);
  const setView = useStore((s) => s.setView);
  const setPlan = useStore((s) => s.setPlan);
  const [showExercises, setShowExercises] = React.useState(false);

  if (!plan || plan.action === 'restore') return null;

  const w = plan.workout;

  return (
    <Card>
      <div className="flex justify-between items-center mb-3">
        <Badge variant={plan.intensity as any}>{plan.intensity}</Badge>
        <span className="flex items-center gap-1 text-xs text-[#94a0b8]">
          <Icons.Spark size={14} /> confianza {plan.confidence}%
        </span>
      </div>
      <h2 className="text-2xl font-black tracking-tight mb-1">{w.title}</h2>
      <div className="flex items-center gap-3 text-sm text-[#94a0b8] mb-4">
        <span className="flex items-center gap-1"><Icons.Clock /> {w.duration} min</span>
        <span className="flex items-center gap-1"><Icons.Dumbbell size={16} /> {w.exercises.length} ejercicios</span>
      </div>
      <p className="italic border-l-4 border-[#ffb454] pl-3 py-2 text-sm leading-relaxed mb-4 bg-[rgba(255,180,84,0.06)] rounded-r-xl">
        &ldquo;{plan.message}&rdquo;
      </p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {plan.reasons.map((r: string, i: number) => (
          <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-white/[.05] border border-white/[.07] text-[#94a0b8]">
            {r}
          </span>
        ))}
      </div>

      <Button variant="primary" size="large" className="w-full mb-2" onClick={() => setView('session')}>
        <Icons.Play /> Empezar ahora
      </Button>

      <Button variant="ghost" className="w-full text-sm" onClick={() => setShowExercises(!showExercises)}>
        {showExercises ? 'Ocultar ejercicios' : 'Ver ejercicios'}
      </Button>

      {showExercises && (
        <div className="mt-4 space-y-0.5">
          {w.exercises.map((ex: any, i: number) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/[.07] last:border-0">
              <span className="w-6 h-6 rounded-lg bg-white/[.06] flex items-center justify-center text-xs font-bold text-[#94a0b8] shrink-0">
                {i + 1}
              </span>
              <span className="text-lg shrink-0">{EX_EMOJIS[ex.name] || '🏋️'}</span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{ex.name}</span>
                <span className="text-xs text-[#94a0b8]">
                  {ex.sets} × {ex.reps} reps
                  {ex.progressed && <span className="text-[#ffb454] font-bold ml-2">progresión +2</span>}
                </span>
              </div>
            </div>
          ))}
          <p className="text-xs text-[#94a0b8] text-center mt-4 leading-relaxed">
            Puedes parar cuando quieras. Guardamos todo lo hecho.
          </p>
        </div>
      )}
    </Card>
  );
}

function RestCard() {
  const plan = useStore((s) => s.plan);
  const logEvent = useStore((s) => s.logEvent);

  if (!plan || plan.action !== 'restore') return null;

  const suggestions = [
    { emoji: '🚶', text: 'Caminata de 15 min' },
    { emoji: '🧘', text: 'Estiramiento suave' },
    { emoji: '🌬️', text: 'Respiración 5 min' },
  ];

  return (
    <Card>
      <Badge variant="minimal">Recuperación</Badge>
      <h2 className="text-2xl font-black tracking-tight mt-3 mb-1">Hoy toca recargar 🔋</h2>
      <p className="italic border-l-4 border-[#ffb454] pl-3 py-2 text-sm leading-relaxed mb-4 bg-[rgba(255,180,84,0.06)] rounded-r-xl">
        &ldquo;{plan.message}&rdquo;
      </p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {plan.reasons.map((r: string, i: number) => (
          <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-white/[.05] border border-white/[.07] text-[#94a0b8]">
            {r}
          </span>
        ))}
      </div>
      <div className="space-y-2.5">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => {
              logEvent('rest_activity', {});
            }}
            className="flex items-center gap-3 w-full min-h-[52px] p-4 rounded-2xl border border-white/[.07] bg-[#1a2234] text-left transition-colors active:scale-[0.98]"
          >
            <span className="text-xl">{s.emoji}</span>
            <span className="font-semibold text-sm">{s.text}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function DoneCard() {
  const plan = useStore((s) => s.plan);
  const setView = useStore((s) => s.setView);

  if (!plan?.result) return null;

  const r = plan.result;
  const pct = Math.round(r.rate * 100);
  const title = r.rate >= 0.8 ? 'Hoy ya entrenaste ✓' : r.rate >= 0.4 ? 'Sesión guardada ✓' : 'Movimiento registrado 🌱';

  return (
    <Card className="text-center">
      <div className="text-4xl mb-2">{r.rate >= 0.8 ? '✅' : '🌱'}</div>
      <h2 className="text-2xl font-black tracking-tight mb-1">{title}</h2>
      <p className="text-sm text-[#94a0b8] mb-4">
        {r.minutes} min · {r.doneEx}/{r.totalEx} ejercicios · {pct}% completado
      </p>
      <p className="italic border-l-4 border-[#ffb454] pl-3 py-2 text-sm leading-relaxed mb-4 bg-[rgba(255,180,84,0.06)] rounded-r-xl">
        &ldquo;La consistencia se construye así: un día cada vez.&rdquo;
      </p>
      <Button variant="ghost" className="w-full" onClick={() => setView('coach')}>
        Hablar con el Coach <Icons.ChevronRight />
      </Button>
    </Card>
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

function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-white/[.07] bg-[#151b2a] p-5 space-y-4">
      <div className="skeleton h-5 w-28" />
      <div className="skeleton h-4 w-48" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-12 w-full" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
      <div className="skeleton h-14 w-full" />
    </div>
  );
}

export function HomeScreen() {
  const checkins = useStore((s) => s.checkins);
  const plan = useStore((s) => s.plan);
  const twin = useStore((s) => s.twin);
  const workouts = useStore((s) => s.workouts);
  const profile = useStore((s) => s.profile);

  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Show skeleton briefly for smooth initial transition, skip if already hydrated
    const hasData = profile || Object.keys(checkins).length > 0;
    const timer = setTimeout(() => setLoading(false), hasData ? 100 : 400);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const today = todayKey();
  const hasCheckin = !!checkins[today];
  const hasPlan = plan && plan.date === today;

  const cons = React.useMemo(() => {
    if (!profile) return { consistency_pct: 0, sessions_done: 0, sessions_target: 0 };
    const target = profile.days_per_week === '4-5' ? 4 : 3;
    const done = workouts.filter((w) => {
      const d = Math.floor((new Date(today).getTime() - new Date(w.date).getTime()) / 86400000);
      return d <= 29 && w.completed_rate >= 0.5;
    }).length;
    return calculateConsistency(done, target);
  }, [workouts, profile, today]);

  const recoveryScore = hasCheckin ? checkins[today].recovery_score : 50;

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-6 space-y-3.5">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
        <div className="skeleton h-16 w-full rounded-2xl" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
      className="px-4 pb-6 space-y-3.5"
    >
      {!hasCheckin && <CheckInCard />}

      {hasCheckin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          <Card className="flex items-center gap-3 p-4">
            <RecRing pct={recoveryScore} size={56} strokeWidth={6}>
              <span className="text-sm font-bold">{recoveryScore}</span>
            </RecRing>
            <div>
              <div className="text-sm font-bold">Recuperación</div>
              <div className="text-xs text-[#94a0b8]">{recWord(recoveryScore)}</div>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <RecRing pct={cons.consistency_pct} size={56} strokeWidth={6} color="#ffb454">
              <span className="text-sm font-bold">{cons.consistency_pct}%</span>
            </RecRing>
            <div>
              <div className="text-sm font-bold">Consistencia</div>
              <div className="text-xs text-[#94a0b8]">{cons.sessions_done}/{cons.sessions_target} sesiones</div>
            </div>
          </Card>
        </motion.div>
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

      {hasCheckin && !hasPlan && (
        <Card className="text-center py-8">
          <div className="text-3xl mb-2 animate-pulse">🌀</div>
          <p className="text-sm text-[#94a0b8]">Generando tu entrenamiento...</p>
          <div className="skeleton h-2 w-3/4 mx-auto mt-4" />
        </Card>
      )}

      {twin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="flex items-center gap-3 p-4 card-hover">
            <span className="text-2xl">💡</span>
            <div>
              <div className="text-sm font-bold">Tu Digital Twin aprendió</div>
              <div className="text-xs text-[#94a0b8]">
                Prefieres sesiones de ~{Math.round(twin.patterns.avg_duration)} min
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
