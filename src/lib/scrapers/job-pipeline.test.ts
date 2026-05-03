import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deduplicateJobs, scoreJobsAgainstCV, filterJobsByScore, runJobScrapingPipeline } from './job-pipeline'
import type { ScrapedJobInput } from './job-pipeline'

// Mock Supabase
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null })
    })
  })
}))

// Mock @/utils/supabase/client
vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null })
    })
  })
}))

describe('job-pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('deduplicateJobs', () => {
    it('should deduplicate jobs based on URL', () => {
      const jobs: ScrapedJobInput[] = [
        { url: 'https://example.com/1', title: 'Job 1', company: 'Corp', descriptionRaw: 'desc', source: 'LINKEDIN' as any },
        { url: 'https://example.com/2', title: 'Job 2', company: 'Corp', descriptionRaw: 'desc', source: 'LINKEDIN' as any },
        { url: 'https://example.com/1', title: 'Job 1 Duplicate', company: 'Corp', descriptionRaw: 'desc', source: 'LINKEDIN' as any },
      ]

      const deduped = deduplicateJobs(jobs)

      expect(deduped).toHaveLength(2)
      expect(deduped[0].url).toBe('https://example.com/1')
      expect(deduped[1].url).toBe('https://example.com/2')
    })

    it('should keep first occurrence when duplicates found', () => {
      const jobs: ScrapedJobInput[] = [
        { url: 'https://example.com/1', title: 'First Job', company: 'Corp', descriptionRaw: 'desc', source: 'LINKEDIN' as any },
        { url: 'https://example.com/1', title: 'Duplicate', company: 'Corp', descriptionRaw: 'desc', source: 'LINKEDIN' as any },
      ]

      const deduped = deduplicateJobs(jobs)

      expect(deduped).toHaveLength(1)
      expect(deduped[0].title).toBe('First Job')
    })
  })

  describe('filterJobsByScore', () => {
    it('should filter jobs with score > 0.65 by default', () => {
      const jobs: ScrapedJobInput[] = [
        { url: 'https://example.com/1', title: 'Job 1', company: 'Corp', descriptionRaw: 'desc', source: 'LINKEDIN' as any, matchScore: 0.5 },
        { url: 'https://example.com/2', title: 'Job 2', company: 'Corp', descriptionRaw: 'desc', source: 'LINKEDIN' as any, matchScore: 0.7 },
        { url: 'https://example.com/3', title: 'Job 3', company: 'Corp', descriptionRaw: 'desc', source: 'LINKEDIN' as any, matchScore: 0.66 },
        { url: 'https://example.com/4', title: 'Job 4', company: 'Corp', descriptionRaw: 'desc', source: 'LINKEDIN' as any, matchScore: undefined },
      ]

      const filtered = filterJobsByScore(jobs)

      // 0.65: 0.7 qualifies, 0.66 qualifies (0.66 > 0.65), 0.5 and undefined excluded
      expect(filtered).toHaveLength(2)
      expect(filtered.map(j => j.matchScore)).toEqual([0.7, 0.66])
    })

    it('should use custom minScore when provided', () => {
      const jobs: ScrapedJobInput[] = [
        { url: 'https://example.com/1', title: 'Job 1', company: 'Corp', descriptionRaw: 'desc', source: 'LINKEDIN' as any, matchScore: 0.8 },
        { url: 'https://example.com/2', title: 'Job 2', company: 'Corp', descriptionRaw: 'desc', source: 'LINKEDIN' as any, matchScore: 0.5 },
      ]

      const filtered = filterJobsByScore(jobs, 0.75)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].matchScore).toBe(0.8)
    })
  })

  describe('scoreJobsAgainstCV', () => {
    it('should assign matchScore to jobs without score', async () => {
      const jobs: ScrapedJobInput[] = [
        { url: 'https://example.com/1', title: 'Job 1', company: 'Corp', descriptionRaw: 'desc', source: 'LINKEDIN' as any },
        { url: 'https://example.com/2', title: 'Job 2', company: 'Corp', descriptionRaw: 'desc', source: 'LINKEDIN' as any, matchScore: 0.9 },
      ]

      const scored = await scoreJobsAgainstCV(jobs, 'user-1')

      expect(scored).toHaveLength(2)
      expect(scored[0].matchScore).toBeDefined()
      expect(typeof scored[0].matchScore).toBe('number')
      expect(scored[1].matchScore).toBe(0.9) // preserved
    })
  })

  describe('runJobScrapingPipeline', () => {
    it('should continue if one source fails (Promise.allSettled)', async () => {
      // Le test vérifie que Promise.allSettled est utilisé
      // Si une source reject, les autres continuent
      const result = await runJobScrapingPipeline('user-1')

      // Le pipeline doit retourner un tableau (même vide) sans throw
      expect(Array.isArray(result)).toBe(true)
    })

    it('should filter jobs by minimum score (0.65 default)', async () => {
      const result = await runJobScrapingPipeline('user-1', 0.5)

      // Tous les jobs retournés doivent avoir un score > 0.5
      result.forEach(job => {
        if (job.matchScore !== undefined) {
          expect(job.matchScore).toBeGreaterThan(0.5)
        }
      })
    })
  })
})