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
import { todayKey, recWord } from '@/lib/utils/helpers';
import type { WorkoutExercise } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RecRing } from '@/components/ui/ring';
import { Slider } from '@/components/ui/slider';
import {
  Moon,
  Zap,
  Frown,
  Dumbbell,
  Footprints,
  StretchHorizontal,
  Wind,
  Battery,
  Sparkles,
  TrendingUp,
  Lightbulb,
  PenLine,
  Plus,
} from 'lucide-react';
import { Icons } from '@/components/ui/icons';
import { WarningIcon } from '@/components/ui/icons-rpg';
import { supabaseSync } from '@/lib/sync/supabase-sync';
import { computeTotalXp, computeLevel } from '@/lib/awards/achievements';
import { logError } from '@/lib/utils/logger';

/* ─── Flame Icon for streak ─── */
function FlameIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2.6-1.5-4C8 5.5 9 3 12 2c-.5 2 .5 3.5 2 5s3 3.5 3 6a5 5 0 0 1-10 0c0-1 .3-2 .8-2.8.3 1.3 1 2.3 1.7 2.8z"/>
    </svg>
  );
}

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
    useStore.getState().trackDecision(6);
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
        profile,
      });

      if (decision.action === 'restore') {
        setPlan({
          ...decision,
          date: todayKey(),
          done: false,
          message: MotivationEngine.restMessage(twin.motivation_style),
        });
      } else {
        const clientLastFocus = typeof window !== 'undefined' ? (localStorage.getItem('chispa_last_focus') ?? undefined) : undefined;
        const workout = TrainingAgent.generate(decision, twin, profile.equipment, undefined, clientLastFocus);
        setPlan({
          ...decision,
          date: todayKey(),
          done: false,
          workout,
          message: MotivationEngine.message(
            twin.motivation_style,
            decision.recovery_score ?? 60,
            decision.consistency.consistency_pct,
            decision.duration
          ),
        });
      }

      supabaseSync.push({
        checkins: { [todayKey()]: { user_id: '', date: todayKey(), sleep, energy, stress, recovery_score: rec.score, created_at: '' } },
      }).catch(logError('home:push-checkin'));

      logEvent('decision', { intensity: decision.intensity, confidence: decision.confidence });
    }
  };

  return (
    <Card className="overflow-hidden animate-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base">Check-in diario</span>
          <Badge variant="ghost">30s</Badge>
        </div>
        <div className="text-right">
          <span key={rec.score} className="text-2xl font-black text-[#ffb454] counter-pop inline-block">{rec.score}</span>
          <div className="text-[10px] text-[#94a0b8] -mt-1">recovery</div>
        </div>
      </div>
      <p className="text-sm text-[#94a0b8] mb-5 leading-relaxed">
        ¿Cómo llegas hoy? El motor adapta tu sesión con estos datos.
      </p>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="flex items-center gap-1.5"><Moon size={16} /> Sueño</span>
            <span className="font-bold text-[#ffb454]">{sleep}h</span>
          </div>
          <Slider value={[sleep]} onValueChange={([v]) => setSleep(v)} min={3} max={10} step={0.5} />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="flex items-center gap-1.5"><Zap size={16} /> Energía</span>
            <span className="font-bold text-[#ffb454]">{energy}/10</span>
          </div>
          <Slider value={[energy]} onValueChange={([v]) => setEnergy(v)} min={1} max={10} step={1} />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="flex items-center gap-1.5"><Frown size={16} /> Estrés</span>
            <span className="font-bold text-[#ffb454]">{stress}/10</span>
          </div>
          <Slider value={[stress]} onValueChange={([v]) => setStress(v)} min={1} max={10} step={1} />
        </div>
      </div>

      <div>
          <Button variant="primary" size="large" className="w-full mt-5" onClick={handleSave}>
            Calcular mi día <Icons.Spark />
          </Button>
        </div>
      </Card>
  );
}

