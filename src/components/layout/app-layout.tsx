'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { Header } from '@/components/layout/header';
import { NavBar } from '@/components/layout/navbar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const view = useStore((s) => s.view);
  const showNav = ['home', 'train', 'coach', 'progress', 'profile'].includes(view);
  const showHeader = ['home', 'progress', 'profile'].includes(view);

  return (
    <div className="max-w-[440px] mx-auto min-h-dvh relative bg-[#0a0d14]">
      {showHeader && <Header />}
      <main className={showNav ? 'pb-[100px]' : 'min-h-dvh'}>
        {children}
      </main>
      {showNav && <NavBar />}
    </div>
  );
}
