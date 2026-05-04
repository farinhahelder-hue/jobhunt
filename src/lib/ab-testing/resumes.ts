import { createClient } from '@/utils/supabase/server'

export interface ResumeVariant {
  id?: string
  userId: string
  name: string
  content: string
  description?: string
  keywords?: string[]
  isActive: boolean
}

// Create a new resume variant
export async function createResumeVariant(userId: string, data: Omit<ResumeVariant, 'id'>) {
  const supabase = await createClient()
  
  const { data: variant, error } = await supabase
    .from('resume_variants')
    .insert({
      user_id: userId,
      name: data.name,
      content: data.content,
      description: data.description,
      keywords: data.keywords,
      is_active: data.isActive ?? true
    })
    .select()
    .single()
  
  if (error) throw error
  return variant
}

// Get all variants for user
export async function getResumeVariants(userId: string) {
  const supabase = await createClient()
  
  const { data: variants } = await supabase
    .from('resume_variants')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  return variants || []
}

// Track application with specific resume
export async function trackApplicationWithResume(
  applicationId: string,
  resumeVariantId: string
) {
  const supabase = await createClient()
  
  await supabase
    .from('application_resumes')
    .insert({
      application_id: applicationId,
      resume_variant_id: resumeVariantId
    })
}

// Get conversion rates by variant
export async function getVariantConversionRates(userId: string) {
  const supabase = await createClient()
  
  const { data: variants } = await supabase
    .from('resume_variants')
    .select('id, name')
    .eq('user_id', userId)
  
  if (!variants) return []
  
  const { data: applications } = await supabase
    .from('applications')
    .select('id, status, resume_variant_id')
    .eq('user_id', userId)
    .not('resume_variant_id', 'is', null)
  
  return variants.map(v => {
    const variantApps = (applications || []).filter(a => a.resume_variant_id === v.id)
    const total = variantApps.length
    const interview = variantApps.filter(a => ['interview', 'offer'].includes(a.status)).length
    const offer = variantApps.filter(a => a.status === 'offer').length
    
    return {
      variantId: v.id,
      variantName: v.name,
      total,
      interviewRate: total > 0 ? (interview / total * 100).toFixed(1) : '0',
      offerRate: total > 0 ? (offer / total * 100).toFixed(1) : '0'
    }
  })
}