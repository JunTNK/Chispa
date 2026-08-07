'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
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
    Plus,
    Calendar,
    Settings,
    BookMarked,
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

type ActionTint = 'orange' | 'green' | 'purple';

const ACTION_TINT: Record<ActionTint, { icon: string; border: string }> = {
  orange: { icon: 'text-[#ffb454]', border: 'hover:border-[#ffb454]/40' },
  green: { icon: 'text-[#34d399]', border: 'hover:border-[#34d399]/40' },
  purple: { icon: 'text-[#a78bfa]', border: 'hover:border-[#a78bfa]/40' },
};

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
      className={`h-full w-full rounded-xl border border-white/[.07] bg-[#151b2a] p-3 flex flex-col gap-2 text-left min-h-[84px] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d14] ${tintClasses.border}`}
    >
      <Icon size={18} className={tintClasses.icon} />
      <span className="block text-xs font-bold">{title}</span>
      <span className="block text-[10px] text-[var(--muted)] leading-tight">{subtitle}</span>
    </motion.button>
  );
}

function CheckInCard() {
  const t = useT();
  const [sleep, setSleep] = React.useState(7);
  const [energy, setEnergy] = React.useState(6);
  const [stress, setStress] = React.useState(4);
  const setCheckin = useStore((s) => s.setCheckin);
  const logEvent = useStore((s) => s.logEvent);
  const setPlan = useStore((s) => s.setPlan);
  const lang = useStore((s) => s.lang);
  const profile = useStore((s) => s.profile);
  const twin = useStore((s) => s.twin);
  const workouts = useStore((s) => s.workouts);

  const rec = calculateRecoveryScore({
    user_id: '', date: todayKey(), sleep, energy, stress, recovery_score: 0, created_at: '',
  });

  // Contextual check-in prompt adapts to the user's motivation style.
  // Gives neurodivergent users the "why" behind the 3 numbers.
  const checkinPrompt = twin
    ? MotivationEngine.checkinPrompt(twin.motivation_style, lang)
    : MotivationEngine.checkinPrompt('data', lang);

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
        last_workout: workouts[workouts.length - 1],
      });

      if (decision.action === 'restore') {
        setPlan({
          ...decision,
          date: todayKey(),
          done: false,
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
          <span className="font-bold text-base">{t('Check-in diario')}</span>
          <Badge variant="ghost">30s</Badge>
        </div>
        <div className="text-right">
          <span key={rec.score} className="text-2xl font-black text-[#ffb454] counter-pop inline-block">{rec.score}</span>
          <div className="text-[10px] text-[var(--muted)] -mt-1">recovery</div>
        </div>
      </div>
      <p className="text-sm text-[var(--muted)] mb-5 leading-relaxed">
        {checkinPrompt}
      </p>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="flex items-center gap-1.5"><Moon size={16} /> {t('Sueño')}</span>
            <span className="font-bold text-[#ffb454]">{sleep}h</span>
          </div>
          <Slider value={[sleep]} onValueChange={([v]) => setSleep(v)} min={3} max={10} step={0.5} />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="flex items-center gap-1.5"><Zap size={16} /> {t('Energía')}</span>
            <span className="font-bold text-[#ffb454]">{energy}/10</span>
          </div>
          <Slider value={[energy]} onValueChange={([v]) => setEnergy(v)} min={1} max={10} step={1} />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="flex items-center gap-1.5"><Frown size={16} /> {t('Estrés')}</span>
            <span className="font-bold text-[#ffb454]">{stress}/10</span>
          </div>
          <Slider value={[stress]} onValueChange={([v]) => setStress(v)} min={1} max={10} step={1} />
        </div>
      </div>

      <div>
          <Button variant="primary" size="large" className="w-full mt-5" onClick={handleSave}>
            {t('Calcular mi día')} <Icons.Spark />
          </Button>
        </div>
      </Card>
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
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/[.04] border border-white/[.06]"
    >
      <span className="flex items-center justify-center text-xs font-bold text-[var(--muted)] shrink-0 w-5">
        {index + 1}
      </span>
      <span className="w-9 h-9 rounded-lg overflow-hidden bg-[#0f1420] border border-white/[.06] shrink-0">
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
            <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-white/[.05] border border-white/[.07] text-[var(--muted)]">
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
            <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-white/[.05] border border-white/[.07] text-[var(--muted)]">
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
                <div className="text-xs text-[var(--muted)] mt-0.5">{s.desc}</div>
              </div>
            </motion.button>
          ))}
        </div>
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
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[rgba(167,139,250,0.16)] text-[#a78bfa] border border-[rgba(167,139,250,0.3)]"
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
            className="flex items-center gap-1.5 bg-white/[.06] rounded-full pl-2 pr-3 py-0.5"
          >
            <Calendar size={14} className="text-[#ffb454]" />
            <span className="text-[10px] font-bold text-[#ffb454] tabular-nums">
              {weekSessions} {t('esta semana')}
            </span>
          </motion.div>
        )}
        {/* Sensory quick-access shortcut → Sistema (Perfil sensorial + prefs) */}
        <button
          onClick={() => setView('sistema')}
          aria-label={t('Ajustes')}
          title={t('Acceso rápido a sensorial y gamificación')}
          className={`w-9 h-9 rounded-xl border flex items-center justify-center text-[var(--muted)] hover:bg-white/[.08] transition-colors shrink-0 ${
            prefs.hideStreaks
              ? 'bg-[rgba(0,212,170,0.08)] border-[#00D4AA]'
              : 'bg-white/[.05] border-white/[.08]'
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
      const decision = DecisionEngine.decide({ checkin: c, consistency: cons, twin: t, profile: p, last_workout: w[w.length - 1] });

      if (decision.action === 'restore') {
        setPlan({ ...decision, date: today, done: false, message: MotivationEngine.restMessage(t.motivation_style, state.lang) });
      } else {
        const clientLastFocus = typeof window !== 'undefined' ? (localStorage.getItem('chispa_last_focus') ?? undefined) : undefined;
        const recentExerciseIds = (w[w.length - 1]?.exercises ?? []).map((e) => e.exercise_id);
        const workout = TrainingAgent.generate(decision, t, p.equipment, undefined, clientLastFocus, { goal: p.goal, recentExerciseIds });
        setPlan({ ...decision, date: today, done: false, workout, message: MotivationEngine.message(t.motivation_style, decision.recovery_score ?? 60, decision.consistency.consistency_pct, decision.duration, state.lang) });
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

      const decision = DecisionEngine.decide({
        checkin: c,
        consistency: cons,
        twin,
        profile,
        last_workout: workouts[workouts.length - 1],
      });

      if (decision.action === 'restore') {
        setPlan({
          ...decision,
          date: today,
          done: false,
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
