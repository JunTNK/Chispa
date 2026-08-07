'use client';

/**
 * Loading — pantalla de carga del App Router.
 *
 * Se muestra mientras Next.js resuelve el contenido de un segmento
 * (streaming/Suspense). Comparte el lenguaje visual de las páginas de error
 * (error.tsx / not-found.tsx): fondo oscuro, contenido centrado en columna
 * móvil, acento naranja y respeto por prefers-reduced-motion (globals.css ya
 * desactiva float/spin en ese caso).
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
 */
import { useT } from '@/lib/i18n/use-t';

export default function Loading() {
  const t = useT();

  return (
    <main className="min-h-dvh flex items-center justify-center p-6 bg-[#0a0d14]">
      <div
        className="w-full max-w-[440px] mx-auto text-center animate-in"
        role="status"
        aria-live="polite"
        aria-label={t('Cargando...')}
      >
        <div className="text-5xl mb-4 float" aria-hidden="true">⚡</div>
        <h1 className="text-2xl font-bold mb-2 gradient-text-accent">
          {t('Cargando...')}
        </h1>
        <p className="text-[var(--muted)] mb-8 text-sm leading-relaxed">
          {t('Un momento...')}
        </p>
        <div className="flex justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#ffb454] border-t-transparent animate-spin" />
        </div>
      </div>
    </main>
  );
}
