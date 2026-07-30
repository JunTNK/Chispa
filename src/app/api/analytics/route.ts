import { NextResponse } from 'next/server';

/**
 * GET /api/analytics — Health check / route info.
 * Used by production smoke test to verify the route exists.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/analytics',
    methods: ['POST'],
    description: 'Receives Core Web Vitals metrics from the client',
  });
}

/**
 * POST /api/analytics — Receives Core Web Vitals metrics from the client.
 *
 * In production, this can be extended to:
 *   - Store metrics in a database or analytics service
 *   - Alert on poor-performing pages
 *   - Aggregate data for performance monitoring
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Log to server console (structured)
    console.log(
      `[WebVitals] ${body.name}: ${body.value} (${body.rating}) — ${body.url}`
    );

    // In production, send to an analytics service:
    //   await analytics.capture('web_vital', body);

    return NextResponse.json({ ok: true });
  } catch {
    // Silently ignore malformed requests
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
