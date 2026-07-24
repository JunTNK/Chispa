'use client';

import React from 'react';
import { create } from 'zustand';

/* ─── Toast Store ─── */

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    // Auto-remove after duration
    const duration = toast.duration ?? 3500;
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/* ─── Hook ─── */

export function useToast() {
  const addToast = useToastStore((s) => s.addToast);
  return {
    success: (message: string) => addToast({ message, type: 'success' }),
    error: (message: string) => addToast({ message, type: 'error' }),
    info: (message: string) => addToast({ message, type: 'info' }),
    warning: (message: string) => addToast({ message, type: 'warning' }),
  };
}

/* ─── Container ─── */

const TYPE_STYLES: Record<string, string> = {
  success: 'bg-[rgba(52,211,153,0.14)] border-[rgba(52,211,153,0.3)] text-[#34d399]',
  error: 'bg-[rgba(248,113,113,0.14)] border-[rgba(248,113,113,0.3)] text-[#f87171]',
  info: 'bg-[rgba(96,165,250,0.14)] border-[rgba(96,165,250,0.3)] text-[#93c5fd]',
  warning: 'bg-[rgba(251,191,36,0.14)] border-[rgba(251,191,36,0.3)] text-[#fbbf24]',
};

const TYPE_ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: 'i',
  warning: '!',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-[100] flex flex-col gap-2 px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-enter pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-2xl border backdrop-blur-xl bg-[rgba(15,20,32,0.92)] shadow-2xl ${TYPE_STYLES[toast.type] || TYPE_STYLES.info}`}
        >
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-current/[0.15] text-current">
            {TYPE_ICONS[toast.type]}
          </span>
          <span className="text-sm font-semibold leading-snug flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/[.08] transition-colors text-xs opacity-50 hover:opacity-100 shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
