import { NextResponse } from 'next/server'
import { suggestGhostedApplications } from '@/lib/automation/followup'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const suggestions = await suggestGhostedApplications(user.id)
    
    return NextResponse.json({ suggestions })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}