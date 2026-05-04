/**
 * Proxy route: forwards scraping requests from the Next.js frontend (Vercel)
 * to the Python FastAPI backend (Render).
 *
 * GET /api/scrape?query=...&location=...&max=...&boards=...
 */
import { NextRequest, NextResponse } from 'next/server';

const RENDER_API_URL = process.env.RENDER_API_URL;

export async function GET(request: NextRequest) {
  if (!RENDER_API_URL) {
    return NextResponse.json(
      { error: 'RENDER_API_URL is not configured. Add it in Vercel environment variables.' },
      { status: 503 }
    );
  }

  // Forward all query params to the Render backend
  const { searchParams } = new URL(request.url);
  const renderUrl = new URL('/search', RENDER_API_URL);

  // Copy all query parameters
  searchParams.forEach((value, key) => {
    renderUrl.searchParams.append(key, value);
  });

  try {
    const response = await fetch(renderUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward API key if set
        ...(process.env.RENDER_API_KEY
          ? { Authorization: `Bearer ${process.env.RENDER_API_KEY}` }
          : {}),
      },
      // 55s timeout — Vercel serverless limit is 60s
      signal: AbortSignal.timeout(55_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Render backend error', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('TimeoutError') || message.includes('AbortError')) {
      return NextResponse.json(
        { error: 'Scraping timed out. Try reducing the max parameter or targeting fewer boards.' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to reach Render backend', details: message },
      { status: 502 }
    );
  }
}
