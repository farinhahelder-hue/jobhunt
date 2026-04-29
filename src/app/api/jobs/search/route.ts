import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)

    const keywords = searchParams.get('keywords')
    const location = searchParams.get('location')
    const remote = searchParams.get('remote')
    const job_type = searchParams.get('job_type')
    const language = searchParams.get('language')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('jobs')
      .select('*')
      .order('scraped_at', { ascending: false })
      .limit(limit)

    if (keywords) {
      query = query.or(`title.ilike.%${keywords}%,company.ilike.%${keywords}%`)
    }
    if (location) {
      query = query.ilike('location', `%${location}%`)
    }
    if (remote === 'true') {
      query = query.eq('remote', true)
    }
    if (job_type) {
      query = query.eq('job_type', job_type)
    }
    if (language) {
      query = query.eq('detected_language', language)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ jobs: data || [] })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search jobs' },
      { status: 500 }
    )
  }
}