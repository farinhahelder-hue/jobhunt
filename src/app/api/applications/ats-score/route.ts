import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ATSScore {
  overall: number
  keyword_match: number
  missing_keywords: string[]
  format_score: number
  length_score: number
  language_match: boolean
  suggestions: string[]
  ats_safe: boolean
}

// Extract keywords from text
function extractKeywords(text: string): string[] {
  // Common programming/skills keywords
  const keywords = [
    'javascript', 'typescript', 'python', 'java', 'react', 'node', 'angular', 'vue',
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'docker', 'kubernetes', 'aws',
    'azure', 'gcp', 'linux', 'git', 'agile', 'scrum', 'rest', 'api', 'graphql',
    'machine learning', 'data science', 'ai', 'deep learning', 'tensorflow', 'pytorch',
    'frontend', 'backend', 'fullstack', 'full-stack', 'devops', 'ci/cd', 'jira',
  ]
  
  const lowerText = text.toLowerCase()
  const found: string[] = []
  
  for (const keyword of keywords) {
    if (lowerText.includes(keyword)) {
      found.push(keyword)
    }
  }
  
  return found
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { resume_text, cover_letter_text, job_id } = body

    // Get job details
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const jobDescription = job.description_text || ''
    
    // Use AI for comprehensive scoring
    try {
      const scoringPrompt = `Analyze these documents against the job description and provide an ATS score.
Return a JSON object with these exact fields:
{
  "overall": number (0-100),
  "keyword_match": number (percentage 0-100),
  "missing_keywords": array of strings (top 10 missing keywords),
  "format_score": number (0-100, penalize tables, columns, images),
  "length_score": number (0-100, ideal 400-700 words for resume),
  "language_match": boolean (does document language match job language),
  "suggestions": array of strings (3-5 actionable improvements),
  "ats_safe": boolean (true if score >= 70)
}

Job Description (first 1500 chars):
${jobDescription.substring(0, 1500)}

Resume:
${resume_text?.substring(0, 1500) || 'No resume'}

Cover Letter:
${cover_letter_text?.substring(0, 1000) || 'No cover letter'}`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: scoringPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      })

      const score = JSON.parse(response.choices[0]?.message?.content || '{}') as ATSScore
      
      return NextResponse.json({ ats_score: score })
    } catch (aiError) {
      // Fallback to simple scoring if AI fails
      const resumeWords = (resume_text || '').split(/\s+/).length
      const jobKeywords = extractKeywords(jobDescription)
      const resumeKeywords = extractKeywords(resume_text || '')
      
      const matched = jobKeywords.filter(k => resumeKeywords.includes(k))
      const missing = jobKeywords.filter(k => !resumeKeywords.includes(k))
      
      const keywordMatch = jobKeywords.length > 0 
        ? Math.round((matched.length / jobKeywords.length) * 100) 
        : 0
      
      // Length score: ideal 400-700 words
      let lengthScore = 100
      if (resumeWords < 300) lengthScore = Math.round((resumeWords / 300) * 70)
      else if (resumeWords > 800) lengthScore = Math.round(100 - ((resumeWords - 800) / 200) * 20)
      
      const overall = Math.round((keywordMatch * 0.4 + lengthScore * 0.4 + 80 * 0.2))
      
      const score: ATSScore = {
        overall,
        keyword_match: keywordMatch,
        missing_keywords: missing.slice(0, 10),
        format_score: 85, // Default
        length_score: lengthScore,
        language_match: true,
        suggestions: [
          missing.length > 0 ? `Add these keywords: ${missing.slice(0, 5).join(', ')}` : null,
          resumeWords < 400 ? 'Expand your experience descriptions' : null,
          resumeWords > 700 ? 'Consider trimming your resume' : null,
        ].filter(Boolean) as string[],
        ats_safe: overall >= 70,
      }

      return NextResponse.json({ ats_score: score })
    }
  } catch (error) {
    console.error('ATS scoring error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate ATS score' },
      { status: 500 }
    )
  }
}