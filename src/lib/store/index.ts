import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User,
  Profile,
  CheckIn,
  Workout,
  DigitalTwin,
  ChatMessage,
  AIEvent,
  DecisionEngineOutput,
  WorkoutPlan,
  SessionResult,
  UserAchievement,
  QuestState,
  WorkoutTemplate,
  QuickLogEntry,
} from '@/types';
import type { LeaderboardEntry } from '@/lib/sync/leaderboard';

interface AppState {
  onboarded: boolean;
  user: User | null;
  profile: Profile | null;
  neuro: { type: string; duration: number } | null;
  twin: DigitalTwin | null;
  prefs: { reduceMotion: boolean; highContrast: boolean; fontLarge: boolean };
  /** Sensory preferences set during onboarding */
  sensory: { quiet: boolean; dim: boolean; swap: boolean };
  checkins: Record<string, CheckIn>;
  workouts: Workout[];
  events: AIEvent[];
  chat: ChatMessage[];
  plan: (DecisionEngineOutput & { date?: string; workout?: WorkoutPlan; message?: string; done?: boolean; result?: SessionResult }) | null;
  view: string;
  achievements: Record<string, UserAchievement>;
  achievementQueue: string[];
  questState: QuestState;
  leaderboard: LeaderboardEntry[];
  workoutTemplates: WorkoutTemplate[];
  quickLogs: QuickLogEntry[];
  /** 0–100 fatigue level from decisions made today */
  decisionFatigue: number;
  /** ISO date string of last fatigue reset */
  decisionFatigueDate: string;

  /** Record a decision being made (increments fatigue) */
  trackDecision: (weight?: number) => void;
  setOnboarded: (v: boolean) => void;
  setUser: (u: User | null) => void;
  setProfile: (p: Profile) => void;
  setNeuro: (n: { type: string; duration: number }) => void;
  setTwin: (t: DigitalTwin) => void;
  setPref: (k: string, v: boolean) => void;
  setSensory: (s: Partial<{ quiet: boolean; dim: boolean; swap: boolean }>) => void;
  setCheckin: (k: string, c: CheckIn) => void;
  addWorkout: (w: Workout) => void;
  addEvent: (e: AIEvent) => void;
  addChat: (m: ChatMessage) => void;
  setPlan: (p: DecisionEngineOutput & { date?: string; workout?: WorkoutPlan; message?: string; done?: boolean; result?: SessionResult }) => void;
  setView: (v: string) => void;
  setAchievements: (a: Record<string, UserAchievement>) => void;
  enqueueAchievement: (id: string) => void;
  dequeueAchievement: () => string | undefined;
  setQuestState: (q: Partial<QuestState>) => void;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  addTemplate: (t: WorkoutTemplate) => void;
  removeTemplate: (id: string) => void;
  addQuickLog: (entry: QuickLogEntry) => void;
  claimVaultItem: (id: string) => void;
  defeatBoss: () => void;
  logEvent: (type: string, detail?: Record<string, unknown>) => void;
  reset: () => void;
}

