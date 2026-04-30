// lib/scraper/base/BaseAdapter.ts
// ============================================================
// JOBBOARD FACTORY — Abstract Base Adapter
// ============================================================

import { ScrapedJob, ScrapeParams, ScrapeResult, ScrapeError, JobSource } from "../../types";
import { throttle, nextUserAgent, deduplicateJobs } from "../utils";

export abstract class BaseAdapter {
  abstract readonly source: JobSource;
  abstract readonly baseUrl: string;

  protected requestCount = 0;
  protected errors: ScrapeError[] = [];

  // ── Must implement ──────────────────────────────────────────
  abstract scrape(params: ScrapeParams): Promise<ScrapeResult>;

  // ── Shared helpers ──────────────────────────────────────────
  protected async wait(): Promise<void> {
    await throttle();
  }

  protected get userAgent(): string {
    return nextUserAgent();
  }

  protected get defaultHeaders(): Record<string, string> {
    return {
      "User-Agent": this.userAgent,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "DNT": "1",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
    };
  }

  protected addError(error: Omit<ScrapeError, "timestamp">): void {
    this.errors.push({ ...error, timestamp: new Date() });
    if (error.type === "SELECTOR_MISMATCH") {
      console.error(`[${this.source.toUpperCase()}] ⚠️  SELECTOR_MISMATCH: ${error.message}`);
    }
  }

  protected buildResult(jobs: ScrapedJob[], totalFound: number, pagesScraped: number, durationMs: number): ScrapeResult {
    return {
      source: this.source,
      jobs: deduplicateJobs(jobs),
      total_found: totalFound,
      pages_scraped: pagesScraped,
      errors: this.errors,
      duration_ms: durationMs,
    };
  }
}
