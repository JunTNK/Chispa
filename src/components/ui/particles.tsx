'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

/* ─── Types ─── */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'confetti' | 'star';
  gravity: number;
  drag: number;
}

export interface ConfettiOptions {
  /** Total number of particles (default: 80) */
  particleCount?: number;
  /** Spread angle in degrees (default: 120) */
  spread?: number;
  /** Initial velocity in px/s (default: 28) */
  startVelocity?: number;
  /** Custom colors (default: warm RPG palette) */
  colors?: string[];
  /** Duration of the animation in ms (default: 3000) */
  duration?: number;
  /** Particle shapes (default: ['confetti', 'star']) */
  shapes?: ('confetti' | 'star')[];
  /** Origin x position as fraction 0-1 (default: 0.5) */
  originX?: number;
  /** Origin y position as fraction 0-1 (default: 0.3) */
  originY?: number;
}

/* ─── Defaults ─── */

const DEFAULT_COLORS = [
  '#ffb454', '#ff7a3d', '#a78bfa', '#34d399',
  '#60a5fa', '#fbbf24', '#f87171', '#00D4AA',
];

const DEFAULT_OPTIONS: Required<ConfettiOptions> = {
  particleCount: 80,
  spread: 120,
  startVelocity: 28,
  colors: DEFAULT_COLORS,
  duration: 3000,
  shapes: ['confetti', 'star'],
  originX: 0.5,
  originY: 0.3,
};

/* ─── Confetti Engine ─── */

function createParticles(canvas: HTMLCanvasElement, opts: Required<ConfettiOptions>): Particle[] {
  const particles: Particle[] = [];
  const { particleCount, spread, startVelocity, colors, shapes, originX, originY } = opts;
  const cx = canvas.width * originX;
  const cy = canvas.height * originY;
  const spreadRad = (spread * Math.PI) / 180;

  for (let i = 0; i < particleCount; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * spreadRad;
    const speed = startVelocity * (0.6 + Math.random() * 0.8);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    particles.push({
      x: cx + (Math.random() - 0.5) * 10,
      y: cy + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed * (0.8 + Math.random() * 0.4),
      vy: Math.sin(angle) * speed * (0.8 + Math.random() * 0.4),
      size: shape === 'star' ? 6 + Math.random() * 8 : 4 + Math.random() * 6,
      color,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
      shape,
      gravity: 0.35 + Math.random() * 0.3,
      drag: 0.97 + Math.random() * 0.02,
    });
  }
  return particles;
}

function drawConfetti(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate((p.rotation * Math.PI) / 180);
  ctx.globalAlpha = Math.max(0, p.opacity);
  ctx.fillStyle = p.color;

  const w = p.size * 0.6;
  const h = p.size;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 1);
  ctx.fill();

  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate((p.rotation * Math.PI) / 180);
  ctx.globalAlpha = Math.max(0, p.opacity);
  ctx.fillStyle = p.color;

  const spikes = 4;
  const outerR = p.size / 2;
  const innerR = outerR * 0.4;
  const step = Math.PI / spikes;

  ctx.beginPath();
  for (let i = 0; i < 2 * spikes; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = i * step - Math.PI / 2;
    if (i === 0) ctx.moveTo(r * Math.cos(a), r * Math.sin(a));
    else ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function animateConfetti(
  canvas: HTMLCanvasElement,
  particles: Particle[],
  duration: number,
  onDone: () => void
): () => void {
  const ctx = canvas.getContext('2d')!;
  const startTime = performance.now();
  let animId: number;

  function frame(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update & draw
    for (const p of particles) {
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - progress * 1.1);

      if (p.shape === 'star') drawStar(ctx, p);
      else drawConfetti(ctx, p);
    }

    if (progress < 1) {
      animId = requestAnimationFrame(frame);
    } else {
      onDone();
    }
  }

  animId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(animId);
}

/* ─── Hook ─── */

export function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    return () => {
      cancelRef.current?.();
    };
  }, []);

  /** Create a hidden off-screen canvas, render confetti, then discard. */
  const fire = useCallback((options?: ConfettiOptions) => {
    cancelRef.current?.();

    const opts = { ...DEFAULT_OPTIONS, ...options };
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    canvas.style.isolation = 'isolate';
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    setActive(true);
    const particles = createParticles(canvas, opts);
    cancelRef.current = animateConfetti(canvas, particles, opts.duration, () => {
      setActive(false);
      canvas.remove();
      canvasRef.current = null;
    });
  }, []);

  return { fire, active };
}

/* ─── Standalone Component ─── */

interface ConfettiOverlayProps extends ConfettiOptions {
  /** Show the confetti animation */
  active: boolean;
  /** Called when the animation finishes naturally */
  onComplete?: () => void;
}

export function ConfettiOverlay({ active, onComplete, ...options }: ConfettiOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!active) {
      cancelRef.current?.();
      setRendered(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    cancelRef.current?.();

    const opts = { ...DEFAULT_OPTIONS, ...options };
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    setRendered(true);
    const particles = createParticles(canvas, opts);
    cancelRef.current = animateConfetti(canvas, particles, opts.duration, () => {
      setRendered(false);
      onComplete?.();
    });

    return () => {
      cancelRef.current?.();
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active && !rendered) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{ isolation: 'isolate' }}
      aria-hidden="true"
    />
  );
}
