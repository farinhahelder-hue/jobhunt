// lib/types/index.ts
// ============================================================
// JOBBOARD FACTORY — Core Type Definitions
// ============================================================

export type JobType = "CDI" | "CDD" | "MIS" | "ALT" | "STG" | "FREELANCE" | "UNKNOWN";

export type JobSource =
  | "linkedin"
  | "france_travail"
  | "indeed"
  | "apec"
  | "hellowork"
  | "wttj"
  | "cadremploi"
  | "talent"
  | "monster";

export interface SalaryRange {
  min?: number;
  max?: number;
  currency: string;       // "EUR", "USD", etc.
  period: "hour" | "month" | "year";
  raw?: string;           // raw string as found on page
}

export interface ScrapedJob {
  id: string;             // SHA-256 of source URL
  source: JobSource;
  title: string;
  company: string;
  location: string;
  city?: string;
  postal_code?: string;
  country?: string;
  job_type?: JobType;
  description?: string;   // plain text, HTML stripped
  salary_range?: SalaryRange;
  salaryRange?: string;   // raw salary string (legacy)
  url: string;
  posted_at?: Date;
  postedAt?: string | Date; // legacy
  scraped_at?: Date;
  tags?: string[];        // skills, technologies
  remote?: "full" | "hybrid" | "onsite" | boolean | null;
  experience_level?: "junior" | "mid" | "senior" | "executive" | null;
  jobType?: string;       // legacy normalized
  postalCode?: string;    // legacy
  raw?: Record<string, unknown>; // original raw data for debugging
}

export interface ScrapeParams {
  keywords: string;
  location?: string;
  pages?: number;         // default: 3
  job_type?: JobType;
  remote?: boolean;
}

export interface ScrapeResult {
  source: JobSource;
  jobs: ScrapedJob[];
  total_found: number;
  pages_scraped: number;
  errors: ScrapeError[];
  duration_ms: number;
}

export interface ScrapeError {
  type: "SELECTOR_MISMATCH" | "RATE_LIMIT" | "AUTH_REQUIRED" | "NETWORK_ERROR" | "PARSE_ERROR";
  message: string;
  url?: string;
  screenshot?: string;    // base64 screenshot on SELECTOR_MISMATCH
  timestamp: Date;
}
