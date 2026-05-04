import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

// Schema for analytics data
export const AnalyticsSchema = z.object({
  userId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
})

export type AnalyticsParams = z.infer<typeof AnalyticsSchema>

// Get funnel data for Sankey diagram
export async function getFunnelData(userId: string) {
  const supabase = await createClient()
  
  const { data: applications, error } = await supabase
    .from('applications')
    .select('status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching applications:', error)
    return null
  }
  
  // Calculate funnel stages
  const stages = {
    saved: 0,
    applying: 0,
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
    ghosted: 0
  }
  
  applications?.forEach(app => {
    const status = app.status as keyof typeof stages
    if (status in stages) {
      stages[status]++
    }
  })
  
  // Funnel for Sankey
  const funnel = [
    { stage: 'Applied', count: stages.applied },
    { stage: 'Screening', count: stages.screening },
    { stage: 'Interview', count: stages.interview },
    { stage: 'Offer', count: stages.offer },
    { stage: 'Rejected', count: stages.rejected },
    { stage: 'Ghosted', count: stages.ghosted }
  ]
  
  // Conversion rates
  const totalApplied = stages.applied
  const totalScreening = stages.screening
  const totalInterview = stages.interview
  const totalOffer = stages.offer
  
  const rates = {
    screeningRate: totalApplied > 0 ? (totalScreening / totalApplied * 100).toFixed(1) : "0",
    interviewRate: totalScreening > 0 ? (totalInterview / totalScreening * 100).toFixed(1) : "0",
    offerRate: totalInterview > 0 ? (totalOffer / totalInterview * 100).toFixed(1) : "0",
    overallConversion: totalApplied > 0 ? (totalOffer / totalApplied * 100).toFixed(2) : "0"
  }
  
  return {
    funnel,
    stages,
    rates,
    total: applications?.length || 0
  }
}

// Get weekly trends for the last N weeks
export async function getWeeklyTrends(userId: string, weeks: number = 8) {
  const supabase = await createClient()
  
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - (weeks * 7))
  
  const { data: applications } = await supabase
    .from('applications')
    .select('status, created_at')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })
  
  const weeklyData: Record<string, { applied: number; interview: number; offer: number }> = {}
  
  applications?.forEach(app => {
    const date = new Date(app.created_at)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekKey = weekStart.toISOString().split('T')[0]
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { applied: 0, interview: 0, offer: 0 }
    }
    
    if (app.status === 'applied') weeklyData[weekKey].applied++
    if (app.status === 'interview') weeklyData[weekKey].interview++
    if (app.status === 'offer') weeklyData[weekKey].offer++
  })
  
  return Object.entries(weeklyData).map(([week, data]) => ({
    week,
    ...data
  }))
}