function ExerciseItem({ ex, index }: { ex: WorkoutExercise; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/[.04] border border-white/[.06]"
    >
      <span className="flex items-center justify-center text-xs font-bold text-[#94a0b8] shrink-0 w-5">
        {index + 1}
      </span>
      <Dumbbell size={20} className="shrink-0 text-[#ffb454]" />
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold">{ex.name}</span>
        <span className="text-xs text-[#94a0b8]">
          {ex.sets} × {ex.reps} reps
          {ex.progressed && <span className="text-emerald-400 font-bold ml-2">+2 reps</span>}
        </span>
      </div>
    </motion.div>
  );
}

function PlanCard() {
  const plan = useStore((s) => s.plan);
  const setView = useStore((s) => s.setView);

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
          <Badge variant={plan.intensity}>{plan.intensity === 'push' ? 'Al máximo' : plan.intensity === 'light' ? 'Suave' : plan.intensity === 'minimal' ? 'Express' : 'Estándar'}</Badge>
          <span className="flex items-center gap-1 text-xs text-[#94a0b8]">
            <Icons.Spark size={14} /> {plan.confidence}%
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
        <div className="flex flex-wrap gap-1.5 mb-5">
          {plan.reasons.map((r: string, i: number) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-white/[.05] border border-white/[.07] text-[#94a0b8]">
              {r}
            </span>
          ))}
        </div>

        <div className="space-y-2 mb-5">
          {w.exercises.map((ex: WorkoutExercise, i: number) => (
            <ExerciseItem key={i} ex={ex} index={i} />
          ))}
        </div>

        <div className="flex gap-2">
          <motion.div
            className="flex-1"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button variant="primary" size="large" className="w-full" onClick={() => { useStore.getState().trackDecision(5); setView('session'); }}>
              <Icons.Play /> Empezar ahora
            </Button>
          </motion.div>
        </div>
        <p className="text-xs text-[#94a0b8] text-center mt-3 leading-relaxed">
          Puedes parar cuando quieras. Guardamos todo lo hecho.
        </p>
      </Card>
    </motion.div>
  );
}

