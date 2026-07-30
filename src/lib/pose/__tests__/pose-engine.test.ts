import { describe, it, expect } from 'vitest';
import type { NormalizedLandmark } from '../pose-engine';

// We import the functions directly by re-implementing them for testing
// since they're module-private (not exported) in pose-engine.ts

/* ─── Re-implement helpers for testing ─── */

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

function chooseSide(landmarks: NormalizedLandmark[]): 'left' | 'right' {
  const lSh = landmarks[LANDMARK.LEFT_SHOULDER];
  const rSh = landmarks[LANDMARK.RIGHT_SHOULDER];
  if (!lSh || !rSh) return 'left';
  const lVis = lSh.visibility ?? 0;
  const rVis = rSh.visibility ?? 0;
  return lVis >= rVis ? 'left' : 'right';
}

interface DetectedAngles {
  knee: number;
  hip: number;
  shoulder: number;
  backOk: boolean;
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

  const dx = Math.abs(shoulder.x - hip.x);
  const backOk = dx < 0.12;

  return {
    knee: Math.round(kneeAngle),
    hip: Math.round(hipAngle),
    shoulder: Math.round(shoulderAngle),
    backOk,
  };
}

/* ─── Helpers ─── */

/** Create a mock landmark with given coordinates and visibility */
function lm(x: number, y: number, visibility = 1, z = 0): NormalizedLandmark {
  return { x, y, z, visibility };
}

/** Build a full 33-landmark array (defaults to zeros) */
function buildLandmarks(
  overrides: Partial<Record<number, NormalizedLandmark>> = {}
): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = [];
  for (let i = 0; i < 33; i++) {
    landmarks.push(overrides[i] ?? lm(0, 0, 0));
  }
  return landmarks;
}

/* ─── Tests ─── */

/* ═══════════════════════════════════════════
   calcAngle
   ═══════════════════════════════════════════ */

describe('calcAngle', () => {
  it('returns 90° for a right angle (0,0)→(0,1)→(1,1)', () => {
    const angle = calcAngle({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 });
    expect(angle).toBeCloseTo(90, 0);
  });

  it('returns 180° for points on a straight line', () => {
    const angle = calcAngle({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 });
    expect(angle).toBeCloseTo(180, 0);
  });

  it('returns ~45° for an acute angle (0,0)→(0,1)→(1,0)', () => {
    // BA = (0,-1), BC = (1,-1), dot = 1, magBA=1, magBC=√2, cos=0.707 → 45°
    const angle = calcAngle({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 });
    expect(angle).toBeCloseTo(45, 0);
  });

  it('returns 180° for collinear points with B between A and C', () => {
    const angle = calcAngle({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 1.5 });
    expect(angle).toBeCloseTo(180, 0);
  });

  it('returns 0° when all three points coincide', () => {
    const angle = calcAngle({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 });
    expect(angle).toBe(0);
  });

  it('returns 0° when vertex and one point coincide (zero vector)', () => {
    const angle = calcAngle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 });
    expect(angle).toBe(0);
  });

  it('handles negative coordinates correctly', () => {
    const angle = calcAngle({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: -1 });
    expect(angle).toBeCloseTo(90, 0);
  });

  it('returns acute angle for knee bent ~120° (hip, knee, ankle)', () => {
    // Simulating a squat: hip at (0.5, 0.3), knee at (0.5, 0.6), ankle at (0.5, 0.9)
    // Straight leg = 180°, bent knee < 180°
    const angle = calcAngle(
      { x: 0.5, y: 0.3 }, // hip
      { x: 0.5, y: 0.6 }, // knee (vertex)
      { x: 0.55, y: 0.9 } // ankle slightly forward
    );
    expect(angle).toBeGreaterThan(0);
    expect(angle).toBeLessThan(180);
  });

  it('clamps cos value to [-1, 1] to avoid floating-point errors', () => {
    // near-collinear points that could produce cos slightly > 1
    const angle = calcAngle(
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1e-15, y: 2 }
    );
    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThanOrEqual(180);
  });
});

