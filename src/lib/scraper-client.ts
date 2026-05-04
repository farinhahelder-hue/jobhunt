/**
 * Client-side helper to call the /api/scrape proxy from React components.
 *
 * Usage:
 *   import { searchJobs } from '@/lib/scraper-client';
 *   const results = await searchJobs({ query: 'développeur', location: 'Paris', max: 10 });
 */

export interface ScrapeParams {
  query?: string;
  location?: string;
  max?: number;
  boards?: string[];
}

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  published_at?: string;
  description?: string;
  salary?: string;
  remote?: boolean;
}

export interface ScrapeResult {
  query: string;
  location: string;
  total: number;
  by_board: Record<string, number>;
  jobs: ScrapedJob[];
}

export async function searchJobs(params: ScrapeParams = {}): Promise<ScrapeResult> {
  const searchParams = new URLSearchParams();

  if (params.query)    searchParams.set('query',    params.query);
  if (params.location) searchParams.set('location', params.location);
  if (params.max)      searchParams.set('max',       String(params.max));
  if (params.boards?.length) {
    params.boards.forEach(b => searchParams.append('boards', b));
  }

  const res = await fetch(`/api/scrape?${searchParams.toString()}`);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error ?? `Scraping failed with status ${res.status}`);
  }

  return res.json();
}

export async function checkRenderHealth(): Promise<{ vercel: string; render: string }> {
  const res = await fetch('/api/scrape/health');
  return res.json();
}
