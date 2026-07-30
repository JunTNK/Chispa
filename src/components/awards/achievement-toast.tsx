'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { ACHIEVEMENT_MAP, TIER_CONFIG } from '@/lib/awards/achievements';
import { useSound } from '@/lib/awards/use-sound';
import {
  Footprints, Flame, Zap, Trophy, Sword, Crown,
  Target, Dumbbell, CheckCircle, Award, Activity,
  TrendingUp, Sun, Moon, Wrench, Smile, Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* Map icon strings to Lucide components */
const ICON_MAP: Record<string, LucideIcon> = {
  Footprints, Flame, Zap, Trophy, Sword, Crown,
  Target, Dumbbell, CheckCircle, Award, Activity,
  TrendingUp, Sun, Moon, Wrench, Smile, Sparkles,
};

function AchievementIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  const Icon = ICON_MAP[icon] || Sparkles;
  return <Icon size={size} />;
}

export function AchievementToast() {
  const achievementQueue = useStore((s) => s.achievementQueue);
  const dequeueAchievement = useStore((s) => s.dequeueAchievement);
  const [current, setCurrent] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const { play: playSound } = useSound();

  // Effect 1: Watch the queue and show new achievements
  useEffect(() => {
    const id = achievementQueue[0];
    if (id && !visible) {
      setCurrent(id);
      setVisible(true);
      dequeueAchievement();
      playSound('achievement');
    }
  }, [achievementQueue, visible, dequeueAchievement, playSound]);

  // Effect 2: Auto-hide after timeout (separated to prevent timer from being cleared)
  useEffect(() => {
    if (!current || !visible) return;

    const t = setTimeout(() => {
      setVisible(false);
      setCurrent(null);
    }, 3500);

    return () => clearTimeout(t);
  }, [current, visible]);

  const achievement = current ? ACHIEVEMENT_MAP[current] : null;
  if (!achievement) return null;

  const tierCfg = TIER_CONFIG[achievement.tier] ?? TIER_CONFIG.common;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 50, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={`fixed top-20 right-4 z-[100] max-w-[320px] rounded-2xl border p-3.5 ${tierCfg.bg} ${tierCfg.border} ${tierCfg.glow || ''}`}
          style={{ boxShadow: tierCfg.glow ? '0 0 30px rgba(255,184,0,0.15)' : undefined }}
        >
          <div className="flex items-start gap-3">
            <motion.span
              animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${tierCfg.bg} ${tierCfg.text}`}
            >
              <AchievementIcon icon={achievement.icon} size={22} />
            </motion.span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${tierCfg.text}`}>
                  {tierCfg.label}
                </span>
              </div>
              <p className="text-sm font-bold text-white">
                {achievement.name}
              </p>
              <p className="text-[11px] text-[#94a0b8] leading-tight mt-0.5">
                {achievement.description}
              </p>
            </div>
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="text-lg"
            >
              <Sparkles size={18} className="text-[#fbbf24]" />
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
