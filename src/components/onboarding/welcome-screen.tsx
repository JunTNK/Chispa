'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

export function WelcomeScreen() {
  const setView = useStore((s) => s.setView);
  const logEvent = useStore((s) => s.logEvent);
  const _importDemo = useStore((s) => s.addWorkout);

  const handleDemo = () => {
    const today = new Date().toISOString().slice(0, 10);
    const demoWorkouts = [
      { id: 'd1', user_id: '', date: new Date(Date.now() - 86400000 * 1).toISOString().slice(0, 10), duration: 19, focus: 'upper' as const, intensity: 'standard' as const, score: 85, completed_rate: 1, exercises: [], actual_minutes: 19, rpe: 'justo' as const },
      { id: 'd2', user_id: '', date: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10), duration: 21, focus: 'lower' as const, intensity: 'standard' as const, score: 80, completed_rate: 0.85, exercises: [], actual_minutes: 21, rpe: 'justo' as const },
      { id: 'd3', user_id: '', date: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10), duration: 18, focus: 'full' as const, intensity: 'standard' as const, score: 90, completed_rate: 1, exercises: [], actual_minutes: 18, rpe: 'suave' as const },
      { id: 'd4', user_id: '', date: new Date(Date.now() - 86400000 * 8).toISOString().slice(0, 10), duration: 16, focus: 'core' as const, intensity: 'light' as const, score: 65, completed_rate: 0.7, exercises: [], actual_minutes: 16, rpe: 'duro' as const },
      { id: 'd5', user_id: '', date: new Date(Date.now() - 86400000 * 10).toISOString().slice(0, 10), duration: 22, focus: 'upper' as const, intensity: 'standard' as const, score: 88, completed_rate: 1, exercises: [], actual_minutes: 22, rpe: 'justo' as const },
    ];
    demoWorkouts.forEach((w) => _importDemo(w as any));
    logEvent('twin_created', {});
    setView('home');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-dvh flex flex-col items-center justify-center px-6 py-10 text-center"
    >
      <motion.img
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        src="https://image.qwenlm.ai/public_source/6293bf56-c9cc-4349-841d-cdde04e9d74e/1a3cf945c-2608-437e-a635-b2a29db621a7.png"
        alt="CHISPA"
        className="w-full max-w-[320px] rounded-2xl mb-5 opacity-95"
      />

      <motion.img
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
        src="https://image.qwenlm.ai/public_source/6293bf56-c9cc-4349-841d-cdde04e9d74e/1d08f0a58-ea85-4e8b-b799-e65c81f037a6.png"
        alt="logo"
        className="w-20 h-20 rounded-2xl object-cover shadow-[0_14px_44px_rgba(255,122,61,0.35)] mb-1"
      />

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-5xl font-black tracking-tight bg-gradient-to-r from-[#ffb454] to-[#ff7a3d] bg-clip-text text-transparent mb-2"
      >
        CHISPA
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-lg font-medium mb-2"
      >
        La IA que se adapta a tu cerebro.
      </motion.p>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-sm text-[#94a0b8] leading-relaxed max-w-[300px] mb-8"
      >
        Entrenamiento adaptativo para TDAH y neurodivergencias. Menos decisiones. Más movimiento. Cero culpa.
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-[320px] flex flex-col gap-3"
      >
        <Button
          variant="primary"
          size="large"
          className="w-full"
          onClick={() => {
            logEvent('onboarding_start', {});
            setView('onboarding');
          }}
        >
          Crear mi perfil
        </Button>

        <Button
          variant="ghost"
          className="w-full"
          onClick={handleDemo}
        >
          Probar con datos de ejemplo
        </Button>

        <div className="flex items-center gap-3 my-1">
          <span className="flex-1 h-px bg-white/[.07]" />
          <span className="text-xs text-[#94a0b8]">o</span>
          <span className="flex-1 h-px bg-white/[.07]" />
        </div>

        <Button
          variant="minimal"
          className="w-full"
          onClick={() => setView('login')}
        >
          Iniciar sesión
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-xs text-[#94a0b8] leading-relaxed mt-6 opacity-80"
      >
        80% algoritmos · 15% modelos · 5% LLM<br />
        Tus datos viven en tu dispositivo
      </motion.p>
    </motion.div>
  );
}
