'use client';

import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { CoachAgent } from '@/lib/ai/coach';
import { LocalLLM } from '@/lib/ai/local-llm';
import Image from 'next/image';
import { Icons } from '@/components/ui/icons';
import { WarningIcon } from '@/components/ui/icons-rpg';

type ModelStatus = 'idle' | 'downloading' | 'loading' | 'ready' | 'error' | 'unavailable';

export function CoachScreen() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const chat = useStore((s) => s.chat);
  const addChat = useStore((s) => s.addChat);
  const twin = useStore((s) => s.twin);
  const profile = useStore((s) => s.profile);
  const plan = useStore((s) => s.plan);
  const workouts = useStore((s) => s.workouts);
  const checkins = useStore((s) => s.checkins);

  const [input, setInput] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // LLM state
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadFile, setDownloadFile] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const llmRef = useRef<LocalLLM | null>(null);
  const initAttempted = useRef(false);
  const greetingAdded = useRef(false);

  // Initialize LocalLLM once
  useEffect(() => {
    const llm = LocalLLM.getInstance();
    llmRef.current = llm;

    // Subscribe to progress
    const unsub = llm.onProgress((p) => {
      switch (p.status) {
        case 'download':
          setModelStatus('downloading');
          setDownloadProgress(p.progress);
          setDownloadFile(p.file ?? null);
          break;
        case 'load':
          setModelStatus('loading');
          break;
        case 'done':
          setModelStatus('ready');
          setDownloadProgress(1);
          setDownloadFile(null);
          break;
        case 'error':
          setModelStatus('error');
          setModelError(t('Error al cargar el modelo'));
          break;
        case 'idle':
          setModelStatus('idle');
          break;
      }
    });

    if (!initAttempted.current) {
      initAttempted.current = true;
      // Start loading
      llm.load().catch((err) => {
        console.warn('LLM load failed (non-critical):', err);
        setModelStatus('unavailable');
        setModelError(err?.message ?? t('Modelo no disponible'));
      });
    }

    return () => {
      unsub();
    };
  }, [t]);

  // Create a memoized CoachAgent that rebuilds when context changes
  // LLM is accessed via singleton directly in the agent's reply() method
  const workoutsRef = useRef(workouts);
  workoutsRef.current = workouts;
  const checkinsRef = useRef(checkins);
  checkinsRef.current = checkins;

  const agent = useMemo(() => {
    if (!profile || !twin) return null;
    return new CoachAgent({ profile, twin, plan, workouts: workoutsRef.current, checkins: checkinsRef.current, lang });
  }, [profile, twin, plan, lang]);

  // Update agent's context when data changes (without recreating agent)
  useEffect(() => {
    if (agent) {
      agent.updateContext({ workouts: workoutsRef.current, checkins: checkinsRef.current });
    }
  }, [workouts, checkins, agent]);

  useEffect(() => {
    if (!greetingAdded.current && chat.length === 0 && agent) {
      greetingAdded.current = true;
      addChat({
        id: Date.now().toString(36) + '_greeting',
        user_id: '',
        role: 'assistant',
        content: agent.getGreeting(),
        timestamp: new Date().toISOString(),
      });
    }
  }, [agent, addChat, chat.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, typing]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || !agent) return;
      useStore.getState().trackDecision(3);
      addChat({
        id: Date.now().toString(36),
        user_id: '',
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toISOString(),
      });
      setInput('');
      setTyping(true);

      try {
        // Pasar historial reciente para que la IA tenga contexto conversacional
        const history = chat.slice(-6).map((m) => ({ role: m.role, content: m.content }));
        const res = await agent.reply(text, history);
        addChat({
          id: Date.now().toString(36) + 'r',
          user_id: '',
          role: 'assistant',
          content: res.text,
          timestamp: new Date().toISOString(),
        });
      } catch {
        addChat({
          id: Date.now().toString(36) + 'e',
          user_id: '',
          role: 'assistant',
          content: t('Lo siento, hubo un error. Intenta de nuevo.'),
          timestamp: new Date().toISOString(),
        });
      } finally {
        setTyping(false);
      }
    },
    [agent, addChat, t, chat]
  );

  const suggestedQs = plan && !plan.done
    ? [t('¿Por qué este plan?'), t('No tengo ganas hoy'), t('¿Cómo voy de consistencia?')]
    : [t('¿Cómo funciona CHISPA?'), t('¿Qué es mi Digital Twin?'), t('Dame un consejo')];

  const showDownloadUI = modelStatus === 'downloading' || modelStatus === 'loading';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-dvh">
      {/* Coach header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[.07]">
        <div className="relative shrink-0">
          <Image
            src="https://image.qwenlm.ai/public_source/6293bf56-c9cc-4349-841d-cdde04e9d74e/1e27c098e-3039-4f77-93e4-dff9f99b05da.png"
            alt="Coach"
            width={44}
            height={44}
            className="rounded-full object-cover"
          />
          {/* Status indicator dot */}
          <span
            role="status"
            aria-label={t('Estado del modelo: {estado}', { estado: modelStatus === 'ready' ? t('conectado') : modelStatus === 'error' || modelStatus === 'unavailable' ? t('desconectado') : t('cargando') })}
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0d14] ${
              modelStatus === 'ready'
                ? 'bg-[#34d399]'
                : modelStatus === 'error' || modelStatus === 'unavailable'
                ? 'bg-[#f87171]'
                : 'bg-[#fbbf24] animate-pulse'
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold flex items-center gap-2">
            Coach CHISPA
            {modelStatus === 'ready' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(52,211,153,0.15)] text-[#34d399] font-medium">
                IA
              </span>
            )}
            {modelStatus === 'downloading' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(251,191,36,0.15)] text-[#fbbf24] font-medium">
                DESCARGANDO
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--muted)]">{modelStatus === 'ready' ? t('IA real · respuestas naturales') : modelStatus === 'downloading' ? t('Descargando modelo de IA...') : modelStatus === 'unavailable' ? t('Usando respuestas predefinidas') : t('Se comunica · no decide')}</div>
        </div>
      </div>

      {/* Download progress bar */}
      <AnimatePresence>
        {showDownloadUI && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2.5 bg-[rgba(251,191,36,0.08)] border-b border-[rgba(251,191,36,0.15)]"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-[#fbbf24]" id="progress-label">
                {modelStatus === 'loading' ? t('Cargando modelo en memoria...') : t('Descargando IA local')}
              </span>
              <span className="text-[11px] text-[var(--muted)]">
                {modelStatus === 'loading' ? '...' : `${Math.round(downloadProgress * 100)}%`}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={t('Descarga del modelo de IA')}
              aria-valuenow={modelStatus === 'loading' ? 90 : Math.round(downloadProgress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden"
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#fbbf24] to-[#ffb454]"
                initial={{ width: 0 }}
                animate={{ width: `${modelStatus === 'loading' ? 90 : downloadProgress * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {downloadFile && (
              <div className="text-[10px] text-[var(--muted)] mt-1 truncate">
                {downloadFile.split('/').pop()}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model error banner */}
      <AnimatePresence>
        {modelStatus === 'error' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-[rgba(248,113,113,0.08)] border-b border-[rgba(248,113,113,0.15)]"
          >
            <div className="flex items-center gap-2 text-xs text-[#f87171]" role="alert">
              <WarningIcon size={16} aria-label={t('Advertencia')} />
              <span>{modelError ?? t('Error al descargar el modelo. Usando respuestas predefinidas.')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        role="log"
        aria-label={t('Mensajes del coach')}
        aria-live="polite"
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5"
      >
        {chat.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-gradient-to-r from-[#ffb454] to-[#ff7a3d] text-[#241309] self-end ml-auto rounded-br-md'
                : 'bg-[#1a2234] border border-white/[.07] self-start rounded-bl-md'
            }`}
            dangerouslySetInnerHTML={{
              __html: m.content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
            }}
          />
        ))}

        {typing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            aria-label={t('El coach está escribiendo')}
            role="status"
            className="flex items-center gap-1.5 px-4 py-3 max-w-[85%] bg-[#1a2234] border border-white/[.07] rounded-2xl rounded-bl-md"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-[#94a0b8] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-white/[.07] px-3 pt-2 pb-4 bg-[#0f1420]">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {suggestedQs.map((q, i) => (
            <motion.button
              key={i}
              onClick={() => handleSend(q)}
              className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#151b2a] border border-white/[.07] text-xs font-semibold text-[var(--muted)] whitespace-nowrap hover:bg-[rgba(255,180,84,0.12)] active:scale-95 transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
            >
              {q}
            </motion.button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            id="coach-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder={t('Escribe tu pregunta…')}
            aria-label={t('Escribe tu pregunta al coach')}
            disabled={typing}
            className="flex-1 h-12 rounded-2xl bg-[#151b2a] border border-white/[.07] text-white px-4 text-sm outline-none focus:border-[#ffb454] transition-colors disabled:opacity-50"
          />
          <motion.button
            onClick={() => handleSend(input)}
            disabled={typing || !input.trim()}
            aria-label={t('Enviar mensaje')}
            className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#ffb454] to-[#ff7a3d] flex items-center justify-center text-[#241309] active:scale-90 disabled:opacity-40 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
          >
            <Icons.Send />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