function RestCard() {
  const plan = useStore((s) => s.plan);
  const logEvent = useStore((s) => s.logEvent);

  if (!plan || plan.action !== 'restore') return null;

  const suggestions = [
    { icon: Footprints, text: 'Caminata de 15 min', desc: 'Activa la circulación sin impacto' },
    { icon: StretchHorizontal, text: 'Estiramiento suave', desc: 'Libera tensión muscular acumulada' },
    { icon: Wind, text: 'Respiración 5 min', desc: 'Reduce el cortisol y calma el sistema' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="animate-in">
        <Badge variant="minimal">Recuperación</Badge>
        <h2 className="text-2xl font-black tracking-tight mt-3 mb-1">Hoy toca recargar <Battery size={20} className="inline" /></h2>
        <p className="italic border-l-4 border-[#ffb454] pl-3 py-2 text-sm leading-relaxed mb-4 bg-[rgba(255,180,84,0.06)] rounded-r-xl">
          &ldquo;{plan.message}&rdquo;
        </p>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {plan.reasons.map((r: string, i: number) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-white/[.05] border border-white/[.07] text-[#94a0b8]">
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
                logEvent('rest_activity', {});
              }}
              className="flex items-center gap-3 w-full min-h-[56px] p-4 rounded-2xl border border-white/[.07] bg-[#1a2234] text-left transition-colors"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/[.06] text-[#ffb454]">
                <s.icon size={20} />
              </span>
              <div>
                <div className="font-semibold text-sm">{s.text}</div>
                <div className="text-xs text-[#94a0b8] mt-0.5">{s.desc}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

function DoneCard() {
  const plan = useStore((s) => s.plan);
  const setView = useStore((s) => s.setView);

  if (!plan?.result) return null;

  const r = plan.result;
  const pct = Math.round(r.rate * 100);
  const title = r.rate >= 0.8 ? 'Hoy ya entrenaste' : r.rate >= 0.4 ? 'Sesión guardada' : 'Movimiento registrado';

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
        <p className="text-sm text-[#94a0b8] mb-5">
          {r.minutes} min · {r.doneEx}/{r.totalEx} ejercicios · {pct}% completado
        </p>
        <p className="italic border-l-4 border-[#ffb454] pl-3 py-2 text-sm leading-relaxed mb-5 bg-[rgba(255,180,84,0.06)] rounded-r-xl">
          &ldquo;La consistencia se construye así: un día cada vez.&rdquo;
        </p>
        <Button variant="ghost" className="w-full" onClick={() => setView('coach')}>
          Hablar con el Coach <Icons.ChevronRight />
        </Button>
      </Card>
    </motion.div>
  );
}

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

function GreetingHeader() {
  const profile = useStore((s) => s.profile);
  const workouts = useStore((s) => s.workouts);
  const name = profile?.name ?? '';

  const hour = new Date().getHours();
  let greeting = 'Buenas';
  if (hour < 12) greeting = 'Buenos días';
  else if (hour < 20) greeting = 'Buenas tardes';
  else greeting = 'Buenas noches';

  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const dayName = dayNames[new Date().getDay()];
  const dateStr = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(new Date());

  const totalXp = computeTotalXp(workouts);
  const level = computeLevel(totalXp);
  const xpInLevel = totalXp - (level - 1) * 200;
  const xpForNext = 200;
  const xpPct = Math.min(100, Math.round((xpInLevel / xpForNext) * 100));

  // Streak: count consecutive days with completed workouts (last 7 days)
  const streakDays = (() => {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (workouts.some((w) => w.date === key && w.completed_rate >= 0.5)) count++;
      else if (i > 0) break; // only break after today
    }
    return count;
  })();

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
            {greeting}{name ? `, ${name.split(' ')[0]}` : ''}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 12 }}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[rgba(167,139,250,0.16)] text-[#a78bfa] border border-[rgba(167,139,250,0.3)]"
            >
              Nv.{level}
            </motion.span>
          </h1>
          <p className="text-sm text-[#94a0b8] mt-0.5 capitalize">{dayName} · {dateStr}</p>
        </div>
        {/* Streak Badge */}
        {streakDays > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <FlameIcon size={28} />
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#ff7a3d]"
              />
            </div>
            <span className="text-[10px] font-bold text-[#ff7a3d] tabular-nums -mt-0.5">
              {streakDays}d
            </span>
          </motion.div>
        )}
      </div>
      {/* XP Bar */}
      <motion.div
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: '100%' }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="mt-2 flex items-center gap-2"
      >
        <div className="flex-1 h-2 rounded-full bg-white/[.08] overflow-hidden">
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
          transition={{ delay: 0.6 }}
          className="text-[10px] text-[#a78bfa] font-semibold tabular-nums"
        >
          {xpInLevel}/{xpForNext} XP
        </motion.span>
      </motion.div>
    </motion.div>
  );
}

function RecoveryMiniCard({ score, isNew }: { score: number; isNew?: boolean }) {
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
          <div className="text-sm font-bold">Recuperación</div>
          <div className="text-xs text-[#94a0b8]">{recWord(score)}</div>
        </div>
      </Card>
    </motion.div>
  );
}

function ConsistencyMiniCard({ cons, isNew }: { cons: { consistency_pct: number; sessions_done: number; sessions_target: number }; isNew?: boolean }) {
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
          <div className="text-sm font-bold">Consistencia</div>
          <div className="text-xs text-[#94a0b8]">{cons.sessions_done}/{cons.sessions_target} sesiones</div>
        </div>
      </Card>
    </motion.div>
  );
}

