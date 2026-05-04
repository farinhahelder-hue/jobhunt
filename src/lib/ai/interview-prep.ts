import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface InterviewPrep {
  jobTitle: string
  company: string
  jobDescription: string
  cvContent: string
  userId: string
}

// Generate interview preparation questions
export async function generateInterviewPrep(prep: InterviewPrep) {
  const systemPrompt = `You are an expert career coach specializing in neurodiversity and interview preparation. 
Generate a custom interview preparation sheet for the user based on their CV and the job description.

Focus on:
1. Behavioral questions (STAR method) matched to their experience
2. Technical questions related to the job
3. Questions about their strengths and accommodations needed
4. Red flags to avoid
5. Questions they SHOULD ask the employer

Be empathetic, clear, and direct.`

  const userPrompt = `
Job Title: ${prep.jobTitle}
Company: ${prep.company}

Job Description:
${prep.jobDescription}

My CV:
${prep.cvContent}

Generate a personalized interview preparation sheet with:
1. "Tell me about yourself" - tailored to this role
2. 5 behavioral questions I'll likely face (with suggested STAR answers)
3. 3 technical questions to expect
4. 3 questions to ask the employer about neurodiversity support
5. Red flags in job postings to identify
6. My key strengths to highlight

Format in clear markdown with emojis for sections.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 3000
  })
  
  return {
    content: completion.choices[0].message.content,
    createdAt: new Date().toISOString()
  }
}