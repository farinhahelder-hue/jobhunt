import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import pdf from 'pdf-parse'
import mammoth from 'mammoth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const serverSupabase = createSupabaseClient(supabaseUrl, serviceKey)

// POST /api/resume/parse
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string
    const userId = formData.get('userId') as string
    const fileUrl = formData.get('fileUrl') as string

    if (!file || !fileName || !userId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' })
    }

    // Get file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse based on file type
    let content = ''
    const ext = fileName.split('.').pop()?.toLowerCase()

    if (ext === 'pdf') {
      const result = await pdf(buffer)
      content = result.text
    } else if (ext === 'docx') {
      const result = await mammoth.extractRawText({ arrayBuffer: buffer })
      content = result.value
    } else {
      return NextResponse.json({ success: false, error: 'Unsupported file type' })
    }

    // Clean up content
    content = content.trim().replace(/\s+/g, ' ')

    const wordCount = content.split(/\s+/).filter(Boolean).length

    // Save to base_resumes
    const { data: resume, error } = await serverSupabase
      .from('base_resumes')
      .insert({
        user_id: userId,
        file_name: fileName,
        file_url: fileUrl,
        content: content.substring(0, 50000), // Limit to 50k chars
        word_count: wordCount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('DB error:', error)
      return NextResponse.json({ success: false, error: error.message })
    }

    return NextResponse.json({
      success: true,
      resume: {
        id: resume.id,
        file_name: fileName,
        file_url: fileUrl,
        content: content.substring(0, 50000),
        word_count: wordCount,
        created_at: resume.created_at,
      },
    })
  } catch (error) {
    console.error('Parse error:', error)
    return NextResponse.json({ success: false, error: 'Failed to parse resume' })
  }
}