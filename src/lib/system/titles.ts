import { Title, PlayerState } from './types';

function isWithinWeek(date: Date): boolean {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff >= 0 && diff <= 7 * 86400000;
}

function computeMovementDays(events: any[]): number {
  const movementDates = new Set<string>();
  events
    .filter((e) => e.type === 'session_complete')
    .forEach((e) => {
      const day = new Date(e.timestamp).toISOString().slice(0, 10);
      movementDates.add(day);
    });
  return movementDates.size;
}

export const TITLES: Title[] = [
  {
    id: 'retorno_monarca',
    name: 'Retorno Monarca',
    description: 'Volviste tras 3+ días sin entrenar y completaste una sesión.',
    icon: 'Crown',
    rarity: 'epic',
  },
  {
    id: 'chispa_minima',
    name: 'Chispa Mínima',
    description: 'Completaste 3 sesiones de 1 minuto en una semana.',
    icon: 'Sparkles',
    rarity: 'rare',
  },
  {
    id: 'variedad_semanal',
    name: 'Variedad Semanal',
    description: 'Entrenaste 4 intensidades distintas en 7 días.',
    icon: 'Activity',
    rarity: 'rare',
  },
  {
    id: 'constancia_silenciosa',
    name: 'Constancia Silenciosa',
    description: '7 días seguidos moviéndote (ventana rodante).',
    icon: 'Footprints',
    rarity: 'epic',
  },
];

export interface TitleUnlockContext {
  lastSessionDate?: string;
  sessionsThisWeek: Array<{ date: string; duration: number }>;
  intensityCounts: Record<string, number>;
  movementDaysInWindow: number;
}

export function evaluateTitles(
  player: PlayerState,
  events: any[]
): string[] {
  const newlyUnlocked: string[] = [];
  const alreadyUnlocked = new Set(Object.keys(player.unlockedTitles));

  // Derivar contexto desde events
  const lastSessionDate = events
    .filter((e) => e.type === 'session_complete')
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp;

  const sessionsThisWeek = events
    .filter((e) => e.type === 'session_complete' && isWithinWeek(new Date(e.timestamp)))
    .map((e) => ({ date: e.timestamp, duration: e.detail?.duration || 1 }));

  const intensityCounts: Record<string, number> = {};
  events
    .filter((e) => e.type === 'session_complete' && isWithinWeek(new Date(e.timestamp)))
    .forEach((e) => {
      const intensity = e.detail?.intensity || 'unknown';
      intensityCounts[intensity] = (intensityCounts[intensity] || 0) + 1;
    });

  const movementDaysInWindow = computeMovementDays(events);

  const context: TitleUnlockContext = {
    lastSessionDate,
    sessionsThisWeek,
    intensityCounts,
    movementDaysInWindow,
  };

  // Retorno Monarca: gap >= 3 días + sesión hoy
  if (
    !alreadyUnlocked.has('retorno_monarca') &&
    context.lastSessionDate
  ) {
    const last = new Date(context.lastSessionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - last.getTime()) / 86400000);
    if (diffDays >= 3) {
      newlyUnlocked.push('retorno_monarca');
    }
  }

  // Chispa Mínima: 3 sesiones de 1 min en 7 días
  if (!alreadyUnlocked.has('chispa_minima')) {
    const oneMinSessions = context.sessionsThisWeek.filter(
      (s) => s.duration <= 1
    ).length;
    if (oneMinSessions >= 3) {
      newlyUnlocked.push('chispa_minima');
    }
  }

  // Variedad Semanal: 4 intensidades en 7 días
  if (!alreadyUnlocked.has('variedad_semanal')) {
    const intensitiesTried = Object.keys(context.intensityCounts).length;
    if (intensitiesTried >= 4) {
      newlyUnlocked.push('variedad_semanal');
    }
  }

  // Constancia Silenciosa: 7 días movimiento en ventana 14
  if (!alreadyUnlocked.has('constancia_silenciosa')) {
    if (context.movementDaysInWindow >= 7) {
      newlyUnlocked.push('constancia_silenciosa');
    }
  }

  return newlyUnlocked;
}
