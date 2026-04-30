// lib/api/server.ts
// ============================================================
// JOBBOARD FACTORY — Express REST API Server
// POST /api/scrape        → scrape one or multiple sources
// GET  /api/health        → health check
// GET  /api/sources       → list available sources
// ============================================================

import express, { Request, Response } from "express";
import { JobBoardAggregator } from "../scraper/Aggregator";
import { ScrapeParams, JobSource } from "../types";

// Import all adapters
import { FranceTravailAdapter } from "../scraper/sources/france-travail";
import { WTTJAdapter } from "../scraper/sources/wttj";
import { ApecAdapter } from "../scraper/sources/apec";
import { TalentAdapter } from "../scraper/sources/talent";
import { HelloWorkAdapter } from "../scraper/sources/hellowork";
import { CadremploisAdapter } from "../scraper/sources/cadremploi";
import { OttaAdapter } from "../scraper/sources/otta";
import { MeteojobAdapter } from "../scraper/sources/meteojob";
import { IndeedAdapter } from "../scraper/sources/indeed";
import { HiredAdapter } from "../scraper/sources/hired";
import { LinkedInAdapter } from "../scraper/sources/linkedin";
import { GlassdoorAdapter } from "../scraper/sources/glassdoor";

const app = express();
app.use(express.json());

const MAX_CONCURRENT_SCRAPERS = parseInt(process.env.MAX_CONCURRENT_SCRAPERS || "3", 10);

// ── Initialize Aggregator with all sources ──────────────────────────
const aggregator = new JobBoardAggregator({
  maxConcurrent: MAX_CONCURRENT_SCRAPERS,
});

export function initializeAdapters() {
  aggregator.register(new WTTJAdapter());
  aggregator.register(new ApecAdapter());
  aggregator.register(new TalentAdapter());
  aggregator.register(new HelloWorkAdapter());
  aggregator.register(new CadremploisAdapter());
  aggregator.register(new OttaAdapter());
  aggregator.register(new MeteojobAdapter());
  aggregator.register(new IndeedAdapter());
  aggregator.register(new HiredAdapter());
  aggregator.register(new LinkedInAdapter());
  aggregator.register(new GlassdoorAdapter());

  const ftClientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const ftClientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
  if (ftClientId && ftClientSecret) {
    aggregator.register(new FranceTravailAdapter(ftClientId, ftClientSecret));
  } else {
    console.warn("[WARN] FRANCE_TRAVAIL_CLIENT_ID or _SECRET not set - skipping France Travail adapter");
  }
}

// ── Routes ───────────────────────────────────────────────────────

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    sources: aggregator.getRegisteredSources(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/sources", (_req: Request, res: Response) => {
  res.json({
    sources: aggregator.getRegisteredSources().map((source) => ({
      id: source,
      name: source.replace(/_/g, " ").replace(/\w/g, (c) => c.toUpperCase()),
    })),
  });
});

app.post("/api/scrape", async (req: Request, res: Response) => {
  const { keywords, location, pages, sources, job_type, remote } = req.body;

  if (!keywords || typeof keywords !== "string") {
    res.status(400).json({ error: "keywords is required and must be a string" });
    return;
  }

  const params: ScrapeParams = {
    keywords: keywords.trim(),
    location: location ? String(location) : undefined,
    pages: pages ? Math.min(parseInt(pages, 10), 10) : 3,
    job_type: job_type,
    remote: remote === true,
  };

  const sourceFilter: JobSource[] | undefined = Array.isArray(sources) && sources.length
    ? sources as JobSource[]
    : undefined;

  try {
    const results = await aggregator.scrapeAll(params, sourceFilter);
    res.json(results);
  } catch (err) {
    console.error("Scrape error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/scrape/:source", async (req: Request, res: Response) => {
  const { source } = req.params;
  const { keywords, location, pages, job_type, remote } = req.body;

  if (!keywords) {
    res.status(400).json({ error: "keywords is required" });
    return;
  }

  const adapter = aggregator.getAdapter(source as JobSource);
  if (!adapter) {
    res.status(404).json({ error: `Source ${source} not found. Available: ${aggregator.getRegisteredSources().join(", ")}` });
    return;
  }

  try {
    const result = await adapter.scrape({
      keywords: ��ring(keywords),
      location: location ? String(location) : undefined,
      pages: pages ? Math.min(parseInt(pages, 10), 10) : 3,
      job_type: job_type,
      remote: remote === true,
    });
    res.json(result);
  } catch (err) {
    console.error(`Scrape error for ${source}:`, err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = parseInt(process.env.PORT || "3001", 10);

initializeAdapters();
app.listen(PORT, () => {
  console.log(`[🏽 JobBoard Factory] API running on http://localhost:${PORT}`);
  console.log(`[Sources] ${aggregator.getRegisteredSources().join(", ")}`);
});

export default app;
