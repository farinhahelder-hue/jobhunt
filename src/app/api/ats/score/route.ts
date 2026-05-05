import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const openaiKey = process.env.OPENAI_API_KEY || ''
const serverSupabase = createSupabaseClient(supabaseUrl, serviceKey)

// POST /api/ats/score
export async function POST(request: Request) {
  try {
    const { job_id, user_id } = await request.json()

    if (!job_id || !user_id) {
      return NextResponse.json({ success: false, error: 'Missing job_id or user_id' })
    }

    // Get job description
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, title, company, description, url')
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ success: false, error: 'Job not found' })
    }

    // Get user's resume
    const { data: resume, error: resumeError } = await serverSupabase
      .from('base_resumes')
      .select('content')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (resumeError || !resume) {
      return NextResponse.json({ success: false, error: 'No resume found. Please upload your CV first.' })
    }

    if (!openaiKey) {
      return NextResponse.json({ success: false, error: 'OpenAI API key not configured' })
    }

    // Build prompt
    const systemPrompt = `You are an ATS (Applicant Tracking System) evaluator. 
Analyze how well a resume matches a job description.
Return a JSON response with:
- ats_score: number (0-100)
- matching_keywords: string[] (keywords from job that appear in resume)
- missing_keywords: string[] (important keywords from job NOT in resume)
- assessment: string (brief 1-2 sentence assessment)

Focus on:
- Technical skills match
- Experience level match
- Keywords from job posting
- Action verbs and achievements`

    const userPrompt = `Job Title: ${job.title}
Job Company: ${job.company}
Job Description: ${job.description?.substring(0, 3000) || 'No description'}

Resume:
${resume.content.substring(0, 4000)}

Return your assessment as JSON.`

    // Call OpenAI
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
      }),
    })

    if (!aiResponse.ok) {
      const err = await aiResponse.text()
      console.error('OpenAI error:', err)
      return NextResponse.json({ success: false, error: 'Failed to get ATS score' })
    }

    const aiData = await aiResponse.json()
    const content = aiData.choices?.[0]?.message?.content || '{}'

    let parsed: any = { ats_score: 50 }
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      const match = content.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          parsed = JSON.parse(match[0])
        } catch (e2) {
          console.error('Parse failed:', e2)
        }
      }
    }

    const atsScore = Math.min(100, Math.max(0, parsed.ats_score || 50))

    return NextResponse.json({
      success: true,
      ats_score: atsScore,
      ats_details: {
        matching_keywords: parsed.matching_keywords || [],
        missing_keywords: parsed.missing_keywords || [],
        assessment: parsed.assessment || 'Assessment complete.',
      },
    })
  } catch (error) {
    console.error('ATS score error:', error)
    return NextResponse.json({ success: false, error: 'Failed to calculate ATS score' })
  }
}