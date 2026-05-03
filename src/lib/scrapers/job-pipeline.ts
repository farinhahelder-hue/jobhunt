import { createClient } from '@/utils/supabase/server'

// Couche 1: ATS Publics
export async function scrapeGreenhouseATS(companies: string[]) {
  // Implementation placeholder
  return companies.map(c => ({
    title: `Software Engineer at ${c}`,
    company: c,
    url: `https://boards.greenhouse.io/${c}/jobs/123`,
    descriptionRaw: 'Lorem ipsum...',
    source: 'GREENHOUSE_ATS',
    matchScore: 0.8
  }))
}

// Couche 2: RSS/APIs
export async function scrapeJobicyRSS(params: { tag: string, count: number }) {
  // Implementation placeholder
  return [{
    title: `Remote ${params.tag} Developer`,
    company: 'Tech Corp',
    url: 'https://jobicy.com/jobs/123',
    descriptionRaw: 'Lorem ipsum...',
    source: 'JOBICY_RSS',
    matchScore: 0.7
  }]
}

export async function scrapeSerpApiGoogleJobs(params: { q: string, location: string }) {
  // Implementation placeholder
  return []
}

// Couche 3: Scraping Actif
export async function scrapeApifyLinkedIn(params: { keywords: string }) {
  // Implementation placeholder
  return []
}

// Utilitaires
export function deduplicateJobs(jobs: any[]) {
  const seenUrls = new Set()
  return jobs.filter(job => {
    if (seenUrls.has(job.url)) return false
    seenUrls.add(job.url)
    return true
  })
}

export async function scoreJobsAgainstCV(jobs: any[], userId: string) {
  // Implementation placeholder: Call Ollama or OpenAI
  return jobs.map(j => ({ ...j, matchScore: j.matchScore || Math.random() }))
}

// Orchestrateur Principal
export async function runJobScrapingPipeline(userId: string) {
  const supabase = await createClient()

  const results = await Promise.allSettled([
    scrapeGreenhouseATS(['stripe', 'vercel', 'github']),
    scrapeJobicyRSS({ tag: 'typescript', count: 50 }),
    scrapeSerpApiGoogleJobs({ q: 'Next.js developer', location: 'Remote' }),
    scrapeApifyLinkedIn({ keywords: 'fullstack remote' }),
  ]);

  const allJobs = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  const deduped = deduplicateJobs(allJobs);
  const scored = await scoreJobsAgainstCV(deduped, userId);

  const jobsToSave = scored.filter(j => j.matchScore > 0.65);

  if (jobsToSave.length > 0) {
    const { error } = await supabase
      .from('jobs')
      .upsert(jobsToSave.map(job => ({
        title: job.title,
        company: job.company,
        url: job.url,
        url_hash: Buffer.from(job.url).toString('base64').substring(0, 64),
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
