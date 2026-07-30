'use client';

import { supabase } from '@/lib/db/supabase';

/* ─── Types ─── */

export interface LeaderboardEntry {
  rank: number;
  totalXp: number;
  level: number;
  /** Anonymous identifier: first 4 chars of user_id for visual distinction */
  avatarId: string;
  /** True if this entry belongs to the current user */
  isCurrentUser: boolean;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  userRank: number | null;
  totalPlayers: number;
}

/* ─── Service ─── */

/**
 * Push the current user's XP and level to the leaderboard.
 * This stores NO personal info — just XP and level.
 * Called automatically after each workout save.
 */
export async function pushLeaderboard(
  totalXp: number,
  level: number
): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data?.session?.user?.id;
    if (!uid) return false;

    const { error } = await (supabase.from('leaderboard') as any).upsert(
      {
        user_id: uid,
        total_xp: totalXp,
        level,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id', ignoreDuplicates: false }
    );

    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch the top N leaderboard entries plus the current user's position.
 * Returns anonymously — only XP, level, and a short avatar ID.
 */
export async function fetchLeaderboard(
  limit: number = 50
): Promise<LeaderboardResult> {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data?.session?.user?.id ?? null;

    // Fetch top entries
    const { data: top, error } = await (supabase.from('leaderboard') as any)
      .select('user_id, total_xp, level')
      .order('total_xp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const entries: LeaderboardEntry[] = (top ?? []).map(
      (row: any, i: number) => ({
        rank: i + 1,
        totalXp: row.total_xp,
        level: row.level,
        avatarId: (row.user_id as string).slice(0, 4),
        isCurrentUser: row.user_id === uid,
      })
    );

    // Find user's rank among ALL players (not just top)
    let userRank: number | null = null;
    if (uid) {
      const myRow = entries.find((e) => e.isCurrentUser);
      if (myRow) {
        userRank = myRow.rank;
      } else {
        // User is outside top N — get user's own entry for position estimation
        // First, count total players
        await (supabase.from('leaderboard') as any)
          .select('*', { count: 'exact', head: true })
          .gt('total_xp', 0);

        // Get user's own entry for position estimation
        const { data: myData } = await (supabase.from('leaderboard') as any)
          .select('total_xp')
          .eq('user_id', uid)
          .single();

        if (myData) {
          // Count how many have more XP than the user
          const { count: ahead } = await (supabase.from('leaderboard') as any)
            .select('*', { count: 'exact', head: true })
            .gt('total_xp', (myData as any).total_xp);

          userRank = (ahead ?? 0) + 1;
        }
      }
    }

    // Total player count
    const { count: totalPlayers } = await (supabase.from('leaderboard') as any)
      .select('*', { count: 'exact', head: true })
      .gt('total_xp', 0);

    return {
      entries,
      userRank,
      totalPlayers: totalPlayers ?? 0,
    };
  } catch {
    return { entries: [], userRank: null, totalPlayers: 0 };
  }
}
