'use client';

/**
 * ErrorLayout — cuerpo compartido de las páginas de error.
 *
 * Encapsula el patrón visual común a global-error.tsx, error.tsx y
 * not-found.tsx: icono, título, mensaje, acciones (primaria / secundaria /
 * enlace) y el bloque de código de error copiable.
 *
 * Es un componente PRESENTACIONAL puro: no toca el store, no usa useT ni
 * Sentry. Las páginas le pasan los textos ya traducidos. Esto permite que
 * global-error.tsx (que debe ser a prueba de crashes) lo reutilice sin
 * depender de Zustand.
 */
import { useState, type ReactNode } from 'react';
import { copyText } from '@/lib/utils/helpers';

export type ErrorActionVariant = 'primary' | 'secondary' | 'link';

export interface ErrorAction {
  label: string;
  onClick: () => void;
  variant?: ErrorActionVariant;
}

export interface ErrorLayoutProps {
  icon?: ReactNode;
  /** Clases del contenedor del icono (por defecto: text-5xl mb-4) */
  iconClassName?: string;
  title: ReactNode;
  message: ReactNode;
  actions: ErrorAction[];
  /** Código de error (digest) — si existe, muestra el bloque de soporte con botón copiar */
  digest?: string;
  supportLabel?: string;
  copyLabel?: string;
  copiedLabel?: string;
}

const ACTION_CLASSES: Record<ErrorActionVariant, string> = {
  primary:
    'h-14 w-full rounded-xl bg-gradient-to-r from-[#ffb454] to-[#ff7a3d] text-[#241309] font-bold text-sm transition hover:brightness-110 active:scale-[0.97] shadow-[0_8px_24px_rgba(255,122,61,0.28)]',
  secondary:
    'h-14 w-full rounded-xl bg-[#1e2530] text-[var(--text)] font-semibold text-sm transition hover:bg-[#2a3342] active:scale-[0.97]',
  link: 'h-11 w-full rounded-xl bg-transparent text-[var(--muted)] font-semibold text-xs underline underline-offset-4 transition hover:text-[var(--text)]',
};

export function ErrorLayout({
  icon = '⚡',
  iconClassName = 'text-5xl mb-4',
  title,
  message,
  actions,
  digest,
  supportLabel,
  copyLabel = 'Copiar código',
  copiedLabel = '¡Copiado!',
}: ErrorLayoutProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!digest) return;
    const ok = await copyText(digest);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-[440px] mx-auto text-center animate-in">
      <div className={iconClassName} aria-hidden="true">
        {icon}
      </div>
      <h1 className="text-2xl font-bold mb-2 gradient-text-accent">{title}</h1>
      <p className="text-[var(--muted)] mb-8 text-sm leading-relaxed">{message}</p>

      <div className="flex flex-col gap-3">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className={ACTION_CLASSES[action.variant ?? 'secondary']}
          >
            {action.label}
          </button>
        ))}
      </div>

      {digest && supportLabel && (
        <p className="mt-8 text-xs text-[#5d646d]">
          {supportLabel}{' '}
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 font-mono text-[#ef8a23] hover:text-[#ff9c38] transition-colors"
          >
            {digest}
            <span className="font-sans text-[#5d646d] normal-case">
              {copied ? copiedLabel : copyLabel}
            </span>
          </button>
        </p>
      )}
    </div>
  );
}
