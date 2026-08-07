'use client';

/**
 * Ruta demo de errores — usada por el e2e e2e/error-pages.spec.ts.
 *
 * SOLO lanza un error durante el render cuando la URL incluye `?throw=1`.
 * Sin el parámetro renderiza una pantalla inofensiva, por lo que producción
 * nunca se ve afectada si alguien visita /error-demo por accidente.
 *
 * Patrón: primer render seguro (SSR/hidratación OK); useEffect lee el query
 * param y fuerza un estado que hace lanzar el siguiente render → error.tsx.
 */
import { useEffect, useState } from 'react';

export default function ErrorDemoPage() {
  const [boom, setBoom] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('throw=1')) {
      setBoom(true);
    }
  }, []);

  if (boom) {
    throw new Error('Error simulado para e2e de error.tsx');
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6 bg-[#0a0d14]">
      <div className="w-full max-w-[440px] mx-auto text-center">
        <div className="text-5xl mb-4" aria-hidden="true">⚡</div>
        <h1 className="text-2xl font-bold mb-2 gradient-text-accent">Ruta demo de error</h1>
        <p className="text-[var(--muted)] text-sm leading-relaxed">
          Añade <code className="text-[#ef8a23]">?throw=1</code> a la URL para disparar
          el boundary de error (error.tsx).
        </p>
      </div>
    </main>
  );
}
