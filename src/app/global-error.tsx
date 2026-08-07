'use client';

/**
 * Global Error Boundary — última línea de defensa.
 *
 * Next.js renderiza este componente en lugar del root layout cuando un error
 * escapa a todos los demás boundaries (error.tsx, etc.). Por eso DEBE ser
 * autosuficiente:
 *
 *   • NO depende del store de Zustand (el store puede ser la causa del crash).
 *   • NO usa useT — los strings ES son la fuente canónica (claves de
 *     enErrors) y el EN se deriva de enErrors, un módulo de datos puro SIN
 *     imports ni dependencias: importarlo es crash-proof aunque el store
 *     esté roto.
 *   • Solo usa <ErrorLayout />, un componente presentacional sin store ni
 *     Sentry, y HTML + Tailwind.
 *   • Importa globals.css directamente (el layout no se monta aquí).
 *   • Sentry se captura de forma guardada: un fallo de Sentry nunca rompe la
 *     página de error.
 *   • Escucha window 'error' / 'unhandledrejection' para capturar errores en
 *     cascada mientras la página de error está visible.
 *
 * El cuerpo visual compartido vive en <ErrorLayout /> (presentacional puro).
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
import * as Sentry from '@sentry/nextjs';
import { useEffect, useState } from 'react';
import { ErrorLayout } from '@/components/ui/error-layout';
import { enErrors } from '@/lib/i18n/translations/errors';
import './globals.css';

type Lang = 'es' | 'en';

/**
 * Strings ES — fuente canónica: son las claves de enErrors.
 * El EN se deriva de ahí (ver EN abajo), así que los textos EN viven solo en
 * errors.ts y no se duplican aquí.
 */
const ES = {
  title: 'Algo salió mal',
  body: 'CHISPA encontró un error inesperado. No te preocupes — tu progreso está guardado localmente en tu dispositivo.',
  retry: 'Intentar de nuevo',
  home: 'Volver al inicio',
  reload: 'Recargar la página',
  copy: 'Copiar código',
  copied: '¡Copiado!',
  support: 'Si el error persiste, contacta a soporte con el código:',
} as const;

type CopyKey = keyof typeof ES;

/**
 * EN derivado de enErrors (módulo de datos puro, sin store/useT) usando los
 * strings ES como claves. Fallback al ES si una clave faltara: global-error
 * jamás muestra texto vacío. Importar errors.ts es crash-proof porque no
 * importa nada — solo constantes estáticas.
 */
const EN = Object.fromEntries(
  (Object.keys(ES) as CopyKey[]).map((k) => [k, enErrors[ES[k]] ?? ES[k]])
) as Record<CopyKey, string>;

/** Diccionario ES/EN — sin depender del store. */
const COPY: Record<Lang, Record<CopyKey, string>> = { es: ES, en: EN };

/** Lee el idioma de forma segura (el store puede estar roto). */
function detectLang(): Lang {
  try {
    const raw = window.localStorage.getItem('chispa_store');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { lang?: Lang } };
      if (parsed?.state?.lang === 'en') return 'en';
    }
  } catch {
    // localStorage corrupto o bloqueado — seguimos con el valor por defecto
  }
  return document.documentElement.lang === 'en' ? 'en' : 'es';
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [lang, setLang] = useState<Lang>('es');
  const text = COPY[lang];
  const digest = error?.digest;

  // Idioma seguro + título del documento
  useEffect(() => {
    const detected = detectLang();
    setLang(detected);
    document.title = `${COPY[detected].title} — CHISPA`;
  }, []);

  // Sentry — guardado: un fallo aquí nunca debe romper la página de error
  useEffect(() => {
    try {
      if (
        process.env.NEXT_PUBLIC_SENTRY_DSN &&
        typeof Sentry?.captureException === 'function'
      ) {
        Sentry.captureException(error ?? new Error('Unknown global error'), {
          tags: { digest: digest ?? 'unknown', source: 'global-error-boundary' },
        });
      }
    } catch {
      // nunca romper la página de error
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // Captura errores en cascada (window.onerror / unhandledrejection) mientras
  // la página de error está visible — para diagnóstico en Sentry.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    const onError = (e: ErrorEvent) => {
      try {
        Sentry.captureException(e.error ?? new Error(e.message), {
          tags: { source: 'global-error-window' },
        });
      } catch {
        // noop
      }
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      try {
        Sentry.captureException(
          e.reason instanceof Error ? e.reason : new Error(String(e.reason)),
          { tags: { source: 'global-error-unhandledrejection' } }
        );
      } catch {
        // noop
      }
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  const handleReset = () => {
    try {
      reset();
    } catch {
      window.location.reload();
    }
  };

  return (
    <html lang={lang}>
      <body className="min-h-dvh bg-[#0a0d14] text-[var(--text)] flex items-center justify-center p-6 font-sans">
        <ErrorLayout
          icon="⚡"
          title={text.title}
          message={text.body}
          actions={[
            { label: text.retry, onClick: handleReset, variant: 'primary' },
            { label: text.home, onClick: () => window.location.assign('/'), variant: 'secondary' },
            { label: text.reload, onClick: () => window.location.reload(), variant: 'link' },
          ]}
          digest={digest}
          supportLabel={text.support}
          copyLabel={text.copy}
          copiedLabel={text.copied}
        />
      </body>
    </html>
  );
}
