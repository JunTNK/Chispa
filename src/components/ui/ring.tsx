'use client';

import React from 'react';

interface RingProps {
  pct: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}

export function RecRing({ pct, size = 64, strokeWidth = 7, color, children }: RingProps) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(pct, 100) / 100);
  const defaultColor = pct >= 75 ? '#34d399' : pct >= 55 ? '#ffb454' : pct >= 35 ? '#fbbf24' : '#f87171';
  const stroke = color || defaultColor;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth}
        />
        <circle
          className="transition-[stroke-dashoffset] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={stroke} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c.toFixed(1)}
          strokeDashoffset={offset.toFixed(1)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none z-10">
        {children}
      </div>
    </div>
  );
}
