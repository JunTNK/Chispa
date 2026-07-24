'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { updateTwin } from '@/lib/agents/decision-engine';
import { uid, todayKey } from '@/lib/utils/helpers';

export function SummaryScreen() {
  const setView = useStore((s) => s.setView);
  const plan = useStore((s) => s.plan);
  const setPlan = useStore((s) => s.setPlan);
  const addWorkout = useStore((s) => s.addWorkout);
  const setTwin = useStore((s) => s.setTwin);
  const twin = useStore((s) => s.twin);
  const logEvent = useStore((s) => s.logEvent);
  const profile = useStore((s) => s.profile);

  const [rpe, setRpe] = React.useState<string | null>(null);
  const [motiv, setMotiv] = React.useState<string | null>(null);

  const result = plan?.result;
  if (!result) return null;

  const handleSave = () => {
    if (!result || !profile || !twin) return;

    const w = {
      id: uid(),
      user_id: '',
      date: todayKey(),
      focus: plan?.workout?.focus || 'full',
      intensity: plan?.intensity || 'standard',
      duration: plan?.workout?.duration || result.minutes,
      score: Math.round(result.rate * 100),
      completed_rate: result.rate,
      exercises: result.exs || [],
      actual_minutes: result.minutes,
      rpe: (rpe as any) || 'justo',
    };

    addWorkout(w as any);

    const updated = updateTwin(twin, { ...w, completed_rate: result.rate });
    setTwin(updated);

    logEvent(result.rate >= 0.8 ? 'workout_completed' : 'workout_partial', {
      rate: result.rate,
      minutes: result.minutes,
    });

    if (motiv) {
      setTwin({ ...updated, motivation_style: motiv as any });
      logEvent('motivation_learned', { style: motiv });
    }

    setPlan({ ...plan, done: true, result: { ...result, rpe, motiv } });
    setView('home');
  };

  const title = result.rate >= 0.8 ? '¡Hecho! ⚡' : result.rate >= 0.4 ? 'Buen movimiento 💪' : 'Guardamos lo de hoy 🌱';
  const sub = result.rate >= 0.8
    ? 'Sesión completa. El motor ya está aprendiendo de ti.'
    : result.rate >= 0.4
      ? 'Más de la mitad hecho. Eso cuenta, y mucho.'
      : 'Empezar ya es ganar. El motor lo ha registrado.';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-dvh overflow-y-auto">
      <div className="px-4 py-8 space-y-4">
        <h2 className="text-3xl font-black tracking-tight text-center mb-1">{title}</h2>
        <p className="text-sm text-[#94a0b8] text-center">{sub}</p>

        <div className="grid grid-cols-3 gap-2.5">
          <Card className="text-center py-4 px-2">
            <span className="text-2xl font-black block">{result.minutes}</span>
            <span className="text-xs text-[#94a0b8]">minutos</span>
          </Card>
          <Card className="text-center py-4 px-2">
            <span className="text-2xl font-black block">{result.doneEx}/{result.totalEx}</span>
            <span className="text-xs text-[#94a0b8]">ejercicios</span>
          </Card>
          <Card className="text-center py-4 px-2">
            <span className="text-2xl font-black block">{Math.round(result.rate * 100)}%</span>
            <span className="text-xs text-[#94a0b8]">completado</span>
          </Card>
        </div>

        {result.adapted && (
          <div className="bg-[rgba(96,165,250,0.1)] border border-[rgba(96,165,250,0.25)] text-[#bfdbfe] rounded-2xl px-4 py-3 text-sm text-center">
            🔧 El motor redujo la intensidad durante la sesión. Adaptarse no es fallar.
          </div>
        )}

        <Card>
          <span className="font-bold text-sm flex items-center gap-2 mb-3">¿Cómo de exigente fue?</span>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { val: 'suave', emoji: '😊', label: 'Suave', desc: 'Podría más' },
              { val: 'justo', emoji: '😮‍💨', label: 'Justo', desc: 'Al punto' },
              { val: 'duro', emoji: '🥵', label: 'Duro', desc: 'Me costó' },
            ].map((o) => (
              <button
                key={o.val}
                onClick={() => setRpe(o.val)}
                className={`flex flex-col items-center gap-1 min-h-[64px] rounded-2xl border-2 p-2 text-center transition-all ${
                  rpe === o.val
                    ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                    : 'border-white/[.07] bg-[#151b2a]'
                }`}
              >
                <span className="font-semibold text-sm">{o.emoji} {o.label}</span>
                <span className="text-[11px] text-[#94a0b8]">{o.desc}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <span className="font-bold text-sm">¿Qué mensaje te motiva más?</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/[.07] text-[10px] font-bold text-[#94a0b8]">
              el motor aprende
            </span>
          </div>
          <div className="space-y-2">
            {[
              { val: 'data', text: '📊 Recuperación 78%. Consistencia 69%. Los datos dicen que puedes.' },
              { val: 'energy', text: '🔥 La chispa se enciende moviéndote. ¡A por hoy!' },
              { val: 'calm', text: '🌊 Sin prisa. A tu ritmo. Un paso cada vez.' },
            ].map((o) => (
              <button
                key={o.val}
                onClick={() => setMotiv(o.val)}
                className={`w-full text-left rounded-2xl border-2 p-3 text-sm leading-relaxed transition-all ${
                  motiv === o.val
                    ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                    : 'border-white/[.07] bg-[#1a2234]'
                }`}
              >
                {o.text}
              </button>
            ))}
          </div>
        </Card>

        <Button variant="primary" size="large" className="w-full" onClick={handleSave}>
          <Icons.Check /> Guardar entrenamiento
        </Button>
      </div>
    </motion.div>
  );
}
