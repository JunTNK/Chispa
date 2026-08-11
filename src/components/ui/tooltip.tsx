'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/* ─── Props ─── */

interface TooltipProps {
  /** Content to show inside the tooltip popover */
  content: React.ReactNode;
  /** Positioning relative to the trigger */
  side?: 'top' | 'bottom';
  /** Alignment of the tooltip relative to the trigger */
  align?: 'start' | 'center' | 'end';
  /** Optional className for the trigger wrapper */
  className?: string;
  children: React.ReactNode;
}

/* ─── Component ─── */

export function Tooltip({
  content,
  side = 'top',
  align = 'center',
  className,
  children,
}: TooltipProps) {
  const [open, setOpen] = useState(false);

  const show = () => setOpen(true);
  const hide = () => setOpen(false);

  const sideOffset = 6;

  const positionStyles: React.CSSProperties = {
    [side === 'top' ? 'bottom' : 'top']: '100%',
    marginTop: side === 'bottom' ? sideOffset : 0,
    marginBottom: side === 'top' ? sideOffset : 0,
    left: align === 'start' ? 0 : align === 'end' ? undefined : '50%',
    right: align === 'end' ? 0 : undefined,
    transform: align === 'center' ? 'translateX(-50%)' : undefined,
    zIndex: 50,
  };

  return (
    <div
      className={`relative inline-flex ${className ?? ''}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      <AnimatePresence>
        {open && content && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: side === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: side === 'top' ? 4 : -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={positionStyles}
            className="absolute w-max max-w-[240px] pointer-events-none"
            role="tooltip"
          >
            <div className="rounded-xl border border-white/[.09] bg-[#1e2531] px-3 py-2 text-xs text-[#c8ced8] shadow-xl shadow-black/40 backdrop-blur-md leading-relaxed">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
