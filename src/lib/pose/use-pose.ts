'use client';

/**
 * usePose — React hook wrapping PoseEngine for reactive pose detection.
 *
 * Usage:
 *   const { status, videoRef, canvasRef, angles, startCamera, stopCamera, error } = usePose();
 *
 * Returns camera status, a <video> ref and a <canvas> ref for rendering,
 * computed joint angles, and controls.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  PoseEngine,
  type EngineStatus,
  type DetectedAngles,
  type PoseResult,
} from './pose-engine';

export type PoseStatus = EngineStatus;
export type { DetectedAngles };

export interface UsePoseReturn {
  /** Current engine status */
  status: PoseStatus;
  /** Ref to attach to a <video> element for camera feed */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Ref to attach to a <canvas> element for landmark overlay */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Latest detected joint angles */
  angles: DetectedAngles | null;
  /** Error message if any */
  error: string | null;
  /** Start the camera + pose detection */
  startCamera: () => Promise<void>;
  /** Stop camera and detection */
  stopCamera: () => void;
  /** Whether the engine is in a loading state */
  isLoading: boolean;
  /** Whether real pose detection is available (model loaded) */
  isRealDetection: boolean;
}

export function usePose(): UsePoseReturn {
  const [status, setStatus] = useState<PoseStatus>('idle');
  const [angles, setAngles] = useState<DetectedAngles | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PoseEngine | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // Initialize engine once
  useEffect(() => {
    const engine = PoseEngine.getInstance();
    engineRef.current = engine;

    // Set canvas on engine
    if (canvasRef.current) {
      engine.setCanvas(canvasRef.current);
    }

    // Subscribe to events
    const unsub = engine.subscribe({
      onStatusChange: (s) => {
        setStatus(s);
        if (s === 'ready' || s === 'idle') setError(null);
      },
      onResult: (result: PoseResult) => {
        setAngles(result.angles);
        engine.lastAngles = result.angles;
      },
      onError: (err: string) => {
        setError(err);
      },
    });
    unsubRef.current = unsub;

    return () => {
      unsub();
      engineRef.current = null;
    };
  }, []);

  // Sync canvas ref to engine whenever it mounts
  useEffect(() => {
    if (engineRef.current && canvasRef.current) {
      engineRef.current.setCanvas(canvasRef.current);
    }
  }, []);

  const startCamera = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    const video = videoRef.current;
    if (!video) return;

    try {
      // Pre-load the model first
      engine.loadModel().catch(() => {
        // Model unavailable — camera will still show feed but without landmark detection
      });

      await engine.startCamera(video);
    } catch (err: any) {
      setError(err?.message ?? 'Error al iniciar cámara');
      setStatus('error');
    }
  }, []);

  const stopCamera = useCallback(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.stopCamera();
    }
    setAngles(null);
  }, []);

  const isLoading = status === 'loading-model' || status === 'loading-camera';
  const isRealDetection = status === 'ready';

  return {
    status,
    videoRef,
    canvasRef,
    angles,
    error,
    startCamera,
    stopCamera,
    isLoading,
    isRealDetection,
  };
}
