import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

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
  const keywords = [
    'javascript', 'typescript', 'python', 'java', 'react', 'node', 'angular', 'vue',
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'docker', 'kubernetes', 'aws',
    'azure', 'gcp', 'linux', 'git', 'agile', 'scrum', 'rest', 'api', 'graphql',
    'machine learning', 'data science', 'ai', 'deep learning', 'tensorflow', 'pytorch',
    'frontend', 'backend', 'fullstack', 'full-stack', 'devops', 'ci/cd', 'jira',
  ]
  const lowerText = text.toLowerCase()
  return keywords.filter(k => lowerText.includes(k))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { resume_text, cover_letter_text, job_description, job_id, job } = body

    // Get job description - either from param or job object
    const description = job_description || job?.description_text || job?.description || ''

    if (!description && !job_id) {
      return NextResponse.json({ error: 'Job description required' }, { status: 400 })
    }

    // Try AI scoring first
    if (openai && description) {
      try {
        const scoringPrompt = `Analyze these documents against the job description and provide an ATS score.
Return JSON with:
{"overall": number, "keyword_match": number, "missing_keywords": string[], "format_score": number, "length_score": number, "language_match": boolean, "suggestions": string[], "ats_safe": boolean}

Job Description:
${description.substring(0, 2000)}

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
        console.error('AI scoring failed:', aiError)
      }
    }

    // Fallback simple scoring
    const resumeWords = (resume_text || '').split(/\s+/).length
    const jobKeywords = extractKeywords(description)
    const resumeKeywords = extractKeywords(resume_text || '')

    const matched = jobKeywords.filter(k => resumeKeywords.includes(k))
    const missing = jobKeywords.filter(k => !resumeKeywords.includes(k))

    const keywordMatch = jobKeywords.length > 0
      ? Math.round((matched.length / jobKeywords.length) * 100)
      : 0

    let lengthScore = 100
    if (resumeWords < 300) lengthScore = Math.round((resumeWords / 300) * 70)
    else if (resumeWords > 800) lengthScore = Math.round(100 - ((resumeWords - 800) / 200) * 20)

    const overall = Math.round((keywordMatch * 0.4 + lengthScore * 0.4 + 80 * 0.2))

    const score: ATSScore = {
      overall,
      keyword_match: keywordMatch,
      missing_keywords: missing.slice(0, 10),
      format_score: 85,
      length_score: lengthScore,
      language_match: true,
      suggestions: [
        missing.length > 0 ? `Add: ${missing.slice(0, 5).join(', ')}` : '',
        resumeWords < 400 ? 'Expand descriptions' : '',
        resumeWords > 700 ? 'Trim resume' : '',
      ].filter(Boolean),
      ats_safe: overall >= 70,
    }

    return NextResponse.json({ ats_score: score })
  } catch (error) {
    console.error('ATS error:', error)
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 })
  }
}
