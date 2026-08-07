'use client';

/**
 * Error Boundary de segmento (raíz).
 *
 * Se muestra cuando un error ocurre dentro del árbol de páginas de la app,
 * renderizando DENTRO del root layout (mantiene fuentes, estilos y shell).
 * A diferencia de global-error.tsx, aquí el store sí está disponible, así que
 * usamos useT para i18n.
 *
 * - Captura el error en Sentry (guardado: nunca rompe la página de error).
 * - Botón de reintento (reset) con fallback a recarga completa.
 * - Código de error copiable para soporte.
 *
 * El cuerpo visual compartido vive en <ErrorLayout />.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { useT } from '@/lib/i18n/use-t';
import { ErrorLayout } from '@/components/ui/error-layout';

export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  const digest = error?.digest;

  useEffect(() => {
    try {
      if (
        process.env.NEXT_PUBLIC_SENTRY_DSN &&
        typeof Sentry?.captureException === 'function'
      ) {
        Sentry.captureException(error ?? new Error('Unknown page error'), {
          tags: { digest: digest ?? 'unknown', source: 'segment-error-boundary' },
        });
      }
    } catch {
      // nunca romper la página de error
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const handleReset = () => {
    try {
      reset();
    } catch {
      window.location.reload();
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center p-6 bg-[#0a0d14]">
      <ErrorLayout
        icon="⚡"
        title={t('Algo salió mal')}
        message={t('CHISPA encontró un error inesperado. No te preocupes — tu progreso está guardado localmente en tu dispositivo.')}
        actions={[
          { label: t('Intentar de nuevo'), onClick: handleReset, variant: 'primary' },
          { label: t('Volver al inicio'), onClick: () => window.location.assign('/'), variant: 'secondary' },
          { label: t('Recargar la página'), onClick: () => window.location.reload(), variant: 'link' },
        ]}
        digest={digest}
        supportLabel={t('Si el error persiste, contacta a soporte con el código:')}
        copyLabel={t('Copiar código')}
        copiedLabel={t('¡Copiado!')}
      />
    </main>
  );
}
