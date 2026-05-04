export interface FollowUpCandidate {
  applicationId: string
  title: string
  company: string
  status: string
  lastUpdate: string
  daysSinceUpdate: number
}

const GHOST_THRESHOLD_DAYS = 21

// Check for stale applications
export async function getGhostedCandidates(userId: string): Promise<FollowUpCandidate[]> {
  const { createClient } = await import('@/utils/supabase/server')
  const supabase = await createClient()
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - GHOST_THRESHOLD_DAYS)
  
  const { data: applications } = await supabase
    .from('applications')
    .select('id, title, company, status, updated_at')
    .eq('user_id', userId)
    .in('status', ['applied', 'screening'])
    .lt('updated_at', cutoffDate.toISOString())
  
  if (!applications) return []
  
  return applications.map(app => {
    const lastUpdate = new Date(app.updated_at)
    const now = new Date()
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      applicationId: app.id,
      title: app.title,
      company: app.company,
      status: app.status,
      lastUpdate: app.updated_at,
      daysSinceUpdate
    }
  })
}

// Generate follow-up email
export function generateFollowUpEmail(
  companyName: string,
  jobTitle: string,
  contactName?: string
): string {
  const greeting = contactName ? `Bonjour ${contactName},` : 'Bonjour,'
  
  return `${greeting}

Je me permets de vous relancer concernant ma candidature pour le poste de ${jobTitle} chez ${companyName}.

Cela fait maintenant quelques semaines depuis ma candidature initiale, et je reste très enthousiaste à l'idée de rejoindre votre équipe.

Je serais ravi d'avoir de vos nouvelles concernant l'avancement du processus de recrutement.

Je reste disponible pour tout échange supplémentaire.

Bien cordialement,
[Votre nom]`
}

// Get suggestions for ghosted applications
export async function suggestGhostedApplications(userId: string) {
  const candidates = await getGhostedCandidates(userId)
  
  return candidates.map(c => ({
    ...c,
    suggestedStatus: 'ghosted',
    reason: `Pas de nouvelle depuis ${c.daysSinceUpdate} jours`,
    followUpDraft: generateFollowUpEmail(c.company, c.title)
  }))
}