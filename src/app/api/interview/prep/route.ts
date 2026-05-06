import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { headers } from 'next/headers'

// Force dynamic
export const dynamic = 'force-dynamic'

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Common interview questions by category
const INTERVIEW_QUESTIONS = {
  // Role-specific questions
  role_specific: [
    "Tell me about your experience with {skill}. How would you rate your proficiency?",
    "Describe a project where you used {skill}. What was the challenge?",
    "How do you stay updated with {skill}?",
    "What's the most complex {skill} project you've worked on?",
  ],
  
  // Behavioral questions
  behavioral: [
    "Tell me about yourself.",
    "Why do you want to work here?",
    "What are your strengths and weaknesses?",
    "Where do you see yourself in 5 years?",
    "Describe a challenging situation and how you handled it.",
    "Tell me about a time you failed and what you learned.",
  ],
  
  // Company-specific questions
  company_research: [
    "What do you know about our company?",
    "Why do you want to join our team?",
    "What challenges do you think we're facing?",
    "How would you contribute to our mission?",
  ],
  
  // Salary & availability
  logistics: [
    "What's your notice period?",
    "What's your salary expectation?",
    "Are you open to remote work?",
    "Are you authorized to work in {location}?",
  ],
  
  // Technical deep-dive
  technical: [
    "Walk me through your technical background.",
    "Explain a technical concept you're passionate about.",
    "What tools and technologies are you most proficient in?",
    "How do you approach debugging a complex issue?",
  ],
}

// Extract skills from job description
function extractSkills(description: string): string[] {
  const skills: string[] = []
  
  // Common tech skills to look for
  const techPatterns = [
    { pattern: /javascript|js/gi, skill: 'JavaScript' },
    { pattern: /typescript|ts/gi, skill: 'TypeScript' },
    { pattern: /react(?:\.js)?/gi, skill: 'React' },
    { pattern: /next\.js|nextjs/gi, skill: 'Next.js' },
    { pattern: /node\.js|nodejs|node/gi, skill: 'Node.js' },
    { pattern: /python/gi, skill: 'Python' },
    { pattern: /java(?!script)/gi, skill: 'Java' },
    { pattern: /golang|go\s+lang/gi, skill: 'Go' },
    { pattern: /rust/gi, skill: 'Rust' },
    { pattern: /sql/gi, skill: 'SQL' },
    { pattern: /postgresql|postgres/gi, skill: 'PostgreSQL' },
    { pattern: /mongodb/gi, skill: 'MongoDB' },
    { pattern: /redis/gi, skill: 'Redis' },
    { pattern: /docker/gi, skill: 'Docker' },
    { pattern: /kubernetes|k8s/gi, skill: 'Kubernetes' },
    { pattern: /aws|amazon\s+web/gi, skill: 'AWS' },
    { pattern: /gcp|google\s+cloud/gi, skill: 'Google Cloud' },
    { pattern: /azure/gi, skill: 'Azure' },
    { pattern: /graphql/gi, skill: 'GraphQL' },
    { pattern: /rest\s*api|rest/gi, skill: 'REST APIs' },
    { pattern: /agile|scrum/gi, skill: 'Agile/Scrum' },
    { pattern: /ci\/cd|jenkins/gi, skill: 'CI/CD' },
    { pattern: /git/gi, skill: 'Git' },
    { pattern: /figma/gi, skill: 'Figma' },
    { pattern: /tailw?ind\s+css/gi, skill: 'Tailwind CSS' },
  ]
  
  techPatterns.forEach(({ pattern, skill }) => {
    if (pattern.test(description)) {
      skills.push(skill)
    }
  })
  
  // Deduplicate
  return [...new Set(skills)]
}

// Generate interview questions based on job
function generateQuestions(job: any): {
  questions: { category: string; question: string; priority: 'high' | 'medium' | 'low' }[]
  skills_identified: string[]
  preparation_tips: string[]
} {
  const description = job.description_text || job.description_html || ''
  const title = job.title || ''
  const company = job.company || ''
  const location = job.location || ''
  
  // Extract skills from description
  const skills = extractSkills(description)
  
  const questions: { category: string; question: string; priority: 'high' | 'medium' | 'low' }[] = []
  const tips = [
    "Research the company culture and recent news",
    "Prepare STAR method answers for behavioral questions",
    "Practice your elevator pitch",
    "Have questions ready for the interviewer",
  ]
  
  // Add role-specific questions based on skills
  skills.slice(0, 3).forEach(skill => {
    const skillQuestions = INTERVIEW_QUESTIONS.role_specific
      .slice(0, 2)
      .map(q => ({
        category: 'Technical',
        question: q.replace('{skill}', skill),
        priority: 'high' as const,
      }))
    questions.push(...skillQuestions)
  })
  
  // Add behavioral questions (always important)
  INTERVIEW_QUESTIONS.behavioral.slice(0, 4).forEach(q => {
    questions.push({
      category: 'Behavioral',
      question: q,
      priority: 'high',
    })
  })
  
  // Add company research questions
  INTERVIEW_QUESTIONS.company_research.forEach(q => {
    questions.push({
      category: 'Company Research',
      question: q,
      priority: 'medium',
    })
  })
  
  // Add logistics if location/salary might be a factor
  if (location && location.toLowerCase() !== 'remote') {
    INTERVIEW_QUESTIONS.logistics.slice(3).forEach(q => {
      questions.push({
        category: 'Logistics',
        question: q.replace('{location}', location),
        priority: 'low',
      })
    })
  }
  
  // Add technical questions
  INTERVIEW_QUESTIONS.technical.slice(0, 2).forEach(q => {
    questions.push({
      category: 'Technical',
      question: q,
      priority: 'medium',
    })
  })
  
  // Add role-specific tips
  if (title.toLowerCase().includes('senior') || title.toLowerCase().includes('lead')) {
    tips.push("Prepare for system design questions")
    tips.push("Think of examples demonstrating leadership")
  }
  
  if (title.toLowerCase().includes('frontend') || title.toLowerCase().includes('front-end')) {
    tips.push("Review CSS, DOM, and state management")
    tips.push("Be ready to code in a live environment")
  }
  
  if (title.toLowerCase().includes('backend') || title.toLowerCase().includes('back-end')) {
    tips.push("Review database design patterns")
    tips.push("Be ready to discuss API design")
  }
  
  if (title.toLowerCase().includes('full stack') || title.toLowerCase().includes('fullstack')) {
    tips.push("Prepare for both frontend and backend questions")
  }
  
  return {
    questions,
    skills_identified: skills,
    preparation_tips: tips,
  }
}

// POST handler - generate interview prep for a job
export async function POST(request: NextRequest) {
  try {
    // Get auth header
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract token and verify
    const token = authHeader.replace('Bearer ', '').trim()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get request body
    const body = await request.json()
    const { job_id } = body

    if (!job_id) {
      return NextResponse.json(
        { error: 'Missing job_id' },
        { status: 400 }
      )
    }

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Generate interview questions
    const prep = generateQuestions(job)

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
      },
      ...prep,
    })

  } catch (error) {
    console.error('Interview prep API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET handler - get interview questions for a specific job_id via query param
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const job_id = searchParams.get('job_id')

    if (!job_id) {
      return NextResponse.json(
        { error: 'Missing job_id query parameter' },
        { status: 400 }
      )
    }

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Generate interview questions
    const prep = generateQuestions(job)

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
      },
      ...prep,
    })

  } catch (error) {
    console.error('Interview prep API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}