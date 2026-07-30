'use client';

/**
 * PoseEngine — Real-time pose detection browser engine
 * Uses MediaPipe PoseLandmarker via @mediapipe/tasks-vision (loaded from CDN)
 * Manages camera stream, detects 33 landmarks, and computes joint angles.
 *
 * Singleton: one instance shared across the app.
 */

/* ─── Types ─── */

export interface DetectedAngles {
  knee: number;     // Left or right knee angle (hip → knee → ankle)
  hip: number;      // Left or right hip angle (shoulder → hip → knee)
  shoulder: number; // Shoulder angle (elbow → shoulder → hip)
  backOk: boolean;  // Whether back posture is neutral
}

export interface PoseResult {
  angles: DetectedAngles;
  landmarks: NormalizedLandmark[];
  timestamp: number;
}

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export type EngineStatus = 'idle' | 'loading-model' | 'loading-camera' | 'ready' | 'error' | 'unavailable';

export type EngineEventCallback = {
  onStatusChange: (status: EngineStatus) => void;
  onResult: (result: PoseResult) => void;
  onError: (error: string) => void;
};

/* ─── MediaPipe CDN URLs ─── */

const TASKS_VISION_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

/* ─── MediaPipe landmark indices ─── */

const LANDMARK = {
  NOSE: 0,
  LEFT_EYE: 1,
  RIGHT_EYE: 2,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

/* ─── Helpers ─── */

function calcAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
  if (magBA === 0 || magBC === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function chooseSide(landmarks: NormalizedLandmark[]): 'left' | 'right' {
  const lSh = landmarks[LANDMARK.LEFT_SHOULDER];
  const rSh = landmarks[LANDMARK.RIGHT_SHOULDER];
  if (!lSh || !rSh) return 'left';
  // Pick the side with higher visibility / closer to camera (higher z = closer)
  const lVis = lSh.visibility ?? 0;
  const rVis = rSh.visibility ?? 0;
  return lVis >= rVis ? 'left' : 'right';
}

function computeAngles(landmarks: NormalizedLandmark[]): DetectedAngles {
  const side = chooseSide(landmarks);

  const shoulderIdx = side === 'left' ? LANDMARK.LEFT_SHOULDER : LANDMARK.RIGHT_SHOULDER;
  const hipIdx = side === 'left' ? LANDMARK.LEFT_HIP : LANDMARK.RIGHT_HIP;
  const kneeIdx = side === 'left' ? LANDMARK.LEFT_KNEE : LANDMARK.RIGHT_KNEE;
  const ankleIdx = side === 'left' ? LANDMARK.LEFT_ANKLE : LANDMARK.RIGHT_ANKLE;
  const elbowIdx = side === 'left' ? LANDMARK.LEFT_ELBOW : LANDMARK.RIGHT_ELBOW;

  const shoulder = landmarks[shoulderIdx];
  const hip = landmarks[hipIdx];
  const knee = landmarks[kneeIdx];
  const ankle = landmarks[ankleIdx];
  const elbow = landmarks[elbowIdx];

  if (!shoulder || !hip || !knee || !ankle) {
    return { knee: 160, hip: 90, shoulder: 90, backOk: true };
  }

  const kneeAngle = calcAngle(hip, knee, ankle);
  const hipAngle = calcAngle(shoulder, hip, knee);
  const shoulderAngle = elbow ? calcAngle(elbow, shoulder, hip) : 90;

  // Back posture: check if hip and shoulder are roughly vertical aligned
  // In a side view, good posture means shoulder x ≈ hip x (within a threshold)
  const dx = Math.abs(shoulder.x - hip.x);
  const backOk = dx < 0.12; // normalized coordinate threshold

  return {
    knee: Math.round(kneeAngle),
    hip: Math.round(hipAngle),
    shoulder: Math.round(shoulderAngle),
    backOk,
  };
}

/* ─── Singleton Engine ─── */

export class PoseEngine {
  private static INSTANCE: PoseEngine | null = null;

  private _status: EngineStatus = 'idle';
  private _error: string | null = null;
  private _poseLandmarker: any = null;
  private _videoEl: HTMLVideoElement | null = null;
  private _stream: MediaStream | null = null;
  private _rafId: number | null = null;
  private _lastFrameTime = -1;
  private _callbacks: EngineEventCallback[] = [];
  private _loadPromise: Promise<void> | null = null;
  private _canvas: HTMLCanvasElement | null = null;

  private constructor() {}

  static getInstance(): PoseEngine {
    if (!PoseEngine.INSTANCE) {
      PoseEngine.INSTANCE = new PoseEngine();
    }
    return PoseEngine.INSTANCE;
  }

  /* ─── Getters ─── */

  get status(): EngineStatus { return this._status; }
  get error(): string | null { return this._error; }
  get isReady(): boolean { return this._status === 'ready'; }
  get videoEl(): HTMLVideoElement | null { return this._videoEl; }
  get canvas(): HTMLCanvasElement | null { return this._canvas; }

  setCanvas(canvas: HTMLCanvasElement | null) {
    this._canvas = canvas;
  }

  /* ─── Events ─── */

  subscribe(cb: EngineEventCallback): () => void {
    this._callbacks.push(cb);
    return () => {
      this._callbacks = this._callbacks.filter(c => c !== cb);
    };
  }

  private _emit(event: 'status' | 'result' | 'error', data: any) {
    for (const cb of this._callbacks) {
      try {
        if (event === 'status') cb.onStatusChange(data);
        else if (event === 'result') cb.onResult(data);
        else if (event === 'error') cb.onError(data);
      } catch { /* ignore */ }
    }
  }

  private _setStatus(s: EngineStatus) {
    this._status = s;
    this._emit('status', s);
  }

  /* ─── Model Loading ─── */

  async loadModel(): Promise<void> {
    if (this._status === 'ready' || this._status === 'loading-model') return;
    if (this._loadPromise) return this._loadPromise;

    this._loadPromise = this._doLoadModel();
    return this._loadPromise;
  }

  private async _doLoadModel(): Promise<void> {
    this._setStatus('loading-model');
    this._error = null;

    try {
      // Dynamic import from CDN (same pattern as local-llm.ts)
      const mod: any = await new Function(
        `return import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm/vision_bundle.js")`
      )();

      const vision = await mod.FilesetResolver.forVisionTasks(TASKS_VISION_CDN);

      this._poseLandmarker = await mod.PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: POSE_MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this._setStatus('idle');
    } catch (err: any) {
      console.warn('PoseLandmarker load failed:', err);
      this._setStatus('unavailable');
      this._error = 'Modelo de IA para detección de postura no disponible. Verifica la conexión o recarga la página.';
      this._emit('error', this._error);
      throw err;
    }
  }

  /* ─── Camera ─── */

  async startCamera(videoEl: HTMLVideoElement): Promise<void> {
    if (this._stream) {
      await this.stopCamera();
    }

    this._setStatus('loading-camera');
    this._videoEl = videoEl;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      this._stream = stream;
      videoEl.srcObject = stream;
      videoEl.setAttribute('playsinline', 'true');

      await new Promise<void>((resolve) => {
        videoEl.onloadedmetadata = () => {
          videoEl.play();
          resolve();
        };
      });

      // Wait for model if not loaded
      if (!this._poseLandmarker) {
        try {
          await this.loadModel();
        } catch {
          // Model failed — _doLoadModel already set status to 'unavailable'
          // Camera stream is active, but no pose model for landmark detection
        }
      }

      // Only transition to 'ready' if the model actually loaded
      if (this._poseLandmarker) {
        this._setStatus('ready');
        this._startDetectionLoop();
      }
      // If _poseLandmarker is still null, status stays as 'unavailable' (set by _doLoadModel)
      // Camera stream is active but no landmark detection will happen
    } catch (err: any) {
      this._setStatus('error');
      this._error = err?.message ?? 'Error al acceder a la cámara';
      this._emit('error', this._error);
      throw err;
    }
  }

  async stopCamera(): Promise<void> {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._stream) {
      this._stream.getTracks().forEach(t => t.stop());
      this._stream = null;
    }
    if (this._videoEl) {
      this._videoEl.srcObject = null;
      this._videoEl = null;
    }
    this._lastFrameTime = -1;
    this._setStatus('idle');
  }

  /* ─── Detection Loop ─── */

  private _startDetectionLoop() {
    const loop = () => {
      if (!this._videoEl || !this._poseLandmarker) {
        this._rafId = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();

      if (this._videoEl.currentTime !== this._lastFrameTime) {
        this._lastFrameTime = this._videoEl.currentTime;
        const result = this._poseLandmarker.detectForVideo(this._videoEl, now);

        if (result.landmarks && result.landmarks.length > 0) {
          const landmarks = result.landmarks[0] as NormalizedLandmark[];
          const angles = computeAngles(landmarks);

          // Draw landmarks on canvas
          this._drawLandmarks(landmarks);

          this._emit('result', { angles, landmarks, timestamp: now });
        }
      }

      this._rafId = requestAnimationFrame(loop);
    };

    this._rafId = requestAnimationFrame(loop);
  }

  /* ─── Drawing ─── */

  private _drawLandmarks(landmarks: NormalizedLandmark[]) {
    const canvas = this._canvas;
    const video = this._videoEl;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Connections (MediaPipe Pose skeleton edges)
    const connections: [number, number][] = [
      [0, 1], [1, 2], [0, 2], // face
      [11, 12], // shoulders
      [11, 23], [12, 24], // torso
      [11, 13], [13, 15], // left arm
      [12, 14], [14, 16], // right arm
      [23, 25], [25, 27], // left leg
      [24, 26], [26, 28], // right leg
      [23, 24], // hips
    ];

    // Draw connections
    ctx.strokeStyle = 'rgba(0, 212, 170, 0.6)';
    ctx.lineWidth = 2;
    for (const [i, j] of connections) {
      const a = landmarks[i];
      const b = landmarks[j];
      if (a && b && a.visibility > 0.5 && b.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
        ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
        ctx.stroke();
      }
    }

    // Draw landmarks
    const jointIndices = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    for (const idx of jointIndices) {
      const lm = landmarks[idx];
      if (lm && lm.visibility > 0.5) {
        ctx.beginPath();
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(76, 201, 240, 0.9)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Angle labels
    const angles = this._lastAngles;
    if (angles) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '10px JetBrains Mono, monospace';
      const knee = landmarks[LANDMARK.LEFT_KNEE] || landmarks[LANDMARK.RIGHT_KNEE];
      const hip = landmarks[LANDMARK.LEFT_HIP] || landmarks[LANDMARK.RIGHT_HIP];
      if (knee && knee.visibility > 0.5) {
        ctx.fillText(`${angles.knee}°`, knee.x * canvas.width + 8, knee.y * canvas.height - 4);
      }
      if (hip && hip.visibility > 0.5) {
        ctx.fillText(`${angles.hip}°`, hip.x * canvas.width + 8, hip.y * canvas.height - 4);
      }
    }
  }

  private _lastAngles: DetectedAngles | null = null;
  set lastAngles(a: DetectedAngles | null) { this._lastAngles = a; }

  /* ─── Cleanup ─── */

  dispose() {
    this.stopCamera();
    this._callbacks = [];
    this._poseLandmarker = null;
    this._loadPromise = null;
    this._status = 'idle';
    PoseEngine.INSTANCE = null;
  }
}
