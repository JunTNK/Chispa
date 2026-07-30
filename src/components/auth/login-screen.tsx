'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { signInWithEmail, signInWithGoogle } from '@/lib/auth/supabase-auth';
import { Button } from '@/components/ui/button';

export function LoginScreen() {
  const setView = useStore((s) => s.setView);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }
    setLoading(true);
    setError('');
    const { user, error: authErr } = await signInWithEmail(email, password);
    setLoading(false);

    if (authErr) {
      if (authErr.message?.includes('Supabase')) {
        setError('Supabase no está configurado. Usa "Crear mi perfil" para modo local.');
      } else {
        setError(authErr.message);
      }
      return;
    }
    if (user) setView('home');
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error: authErr } = await signInWithGoogle();
    setLoading(false);
    if (authErr) {
      setError('Supabase no está configurado. Usa "Crear mi perfil" para modo local.');
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
        aria-label="Volver"
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
        Iniciar sesión
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-sm text-[#94a0b8] mb-8"
      >
        Accede a tu cuenta para sincronizar tu progreso.
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

      <div className="space-y-4 flex-1">
        <div>
          <label className="text-sm font-semibold text-[#94a0b8] mb-1.5 block" htmlFor="login-email">
            Correo electrónico
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="w-full h-14 rounded-2xl bg-[#151b2a] border border-white/[.07] text-white px-4 text-base outline-none focus:border-[#ffb454] transition-colors"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-[#94a0b8] mb-1.5 block" htmlFor="login-password">
            Contraseña
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
            placeholder="••••••••"
            className="w-full h-14 rounded-2xl bg-[#151b2a] border border-white/[.07] text-white px-4 text-base outline-none focus:border-[#ffb454] transition-colors"
          />
        </div>

        <Button
          variant="primary"
          size="large"
          className="w-full mt-2"
          disabled={loading}
          onClick={handleEmailLogin}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>

        <div className="flex items-center gap-3 my-4">
          <span className="flex-1 h-px bg-white/[.07]" />
          <span className="text-xs text-[#94a0b8] font-semibold">o continúa con</span>
          <span className="flex-1 h-px bg-white/[.07]" />
        </div>

        <Button
          variant="ghost"
          size="large"
          className="w-full justify-center"
          disabled={loading}
          onClick={handleGoogleLogin}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Google
        </Button>
      </div>

      <div className="text-center mt-6">
        <p className="text-sm text-[#94a0b8]">
          ¿No tienes cuenta?{' '}
          <button
            onClick={() => setView('register')}
            className="text-[#ffb454] font-semibold hover:underline"
          >
            Registrarse
          </button>
        </p>
        <p className="text-xs text-[#94a0b8] mt-4">
          O puedes{' '}
          <button onClick={() => setView('welcome')} className="text-[#ffb454] hover:underline">
            continuar sin cuenta
          </button>
        </p>
      </div>
    </motion.div>
  );
}
