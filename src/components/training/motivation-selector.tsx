'use client';

import React from 'react';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { BarChart3, Flame, Wind } from 'lucide-react';

export type MotivValue = 'data' | 'energy' | 'calm';

interface MotivOption {
  val: MotivValue;
  text: React.ReactNode;
}

const MOTIV_OPTIONS: (t: (s: string, v?: Record<string, string | number>) => string) => MotivOption[] = (t) => [
  {
    val: 'data',
    text: (
      <>
        <BarChart3 size={14} className="inline text-[var(--muted)] mr-1" />
        {t('Recuperación 78%. Consistencia 69%. Los datos dicen que puedes.')}
      </>
    ),
  },
  {
    val: 'energy',
    text: (
      <>
        <Flame size={14} className="inline text-[#ffb454] mr-1" />
        {t('La chispa se enciende moviéndote. ¡A por hoy!')}
      </>
    ),
  },
  {
    val: 'calm',
    text: (
      <>
        <Wind size={14} className="inline text-[var(--muted)] mr-1" />
        {t('Sin prisa. A tu ritmo. Un paso cada vez.')}
      </>
    ),
  },
];

interface MotivationSelectorProps {
  value: string | null;
  onChange: (val: MotivValue) => void;
}

export function MotivationSelector({ value, onChange }: MotivationSelectorProps) {
  const t = useT();
  const options = MOTIV_OPTIONS(t);
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <span className="font-bold text-sm">{t('¿Qué mensaje te motiva más?')}</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/[.07] text-[10px] font-bold text-[var(--muted)]">
          {t('el motor aprende')}
        </span>
      </div>
      <div className="space-y-2">
        {options.map((o) => {
          const selected = value === o.val;
          return (
            <button
              key={o.val}
              onClick={() => onChange(o.val)}
              className={`w-full text-left rounded-2xl border-2 p-3 text-sm leading-relaxed transition-all ${
                selected
                  ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                  : 'border-white/[.07] bg-[#1a2234]'
              }`}
            >
              {o.text}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
