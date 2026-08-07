'use client';

/**
 * Página 404 — ruta no encontrada.
 *
 * Se renderiza dentro del root layout (mantiene shell, fuentes y estilos).
 * Ofrece volver al inicio sin romper el flujo de la app.
 */
import { useT } from '@/lib/i18n/use-t';
import { ErrorLayout } from '@/components/ui/error-layout';

export default function NotFound() {
  const t = useT();

  return (
    <main className="min-h-dvh flex items-center justify-center p-6 bg-[#0a0d14]">
      <ErrorLayout
        icon="🧭"
        iconClassName="text-6xl mb-4"
        title={<>404 — {t('Página no encontrada')}</>}
        message={t('La página que buscas no existe o fue movida.')}
        actions={[
          { label: t('Volver al inicio'), onClick: () => window.location.assign('/'), variant: 'primary' },
        ]}
      />
    </main>
  );
}
