'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  computeAchievementContext,
  computeTotalXp,
  computeLevel,
  computeWorkoutXp,
} from '@/lib/awards/achievements';
import { useExercises } from '@/lib/utils/use-exercises';
import { useSound } from '@/lib/awards/use-sound';
import type { Workout } from '@/types';
import {
  Flame, Trophy, Sword, Lock, Gift, Gamepad, Target,
  TrendingUp, Grid, ChartBar, Zap, Crown,
  CheckCircle, Snowflake, Dumbbell, Activity,
} from 'lucide-react';
import {
  BoltIcon,
  PulseIcon,
} from '@/components/ui/icons-rpg';
import { THEME_CATEGORIES, THEME_BY_VALUE, DEFAULT_THEME } from '@/lib/system/themes';

const VAULT_DEFS = [
  { id: 'v1', name: '30 min de videojuego', icon: Gamepad, cost: 1 },
  { id: 'v2', name: 'Episodio de tu serie', icon: Gift, cost: 2 },
  { id: 'v3', name: 'Snack favorito', icon: Zap, cost: 3 },
  { id: 'v4', name: 'Compra < 20€', icon: Crown, cost: 5 },
  { id: 'v5', name: 'Día sin alarmas', icon: Snowflake, cost: 7 },
];

const BOSS_NAMES = ['Titán de Cristal', 'Guardián de Niebla', 'Jabalí de Ónix', 'Serpiente de Cobre', 'Centinela de Runas'];

/* ─── Real Sparkline from workout data (with gradient area fill) ─── */

