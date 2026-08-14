import '@testing-library/jest-dom';
import { vi, beforeEach, beforeAll } from 'vitest';
import React from 'react';

// ─── Mock next/image ───
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => {
    const { fill: _fill, ...rest } = props;
    return React.createElement('img', rest);
  },
}));

// ─── Mock motion/react ───
// Strip motion-specific props and render with the correct HTML tag
const motionMap: Record<string, string> = {
  div: 'div',
  button: 'button',
  span: 'span',
  p: 'p',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  img: 'img',
  section: 'section',
  article: 'article',
  main: 'main',
  header: 'header',
  footer: 'footer',
  nav: 'nav',
  ul: 'ul',
  li: 'li',
  form: 'form',
  label: 'label',
  input: 'input',
  textarea: 'textarea',
};

const motionPropsToStrip = new Set([
  'initial', 'animate', 'exit', 'transition', 'variants',
  'whileHover', 'whileTap', 'whileInView', 'whileFocus', 'whileDrag',
  'custom', 'layout', 'layoutId', 'keyframes', 'onAnimationStart',
  'onAnimationComplete',
]);

function stripMotionProps(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!motionPropsToStrip.has(k)) {
      result[k] = v;
    }
  }
  return result;
}

vi.mock('motion/react', () => {
  // Cache por tag: el mismo `motion.div` debe ser SIEMPRE la misma función para
  // que React reconcilie (no remonte) el subtree en cada render. Sin cache, el
  // Proxy devuelve una función nueva por acceso y todo hijo con estado (p.ej.
  // el flipbook) se remonta y pierde su estado en cada re-render del padre.
  const motionCache: Record<string, React.FC> = {};
  const motion = new Proxy(
    {},
    {
      get: (_target: unknown, tag: string) => {
        const htmlTag = motionMap[tag] || 'div';
        if (!motionCache[tag]) {
          const MotionComponent = (props: Record<string, unknown>) => {
            const htmlProps = stripMotionProps(props);
            return React.createElement(htmlTag, htmlProps, props.children as React.ReactNode);
          };
          MotionComponent.displayName = `motion.${tag}`;
          motionCache[tag] = MotionComponent;
        }
        return motionCache[tag];
      },
    }
  );

  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    animate: vi.fn(),
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
    useMotionValue: (v: number) => ({ get: () => v, set: vi.fn() }),
    useTransform: (v: unknown) => v,
  };
});

// ─── Polyfill scrollIntoView for jsdom ───
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// ─── Polyfill ResizeObserver for Radix UI ───
if (typeof ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// ─── vitest-axe for accessibility assertions ───
// (axe function imported directly in test files, no matcher needed)

// ─── Reset Zustand store between tests ───
let resetStore: ((state: Record<string, unknown>) => void) | null = null;

beforeAll(async () => {
  const { useStore } = await vi.importActual<typeof import('@/lib/store')>('@/lib/store');
  const initialState = {
    onboarded: false, user: null, profile: null, neuro: null, twin: null,
    prefs: { reduceMotion: false, highContrast: false, fontLarge: false, showFAQs: true },
    checkins: {}, workouts: [], events: [], chat: [], plan: null, view: 'welcome',
    skipStreak: 0,
    suggestShortSession: false,
    coopMode: 'none' as const,
    friends: [],
    myInviteCode: null,
  };
  resetStore = (s: Record<string, unknown>) => {
    useStore.setState({ ...initialState, ...s });
    localStorage.clear();
  };
});

beforeEach(() => {
  if (resetStore) resetStore({});
});
