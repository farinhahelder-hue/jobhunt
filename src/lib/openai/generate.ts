import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface Profile {
  personal_info?: {
    full_name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  summary?: string;
  experiences?: Array<{
    company?: string;
    title?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
  }>;
  educations?: Array<{
    institution?: string;
    degree?: string;
    field?: string;
  }>;
  skills?: string[];
  languages?: Array<{
    language?: string;
    level?: string;
  }>;
}

export interface GeneratedApplication {
  coverLetter: string;
  customCV: string;
}

/**
 * Generate a custom cover letter and CV based on the job description and user profile
 */
export async function generateApplication(
  jobDescription: string,
  profile: Profile
): Promise<GeneratedApplication> {
  const profileJson = JSON.stringify(profile, null, 2);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a professional CV and cover letter generator specialized in French job market.
Given a job description and a user profile, generate:
1. A personalized cover letter highlighting relevant experience and skills
2. A customized CV summary tailored to the position

Return ONLY a valid JSON object (no additional text):
{
  "coverLetter": "The full cover letter text in French or English depending on the job",
  "customCV": "The customized CV summary/objective"
}`,
      },
      {
        role: 'user',
        content: `JOB DESCRIPTION:
${jobDescription}

USER PROFILE:
${profileJson}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content || '{}';
  
  try {
    return JSON.parse(content) as GeneratedApplication;
  } catch {
    // If parsing fails, return empty response
    return {
      coverLetter: content,
      customCV: '',
    };
  }
}