const initialState = {
  onboarded: false,
  user: null,
  profile: null,
  neuro: null,
  twin: null,
  prefs: { reduceMotion: false, highContrast: false, fontLarge: false },
  sensory: { quiet: false, dim: false, swap: false },
  checkins: {},
  workouts: [],
  events: [],
  chat: [],
  plan: null,
  view: 'welcome',
  achievements: {},
  achievementQueue: [],
  leaderboard: [],
  workoutTemplates: [],
  quickLogs: [],
  questState: {
    selectedTheme: 'one_piece',
    vaultClaims: {},
    bossDefeatedThisWeek: false,
    bossDefeatedCount: 0,
    lastBossDefeatDate: null,
  },
  decisionFatigue: 0,
  decisionFatigueDate: new Date().toISOString().slice(0, 10),
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setOnboarded: (v: boolean) => set({ onboarded: v }),
      setUser: (u: User | null) => set({ user: u }),
      setProfile: (p: Profile) => set({ profile: p }),
      setNeuro: (n: { type: string; duration: number }) => set({ neuro: n }),
      setTwin: (t: DigitalTwin) => set({ twin: t }),
      setPref: (k: string, v: boolean) =>
        set((s: AppState) => ({ prefs: { ...s.prefs, [k]: v } })),
      setSensory: (patch: Partial<{ quiet: boolean; dim: boolean; swap: boolean }>) =>
        set((s: AppState) => ({ sensory: { ...s.sensory, ...patch } })),
      setCheckin: (k: string, c: CheckIn) =>
        set((s: AppState) => ({ checkins: { ...s.checkins, [k]: c } })),
      addWorkout: (w: Workout) =>
        set((s: AppState) => ({ workouts: [...s.workouts, w] })),
      addEvent: (e: AIEvent) =>
        set((s: AppState) => ({ events: [e, ...s.events].slice(0, 40) })),
      addChat: (m: ChatMessage) =>
        set((s: AppState) => ({ chat: [...s.chat, m].slice(-40) })),
      setPlan: (p: DecisionEngineOutput & { date?: string; workout?: WorkoutPlan; message?: string; done?: boolean; result?: SessionResult }) => set({ plan: p }),
      setView: (v: string) => set({ view: v }),
      setLeaderboard: (entries: LeaderboardEntry[]) => set({ leaderboard: entries }),
      setAchievements: (a: Record<string, UserAchievement>) => set({ achievements: a }),
      addTemplate: (t: WorkoutTemplate) =>
        set((s: AppState) => ({ workoutTemplates: [...s.workoutTemplates, t] })),
      removeTemplate: (id: string) =>
        set((s: AppState) => ({
          workoutTemplates: s.workoutTemplates.filter((t: WorkoutTemplate) => t.id !== id),
        })),
      addQuickLog: (entry: QuickLogEntry) =>
        set((s: AppState) => ({ quickLogs: [entry, ...s.quickLogs].slice(0, 100) })),
      enqueueAchievement: (id: string) =>
        set((s: AppState) => ({ achievementQueue: [...s.achievementQueue, id] })),
      dequeueAchievement: (): string | undefined => {
        const { achievementQueue } = useStore.getState();
        if (achievementQueue.length === 0) return undefined;
        const [id, ...rest] = achievementQueue;
        set({ achievementQueue: rest });
        return id;
      },
      setQuestState: (q: Partial<QuestState>) =>
        set((s: AppState) => ({ questState: { ...s.questState, ...q } })),
      claimVaultItem: (id: string) =>
        set((s: AppState) => ({
          questState: {
            ...s.questState,
            vaultClaims: { ...s.questState.vaultClaims, [id]: true },
          },
        })),
      defeatBoss: () =>
        set((s: AppState) => ({
          questState: {
            ...s.questState,
            bossDefeatedThisWeek: true,
            bossDefeatedCount: s.questState.bossDefeatedCount + 1,
            lastBossDefeatDate: new Date().toISOString(),
          },
        })),
      logEvent: (type: string, detail?: Record<string, unknown>) => {
        const ev: AIEvent = {
          id: Date.now().toString(36),
          user_id: '',
          event: type,
          timestamp: new Date().toISOString(),
          decision: detail || {},
          agent: 'system',
        };
        (get as () => AppState)().addEvent(ev);
      },
      trackDecision: (weight = 4) => {
        const state = get() as AppState;
        const today = new Date().toISOString().slice(0, 10);
        // Reset if a new day
        const currentFatigue = state.decisionFatigueDate === today
          ? state.decisionFatigue
          : 0;
        const newFatigue = Math.min(100, currentFatigue + weight);
        set({ decisionFatigue: newFatigue, decisionFatigueDate: today });
      },
      reset: () => set({ ...initialState }),
    }),
    {
      name: 'chispa_store',
      partialize: (state: AppState) => ({
        onboarded: state.onboarded,
        profile: state.profile,
        neuro: state.neuro,
        twin: state.twin,
        prefs: state.prefs,
        sensory: state.sensory,
        checkins: state.checkins,
        workouts: state.workouts,
        events: state.events,
        chat: state.chat,
        plan: state.plan,
        achievements: state.achievements,
        questState: state.questState,
        workoutTemplates: state.workoutTemplates,
        quickLogs: state.quickLogs,
        decisionFatigue: state.decisionFatigue,
        decisionFatigueDate: state.decisionFatigueDate,
      }),
    }
  ) as any
);
