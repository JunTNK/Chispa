'use client';

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { CoachAgent } from '@/lib/ai/coach';
import { Icons } from '@/components/ui/icons';

export function CoachScreen() {
  const chat = useStore((s) => s.chat);
  const addChat = useStore((s) => s.addChat);
  const twin = useStore((s) => s.twin);
  const profile = useStore((s) => s.profile);
  const plan = useStore((s) => s.plan);
  const workouts = useStore((s) => s.workouts);

  const [input, setInput] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Create a memoized CoachAgent that rebuilds when context changes
  const agent = useMemo(() => {
    if (!profile || !twin) return null;
    return new CoachAgent({ profile, twin, plan, workouts });
  }, [profile, twin, plan, workouts]);

  useEffect(() => {
    if (chat.length === 0 && agent) {
      addChat({ id: 'g', user_id: '', role: 'assistant', content: agent.getGreeting(), timestamp: new Date().toISOString() });
    }
  }, [agent]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, typing]);

  const handleSend = useCallback((text: string) => {
    if (!text.trim() || !agent) return;
    addChat({ id: Date.now().toString(36), user_id: '', role: 'user', content: text.trim(), timestamp: new Date().toISOString() });
    setInput('');
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      const res = agent.reply(text);
      addChat({ id: Date.now().toString(36) + 'r', user_id: '', role: 'assistant', content: res.text, timestamp: new Date().toISOString() });
    }, 800);
  }, [agent, addChat]);

  const suggestedQs = plan && !plan.done
    ? ['¿Por qué este plan?', 'No tengo ganas hoy', '¿Cómo voy de consistencia?']
    : ['¿Cómo funciona CHISPA?', '¿Qué es mi Digital Twin?', 'Dame un consejo'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-dvh">
      {/* Coach header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[.07]">
        <img
          src="https://image.qwenlm.ai/public_source/6293bf56-c9cc-4349-841d-cdde04e9d74e/1e27c098e-3039-4f77-93e4-dff9f99b05da.png"
          alt="Coach"
          className="w-11 h-11 rounded-full object-cover"
        />
        <div>
          <div className="font-bold">Coach CHISPA</div>
          <div className="text-xs text-[#94a0b8]">Se comunica · no decide</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {chat.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed animate-in ${
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
          <div className="flex items-center gap-1.5 px-4 py-3 max-w-[85%] bg-[#1a2234] border border-white/[.07] rounded-2xl rounded-bl-md">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-[#94a0b8] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-white/[.07] px-3 pt-2 pb-4 bg-[#0f1420]">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {suggestedQs.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#151b2a] border border-white/[.07] text-xs font-semibold text-[#94a0b8] whitespace-nowrap hover:bg-[rgba(255,180,84,0.12)] active:scale-95"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder="Escribe tu pregunta…"
            className="flex-1 h-12 rounded-2xl bg-[#151b2a] border border-white/[.07] text-white px-4 text-sm outline-none focus:border-[#ffb454] transition-colors"
          />
          <button
            onClick={() => handleSend(input)}
            className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#ffb454] to-[#ff7a3d] flex items-center justify-center text-[#241309] active:scale-90"
          >
            <Icons.Send />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
