'use client';

import React from 'react';

/**
 * SkipLink — Primer elemento focusable del layout.
 * Aparece al presionar Tab al cargar la página, permitiendo saltar
 * la navegación inferior e ir directo al contenido principal.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="
        fixed top-3 left-1/2 -translate-x-1/2 z-[9999]
        px-5 py-3 rounded-2xl
        bg-[#ffb454] text-[#0a0d14]
        font-semibold text-sm
        shadow-[0_8px_32px_rgba(255,180,84,0.4)]
        -translate-y-[150%] focus:translate-y-0
        transition-transform duration-300 ease-in-out
        outline-none focus-visible:ring-2 focus-visible:ring-[#ffb454] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0d14]
      "
    >
      Saltar al contenido
    </a>
  );
}
