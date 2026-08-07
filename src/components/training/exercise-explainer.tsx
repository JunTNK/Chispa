'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '@/lib/i18n/use-t';
import { ChevronDown, ShieldAlert, Target, Lightbulb } from 'lucide-react';
import type { Exercise } from '@/types';

interface ExerciseExplainerProps {
  exercise: Exercise;
}

type Section = 'howTo' | 'benefits' | 'precautions';

const SECTION_META: Record<Section, { icon: typeof Lightbulb; color: string; bg: string }> = {
  howTo: {
    icon: Lightbulb,
    color: '#ffb454',
    bg: 'rgba(255,180,84,0.08)',
  },
  benefits: {
    icon: Target,
    color: '#00D4AA',
    bg: 'rgba(0,212,170,0.08)',
  },
  precautions: {
    icon: ShieldAlert,
    color: '#f87171',
    bg: 'rgba(248,113,113,0.08)',
  },
};

function ExplainerSection({
  section,
  title,
  content,
  isOpen,
  onToggle,
}: {
  section: Section;
  title: string;
  content: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const meta = SECTION_META[section];
  const Icon = meta.icon;

  return (
    <div className="border border-white/[.07] rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/[.04] transition-colors"
      >
        <span
          className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0"
          style={{ backgroundColor: meta.bg }}
        >
          <Icon size={14} style={{ color: meta.color }} />
        </span>
        <span className="text-sm font-semibold flex-1">{title}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-[var(--muted)]"
        >
          <ChevronDown size={14} />
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-3 pb-3 text-xs text-[var(--muted)] leading-relaxed">
              {content}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ExerciseExplainer({ exercise }: ExerciseExplainerProps) {
  const t = useT();
  const [openSection, setOpenSection] = React.useState<Section | null>(null);

  // Build content for each section from exercise data
  const sections = React.useMemo(() => {
    const result: { key: Section; title: string; content: string }[] = [];

    // Cómo hacerlo — use instructionsSteps or instructions text
    const howToContent = exercise.instructionsSteps && exercise.instructionsSteps.length > 0
      ? exercise.instructionsSteps.join(' ')
      : exercise.instructions;
    if (howToContent) {
      result.push({
        key: 'howTo',
        title: t('Cómo hacerlo'),
        content: howToContent,
      });
    }

    // Para qué sirve — use benefits field, fallback to muscle info
    const benefitsContent = exercise.benefits
      || (exercise.primaryMuscles && exercise.primaryMuscles.length > 0
        ? `${t('Trabaja')} ${exercise.primaryMuscles.join(', ')}${exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 ? `. ${t('Secundarios')}: ${exercise.secondaryMuscles.join(', ')}` : ''}`
        : '');
    if (benefitsContent) {
      result.push({
        key: 'benefits',
        title: t('Para qué sirve'),
        content: benefitsContent,
      });
    }

    // Precauciones — use precautions field
    if (exercise.precautions) {
      result.push({
        key: 'precautions',
        title: t('Precauciones'),
        content: exercise.precautions,
      });
    }

    return result;
  }, [exercise, t]);

  if (sections.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-1.5"
    >
      {sections.map((s) => (
        <ExplainerSection
          key={s.key}
          section={s.key}
          title={s.title}
          content={s.content}
          isOpen={openSection === s.key}
          onToggle={() => setOpenSection(openSection === s.key ? null : s.key)}
        />
      ))}
    </motion.div>
  );
}
