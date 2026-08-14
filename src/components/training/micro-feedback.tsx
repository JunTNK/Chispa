'use client';

/**
 * MicroFeedback — micro-feedback post-rutina (spec §5).
 *
 * 3 preguntas de 1 tap (¿mucho/justo/poco? · ¿te gustó? · ¿podrías mañana?).
 * Nunca texto libre obligatorio: todas las respuestas son opcionales y un solo
 * toque. Alimentan al algoritmo (el twin aprende qué movimientos le gustan y
 * qué intensidad se sintió bien), nunca juzgan al usuario.
 */
import React from 'react';
import { useT } from '@/lib/i18n/use-t';
import type { MicroFeedbackAnswers } from '@/types';

interface MicroFeedbackProps {
  value: MicroFeedbackAnswers;
  onChange: (patch: Partial<MicroFeedbackAnswers>) => void;
}

const EFFORT_OPTIONS: { value: 'mucho' | 'justo' | 'poco'; emoji: string; labelKey: string; descKey: string }[] = [
  { value: 'mucho', emoji: '😮‍💨', labelKey: 'Mucho', descKey: 'Me pedí de más' },
  { value: 'justo', emoji: '😌', labelKey: 'Justo', descKey: 'Al punto perfecto' },
  { value: 'poco', emoji: '😕', labelKey: 'Poco', descKey: 'Me quedé con ganas' },
];

const LIKED_OPTIONS: { value: 'si' | 'no'; emoji: string; labelKey: string; descKey: string }[] = [
  { value: 'si', emoji: '❤️', labelKey: 'Sí', descKey: 'Lo repetiría' },
  { value: 'no', emoji: '👎', labelKey: 'No', descKey: 'No me convenció' },
];

const TOMORROW_OPTIONS: { value: 'si' | 'quizas' | 'no'; emoji: string; labelKey: string; descKey: string }[] = [
  { value: 'si', emoji: '✅', labelKey: 'Sí', descKey: 'Cuenta conmigo' },
  { value: 'quizas', emoji: '🤔', labelKey: 'Quizás', descKey: 'Depende del día' },
  { value: 'no', emoji: '🌙', labelKey: 'No', descKey: 'Hoy no fue día' },
];

function QuestionRow<T extends string>({
  question,
  options,
  selected,
  onSelect,
}: {
  question: string;
  options: { value: T; emoji: string; labelKey: string; descKey: string }[];
  selected: T | null;
  onSelect: (v: T) => void;
}) {
  const t = useT();
  return (
    <div>
      <p className="text-xs font-bold text-[var(--muted)] mb-2">{question}</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onSelect(o.value)}
            aria-pressed={selected === o.value}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[64px] rounded-xl border-2 px-2 py-2 text-center transition-all active:scale-[0.97] ${
              selected === o.value
                ? 'border-[#ffb454] bg-[rgba(255,180,84,0.10)]'
                : 'border-[var(--line)] bg-[var(--card2)] hover:border-[rgba(255,180,84,0.35)]'
            }`}
          >
            <span className="text-lg leading-none">{o.emoji}</span>
            <span className="text-xs font-bold leading-tight">{t(o.labelKey)}</span>
            <span className="text-[9px] text-[var(--muted)] leading-tight">{t(o.descKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function MicroFeedback({ value, onChange }: MicroFeedbackProps) {
  const t = useT();
  return (
    <div className="rounded-2xl border border-[rgba(167,139,250,0.22)] bg-[rgba(167,139,250,0.05)] p-4">
      <h3 className="text-sm font-bold mb-0.5">{t('¿Cómo se sintió? (opcional)')}</h3>
      <p className="text-[11px] text-[var(--muted)] mb-4 leading-relaxed">
        {t('3 toques para que el motor aprenda. Sin texto, sin obligación.')}
      </p>
      <div className="space-y-4">
        <QuestionRow
          question={t('¿Fue mucho, justo o poco?')}
          options={EFFORT_OPTIONS}
          selected={value.effort}
          onSelect={(effort) => onChange({ effort })}
        />
        <QuestionRow
          question={t('¿Te gustó este movimiento?')}
          options={LIKED_OPTIONS}
          selected={value.liked}
          onSelect={(liked) => onChange({ liked })}
        />
        <QuestionRow
          question={t('¿Podrías hacerlo mañana?')}
          options={TOMORROW_OPTIONS}
          selected={value.tomorrow}
          onSelect={(tomorrow) => onChange({ tomorrow })}
        />
      </div>
    </div>
  );
}
