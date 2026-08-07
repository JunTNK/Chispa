import { NextResponse } from 'next/server';

/**
 * GET /api/health
 *
 * Simple health check endpoint for uptime monitoring services
 * (Better Uptime, UptimeRobot, Pingdom, etc).
 *
 * Returns the app status, version, uptime, and timestamp.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      app: 'CHISPA',
      version: process.env.npm_package_version || '0.1.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV || 'production',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}

/**
 * HEAD /api/health
 *
 * Lightweight check for monitoring services that only need status code.
 */
export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