/* ═══════════════════════════════════════════
   chooseSide
   ═══════════════════════════════════════════ */

describe('chooseSide', () => {
  it('returns "left" when left shoulder has higher visibility', () => {
    const landmarks = buildLandmarks({
      [LANDMARK.LEFT_SHOULDER]: lm(0.4, 0.3, 0.9),
      [LANDMARK.RIGHT_SHOULDER]: lm(0.6, 0.3, 0.5),
    });
    expect(chooseSide(landmarks)).toBe('left');
  });

  it('returns "right" when right shoulder has higher visibility', () => {
    const landmarks = buildLandmarks({
      [LANDMARK.LEFT_SHOULDER]: lm(0.4, 0.3, 0.5),
      [LANDMARK.RIGHT_SHOULDER]: lm(0.6, 0.3, 0.9),
    });
    expect(chooseSide(landmarks)).toBe('right');
  });

  it('returns "left" when visibilities are equal', () => {
    const landmarks = buildLandmarks({
      [LANDMARK.LEFT_SHOULDER]: lm(0.4, 0.3, 0.8),
      [LANDMARK.RIGHT_SHOULDER]: lm(0.6, 0.3, 0.8),
    });
    expect(chooseSide(landmarks)).toBe('left');
  });

  it('returns "left" when shoulders are missing (undefined)', () => {
    const landmarks = buildLandmarks();
    // left shoulder at index 11 has visibility 0 (default)
    // right shoulder at index 12 has visibility 0 (default)
    expect(chooseSide(landmarks)).toBe('left');
  });

  it('returns "left" when both shoulders have 0 visibility', () => {
    const landmarks = buildLandmarks({
      [LANDMARK.LEFT_SHOULDER]: lm(0.4, 0.3, 0),
      [LANDMARK.RIGHT_SHOULDER]: lm(0.6, 0.3, 0),
    });
    expect(chooseSide(landmarks)).toBe('left');
  });

  it('returns "left" when only left shoulder is visible', () => {
    const landmarks = buildLandmarks();
    landmarks[LANDMARK.LEFT_SHOULDER] = lm(0.4, 0.3, 0.9);
    // Right shoulder stays at visibility 0
    expect(chooseSide(landmarks)).toBe('left');
  });

  it('return "right" when only right shoulder is visible', () => {
    const landmarks = buildLandmarks();
    landmarks[LANDMARK.RIGHT_SHOULDER] = lm(0.6, 0.3, 0.9);
    // Left shoulder stays at visibility 0
    expect(chooseSide(landmarks)).toBe('right');
  });
});

/* ═══════════════════════════════════════════
   computeAngles
   ═══════════════════════════════════════════ */

