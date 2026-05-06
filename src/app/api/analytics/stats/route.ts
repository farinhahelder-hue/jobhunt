import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { headers } from 'next/headers'

// Force dynamic
export const dynamic = 'force-dynamic'

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// API route handler
export async function GET(request: NextRequest) {
  try {
    // Get auth header
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract token and verify
    const token = authHeader.replace('Bearer ', '').trim()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = user.id

    // ===============================================
    // METRIC 1: Overall Stats
    // ===============================================
    
    // Total applications
    const { count: totalApplications } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Applications by status
    const { data: applicationsByStatus } = await supabase
      .from('applications')
      .select('status')
      .eq('user_id', userId)

    const statusCounts: Record<string, number> = {}
    let wishlistCount = 0
    let savedCount = 0
    let appliedCount = 0
    let interviewingCount = 0
    let offerCount = 0
    let rejectedCount = 0

    applicationsByStatus?.forEach(app => {
      const status = app.status || 'wishlist'
      statusCounts[status] = (statusCounts[status] || 0) + 1
      
      switch(status) {
        case 'wishlist': wishlistCount++; break;
        case 'saved': savedCount++; break;
        case 'applied': appliedCount++; break;
        case 'interviewing': interviewingCount++; break;
        case 'offer': offerCount++; break;
        case 'rejected': rejectedCount++; break;
      }
    })

    // ===============================================
    // METRIC 2: Response Rate
    // ===============================================
    
    // Count "applied" and "interviewing" as responses received
    const responsesReceived = appliedCount + interviewingCount + offerCount
    const responseRate = totalApplications > 0 
      ? Math.round((responsesReceived / totalApplications) * 100) 
      : 0

    // ===============================================
    // METRIC 3: Applications by Source
    // ===============================================
    
    // Join applications with jobs to get source
    const { data: applicationsWithJobs } = await supabase
      .from('applications')
      .select(`
        status,
        job:jobs (
          source
        )
      `)
      .eq('user_id', userId)

    const sourceCounts: Record<string, number> = {}
    const sourceApplied: Record<string, number> = {}
    const sourceInterviewing: Record<string, number> = {}

    applicationsWithJobs?.forEach(app => {
      const source = (app as any).job?.source || 'unknown'
      sourceCounts[source] = (sourceCounts[source] || 0) + 1
      
      if (app.status === 'applied') {
        sourceApplied[source] = (sourceApplied[source] || 0) + 1
      }
      if (app.status === 'interviewing' || app.status === 'offer') {
        sourceInterviewing[source] = (sourceInterviewing[source] || 0) + 1
      }
    })

    // ===============================================
    // METRIC 4: Average ATS Score
    // ===============================================
    
    const { data: appsWithScores } = await supabase
      .from('applications')
      .select('ats_score')
      .eq('user_id', userId)
      .not('ats_score', 'is', null)

    let totalScore = 0
    let scoreCount = 0
    
    appsWithScores?.forEach(app => {
      if (app.ats_score) {
        const score = typeof app.ats_score === 'object' 
          ? (app.ats_score as any).score 
          : app.ats_score
        if (score !== null && score !== undefined) {
          totalScore += Number(score)
          scoreCount++
        }
      }
    })

    const averageAtsScore = scoreCount > 0 
      ? Math.round(totalScore / scoreCount) 
      : null

    // ===============================================
    // METRIC 5: Applications Over Time (last 30 days)
    // ===============================================
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString()

    const { data: recentApps } = await supabase
      .from('applications')
      .select('created_at, status')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgoStr)

    const timeline: Record<string, { total: number, applied: number }> = {}
    
    recentApps?.forEach(app => {
      const date = app.created_at.split('T')[0]
      if (!timeline[date]) {
        timeline[date] = { total: 0, applied: 0 }
      }
      timeline[date].total++
      if (app.status === 'applied') {
        timeline[date].applied++
      }
    })

    // ===============================================
    // METRIC 6: Recent Activity
    // ===============================================
    
    const { data: recentActivity } = await supabase
      .from('application_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    // ===============================================
    // Build Response
    // ===============================================
    
    const analytics = {
      // Overall stats
      total_applications: totalApplications || 0,
      
      // Funnel / status breakdown
      funnel: {
        wishlist: wishlistCount,
        saved: savedCount,
        applied: appliedCount,
        interviewing: interviewingCount,
        offer: offerCount,
        rejected: rejectedCount,
      },
      
      // Response metrics
      response_rate: responseRate,
      responses_received: responsesReceived,
      
      // Source breakdown
      by_source: sourceCounts,
      source_applied: sourceApplied,
      source_interviewing: sourceInterviewing,
      
      // ATS score
      average_ats_score: averageAtsScore,
      applications_scored: scoreCount,
      
      // Timeline
      timeline_30_days: timeline,
      
      // Recent activity
      recent_activity: recentActivity || [],
    }

    return NextResponse.json(analytics)
    
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}