'use client';

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { cn } from '@/lib/utils/helpers';
import { Button } from '@/components/ui/button';
import type { CommunityPost } from '@/types';

/* Focus del workout → etiqueta traducible (las claves ya existen en common/training2) */
const FOCUS_LABEL: Record<string, string> = {
  full: 'Todo el cuerpo',
  upper: 'Tren superior',
  lower: 'Tren inferior',
  core: 'Core y cardio',
};

function timeAgo(iso: string, t: (s: string, v?: Record<string, string | number>) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.max(1, Math.floor(diff / 60000));
  if (min < 60) return t('hace {m} min', { m: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t('hace {h} h', { h });
  return t('hace {d} d', { d: Math.floor(h / 24) });
}

/* ───────────── Post card ───────────── */

function PostCard({ post, isMe }: { post: CommunityPost; isMe: boolean }) {
  const t = useT();
  const reactToPost = useStore((s) => s.reactToPost);
  const friends = useStore((s) => s.friends);

  const name = useMemo(() => {
    if (isMe) return t('Tu chispa');
    const friend = friends.find((f) => f.id === post.author_id);
    return friend?.name ?? t('Alguien de la comunidad');
  }, [isMe, post.author_id, friends, t]);

  const focus = post.focus ? t(FOCUS_LABEL[post.focus] ?? post.focus) : null;

  let message: string;
  if (post.kind === 'workout') {
    message = isMe
      ? t('Completé un entrenamiento de {focus}', { focus: focus ?? t('movimiento') })
      : t('{name} completó un entrenamiento de {focus}', { name, focus: focus ?? t('movimiento') });
  } else {
    message = isMe ? t('Registré movimiento rápido') : t('{name} registró movimiento rápido', { name });
  }

  const duration = post.durationMin ? ` · ${t('{n} min', { n: post.durationMin })}` : '';

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className={cn(
            'w-10 h-10 rounded-full grid place-items-center text-lg shrink-0 border',
            isMe
              ? 'bg-[rgba(247,182,95,0.14)] border-[rgba(247,182,95,0.35)]'
              : 'bg-[var(--card2)] border-[var(--line)]'
          )}
        >
          {post.kind === 'workout' ? '💪' : '⚡'}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--text)] leading-snug">
            {message}
            {duration}
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">
            {name} · {timeAgo(post.created_at, t)}
          </p>
        </div>

        <button
          onClick={() => reactToPost(post.id)}
          aria-label={post.myReacted ? t('Quitar aplauso') : t('Aplaudir esta chispa')}
          aria-pressed={post.myReacted}
          className={cn(
            'flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer',
            post.myReacted
              ? 'text-[#f7b65f] bg-[rgba(247,182,95,0.12)] border-[rgba(247,182,95,0.35)]'
              : 'text-[var(--muted)] border-transparent hover:bg-[var(--card2)]'
          )}
        >
          <span className="text-lg leading-none" aria-hidden>
            {post.myReacted ? '💛' : '🤍'}
          </span>
          <span className="text-[11px] font-bold tabular-nums">{post.reactions}</span>
        </button>
      </div>
    </motion.article>
  );
}

/* ───────────── Main screen ───────────── */

export function ComunidadScreen() {
  const t = useT();
  const coopMode = useStore((s) => s.coopMode);
  const posts = useStore((s) => s.communityPosts);
  const setView = useStore((s) => s.setView);

  const sorted = useMemo(
    () => [...posts].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [posts]
  );

  return (
    <div className="min-h-dvh px-5 pt-6 pb-28">
      <header className="mb-5">
        <h1 className="text-2xl font-black tracking-tight">{t('Comunidad')}</h1>
        <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">
          {t('Chispas de tu red. Aquí nadie compite: solo aplausos.')}
        </p>
      </header>

      {coopMode === 'none' ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-8 flex flex-col items-center gap-4 text-center">
          <span className="text-4xl" aria-hidden>🤝</span>
          <p className="text-sm text-[var(--muted)] leading-relaxed max-w-[30ch]">
            {t('Activa el modo cooperativo para compartir tus chispas')}
          </p>
          <Button variant="secondary" size="sm" onClick={() => setView('profile')}>
            {t('Ir a Perfil')}
          </Button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-8 flex flex-col items-center gap-3 text-center">
          <span className="text-4xl" aria-hidden>✨</span>
          <p className="text-sm text-[var(--muted)] leading-relaxed max-w-[32ch]">
            {t('Tu primera chispa aparecerá al completar un entrenamiento')}
          </p>
          <p className="text-xs text-[var(--muted-soft)] max-w-[34ch]">
            {t('En modo público también verás chispas de la comunidad.')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((p) => (
            <PostCard key={p.id} post={p} isMe={p.author_id === ''} />
          ))}
        </div>
      )}
    </div>
  );
}
