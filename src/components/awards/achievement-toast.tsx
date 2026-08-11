'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { ACHIEVEMENT_MAP, TIER_CONFIG } from '@/lib/awards/achievements';
import { useSound } from '@/lib/awards/use-sound';
import { trackEvent } from '@/lib/analytics';
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
  const t = useT();
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
      trackEvent('achievement_unlocked', { achievement_id: id });
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
  const isMiniVictory = current === 'mini_victoria';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 50, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={`fixed top-20 right-4 z-[100] max-w-[320px] rounded-2xl border p-3.5 ${
            isMiniVictory
              ? 'bg-[rgba(16,185,129,0.1)] border-[rgba(52,211,153,0.4)]'
              : `${tierCfg.bg} ${tierCfg.border} ${tierCfg.glow || ''}`
          }`}
          style={{ boxShadow: tierCfg.glow && !isMiniVictory ? '0 0 30px rgba(255,184,0,0.15)' : undefined }}
        >
          {isMiniVictory ? (
            /* ── Mini victoria: refuerza que un minuto cuenta ── */
            <div className="flex items-start gap-3">
              <motion.span
                animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#34d399] to-[#00D4AA] text-[#06221b] flex items-center justify-center font-black text-lg shrink-0"
              >
                1
              </motion.span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#34d399]">
                    {t('Mini victoria')}
                  </span>
                </div>
                <p className="text-sm font-bold text-white">
                  {t('Un minuto ya es ganar.')}
                </p>
                <p className="text-[11px] text-[var(--muted)] leading-tight mt-0.5">
                  {t('Hoy te moviste un minuto. Mañana pueden ser dos. Hacer algo vence a hacerlo perfecto.')}
                </p>
              </div>
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="text-lg"
              >
                ⚡
              </motion.span>
            </div>
          ) : (
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
                <p className="text-[11px] text-[var(--muted)] leading-tight mt-0.5">
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
              {current ? (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const text = `Chispa ✨: "${achievement.name}" — ${achievement.description}`;
                  if (navigator.share) {
                    await navigator.share({ title: 'Chispa', text });
                    trackEvent('share_achievement', { achievement_id: current });
                  } else {
                    await navigator.clipboard.writeText(text);
                  }
                }}
                className="ml-2 p-1.5 rounded-lg hover:bg-white/[.08] transition-colors"
                title="Compartir logro"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67 2 2 0 0 1 2-2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.4 2.41l-.8 1.2a2 2 0 0 1-.4 2.41 12.84 12.84 0 0 1 3.07 2.41 2 2 0 0 1 2 1.72z"></path></svg>
              </button>
              ) : null}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
