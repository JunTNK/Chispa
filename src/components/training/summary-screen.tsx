'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { updateTwin } from '@/lib/agents/decision-engine';
import { uid, todayKey } from '@/lib/utils/helpers';
import { RpeSelector } from '@/components/training/rpe-selector';
import { MotivationSelector } from '@/components/training/motivation-selector';
import { supabaseSync } from '@/lib/sync/supabase-sync';
import type { Workout, DigitalTwin } from '@/types';
import { Sparkles, TrendingUp, Sprout, Wrench, Zap } from 'lucide-react';
import { useConfetti } from '@/components/ui/particles';
import { useAchievementEval } from '@/lib/awards/use-achievement-eval';
import { useSound } from '@/lib/awards/use-sound';
import { pushLeaderboard } from '@/lib/sync/leaderboard';
import { computeTotalXp, computeLevel } from '@/lib/awards/achievements';
import { logError } from '@/lib/utils/logger';

export function SummaryScreen() {
  const t = useT();
  const setView = useStore((s) => s.setView);
  const plan = useStore((s) => s.plan);
  const setPlan = useStore((s) => s.setPlan);
  const addWorkout = useStore((s) => s.addWorkout);
  const setTwin = useStore((s) => s.setTwin);
  const twin = useStore((s) => s.twin);
  const logEvent = useStore((s) => s.logEvent);
  const profile = useStore((s) => s.profile);

  const [rpe, setRpe] = React.useState<string | null>(null);
  const [motiv, setMotiv] = React.useState<string | null>(null);
  const workouts = useStore((s) => s.workouts);
  const { fire: fireConfetti } = useConfetti();
  const { evaluate: evaluateAchievements } = useAchievementEval();
  const { play: playSound } = useSound();

  const result = plan?.result;
  const totalWorkouts = workouts.filter((w) => w.completed_rate >= 0.5).length;
  const newLevel = Math.max(1, Math.floor((totalWorkouts + 1) / 5) + 1);
  const oldLevel = Math.max(1, Math.floor(totalWorkouts / 5) + 1);
  const leveledUp = newLevel > oldLevel;

  // Fire confetti + level-up fanfare on level-up (moved before early return to respect hooks order)
  React.useEffect(() => {
    if (leveledUp) {
      playSound('levelUp');
      const t = setTimeout(() => {
        fireConfetti({ particleCount: 120, spread: 160, duration: 3500 });
        playSound('confetti');
      }, 300);
      return () => clearTimeout(t);
    }
  }, [leveledUp]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!result) return null;

  const handleSave = () => {
    if (!result || !profile || !twin) return;

    const w: Workout = {
      id: uid(),
      user_id: '',
      date: todayKey(),
      focus: (plan?.workout?.focus as Workout['focus']) || 'full',
      intensity: plan?.intensity || 'standard',
      duration: plan?.workout?.duration || result.minutes,
      score: Math.round(result.rate * 100),
      completed_rate: result.rate,
      exercises: result.exs || [],
      actual_minutes: result.minutes,
      rpe: (rpe ?? 'justo') as Workout['rpe'],
      created_at: new Date().toISOString(),
    };

    addWorkout(w);

    const updated = updateTwin(twin, { ...w, completed_rate: result.rate });
    setTwin(updated);

    logEvent(result.rate >= 0.8 ? 'workout_completed' : 'workout_partial', {
      rate: result.rate,
      minutes: result.minutes,
    });

    // Evaluate achievements after workout
    evaluateAchievements({
      rpeJustoCount: rpe === 'justo'
        ? workouts.filter((w) => w.rpe === 'justo').length + 1
        : workouts.filter((w) => w.rpe === 'justo').length,
      adaptationCount: plan?.result?.adapted
        ? (workouts.filter((w) => (w as any).adapted).length) + 1
        : workouts.filter((w) => (w as any).adapted).length,
    });

    if (motiv) {
      setTwin({ ...updated, motivation_style: (motiv ?? 'data') as DigitalTwin['motivation_style'] });
      logEvent('motivation_learned', { style: motiv });
    }

    setPlan({ ...plan, done: true, result: { ...result, rpe: rpe ?? undefined, motiv: motiv ?? undefined } });

    // Background sync to Supabase - get workouts AFTER addWorkout
    const currentWorkouts = useStore.getState().workouts;
    supabaseSync.push({
      workouts: [...currentWorkouts, w],
      twin: updated,
      // Feed cooperativo: sube las chispas generadas por addWorkout
      communityPosts: useStore.getState().communityPosts,
    }).catch(logError('summary:push-workout'));

    // Push XP to leaderboard
    const totalXp = computeTotalXp([...currentWorkouts, w]);
    const level = computeLevel(totalXp);
    pushLeaderboard(totalXp, level).catch(logError('summary:push-leaderboard'));

    setView('home');
  };

  const title = result.rate >= 0.8 ? t('¡Hecho!') : result.rate >= 0.4 ? t('Buen movimiento') : t('Guardamos lo de hoy');
  const sub = result.rate >= 0.8
    ? t('Sesión completa. El motor ya está aprendiendo de ti.')
    : result.rate >= 0.4
      ? t('Más de la mitad hecho. Eso cuenta, y mucho.')
      : t('Empezar ya es ganar. El motor lo ha registrado.');

  const xpEarned = Math.round((result.doneEx / Math.max(1, result.totalEx)) * 50 + result.minutes);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-dvh overflow-y-auto"
    >
      <div className="px-4 py-8 space-y-4">
        {/* Level Up Banner */}
        {leveledUp && (
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            className="text-center py-4 px-4 rounded-2xl bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.3)] level-up"
          >
            <motion.span
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-3xl inline-block"
            >
              <Zap size={36} className="inline text-[#a78bfa] mb-1" />
            </motion.span>
            <h3 className="text-xl font-black level-up-text mt-1">{t('¡SUBISTE A NIVEL {nivel}!', { nivel: newLevel })}</h3>
            <p className="text-xs text-[#a78bfa] mt-1">{t('Tu consistencia te fortalece. Sigue así.')}</p>
          </motion.div>
        )}

        <div className="text-center">
          <motion.h2
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
            className="text-3xl font-black tracking-tight mb-1"
          >
            {title}
            {result.rate >= 0.8 && <Sparkles size={32} className="inline text-emerald-400 ml-1 sparkle" />}
            {result.rate < 0.8 && result.rate >= 0.4 && <TrendingUp size={32} className="inline text-[#ffb454] ml-1" />}
            {result.rate < 0.4 && <Sprout size={32} className="inline text-[var(--muted)] ml-1" />}
          </motion.h2>
          <p className="text-sm text-[var(--muted)] text-center mt-1">{sub}</p>
          {/* XP Earned */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(167,139,250,0.12)] border border-[rgba(167,139,250,0.25)]"
          >
            <Zap size={14} className="text-[#a78bfa]" />
            <span className="text-xs font-bold text-[#a78bfa]">+{xpEarned} XP</span>
          </motion.div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <Card className="text-center py-4 px-2">
            <motion.span
              key={result.minutes}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-2xl font-black block counter-pop"
            >
              {result.minutes}
            </motion.span>
            <span className="text-xs text-[var(--muted)]">{t('minutos')}</span>
          </Card>
          <Card className="text-center py-4 px-2">
            <span className="text-2xl font-black block">{result.doneEx}/{result.totalEx}</span>
            <span className="text-xs text-[var(--muted)]">{t('ejercicios')}</span>
          </Card>
          <Card className="text-center py-4 px-2">
            <motion.span
              key={Math.round(result.rate * 100)}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-2xl font-black block counter-pop"
            >
              {Math.round(result.rate * 100)}%
            </motion.span>
            <span className="text-xs text-[var(--muted)]">{t('completado')}</span>
          </Card>
        </div>

        {result.adapted && (
          <div className="bg-[rgba(96,165,250,0.1)] border border-[rgba(96,165,250,0.25)] text-[#bfdbfe] rounded-2xl px-4 py-3 text-sm text-center">
            <Wrench size={16} className="inline text-blue-400 mr-1 mt-[-2px]" /> {t('El motor redujo la intensidad durante la sesión. Adaptarse no es fallar.')}
          </div>
        )}

        <RpeSelector value={rpe} onChange={setRpe} />

        <MotivationSelector value={motiv} onChange={setMotiv} />

        <Button variant="primary" size="large" className="w-full" onClick={handleSave}>
          <Icons.Check /> {t('Guardar entrenamiento')}
        </Button>
      </div>
    </motion.div>
  );
}
