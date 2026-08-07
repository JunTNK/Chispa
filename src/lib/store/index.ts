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
   FriendEntry,
   InviteCode,
   WeightEntry,
   UserSubscription,
   SubscriptionTier,
   AnchorRoutine,
} from '@/types';
import type { LeaderboardEntry } from '@/lib/sync/leaderboard';
import { applyQuestResult, EMPTY_PLAYER } from '@/lib/system/quest-engine';
import { evaluateTitles } from '@/lib/system/titles';
import type { PlayerState, QuestTier, ResolvedTask } from '@/lib/system/types';

interface AppState {
  onboarded: boolean;
  user: User | null;
  profile: Profile | null;
  neuro: { type: string; duration: number } | null;
  twin: DigitalTwin | null;
  /** UI language: Spanish (default) or English */
  lang: 'es' | 'en';
prefs: { reduceMotion: boolean; highContrast: boolean; fontLarge: boolean; hideStreaks: boolean; showFAQs?: boolean; light?: boolean; systemMode?: boolean; audioGuide?: boolean };
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
  /** Id de la plantilla en edición desde Mis rutinas (null = creación nueva) */
  editingTemplateId: string | null;
  /** Habit stacking: ancla configurada por el usuario (o null si no usa anclas) */
  anchorRoutine: AnchorRoutine | null;
  /** Último nudge mostrado (`fecha:ventana`) — un solo nudge por ventana */
  anchorNudgeShown: string;
  quickLogs: QuickLogEntry[];
  /** Historial de peso con fecha (orden cronológico asc) — canónico en kg */
  weightHistory: WeightEntry[];
  /** 0–100 fatigue level from decisions made today */
  decisionFatigue: number;
  /** ISO date string of last fatigue reset */
  decisionFatigueDate: string;
  /** Consecutive skipped sessions (no engagement) */
  skipStreak: number;
  /** Engine should proactively suggest a short session */
  suggestShortSession: boolean;
  /** Cooperative mode preference */
  coopMode: 'none' | 'friends' | 'public';
  /** Peers aceptados (local-first) */
  friends: FriendEntry[];
  /** Mi código de invitación actual (6 dígitos) o null si expiró */
  myInviteCode: InviteCode | null;

  /** Subscription tier (free/pro/lifetime) + trial state */
  subscription: UserSubscription;

  /** System player state (null = desactivado) */
  player: PlayerState | null;

  /** Record a decision being made (increments fatigue) */
  trackDecision: (weight?: number) => void;
  setOnboarded: (v: boolean) => void;
  setUser: (u: User | null) => void;
  setProfile: (p: Profile) => void;
  setNeuro: (n: { type: string; duration: number }) => void;
  setTwin: (t: DigitalTwin) => void;
  setPref: (k: string, v: boolean) => void;
  setLang: (l: 'es' | 'en') => void;
  setSensory: (s: Partial<{ quiet: boolean; dim: boolean; swap: boolean }>) => void;
  setCheckin: (k: string, c: CheckIn) => void;
  addWorkout: (w: Workout) => void;
  addEvent: (e: AIEvent) => void;
  addChat: (m: ChatMessage) => void;
  setPlan: (p: DecisionEngineOutput & { date?: string; workout?: WorkoutPlan; message?: string; done?: boolean; result?: SessionResult }) => void;
  setView: (v: string) => void;
  /** Timer live — persistido para sobrevivir refresh */
  liveNowStartedAt: number | null;
  startLive: () => void;
  finishLive: () => void;
  abortLive: () => void;
  setAchievements: (a: Record<string, UserAchievement>) => void;
  enqueueAchievement: (id: string) => void;
  dequeueAchievement: () => string | undefined;
  setQuestState: (q: Partial<QuestState>) => void;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  addTemplate: (t: WorkoutTemplate) => void;
  removeTemplate: (id: string) => void;
  /** Actualiza una plantilla existente (preserva id y created_at) */
  updateTemplate: (id: string, patch: Partial<WorkoutTemplate>) => void;
  /** Marca una plantilla como usada (actualiza last_used) */
  touchTemplate: (id: string) => void;
  /** Abre/cierra el modo edición de una plantilla en el creador */
  setEditingTemplate: (id: string | null) => void;
  /** Guarda/limpia el ancla de rutina (habit stacking) y resetea el nudge */
  setAnchorRoutine: (r: AnchorRoutine | null) => void;
  /** Marca un nudge del ancla como mostrado (clave `fecha:ventana`) */
  markAnchorNudgeShown: (key: string) => void;
  addQuickLog: (entry: QuickLogEntry) => void;
  /** Registra/actualiza la entrada de peso de un día (una por fecha) */
  logWeight: (date: string, weightKg: number) => void;
  /** Elimina la entrada de peso de una fecha concreta */
  removeWeightEntry: (date: string) => void;
  claimVaultItem: (id: string) => void;
  defeatBoss: () => void;
  logEvent: (type: string, detail?: Record<string, unknown>) => void;
  trackSkip: () => void;
  resetSkipStreak: () => void;
  clearShortSuggestion: () => void;
  setCoopMode: (mode: 'none' | 'friends' | 'public') => void;
  generateInviteCode: () => string;
  addFriend: (code: string, name?: string) => boolean;
  removeFriend: (id: string) => void;
  setSystemMode: (on: boolean) => void;
  setSubscription: (tier: SubscriptionTier, stripeCustomerId?: string) => void;
  startProTrial: () => void;
  resolveQuest: (completed: ResolvedTask[], tier: QuestTier) => void;
  skipQuest: () => void;
  reset: () => void;
}

