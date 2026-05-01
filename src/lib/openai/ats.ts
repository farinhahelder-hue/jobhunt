import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ATSResult {
  score: number;
  keywords: string[];
  missing: string[];
}

/**
 * Score a CV against a job description based on ATS compatibility
 * Returns a score (0-100), matched keywords, and missing keywords
 */
export async function scoreATS(
  cvText: string,
  jobDescription: string
): Promise<ATSResult> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an ATS (Applicant Tracking System) scoring expert.
Analyze the CV text against the job description and provide:
1. A score from 0-100 based on keyword matching and relevance
2. A list of keywords found in the CV that match the job
3. A list of important keywords from the job that are MISSING from the CV

Return ONLY a valid JSON object (no additional text):
{
  "score": number,
  "keywords": ["matched keyword 1", "matched keyword 2"],
  "missing": ["missing keyword 1", "missing keyword 2"]
}`,
      },
      {
        role: 'user',
        content: `CV TEXT:
${cvText}

JOB DESCRIPTION:
${jobDescription}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || '{}';

  try {
    const result = JSON.parse(content);
    // Ensure score is within bounds
    result.score = Math.min(100, Math.max(0, result.score));
    return result as ATSResult;
  } catch {
    // Return default result if parsing fails
    return {
      score: 0,
      keywords: [],
      missing: [],
    };
  }
}