// lib/scraper/Aggregator.ts
// ============================================================
// JOBBOARD FACTORY — Multi-source Aggregator
// ============================================================

import { ScrapedJob, ScrapeParams, ScrapeResult, JobSource } from "../types";
import { BaseAdapter } from "./base/BaseAdapter";
import { deduplicateJobs } from "./utils";

export interface AggregateResult {
  jobs: ScrapedJob[];
  resultsBySource: Record<string, ScrapeResult>;
  total_jobs: number;
  total_errors: number;
  duration_ms: number;
}

export interface AggregatorOptions {
  maxConcurrent?: number; // default: 3
}

export class JobBoardAggregator {
  private adapters: Map<JobSource, BaseAdapter> = new Map();
  private options: Required<AggregatorOptions>;

  constructor(options: AggregatorOptions = {}) {
    this.options = {
      maxConcurrent: options.maxConcurrent ?? 3,
    };
  }

  register(adapter: BaseAdapter): this {
    this.adapters.set(adapter.source, adapter);
    return this;
  }

  getRegisteredSources(): JobSource[] {
    return Array.from(this.adapters.keys());
  }

  async scrapeAll(params: ScrapeParams, sources: JobSource[] | undefined = undefined): Promise<AggregateResult> {
    const start = Date.now();
    const targets: [JobSource, BaseAdapter][] = sources
      ? sources.map((s) => [s, this.adapters.get(s)!]).filter(([, a]) => !!a)
      : Array.from(this.adapters.entries());

    // Run in chunks respecting maxConcurrent
    const resultsBySource: Record<string, ScrapeResult> = {};
    const chunkSize = this.options.maxConcurrent;

    for (let i = 0; i < targets.length; i += chunkSize) {
      const chunk = targets.slice(i, i + chunkSize);
      const chunkResults = await Promise.allSettled(
        chunk.map(([source, adapter]) =>
          adapter.scrape(params).then((result) => ({ source, result }))
        )
      );

      for (const outcome of chunkResults) {
        if (outcome.status === "fulfilled") {
          const { source, result } = outcome.value;
          resultsBySource[source] = result;
        } else {
          console.error(`[Aggregator] Adapter failed:`, outcome.reason);
        }
      }
    }

    // Flatten and deduplicate all jobs
    const allJobs: ScrapedJob[] = Object.values(resultsBySource)
      .flatMap((r) => r.jobs);
    const uniqueJobs = deduplicateJobs(allJobs);

    const totalErrors = Object.values(resultsBySource)
      .reduce((sum, r) => sum + r.errors.length, 0);

    return {
      jobs: uniqueJobs,
      resultsBySource,
      total_jobs: uniqueJobs.length,
      total_errors: totalErrors,
      duration_ms: Date.now() - start,
    };
  }

  getAdapter(source: JobSource): BaseAdapter | undefined {
    return this.adapters.get(source);
  }
}
