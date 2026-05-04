import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { createHash } from 'crypto'

// Hash URL using SHA-256 for collision resistance
function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex').substring(0, 32)
}

// TypeScript Enum Equivalent to Prisma ScraperSource
export enum ScraperSource {
  GREENHOUSE_ATS = 'GREENHOUSE_ATS',
  LEVER_ATS = 'LEVER_ATS',
  LINKEDIN = 'LINKEDIN',
  INDEED = 'INDEED',
  GOOGLE_JOBS = 'GOOGLE_JOBS',
  JOBICY_RSS = 'JOBICY_RSS',
  CUSTOM_RSS = 'CUSTOM_RSS'
}

// Zod Schema for validation
export const ScrapedJobSchema = z.object({
  title: z.string(),
  company: z.string(),
  url: z.string().url(),
  descriptionRaw: z.string(),
  source: z.nativeEnum(ScraperSource),
  matchScore: z.number().min(0).max(1).optional()
})

export type ScrapedJobInput = z.infer<typeof ScrapedJobSchema>

// Couche 1: ATS Publics
export async function scrapeGreenhouseATS(companies: string[]): Promise<ScrapedJobInput[]> {
  return companies.map(c => ({
    title: `Software Engineer at ${c}`,
    company: c,
    url: `https://boards.greenhouse.io/${c}/jobs/123`,
    descriptionRaw: 'Lorem ipsum...',
    source: ScraperSource.GREENHOUSE_ATS,
    matchScore: 0.8
  }))
}

// Couche 2: RSS/APIs
export async function scrapeJobicyRSS(params: { tag: string; count: number }): Promise<ScrapedJobInput[]> {
  return [{
    title: `Remote ${params.tag} Developer`,
    company: 'Tech Corp',
    url: 'https://jobicy.com/jobs/123',
    descriptionRaw: 'Lorem ipsum...',
    source: ScraperSource.JOBICY_RSS,
    matchScore: 0.7
  }]
}

export async function scrapeSerpApiGoogleJobs(params: { q: string; location: string }): Promise<ScrapedJobInput[]> {
  return []
}

// Couche 3: Scraping Actif
export async function scrapeApifyLinkedIn(params: { keywords: string }): Promise<ScrapedJobInput[]> {
  return []
}

// Utilitaires
export function deduplicateJobs(jobs: ScrapedJobInput[]): ScrapedJobInput[] {
  const seenUrls = new Set<string>()
  return jobs.filter(job => {
    if (seenUrls.has(job.url)) return false
    seenUrls.add(job.url)
    return true
  })
}

export async function scoreJobsAgainstCV(jobs: ScrapedJobInput[], userId: string): Promise<ScrapedJobInput[]> {
  // Use 0.5 as default score when not provided (deterministic)
  return jobs.map(j => ({ ...j, matchScore: j.matchScore !== undefined ? j.matchScore : 0.5 }))
}

// Filtre les jobs par score minimum (0.65 par défaut)
export function filterJobsByScore(jobs: ScrapedJobInput[], minScore = 0.65): ScrapedJobInput[] {
  return jobs.filter(j => j.matchScore !== undefined && j.matchScore > minScore)
}

// Orchestrateur Principal
export async function runJobScrapingPipeline(userId: string, minScore = 0.65): Promise<ScrapedJobInput[]> {
  const supabase = await createClient()

  // Utilise Promise.allSettled pour isoler les échecs - si une source échoue, les autres continuent
  const results = await Promise.allSettled([
    scrapeGreenhouseATS(['stripe', 'vercel', 'github']),
    scrapeJobicyRSS({ tag: 'typescript', count: 50 }),
    scrapeSerpApiGoogleJobs({ q: 'Next.js developer', location: 'Remote' }),
    scrapeApifyLinkedIn({ keywords: 'fullstack remote' }),
  ])

  // Log les erreurs sans stopper le pipeline
  results.forEach((r, idx) => {
    if (r.status === 'rejected') {
      console.error(`Scraping task ${idx} failed:`, r.reason)
    }
  })

  // Collect only successful results
  const allJobs = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])

  // Validate payloads with Zod before further processing
  const validJobs = allJobs.filter(job => {
    const result = ScrapedJobSchema.safeParse(job)
    if (!result.success) {
      console.warn(`Invalid job payload for URL ${job.url}:`, result.error)
      return false
    }
    return true
  })

  const deduped = deduplicateJobs(validJobs)
  const scored = await scoreJobsAgainstCV(deduped, userId)

  // Filtre par score minimum (0.65 par défaut)
  const jobsToSave = filterJobsByScore(scored, minScore)

  if (jobsToSave.length > 0) {
    const { error } = await supabase
      .from('jobs')
      .upsert(jobsToSave.map(job => ({
        title: job.title,
        company: job.company,
        url: job.url,
        url_hash: hashUrl(job.url),
        description_text: job.descriptionRaw,
        source: job.source,
        scraped_at: new Date().toISOString()
      })), { onConflict: 'url_hash' })

    if (error) {
      console.error('Failed to save scraped jobs:', error)
    }
  }

  return jobsToSave
}