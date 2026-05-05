import { NextResponse } from 'next/server'

// Force dynamic rendering for cron job
export const dynamic = 'force-dynamic'

// Job sources to scrape
const SOURCES = [
  {
    name: 'weworkremotely',
    url: 'https://weworkremotely.com/remote-jobs.rss',
    type: 'rss',
  },
  {
    name: 'remoteok',
    url: 'https://remoteok.com/api?tags=customer-support',
    type: 'json',
  },
  {
    name: 'remotive',
    url: 'https://remotive.com/api/remote-jobs?category=customer-support',
    type: 'json',
  },
]

// Keywords to include (case insensitive)
const INCLUDE_KEYWORDS = [
  'customer support',
  'customer success',
  'customer care',
  'support client',
  'customer experience',
]

// Keywords to exclude (case insensitive)
const EXCLUDE_KEYWORDS = ['onsite', 'in-office', 'on-site', 'presentiel obligatoire']

// Scoring function based on job description
function calculateScore(job: { title: string; description: string; remote_type?: string; published_at?: string }) {
  let score = 0
  const text = `${job.title} ${job.description} ${job.remote_type || ''}`.toLowerCase()
  const publishedDate = job.published_at ? new Date(job.published_at) : null

  // +3 if fully remote
  if (
    text.includes('full remote') ||
    text.includes('remote-first') ||
    text.includes('distributed') ||
    job.remote_type?.toLowerCase().includes('remote')
  ) {
    score += 3
  }

  // +2 if hybrid/flexible
  if (
    text.includes('hybrid') ||
    text.includes('partial remote') ||
    text.includes('flexible')
  ) {
    score += 2
  }

  // +2 if published < 72h
  if (publishedDate) {
    const hoursAgo = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60)
    if (hoursAgo < 72) {
      score += 2
    }
  }

  // +2 for neuro-inclusive keywords
  if (
    text.includes('flexible') ||
    text.includes('async') ||
    text.includes('inclusion') ||
    text.includes('neurodiversity') ||
    text.includes('accommodation') ||
    text.includes('work-from-home')
  ) {
    score += 2
  }

  // -5 for onsite requirements
  if (
    text.includes('daily office') ||
    text.includes('required on-site') ||
    text.includes('presentiel obligatoire')
  ) {
    score -= 5
  }

  return Math.max(0, score)
}

// Parse RSS feed from We Work Remotely
async function parseWWR(url: string) {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'JobHunt/1.0' } })
    const text = await response.text()

    const jobs: Array<{
      title: string
      company: string
      location: string
      remote_type: string
      published_at: string
      url: string
      summary: string
    }> = []

    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match

    while ((match = itemRegex.exec(text)) !== null) {
      const item = match[1]
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                 item.match(/<title>(.*?)<\/title>/)?.[1] || ''
      const company = item.match(/<company><!\[CDATA\[(.*?)\]\]><\/company>/)?.[1] ||
                    item.match(/<company>(.*?)<\/company>/)?.[1] || ''
      const location = item.match(/<location><!\[CDATA\[(.*?)\]\]><\/location>/)?.[1] ||
                    item.match(/<location>(.*?)<\/location>/)?.[1] || 'Remote'
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || ''
      const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
                      item.match(/<description>(.*?)<\/description>/)?.[1] || ''

      if (title && link) {
        jobs.push({
          title: title.trim(),
          company: company.trim() || 'Unknown',
          location: location.trim() || 'Remote',
          remote_type: location.includes('Remote') || location.includes('Worldwide') ? 'Remote' : 'Hybrid',
          published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          url: link.trim(),
          summary: description.substring(0, 200).trim(),
        })
      }
    }

    return jobs
  } catch (error) {
    console.error('WWR parse error:', error)
    return []
  }
}

// Parse JSON from Remote OK
async function parseRemoteOK(url: string) {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'JobHunt/1.0' } })
    const data = await response.json()

    return (data || [])
      .filter((job: { company?: string }) => job.company)
      .map((job: {
        id?: string
        company?: string
        position?: string
        location?: string
        tags?: string[]
        date?: string
      }) => ({
        title: job.position || job.company || 'Unknown',
        company: job.company || 'Unknown',
        location: job.location || 'Remote',
        remote_type: job.tags?.some((t) => t.toLowerCase().includes('remote'))
          ? 'Remote'
          : 'Unknown',
        published_at: job.date ? new Date(job.date).toISOString() : new Date().toISOString(),
        url: `https://remoteok.com/l/${job.id}`,
        summary: job.tags?.join(', ') || '',
      }))
  } catch (error) {
    console.error('RemoteOK parse error:', error)
    return []
  }
}

// Parse JSON from Remotive
async function parseRemotive(url: string) {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'JobHunt/1.0' } })
    const data = await response.json()

    return (data.jobs || [])
      .map((job: {
        id?: number
        company_name?: string
        job_title?: string
        candidate_required_location?: string
        publication_date?: string
        url?: string
        description?: string
      }) => ({
        title: job.job_title || 'Unknown',
        company: job.company_name || 'Unknown',
        location: job.candidate_required_location || 'Remote',
        remote_type: 'Remote',
        published_at: job.publication_date
          ? new Date(job.publication_date).toISOString()
          : new Date().toISOString(),
        url: job.url || `https://remotive.com/jobs/${job.id}`,
        summary: job.description?.substring(0, 200).trim() || '',
      }))
  } catch (error) {
    console.error('Remotive parse error:', error)
    return []
  }
}

// Filter jobs by keywords
function filterJobs(jobs: Array<{ title: string; summary: string }>) {
  return jobs.filter((job) => {
    const text = `${job.title} ${job.summary}`.toLowerCase()
    const hasInclude = INCLUDE_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()))
    const hasExclude = EXCLUDE_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()))
    return hasInclude && !hasExclude
  })
}

// GET /api/scrape/direct
export async function GET() {
  try {
    const allJobs: Array<{
      title: string
      company: string
      location: string
      remote_type: string
      published_at: string
      url: string
      summary: string
      score: number
      source: string
    }> = []

    await Promise.allSettled([
      parseWWR(SOURCES[0].url).then((jobs) => {
        filterJobs(jobs).forEach((job) => {
          allJobs.push({ ...job, score: calculateScore(job), source: 'weworkremotely' })
        })
      }),
      parseRemoteOK(SOURCES[1].url).then((jobs) => {
        filterJobs(jobs).forEach((job) => {
          allJobs.push({ ...job, score: calculateScore(job), source: 'remoteok' })
        })
      }),
      parseRemotive(SOURCES[2].url).then((jobs) => {
        filterJobs(jobs).forEach((job) => {
          allJobs.push({ ...job, score: calculateScore(job), source: 'remotive' })
        })
      }),
    ])

    // Deduplicate
    const seen = new Set<string>()
    const uniqueJobs = allJobs.filter((job) => {
      if (seen.has(job.url)) return false
      seen.add(job.url)
      return true
    })

    uniqueJobs.sort((a, b) => b.score - a.score)
    const limitedJobs = uniqueJobs.slice(0, 50)

    return NextResponse.json({
      success: true,
      count: limitedJobs.length,
      jobs: limitedJobs,
      scraped_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json({ success: false, error: 'Failed to scrape jobs' }, { status: 500 })
  }
}