'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { signUpWithEmail } from '@/lib/auth/supabase-auth';
import { Button } from '@/components/ui/button';

export function RegisterScreen() {
  const t = useT();
  const setView = useStore((s) => s.setView);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t('Completa todos los campos'));
      return;
    }
    if (password.length < 6) {
      setError(t('La contraseña debe tener al menos 6 caracteres'));
      return;
    }
    if (password !== confirm) {
      setError(t('Las contraseñas no coinciden'));
      return;
    }
    setLoading(true);
    setError('');
    const { user, error: authErr } = await signUpWithEmail(email, password);
    setLoading(false);

    if (authErr) {
      if (authErr.message?.includes('Supabase')) {
        setError(t('Supabase no está configurado. Usa "Crear mi perfil" para modo local.'));
      } else {
        setError(authErr.message);
      }
      return;
    }
    if (user) {
      setSuccess(t('Cuenta creada. Revisa tu correo para confirmar.'));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-dvh flex flex-col px-6 py-10"
    >
      {/* Back button */}
      <button
        onClick={() => setView('welcome')}
        aria-label={t('Volver')}
        className="self-start w-11 h-11 rounded-2xl border border-white/[.07] bg-[#151b2a] flex items-center justify-center text-white mb-8"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 5l-7 7 7 7"/></svg>
      </button>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-3xl font-black tracking-tight mb-2"
      >
        {t('Crear cuenta')}
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-sm text-[var(--muted)] mb-8"
      >
        {t('Registra tu cuenta para sincronizar tu progreso entre dispositivos.')}
      </motion.p>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)] text-[#f87171] rounded-2xl px-4 py-3 text-sm mb-4"
        >
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.3)] text-[#34d399] rounded-2xl px-4 py-3 text-sm mb-4"
        >
          {success}
        </motion.div>
      )}

      <div className="space-y-4 flex-1">
        <div>
          <label className="text-sm font-semibold text-[var(--muted)] mb-1.5 block" htmlFor="reg-email">
            {t('Correo electrónico')}
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="w-full h-14 rounded-2xl bg-[#151b2a] border border-white/[.07] text-white px-4 text-base outline-none focus:border-[#ffb454] transition-colors"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-[var(--muted)] mb-1.5 block" htmlFor="reg-password">
            {t('Contraseña')}
          </label>
          <input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('Mínimo 6 caracteres')}
            className="w-full h-14 rounded-2xl bg-[#151b2a] border border-white/[.07] text-white px-4 text-base outline-none focus:border-[#ffb454] transition-colors"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-[var(--muted)] mb-1.5 block" htmlFor="reg-confirm">
            {t('Confirmar contraseña')}
          </label>
          <input
            id="reg-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
            placeholder={t('Repite la contraseña')}
            className="w-full h-14 rounded-2xl bg-[#151b2a] border border-white/[.07] text-white px-4 text-base outline-none focus:border-[#ffb454] transition-colors"
          />
        </div>

        <Button
          variant="primary"
          size="large"
          className="w-full mt-2"
          disabled={loading || !!success}
          onClick={handleRegister}
        >
          {loading ? t('Creando cuenta...') : t('Crear cuenta')}
        </Button>
      </div>

      <div className="text-center mt-6">
        <p className="text-sm text-[var(--muted)]">
          {t('¿Ya tienes cuenta?')}{' '}
          <button
            onClick={() => setView('login')}
            className="text-[#ffb454] font-semibold hover:underline"
          >
            {t('Iniciar sesión')}
          </button>
        </p>
        <p className="text-xs text-[var(--muted)] mt-4">
          {t('O')}{' '}
          <button onClick={() => setView('welcome')} className="text-[#ffb454] hover:underline">
            {t('continúa sin cuenta')}
          </button>
        </p>
      </div>
    </motion.div>
  );
}
