'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FOCUS_LABELS } from '@/lib/utils/constants';
import {
  DESIRED_PATTERNS,
  PATTERN_LABEL,
} from '@/lib/agents/selector-engine';
import type { WorkoutTemplate } from '@/types';
import { Check, Plus, Trash2, Play, Zap, Activity, Save, Pencil } from 'lucide-react';
import { cn, daysBetween } from '@/lib/utils/helpers';

// ─── Tarjeta de plantilla ──────────────────────────────────────────────────

/** Fecha relativa del último uso (spec: los números informan, no moralizan). */
function lastUsedLabel(
  ref: string | undefined,
  t: ReturnType<typeof useT>,
  lang: 'es' | 'en'
): string {
  if (!ref) return t('Nunca usado');
  const days = daysBetween(ref);
  if (days <= 0) return t('hoy');
  if (days === 1) return t('ayer');
  if (days < 30) return t('hace {n} días', { n: days });
  return new Date(ref).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

function TemplateCard({ tpl, index }: { tpl: WorkoutTemplate; index: number }) {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const removeTemplate = useStore((s) => s.removeTemplate);
  const touchTemplate = useStore((s) => s.touchTemplate);
  const setEditingTemplate = useStore((s) => s.setEditingTemplate);
  const setPlan = useStore((s) => s.setPlan);
  const setView = useStore((s) => s.setView);

  const b = tpl.balance;
  const patterns = DESIRED_PATTERNS[tpl.focus];

  const edit = () => {
    setEditingTemplate(tpl.id);
    setView('create-workout');
  };

  const start = () => {
    if (tpl.exercises.length === 0) return;
    useStore.getState().trackDecision(5);
    touchTemplate(tpl.id);
    const totalSets = tpl.exercises.reduce((a, e) => a + e.sets, 0);
    setPlan({
      action: 'train',
      intensity: 'standard',
      duration: b?.durationMin ?? 20,
      reasons: ['Entrenamiento personalizado'],
      confidence: 85,
      recovery_score: 60,
      consistency: { user_id: '', period_start: '', period_end: '', consistency_pct: 50, sessions_done: 0, sessions_target: 4 },
      date: new Date().toISOString().slice(0, 10),
      done: false,
      workout: {
        focus: tpl.focus,
        intensity: 'standard',
        duration: b?.durationMin ?? 20,
        exercises: tpl.exercises.map((e) => ({ ...e, status: 'pending' as const })),
        title: tpl.name,
        sets: totalSets,
        rest: 60,
      },
    });
    setView('session');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="p-4 card-hover">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{tpl.name}</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">
              {t(FOCUS_LABELS[tpl.focus])} · {t('{n} ejercicios', { n: tpl.exercises.length })}
            </p>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">
              {t('Último uso')} · {lastUsedLabel(tpl.last_used, t, lang)}
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={edit}
              aria-label={t('Editar')}
              className="w-8 h-8 rounded-lg bg-white/[.04] flex items-center justify-center text-[var(--muted)] hover:text-[#ffb454] hover:bg-[rgba(255,180,84,0.1)] transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => removeTemplate(tpl.id)}
              aria-label={t('Eliminar rutina')}
              className="w-8 h-8 rounded-lg bg-white/[.04] flex items-center justify-center text-[var(--muted)] hover:text-[#ff5470] hover:bg-[rgba(255,84,112,0.1)] transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Balance de patrones (spec CHISPA-UX-002 · capa 02) */}
        {b ? (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {patterns.map((p) => {
              const covered = b.present.includes(p);
              return covered ? (
                <span
                  key={p}
                  className="flex items-center gap-1 text-[9.5px] font-bold px-2 py-1 rounded-lg border border-[rgba(52,211,153,0.45)] bg-[rgba(52,211,153,0.1)] text-[#34d399]"
                >
                  <Check size={9} /> {t(PATTERN_LABEL[p])}
                </span>
              ) : (
                <span
                  key={p}
                  className="flex items-center gap-1 text-[9.5px] font-bold px-2 py-1 rounded-lg border border-[rgba(251,191,36,0.45)] bg-[rgba(251,191,36,0.08)] text-[#fbbf24]"
                >
                  <Plus size={9} /> {t(PATTERN_LABEL[p])}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tpl.exercises.slice(0, 4).map((e, i) => (
              <span
                key={i}
                className="text-[9.5px] font-bold px-2 py-1 rounded-lg bg-white/[.05] border border-white/[.07] text-[var(--muted)] truncate max-w-[120px]"
              >
                {e.name}
              </span>
            ))}
          </div>
        )}

        {/* Métricas que informan, no moralizan */}
        <div className="flex items-center gap-2 mt-3">
          <span className="flex items-center gap-1 text-[10.5px] font-bold text-[var(--muted)] bg-white/[.05] border border-white/[.07] px-2 py-1 rounded-lg tabular-nums">
            <Zap size={10} className="text-[#4CC9F0]" /> {t('Dopamina {n}', { n: b?.dopa ?? 0 })}
          </span>
          <span className="flex items-center gap-1 text-[10.5px] font-bold text-[var(--muted)] bg-white/[.05] border border-white/[.07] px-2 py-1 rounded-lg tabular-nums">
            <Activity size={10} className="text-[#34d399]" /> {t('{n} min total', { n: b?.durationMin ?? 20 })}
          </span>
        </div>

        <div className="flex gap-2 mt-3">
          <Button
            variant="primary"
            size="sm"
            className={cn('flex-1', b?.sufficient && 'glow-pulse')}
            onClick={start}
          >
            <Play size={14} /> {t('Empezar')}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Sección Mis rutinas ───────────────────────────────────────────────────

export function MyRoutines() {
  const t = useT();
  const templates = useStore((s) => s.workoutTemplates);
  const setView = useStore((s) => s.setView);

  if (templates.length === 0) return null;

  const sorted = [...templates].sort((a, b) =>
    (b.last_used ?? b.created_at).localeCompare(a.last_used ?? a.created_at)
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      aria-label={t('Mis rutinas')}
    >
      <div className="flex items-center justify-between px-1 mb-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
          <Save size={12} className="text-[#ffb454]" /> {t('Mis rutinas')}
        </p>
        <button
          onClick={() => setView('create-workout')}
          className="text-[11px] font-bold text-[#ffb454] hover:text-[#ffc877] transition-colors"
        >
          + {t('Nueva')}
        </button>
      </div>
      <div className="space-y-3">
        {sorted.map((tpl, i) => (
          <TemplateCard key={tpl.id} tpl={tpl} index={i} />
        ))}
      </div>
    </motion.section>
  );
}