const initialState: {
  onboarded: boolean;
  user: User | null;
  profile: Profile | null;
  neuro: { type: string; duration: number } | null;
  twin: DigitalTwin | null;
  lang: 'es' | 'en';
prefs: { reduceMotion: boolean; highContrast: boolean; fontLarge: boolean; hideStreaks: boolean; showFAQs?: boolean; light?: boolean; systemMode?: boolean; audioGuide?: boolean };
  /** Timestamp cuando el usuario empezó "Estoy entrenando ahora" — persistido para sobrevivir refresh. */
  liveNowStartedAt: number | null;
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
  editingTemplateId: string | null;
  anchorRoutine: AnchorRoutine | null;
  anchorNudgeShown: string;
  quickLogs: QuickLogEntry[];
  weightHistory: WeightEntry[];
  decisionFatigue: number;
  decisionFatigueDate: string;
  skipStreak: number;
  suggestShortSession: boolean;
  coopMode: 'none' | 'friends' | 'public';
  friends: FriendEntry[];
  myInviteCode: InviteCode | null;
  player: PlayerState | null;
  subscription: UserSubscription;
} = {
  onboarded: false,
  user: null,
  profile: null,
  neuro: null,
  twin: null,
  lang: 'es',
  prefs: { reduceMotion: false, highContrast: false, fontLarge: false, hideStreaks: false, showFAQs: true, light: false, systemMode: false, audioGuide: false },
  liveNowStartedAt: null,
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
  editingTemplateId: null,
  anchorRoutine: null,
  anchorNudgeShown: '',
  quickLogs: [],
  weightHistory: [],
  questState: {
    selectedTheme: 'fitness_iniciacion',
    vaultClaims: {},
    bossDefeatedThisWeek: false,
    bossDefeatedCount: 0,
    lastBossDefeatDate: null,
  },
  decisionFatigue: 0,
  decisionFatigueDate: new Date().toISOString().slice(0, 10),
  skipStreak: 0,
  suggestShortSession: false,
  coopMode: 'none',
  friends: [],
  myInviteCode: null,
  player: null,
  subscription: { tier: 'free', isInTrial: false, trialDaysLeft: 0 },
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
      setLang: (l: 'es' | 'en') => set({ lang: l }),
      startLive: () => set({ liveNowStartedAt: Date.now() } as Partial<AppState>),
      finishLive: () => set({ liveNowStartedAt: null } as Partial<AppState>),
      abortLive: () => set({ liveNowStartedAt: null } as Partial<AppState>),
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
      updateTemplate: (id: string, patch: Partial<WorkoutTemplate>) =>
        set((s: AppState) => ({
          workoutTemplates: s.workoutTemplates.map((t: WorkoutTemplate) =>
            t.id === id ? { ...t, ...patch, id: t.id, created_at: t.created_at } : t
          ),
        })),
      setEditingTemplate: (id: string | null) => set({ editingTemplateId: id }),
      setAnchorRoutine: (r: AnchorRoutine | null) =>
        set({ anchorRoutine: r, anchorNudgeShown: '' }),
      markAnchorNudgeShown: (key: string) => set({ anchorNudgeShown: key }),
      touchTemplate: (id: string) =>
        set((s: AppState) => ({
          workoutTemplates: s.workoutTemplates.map((t: WorkoutTemplate) =>
            t.id === id ? { ...t, last_used: new Date().toISOString() } : t
          ),
        })),
      addQuickLog: (entry: QuickLogEntry) =>
        set((s: AppState) => ({ quickLogs: [entry, ...s.quickLogs].slice(0, 100) })),
      logWeight: (date: string, weightKg: number) =>
        set((s: AppState) => {
          const others = s.weightHistory.filter((e) => e.date !== date);
          // Cronológico asc + tope de 365 entradas
          const next = [...others, { date, weight_kg: weightKg }]
            .sort((a, b) => (a.date < b.date ? -1 : 1))
            .slice(-365);
          return { weightHistory: next };
        }),
      removeWeightEntry: (date: string) =>
        set((s: AppState) => ({
          weightHistory: s.weightHistory.filter((e) => e.date !== date),
        })),
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
      trackSkip: () => {
        const streak = (get() as AppState).skipStreak + 1;
        set({ skipStreak: streak, suggestShortSession: streak >= 2 });
      },
      resetSkipStreak: () => set({ skipStreak: 0, suggestShortSession: false }),
      clearShortSuggestion: () => set({ suggestShortSession: false }),
      setCoopMode: (m: 'none' | 'friends' | 'public') => set({ coopMode: m }),
      generateInviteCode: (): string => {
        const code = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10).toString()).join('');
        const invite: InviteCode = { code, expires_at: new Date(Date.now() + 48 * 3600_000).toISOString() };
        set({ myInviteCode: invite });
        return code;
      },
      addFriend: (code: string, name?: string): boolean => {
        if (!/^\d{6}$/.test(code)) return false;
        const s = get() as AppState;
        if (s.friends.some((f) => f.id === code)) return false;
        const friend: FriendEntry = { id: code, name: name || `Invitado ${code.slice(0, 3)}`, joined_at: new Date().toISOString(), status: 'active' };
        set({ friends: [friend, ...s.friends] });
        return true;
      },
      removeFriend: (id: string) => set((s: AppState) => ({ friends: s.friends.filter((f) => f.id !== id) })),

      /** Activa/desactiva el Sistema. Al activar por primera vez, inicializa player con EMPTY_PLAYER. Al desactivar, NO borra el progreso. */
      setSystemMode: (on: boolean) =>
        set((s: AppState) => ({
          prefs: { ...s.prefs, systemMode: on },
          // al activar por primera vez, nace el cazador; al desactivar, NO se borra el progreso
          player: on && !s.player ? EMPTY_PLAYER : s.player,
        })),

      /** Resuelve una quest completada: aplica XP, sube stats, evalúa títulos. No-op si player === null. */
      resolveQuest: (completed: ResolvedTask[], tier: QuestTier) =>
        set((s: AppState) => {
          if (!s.player) return s;
          const next = applyQuestResult(s.player, completed, tier);
          const newTitles = evaluateTitles(next, s.events);
          const mergedTitles = { ...next.unlockedTitles };
          for (const id of newTitles) {
            mergedTitles[id] = { unlocked: true, unlockedAt: new Date().toISOString() };
          }
          return {
            player: { ...next, unlockedTitles: mergedTitles },
          };
        }),

      /** No hay XP ni castigo: solo re-evalúa títulos basándose en events. No-op si player === null. */
      skipQuest: () =>
        set((s: AppState) => {
          if (!s.player) return s;
          const newTitles = evaluateTitles(s.player, s.events);
          if (newTitles.length === 0) return s;
          const mergedTitles = { ...s.player.unlockedTitles };
          for (const id of newTitles) {
            mergedTitles[id] = { unlocked: true, unlockedAt: new Date().toISOString() };
          }
          return { player: { ...s.player, unlockedTitles: mergedTitles } };
        }),
         setSubscription: (tier: SubscriptionTier, stripeCustomerId?: string) =>
        set((s) => ({
          subscription: {
            tier,
            stripeCustomerId: stripeCustomerId || s.subscription.stripeCustomerId || null,
            isInTrial: tier === 'pro',
            trialDaysLeft: tier === 'pro' ? 7 : 0,
            activatedAt: tier !== 'free' ? (s.subscription.activatedAt || new Date().toISOString()) : s.subscription.activatedAt,
          },
        })),

      startProTrial: () =>
        set((s) => {
          const activatedAt = new Date().toISOString();
          return {
            subscription: {
              ...s.subscription,
              tier: 'pro',
              isInTrial: true,
              trialDaysLeft: 7,
              activatedAt,
              trialEndsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
            },
          };
        }),

      reset: () => set({ ...initialState }),
    }),
    {
      name: 'chispa_store',
      partialize: (state: AppState) => ({
        view: state.view,
        onboarded: state.onboarded,
        profile: state.profile,
        neuro: state.neuro,
        twin: state.twin,
        lang: state.lang,
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
        weightHistory: state.weightHistory,
         decisionFatigue: state.decisionFatigue,
        decisionFatigueDate: state.decisionFatigueDate,
        skipStreak: state.skipStreak,
        suggestShortSession: state.suggestShortSession,
        coopMode: state.coopMode,
        friends: state.friends,
        myInviteCode: state.myInviteCode,
        player: state.player,
        subscription: state.subscription,
      }),
    }
  ) as any
);