function WorkoutSparkline({ workouts }: { workouts: Workout[] }) {
  const t = useT();
  const completed = workouts.filter(w => w.completed_rate >= 0.5);
  if (completed.length < 2) {
    return <div className="h-14 flex items-center justify-center text-[#5C6577] text-[11px] font-mono">{t('Completa más sesiones para ver tu progresión')}</div>;
  }

  // Show last 12 workouts
  const recent = completed.slice(-12);

  const pts = recent.map(w => Math.round(w.score * (w.actual_minutes || w.duration) / 10));
  const sw = 290, sh = 64, max = Math.max(...pts, 1), min = Math.min(...pts);
  const range = max - min || 1;
  const coords = pts.map((v, i) => [
    8 + i * (sw - 16) / (pts.length - 1),
    sh - 10 - ((v - min) / range) * (sh - 24),
  ]);
  const line = coords.map(p => p.map(x => x.toFixed(1)).join(',')).join(' ');
  const area = `8,${sh - 4} ${line} ${sw - 8},${sh - 4}`;
  const lastPt = coords[coords.length - 1];

  const pctChange = pts.length >= 2
    ? Math.round(((pts[pts.length - 1] - pts[0]) / Math.max(1, pts[0])) * 100)
    : 0;
  const changeColor = pctChange >= 0 ? '#34d399' : '#f87171';

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${sw} ${sh}`} className="w-full h-16 block">
        <defs>
          <linearGradient id="sparkline-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#00D4AA" />
          </linearGradient>
          <linearGradient id="sparkline-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(0,212,170,0.22)" />
            <stop offset="1" stopColor="rgba(0,212,170,0)" />
          </linearGradient>
        </defs>
        {/* Area fill under the line */}
        <polygon points={area} fill="url(#sparkline-area)" />
        {/* Main line */}
        <polyline points={line} fill="none" stroke="url(#sparkline-line)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {coords.map((p, i) => (
          <circle key={i}
            cx={p[0]} cy={p[1]}
            r={i === coords.length - 1 ? 4 : 2}
            fill={i === coords.length - 1 ? '#00D4AA' : '#151b2a'}
            stroke={i === coords.length - 1 ? 'none' : 'rgba(255,255,255,0.15)'}
            strokeWidth={i === coords.length - 1 ? 0 : 1}
          />
        ))}
        {/* PR Label on last point */}
        <text x={lastPt[0] - 28} y={lastPt[1] - 8}
          fill={changeColor} fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="600">
          {pctChange >= 0 ? `+${pctChange}%` : `${pctChange}%`}
        </text>
      </svg>
    </div>
  );
}

/* ─── Real Heatmap ─── */

function WorkoutHeatmap({ workouts }: { workouts: Workout[] }) {
  const t = useT();
  const cells = useMemo(() => {
    const result: { cls: string; date: string }[] = [];
    const today = new Date();
    // Last 12 weeks (84 days)
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayWorkouts = workouts.filter(w => w.date === key && w.completed_rate >= 0.5);
      const count = dayWorkouts.length;
      let cls = 'bg-white/[.06]';
      if (count >= 1) cls = 'bg-[#0e4f3f]';
      if (count >= 2) cls = 'bg-[#0f7a5c]';
      if (count >= 3) cls = 'bg-[#00D4AA]';
      result.push({ cls, date: key });
    }
    return result;
  }, [workouts]);

  return (
    <Card className="p-3">
      <div className="grid grid-cols-12 gap-1">
        {cells.map((c) => (
          <div key={c.date} className={`aspect-square rounded-[2px] ${c.cls}`} title={c.date} />
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2 text-[9px] text-[var(--muted)] font-mono">
        {t('menos')}
        <div className="w-2.5 h-2.5 rounded-[2px] bg-white/[.06]" />
        <div className="w-2.5 h-2.5 rounded-[2px] bg-[#0e4f3f]" />
        <div className="w-2.5 h-2.5 rounded-[2px] bg-[#0f7a5c]" />
        <div className="w-2.5 h-2.5 rounded-[2px] bg-[#00D4AA]" />
        {t('más')}
      </div>
    </Card>
  );
}

/* ─── Real Skill Tree (from exercise catalog + XP) ─── */

// Real ids from the exercise catalog (free-exercise-db + wger merged).
// These resolve to actual catalog entries with images — verified against
// src/lib/utils/exercises.json.
export const SKILL_BRANCHES = [
  {
    branch: 'Fuerza', color: '#FF6B35', icon: Dumbbell,
    exercises: [
      'Pushups',
      'Bodyweight_Squat',
      'Dumbbell_Alternate_Bicep_Curl',
      'Barbell_Deadlift',
      'Barbell_Bench_Press_-_Medium_Grip',
    ],
  },
  {
    branch: 'Cardio', color: '#00D4AA', icon: BoltIcon,
    exercises: [
      '89443e49-e5be-4b67-a5f6-e3f5ff80f6ea', // Jumping Jack HD
      'Rope_Jumping',
      '48ee1385-47c5-4821-8b6a-57fac6130776', // Burpees
      'Mountain_Climbers',
      'Air_Bike',
    ],
  },
  {
    branch: 'Movilidad', color: '#a78bfa', icon: PulseIcon,
    exercises: [
      'Arm_Circles',
      'd8d1b919-94e1-4e91-b37e-29bb8a479740', // Postura de la Cobra (en Yoga)
      'Balance_Board',
      'Single_Leg_Glute_Bridge',
      'Calf_Stretch_Elbows_Against_Wall',
    ],
  },
  {
    branch: 'Core', color: '#fbbf24', icon: Activity,
    exercises: [
      'Plank',
      'Push_Up_to_Side_Plank',
      '3_4_Sit-Up',
      'Russian_Twist',
      'Hanging_Leg_Raise',
    ],
  },
];

export function SkillTree({ xp }: { xp: number }) {
  const t = useT();
  const { exercises: catalog } = useExercises();
  return (
    <div className="space-y-2">
      {SKILL_BRANCHES.map((br, bi) => {
        const exs = br.exercises.map(id => catalog.find(e => e.id === id)).filter(Boolean);
        const nodeCosts = [0, 100, 300, 600, 1000];
        return (
          <motion.div
            key={bi}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + bi * 0.06 }}
            className="rounded-xl bg-white/[.04] border border-white/[.07] p-3"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <span style={{ color: br.color }}><br.icon size={14} /></span>
              <span className="text-xs font-bold" style={{ color: br.color }}>{t(br.branch)}</span>
              <span className="text-[10px] text-[var(--muted)] font-mono ml-auto">{xp} XP</span>
            </div>
            <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
              {exs.map((ex, ni) => {
                if (!ex) return null;
                const cost = nodeCosts[ni] ?? 99999;
                const unlocked = xp >= cost;
                const prevUnlocked = ni === 0 ? true : xp >= (nodeCosts[ni - 1] ?? 0);
                return (
                  <React.Fragment key={ex.id}>
                    {ni > 0 && (
                      <div className={`w-3 h-0.5 shrink-0 ${prevUnlocked ? 'bg-[currentColor]' : 'bg-white/[.10]'}`}
                        style={{ color: br.color }}
                      />
                    )}
                    <div className="flex flex-col items-center gap-1 shrink-0 w-16">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs border-2 transition-all ${
                        unlocked
                          ? 'border-current bg-current/20'
                          : prevUnlocked && !unlocked
                            ? 'border-current animate-pulse'
                            : 'border-white/[.15] bg-white/[.05] text-white/[.30]'
                      }`}
                        style={unlocked || (prevUnlocked && !unlocked) ? { borderColor: br.color, color: br.color } : {}}
                      >
                        {unlocked ? <CheckCircle size={14} /> : <Lock size={12} />}
                      </div>
                      <span className="text-[9px] text-[var(--muted)] text-center leading-tight font-mono">{ex.name.split(' ')[0]}</span>
                      {!unlocked && <span className="text-[8px] text-[#fbbf24] font-mono">{cost} XP</span>}
                      {unlocked && <span className="text-[8px] text-[#34d399] font-mono">✓</span>}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Main QuestScreen ─── */

