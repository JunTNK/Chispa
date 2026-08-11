'use client';

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT, useLocale } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ACHIEVEMENTS, TIER_CONFIG, CATEGORY_CONFIG,
  computeAchievementContext, evaluateAllAchievements,
} from '@/lib/awards/achievements';
import type { Achievement, UserAchievement } from '@/types';
import {
  Footprints, Flame, Zap, Trophy, Sword, Crown,
  Target, Dumbbell, CheckCircle, Award, Activity,
  TrendingUp, Sun, Moon, Wrench, Smile, Sparkles,
  Lock, Medal, Star, Compass,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Footprints, Flame, Zap, Trophy, Sword, Crown,
  Target, Dumbbell, CheckCircle, Award, Activity,
  TrendingUp, Sun, Moon, Wrench, Smile, Sparkles,
  Lock, Medal, Star, Compass,
};

function AvoIcon({ icon, size = 18 }: { icon: string; size?: number }) {
  const Icon = ICON_MAP[icon] || Sparkles;
  return <Icon size={size} />;
}

const CATEGORIES = ['workouts', 'streak', 'intensity', 'focus', 'completion', 'level', 'boss', 'hidden', 'movimiento'] as const;

const TIER_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

function AchievementCard({
  achievement,
  unlocked,
  progressCurrent,
  progressTarget,
  unlockedAt,
  index,
}: {
  achievement: Achievement;
  unlocked: boolean;
  progressCurrent: number;
  progressTarget: number;
  unlockedAt: string | null;
  index: number;
}) {
  const t = useT();
  const locale = useLocale();
  const tierCfg = TIER_CONFIG[achievement.tier];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`relative rounded-xl border p-3 transition-all ${
        unlocked
          ? `${tierCfg.border} ${tierCfg.bg}`
          : 'border-white/[.06] bg-white/[.02] opacity-60'
      } ${unlocked ? (tierCfg.glow || '') : ''}`}
    >
      <div className="flex items-center gap-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          unlocked ? tierCfg.text : 'text-[#5C6577]'
        } ${unlocked ? 'bg-white/[.06]' : 'bg-white/[.03]'}`}>
          {unlocked ? (
            <AvoIcon icon={achievement.icon} size={20} />
          ) : (
            <Lock size={16} className="text-[#5C6577]" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${unlocked ? 'text-white' : 'text-[var(--muted)]'}`}>
              {t(achievement.name)}
            </span>
            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
              unlocked
                ? `${tierCfg.text} ${tierCfg.bg}`
                : 'text-[#5C6577] bg-white/[.04]'
            }`}>
              {t(tierCfg.label)}
            </span>
          </div>
          <p className="text-[11px] text-[var(--muted)] leading-tight mt-0.5">
            {t(achievement.description)}
          </p>
          {unlockedAt && (
            <p className="text-[9px] text-[#5C6577] font-mono mt-1">
              {t('Desbloqueado {fecha}', { fecha: new Date(unlockedAt).toLocaleDateString(locale) })}
            </p>
          )}
          {!unlocked && (
            <div className="mt-2">
              <div className="flex justify-between text-[9px] text-[#5C6577] font-mono mb-1">
                <span>{Math.min(progressCurrent, progressTarget)}/{progressTarget}</span>
                <span>{Math.round((progressCurrent / Math.max(1, progressTarget)) * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[.06] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (progressCurrent / Math.max(1, progressTarget)) * 100)}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{
                    background: progressCurrent >= progressTarget
                      ? 'linear-gradient(90deg, #a78bfa, #00D4AA)'
                      : '#94a0b8',
                  }}
                />
              </div>
            </div>
          )}
        </div>
        {unlocked && (
          <span className={`shrink-0 ${tierCfg.text || 'text-[#34d399]'}`}>
            <AvoIcon icon={achievement.tier === 'legendary' ? 'Crown' : 'CheckCircle'} size={18} />
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function LogrosScreen() {
  const t = useT();
  const workouts = useStore((s) => s.workouts);
  const userAchievements = useStore((s) => s.achievements);
  const [selectedCat, setSelectedCat] = React.useState<string | null>(null);

  const ctx = useMemo(() => computeAchievementContext(workouts), [workouts]);
  const prefs = useStore((s) => s.prefs);

  const visibleCategories = prefs.hideStreaks
    ? CATEGORIES.filter((c) => c !== 'streak')
    : CATEGORIES;

  // Compute display-ready progress (read-only — summary-screen handles persistence)
  const allProgress = useMemo(() => {
    const { progress } = evaluateAllAchievements(ctx, userAchievements);
    return progress;
  }, [ctx, userAchievements]);

  const totalUnlocked = useMemo(
    () => Object.values(allProgress).filter((ua) => ua.unlocked).length,
    [allProgress]
  );

  const filtered = useMemo(() => {
    let list = ACHIEVEMENTS;
    if (selectedCat) {
      list = list.filter((a) => a.category === selectedCat);
    }
    return list.sort((a, b) => {
      const uaA = allProgress[a.id];
      const uaB = allProgress[b.id];
      const unlockedA = uaA?.unlocked ?? false;
      const unlockedB = uaB?.unlocked ?? false;
      if (unlockedA !== unlockedB) return unlockedA ? -1 : 1;
      return TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
    });
  }, [selectedCat, allProgress]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-6 space-y-3.5 min-h-dvh">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between pt-5 pb-1"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#fbbf24] to-[#a78bfa] flex items-center justify-center text-[#241a00] font-bold text-sm">
            <Medal size={16} />
          </span>
          <div>
            <h1 className="text-lg font-black tracking-tight">{t('LOGROS')}</h1>
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('{a}/{b} desbloqueados', { a: totalUnlocked, b: ACHIEVEMENTS.length })}</p>
          </div>
        </div>
        <Badge variant="epic" className="gap-1">
          <Star size={10} /> {totalUnlocked}
        </Badge>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="text-center py-3 px-2">
          <div className="text-xl font-black">{totalUnlocked}</div>
          <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider">{t('desbloqueados')}</div>
        </Card>
        <Card className="text-center py-3 px-2">
          <div className="text-xl font-black">{ctx.totalWorkouts}</div>
          <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider">workouts</div>
        </Card>
        {!prefs.hideStreaks && (
        <Card className="text-center py-3 px-2">
          <div className="text-xl font-black">{ctx.streak}</div>
          <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider">{t('racha')}</div>
        </Card>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setSelectedCat(null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold border transition-all ${
            !selectedCat
              ? 'bg-white text-[#0a0d14] border-white'
              : 'bg-white/[.04] text-[var(--muted)] border-white/[.07]'
          }`}
        >
          {t('Todos')}
        </motion.button>
        {visibleCategories.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          return (
            <motion.button
              key={cat}
              whileTap={{ scale: 0.96 }}
              onClick={() => setSelectedCat(selectedCat === cat ? null : cat)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold border transition-all flex items-center gap-1.5 ${
                selectedCat === cat
                  ? 'bg-white text-[#0a0d14] border-white'
                  : 'bg-white/[.04] text-[var(--muted)] border-white/[.07]'
              }`}
            >
              <AvoIcon icon={cfg.icon} size={12} />
              {t(cfg.label)}
            </motion.button>
          );
        })}
      </div>

      {/* Achievement List */}
      <div className="space-y-2 pb-8">
        {filtered.map((achievement, i) => {
          const ua: UserAchievement | undefined = allProgress[achievement.id];
          if (!ua) return null;
          return (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              unlocked={ua.unlocked}
              progressCurrent={ua.progress_current}
              progressTarget={ua.progress_target}
              unlockedAt={ua.unlocked_at}
              index={i}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
