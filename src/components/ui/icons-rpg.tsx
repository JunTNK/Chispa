'use client';

import React from 'react';

interface Props {
  size?: number;
  className?: string;
}

/* ─── RPE / Mood Icons ─── */

export const SmileIcon = ({ size = 24, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14c1.5 2 4.5 2 6 0" />
    <circle cx="9" cy="9" r=".8" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9" r=".8" fill="currentColor" stroke="none" />
  </svg>
);

export const FlexIcon = ({ size = 24, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 3c0 2-1 4-2 6" />
    <path d="M8 8c0 4 1 7 2 10" />
    <path d="M16 8c-1 2-2 5-2 8" />
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const FlameIcon = ({ size = 24, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2c-1 3-3 5-3 8 0 3 2 5 3 5s3-2 3-5c0-3-2-5-3-8z" />
    <path d="M9 13c-2 1-3 3-3 5 0 3 2.5 4 6 4s6-1 6-4c0-2-1-4-3-5" />
    <path d="M12 15c-2 0-3 .5-3 1.5S10 18 12 18s3-.5 3-1.5S14 15 12 15z" />
  </svg>
);

export const CalmFaceIcon = ({ size = 24, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 10c.5 0 1-.5 1-1" />
    <path d="M15 10c-.5 0-1-.5-1-1" />
    <path d="M9 14c2 1 4 1 6 0" />
  </svg>
);

export const HappyFaceIcon = ({ size = 24, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 10c.5 1 1.5 1 2 0" />
    <path d="M14 10c.5 1 1.5 1 2 0" />
    <path d="M8 14c1.5 2 4.5 2 6 0" />
  </svg>
);

export const TiredFaceIcon = ({ size = 24, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M7 9c1-1 2-1 3 0" />
    <path d="M14 9c1-1 2-1 3 0" />
    <path d="M8 16l8-8" />
    <path d="M9 15c2 .5 4 .5 6 0" />
  </svg>
);

export const NeutralFaceIcon = ({ size = 24, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="9" cy="10" r=".7" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r=".7" fill="currentColor" stroke="none" />
    <path d="M9 15h6" />
  </svg>
);

export const EnergyIcon = ({ size = 24, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
  </svg>
);

export const SleepyFaceIcon = ({ size = 24, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12c0 5 4 9 9 9s9-4 9-9" />
    <path d="M21 12c0-5-4-9-9-9" />
    <path d="M7 9c.5 1 1.5 1 2 0" />
    <path d="M15 9c.5 1 1.5 1 2 0" />
    <path d="M20 12c-1-1-3-1-4 0" />
    <path d="M8 12c-1-1-3-1-4 0" />
    <path d="M8 21l-2 2" />
    <path d="M16 21l2 2" />
  </svg>
);

/* ─── Medal / Trophy Icons ─── */

export const GoldMedalIcon = ({ size = 22, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="14" r="6" />
    <path d="M8 2l1 5-3 2-1-7z" />
    <path d="M16 2l-1 5 3 2 1-7z" />
    <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor" stroke="none">1</text>
  </svg>
);

export const SilverMedalIcon = ({ size = 22, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="14" r="6" />
    <path d="M8 2l1 5-3 2-1-7z" />
    <path d="M16 2l-1 5 3 2 1-7z" />
    <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor" stroke="none">2</text>
  </svg>
);

export const BronzeMedalIcon = ({ size = 22, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="14" r="6" />
    <path d="M8 2l1 5-3 2-1-7z" />
    <path d="M16 2l-1 5 3 2 1-7z" />
    <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor" stroke="none">3</text>
  </svg>
);

export const CrownIcon = ({ size = 22, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 18l2-12 4 4 2-6 2 6 4-4 2 12H4z" />
  </svg>
);

export const StarIcon = ({ size = 18, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" />
  </svg>
);

export const WarningIcon = ({ size = 20, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2L2 20h20L12 2z" />
    <path d="M12 9v4" />
    <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const ShieldIcon = ({ size = 24, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2C8 4 4 5 3 5v7c0 5 3.5 9 9 11 5.5-2 9-6 9-11V5c-1 0-5-1-9-3z" />
  </svg>
);

export const BoltIcon = ({ size = 20, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
  </svg>
);

export const PulseIcon = ({ size = 18, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

export const TimerIcon = ({ size = 20, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
    <path d="M12 2v2" />
    <path d="M19 5l-1 1" />
  </svg>
);
