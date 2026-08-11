# Performance Optimization Report

## Date: August 10, 2026

## Executive Summary

Successfully improved LCP from 10.7s to 5.7s (47% improvement) through lazy-loading and preload hints. Further optimizations needed to reach the 2.5s target.

---

## Current State

### Lighthouse Scores (Post-Optimization)

| Metric | Score | Value | Target | Status |
|---|---|---|---|---|
| **Performance** | 73/100 | - | 90+ | ⚠️ |
| **Accessibility** | 94/100 | - | 95+ | ✅ |
| **Best Practices** | 96/100 | - | 100 | ⚠️ |
| **SEO** | 100/100 | - | 100 | ✅ |

### Core Web Vitals

| Metric | Before | After | Target | Status |
|---|---|---|---|---|
| **FCP** | 2.3s | 1.6s | < 1.8s | ✅ |
| **LCP** | 10.7s | 5.7s | < 2.5s | ⚠️ |
| **TBT** | 110ms | 120ms | < 200ms | ✅ |
| **CLS** | 0 | 0.02 | < 0.1 | ✅ |
| **SI** | 5.9s | 5.6s | < 3.4s | ⚠️ |

---

## Optimizations Implemented

### 1. Lazy-loaded Neurofit Screens

Changed Quest, Dopamina, and Sistema screens from `ssr: true` to `ssr: false`:

```typescript
// Before
const QuestScreen = dynamic(() => import('@/components/neurofit/quest-screen'), {
  ssr: true,
});

// After
const QuestScreen = dynamic(() => import('@/components/neurofit/quest-screen'), {
  ssr: false,
  loading: () => <ScreenFallback />,
});
```

**Impact:** Reduced initial JavaScript bundle by deferring these screens until needed.

### 2. Added Loading States

Added consistent loading spinners for lazy-loaded components to improve perceived performance.

### 3. Added Preload Hints

Added DNS prefetch and font preload in `layout.tsx`:

```html
{/* Preload critical resources */}
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />

{/* DNS prefetch for external services */}
<link rel="dns-prefetch" href="https://image.qwenlm.ai" />
<link rel="dns-prefetch" href="https://fonts.googleapis.com" />
```

---

## Remaining Issues

### 1. LCP Still Above Target (5.7s vs 2.5s)

The LCP is still 2x above the target. Root causes:

1. **Heavy JavaScript execution** - 2.2s main thread work
2. **Unused JavaScript** - 241 KB can be eliminated
3. **Multiple font files** - 5 fonts loading on initial page

### 2. Unused JavaScript (241 KB)

| Chunk | Wasted Bytes | Likely Contents |
|---|---|---|
| `4081-*.js` | 163 KB | Sentry browser utilities |
| `3827-*.js` | 41 KB | Framer Motion |
| `5c52ef70-*.js` | 36 KB | Date-fns |

### 3. Main Thread Work (2.2s)

JavaScript execution is blocking the main thread for 2.2 seconds, which delays LCP.

---

## Recommended Next Steps

### Priority 1: Reduce Sentry Bundle (Save ~500 KB)

Sentry is the largest dependency (473 modules in @sentry/core). Options:

1. **Disable unused features** in `sentry.client.config.ts`:
   ```typescript
   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     tracesSampleRate: 0.1, // Already set
     replaysSessionSampleRate: 0, // Already set
     replaysOnErrorSampleRate: 0, // Already set
     // Add these:
     enableTracing: false,
     attachStacktrace: false,
     autoSessionTracking: false,
   });
   ```

2. **Consider alternatives** like LogRocket (lighter bundle)

### Priority 2: Reduce Font Loading (Save ~100 KB)

Currently loading 5 fonts:
- Inter
- Sora
- Bricolage_Grotesque
- Fraunces
- Hanken_Grotesk

**Recommendation:** Use only 2-3 fonts and subset the rest.

### Priority 3: Optimize Framer Motion (Save ~150 KB)

Replace `framer-motion` with the lighter `motion` package:

```json
// package.json
"motion": "^12.0.0"
```

### Priority 4: Code Splitting for Heavy Components

Lazy load heavy components that aren't needed on initial render:
- CoachScreen (imports LocalLLM)
- SessionScreen (imports FormCheck)
- SummaryScreen

### Priority 5: Add Service Worker Caching

Implement service worker caching for:
- Static assets (JS, CSS, fonts)
- API responses
- Offline support

---

## Bundle Analysis

### Largest Dependencies

| Dependency | Modules | Bundle Impact |
|---|---|---|
| @sentry/core | 473 | ~1.5 MB |
| framer-motion/dist | 452 | ~200 KB |
| next/dist | 433 | ~150 KB |
| @sentry/nextjs | 352 | ~500 KB |
| lucide-react/dist | 303 | ~300 KB |

### Current Bundle Sizes

| Chunk | Size | Contents |
|---|---|---|
| `3749-*.js` | 2.0 MB | Sentry, Framer Motion, Lucide |
| `4081-*.js` | 753 KB | Sentry browser utilities |
| `8511-*.js` | 378 KB | Motion/DOM, Radix UI |
| `b5128fb0-*.js` | 290 KB | Date-fns, Supabase |

---

## Expected Savings

| Optimization | Estimated Savings |
|---|---|
| Sentry config optimization | ~500 KB |
| Font reduction | ~100 KB |
| motion package | ~150 KB |
| Date-fns imports | ~50 KB |
| **Total** | **~800 KB (30% reduction)** |

---

## Files Modified

- `src/app/page.tsx` - Changed Quest, Dopamina, Sistema screens to `ssr: false`
- `src/app/layout.tsx` - Added preload hints and DNS prefetch

---

## Next Actions

1. **Optimize Sentry configuration** - Reduce bundle size
2. **Reduce font loading** - Use fewer fonts
3. **Replace framer-motion** - Use lighter motion package
4. **Add service worker** - Cache critical assets
5. **Run Lighthouse again** - Verify improvements
