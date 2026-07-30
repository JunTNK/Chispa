import { NextRequest, NextResponse } from 'next/server';
import {
  TrainingAgent,
  MotivationEngine,
} from '@/lib/agents/decision-engine';
import { INTENSITY_LABELS, FOCUS_LABELS } from '@/lib/utils/constants';
import { workoutRequestSchema } from '@/lib/api/schemas';
import { logError } from '@/lib/utils/logger';
import type { DecisionEngineOutput, DigitalTwin } from '@/types';

/**
 * GET /api/workout — Health check / route info.
 * Used by production smoke test to verify the route exists.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/workout',
    methods: ['POST'],
    description: 'Generates a complete workout plan from a decision output',
  });
}

/**
 * POST /api/workout
 *
 * Generates a complete workout plan from a decision output.
 * Used after the Decision Engine has decided the intensity/duration.
 * Validates the request body with Zod before processing.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Zod validation
    const result = workoutRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { decision, twin, profile, last_focus, client_last_focus } = result.data;

    // If the decision says rest, return a rest message
    if (decision.action === 'restore') {
      const style = twin.motivation_style;
      return NextResponse.json({
        success: true,
        action: 'restore',
        message: MotivationEngine.restMessage(style),
        decision,
      });
    }

    // Zod validates shape; cast to the expected @/types interfaces
    const workout = TrainingAgent.generate(
      decision as DecisionEngineOutput,
      twin as unknown as DigitalTwin,
      profile.equipment,
      last_focus,
      client_last_focus
    );

    // Get the motivation message
    const style = twin.motivation_style;
    const message = MotivationEngine.message(
      style,
      decision.recovery_score ?? 60,
      decision.consistency?.consistency_pct ?? 50,
      decision.duration
    );

    return NextResponse.json({
      success: true,
      action: 'train',
      workout: {
        ...workout,
        title: workout.title,
      },
      message,
      labels: {
        intensity: INTENSITY_LABELS[decision.intensity] || decision.intensity,
        focus_label: FOCUS_LABELS[workout.focus] || workout.focus,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('api:workout')(error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
