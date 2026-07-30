import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePose, type DetectedAngles } from '../use-pose';
import type { EngineStatus, NormalizedLandmark } from '../pose-engine';

/* ─── Module-level mock state ─── */
// These MUST be module-level (not inside beforeEach) because vi.mock is hoisted
// and its closure captures these variable bindings.

let mockSubscribeFn: ReturnType<typeof vi.fn>;
let mockStartCameraFn: ReturnType<typeof vi.fn>;
let mockStopCameraFn: ReturnType<typeof vi.fn>;
let mockLoadModelFn: ReturnType<typeof vi.fn>;
let mockSetCanvasFn: ReturnType<typeof vi.fn>;
let mockUnsubscribeFn: () => void;
let _status: EngineStatus = 'idle';
let _lastAngles: DetectedAngles | null = null;

// The mock engine object is rebuilt each test via beforeEach assignments to these
let mockEngine: {
  subscribe: ReturnType<typeof vi.fn>;
  startCamera: ReturnType<typeof vi.fn>;
  stopCamera: ReturnType<typeof vi.fn>;
  loadModel: ReturnType<typeof vi.fn>;
  setCanvas: ReturnType<typeof vi.fn>;
  status: EngineStatus;
  isReady: boolean;
  lastAngles: DetectedAngles | null;
};

vi.mock('../pose-engine', () => ({
  PoseEngine: {
    getInstance: () => mockEngine,
  },
}));

/** Store the subscribe callback outside the mock fn to avoid TS _cb issues */
let subscribeCallback: any = null;

/** Rebuild mockEngine with fresh fns for each test */
function resetMocks() {
  subscribeCallback = null;
  mockUnsubscribeFn = vi.fn();
  mockSubscribeFn = vi.fn((cb: any) => {
    subscribeCallback = cb;
    return mockUnsubscribeFn;
  });
  mockStartCameraFn = vi.fn().mockResolvedValue(undefined);
  mockStopCameraFn = vi.fn().mockResolvedValue(undefined);
  mockLoadModelFn = vi.fn().mockResolvedValue(undefined);
  mockSetCanvasFn = vi.fn();
  _status = 'idle';
  _lastAngles = null;

  mockEngine = {
    subscribe: mockSubscribeFn,
    startCamera: mockStartCameraFn,
    stopCamera: mockStopCameraFn,
    loadModel: mockLoadModelFn,
    setCanvas: mockSetCanvasFn,
    get status() { return _status; },
    get isReady() { return _status === 'ready'; },
    set lastAngles(a: DetectedAngles | null) { _lastAngles = a; },
    get lastAngles() { return _lastAngles; },
  };
}

beforeEach(() => {
  resetMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  _status = 'idle';
  _lastAngles = null;
});

/* ─── Helpers to trigger engine callbacks ─── */

function emitStatus(s: EngineStatus) {
  _status = s;
  if (subscribeCallback) subscribeCallback.onStatusChange(s);
}

function emitResult(angles: DetectedAngles) {
  if (subscribeCallback) {
    const landmarks: NormalizedLandmark[] = [];
    for (let i = 0; i < 33; i++) landmarks.push({ x: 0, y: 0, z: 0, visibility: 0 });
    subscribeCallback.onResult({ angles, landmarks, timestamp: Date.now() });
  }
}

function emitError(msg: string) {
  if (subscribeCallback) subscribeCallback.onError(msg);
}

/* ─── Tests ─── */

