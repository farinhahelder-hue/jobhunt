// lib/__tests__/adapters.test.ts
// ============================================================
// JOBBOARD FACTORY — Adapter Unit Tests
// ============================================================

import { hashUrl, normalizeJobType, normalizeSalary, stripHtml, parseLocation, detectRemote, deduplicateJobs } from "../scraper/utils";
import { ScrapedJob } from "../types";

describe("hashUrl", () => {
  it("returns consistent SHA-256 hex for the same URL", () => {
    const h1 = hashUrl("https://example.com/job/123");
    const h2 = hashUrl("https://example.com/job/123");
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it("returns different hashes for different URLs", () => {
    expect(hashUrl("https://a.com")).not.toBe(hashUrl("https://b.com"));
  });
});

describe("normalizeJobType", () => {
  it("maps French and English terms correctly", () => {
    expect(normalizeJobType("CDI")).toBe("CDI");
    expect(normalizeJobType("Contrat à durée indéterminée")).toBe("CDI");
    expect(normalizeJobType("Full-time")).toBe("CDI");
    expect(normalizeJobType("Alternance")).toBe("ALT");
    expect(normalizeJobType("Stage")).toBe("STG");
    expect(normalizeJobType("Intérim")).toBe("MIS");
    expect(normalizeJobType("Freelance")).toBe("FREELANCE");
    expect(normalizeJobType(undefined)).toBe("UNKNOWN");
  });
});

describe("normalizeSalary", () => {
  it("parses k-range salary", () => {
    const result = normalizeSalary("45k - 60k €/an");
    expect(result?.min).toBe(45000);
    expect(result?.max).toBe(60000);
    expect(result?.currency).toBe("EUR");
    expect(result?.period).toBe("year");
  });

  it("parses hourly salary", () => {
    const result = normalizeSalary("18€/h");
    expect(result?.min).toBe(18);
    expect(result?.period).toBe("hour");
  });

  it("returns undefined for missing salary", () => {
    expect(normalizeSalary(undefined)).toBeUndefined();
    expect(normalizeSalary("")).toBeUndefined();
  });
});

describe("stripHtml", () => {
  it("removes HTML tags and decodes entities", () => {
    const html = "<p>Hello <strong>World</strong> &amp; friends</p><br/><ul><li>Item</li></ul>";
    const result = stripHtml(html);
    expect(result).toContain("Hello World & friends");
    expect(result).toContain("• Item");
    expect(result).not.toContain("<");
  });
});

describe("parseLocation", () => {
  it("extracts French postal codes", () => {
    const result = parseLocation("Paris 75001");
    expect(result.postal_code).toBe("75001");
    expect(result.city).toContain("Paris");
  });

  it("handles undefined gracefully", () => {
    const result = parseLocation(undefined);
    expect(result.display).toBe("Non précisé");
  });
});

describe("detectRemote", () => {
  it("detects full remote", () => {
    expect(detectRemote("100% remote position")).toBe("full");
    expect(detectRemote("Télétravail complet")).toBe("full");
  });

  it("detects hybrid", () => {
    expect(detectRemote("Hybrid work model")).toBe("hybrid");
    expect(detectRemote("Mode hybride")).toBe("hybrid");
  });

  it("detects onsite", () => {
    expect(detectRemote("Sur site uniquement")).toBe("onsite");
  });

  it("returns null when no signal", () => {
    expect(detectRemote("Great position")).toBeNull();
  });
});

describe("deduplicateJobs", () => {
  it("removes duplicate jobs by id", () => {
    const jobs: Pick<ScrapedJob, "id">[] = [
      { id: "abc" },
      { id: "def" },
      { id: "abc" },
    ];
    const result = deduplicateJobs(jobs as ScrapedJob[]);
    expect(result).toHaveLength(2);
    expect(result.map((j) => j.id)).toEqual(["abc", "def"]);
  });
});