describe('computeAngles', () => {
  /* ── Default fallback ── */

  it('returns default values when key landmarks are missing (sparse array)', () => {
    // Sparse array: only 1 landmark at index 0, the rest are undefined
    const landmarks: NormalizedLandmark[] = [];
    landmarks.length = 33; // sparse
    landmarks[0] = lm(0.5, 0.1, 0.9);
    const result = computeAngles(landmarks);
    expect(result).toEqual({ knee: 160, hip: 90, shoulder: 90, backOk: true });
  });

  it('returns default values when only nose and shoulders exist', () => {
    // Hip, knee, ankle missing → defaults
    const landmarks: NormalizedLandmark[] = [];
    landmarks.length = 33;
    landmarks[LANDMARK.NOSE] = lm(0.5, 0.1, 0.95);
    landmarks[LANDMARK.LEFT_SHOULDER] = lm(0.4, 0.2, 0.9);
    landmarks[LANDMARK.RIGHT_SHOULDER] = lm(0.6, 0.2, 0.3);
    const result = computeAngles(landmarks);
    expect(result).toEqual({ knee: 160, hip: 90, shoulder: 90, backOk: true });
  });

  /* ── Standing posture (straight leg) ── */

  it('returns ~180° knee for a standing pose (straight leg)', () => {
    // All vertically aligned → 180° at knee, hip ~167°
    const landmarks = buildLandmarks({
      [LANDMARK.LEFT_SHOULDER]: lm(0.3, 0.2, 0.95),
      [LANDMARK.RIGHT_SHOULDER]: lm(0.7, 0.2, 0.3),
      [LANDMARK.LEFT_HIP]: lm(0.3, 0.45, 0.95),
      [LANDMARK.RIGHT_HIP]: lm(0.7, 0.45, 0.3),
      [LANDMARK.LEFT_KNEE]: lm(0.3, 0.65, 0.95),
      [LANDMARK.LEFT_ANKLE]: lm(0.3, 0.90, 0.95),
      [LANDMARK.LEFT_ELBOW]: lm(0.3, 0.35, 0.95),
    });

    const result = computeAngles(landmarks);
    expect(result.knee).toBe(180);
    expect(result.hip).toBeGreaterThan(140);
    expect(result.hip).toBeLessThan(181);
    expect(result.backOk).toBe(true);
  });

  /* ── Squat posture (bent knee) ── */

  it('computes ~120° knee for a partial squat', () => {
    // hip(0.30,0.35), knee(0.50,0.60), ankle(0.40,0.85)
    // Knee forward, ankle slightly behind → angle at knee ~120°
    const landmarks = buildLandmarks({
      [LANDMARK.LEFT_SHOULDER]: lm(0.30, 0.10, 0.95),
      [LANDMARK.RIGHT_SHOULDER]: lm(0.50, 0.10, 0.3),
      [LANDMARK.LEFT_HIP]: lm(0.30, 0.35, 0.95),
      [LANDMARK.RIGHT_HIP]: lm(0.50, 0.35, 0.3),
      [LANDMARK.LEFT_KNEE]: lm(0.50, 0.60, 0.95),
      [LANDMARK.LEFT_ANKLE]: lm(0.40, 0.85, 0.95),
      [LANDMARK.LEFT_ELBOW]: lm(0.30, 0.25, 0.95),
    });

    const result = computeAngles(landmarks);
    expect(result.knee).toBeGreaterThan(100);
    expect(result.knee).toBeLessThan(140);
  });

  /* ── Deep squat ── */

  it('computes ~90° knee for a deep squat', () => {
    // deep squat: hip(0.20,0.55), knee(0.55,0.65), ankle(0.50,0.85)
    // Hip descends close to knee level, knee well forward → angle ~90°
    const landmarks = buildLandmarks({
      [LANDMARK.LEFT_SHOULDER]: lm(0.20, 0.30, 0.95),
      [LANDMARK.RIGHT_SHOULDER]: lm(0.40, 0.30, 0.3),
      [LANDMARK.LEFT_HIP]: lm(0.20, 0.55, 0.95),
      [LANDMARK.RIGHT_HIP]: lm(0.40, 0.55, 0.3),
      [LANDMARK.LEFT_KNEE]: lm(0.55, 0.65, 0.95),
      [LANDMARK.LEFT_ANKLE]: lm(0.50, 0.85, 0.95),
      [LANDMARK.LEFT_ELBOW]: lm(0.20, 0.35, 0.95),
    });

    const result = computeAngles(landmarks);
    expect(result.knee).toBeGreaterThan(60);
    expect(result.knee).toBeLessThan(120);
  });

  /* ── Right side selection ── */

  it('uses right side when right shoulder is more visible', () => {
    const landmarks = buildLandmarks({
      [LANDMARK.LEFT_SHOULDER]: lm(0.3, 0.2, 0.3),
      [LANDMARK.RIGHT_SHOULDER]: lm(0.7, 0.2, 0.95),
      [LANDMARK.RIGHT_HIP]: lm(0.7, 0.45, 0.95),
      [LANDMARK.RIGHT_KNEE]: lm(0.7, 0.65, 0.95),
      [LANDMARK.RIGHT_ANKLE]: lm(0.7, 0.90, 0.95),
      [LANDMARK.RIGHT_ELBOW]: lm(0.7, 0.35, 0.95),
      // Left side landmarks have low visibility, should be ignored
      [LANDMARK.LEFT_HIP]: lm(0.3, 0.45, 0.1),
      [LANDMARK.LEFT_KNEE]: lm(0.3, 0.65, 0.1),
      [LANDMARK.LEFT_ANKLE]: lm(0.3, 0.90, 0.1),
    });

    const result = computeAngles(landmarks);
    // Right side is used, vertically aligned → close to 180°
    expect(result.knee).toBeGreaterThan(160);
    expect(result.hip).toBeGreaterThan(140);
  });

  /* ── Back posture ── */

  it('detects good back posture when shoulder and hip are vertically aligned', () => {
    // shoulder.x ≈ hip.x
    const landmarks = buildLandmarks({
      [LANDMARK.LEFT_SHOULDER]: lm(0.5, 0.2, 0.95),
      [LANDMARK.RIGHT_SHOULDER]: lm(0.7, 0.2, 0.3),
      [LANDMARK.LEFT_HIP]: lm(0.5, 0.45, 0.95),
      [LANDMARK.RIGHT_HIP]: lm(0.7, 0.45, 0.3),
      [LANDMARK.LEFT_KNEE]: lm(0.5, 0.65, 0.95),
      [LANDMARK.LEFT_ANKLE]: lm(0.5, 0.90, 0.95),
      [LANDMARK.LEFT_ELBOW]: lm(0.5, 0.35, 0.95),
    });

    const result = computeAngles(landmarks);
    // shoulder.x - hip.x = 0 < 0.12
    expect(result.backOk).toBe(true);
  });

  it('detects poor back posture when shoulder is far from hip horizontally', () => {
    // shoulder.x leans far forward relative to hip
    const landmarks = buildLandmarks({
      [LANDMARK.LEFT_SHOULDER]: lm(0.45, 0.2, 0.95),
      [LANDMARK.RIGHT_SHOULDER]: lm(0.65, 0.2, 0.3),
      [LANDMARK.LEFT_HIP]: lm(0.30, 0.45, 0.95),
      [LANDMARK.RIGHT_HIP]: lm(0.50, 0.45, 0.3),
      [LANDMARK.LEFT_KNEE]: lm(0.35, 0.65, 0.95),
      [LANDMARK.LEFT_ANKLE]: lm(0.40, 0.90, 0.95),
      [LANDMARK.LEFT_ELBOW]: lm(0.45, 0.30, 0.95),
    });

    const result = computeAngles(landmarks);
    // shoulder.x(0.45) - hip.x(0.30) = 0.15 > 0.12
    expect(result.backOk).toBe(false);
  });

  it('marks backOk=false when shoulder-hip dx equals the threshold (0.12)', () => {
    // dx = 0.12 → boundary, should be false ( < 0.12 is good)
    const landmarks = buildLandmarks({
      [LANDMARK.LEFT_SHOULDER]: lm(0.42, 0.2, 0.95),
      [LANDMARK.RIGHT_SHOULDER]: lm(0.62, 0.2, 0.3),
      [LANDMARK.LEFT_HIP]: lm(0.30, 0.45, 0.95),
      [LANDMARK.RIGHT_HIP]: lm(0.50, 0.45, 0.3),
      [LANDMARK.LEFT_KNEE]: lm(0.35, 0.65, 0.95),
      [LANDMARK.LEFT_ANKLE]: lm(0.40, 0.90, 0.95),
      [LANDMARK.LEFT_ELBOW]: lm(0.42, 0.30, 0.95),
    });

    const result = computeAngles(landmarks);
    // dx = 0.12, threshold is < 0.12 → false
    expect(result.backOk).toBe(false);
  });

  /* ── No elbow ── */

  it('defaults shoulder angle to 90 when elbow is missing (sparse)', () => {
    const landmarks: NormalizedLandmark[] = [];
    landmarks.length = 33;
    landmarks[LANDMARK.LEFT_SHOULDER] = lm(0.4, 0.2, 0.95);
    landmarks[LANDMARK.RIGHT_SHOULDER] = lm(0.6, 0.2, 0.3);
    landmarks[LANDMARK.LEFT_HIP] = lm(0.4, 0.45, 0.95);
    landmarks[LANDMARK.RIGHT_HIP] = lm(0.6, 0.45, 0.3);
    landmarks[LANDMARK.LEFT_KNEE] = lm(0.4, 0.65, 0.95);
    landmarks[LANDMARK.LEFT_ANKLE] = lm(0.4, 0.90, 0.95);
    // No LEFT_ELBOW set → shoulder defaults to 90

    const result = computeAngles(landmarks);
    expect(result.shoulder).toBe(90);
  });

  /* ── Hip angle in forward fold ── */

  it('computes acute hip angle for a forward fold (bending at waist)', () => {
    // shoulder(0.05,0.50) far forward relative to hip(0.35,0.45), knee(0.35,0.65)
    // → acute hip angle (~81°)
    const landmarks = buildLandmarks({
      [LANDMARK.LEFT_SHOULDER]: lm(0.05, 0.50, 0.95),
      [LANDMARK.RIGHT_SHOULDER]: lm(0.35, 0.50, 0.3),
      [LANDMARK.LEFT_HIP]: lm(0.35, 0.45, 0.95),
      [LANDMARK.RIGHT_HIP]: lm(0.65, 0.45, 0.3),
      [LANDMARK.LEFT_KNEE]: lm(0.35, 0.65, 0.95),
      [LANDMARK.LEFT_ANKLE]: lm(0.35, 0.90, 0.95),
      [LANDMARK.LEFT_ELBOW]: lm(0.05, 0.35, 0.95),
    });

    const result = computeAngles(landmarks);
    expect(result.hip).toBeGreaterThan(60);
    expect(result.hip).toBeLessThan(100);
    expect(result.knee).toBeGreaterThan(150); // legs still straight
  });

  /* ── Symmetrical sides should give same results ── */

  it('produces symmetric results for left/right with identical body coordinates', () => {
    // Left side (all visibility = 0.9)
    const leftLm = buildLandmarks({
      [LANDMARK.LEFT_SHOULDER]: lm(0.35, 0.20, 0.9),
      [LANDMARK.RIGHT_SHOULDER]: lm(0.65, 0.20, 0.3),
      [LANDMARK.LEFT_HIP]: lm(0.35, 0.45, 0.9),
      [LANDMARK.RIGHT_HIP]: lm(0.65, 0.45, 0.3),
      [LANDMARK.LEFT_KNEE]: lm(0.35, 0.65, 0.9),
      [LANDMARK.LEFT_ANKLE]: lm(0.35, 0.90, 0.9),
      [LANDMARK.LEFT_ELBOW]: lm(0.35, 0.35, 0.9),
    });

    // Right side (visibility swapped, positions mirrored)
    const rightLm = buildLandmarks({
      [LANDMARK.LEFT_SHOULDER]: lm(0.35, 0.20, 0.3),
      [LANDMARK.RIGHT_SHOULDER]: lm(0.65, 0.20, 0.9),
      [LANDMARK.LEFT_HIP]: lm(0.35, 0.45, 0.3),
      [LANDMARK.RIGHT_HIP]: lm(0.65, 0.45, 0.9),
      [LANDMARK.RIGHT_KNEE]: lm(0.65, 0.65, 0.9),
      [LANDMARK.RIGHT_ANKLE]: lm(0.65, 0.90, 0.9),
      [LANDMARK.RIGHT_ELBOW]: lm(0.65, 0.35, 0.9),
    });

    const leftResult = computeAngles(leftLm);
    const rightResult = computeAngles(rightLm);

    // When mirrored, knee and hip angles should be the same
    expect(leftResult.knee).toBe(rightResult.knee);
    expect(leftResult.hip).toBe(rightResult.hip);
    expect(leftResult.backOk).toBe(rightResult.backOk);
  });
});