describe('usePose', () => {
  // ── Initial State ──
  describe('initial state', () => {
    it('starts with idle status', () => {
      const { result } = renderHook(() => usePose());
      expect(result.current.status).toBe('idle');
    });

    it('starts with null angles', () => {
      const { result } = renderHook(() => usePose());
      expect(result.current.angles).toBeNull();
    });

    it('starts with null error', () => {
      const { result } = renderHook(() => usePose());
      expect(result.current.error).toBeNull();
    });

    it('starts with isLoading false', () => {
      const { result } = renderHook(() => usePose());
      expect(result.current.isLoading).toBe(false);
    });

    it('starts with isRealDetection false', () => {
      const { result } = renderHook(() => usePose());
      expect(result.current.isRealDetection).toBe(false);
    });

    it('returns refs for video and canvas', () => {
      const { result } = renderHook(() => usePose());
      expect(result.current.videoRef).toBeDefined();
      expect(result.current.videoRef.current).toBeNull();
      expect(result.current.canvasRef).toBeDefined();
      expect(result.current.canvasRef.current).toBeNull();
    });
  });

  // ── Engine Subscription ──
  describe('engine subscription', () => {
    it('subscribes to engine events on mount', () => {
      renderHook(() => usePose());
      expect(mockSubscribeFn).toHaveBeenCalledTimes(1);
      expect(mockSubscribeFn).toHaveBeenCalledWith(
        expect.objectContaining({
          onStatusChange: expect.any(Function),
          onResult: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('unsubscribes on unmount', () => {
      const { unmount } = renderHook(() => usePose());
      unmount();
      expect(mockUnsubscribeFn).toHaveBeenCalledTimes(1);
    });
  });

  // ── Status Changes ──
  describe('status changes', () => {
    it('updates status when engine emits loading-model', () => {
      const { result } = renderHook(() => usePose());
      act(() => emitStatus('loading-model'));
      expect(result.current.status).toBe('loading-model');
    });

    it('updates status when engine emits ready', () => {
      const { result } = renderHook(() => usePose());
      act(() => emitStatus('ready'));
      expect(result.current.status).toBe('ready');
    });

    it('updates status when engine emits error', () => {
      const { result } = renderHook(() => usePose());
      act(() => emitStatus('error'));
      expect(result.current.status).toBe('error');
    });

    it('clears error when status becomes ready', () => {
      const { result } = renderHook(() => usePose());
      act(() => emitError('some error'));
      expect(result.current.error).toBe('some error');
      act(() => emitStatus('ready'));
      expect(result.current.error).toBeNull();
    });

    it('clears error when status becomes idle', () => {
      const { result } = renderHook(() => usePose());
      act(() => emitError('some error'));
      act(() => emitStatus('idle'));
      expect(result.current.error).toBeNull();
    });
  });

  // ── Result Events ──
  describe('result events', () => {
    it('updates angles when engine emits a result', () => {
      const { result } = renderHook(() => usePose());
      const testAngles: DetectedAngles = { knee: 120, hip: 90, shoulder: 75, backOk: true };
      act(() => emitResult(testAngles));
      expect(result.current.angles).toEqual(testAngles);
    });

    it('syncs lastAngles on the engine when receiving a result', () => {
      renderHook(() => usePose());
      const testAngles: DetectedAngles = { knee: 150, hip: 100, shoulder: 80, backOk: false };
      act(() => emitResult(testAngles));
      expect(_lastAngles).toEqual(testAngles);
    });

    it('replaces angles on each new result', () => {
      const { result } = renderHook(() => usePose());
      act(() => emitResult({ knee: 180, hip: 170, shoulder: 90, backOk: true }));
      act(() => emitResult({ knee: 90, hip: 80, shoulder: 70, backOk: false }));
      expect(result.current.angles).toEqual({ knee: 90, hip: 80, shoulder: 70, backOk: false });
    });
  });

  // ── Error Events ──
  describe('error events', () => {
    it('updates error when engine emits an error', () => {
      const { result } = renderHook(() => usePose());
      act(() => emitError('Camera not found'));
      expect(result.current.error).toBe('Camera not found');
    });

    it('does not clear error on non-ready/idle status', () => {
      const { result } = renderHook(() => usePose());
      act(() => emitError('some error'));
      act(() => emitStatus('loading-model'));
      expect(result.current.error).toBe('some error'); // persists
      act(() => emitStatus('ready'));
      expect(result.current.error).toBeNull(); // cleared on ready
    });
  });

  // ── isLoading / isRealDetection ──
  describe('computed states', () => {
    it('isLoading is true when loading model', () => {
      const { result } = renderHook(() => usePose());
      act(() => emitStatus('loading-model'));
      expect(result.current.isLoading).toBe(true);
    });

    it('isLoading is true when loading camera', () => {
      const { result } = renderHook(() => usePose());
      act(() => emitStatus('loading-camera'));
      expect(result.current.isLoading).toBe(true);
    });

    it('isLoading is false when ready', () => {
      const { result } = renderHook(() => usePose());
      act(() => emitStatus('ready'));
      expect(result.current.isLoading).toBe(false);
    });

    it('isRealDetection is true when ready', () => {
      const { result } = renderHook(() => usePose());
      act(() => emitStatus('ready'));
      expect(result.current.isRealDetection).toBe(true);
    });

    it('isRealDetection is false when not ready', () => {
      const { result } = renderHook(() => usePose());
      act(() => emitStatus('loading-model'));
      expect(result.current.isRealDetection).toBe(false);
      act(() => emitStatus('error'));
      expect(result.current.isRealDetection).toBe(false);
    });
  });

  // ── startCamera ──
  describe('startCamera', () => {
    it('calls engine.loadModel and engine.startCamera with video ref', async () => {
      const { result } = renderHook(() => usePose());
      const video = document.createElement('video');
      (result.current.videoRef as any).current = video;

      await act(async () => {
        await result.current.startCamera();
      });

      expect(mockLoadModelFn).toHaveBeenCalledTimes(1);
      expect(mockStartCameraFn).toHaveBeenCalledTimes(1);
      expect(mockStartCameraFn).toHaveBeenCalledWith(video);
    });

    it('handles camera start error gracefully', async () => {
      mockStartCameraFn.mockRejectedValueOnce(new Error('Permission denied'));
      const { result } = renderHook(() => usePose());
      const video = document.createElement('video');
      (result.current.videoRef as any).current = video;

      await act(async () => {
        await result.current.startCamera();
      });

      expect(result.current.error).toBe('Permission denied');
      expect(result.current.status).toBe('error');
    });

    it('does not throw when engine ref is null (edge case)', async () => {
      // Simulate edge case where engineRef.current is null
      // (normally populated by effect, but we can still call startCamera safely)
      const { result } = renderHook(() => usePose());
      await expect(result.current.startCamera()).resolves.toBeUndefined();
    });
  });

  // ── stopCamera ──
  describe('stopCamera', () => {
    it('calls engine.stopCamera and clears angles', () => {
      const { result } = renderHook(() => usePose());
      act(() => emitResult({ knee: 120, hip: 90, shoulder: 75, backOk: true }));
      expect(result.current.angles).not.toBeNull();

      act(() => {
        result.current.stopCamera();
      });

      expect(mockStopCameraFn).toHaveBeenCalledTimes(1);
      expect(result.current.angles).toBeNull();
    });
  });
});
