import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Force dynamic rendering for cron job
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const resendKey = process.env.RESEND_API_KEY || ''
const serverSupabase = createSupabaseClient(supabaseUrl, serviceKey)

// GET /api/notify
// Called by cron after scraping to check for new high-score jobs
export async function GET() {
  try {
    // If no Resend key, skip
    if (!resendKey) {
      return NextResponse.json({ success: false, error: 'RESEND_API_KEY not configured' })
    }

    // Get all users with notifications enabled
    const { data: profiles, error: profileError } = await serverSupabase
      .from('user_profiles')
      .select('user_id, email, notification_preferences')
      .contains('notification_preferences', { email_notifications: true })

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ success: false, error: profileError.message })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ success: true, notified: 0, message: 'No users with notifications' })
    }

    let totalNotified = 0

    // Process each user
    for (const profile of profiles) {
      const prefs = profile.notification_preferences || { notify_score_threshold: 7 }
      const threshold = prefs.notify_score_threshold || 7

      // Get jobs with score >= user's threshold from last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { data: highScoreJobs, error: jobsError } = await serverSupabase
        .from('jobs')
        .select('id, title, company, location, url, score, published_at, source')
        .gte('score', threshold)
        .gte('published_at', yesterday)
        .order('score', { ascending: false })
        .limit(10)

      if (jobsError || !highScoreJobs || highScoreJobs.length === 0) {
        continue
      }

      // Build email content
      const jobList = highScoreJobs
        .map((job, i) => `${i + 1}. **${job.title}** at ${job.company}\n   Score: ${job.score} | ${job.location} | ${job.source}\n   🔗 ${job.url}`)
        .join('\n\n')

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .job { padding: 16px; margin-bottom: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #16a34a; }
    .job-title { font-weight: 600; margin-bottom: 4px; }
    .job-meta { font-size: 14px; color: #666; }
    .score { display: inline-block; background: #16a34a; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-right: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>🎯 ${highScoreJobs.length} New Jobs with Score ≥ ${threshold}</h2>
    
    ${highScoreJobs.map(job => `
    <div class="job">
      <div class="job-title">${job.title}</div>
      <div class="job-meta">${job.company} · ${job.location}</div>
      <span class="score">${job.score}</span>
      <a href="${job.url}">View Job →</a>
    </div>
    `).join('')}
    
    <p style="font-size: 12px; color: #999; margin-top: 20px;">
      Sent by JobPilot - Your job search assistant<br/>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://jobhunt-six-sigma.vercel.app'}/settings">Manage notifications</a>
    </p>
  </div>
</body>
</html>
`

      // Send via Resend API
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'JobPilot <notifications@jobpilot.dev>',
          to: profile.email,
          subject: `🎯 ${highScoreJobs.length} New Jobs with Score ≥ ${threshold} - JobPilot`,
          html: emailHtml,
        }),
      })

      if (resendResponse.ok) {
        totalNotified++
      }
    }

    return NextResponse.json({ 
      success: true, 
      notified_users: totalNotified,
    })
  } catch (error) {
    console.error('Notify error:', error)
    return NextResponse.json({ success: false, error: 'Failed to notify' })
  }
}