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
export { CadremploiAdapter } from "./scraper/sources/cadremploi";
export { LinkedInAdapter } from "./scraper/sources/linkedin";
export { MonsterAdapter } from "./scraper/sources/monster";
