'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useT } from '@/lib/i18n/use-t';
import { Button } from '@/components/ui/button';
import { saveCustomExercise, type CustomExercise } from '@/lib/db/custom-exercises-db';
import { X } from 'lucide-react';

const MUSCLE_OPTIONS = [
  'piernas', 'glúteos', 'pecho', 'espalda', 'hombros',
  'brazos', 'core', 'cardio',
];

const EQUIPMENT_OPTIONS = [
  'Sin equipo', 'Mancuernas', 'Barra', 'Máquina', 'Banda elástica', 'Peso corporal',
];

const DIFFICULTY_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: 'Fácil' },
  { value: 2, label: 'Media' },
  { value: 3, label: 'Difícil' },
];

const COGNITIVE_LOAD_OPTIONS: { value: 'low' | 'med' | 'high'; label: string }[] = [
  { value: 'low', label: 'Baja' },
  { value: 'med', label: 'Media' },
  { value: 'high', label: 'Alta' },
];

interface CustomExerciseFormProps {
  /** Existing exercise to edit (omit for create mode) */
  exercise?: CustomExercise;
  /** Called when form is closed (cancel or after save) */
  onClose: () => void;
  /** Called after successful save with the saved exercise */
  onSaved: (exercise: CustomExercise) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || `custom_${Date.now()}`;
}

export function CustomExerciseForm({ exercise, onClose, onSaved }: CustomExerciseFormProps) {
  const t = useT();
  const isEditing = !!exercise;

  const [name, setName] = React.useState(exercise?.name || '');
  const [muscle, setMuscle] = React.useState(exercise?.muscle || 'piernas');
  const [equipment, setEquipment] = React.useState(exercise?.equipment || 'Sin equipo');
  const [difficulty, setDifficulty] = React.useState<1 | 2 | 3>(exercise?.difficulty || 1);
  const [loadType, setLoadType] = React.useState<'reps' | 'time'>(exercise?.load_type || 'reps');
  const [cognitiveLoad, setCogLoad] = React.useState<'low' | 'med' | 'high'>(exercise?.cognitive_load || 'low');
  const [instructions, setInstructions] = React.useState(exercise?.instructions || '');
  const [benefits, setBenefits] = React.useState(exercise?.benefits || '');
  const [precautions, setPrecautions] = React.useState(exercise?.precautions || '');
  const [saving, setSaving] = React.useState(false);

  const canSave = name.trim().length >= 2;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);

    const id = exercise?.id || `custom_${slugify(name)}`;
    const entry = {
      id,
      name: name.trim(),
      muscle,
      equipment,
      difficulty,
      load_type: loadType,
      cognitive_load: cognitiveLoad,
      instructions: instructions.trim(),
      benefits: benefits.trim() || undefined,
      precautions: precautions.trim() || undefined,
      emoji: '🏋️',
      cue: instructions.trim().slice(0, 80) || name.trim(),
    };

    try {
      const saved = await saveCustomExercise(entry);
      onSaved(saved);
    } catch (err) {
      console.error('Failed to save custom exercise:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[rgba(5,8,14,0.7)] backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-md bg-[#151b2a] border border-white/[.08] rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{isEditing ? t('Editar ejercicio') : t('Nuevo ejercicio')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[.08] transition-colors">
            <X size={18} className="text-[var(--muted)]" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">{t('Nombre')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('Ej: Sentadilla con banda')}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[.05] border border-white/[.08] text-sm text-[var(--text)] placeholder:text-[var(--muted-soft)] focus:outline-none focus:border-[#ffb454]/50 transition-colors"
              autoFocus
            />
          </div>

          {/* Muscle + Equipment row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">{t('Músculo')}</label>
              <select
                value={muscle}
                onChange={(e) => setMuscle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[.05] border border-white/[.08] text-sm text-[var(--text)] focus:outline-none focus:border-[#ffb454]/50 transition-colors"
              >
                {MUSCLE_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">{t('Equipo')}</label>
              <select
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[.05] border border-white/[.08] text-sm text-[var(--text)] focus:outline-none focus:border-[#ffb454]/50 transition-colors"
              >
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Difficulty + Load type row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">{t('Dificultad')}</label>
              <div className="flex gap-1.5">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDifficulty(d.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      difficulty === d.value
                        ? 'bg-[rgba(255,180,84,0.12)] border-[#ffb454]/40 text-[#ffb454]'
                        : 'bg-white/[.03] border-white/[.07] text-[var(--muted)]'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">{t('Tipo')}</label>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setLoadType('reps')}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    loadType === 'reps'
                      ? 'bg-[rgba(255,180,84,0.12)] border-[#ffb454]/40 text-[#ffb454]'
                      : 'bg-white/[.03] border-white/[.07] text-[var(--muted)]'
                  }`}
                >
                  {t('Reps')}
                </button>
                <button
                  onClick={() => setLoadType('time')}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    loadType === 'time'
                      ? 'bg-[rgba(255,180,84,0.12)] border-[#ffb454]/40 text-[#ffb454]'
                      : 'bg-white/[.03] border-white/[.07] text-[var(--muted)]'
                  }`}
                >
                  {t('Tiempo')}
                </button>
              </div>
            </div>
          </div>

          {/* Cognitive load */}
          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">{t('Carga cognitiva')}</label>
            <div className="flex gap-1.5">
              {COGNITIVE_LOAD_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCogLoad(c.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    cognitiveLoad === c.value
                      ? 'bg-[rgba(255,180,84,0.12)] border-[#ffb454]/40 text-[#ffb454]'
                      : 'bg-white/[.03] border-white/[.07] text-[var(--muted)]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">{t('Instrucciones')}</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={t('Describe cómo se hace...')}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[.05] border border-white/[.08] text-sm text-[var(--text)] placeholder:text-[var(--muted-soft)] focus:outline-none focus:border-[#ffb454]/50 transition-colors resize-none"
            />
          </div>

          {/* Benefits */}
          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">{t('Para qué sirve')}</label>
            <input
              type="text"
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
              placeholder={t('Ej: Fortalece piernas y mejora equilibrio')}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[.05] border border-white/[.08] text-sm text-[var(--text)] placeholder:text-[var(--muted-soft)] focus:outline-none focus:border-[#ffb454]/50 transition-colors"
            />
          </div>

          {/* Precautions */}
          <div>
            <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">{t('Precauciones')}</label>
            <input
              type="text"
              value={precautions}
              onChange={(e) => setPrecautions(e.target.value)}
              placeholder={t('Ej: Evitar si hay dolor lumbar')}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[.05] border border-white/[.08] text-sm text-[var(--text)] placeholder:text-[var(--muted-soft)] focus:outline-none focus:border-[#ffb454]/50 transition-colors"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            {t('Cancelar')}
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleSave}
            disabled={!canSave || saving}
          >
            {saving ? '...' : isEditing ? t('Guardar cambios') : t('Crear ejercicio')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
