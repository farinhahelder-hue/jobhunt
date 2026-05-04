import { NextResponse } from 'next/server'
import { generateNegotiationEmail } from '@/lib/ai/salary-negotiation'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { jobTitle, company, location, offeredSalary, userSalaryExpectation } = body
    
    if (!jobTitle || !company) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const result = await generateNegotiationEmail({
      jobTitle,
      company,
      location: location || 'France',
      offeredSalary,
      userSalaryExpectation
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Salary negotiation API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate negotiation email' },
      { status: 500 }
    )
  }
}