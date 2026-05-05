import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const openaiKey = process.env.OPENAI_API_KEY || ''
const serverSupabase = createSupabaseClient(supabaseUrl, serviceKey)

// POST /api/cover-letter/generate
export async function POST(request: Request) {
  try {
    const { job_id, user_id } = await request.json()

    if (!job_id || !user_id) {
      return NextResponse.json({ success: false, error: 'Missing job_id or user_id' })
    }

    if (!openaiKey) {
      return NextResponse.json({ success: false, error: 'OpenAI API key not configured' })
    }

    // Get job details
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, title, company, description, url, requirements, nice_to_have')
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

    // Build prompt for cover letter
    const systemPrompt = `You are a professional career coach specialized in neurodiversity.
Write compelling, direct cover letters that highlight the candidate's strengths.
Keep it to 250-400 words maximum.
Use a conversational but professional tone — no corporate buzzwords.
Focus on what makes the candidate uniquely qualified.
End with a clear call to action.`

    const userPrompt = `Write a cover letter for this position:

**Position:** ${job.title}
**Company:** ${job.company}
**Job Description:** ${job.description?.substring(0, 2000) || 'Not provided'}
**Requirements:** ${job.requirements || 'Not specified'}

**My Background:**
${resume.content.substring(0, 3000)}

Write the cover letter now. Keep it concise, authentic, and impactful.`

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
        max_tokens: 800,
      }),
    })

    if (!aiResponse.ok) {
      const err = await aiResponse.text()
      console.error('OpenAI error:', err)
      return NextResponse.json({ success: false, error: 'Failed to generate cover letter' })
    }

    const aiData = await aiResponse.json()
    const coverLetter = aiData.choices?.[0]?.message?.content || ''

    if (!coverLetter) {
      return NextResponse.json({ success: false, error: 'Empty response from AI' })
    }

    return NextResponse.json({
      success: true,
      cover_letter: coverLetter,
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
      },
    })
  } catch (error) {
    console.error('Cover letter error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate cover letter' })
  }
}