// lib/index.ts
// ============================================================
// JOBBOARD FACTORY — Public API
// ============================================================

export * from "./types";
export * from "./scraper/utils";
export * from "./scraper/base/BaseAdapter";
export * from "./scraper/Aggregator";

// Adapters
export { FranceTravailAdapter } from "./scraper/sources/france-travail";
export { WTTJAdapter } from "./scraper/sources/wttj";
export { ApecAdapter } from "./scraper/sources/apec";
export { TalentAdapter } from "./scraper/sources/talent";
export { IndeedAdapter } from "./scraper/sources/indeed";
export { HelloWorkAdapter } from "./scraper/sources/hellowork";
export { CadremploisAdapter } from "./scraper/sources/cadremploi";
export { OttaAdapter } from "./scraper/sources/otta";
export { MeteojobAdapter } from "./scraper/sources/meteojob";
export { HiredAdapter } from "./scraper/sources/hired";
export { LinkedInAdapter } from "./scraper/sources/linkedin";
export { GlassdoorAdapter } from "./scraper/sources/glassdoor";
