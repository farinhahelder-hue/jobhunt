import { NextRequest, NextResponse } from 'next/server'

// URL du Python scraper sur Render
const SCRAPER_URL = process.env.SCRAPER_URL || 'https://jobhunt-y03c.onrender.com'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const query = searchParams.get('query') || searchParams.get('keywords') || 'developpeur'
    const location = searchParams.get('location') || 'France'
    const max = parseInt(searchParams.get('max') || searchParams.get('limit') || '20')
    const boards = searchParams.get('boards')

    // Appeler le scraper Python sur Render
    const scraperUrl = `${SCRAPER_URL}/search?query=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&max=${max}${boards ? '&boards=' + boards : ''}`

    const response = await fetch(scraperUrl, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Scraper error: ${response.status}`)
    }

    const data = await response.json()

    // Sauvegarder les jobs dans Supabase (optionnel - décommenter si Supabase configuré)
    /*
    const supabase = createClient()
    if (data.jobs?.length > 0) {
      for (const job of data.jobs) {
        await supabase.from('jobs').upsert({
          title: job.title,
          company: job.company,
          location: job.location,
          description_text: job.description_snippet,
          url: job.url,
          url_hash: job.url ? btoa(job.url).slice(0, 64) : null,
          source: job.source,
          posted_at: job.posted_at,
          detected_language: 'fr',
          remote: job.remote === 'partial',
          scraped_at: new Date().toISOString(),
        }, { onConflict: 'url' })
      }
    }
    */

    return NextResponse.json(data)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search jobs', jobs: [] },
      { status: 500 }
    )
  }
}
