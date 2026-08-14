'use client';

import React, { useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Header } from '@/components/layout/header';
import { NavBar } from '@/components/layout/navbar';
import { SkipLink } from '@/components/layout/skip-link';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const view = useStore((s) => s.view);
  const showNav = ['home', 'train', 'coach', 'progress', 'jardin', 'analytics', 'pricing', 'profile', 'quest', 'dopamina', 'logros', 'sistema', 'leaderboard', 'catalog', 'journal'].includes(view);
  const showHeader = ['progress', 'profile'].includes(view);
  const mainRef = useRef<HTMLDivElement>(null);
  const prevView = useRef(view);

  // Focus management: al cambiar de vista, mueve el foco al contenido principal
  useEffect(() => {
    if (prevView.current !== view && mainRef.current) {
      mainRef.current.focus();
      // Hace scroll al inicio sin animación brusca
      mainRef.current.scrollTop = 0;
      window.scrollTo(0, 0);
    }
    prevView.current = view;
  }, [view]);

  return (
    <div className="max-w-[440px] mx-auto min-h-dvh relative bg-[#0a0d14]">
      {/* Skip-link: primer elemento focusable con Tab */}
      <SkipLink />

      {showHeader && <Header />}

      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
         className={showNav ? 'pb-[100px] pt-[env(safe-area-inset-top)] outline-none' : 'min-h-dvh outline-none'}
      >
        {children}
      </main>

      {showNav && <NavBar />}
    </div>
  );
}
