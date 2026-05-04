/**
 * Health check: verifies the Render backend is reachable.
 * GET /api/scrape/health
 */
import { NextResponse } from 'next/server';

const RENDER_API_URL = process.env.RENDER_API_URL;

export async function GET() {
  if (!RENDER_API_URL) {
    return NextResponse.json(
      { vercel: 'ok', render: 'not_configured', message: 'Add RENDER_API_URL to Vercel env vars' },
      { status: 200 }
    );
  }

  try {
    const response = await fetch(`${RENDER_API_URL}/health`, {
      signal: AbortSignal.timeout(10_000),
    });
    const data = await response.json();
    return NextResponse.json({ vercel: 'ok', render: data.status ?? 'unknown' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    return NextResponse.json(
      { vercel: 'ok', render: 'unreachable', details: message },
      { status: 503 }
    );
  }
}