function GeneratingPlanCard() {
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
      const decision = DecisionEngine.decide({ checkin: c, consistency: cons, twin: t, profile: p });

      if (decision.action === 'restore') {
        setPlan({ ...decision, date: today, done: false, message: MotivationEngine.restMessage(t.motivation_style) });
      } else {
        const clientLastFocus = typeof window !== 'undefined' ? (localStorage.getItem('chispa_last_focus') ?? undefined) : undefined;
        const workout = TrainingAgent.generate(decision, t, p.equipment, undefined, clientLastFocus);
        setPlan({ ...decision, date: today, done: false, workout, message: MotivationEngine.message(t.motivation_style, decision.recovery_score ?? 60, decision.consistency.consistency_pct, decision.duration) });
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
            <p className="text-sm text-[#94a0b8]">Generando tu entrenamiento...</p>
            <div className="skeleton h-2 w-3/4 mx-auto" />
          </>
        ) : (
          <>
            <WarningIcon size={28} className="mx-auto mb-1 text-[#fbbf24]" />
            <p className="text-sm text-[#94a0b8]">No se pudo generar el entrenamiento.</p>
            <p className="text-xs text-[#5c6577]">Completa el check-in e intenta de nuevo.</p>
            <Button variant="primary" size="sm" className="mt-2" onClick={retryGeneration}>
              Reintentar
            </Button>
          </>
        )}
      </Card>
    </motion.div>
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
    const hasData = profile || Object.keys(checkins).length > 0;
    const timer = setTimeout(() => setLoading(false), hasData ? 100 : 400);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setPlan = useStore((s) => s.setPlan);
  const setView = useStore((s) => s.setView);
  const logEvent = useStore((s) => s.logEvent);

  const today = todayKey();
  const hasCheckin = !!checkins[today];
  const hasPlan = plan && plan.date === today;

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

      const decision = DecisionEngine.decide({
        checkin: c,
        consistency: cons,
        twin,
        profile,
      });

      if (decision.action === 'restore') {
        setPlan({
          ...decision,
          date: today,
          done: false,
          message: MotivationEngine.restMessage(twin.motivation_style),
        });
      } else {
        const clientLastFocus = typeof window !== 'undefined'
          ? (localStorage.getItem('chispa_last_focus') ?? undefined)
          : undefined;
        const workout = TrainingAgent.generate(decision, twin, profile.equipment, undefined, clientLastFocus);
        setPlan({
          ...decision,
          date: today,
          done: false,
          workout,
          message: MotivationEngine.message(
            twin.motivation_style,
            decision.recovery_score ?? 60,
            decision.consistency.consistency_pct,
            decision.duration
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-6 space-y-3.5">
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
      className="px-4 pb-6 space-y-3.5"
    >
      <GreetingHeader />

      {/* ─── Quick Access: Custom Workout & Quick Log ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-2 gap-3"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setView('create-workout')}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/[.07] bg-gradient-to-br from-[rgba(255,180,84,0.08)] to-[rgba(255,180,84,0.02)] hover:border-[rgba(255,180,84,0.3)] transition-all focus-visible:ring-2 focus-visible:ring-[#ffb454] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d14]"
        >
          <div className="w-12 h-12 rounded-2xl bg-[rgba(255,180,84,0.12)] flex items-center justify-center">
            <Plus size={24} className="text-[#ffb454]" />
          </div>
          <span className="text-sm font-bold">Crear rutina</span>
          <span className="text-[10px] text-[#94a0b8] text-center leading-tight">
            Arma tu propio entrenamiento
          </span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setView('quick-log')}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/[.07] bg-gradient-to-br from-[rgba(52,211,153,0.08)] to-[rgba(52,211,153,0.02)] hover:border-[rgba(52,211,153,0.3)] transition-all focus-visible:ring-2 focus-visible:ring-[#34d399] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d14]"
        >
          <div className="w-12 h-12 rounded-2xl bg-[rgba(52,211,153,0.12)] flex items-center justify-center">
            <PenLine size={24} className="text-[#34d399]" />
          </div>
          <span className="text-sm font-bold">Registro rápido</span>
          <span className="text-[10px] text-[#94a0b8] text-center leading-tight">
            Vitacoriza lo que hiciste
          </span>
        </motion.button>
      </motion.div>

      {!hasCheckin && <CheckInCard />}

      {hasCheckin && (
        <div className="grid grid-cols-2 gap-3">
          <RecoveryMiniCard score={recoveryScore} isNew />
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
              <div className="text-sm font-bold">Tu Digital Twin</div>
              <div className="text-xs text-[#94a0b8]">
                {Math.round(twin.patterns.completion_rate * 100)}% completado · ~{Math.round(twin.patterns.avg_duration)} min
              </div>
              <div className="text-xs text-[#94a0b8]">
                {workouts.filter((w) => w.completed_rate >= 0.5).length} sesiones completas
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
