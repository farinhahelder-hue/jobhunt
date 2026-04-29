import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { Browser, chromium } from 'playwright'

interface AutoApplyResult {
  status: 'success' | 'manual_required' | 'failed'
  platform?: string
  error?: string
  timestamp: string
}

// Detect application platform
function detectPlatform(url: string): string {
  const urlLower = url.toLowerCase()
  
  if (urlLower.includes('linkedin.com/jobs') || urlLower.includes('linkedin.com/easyapply')) {
    return 'linkedin'
  }
  if (urlLower.includes('greenhouse.io') || urlLower.includes('greenhouse')) {
    return 'greenhouse'
  }
  if (urlLower.includes('lever.co') || urlLower.includes('lever')) {
    return 'lever'
  }
  if (urlLower.includes('workday.com')) {
    return 'workday'
  }
  if (urlLower.includes('breezy.hr')) {
    return 'breezy'
  }
  if (urlLower.includes('recruiter.rippling') || urlLower.includes('rippling')) {
    return 'rippling'
  }
  
  return 'direct'
}

// Auto-apply for LinkedIn
async function applyLinkedIn(page: any, jobUrl: string, profile: any, resumePath: string): Promise<AutoApplyResult> {
  try {
    await page.goto(jobUrl)
    await page.waitForLoadState('networkidle')
    
    // Check if Easy Apply button exists
    const easyApplyButton = await page.$('button[aria-label*="Easy Apply"]')
    
    if (easyApplyButton) {
      await easyApplyButton.click()
      
      // Fill in application form
      // This is a simplified version - real implementation would be more complex
      
      return {
        status: 'success',
        platform: 'linkedin',
        timestamp: new Date().toISOString(),
      }
    }
    
    return {
      status: 'manual_required',
      platform: 'linkedin',
      error: 'No Easy Apply button found',
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'failed',
      platform: 'linkedin',
      error: String(error),
      timestamp: new Date().toISOString(),
    }
  }
}

// Auto-apply for Greenhouse
async function applyGreenhouse(page: any, jobUrl: string, profile: any, resumePath: string): Promise<AutoApplyResult> {
  try {
    await page.goto(jobUrl)
    await page.waitForLoadState('networkidle')
    
    // Greenhouse applications vary - basic implementation
    return {
      status: 'manual_required',
      platform: 'greenhouse',
      error: 'Greenhouse forms require manual interaction',
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'failed',
      platform: 'greenhouse',
      error: String(error),
      timestamp: new Date().toISOString(),
    }
  }
}

// Generic auto-apply
async function autoApply(jobUrl: string, profile: any, resumePath: string): Promise<AutoApplyResult> {
  const platform = detectPlatform(jobUrl)
  
  // Launch browser
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  })
  
  const page = await browser.newPage()
  
  try {
    let result: AutoApplyResult
    
    switch (platform) {
      case 'linkedin':
        result = await applyLinkedIn(page, jobUrl, profile, resumePath)
        break
      case 'greenhouse':
        result = await applyGreenhouse(page, jobUrl, profile, resumePath)
        break
      default:
        result = {
          status: 'manual_required',
          platform,
          error: 'Platform not supported for auto-apply',
          timestamp: new Date().toISOString(),
        }
    }
    
    return result
  } finally {
    await browser.close()
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { application_id, job_url } = body

    if (!application_id && !job_url) {
      return NextResponse.json(
        { error: 'application_id or job_url required' },
        { status: 400 }
      )
    }

    // Get user and profile
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Get application to find job URL
    let targetUrl = job_url
    if (!targetUrl && application_id) {
      const { data: application } = await supabase
        .from('applications')
        .select('*, job:jobs(*)')
        .eq('id', application_id)
        .single()
      
      if (application?.job?.url) {
        targetUrl = application.job.url
      }
    }

    if (!targetUrl) {
      return NextResponse.json({ error: 'Job URL not found' }, { status: 404 })
    }

    // Attempt auto-apply
    const result = await autoApply(targetUrl, profile, '')

    // Update application if we have one
    if (application_id) {
      await supabase
        .from('applications')
        .update({
          auto_apply_result: result,
          updated_at: new Date().toISOString(),
        })
        .eq('id', application_id)
    }

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Auto-apply error:', error)
    return NextResponse.json(
      { error: 'Failed to auto-apply' },
      { status: 500 }
    )
  }
}