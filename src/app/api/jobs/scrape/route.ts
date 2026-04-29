import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import crypto from 'crypto'

// User agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
]

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

function getRandomDelay() {
  return Math.floor(Math.random() * 1700) + 800 // 800-2500ms
}

// Simple hash for URL deduplication
function hashUrl(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex').substring(0, 16)
}

// Scrape LinkedIn Jobs
async function scrapeLinkedIn(
  keywords: string,
  location: string,
  remote: boolean
): Promise<any[]> {
  // In production, this would use Playwright
  // For now, return mock data structure
  console.log(`Scraping LinkedIn for: ${keywords} in ${location}`)
  
  // Return empty - would need Playwright setup
  return []
}

// Scrape Indeed
async function scrapeIndeed(
  keywords: string,
  location: string,
  remote: boolean
): Promise<any[]> {
  console.log(`Scraping Indeed for: ${keywords} in ${location}`)
  
  // Return empty - would need Playwright setup  
  return []
}

// Main scrape function
async function scrapeJobs(filters: any) {
  const { keywords, location, remote, language, job_type, sources = ['linkedin', 'indeed'] } = filters
  
  const results: any[] = []
  
  for (const source of sources) {
    await new Promise(resolve => setTimeout(resolve, getRandomDelay()))
    
    try {
      if (source === 'linkedin') {
        const jobs = await scrapeLinkedIn(keywords, location, remote)
        results.push(...jobs)
      } else if (source === 'indeed') {
        const jobs = await scrapeIndeed(keywords, location, remote)
        results.push(...jobs)
      }
    } catch (err) {
      console.error(`Error scraping ${source}:`, err)
    }
  }
  
  return results
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const filters = await request.json()
    
    // Run scraping in background
    const jobs = await scrapeJobs(filters)
    
    // Save to database
    const savedJobs = []
    
    for (const job of jobs) {
      const urlHash = hashUrl(job.url)
      
      // Check for duplicates
      const { data: existing } = await supabase
        .from('jobs')
        .select('id')
        .eq('url_hash', urlHash)
        .single()
      
      if (!existing) {
        const { data, error } = await supabase
          .from('jobs')
          .insert({
            title: job.title,
            company: job.company,
            location: job.location,
            description_text: job.description_text,
            description_html: job.description_html,
            url: job.url,
            url_hash: urlHash,
            source: job.source,
            posted_at: job.posted_at,
            detected_language: job.detected_language || 'en',
            salary_range: job.salary_range,
            skills_required: job.skills_required,
            remote: job.remote,
            job_type: job.job_type,
          })
          .select()
          .single()
        
        if (!error && data) {
          savedJobs.push(data)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      scraped: savedJobs.length,
      jobs: savedJobs,
    })
  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json(
      { error: 'Failed to scrape jobs' },
      { status: 500 }
    )
  }
}