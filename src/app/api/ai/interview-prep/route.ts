import { NextResponse } from 'next/server'
import { generateInterviewPrep } from '@/lib/ai/interview-prep'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { jobTitle, company, jobDescription } = body
    
    // Get user's CV content
    const { data: cv } = await supabase
      .from('profiles')
      .select('resume_content')
      .eq('id', user.id)
      .single()
    
    const prep = await generateInterviewPrep({
      userId: user.id,
      jobTitle,
      company,
      jobDescription,
      cvContent: cv?.resume_content || 'No CV on file'
    })
    
    if (!prep) {
      return NextResponse.json(
        { error: 'Failed to generate interview prep' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(prep)
  } catch (error) {
    console.error('Interview prep API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}