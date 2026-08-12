import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useStore } from '@/lib/store';
import { todayKey } from '@/lib/utils/helpers';
import { ProfileScreen } from '@/components/profile/profile-screen';
import { LogrosScreen } from '@/components/awards/logros-screen';

const mocks = vi.hoisted(() => ({
  push: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/sync/supabase-sync', () => ({
  supabaseSync: { push: mocks.push },
}));

const mockProfile = {
  user_id: '', name: 'Ana', goal: 'energia' as const, level: 'medio' as const,
  equipment: 'ninguno' as const, limitations: [], days_per_week: '2-3' as const,
  neurotype: 'adh-c' as const, preferred_duration: 20,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

const mockTwin = {
  user_id: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  training_style: 'adaptive' as const, motivation_style: 'data' as const,
  avoid: [], best_time: '',
  patterns: { completion_rate: 0.5, avg_duration: 20, abandon_rate: 0.2, best_hours: {} },
  ex_progress: {}, motiv_weights: { data: 1, energy: 1, direct: 1, calm: 1 },
};

function setStore(overrides: Record<string, unknown> = {}) {
  useStore.setState({
    onboarded: true,
    profile: mockProfile,
    twin: mockTwin,
    prefs: { reduceMotion: false, highContrast: false, fontLarge: false, hideStreaks: false },
    lang: 'es',
    checkins: {},
    workouts: [],
    chat: [],
    achievements: {},
    questState: {
      selectedTheme: 'fitness_iniciacion', vaultClaims: {}, bossDefeatedThisWeek: false,
      bossDefeatedCount: 0, lastBossDefeatDate: null,
    },
    ...overrides,
  });
}

beforeEach(() => {
  setStore();
  mocks.push.mockClear();
});

describe('ProfileScreen · Tu cuerpo', () => {
  it('imperial es el sistema por defecto (lb · ft/in)', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Tu cuerpo')).toBeInTheDocument();
    // Toggle imperial preseleccionado
    expect(screen.getByRole('button', { name: /imperial/i })).toHaveAttribute('aria-pressed', 'true');
    // Campos imperiales visibles
    expect(document.getElementById('body-weight')).toBeInTheDocument();
    expect(document.getElementById('body-height-ft')).toBeInTheDocument();
    expect(document.getElementById('body-height-in')).toBeInTheDocument();
    expect(document.getElementById('body-height')).toBeNull(); // no cm en imperial
    expect(screen.getByText('Sexo')).toBeInTheDocument();
  });

  it('guarda medidas en métrico canónico y crea la entrada de hoy', () => {
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Mujer' }));
    fireEvent.change(document.getElementById('body-weight')!, { target: { value: '132' } });
    fireEvent.change(document.getElementById('body-height-ft')!, { target: { value: '5' } });
    fireEvent.change(document.getElementById('body-height-in')!, { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    // Feedback visual
    expect(screen.getByText('Medidas guardadas')).toBeInTheDocument();

    // Store actualizado con canónico métrico: 132 lb ≈ 59.9 kg, 5'7" ≈ 170.2 cm
    const profile = useStore.getState().profile;
    expect(profile?.sex).toBe('femenino');
    expect(profile?.weight_kg).toBeCloseTo(59.9, 0);
    expect(profile?.height_cm).toBeCloseTo(170.2, 0);
    expect(profile?.units).toBe('imperial');

    // Historial: guardar peso crea la entrada de hoy
    const history = useStore.getState().weightHistory;
    expect(history.length).toBe(1);
    expect(history[0].date).toBe(todayKey());
    expect(history[0].weight_kg).toBeCloseTo(59.9, 0);

    // Sync con el perfil y el historial nuevos (los logros ya no dependen del peso)
    expect(mocks.push).toHaveBeenCalledWith(
      expect.objectContaining({ weightHistory: expect.arrayContaining([expect.objectContaining({ weight_kg: expect.any(Number) })]) })
    );
  });

  it('guardar peso el mismo día actualiza la entrada en vez de duplicarla', () => {
    render(<ProfileScreen />);
    // Tras guardar, el botón muestra 'Medidas guardadas' ~2.2s; ambos estados son el mismo botón
    const saveBtn = () => screen.getByRole('button', { name: /guardar cambios|medidas guardadas/i });
    fireEvent.change(document.getElementById('body-weight')!, { target: { value: '132' } });
    fireEvent.click(saveBtn());

    fireEvent.change(document.getElementById('body-weight')!, { target: { value: '130' } });
    fireEvent.click(saveBtn());

    const history = useStore.getState().weightHistory;
    expect(history.length).toBe(1); // upsert por fecha
    expect(history[0].weight_kg).toBeCloseTo(59, 0); // 130 lb ≈ 59 kg
  });

  it('muestra el historial de peso con gráfico y resumen', () => {
    setStore({
      profile: { ...mockProfile, weight_kg: 78, height_cm: 175, units: 'imperial' },
      weightHistory: [
        { date: '2026-01-01', weight_kg: 80 },
        { date: '2026-01-08', weight_kg: 79.5 },
        { date: '2026-01-15', weight_kg: 78 },
      ],
    });
    render(<ProfileScreen />);

    expect(screen.getByText('Historial de peso')).toBeInTheDocument();
    // Inicio ≈ 176.4 lb · Actual ≈ 172 lb · Delta ▼4.4 lb (imperial)
    // (los valores aparecen en el resumen y en las filas de la lista)
    expect(screen.getAllByText('176.4 lb').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('172 lb').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('▼ 4.4 lb')).toBeInTheDocument();
    // Las 3 entradas con su fecha
    expect(screen.getAllByText(/ene|jan/i).length).toBeGreaterThanOrEqual(3);
  });

  it('borrar una entrada la elimina y propaga el borrado al sync', () => {
    setStore({
      profile: { ...mockProfile, weight_kg: 78, height_cm: 175, units: 'imperial' },
      weightHistory: [
        { date: '2026-01-01', weight_kg: 80 },
        { date: '2026-01-08', weight_kg: 79.5 },
      ],
    });
    render(<ProfileScreen />);

    mocks.push.mockClear();
    const removeBtns = screen.getAllByRole('button', { name: /eliminar entrada/i });
    // La primera en el DOM es la más reciente (2026-01-08)
    fireEvent.click(removeBtns[0]);

    expect(useStore.getState().weightHistory).toHaveLength(1);
    expect(useStore.getState().weightHistory[0].date).toBe('2026-01-01');
    expect(mocks.push).toHaveBeenCalledWith(
      expect.objectContaining({ weightHistoryDeleted: ['2026-01-08'] })
    );
  });

  it('al pasar a métrico convierte los valores a kg y cm', () => {
    render(<ProfileScreen />);
    fireEvent.change(document.getElementById('body-weight')!, { target: { value: '132' } });
    fireEvent.change(document.getElementById('body-height-ft')!, { target: { value: '5' } });
    fireEvent.change(document.getElementById('body-height-in')!, { target: { value: '7' } });

    fireEvent.click(screen.getByRole('button', { name: /m[eé]trico/i }));

    // Peso convertido ~59.9 kg y campo único de cm con ~170.2
    const weight = document.getElementById('body-weight') as HTMLInputElement;
    expect(weight.value).toBe('59.9');
    const cm = document.getElementById('body-height') as HTMLInputElement;
    expect(cm).toBeInTheDocument();
    expect(cm.value).toBe('170.2');
    expect(document.getElementById('body-height-ft')).toBeNull();
  });

  it('deja sexo vacío al deseleccionar y guarda undefined', () => {
    setStore({
      profile: { ...mockProfile, sex: 'masculino', weight_kg: 80, height_cm: 180, units: 'imperial' },
    });
    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Hombre' }));
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    expect(useStore.getState().profile?.sex).toBeUndefined();
  });
});

describe('LogrosScreen · Movimiento (sin gamificar el cuerpo)', () => {
  it('la categoría Movimiento y sus logros siempre están visible', () => {
    render(<LogrosScreen />);
    // Los datos corporales ya no se gamifican: no hay tarjeta ni logros de cuerpo
    expect(screen.queryByText('Tu cuerpo')).not.toBeInTheDocument();
    expect(screen.queryByText('Cuerpo')).not.toBeInTheDocument();
    expect(screen.queryByText('Báscula')).not.toBeInTheDocument();
    expect(screen.queryByText('Ficha completa')).not.toBeInTheDocument();
    // La categoría Movimiento se ve por defecto con sus recompensas
    expect(screen.getByText('Movimiento')).toBeInTheDocument();
    expect(screen.getByText('Ritmo de movimiento')).toBeInTheDocument();
    expect(screen.getByText('Explorador de rutinas')).toBeInTheDocument();
    expect(screen.getByText('Mini victoria')).toBeInTheDocument();
    // 'desbloquead' aparece en al menos un lugar (getAllByText returns array for multiple matches)
    expect(screen.getAllByText((content) => content.includes('desbloquead')).length).toBeGreaterThan(0);
  });

  it('registrar medidas ya no desbloquea recompensas (el cuerpo no se juega)', () => {
    setStore({
      profile: {
        ...mockProfile,
        sex: 'femenino', weight_kg: 60, height_cm: 170, units: 'imperial',
      },
    });
    render(<LogrosScreen />);
    expect(screen.queryByText('Báscula')).not.toBeInTheDocument();
    expect(screen.queryByText('Ficha completa')).not.toBeInTheDocument();
    expect(screen.getAllByText((content) => content.includes('desbloquead')).length).toBeGreaterThan(0);
    // Los logros de movimiento siguen presentes
    expect(screen.getByText('Ritmo de movimiento')).toBeInTheDocument();
  });
});

describe('ProfileScreen · Accesibilidad', () => {
  it('toggle autoplay del flipbook persiste en el store', () => {
    render(<ProfileScreen />);
    const toggle = screen.getByRole('switch', { name: 'Autoplay del flipbook' });
    // Estado efectivo por defecto: ON (el flipbook lee undefined ?? true) — el
    // toggle no muestra un falso OFF para prefs aún sin definir
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(toggle);
    expect(useStore.getState().prefs.explainerAutoplay).toBe(false);

    fireEvent.click(screen.getByRole('switch', { name: 'Autoplay del flipbook' }));
    expect(useStore.getState().prefs.explainerAutoplay).toBe(true);
  });
});
