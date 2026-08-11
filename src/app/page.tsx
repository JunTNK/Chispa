'use client';

import React, { useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { onAuthStateChange } from '@/lib/auth/supabase-auth';
import { trackDAU } from '@/lib/analytics';
import { AppLayout } from '@/components/layout/app-layout';
import { ToastContainer } from '@/components/ui/toast';
import { AchievementToast } from '@/components/awards/achievement-toast';

/* ─── Static import (landing page — always loaded first) ─── */
import { WelcomeScreen } from '@/components/onboarding/welcome-screen';

/* ─── Lazy-loaded Screen Components ─── */

const OnboardingScreen = dynamic(() => import('@/components/onboarding/onboarding-screen').then(m => ({ default: m.OnboardingScreen })), {
  ssr: true,
});

const LoginScreen = dynamic(() => import('@/components/auth/login-screen').then(m => ({ default: m.LoginScreen })), {
  ssr: true,
});

const RegisterScreen = dynamic(() => import('@/components/auth/register-screen').then(m => ({ default: m.RegisterScreen })), {
  ssr: true,
});

const HomeScreen = dynamic(() => import('@/components/training/home-screen').then(m => ({ default: m.HomeScreen })), {
  ssr: true,
});

const SessionScreen = dynamic(() => import('@/components/training/session-screen').then(m => ({ default: m.SessionScreen })), {
  ssr: false,
});

const SummaryScreen = dynamic(() => import('@/components/training/summary-screen').then(m => ({ default: m.SummaryScreen })), {
  ssr: false,
});

const CoachScreen = dynamic(() => import('@/components/coach/coach-screen').then(m => ({ default: m.CoachScreen })), {
  ssr: false,
});

const ProgressScreen = dynamic(() => import('@/components/progress/progress-screen').then(m => ({ default: m.ProgressScreen })), {
  ssr: true,
});

const AnalyticsScreen = dynamic(() => import('@/components/analytics/analytics-screen').then(m => ({ default: m.AnalyticsScreen })), {
  ssr: true,
});
const PricingScreen = dynamic(() => import('@/components/pricing/pricing-screen').then(m => ({ default: m.PricingScreen })), {
  ssr: true,
});
const ProfileScreen = dynamic(() => import('@/components/profile/profile-screen').then(m => ({ default: m.ProfileScreen })), {
  ssr: true,
});

const QuestScreen = dynamic(() => import('@/components/neurofit/quest-screen').then(m => ({ default: m.QuestScreen })), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

const DopaminaScreen = dynamic(() => import('@/components/neurofit/dopamina-screen').then(m => ({ default: m.DopaminaScreen })), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

const LogrosScreen = dynamic(() => import('@/components/awards/logros-screen').then(m => ({ default: m.LogrosScreen })), {
  ssr: true,
});

const SistemaScreen = dynamic(() => import('@/components/neurofit/sistema-screen').then(m => ({ default: m.SistemaScreen })), {
  ssr: false,
  loading: () => <ScreenFallback />,
});

const LeaderboardScreen = dynamic(() => import('@/components/awards/leaderboard-screen').then(m => ({ default: m.LeaderboardScreen })), {
  ssr: true,
});

const CreateWorkoutScreen = dynamic(() => import('@/components/training/create-workout-screen').then(m => ({ default: m.CreateWorkoutScreen })), {
  ssr: false,
});

const QuickLogScreen = dynamic(() => import('@/components/training/quick-log-screen').then(m => ({ default: m.QuickLogScreen })), {
  ssr: false,
});

const ExerciseCatalogScreen = dynamic(() => import('@/components/training/exercise-catalog-screen').then(m => ({ default: m.ExerciseCatalogScreen })), {
  ssr: true,
});
const JournalScreen = dynamic(() => import('@/components/training/journal-screen').then(m => ({ default: m.JournalScreen })), {
  ssr: false,
});

const FeedbackScreen = dynamic(() => import('@/components/feedback/feedback-screen').then(m => ({ default: m.FeedbackScreen })), {
  ssr: true,
});

/* ─── Fallback loading states ─── */

const ScreenFallback = () => {
  const t = useT();
  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#ffb454] border-t-transparent animate-spin" />
        <p className="text-sm text-[var(--muted)]">{t('Cargando...')}</p>
      </div>
    </div>
  );
};

/* ─── Animation Variants ─── */

const pageVariants = {
  initial: { opacity: 0, y: 10 } as const,
  animate: { opacity: 1, y: 0 } as const,
  exit: { opacity: 0, y: -10 } as const,
};

const pageTransition = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1] as const,
};

