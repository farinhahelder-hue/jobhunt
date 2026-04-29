import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Detect language of text
async function detectLanguage(text: string): Promise<string> {
  // Use simple word frequency detection
  const frenchWords = ['pour', 'avec', 'dans', 'sur', 'est', 'vous', 'nous', 'être', 'avez', 'été']
  const germanWords = ['und', 'der', 'die', 'das', 'mit', 'für', 'ist', 'sein', 'haben', 'werden']
  const spanishWords = ['para', 'con', 'en', 'los', 'las', 'que', 'es', 'ser', 'tener', 'hacer']
  
  const words = text.toLowerCase().split(/\s+/)
  const lowerText = text.toLowerCase()
  
  let frenchCount = 0
  let germanCount = 0
  let spanishCount = 0
  
  frenchWords.forEach(w => { if (lowerText.includes(w)) frenchCount++ })
  germanWords.forEach(w => { if (lowerText.includes(w)) germanCount++ })
  spanishWords.forEach(w => { if (lowerText.includes(w)) spanishCount++ })
  
  if (frenchCount > germanCount && frenchCount > spanishCount) return 'fr'
  if (germanCount > frenchCount && germanCount > spanishCount) return 'de'
  if (spanishCount > frenchCount && spanishCount > germanCount) return 'es'
  return 'en'
}

// Generate resume and cover letter
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { job_id, template = 'minimal' } = body

    // Get job details
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Get user's base resume
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: baseResume } = await supabase
      .from('base_resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Detect job language
    const jobLanguage = await detectLanguage(job.description_text || '')

    // Step 1: Analyze job requirements
    const analysisPrompt = `Analyze this job description and extract:
1. Key requirements (skills, experience)
2. Key responsibilities
3. Keywords that should appear in a resume
4. The tone (startup/casual vs corporate/formal)

Job Description:
${job.description_text?.substring(0, 2000)}

Return as a structured JSON.`

    const analysis = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: analysisPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const jobAnalysis = JSON.parse(analysis.choices[0]?.message?.content || '{}')

    // Step 2: Adapt resume
    let resumeHtml = ''

    if (baseResume?.content_text) {
      const adaptPrompt = `You are a resume optimization expert. Adapt this resume to match the job requirements.
Keep all facts true - only rephrase and reorder to highlight relevant experience.
Output as HTML using the "${template}" template style.

Job Requirements:
${JSON.stringify(jobAnalysis)}

Original Resume:
${baseResume.content_text}

User Profile:
Name: ${profile?.full_name || 'Your Name'}
Email: ${profile?.email || 'your@email.com'}
Phone: ${profile?.phone || ''}
Location: ${profile?.location || ''}

Template style: ${template}`

      const resumeResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: adaptPrompt }],
        temperature: 0.5,
      })

      resumeHtml = resumeResponse.choices[0]?.message?.content || ''
    } else {
      // Create basic resume from profile
      resumeHtml = `
<div class="resume resume-${template}">
  <header>
    <h1>${profile?.full_name || 'Your Name'}</h1>
    <p>${profile?.email || 'email@example.com'} | ${profile?.phone || ''} | ${profile?.location || 'Location'}</p>
  </header>
  <section>
    <h2>Summary</h2>
    <p>Professional with experience in ${profile?.languages ? Object.keys(profile.languages).join(', ') : 'multiple languages'}.</p>
  </section>
</div>`
    }

    // Step 3: Generate cover letter
    const coverLetterPrompt = `Write a professional cover letter in ${jobLanguage === 'fr' ? 'French' : jobLanguage === 'de' ? 'German' : jobLanguage === 'es' ? 'Spanish' : 'English'} for this job application.
Match the company's tone from the job analysis.

Job: ${job.title} at ${job.company}
Tone: ${jobAnalysis.tone || 'professional'}

User Profile:
Name: ${profile?.full_name || 'Your Name'}

Cover Letter (HTML):`

    const coverLetterResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: coverLetterPrompt }],
      temperature: 0.5,
      max_tokens: 1000,
    })

    let coverLetterHtml = coverLetterResponse.choices[0]?.message?.content || ''

    // Add basic structure if empty
    if (!coverLetterHtml) {
      coverLetterHtml = `
<div class="cover-letter">
  <p>Dear Hiring Manager,</p>
  <p>I am writing to express my interest in the ${job.title} position at ${job.company}.</p>
  <p>I have carefully reviewed the job requirements and I am confident that my skills and experience make me a strong candidate for this role.</p>
  <p>Thank you for considering my application. I look forward to the opportunity to discuss how I can contribute to your team.</p>
  <p>Sincerely,<br/>${profile?.full_name || 'Your Name'}</p>
</div>`
    }

    return NextResponse.json({
      resume_html: resumeHtml,
      cover_letter_html: coverLetterHtml,
      template,
      job_language: jobLanguage,
    })
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate documents' },
      { status: 500 }
    )
  }
}