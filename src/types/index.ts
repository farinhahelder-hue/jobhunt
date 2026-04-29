// User profile types
export interface UserProfile {
  id: string
  user_id: string
  full_name: string | null
  email: string
  phone: string | null
  location: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  available_from: string | null
  salary_expectation: number | null
  work_authorization: string | null
  languages: Record<string, string>
  quick_answers: Record<string, string>
  created_at: string
  updated_at: string
}

// Base resume types
export interface BaseResume {
  id: string
  user_id: string
  filename: string
  content_text: string | null
  content_html: string | null
  storage_path: string | null
  created_at: string
}

// Job types
export interface Job {
  id: string
  title: string
  company: string
  location: string | null
  description_text: string | null
  description_html: string | null
  url: string
  url_hash: string
  source: string
  posted_at: string | null
  detected_language: string
  salary_range: string | null
  skills_required: string[] | null
  remote: boolean | null
  job_type: string | null
  scraped_at: string
}

// Application types
export interface Application {
  id: string
  user_id: string
  job_id: string | null
  status: string
  kanban_column: KanbanColumn
  ats_score: ATSScore | null
  resume_html: string | null
  resume_docx_path: string | null
  cover_letter_html: string | null
  cover_letter_docx_path: string | null
  template_used: string | null
  auto_apply_result: AutoApplyResult | null
  notes: string | null
  applied_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  job?: Job
}

// Application event types
export interface ApplicationEvent {
  id: string
  application_id: string
  event_type: string
  description: string | null
  created_at: string
}

// Kanban column types
export type KanbanColumn = 
  | 'saved'
  | 'applying'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'ghosted'

export interface KanbanColumnConfig {
  id: KanbanColumn
  label: string
  color: string
  bgColor: string
}

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  { id: 'saved', label: 'Saved', color: '#6B6B6B', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  { id: 'applying', label: 'Applying', color: '#2563EB', bgColor: 'bg-blue-100 dark:bg-blue-900' },
  { id: 'applied', label: 'Applied', color: '#4F46E5', bgColor: 'bg-indigo-100 dark:bg-indigo-900' },
  { id: 'interview', label: 'Interview', color: '#F59E0B', bgColor: 'bg-amber-100 dark:bg-amber-900' },
  { id: 'offer', label: 'Offer', color: '#16A34A', bgColor: 'bg-green-100 dark:bg-green-900' },
  { id: 'rejected', label: 'Rejected', color: '#DC2626', bgColor: 'bg-red-100 dark:bg-red-900' },
  { id: 'ghosted', label: 'Ghosted', color: '#475569', bgColor: 'bg-slate-100 dark:bg-slate-800' },
]

// ATS Score types
export interface ATSScore {
  overall: number
  keyword_match: number
  missing_keywords: string[]
  format_score: number
  length_score: number
  language_match: boolean
  suggestions: string[]
  ats_safe: boolean
}

// Auto-apply result types
export interface AutoApplyResult {
  status: 'success' | 'manual_required' | 'failed'
  platform?: string
  error?: string
  timestamp: string
}

// Resume template types
export type ResumeTemplate = 'minimal' | 'compact' | 'modern'

// Job search filter types
export interface JobSearchFilters {
  keywords: string
  location: string
  remote?: boolean
  language?: string
  job_type?: string
  salary_min?: number
}

// Job scraping types  
export interface ScrapeRequest {
  keywords: string
  location: string
  remote?: boolean
  language?: string
  job_type?: string
  salary_min?: number
  sources?: string[]
}

export interface ScrapeResult {
  job: Partial<Job>
  scraped_at: string
}

// AI generation types
export interface GenerateRequest {
  job_id: string
  template?: ResumeTemplate
}

export interface GenerateResponse {
  resume_html: string
  cover_letter_html: string
  ats_score: ATSScore
}

// Document types for export
export interface DocumentExport {
  html: string
  docx_path?: string
}

// API response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

// Dashboard stats types
export interface DashboardStats {
  total_applied: number
  interviews: number
  offers: number
  avg_ats_score: number
  response_rate: number
  recent_activity: ApplicationEvent[]
}