function PageWrapper({ view, children }: { view: string; children: React.ReactNode }) {
  return (
    <motion.div
      key={view}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const view = useStore((s) => s.view);
  const prefs = useStore((s) => s.prefs);
  const lang = useStore((s) => s.lang);

   useEffect(() => {
     document.body.classList.toggle('hc', prefs.highContrast);
     document.body.classList.toggle('large', prefs.fontLarge);
     document.body.classList.toggle('light', prefs.light ?? false);
   }, [prefs]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // High Contrast: respeta la preferencia del SO/UX → persiste en prefs.highContrast.
  // Solo auto-activa si el usuario aún no la ha forzado y el sistema pide más contraste.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (prefs.highContrast) return;
    if (window.matchMedia('(prefers-contrast: more)').matches) {
      useStore.getState().setPref('highContrast', true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Restaura la sesión de Supabase al montar/recargar: el idioma vive en el
  // Digital Twin (digital_twins.lang) y se aplica al store tras el pull,
  // para que la preferencia siga al usuario entre dispositivos.
  useEffect(() => {
    const unsubscribe = onAuthStateChange((event, session) => {
      // Auto-navigate authenticated users to their home view
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        const store = useStore.getState();
        const { profile, onboarded } = store;
        if (profile && onboarded) {
          store.setView('home');
        } else if (profile && !onboarded) {
          store.setView('onboarding');
        }
      }
    });
    trackDAU();
    return unsubscribe;
  }, []);

  const renderScreen = () => {
    const content = (() => {
      switch (view) {
        case 'welcome':
          return <WelcomeScreen />;
        case 'login':
          return <LoginScreen />;
        case 'register':
          return <RegisterScreen />;
        case 'onboarding':
          return <OnboardingScreen />;
        case 'home':
        case 'train':
          return <AppLayout><HomeScreen /></AppLayout>;
        case 'session':
          return <SessionScreen />;
        case 'summary':
          return <SummaryScreen />;
        case 'coach':
          return <AppLayout><CoachScreen /></AppLayout>;
        case 'progress':
          return <AppLayout><ProgressScreen /></AppLayout>;
        case 'analytics':
          return <AppLayout><AnalyticsScreen /></AppLayout>;
        case 'pricing':
          return <AppLayout><PricingScreen /></AppLayout>;
        case 'profile':
          return <AppLayout><ProfileScreen /></AppLayout>;
        case 'quest':
          return <AppLayout><QuestScreen /></AppLayout>;
        case 'dopamina':
          return <AppLayout><DopaminaScreen /></AppLayout>;
        case 'logros':
          return <AppLayout><LogrosScreen /></AppLayout>;
        case 'leaderboard':
          return <AppLayout><LeaderboardScreen /></AppLayout>;
        case 'create-workout':
          return <CreateWorkoutScreen />;
        case 'quick-log':
          return <QuickLogScreen />;
         case 'catalog':
           return <AppLayout><ExerciseCatalogScreen /></AppLayout>;
         case 'journal':
           return <AppLayout><JournalScreen /></AppLayout>;
        case 'feedback':
          return <AppLayout><FeedbackScreen /></AppLayout>;
        case 'sistema':
          return <AppLayout><SistemaScreen /></AppLayout>;
        default:
          return <WelcomeScreen />;
      }
    })();

    return (
      <PageWrapper view={view}>
        <Suspense fallback={<ScreenFallback />}>
          {content}
        </Suspense>
      </PageWrapper>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <div id="app" className="max-w-[440px] lg:max-w-none mx-auto min-h-dvh relative bg-[var(--bg)] overflow-hidden">
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>
        <ToastContainer />
        <AchievementToast />
      </div>
    </MotionConfig>
  );
}
