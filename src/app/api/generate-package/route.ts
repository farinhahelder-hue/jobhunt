import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const openaiKey = process.env.OPENAI_API_KEY || ''
const serverSupabase = createSupabaseClient(supabaseUrl, serviceKey)

// System prompt for application package generation
const SYSTEM_PROMPT = `Tu es un expert en recrutement et coaching de carrière. Génère un package de candidature complet pour aider l'utilisateur à postuler à un poste.

Génère un JSON avec cette structure exacte (sans autre texte):
{
  "cover_letter": "Lettre de motivation personalized de 250-400 mots, professionnelle et engageante",
  "elevator_pitch": "Pitch de 30 secondes pour présenter sa candidature (2-3 phrases clés)",
  "answers": {
    "why_company": "Pourquoi cette entreprise? (1-2 phrases)",
    "why_role": "Pourquoi ce rôle? (1-2 phrases)", 
    "experience_years": "Années d'expérience pertinentes",
    "availability": "Disponibilité",
    "salary_expectation": "Attente salariale",
    "remote_preference": "Préférence remote/bureau"
  },
  "keywords_to_mention": ["keyword1", "keyword2"],
  "red_flags": ["attention: ce qui pose problème dans le profil"],
  "application_tips": ["conseil1", "conseil2"]
}

Règles:
- cover_letter en français ou anglais selon l'offre, toujours professionnelle
- Relever les mots-clés techniques du poste à mentionner
- Identifier les éventuelles中美 red_flags (gap, skills manquantes, etc.)
- Proposer des tips concrets pour maximiser les chances

JSON ONLY - pas de texte avant ou après.`

// POST /api/apply/prepare
export async function POST(request: Request) {
  try {
    const { job_id, user_id } = await request.json()

    if (!job_id || !user_id) {
      return NextResponse.json({ success: false, error: 'Missing job_id or user_id' })
    }

    if (!openaiKey) {
      return NextResponse.json({ success: false, error: 'OpenAI API key not configured' })
    }

    // Get job details
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, title, company, description, url, requirements, nice_to_have, salary_range, location')
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ success: false, error: 'Job not found' })
    }

    // Get user's resume
    const { data: resume, error: resumeError } = await serverSupabase
      .from('base_resumes')
      .select('content, word_count')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (resumeError || !resume) {
      return NextResponse.json({ success: false, error: 'No resume found. Please upload your CV first.' })
    }

    // Get user's scoring preferences for targeting
    const { data: profile } = await serverSupabase
      .from('user_profiles')
      .select('scoring_preferences, full_name')
      .eq('user_id', user_id)
      .single()

    const scoringPrefs = profile?.scoring_preferences || {}
    const targetKeywords = scoringPrefs.target_keywords || []

    // Build user prompt with job and resume
    const userPrompt = `
Poste: ${job.title}
Entreprise: ${job.company}
Description: ${job.description || 'N/A'}
 Requirements: ${job.requirements || 'N/A'}
Nice to have: ${job.nice_to_have || 'N/A'}
Salaire: ${job.salary_range || 'N/A'}
Lieu: ${job.location || 'N/A'}

CV (extrait): ${resume.content.substring(0, 3000)}

${targetKeywords.length > 0 ? `Keywords cibles de l'utilisateur: ${targetKeywords.join(', ')}` : ''}

Génère le package de candidature JSON.`

    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('OpenAI API error:', errorText)
      return NextResponse.json({ success: false, error: 'AI generation failed' })
    }

    const aiData = await openaiResponse.json()
    const aiContent = aiData.choices?.[0]?.message?.content

    if (!aiContent) {
      return NextResponse.json({ success: false, error: 'Empty AI response' })
    }

    let applicationPackage
    try {
      applicationPackage = JSON.parse(aiContent)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json({ success: false, error: 'Invalid AI response format' })
    }

    // Save to applications table
    const { error: updateError } = await serverSupabase
      .from('applications')
      .update({
        application_package: applicationPackage,
        package_generated_at: new Date().toISOString(),
      })
      .eq('job_id', job_id)
      .eq('user_id', user_id)

    if (updateError) {
      console.error('Update error:', updateError)
      // Continue even if update fails - return the package
    }

    return NextResponse.json({
      success: true,
      application_package: applicationPackage,
    })
  } catch (error) {
    console.error('Prepare error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}