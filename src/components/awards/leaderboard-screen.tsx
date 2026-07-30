'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { fetchLeaderboard, pushLeaderboard, type LeaderboardEntry } from '@/lib/sync/leaderboard';
import { computeTotalXp, computeLevel } from '@/lib/awards/achievements';
import { logError, fallback } from '@/lib/utils/logger';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import {
  GoldMedalIcon,
  SilverMedalIcon,
  BronzeMedalIcon,
  CrownIcon,
  StarIcon,
  FlameIcon,
  BoltIcon,
} from '@/components/ui/icons-rpg';

/* ─── Avatar visual helpers ─── */

const AVATAR_COLORS = [
  'from-[#ffb454] to-[#ff7a3d]',
  'from-[#a78bfa] to-[#7c5cfc]',
  'from-[#34d399] to-[#10b981]',
  'from-[#4CC9F0] to-[#3b82f6]',
  'from-[#f472b6] to-[#ec4899]',
  'from-[#fbbf24] to-[#f59e0b]',
  'from-[#fb923c] to-[#f97316]',
  'from-[#818cf8] to-[#6366f1]',
  'from-[#2dd4bf] to-[#14b8a6]',
  'from-[#e879f9] to-[#d946ef]',
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const MEDAL_COMPONENTS = [
  <GoldMedalIcon key="gold" size={22} />,
  <SilverMedalIcon key="silver" size={22} />,
  <BronzeMedalIcon key="bronze" size={22} />,
];

/* ─── Row component ─── */

function RankRow({
  entry,
  index,
}: {
  entry: LeaderboardEntry;
  index: number;
}) {
  const isTop3 = index < 3;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.025, duration: 0.25 }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
        entry.isCurrentUser
          ? 'border-[rgba(255,180,84,0.4)] bg-[rgba(255,180,84,0.08)] shadow-[0_0_16px_rgba(255,180,84,0.08)]'
          : 'border-white/[.06] bg-white/[.03]'
      }`}
    >
      {/* Rank */}
      <span className="w-7 text-center shrink-0">
        {isTop3 ? (
          <span className="text-[#fbbf24]">{MEDAL_COMPONENTS[index]}</span>
        ) : (
          <span className="text-xs font-bold text-[#5c6577] tabular-nums">
            #{entry.rank}
          </span>
        )}
      </span>

      {/* Anonymous avatar */}
      <div
        className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(entry.avatarId)} shrink-0 flex items-center justify-center text-xs font-bold text-black shadow-sm`}
      >
        {entry.level}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">
            {entry.isCurrentUser ? 'Tú' : `Jugador #${entry.avatarId}`}
          </span>
          {entry.isCurrentUser && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[rgba(255,180,84,0.15)] text-[#ffb454] border border-[rgba(255,180,84,0.3)]">
              TÚ
            </span>
          )}
        </div>
        <div className="text-[11px] text-[#5c6577]">
          Nv.{entry.level} · {entry.totalXp.toLocaleString()} XP
        </div>
      </div>

      {/* Level badge */}
      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[.06] text-[#94a0b8] border border-white/[.08]">
        Lv.{entry.level}
      </span>
    </motion.div>
  );
}

/* ─── Stats card ─── */

function StatsBar({
  userRank,
  totalPlayers,
  totalXp,
  level,
}: {
  userRank: number | null;
  totalPlayers: number;
  totalXp: number;
  level: number;
}) {
  const xpInLevel = totalXp - (level - 1) * 200;
  const xpForNext = 200;
  const xpPct = Math.min(100, Math.round((xpInLevel / xpForNext) * 100));

  return (
    <div className="rounded-2xl border border-white/[.07] bg-white/[.03] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#94a0b8]">Tu posición</span>
        <span className="text-xl font-black text-[#ffb454]">
          {userRank ? `#${userRank}` : '—'}
          <span className="text-xs text-[#5c6577] font-semibold ml-1">
            / {totalPlayers}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-white/[.08] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpPct}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#7c5cfc]"
          />
        </div>
        <span className="text-[10px] text-[#a78bfa] font-semibold tabular-nums">
          Nv.{level} · {xpInLevel}/{xpForNext} XP
        </span>
      </div>
    </div>
  );
}

/* ─── Main screen ─── */

