import { NextRequest, NextResponse } from 'next/server';
import {
  DecisionEngine,
  calculateRecoveryScore,
  calculateConsistency,
} from '@/lib/agents/decision-engine';
import { INTENSITY_LABELS } from '@/lib/utils/constants';
import { decisionRequestSchema } from '@/lib/api/schemas';
import { logError } from '@/lib/utils/logger';
import type { DecisionEngineInput, DigitalTwin, Profile } from '@/types';

/**
 * POST /api/decision
 *
 * Executes the Decision Engine and returns the training decision.
 * Validates the request body with Zod before processing.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Zod validation
    const result = decisionRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { checkin, profile, twin, workouts_last_30_days, last_workout } = result.data;

    // Build the input for the Decision Engine
    const targetPerWeek = profile.days_per_week === '4-5' ? 4 : 3;
    const consistency = calculateConsistency(
      workouts_last_30_days ?? 0,
      targetPerWeek
    );

    // Zod validates shape; cast to the expected @/types interfaces
    const input: DecisionEngineInput = {
      consistency,
      twin: twin as unknown as DigitalTwin,
      profile: profile as unknown as Profile,
      last_workout: last_workout ?? undefined,
    };

    // Add check-in data if provided
    if (checkin) {
      const rec = calculateRecoveryScore({
        user_id: '',
        date: new Date().toISOString().slice(0, 10),
        sleep: checkin.sleep,
        energy: checkin.energy,
        stress: checkin.stress,
        recovery_score: 0,
        created_at: '',
      });
      input.checkin = {
        user_id: '',
        date: new Date().toISOString().slice(0, 10),
        sleep: checkin.sleep,
        energy: checkin.energy,
        stress: checkin.stress,
        recovery_score: rec.score,
        created_at: '',
      };
    }

    // Execute the decision engine
    const decision = DecisionEngine.decide(input);

    return NextResponse.json({
      success: true,
      decision,
      labels: {
        intensity: INTENSITY_LABELS[decision.intensity] || decision.intensity,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('api:decision')(error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
