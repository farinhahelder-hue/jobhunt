import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Server-side client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const serverSupabase = createSupabaseClient(supabaseUrl, serviceKey)

// GET /api/jobs/list
export async function GET() {
  try {
    const { data: jobs, error } = await serverSupabase
      .from('jobs')
      .select('*')
      .order('score', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: jobs?.length || 0,
      jobs: jobs || [],
      fetched_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Jobs list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch jobs' }, { status: 500 })
  }
}