export function LeaderboardScreen() {
  const workouts = useStore((s) => s.workouts);
  const leaderboard = useStore((s) => s.leaderboard);
  const setLeaderboard = useStore((s) => s.setLeaderboard);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalXp = useMemo(() => computeTotalXp(workouts), [workouts]);
  const level = useMemo(() => computeLevel(totalXp), [totalXp]);

  // User's rank among the fetched entries
  const userRank = useMemo(() => {
    const myEntry = leaderboard.find((e) => e.isCurrentUser);
    return myEntry?.rank ?? null;
  }, [leaderboard]);

  const totalPlayers = useMemo(() => {
    if (leaderboard.length === 0) return 0;
    // Use the last entry's rank as an approximation if totalPlayers not available
    return Math.max(leaderboard.length, userRank ?? leaderboard.length);
  }, [leaderboard, userRank]);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // First push our own XP, then fetch rankings
      await pushLeaderboard(totalXp, level).catch(logError('leaderboard:push-init'));
      const result = await fetchLeaderboard(50);
      setLeaderboard(result.entries);
      if (result.entries.length === 0) {
        setError('Aún no hay otros jugadores. ¡Sé el primero!');
      }
    } catch {
      setError('No pudimos cargar la tabla. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [totalXp, level, setLeaderboard]);

  // Adaptive refresh interval based on rank
  const refreshInterval = useMemo(() => {
    if (!userRank) return 60000;       // No rank yet — slow
    if (userRank <= 10) return 15000;  // Top 10 — fastest (every 15s)
    if (userRank <= 50) return 30000;  // Top 50 — normal (every 30s)
    return 60000;                       // Rest — slow (every 60s)
  }, [userRank]);

  const refreshLabel = useMemo(() => {
    const secs = refreshInterval / 1000;
    const color = refreshInterval <= 15000 ? 'emerald' : refreshInterval <= 30000 ? 'blue' : 'slate';
    return { secs, color };
  }, [refreshInterval]);

  const secsStr = `${refreshLabel.secs}s`;
  const rankAnnouncement = useMemo(() => {
    const sub = `refrescando cada ${secsStr}`;
    const isTop3 = userRank && userRank <= 3;
    if (!leaderboard.length || !userRank) {
      return { icon: <StarIcon size={18} />, label: 'Explorando', sub };
    }
    if (userRank === 1) return { icon: <CrownIcon size={18} />, label: '#1', sub };
    if (isTop3) return { icon: MEDAL_COMPONENTS[userRank - 1], label: `#${userRank}`, sub };
    if (userRank <= 10) return { icon: <FlameIcon size={18} />, label: 'Top 10', sub };
    if (userRank <= 50) return { icon: <BoltIcon size={18} />, label: 'Top 50', sub };
    return { icon: <StarIcon size={18} />, label: 'Subiendo', sub };
  }, [userRank, leaderboard.length, secsStr]);

  useEffect(() => {
    loadLeaderboard();

    // Auto-refresh with adaptive interval while visible
    const interval = setInterval(async () => {
      if (document.hidden) return;
      // Read fresh state inside the callback to avoid stale closures
      const freshTotalXp = computeTotalXp(useStore.getState().workouts);
      const freshLevel = computeLevel(freshTotalXp);
      await pushLeaderboard(freshTotalXp, freshLevel).catch(logError('leaderboard:push-refresh'));
      const result = await fetchLeaderboard(50).catch(fallback('leaderboard:fetch-refresh', null));
      if (result) setLeaderboard(result.entries);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setSyncing(true);
    await pushLeaderboard(totalXp, level).catch(logError('leaderboard:push-manual'));
    const result = await fetchLeaderboard(50).catch(fallback('leaderboard:fetch-manual', null));
    if (result) setLeaderboard(result.entries);
    setSyncing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="px-4 pb-6 space-y-3.5"
    >
      {/* Title */}
      <div className="pt-3 pb-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              Tabla de Campeones
            </h1>
            <p className="text-sm text-[#94a0b8] mt-0.5">
              Ranking anónimo de XP — compite sin presión
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center shadow-lg">
            <CrownIcon size={20} />
          </div>
        </div>

        {/* Info banner */}
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[rgba(167,139,250,0.25)] bg-[rgba(167,139,250,0.06)] p-3">
          <span className="shrink-0 mt-0.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#a78bfa]"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>
          <p className="text-xs text-[#94a0b8] leading-relaxed">
            Nadie ve tu nombre ni tu correo. Solo aparecen XP y nivel con un identificador anónimo.
          </p>
        </div>
      </div>

      {/* Rank announcement banner */}
      {!loading && (
        <Tooltip
          content={
            <div className="space-y-1.5">
              <p className="font-semibold text-white/90 text-xs">
                {userRank && userRank <= 10
                  ? '🏁 Estás cerca de la cima'
                  : userRank && userRank <= 50
                  ? '📈 Vas por buen camino'
                  : '🌱 Toda gran historia empieza con un paso'}
              </p>
              <p className="opacity-70 text-[11px]">
                Completa entrenamientos para ganar XP.{' '}
                {userRank && userRank <= 3
                  ? 'Defiende tu podio: entre más constante seas, más subes.'
                  : 'Entre más constante seas, más alto escalas en la tabla.'}
              </p>
              <div className="flex items-center gap-2 pt-1 text-[10px] opacity-60 border-t border-white/[.08] mt-1.5">
                <span>🎯 XP por entrenamiento completo + minutos + constancia</span>
              </div>
            </div>
          }
          side="top"
          align="center"
        >
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-default ${
              userRank && userRank <= 10
                ? 'border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.07)]'
                : userRank && userRank <= 50
                ? 'border-[rgba(76,201,240,0.25)] bg-[rgba(76,201,240,0.06)]'
                : 'border-white/[.06] bg-white/[.03]'
            }`}
          >
            <span className="shrink-0 text-[#fbbf24]">{rankAnnouncement.icon}</span>
            <div className="flex-1 min-w-0">
              <span
                className={`text-sm font-bold ${
                  userRank && userRank <= 10
                    ? 'text-[#fbbf24]'
                    : userRank && userRank <= 50
                    ? 'text-[#4CC9F0]'
                    : 'text-[#94a0b8]'
                }`}
              >
                {rankAnnouncement.label}
              </span>
              <span className="text-xs text-[#5c6577] ml-2">
                {rankAnnouncement.sub}
              </span>
            </div>
            {userRank && userRank <= 10 && (
              <motion.span
                animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="text-[#fbbf24]"
              >
                <FlameIcon size={18} />
              </motion.span>
            )}
          </motion.div>
        </Tooltip>
      )}

      {/* Stats bar */}
      {!loading && leaderboard.length > 0 && (
        <StatsBar
          userRank={userRank}
          totalPlayers={totalPlayers}
          totalXp={totalXp}
          level={level}
        />
      )}

      {/* Refresh controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={handleRefresh}
          disabled={syncing}
          noSound
        >
          <motion.span
            animate={syncing ? { rotate: 360 } : {}}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="inline-block"
          >
            ↻
          </motion.span>
          {syncing ? 'Sincronizando...' : 'Actualizar'}
        </Button>
        {/* Live indicator */}
        {!loading && leaderboard.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.25 }}
            className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg bg-white/[.04] border border-white/[.07]"
          >
            <motion.span
              animate={{
                scale: [1, 1.35, 1],
                opacity: [1, 0.55, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: refreshLabel.color === 'emerald' ? 1.5 : refreshLabel.color === 'blue' ? 2.5 : 4,
                ease: 'easeInOut',
              }}
              className={`w-2.5 h-2.5 rounded-full block ${
                refreshLabel.color === 'emerald'
                  ? 'bg-[#34d399] shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                  : refreshLabel.color === 'blue'
                  ? 'bg-[#4CC9F0] shadow-[0_0_8px_rgba(76,201,240,0.7)]'
                  : 'bg-[#5c6577]'
              }`}
            />
            <span className="text-[10px] font-semibold text-[#94a0b8] tabular-nums">
              En vivo: cada {refreshLabel.secs}s
            </span>
          </motion.div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[.03] border border-white/[.06]"
            >
              <div className="skeleton w-7 h-5" />
              <div className="skeleton w-9 h-9 rounded-full" />
              <div className="flex-1 space-y-1">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.06)] p-6 text-center space-y-3">
          <span className="text-2xl"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6a6 6 0 1 0 6 6"/><path d="M12 10a2 2 0 1 0 2 2"/></svg></span>
          <p className="text-sm text-[#94a0b8]">{error}</p>
          <Button variant="ghost" size="sm" onClick={loadLeaderboard} noSound>
            Reintentar
          </Button>
        </div>
      )}

      {/* Leaderboard entries */}
      {!loading && leaderboard.length > 0 && (
        <div className="space-y-1.5">
          {leaderboard.map((entry, i) => (
            <RankRow key={entry.avatarId + entry.rank} entry={entry} index={i} />
          ))}
        </div>
      )}

      {/* Footer */}
      {!loading && leaderboard.length > 0 && (
        <p className="text-[10px] text-center text-[#5c6577] pt-2">
          Compite sin presión. A tu ritmo.
        </p>
      )}
    </motion.div>
  );
}
