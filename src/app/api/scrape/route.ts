/**
 * Scraping API - GET /api/scrape?source=autypik&keywords=développeur
 * 
 * Deploys to Vercel/Netlify for web access
 */

import { NextResponse } from 'next/server'

const SOURCES = {
  autypik: 'https://autypik.fr',
  mission: 'https://www.mission-handicap.com',
  handialt: 'https://www.handialternance.com',
  auticonsult: 'https://www.auticonsult.com'
}

async function scrapeSource(name: string, keywords: string, location: string, limit: number) {
  const baseUrl = SOURCES[name as keyof typeof SOURCES]
  if (!baseUrl) return []
  
  try {
    const url = `${baseUrl}/search?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(location)}&limit=${limit}`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JobHunt/1.0 (https://github.com/farinhahelder-hue/jobhunt)',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(10000)
    })
    
    if (!response.ok) {
      console.log(`Failed to fetch ${name}: ${response.status}`)
      return []
    }
    
    const html = await response.text()
    return parseJobsFromHtml(html, name)
  } catch (error) {
    console.log(`Error scraping ${name}:`, error)
    return []
  }
}

function parseJobsFromHtml(html: string, source: string) {
  const jobs: any[] = []
  
  // Extract titles using regex patterns
  const titlePattern = /<h[2-3][^>]*>([^<]{5,100})<\/?h[2-3]>/gi
  const linkPattern = /href="([^"#]+(?:offre|job|emploi)[^"]+)"/gi
  const companyPattern = /(?:company|entreprise|employeur)[^>]*>([^<]+)</gi
  
  const titles = html.match(titlePattern) || []
  const links = html.match(linkPattern) || []
  const companies = html.match(companyPattern) || []
  
  for (let i = 0; i < Math.min(titles.length, 10); i++) {
    const title = titles[i]?.replace(/<[^>]+>/g, '').trim()
    const link = links[i]?.match(/href="([^"]+)"/)?.[1]
    const company = companies[i]?.replace(/<[^>]+>/g, '').trim() || ''
    
    if (title && title.length > 5) {
      jobs.push({
        title,
        company,
        url: link || '',
        location: '',
        description: '',
        source,
        scraped_at: new Date().toISOString()
      })
    }
  }
  
  return jobs
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  const source = searchParams.get('source') || 'all'
  const keywords = searchParams.get('keywords') || 'développeur'
  const location = searchParams.get('location') || 'france'
  const limit = parseInt(searchParams.get('limit') || '10')
  
  const results: Record<string, any[]> = {}
  const sourceList = source === 'all' 
    ? Object.keys(SOURCES)
    : source.split(',')
  
  for (const name of sourceList) {
    if (SOURCES[name as keyof typeof SOURCES]) {
      results[name] = await scrapeSource(name, keywords, location, limit)
    }
  }
  
  const allJobs = Object.values(results).flat()
  
  return NextResponse.json({
    source,
    keywords,
    location,
    count: allJobs.length,
    jobs: allJobs.slice(0, limit),
    fetched_at: new Date().toISOString()
  })
}