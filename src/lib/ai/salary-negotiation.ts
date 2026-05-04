import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface SalaryNegotiationInput {
  jobTitle: string
  company: string
  location: string
  offeredSalary?: number
  marketData?: {
    min: number
    max: number
    median: number
  }
  userSalaryExpectation?: number
}

// Salary data by role and location (French market estimates)
const SALARY_DATA: Record<string, Record<string, { min: number; max: number; median: number }>> = {
  'développeur': {
    'paris': { min: 45000, max: 85000, median: 60000 },
    'lyon': { min: 40000, max: 70000, median: 50000 },
    'remote': { min: 45000, max: 80000, median: 55000 },
    'france': { min: 40000, max: 75000, median: 52000 }
  },
  'data scientist': {
    'paris': { min: 50000, max: 95000, median: 70000 },
    'france': { min: 45000, max: 80000, median: 60000 }
  },
  'product manager': {
    'paris': { min: 55000, max: 100000, median: 75000 },
    'france': { min: 50000, max: 85000, median: 65000 }
  }
}

// Get market salary data
export function getMarketSalaryData(title: string, location: string): { min: number; max: number; median: number } | null {
  const normalizedTitle = title.toLowerCase()
  const normalizedLocation = location.toLowerCase().replace(/\s/g, '')
  
  for (const [key, data] of Object.entries(SALARY_DATA)) {
    if (normalizedTitle.includes(key)) {
      if (data[normalizedLocation]) {
        return data[normalizedLocation]
      }
      return data['france']
    }
  }
  return null
}

// Generate negotiation email
export async function generateNegotiationEmail(input: SalaryNegotiationInput) {
  const marketData = input.marketData || getMarketSalaryData(input.jobTitle, input.location) || { min: 50000, max: 70000, median: 60000 }
  
  const systemPrompt = `You are an expert salary negotiation coach. Generate a professional, polite negotiation email in French.
Focus on:
- Gratitude for the offer
- Clear rationale based on market data and experience
- Specific counter-proposal with numbers
- Open to discussion
- Professional and friendly tone`

  const userPrompt = `
Poste: ${input.jobTitle}
Entreprise: ${input.company}
Lieu: ${input.location}
Salaire proposé: ${input.offeredSalary || 'Non spécifié'}€
Attente: ${input.userSalaryExpectation || 'À discuter'}€

Données du marché:
- Minimum: ${marketData.min}€
- Médianne: ${marketData.median}€
- Maximum: ${marketData.max}€

Génère un email de négociation professionnelle en français.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 1500
  })
  
  return {
    email: completion.choices[0].message.content,
    marketData,
    recommendation: {
      minAcceptable: marketData.min,
      target: marketData.median,
      stretch: marketData.max
    }
  }
}