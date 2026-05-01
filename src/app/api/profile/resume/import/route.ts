import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as mammoth from 'mammoth';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// pdf-parse must be dynamically imported due to ES module issues
let pdfParse: any = null;
async function getPdfParse() {
  if (!pdfParse) {
    const mod: any = await import('pdf-parse');
    pdfParse = mod.default || mod;
  }
  return pdfParse;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ResumeData {
  personal_info?: {
    full_name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin_url?: string;
    portfolio_url?: string;
  };
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
    graduation_date?: string;
  }>;
  skills?: string[];
  languages?: Array<{
    language?: string;
    level?: string;
  }>;
  summary?: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF and DOCX are supported.' },
        { status: 400 }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    // Extract user ID from JWT (simplified - in production use proper JWT verification)
    const token = authHeader.replace('Bearer ', '');
    
    // Save file temporarily
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `resume_${Date.now()}_${file.name}`);
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(tempFilePath, Buffer.from(buffer));

    let extractedText = '';

    try {
      if (file.type === 'application/pdf') {
        // Parse PDF
        const pdfData = fs.readFileSync(tempFilePath);
        const pdfParser = await getPdfParse();
        const pdfResult = await pdfParser(pdfData);
        extractedText = pdfResult.text;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Parse DOCX
        const docxData = fs.readFileSync(tempFilePath);
        const docxResult = await mammoth.extractRawText({ buffer: docxData });
        extractedText = docxResult.value;
      }
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'Could not extract text from file' },
        { status: 400 }
      );
    }

    // Use OpenAI to structure the resume
    const structuredResume = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a resume parsing assistant. Parse the following resume text and extract structured information. 
Return ONLY a valid JSON object with this exact structure (no additional text):
{
  "personal_info": {
    "full_name": "string",
    "email": "string", 
    "phone": "string",
    "location": "string",
    "linkedin_url": "string",
    "portfolio_url": "string"
  },
  "experiences": [
    {
      "company": "string",
      "title": "string", 
      "start_date": "string (YYYY-MM or YYYY)",
      "end_date": "string (YYYY-MM or YYYY) or 'present'",
      "description": "string"
    }
  ],
  "educations": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string", 
      "graduation_date": "string (YYYY-MM or YYYY)"
    }
  ],
  "skills": ["string"],
  "languages": [{"language": "string", "level": "string"}],
  "summary": "string"
}`,
        },
        {
          role: 'user',
          content: extractedText,
        },
      ],
      temperature: 0.1,
      max_tokens: 8000,
    });

    const structuredData = JSON.parse(
      structuredResume.choices[0]?.message?.content || '{}'
    ) as ResumeData;

    // Get user_id from token (in production, verify JWT properly)
    // For now, we'll insert and let RLS handle the user_id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, user_id')
      .limit(1)
      .single();

    if (profileError && profileError.code !== 'PGRD116') {
      console.error('Profile fetch error:', profileError);
    }

    // Upsert the resume data into profiles table
    const { data: upsertedProfile, error: upsertError } = await supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: profile?.user_id || '00000000-0000-0000-0000-000000000000',
          full_name: structuredData.personal_info?.full_name,
          email: structuredData.personal_info?.email,
          phone: structuredData.personal_info?.phone,
          location: structuredData.personal_info?.location,
          linkedin_url: structuredData.personal_info?.linkedin_url,
          portfolio_url: structuredData.personal_info?.portfolio_url,
          resume_json: {
            summary: structuredData.summary,
            experiences: structuredData.experiences,
            educations: structuredData.educations,
            skills: structuredData.skills,
            languages: structuredData.languages,
          },
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save resume', details: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...upsertedProfile,
        extracted_text: extractedText.substring(0, 500) + '...',
      },
    });
  } catch (error) {
    console.error('Resume import error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}