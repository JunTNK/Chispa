import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  User,
  Profile,
  CheckIn,
  Workout,
  DigitalTwin,
  ChatMessage,
  AIEvent,
  DecisionEngineOutput,
} from '@/types';

interface AppState {
  onboarded: boolean;
  user: User | null;
  profile: Profile | null;
  neuro: { type: string; duration: number } | null;
  twin: DigitalTwin | null;
  prefs: { reduceMotion: boolean; highContrast: boolean; fontLarge: boolean };
  checkins: Record<string, CheckIn>;
  workouts: Workout[];
  events: AIEvent[];
  chat: ChatMessage[];
  plan: (DecisionEngineOutput & { date?: string; workout?: any; message?: string; done?: boolean; result?: any }) | null;
  view: string;

  setOnboarded: (v: boolean) => void;
  setUser: (u: User | null) => void;
  setProfile: (p: Profile) => void;
  setNeuro: (n: { type: string; duration: number }) => void;
  setTwin: (t: DigitalTwin) => void;
  setPref: (k: string, v: boolean) => void;
  setCheckin: (k: string, c: CheckIn) => void;
  addWorkout: (w: Workout) => void;
  addEvent: (e: AIEvent) => void;
  addChat: (m: ChatMessage) => void;
  setPlan: (p: any) => void;
  setView: (v: string) => void;
  logEvent: (type: string, detail?: Record<string, any>) => void;
  reset: () => void;
}

const initialState = {
  onboarded: false,
  user: null,
  profile: null,
  neuro: null,
  twin: null,
  prefs: { reduceMotion: false, highContrast: false, fontLarge: false },
  checkins: {},
  workouts: [],
  events: [],
  chat: [],
  plan: null,
  view: 'welcome',
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setOnboarded: (v) => set({ onboarded: v }),
      setUser: (u) => set({ user: u }),
      setProfile: (p) => set({ profile: p }),
      setNeuro: (n) => set({ neuro: n }),
      setTwin: (t) => set({ twin: t }),
      setPref: (k, v) =>
        set((s) => ({ prefs: { ...s.prefs, [k]: v } })),
      setCheckin: (k, c) =>
        set((s) => ({ checkins: { ...s.checkins, [k]: c } })),
      addWorkout: (w) =>
        set((s) => ({ workouts: [...s.workouts, w] })),
      addEvent: (e) =>
        set((s) => ({ events: [e, ...s.events].slice(0, 40) })),
      addChat: (m) =>
        set((s) => ({ chat: [...s.chat, m].slice(-40) })),
      setPlan: (p) => set({ plan: p }),
      setView: (v) => set({ view: v }),
      logEvent: (type, detail) => {
        const ev: AIEvent = {
          id: Date.now().toString(36),
          user_id: '',
          event: type,
          timestamp: new Date().toISOString(),
          decision: detail || {},
          agent: 'system',
        };
        get().addEvent(ev);
      },
      reset: () => set(initialState),
    }),
    {
      name: 'chispa_store',
      partialize: (state) => ({
        onboarded: state.onboarded,
        profile: state.profile,
        neuro: state.neuro,
        twin: state.twin,
        prefs: state.prefs,
        checkins: state.checkins,
        workouts: state.workouts,
        events: state.events,
        chat: state.chat,
        plan: state.plan,
      }),
    }
  )
);
