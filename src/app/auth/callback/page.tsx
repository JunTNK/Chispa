'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/db/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'error' | 'success'>('processing');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    /**
     * Supabase redirects to /auth/callback#access_token=...&refresh_token=...
     * on successful email confirmation, or #error=...&error_code=... on failure.
     *
     * We extract tokens from the hash and use setSession() to establish the
     * authenticated session, rather than relying on getSession() which may
     * not process URL hash fragments in all Supabase client versions.
     */
    const handleCallback = async () => {
      try {
        // ── PKCE flow: Supabase newer versions use ?code= (query param) ──
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('code');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setError(exchangeError.message);
            setStatus('error');
            return;
          }
          setStatus('success');
          setTimeout(() => router.push('/'), 1500);
          return;
        }

        // ── Implicit Grant flow: tokens/error in URL hash fragment ──
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        // ── Error path ──
        if (params.has('error')) {
          const errorCode = params.get('error_code') || '';
          const errorDesc = params.get('error_description') || '';

          if (errorCode === 'otp_expired') {
            setError(
              'El enlace de verificación ha expirado. Regístrate de nuevo o inicia sesión si ya confirmaste tu correo electrónico previamente.'
            );
          } else {
            setError(errorDesc || errorCode || 'Error de autenticación.');
          }
          setStatus('error');
          return;
        }

        // ── Success path ──
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          // Properly set the session with the tokens from the hash
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setError(sessionError.message);
            setStatus('error');
            return;
          }

          setStatus('success');
          // Redirect to home after a brief delay so the user sees confirmation
          setTimeout(() => router.push('/'), 1500);
        } else if (params.has('type') && params.get('type') === 'signup') {
          // Some Supabase flows send type=signup without tokens — check session
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            setStatus('success');
            setTimeout(() => router.push('/'), 1500);
          } else {
            setError('No se pudo establecer la sesión. Intenta iniciar sesión.');
            setStatus('error');
          }
        } else {
          // No tokens and no error — the callback was opened without context
          // Check if there's already a valid session
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            setStatus('success');
            setTimeout(() => router.push('/'), 800);
          } else {
            setError(
              'No se encontró una sesión activa. Inicia sesión para continuar.'
            );
            setStatus('error');
          }
        }
      } catch (e) {
        setError((e as Error).message || 'Error inesperado.');
        setStatus('error');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#0a0d14] p-6">
      <div className="w-full max-w-sm text-center">
        {/* Logo spark */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00D4AA] to-[#7C5CFC] grid place-items-center mx-auto mb-6 shadow-lg">
          <svg viewBox="0 0 24 24" className="w-9 h-9 text-[#042019]">
            <defs>
              <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffe2ad" />
                <stop offset="1" stopColor="#ef7a3c" />
              </linearGradient>
            </defs>
            <path
              fill="url(#sparkGrad)"
              d="M12 1.5c.9 5.6 3.4 8.1 9 9-5.6.9-8.1 3.4-9 9-.9-5.6-3.4-8.1-9-9 5.6-.9 8.1-3.4 9-9Z"
            />
          </svg>
        </div>

        {status === 'processing' && (
          <>
            <div className="flex justify-center gap-1.5 mb-4">
              <span
                className="w-2.5 h-2.5 rounded-full bg-[#ffb454] animate-pulse"
                style={{ animationDelay: '0s' }}
              />
              <span
                className="w-2.5 h-2.5 rounded-full bg-[#ffb454] animate-pulse"
                style={{ animationDelay: '0.2s' }}
              />
              <span
                className="w-2.5 h-2.5 rounded-full bg-[#ffb454] animate-pulse"
                style={{ animationDelay: '0.4s' }}
              />
            </div>
            <h1 className="text-xl font-black tracking-tight mb-2">
              Verificando tu acceso
            </h1>
            <p className="text-sm text-[#94a0b8]">Un momento...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-4xl mb-3">✅</div>
            <h1 className="text-xl font-black tracking-tight mb-2">
              ¡Sesión iniciada!
            </h1>
            <p className="text-sm text-[#94a0b8]">
              Redirigiendo a la app...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-[rgba(248,113,113,0.12)] border border-[rgba(248,113,113,0.2)] grid place-items-center mx-auto mb-4">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f87171"
                strokeWidth="2"
                strokeLinecap="round"
                className="w-7 h-7"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h0" />
              </svg>
            </div>
            <h1 className="text-xl font-black tracking-tight mb-2">
              Error de autenticación
            </h1>
            <p className="text-sm text-[#94a0b8] mb-6 leading-relaxed">
              {error}
            </p>
            <div className="space-y-2.5">
              <Link
                href="/register"
                className="block w-full py-3 px-5 rounded-2xl font-semibold text-center text-sm bg-gradient-to-r from-[#f9c074] to-[#ef7a3c] text-[#2a1405]"
              >
                Intentar de nuevo
              </Link>
              <Link
                href="/login"
                className="block w-full py-3 px-5 rounded-2xl font-semibold text-center text-sm border border-white/[.12] text-[#f4efe8]"
              >
                Ir a iniciar sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
