'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { Brain } from 'lucide-react';

const BOOT_LINES = [
  { text: '> initializing agentic kernel v3.0', delay: 0.3 },
  { text: '> orchestrator · decision tree ......... online', delay: 0.7 },
  { text: '> coach · loading exercises .......... ok', delay: 1.1 },
  { text: '> body double · state machine .......... ok', delay: 1.5 },
  { text: '> auditor · linear regression .......... ok', delay: 1.9 },
  { text: '> llm · local model ........... loaded', delay: 2.3 },
  { text: '> zod · anti-hallucination layer ....... armed', delay: 2.7 },
];

interface BootScreenProps {
  onComplete: () => void;
}

export function BootScreen({ onComplete }: BootScreenProps) {
  const t = useT();
  const profile = useStore((s) => s.profile);
  const name = profile?.name || 'atleta';

  const [visibleLines, setVisibleLines] = React.useState(0);
  const [ready, setReady] = React.useState(false);

  const personalizationLine = {
    text: `> personalizing for ${name} .......... done`,
  };

  const totalSteps = BOOT_LINES.length + 1; // +1 for personalization

  React.useEffect(() => {
    // Reveal lines one by one
    const timers: ReturnType<typeof setTimeout>[] = [];

    BOOT_LINES.forEach((line, i) => {
      timers.push(setTimeout(() => {
        setVisibleLines((prev) => Math.max(prev, i + 1));
      }, line.delay * 1000));
    });

    // Personalization line and ready state
    const personalizationTimer = setTimeout(() => {
      setVisibleLines(totalSteps);
    }, 3.2 * 1000);

    const readyTimer = setTimeout(() => {
      setReady(true);
    }, 3.8 * 1000);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4.5 * 1000);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(personalizationTimer);
      clearTimeout(readyTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, name, totalSteps]);

  const progress = (visibleLines / totalSteps) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#04060A]"
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(500px 400px at 50% 30%, rgba(0,212,170,0.12), transparent 65%)',
        }}
      />

      {/* Brand Core */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 150, damping: 15 }}
        className="relative z-10 mb-5"
      >
        <div className="relative w-[74px] h-[74px] rounded-[24px] bg-gradient-to-br from-[#00D4AA] to-[#7C5CFC] grid place-items-center shadow-[0_16px_44px_-8px_rgba(0,212,170,0.55)]">
          <Brain size={36} className="text-[#042019]" />
        </div>
        <div
          className="absolute -inset-2 rounded-[30px] border border-[rgba(0,212,170,0.45)]"
          style={{ animation: 'corePulse 1.6s ease-out infinite' }}
        />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative z-10 text-[24px] font-black tracking-tight mb-1"
      >
        {t('Construyendo tu OS')}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="relative z-10 text-[12px] text-[var(--muted)] font-mono mb-6"
      >
        {t('personalizando agentes · cargando modelos')}
      </motion.p>

      {/* Boot Lines */}
      <div className="relative z-10 w-full max-w-[320px] bg-[rgba(10,13,19,0.9)] border border-[#232A38] rounded-[16px] p-4 font-mono text-[10.5px] leading-[2.1] text-[var(--muted)] min-h-[190px] mb-4 overflow-hidden">
        <AnimatePresence>
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="whitespace-nowrap"
            >
              {line.text}
            </motion.div>
          ))}
          {visibleLines >= totalSteps && (
            <motion.div
              key="personalization"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="whitespace-nowrap text-[#00D4AA] font-semibold"
            >
              {personalizationLine.text}
            </motion.div>
          )}
          {ready && (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="whitespace-nowrap text-[#00D4AA] font-bold mt-1"
            >
              {t('READY · bienvenid@, {name}.', { name })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Bar */}
      <div className="relative z-10 w-full max-w-[320px] h-[5px] bg-[#1E2531] rounded-[5px] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="h-full rounded-[5px] bg-gradient-to-r from-[#00D4AA] to-[#7C5CFC]"
        />
      </div>

      {/* Skip button — neurodivergent-friendly: no forced wait */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        whileHover={{ opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onComplete}
        className="relative z-10 mt-4 text-[11px] text-[var(--muted)] font-mono hover:text-[#ffb454] transition-colors"
      >
        {t('Saltar')}
      </motion.button>

      <style jsx>{`
        @keyframes corePulse {
          0% { transform: scale(0.85); opacity: 0.9; }
          100% { transform: scale(1.35); opacity: 0; }
        }
      `}</style>
    </motion.div>
  );
}
