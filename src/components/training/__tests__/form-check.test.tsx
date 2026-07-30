import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormCheck } from '../form-check';

/* ─── Module-level mocks ─── */
// Same pattern as use-pose.test.tsx: module-level vars + vi.mock factory closures

let _engineStatus: string = 'idle';
let _engineError: string | null = null;

const mockEngine = {
  get status() { return _engineStatus; },
  get isReady() { return _engineStatus === 'ready'; },
  get error() { return _engineError; },
};

vi.mock('@/lib/pose/pose-engine', () => ({
  PoseEngine: {
    getInstance: () => mockEngine,
  },
}));

const mockUsePose = vi.fn();

vi.mock('@/lib/pose/use-pose', () => ({
  usePose: (...args: unknown[]) => mockUsePose(...args),
}));

/* ─── Helpers ─── */

function makePoseMock(overrides: Record<string, unknown> = {}) {
  return {
    status: 'idle',
    videoRef: { current: null },
    canvasRef: { current: null },
    angles: null,
    error: null,
    startCamera: vi.fn().mockResolvedValue(undefined),
    stopCamera: vi.fn(),
    isLoading: false,
    isRealDetection: false,
    ...overrides,
  };
}

/* ─── Tests ─── */

describe('FormCheck', () => {
  const defaultProps = {
    exerciseName: 'Sentadilla',
    muscleGroup: 'legs',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    _engineStatus = 'idle';
    _engineError = null;
    mockUsePose.mockReturnValue(makePoseMock());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── Loading State ──
  describe('loading state', () => {
    it('shows loading spinner on mount', () => {
      render(<FormCheck {...defaultProps} />);
      expect(screen.getByText(/iniciando cámara/i)).toBeInTheDocument();
    });

    it('shows title and close button while loading', () => {
      render(<FormCheck {...defaultProps} />);
      expect(screen.getByText('Análisis de postura')).toBeInTheDocument();
      expect(screen.getByText(/iniciando…/i)).toBeInTheDocument();
    });

    it('shows model loading text when status is loading-model', () => {
      mockUsePose.mockReturnValue(makePoseMock({
        status: 'loading-model',
        isLoading: true,
      }));
      render(<FormCheck {...defaultProps} />);
      expect(screen.getByText(/cargando modelo de ia/i)).toBeInTheDocument();
    });

    it('shows camera info text while loading', () => {
      render(<FormCheck {...defaultProps} />);
      expect(screen.getByText(/se necesita acceso a la cámara/i)).toBeInTheDocument();
    });
  });

  // ── Error State ──
  describe('error state', () => {
    it('shows error screen when startCamera throws', async () => {
      mockUsePose.mockReturnValue(makePoseMock({
        startCamera: vi.fn().mockRejectedValue(new Error('Permission denied')),
        status: 'error',
        error: 'Permission denied',
      }));
      render(<FormCheck {...defaultProps} />);

      await act(async () => { await vi.runAllTimersAsync(); });

      expect(screen.getByText('Cámara no disponible')).toBeInTheDocument();
      expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
      expect(screen.getByText('Reintentar')).toBeInTheDocument();
    });

    it('shows error screen when engine status is unavailable', async () => {
      _engineStatus = 'unavailable';
      _engineError = 'Modelo no disponible';
      render(<FormCheck {...defaultProps} />);

      await act(async () => { await vi.runAllTimersAsync(); });

      expect(screen.getByText('Cámara no disponible')).toBeInTheDocument();
      expect(screen.getByText(/modelo no disponible/i)).toBeInTheDocument();
    });

    it('shows error screen when engine status is error', async () => {
      _engineStatus = 'error';
      _engineError = 'Camera access denied';
      render(<FormCheck {...defaultProps} />);

      await act(async () => { await vi.runAllTimersAsync(); });

      expect(screen.getByText('Cámara no disponible')).toBeInTheDocument();
      expect(screen.getByText(/camera access denied/i)).toBeInTheDocument();
    });

    it('shows troubleshooting accordion in error state', async () => {
      mockUsePose.mockReturnValue(makePoseMock({
        startCamera: vi.fn().mockRejectedValue(new Error('error')),
        status: 'error',
        error: 'error',
      }));
      render(<FormCheck {...defaultProps} />);

      await act(async () => { await vi.runAllTimersAsync(); });

      expect(screen.getByText(/solución de problemas/i)).toBeInTheDocument();
    });

    it('calls onClose when Cerrar is clicked in error state', async () => {
      const onClose = vi.fn();
      mockUsePose.mockReturnValue(makePoseMock({
        startCamera: vi.fn().mockRejectedValue(new Error('error')),
        status: 'error',
        error: 'error',
      }));
      render(<FormCheck {...defaultProps} onClose={onClose} />);

      await act(async () => { await vi.runAllTimersAsync(); });

      fireEvent.click(screen.getByText('Cerrar'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Retry ──
  describe('retry', () => {
    it('calls stopCamera and startCamera when Reintentar is clicked', async () => {
      const stopCamera = vi.fn();
      const startCamera = vi.fn()
        .mockRejectedValueOnce(new Error('error'))
        .mockResolvedValue(undefined);
      mockUsePose.mockReturnValue(makePoseMock({ startCamera, stopCamera, status: 'error', error: 'error' }));
      render(<FormCheck {...defaultProps} />);

      await act(async () => { await vi.runAllTimersAsync(); });

      fireEvent.click(screen.getByText('Reintentar'));
      expect(stopCamera).toHaveBeenCalled();

      await act(async () => { vi.advanceTimersByTime(500); });
      expect(startCamera).toHaveBeenCalledTimes(2);
    });
  });

  // ── Camera Live (no angles) ──
  describe('camera live without detection', () => {
    beforeEach(() => {
      _engineStatus = 'ready';
      mockUsePose.mockReturnValue(makePoseMock({ status: 'ready', isRealDetection: true, angles: null }));
    });

    it('shows LIVE badge, "Buscando persona..." and footer', async () => {
      render(<FormCheck {...defaultProps} />);
      await act(async () => { await vi.runAllTimersAsync(); });
      // LIVE badge in the camera feed overlay (not in score ring, which needs angles)
      expect(screen.getByText('LIVE')).toBeInTheDocument();
      expect(screen.getByText(/buscando persona/i)).toBeInTheDocument();
      expect(screen.getByText(/MediaPipe Pose/i)).toBeInTheDocument();
    });

    it('shows positioning tips when no person detected', async () => {
      render(<FormCheck {...defaultProps} />);
      await act(async () => { await vi.runAllTimersAsync(); });
      expect(screen.getByText(/~1\.5m de distancia/i)).toBeInTheDocument();
      expect(screen.getByText(/buena iluminación/i)).toBeInTheDocument();
    });

    it('shows Reiniciar cámara and Listo buttons', async () => {
      render(<FormCheck {...defaultProps} />);
      await act(async () => { await vi.runAllTimersAsync(); });
      expect(screen.getByText(/reiniciar cámara/i)).toBeInTheDocument();
      expect(screen.getByText('Listo')).toBeInTheDocument();
    });
  });

  // ── Camera Live (with angles) ──
  describe('camera live with pose detection', () => {
    const goodAngles = { knee: 120, hip: 85, shoulder: 80, backOk: true };

    beforeEach(() => {
      _engineStatus = 'ready';
      mockUsePose.mockReturnValue(makePoseMock({ status: 'ready', isRealDetection: true, angles: goodAngles }));
    });

    it('shows exercise name and camera live badge', async () => {
      render(<FormCheck {...defaultProps} />);
      await act(async () => { await vi.runAllTimersAsync(); });
      expect(screen.getByText('Sentadilla')).toBeInTheDocument();
      expect(screen.getByText(/cámara en vivo/i)).toBeInTheDocument();
    });

    it('shows score and cue count', async () => {
      render(<FormCheck {...defaultProps} />);
      await act(async () => { await vi.runAllTimersAsync(); });
      expect(screen.getByText(/5\/5 en rango/i)).toBeInTheDocument();
    });

    it('shows angle indicators', async () => {
      render(<FormCheck {...defaultProps} />);
      await act(async () => { await vi.runAllTimersAsync(); });
      expect(screen.getByText(/K120°/)).toBeInTheDocument();
      expect(screen.getByText(/H85°/)).toBeInTheDocument();
      expect(screen.getByText(/S80°/)).toBeInTheDocument();
    });

    it('shows correct score for poor form angles', async () => {
      _engineStatus = 'ready';
      mockUsePose.mockReturnValue(makePoseMock({
        status: 'ready', isRealDetection: true,
        angles: { knee: 85, hip: 110, shoulder: 50, backOk: false },
      }));
      render(<FormCheck {...defaultProps} />);
      await act(async () => { await vi.runAllTimersAsync(); });
      expect(screen.getByText(/1\/5 en rango/i)).toBeInTheDocument();
    });

    it('calls onClose when Listo is clicked', async () => {
      const onClose = vi.fn();
      render(<FormCheck {...defaultProps} onClose={onClose} />);
      await act(async () => { await vi.runAllTimersAsync(); });
      fireEvent.click(screen.getByText('Listo'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Close Button ──
  describe('close button', () => {
    it('calls onClose when X is clicked in loading state', () => {
      const onClose = vi.fn();
      render(<FormCheck {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getAllByRole('button')[0]);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when X is clicked in real state', async () => {
      const onClose = vi.fn();
      _engineStatus = 'ready';
      mockUsePose.mockReturnValue(makePoseMock({
        status: 'ready', isRealDetection: true,
        angles: { knee: 120, hip: 85, shoulder: 80, backOk: true },
      }));
      render(<FormCheck {...defaultProps} onClose={onClose} />);
      await act(async () => { await vi.runAllTimersAsync(); });
      fireEvent.click(screen.getAllByRole('button')[0]);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── No simulated data ──
  describe('no simulated data', () => {
    it('never shows "modo simulado" text', () => {
      render(<FormCheck {...defaultProps} />);
      expect(screen.queryByText(/simulado/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/simulación/i)).not.toBeInTheDocument();
    });

    it('never shows simulated warning banner', () => {
      render(<FormCheck {...defaultProps} />);
      expect(screen.queryByText(/cámara no disponible.*simulación/i)).not.toBeInTheDocument();
    });
  });
});
