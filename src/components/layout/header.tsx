'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import Image from 'next/image';
import { cap } from '@/lib/utils/helpers';
import { computeTotalXp, computeLevel } from '@/lib/awards/achievements';

export function Header() {
  const profile = useStore((s) => s.profile);
  const workouts = useStore((s) => s.workouts);
  const completionRate = useStore((s) => s.twin?.patterns?.completion_rate ?? 0);

  const date = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const totalXp = computeTotalXp(workouts);
  const level = computeLevel(totalXp);
  const xpInLevel = totalXp - (level - 1) * 200;
  const xpForNext = 200;
  const xpPct = Math.min(100, Math.round((xpInLevel / xpForNext) * 100));

  return (
    <header className="flex items-center justify-between px-4 pt-5 pb-2">
      <div>
        <h1 className="font-black text-xl tracking-tight flex items-center gap-2">
          Hola, {profile?.name || 'amigo'}
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[rgba(167,139,250,0.16)] text-[#a78bfa] border border-[rgba(167,139,250,0.3)] float">
            Nv.{level}
          </span>
        </h1>
        <p className="text-sm text-[#94a0b8] capitalize">{cap(date)}</p>
        {/* XP Bar */}
        <div className="mt-1.5 flex items-center gap-2 max-w-[200px]">
          <div className="flex-1 h-1.5 rounded-full bg-white/[.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#7c5cfc] transition-all duration-700"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <span className="text-[10px] text-[#a78bfa] font-semibold tabular-nums">
            {xpInLevel}/{xpForNext} XP
          </span>
        </div>
      </div>
      <div className="relative">
        <Image
          src="https://image.qwenlm.ai/public_source/6293bf56-c9cc-4349-841d-cdde04e9d74e/1d08f0a58-ea85-4e8b-b799-e65c81f037a6.png"
          alt="CHISPA"
          width={36}
          height={36}
          className="rounded-xl object-cover ring-2 ring-[rgba(255,180,84,0.3)]"
        />
        {completionRate >= 0.7 && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#34d399] flex items-center justify-center text-[8px] font-bold text-black float">
            ✓
          </span>
        )}
      </div>
    </header>
  );
}
