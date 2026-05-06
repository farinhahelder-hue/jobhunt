import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface Job {
  id: number
  title: string
  company: string
  description?: string
  salary_range?: string
  score: number
}

interface ScoringPreferences {
  target_titles: string[]
  target_keywords: string[]
  excluded_keywords: string[]
  min_salary?: number
  preferred_company_size?: string
  preferred_timezones?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { jobs, userId } = await request.json()

    if (!jobs || !Array.isArray(jobs) || !userId) {
      return NextResponse.json({ error: 'Missing jobs or userId' }, { status: 400 })
    }

    // Get user scoring preferences
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('scoring_preferences')
      .eq('id', userId)
      .single()

    const prefs: ScoringPreferences = profile?.scoring_preferences || {}

    // If no preferences, return original scores
    if (!prefs.target_titles?.length && !prefs.target_keywords?.length && !prefs.excluded_keywords?.length) {
      return NextResponse.json({ jobs: jobs.map((j: Job) => ({ ...j, personalScore: null })) })
    }

    // Apply custom scoring
    const scoredJobs = jobs.map((job: Job) => {
      let bonus = 0
      let malus = 0

      const titleLower = (job.title || '').toLowerCase()
      const descLower = (job.description || '').toLowerCase()

      // +2 pts if title matches target_titles (fuzzy)
      if (prefs.target_titles?.length) {
        for (const targetTitle of prefs.target_titles) {
          if (titleLower.includes(targetTitle.toLowerCase())) {
            bonus += 2
            break
          }
        }
      }

      // +1 pt per target_keyword (max +2)
      if (prefs.target_keywords?.length) {
        let keywordMatches = 0
        for (const kw of prefs.target_keywords) {
          if (descLower.includes(kw.toLowerCase()) || titleLower.includes(kw.toLowerCase())) {
            keywordMatches++
          }
        }
        bonus += Math.min(keywordMatches, 2)
      }

      // -3 pts if excluded_keyword found
      if (prefs.excluded_keywords?.length) {
        for (const exclude of prefs.excluded_keywords) {
          if (descLower.includes(exclude.toLowerCase()) || titleLower.includes(exclude.toLowerCase())) {
            malus += 3
            break
          }
        }
      }

      // +1 pt if salary meets minimum
      if (prefs.min_salary && job.salary_range) {
        const salaryMatch = job.salary_range.replace(/[^0-9]/g, '')
        if (salaryMatch && parseInt(salaryMatch) >= prefs.min_salary) {
          bonus += 1
        }
      }

      // Calculate final score
      let personalScore = Math.min(10, Math.max(0, (job.score || 5) + bonus - malus))

      return { ...job, personalScore }
    })

    return NextResponse.json({ jobs: scoredJobs })
  } catch (error) {
    console.error('Scoring error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}