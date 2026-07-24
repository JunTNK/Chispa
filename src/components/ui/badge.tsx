'use client';

import React from 'react';
import { cn } from '@/lib/utils/helpers';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'minimal' | 'light' | 'standard' | 'push' | 'ghost' | 'accent';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'ghost', ...props }, ref) => {
    const variants: Record<string, string> = {
      minimal: 'bg-[rgba(96,165,250,0.16)] text-[#93c5fd]',
      light: 'bg-[rgba(52,211,153,0.16)] text-[#34d399]',
      standard: 'bg-[rgba(255,180,84,0.16)] text-[#ffb454]',
      push: 'bg-[rgba(248,113,113,0.16)] text-[#f87171]',
      ghost: 'bg-white/[.07] text-[#94a0b8]',
      accent: 'bg-[rgba(255,180,84,0.14)] text-[#ffb454]',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
