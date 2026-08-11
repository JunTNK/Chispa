'use client';

import React from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';

/**
 * MotionShell — animated wrapper for view transitions.
 *
 * Loaded lazily via next/dynamic from page.tsx so that `motion/react`
 * stays OUT of the initial critical bundle (LCP optimization).
 *
 * `initial={false}` on AnimatePresence is critical: it disables the
 * enter animation on first mount, so content renders at full opacity
 * immediately instead of starting hidden at opacity:0 (which blocked
 * the LCP element until JS hydrated). View switches still animate.
 */

const pageVariants = {
  initial: { opacity: 0, y: 10 } as const,
  animate: { opacity: 1, y: 0 } as const,
  exit: { opacity: 0, y: -10 } as const,
};

const pageTransition = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function MotionShell({ view, children }: { view: string; children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={view}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageVariants}
          transition={pageTransition}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