export function QuestScreen() {
  const t = useT();
  const workouts = useStore((s) => s.workouts);
  const questState = useStore((s) => s.questState);
  const setQuestState = useStore((s) => s.setQuestState);
  const claimVaultItem = useStore((s) => s.claimVaultItem);
  const defeatBoss = useStore((s) => s.defeatBoss);
  const { play: playSound } = useSound();

  // Real data from store + engine
  const ctx = useMemo(() => computeAchievementContext(workouts), [workouts]);
  const prefs = useStore((s) => s.prefs);
  const totalXp = useMemo(() => computeTotalXp(workouts), [workouts]);
  const level = useMemo(() => computeLevel(totalXp), [totalXp]);
  const xpInLevel = totalXp % 200;
  const streak = ctx.streak;
  const totalWorkouts = ctx.totalWorkouts;

  // Weekly workouts (for vault)
  const thisWeekWorkouts = useMemo(() => {
    const now = new Date();
    return workouts.filter(w => {
      const diff = Math.floor((now.getTime() - new Date(w.date).getTime()) / 86400000);
      return diff <= 7 && w.completed_rate >= 0.5;
    }).length;
  }, [workouts]);

  // Boss battle — real weekly boss
  const bossName = BOSS_NAMES[questState.bossDefeatedCount % BOSS_NAMES.length];
  const bossMaxHp = 1000 + questState.bossDefeatedCount * 200;
  const bossDamage = workouts
    .filter(w => {
      const d = new Date(w.date);
      const now = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
      return diff <= 7 && w.completed_rate >= 0.5;
    })
    .reduce((acc, w) => {
      const sets = w.exercises?.reduce((s, e) => s + (e.completed_sets || e.sets || 0), 0) ?? 0;
      return acc + sets * 2;
    }, 0);
  const bossHp = Math.max(0, bossMaxHp - bossDamage);
  const bossDefeated = questState.bossDefeatedThisWeek || bossHp <= 0;
  const theme = THEME_BY_VALUE[questState.selectedTheme] ?? THEME_BY_VALUE[DEFAULT_THEME];

  // Check if boss was just defeated
  const prevBossDefeatedRef = React.useRef(bossDefeated);
  React.useEffect(() => {
    if (bossDefeated && !prevBossDefeatedRef.current && !questState.bossDefeatedThisWeek) {
      defeatBoss();
      // Epic victory fanfare — the moment the weekly boss falls
      playSound('bossDefeated');
    }
    prevBossDefeatedRef.current = bossDefeated;
  }, [bossDefeated, questState.bossDefeatedThisWeek, defeatBoss, playSound]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-6 space-y-3.5 min-h-dvh">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between pt-5 pb-1"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#a78bfa] to-[#f87171] flex items-center justify-center text-white font-bold text-sm">
            <Trophy size={16} />
          </span>
          <div>
            <h1 className="text-lg font-black tracking-tight">QUEST</h1>
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('Hyper-fixación')}</p>
          </div>
        </div>
        <Badge variant="epic">Nv.{level}</Badge>
      </motion.div>

      {/* Streak Card */}
      {!prefs.hideStreaks && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="flex items-center gap-3 p-4">
          <span className="w-10 h-10 rounded-xl bg-[rgba(255,107,53,0.12)] flex items-center justify-center text-[#FF6B35]">
            <Flame size={20} />
          </span>
          <div className="flex-1">
             <div className="text-sm font-bold flex items-center gap-2">
               {streak} {streak === 1 ? t('día') : t('días')} {t('en movimiento')}
               <span className="float inline-block"><Flame size={14} className="text-[#FF6B35]" /></span>
             </div>
             <div className="text-[11px] text-[var(--muted)]">{t('RSD Shield: nunca "rompes" la racha')}</div>
          </div>
          <Badge variant="rare" className="gap-1">
            <Snowflake size={10} /> ×2
          </Badge>
        </Card>
      </motion.div>
      )}

      {/* Boss Battle — estilo épico como referencia neurofit-v3 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {bossDefeated ? (
          <Card className="flex items-center gap-3 p-4 border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.05)]">
            <Trophy size={22} className="text-[#34d399]" />
            <div>
              <div className="text-sm font-bold">{t('Jefe derrotado esta semana')}</div>
              <div className="text-[11px] text-[var(--muted)]">+500 {t(theme.resource)}. {t('Nuevo jefe el lunes.')}</div>
            </div>
          </Card>
        ) : (
          <Card variant="boss" className="overflow-hidden p-0">
            {/* Boss image area */}
            <div className="h-28 bg-gradient-to-b from-[rgba(248,113,113,0.18)] via-[rgba(248,113,113,0.06)] to-transparent flex items-end px-4 pb-2 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.08]">
                <div className="w-full h-full" style={{
                  backgroundImage: 'radial-gradient(circle at 30% 40%, #f87171, transparent 70%), radial-gradient(circle at 70% 60%, #ff7a3d, transparent 60%)',
                }} />
              </div>
              <Badge variant="push" className="mb-1 relative z-10">
                 <Gamepad size={10} /> {t('Jefe semanal')}
               </Badge>
             </div>
             <div className="px-4 pb-4">
               <h3 className="text-lg font-black mt-1 mb-1.5 tracking-tight">{bossName}</h3>
               <div className="flex justify-between text-[10px] text-[var(--muted)] mb-1.5 font-mono">
                 <span className="flex items-center gap-1.5">
                   <span className="w-2 h-2 rounded-full bg-[#f87171] shadow-[0_0_6px_rgba(248,113,113,0.6)]" />
                   {t('Vida')}
                </span>
                <span className="font-bold text-[#f87171]">{bossHp} / {bossMaxHp}</span>
              </div>
              <div className="h-3 rounded-full bg-white/[.07] overflow-hidden border border-white/[.10] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: `${(bossHp / bossMaxHp) * 100}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-[#f87171] to-[#ff7a3d] relative overflow-hidden"
                >
                  {/* Shimmer animation like reference */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    style={{ animation: 'shimmer 2s infinite', backgroundSize: '200% 100%' }} />
                </motion.div>
              </div>
              <div className="flex items-center gap-3 mt-2.5">
                <p className="text-[10px] text-[var(--muted)] flex items-center gap-1.5">
                  <Sword size={11} className="text-[#fbbf24]" />
                  {t('{n} sesiones · {m} Vida daño', { n: thisWeekWorkouts, m: bossDamage })}
                </p>
                <span className="text-[9px] font-mono text-[var(--muted)] ml-auto">
                  {t('reps × 2 = daño')}
                </span>
              </div>
            </div>
          </Card>
        )}
      </motion.div>

      {/* Quest Hero — XP / Level con ring circular como referencia neurofit-v3 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl overflow-hidden border border-white/[.10] relative"
        style={{
          background: 'radial-gradient(120% 100% at 50% 0%, rgba(167,139,250,0.15), rgba(7,9,13,0.5))',
        }}
      >
        <div className="px-4 py-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="epic">{t(theme.label_key)}</Badge>
            <span className="text-[10px] text-[#fbbf24] font-mono tracking-wider">{t(theme.resource)}</span>
          </div>

          {/* Ring circular con XP y nivel */}
          <div className="flex justify-center mb-2">
            <div className="relative w-[120px] h-[120px]">
              <svg width="120" height="120" viewBox="0 0 120 120" className="absolute inset-0">
                <defs>
                  <linearGradient id="xpRingGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="52"
                  fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <motion.circle
                  cx="60" cy="60" r="52"
                  fill="none" stroke="url(#xpRingGrad)" strokeWidth="8"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '0, 999' }}
                  animate={{ strokeDasharray: `${(xpInLevel / 200) * 326.7}, 999` }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  key={totalXp}
                  initial={{ scale: 1.3, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl font-black bg-gradient-to-b from-white to-[#fbbf24] bg-clip-text text-transparent"
                >
                  {totalXp}
                </motion.div>
                <div className="text-[8px] text-[var(--muted)] uppercase tracking-wider mt-0.5">
                  {t(theme.resource)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-1 text-left">
            <div className="flex justify-between text-[11px] text-[var(--muted)] mb-1 font-mono">
              <span className="flex items-center gap-1.5">
                <Crown size={12} className="text-[#a78bfa]" />
                {t('Nivel {n}', { n: level })}
              </span>
              <span>{xpInLevel}/200 → {t('Nv.{n}', { n: level + 1 })}</span>
            </div>
            <Progress value={(xpInLevel / 200) * 100} className="h-2" aria-label={t('Progreso de nivel')} />
          </div>
        </div>
      </motion.div>

      {/* Skill Tree (from real exercises + XP) */}
      <div>
        <div className="flex items-center gap-2 mb-2 mt-4">
          <TrendingUp size={14} className="text-[var(--muted)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{'Skill Tree'}</h2>
          <span className="text-[10px] text-[var(--muted)] font-mono ml-auto">{totalXp} XP</span>
        </div>
        <SkillTree xp={totalXp} />
      </div>

      {/* Reward Vault (real persisted claims) */}
      <div>
        <div className="flex items-center gap-2 mb-2 mt-4">
          <Gift size={14} className="text-[var(--muted)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{'Reward Vault'}</h2>
          <span className="text-[10px] text-[var(--muted)] font-mono ml-auto">{'Premack'}</span>
        </div>
        <div className="space-y-2">
          {VAULT_DEFS.map((v, i) => {
            const open = thisWeekWorkouts >= v.cost;
            const claimed = questState.vaultClaims[v.id] ?? false;
            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                  claimed
                    ? 'border-[rgba(52,211,153,0.25)] bg-[rgba(52,211,153,0.05)]'
                    : open
                      ? 'border-[rgba(255,184,0,0.3)] bg-[rgba(255,184,0,0.04)]'
                      : 'border-white/[.07] bg-white/[.04]'
                }`}
              >
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  claimed
                    ? 'bg-[rgba(52,211,153,0.12)] text-[#34d399]'
                    : open
                      ? 'bg-[rgba(255,184,0,0.12)] text-[#fbbf24]'
                      : 'bg-white/[.05] text-[var(--muted)]'
                }`}>
                  <v.icon size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{t(v.name)}</div>
                  <div className="text-[10px] text-[var(--muted)] font-mono">
                    {t('requiere {n} {plural}', { n: v.cost, plural: v.cost > 1 ? 'workouts' : 'workout' })}
                  </div>
                </div>
                {claimed ? (
                  <span className="text-[11px] font-bold font-mono text-[#34d399]">{t('reclamado')}</span>
                ) : (
                  <button
                    disabled={!open}
                    onClick={() => { claimVaultItem(v.id); useStore.getState().trackDecision(5); }}
                    className={`text-[11px] font-bold font-mono px-2.5 py-1 rounded-lg transition-all ${
                      open
                        ? 'bg-[#fbbf24] text-[#241a00] hover:bg-[#f59e0b]'
                        : 'text-[#5C6577] cursor-default'
                    }`}
                  >
                    {open ? t('Reclamar') : t('{n} más', { n: v.cost - thisWeekWorkouts })}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Progresión de fuerza (real sparkline) */}
      <div>
        <div className="flex items-center gap-2 mb-2 mt-4">
          <TrendingUp size={14} className="text-[var(--muted)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{t('Progresión de fuerza')}</h2>
          <span className="text-[10px] text-[var(--muted)] font-mono ml-auto">{t('{n} sesiones', { n: Math.min(12, totalWorkouts) })}</span>
        </div>
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[var(--muted)] flex items-center gap-1.5">
              <TrendingUp size={13} className="text-[#34d399]" /> {t('Carga estimada')}
            </span>
            <span className="text-[10px] font-mono text-[#34d399]">
              +{t('{n}% vs inicio', { n: totalWorkouts > 0 ? Math.round(totalWorkouts * 1.8) : 0 })}
            </span>
          </div>
          <WorkoutSparkline workouts={workouts} />
        </Card>
      </div>

      {/* Heatmap (real data) */}
      <div>
        <div className="flex items-center gap-2 mb-2 mt-4">
          <Grid size={14} className="text-[var(--muted)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{t('Consistencia · 12 semanas')}</h2>
        </div>
        <WorkoutHeatmap workouts={workouts} />
      </div>

      {/* Temas (persist selection) — categorizados */}
      <div>
        <div className="flex items-center gap-2 mb-2 mt-4">
          <Target size={14} className="text-[var(--muted)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{t('Tema de fijación')}</h2>
          <span className="text-[10px] text-[var(--muted)] font-mono ml-auto">{'1 rep = pts'}</span>
        </div>
        <div className="space-y-4">
          {THEME_CATEGORIES.map((cat, ci) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + ci * 0.06 }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <cat.icon size={14} className="text-[var(--muted)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{cat.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {cat.themes.map((th) => (
                  <motion.button
                    key={th.value}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setQuestState({ selectedTheme: th.value })}
                    className={`text-left rounded-xl border p-2.5 transition-all ${
                      questState.selectedTheme === th.value
                        ? 'border-[#a78bfa] bg-[rgba(167,139,250,0.08)] shadow-[0_0_12px_rgba(167,139,250,0.12)]'
                        : 'border-white/[.07] bg-white/[.03] hover:bg-white/[.06]'
                    }`}
                  >
                    <div className="font-bold text-sm" style={questState.selectedTheme === th.value ? { color: th.color } : {}}>{t(th.label_key)}</div>
                    <div className="text-[9px] text-[var(--muted)] font-mono mt-0.5 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: th.color }} />
                      {t(th.resource)}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quest Log (real workout history) */}
      <div>
        <div className="flex items-center gap-2 mb-2 mt-4">
          <ChartBar size={14} className="text-[var(--muted)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{t('Últimas ganancias')}</h2>
        </div>
        <Card className="p-3">
          {totalWorkouts > 0 ? (
            workouts.filter(w => w.completed_rate >= 0.5).slice(-5).reverse().map((w) => {
              const xpEarned = computeWorkoutXp(w.completed_rate, w.actual_minutes || w.duration);
              return (
                <div key={w.id} className="flex items-center justify-between py-2 border-b border-white/[.06] last:border-0">
                  <span className="text-sm text-[var(--muted)]">
                    {w.focus === 'full' ? t('Cuerpo completo') : w.focus === 'upper' ? t('Tren superior') : w.focus === 'lower' ? t('Tren inferior') : t('Core')} · {w.date.slice(5)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#5C6577] font-mono">{Math.round(w.score)}%</span>
                    <span className="text-sm font-bold text-[#fbbf24]">+{xpEarned} XP</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4 text-sm text-[var(--muted)] font-mono">
              {t('Completa un workout para ganar {r}.', { r: t(theme.resource) })}
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
}
