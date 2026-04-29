'use client'

import { useState, useEffect, useCallback } from 'react'
import { notFound, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DocumentPreview } from '@/components/editor/DocumentPreview'
import { ATSScoreGauge } from '@/components/editor/ATSScoreGauge'
import { KeywordChips } from '@/components/editor/KeywordChips'
import type { Application, ATSScore } from '@/types'
import { 
  Briefcase, 
  Save, 
  Download, 
  Loader2, 
  FileText, 
  Sparkles,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react'

export default function ApplyPage({ params }: { params: { id: string } }) {
  const [application, setApplication] = useState<Application | null>(null)
  const [resumeHtml, setResumeHtml] = useState('')
  const [coverLetterHtml, setCoverLetterHtml] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [atsScore, setAtsScore] = useState<ATSScore | null>(null)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Load application
  useEffect(() => {
    const loadApplication = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          job:jobs(*)
        `)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (!data || error) {
        notFound()
      }

      setApplication(data)
      setResumeHtml(data.resume_html || '')
      setCoverLetterHtml(data.cover_letter_html || '')
      setNotes(data.notes || '')
      setAtsScore(data.ats_score)
      setLoading(false)
    }

    loadApplication()
  }, [params.id, supabase, router])

  // Generate documents
  const handleGenerate = async () => {
    if (!application?.job_id) return

    setGenerating(true)
    try {
      const response = await fetch('/api/applications/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: application.job_id,
        }),
      })

      const data = await response.json()
      
      if (data.resume_html) {
        setResumeHtml(data.resume_html)
      }
      if (data.cover_letter_html) {
        setCoverLetterHtml(data.cover_letter_html)
      }
    } catch (err) {
      console.error('Error generating:', err)
    } finally {
      setGenerating(false)
    }
  }

  // Calculate ATS score
  const handleScore = async () => {
    if (!application?.job_id || !resumeHtml) return

    try {
      const response = await fetch('/api/applications/ats-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: application.job_id,
          resume_text: resumeHtml.replace(/<[^>]*>/g, ''),
          cover_letter_text: coverLetterHtml.replace(/<[^>]*>/g, ''),
        }),
      })

      const data = await response.json()
      if (data.ats_score) {
        setAtsScore(data.ats_score)
      }
    } catch (err) {
      console.error('Error scoring:', err)
    }
  }

  // Save application
  const handleSave = async () => {
    if (!application) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          resume_html: resumeHtml,
          cover_letter_html: coverLetterHtml,
          notes,
          ats_score: atsScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', application.id)

      if (!error) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (err) {
      console.error('Error saving:', err)
    } finally {
      setSaving(false)
    }
  }

  // Update kanban status
  const handleMoveToApplied = async () => {
    if (!application) return

    await supabase
      .from('applications')
      .update({
        kanban_column: 'applied',
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', application.id)

    router.push('/board')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const job = application?.job

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/board" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link href="/dashboard" className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">JobPilot</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : saved ? (
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
            <Button onClick={handleMoveToApplied}>
              Submit Application
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6">
        {/* Job Info */}
        {job && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center text-xl font-bold text-primary">
                  {job.company?.charAt(0)}
                </div>
                <div>
                  <h2 className="font-semibold">{job.title}</h2>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Documents Preview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Resume */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Resume</CardTitle>
                  <CardDescription>AI-optimized for this position</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
                    {generating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DocumentPreview html={resumeHtml} />
              </CardContent>
            </Card>

            {/* Cover Letter */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Cover Letter</CardTitle>
                  <CardDescription>Tailored to the job</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <DocumentPreview html={coverLetterHtml} />
              </CardContent>
            </Card>
          </div>

          {/* Editor Sidebar */}
          <div className="space-y-6">
            {/* ATS Score */}
            {atsScore && (
              <Card>
                <CardContent className="p-6">
                  <ATSScoreGauge score={atsScore} />
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <Button 
                  className="w-full" 
                  onClick={handleScore}
                  disabled={!resumeHtml}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Check ATS Score
                </Button>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add notes about this application..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}