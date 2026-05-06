import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Force dynamic
export const dynamic = 'force-dynamic'

// CORS headers for Chrome extension
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, serviceKey)

// Generate URL hash for deduplication
function hashUrl(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex').substring(0, 16)
}

// POST handler
export async function POST(request: NextRequest) {
  // Add CORS headers
  const headers = new Headers(CORS_HEADERS)

  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers }
      )
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Invalid authorization header' }),
        { status: 401, headers }
      )
    }

    // Verify token with Supabase
    const { data: userData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !userData?.user) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers }
      )
    }

    const userId = userData.user.id
    const email = userData.user.email

    // Parse request body
    const body = await request.json()
    const { title, company, location, description, url, source, status = 'saved' } = body

    // Validate required fields
    if (!title || !company || !url) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Missing required fields: title, company, url' }),
        { status: 400, headers }
      )
    }

    // Generate URL hash
    const urlHash = hashUrl(url)

    // Check if job already exists
    const { data: existingJob } = await supabase
      .from('jobs')
      .select('id')
      .eq('url_hash', urlHash)
      .single()

    let jobId: string

    if (existingJob) {
      // Update existing job
      jobId = existingJob.id
      await supabase
        .from('jobs')
        .update({
          title,
          company,
          location,
          description_text: description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    } else {
      // Insert new job
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert({
          user_id: userId,
          title,
          company,
          location,
          description_text: description,
          url,
          url_hash: urlHash,
          source: source || 'chrome-extension',
          scraped_at: new Date().toISOString(),
          detected_language: 'en',
        })
        .select('id')
        .single()

      if (jobError) {
        console.error('Job insert error:', jobError)
        return new NextResponse(
          JSON.stringify({ success: false, error: 'Failed to save job' }),
          { status: 500, headers }
        )
      }

      jobId = newJob.id
    }

    // Check if application already exists for this job/user
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('user_id', userId)
      .single()

    let applicationId: string

    if (existingApp) {
      // Update existing application status
      applicationId = existingApp.id
      await supabase
        .from('applications')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
    } else {
      // Create new application
      const { data: newApp, error: appError } = await supabase
        .from('applications')
        .insert({
          user_id: userId,
          job_id: jobId,
          status,
          kanban_column: status,
        })
        .select('id')
        .single()

      if (appError) {
        console.error('Application insert error:', appError)
        return new NextResponse(
          JSON.stringify({ success: false, error: 'Failed to create application' }),
          { status: 500, headers }
        )
      }

      applicationId = newApp.id
    }

    // Return success
    return new NextResponse(
      JSON.stringify({
        success: true,
        job_id: jobId,
        application_id: applicationId,
        message: 'Job saved successfully',
      }),
      { status: 200, headers }
    )
  } catch (error) {
    console.error('Save API error:', error)
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers }
    )
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}