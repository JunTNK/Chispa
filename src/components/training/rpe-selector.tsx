'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Smile, Wind, Flame } from 'lucide-react';

export type RpeValue = 'suave' | 'justo' | 'duro';

interface RpeOption {
  val: RpeValue;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  desc: string;
}

const RPE_OPTIONS: RpeOption[] = [
  { val: 'suave', icon: Smile, label: 'Suave', desc: 'Podría más' },
  { val: 'justo', icon: Wind, label: 'Justo', desc: 'Al punto' },
  { val: 'duro', icon: Flame, label: 'Duro', desc: 'Me costó' },
];

interface RpeSelectorProps {
  value: string | null;
  onChange: (val: RpeValue) => void;
}

export function RpeSelector({ value, onChange }: RpeSelectorProps) {
  return (
    <Card>
      <span className="font-bold text-sm flex items-center gap-2 mb-3">
        ¿Cómo de exigente fue?
      </span>
      <div className="grid grid-cols-3 gap-2.5">
        {RPE_OPTIONS.map((o) => {
          const Icon = o.icon;
          const selected = value === o.val;
          return (
            <button
              key={o.val}
              onClick={() => onChange(o.val)}
              className={`flex flex-col items-center gap-1 min-h-[64px] rounded-2xl border-2 p-2 text-center transition-all ${
                selected
                  ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                  : 'border-white/[.07] bg-[#151b2a]'
              }`}
            >
              <span className="font-semibold text-sm flex items-center gap-1.5">
                <Icon size={16} className="text-[#ffb454]" />
                {o.label}
              </span>
              <span className="text-[11px] text-[#94a0b8]">{o.desc}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
