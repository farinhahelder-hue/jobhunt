'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Modal, ModalHeader, ModalTitle, ModalClose, ModalContent, ModalFooter } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Copy, 
  Check, 
  MessageSquare,
  Lightbulb,
  Target,
  TrendingUp,
  BookOpen
} from 'lucide-react'

interface InterviewQuestion {
  category: string
  question: string
  priority: 'high' | 'medium' | 'low'
}

interface InterviewPrepModalProps {
  jobId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InterviewPrepModal({ jobId, open, onOpenChange }: InterviewPrepModalProps) {
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [tips, setTips] = useState<string[]>([])
  const [jobTitle, setJobTitle] = useState('')
  const [jobCompany, setJobCompany] = useState('')
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (open && jobId) {
      fetchInterviewPrep()
    }
  }, [open, jobId])

  const fetchInterviewPrep = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`/api/interview/prep?job_id=${jobId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setQuestions(data.questions || [])
        setSkills(data.skills_identified || [])
        setTips(data.preparation_tips || [])
        setJobTitle(data.job?.title || '')
        setJobCompany(data.job?.company || '')
      }
    } catch (e) {
      console.error('Failed to fetch interview prep:', e)
    } finally {
      setLoading(false)
    }
  }

  const copyQuestions = async () => {
    const text = `${jobTitle} at ${jobCompany}\n\n` +
      questions.map(q => `• ${q.question}`).join('\n\n') +
      '\n\nTips:\n' + tips.map(t => `• ${t}`).join('\n')
    
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  }

  const categoryIcons: Record<string, any> = {
    Technical: MessageSquare,
    Behavioral: TrendingUp,
    'Company Research': BookOpen,
    Logistics: Target,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Interview Prep — {jobTitle}
          </DialogTitle>
          <DialogDescription>
            {jobCompany} • AI-generated interview questions
          </DialogDescription>
        </DialogHeader>

        {/* Skills identified */}
        {skills.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Skills identified:</h4>
            <div className="flex flex-wrap gap-2">
              {skills.map(skill => (
                <Badge key={skill} variant="secondary">{skill}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Questions by category */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {questions.length > 0 ? (
              <div className="space-y-4">
                {Object.entries(
                  questions.reduce((acc, q) => {
                    if (!acc[q.category]) acc[q.category] = []
                    acc[q.category].push(q)
                    return acc
                  }, {} as Record<string, InterviewQuestion[]>)
                ).map(([category, catQuestions]) => {
                  const Icon = categoryIcons[category] || MessageSquare
                  return (
                    <div key={category}>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4" />
                        {category}
                      </h4>
                      <div className="space-y-2">
                        {catQuestions.map((q, i) => (
                          <div 
                            key={i} 
                            className="p-3 rounded-lg bg-muted/50 text-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span>{q.question}</span>
                              <Badge 
                                className={`text-xs ${priorityColors[q.priority]}`}
                              >
                                {q.priority}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No questions generated yet
              </p>
            )}
          </>
        )}

        {/* Preparation tips */}
        {tips.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Preparation Tips
            </h4>
            <ul className="space-y-1">
              {tips.map((tip, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-500" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={copyQuestions}>
            {copied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? 'Copied!' : 'Copy All'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}