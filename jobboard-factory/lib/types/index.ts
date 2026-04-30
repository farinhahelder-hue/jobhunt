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
  | "glassdoor"
  | "cadremploi"
  | "otta"
  | "talent"
  | "meteojob"
  | "hired";

export interface SalaryRange {
  min?: number;
  max?: number;
  currency: string;           // "EUR", "USD", etc.
  period: "hour" | "month" | "year";
  raw?: string;               // raw string as found on page
}

export interface ScrapedJob {
  id: string;                 // SHA-256 of source URL
  source: JobSource;
  title: string;
  company: string;
  location: string;
  city?: string;
  postal_code?: string;
  country?: string;
  job_type: JobType;
  description: string;        // plain text, HTML stripped
  salary_range?: SalaryRange;
  url: string;
  posted_at?: Date;
  scraped_at: Date;
  tags?: string[];            // skills, technologies
  remote?: "full" | "hybrid" | "onsite" | null;
  experience_level?: "junior" | "mid" | "senior" | "executive" | null;
  raw?: Record<string, unknown>; // original raw data for debugging
}

export interface ScrapeParams {
  keywords: string;
  location?: string;
  pages?: number;             // default: 3
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
  type: "SEERECTOR_MISMATCH" | "RATE_LIMIT" | "AUTH_REQUIRED" | "NETWORK_ERROR" | "PARSE_ERROR";
  message: string;
  url?: string;
  screenshot?: string;        // base64 screenshot on SELECTOR_MISMATCH
  timestamp: Date;
}
