import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Force dynamic for cron job
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const resendKey = process.env.RESEND_API_KEY || ''
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

const serverSupabase = createSupabaseClient(supabaseUrl, serviceKey)

// Days threshold for "ghosted" status
const GHOSTED_DAYS = 14

// GET /api/notify/ghosted
// Cron job to remind users about applications with no response
export async function GET() {
  try {
    if (!resendKey) {
      return NextResponse.json({ success: false, error: 'RESEND_API_KEY not configured' })
    }

    const ghostedDate = new Date()
    ghostedDate.setDate(ghostedDate.getDate() - GHOSTED_DAYS)
    const ghostedDateStr = ghostedDate.toISOString()

    // Find applications that:
    // - Are in "applied" status
    // - Have no status change for GHOSTED_DAYS days
    // - Haven't been marked as "ghosted" yet
    const { data: ghostedApps, error: appsError } = await serverSupabase
      .from('applications')
      .select(`
        id,
        user_id,
        status,
        updated_at,
        job:jobs(
          id,
          title,
          company,
          location,
          url
        )
      `)
      .eq('status', 'applied')
      .lte('updated_at', ghostedDateStr)
      .not('status', 'eq', 'ghosted')

    if (appsError) {
      console.error('Ghosted apps error:', appsError)
      return NextResponse.json({ success: false, error: appsError.message })
    }

    if (!ghostedApps || ghostedApps.length === 0) {
      return NextResponse.json({ success: true, reminded: 0, message: 'No ghosted applications' })
    }

    // Group by user
    const userApps: Record<string, any[]> = {}
    ghostedApps.forEach(app => {
      const userId = app.user_id
      if (!userApps[userId]) userApps[userId] = []
      userApps[userId].push(app)
    })

    let totalReminded = 0

    // Process each user
    for (const [userId, apps] of Object.entries(userApps)) {
      // Get user email
      const { data: profile, error: profileError } = await serverSupabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('user_id', userId)
        .single()

      if (profileError || !profile?.email) continue

      const jobList = apps
        .map((app: any) => app.job)
        .filter((job: any) => job)

      if (jobList.length === 0) continue

      // Build email
      const jobsHtml = jobList
        .map((job: any) => `
          <div style="padding: 12px; margin-bottom: 8px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">
            <div style="font-weight: 600;">${job.title}</div>
            <div style="font-size: 14px; color: #666;">${job.company} · ${job.location}</div>
            <a href="${job.url}" style="color: #2563eb; font-size: 14px;">View Job →</a>
          </div>
        `)
        .join('')

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>👻 No response after ${GHOSTED_DAYS} days</h2>
    <p>Hi${profile.full_name ? ` ${profile.full_name}` : ''},</p>
    <p>You haven't heard back from these applications in ${GHOSTED_DAYS}+ days. Consider following up:</p>
    
    ${jobsHtml}
    
    <div style="margin-top: 20px; padding: 16px; background: #fef9c3; border-radius: 8px;">
      <h3 style="margin-top: 0;">💡 Tips</h3>
      <ul>
        <li>Send a polite follow-up email</li>
        <li>Check if the position was filled</li>
        <li>Network with someone at the company</li>
        <li>Move to "rejected" if confirmed no longer available</li>
      </ul>
    </div>
    
    <p style="font-size: 12px; color: #999; margin-top: 20px;">
      Sent by JobPilot<br/>
      <a href="${siteUrl}/board">View your board</a> · <a href="${siteUrl}/settings">Settings</a>
    </p>
  </div>
</body>
</html>
`

      // Send email
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'JobPilot <notifications@jobpilot.dev>',
          to: profile.email,
          subject: `👻 ${jobList.length} applications ghosted after ${GHOSTED_DAYS} days - JobPilot`,
          html: emailHtml,
        }),
      })

      if (resendResponse.ok) {
        totalReminded += jobList.length
      }
    }

    return NextResponse.json({
      success: true,
      reminded: totalReminded,
    })
  } catch (error) {
    console.error('Ghosted notify error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' })
  }
}