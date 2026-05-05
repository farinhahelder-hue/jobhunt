'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Briefcase, RefreshCw, ExternalLink, Globe, Plus, Bookmark, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Job {
  id?: number
  title: string
  company: string
  location: string
  remote_type: string
  published_at: string
  url: string
  summary: string
  score: number
  source: string
}

// Simple Modal component
function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-muted rounded">
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  )
}

function getFreshnessBadge(publishedAt: string) {
  const hoursAgo = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60)
  if (hoursAgo < 24) return <span className="text-green-500">🟢 Fresh</span>
  if (hoursAgo < 72) return <span className="text-yellow-500">🟡 2-3d</span>
  return <span className="text-red-500">🔴 Old</span>
}

function getScoreColor(score: number) {
  if (score >= 7) return 'text-green-500 font-bold'
  if (score >= 5) return 'text-yellow-500'
  return 'text-muted-foreground'
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastScrape, setLastScrape] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [atsScore, setAtsScore] = useState<number | null>(null)
  const [atsLoading, setAtsLoading] = useState(false)
  const [jobApplications, setJobApplications] = useState<any[]>([])
  const supabase = createClient()

  // Fetch jobs from Supabase
  const fetchJobs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/jobs/list')
      const data = await res.json()
      if (data.success) {
        setJobs(data.jobs)
        setLastScrape(data.fetched_at)
      } else {
        setError(data.error || 'Failed to fetch jobs')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  // Refresh: trigger scrape then reload
  const handleRefresh = async () => {
    setLoading(true)
    try {
      await fetch('/api/scrape/direct', { method: 'POST' })
      await fetchJobs()
    } catch (err) {
      setError('Refresh failed')
    } finally {
      setLoading(false)
    }
  }

  // Save job to applications
  const handleSave = async (job: Job) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Not logged in - redirect to login
        window.location.href = '/login'
        return
      }
      
      const { error } = await supabase.from('applications').upsert({
        user_id: user.id,
        job_id: job.id,
        status: 'saved',
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id,job_id' })
      
      if (error) {
        console.error('Save error:', error)
      } else {
        alert('Saved! Go to /applications to track this job.')
      }
    } catch (err) {
      console.error('Save error:', err)
    }
  }

  // Calculate ATS score for selected job
  const handleAtsScore = async () => {
    if (!selectedJob?.id) return
    setAtsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const res = await fetch('/api/ats/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: selectedJob.id, user_id: user.id }),
      })
      const data = await res.json()
      if (data.success) setAtsScore(data.ats_score)
      else alert(data.error || 'Failed to get ATS score')
    } catch (err) { console.error('ATS error:', err) }
    finally { setAtsLoading(false) }
  }

  const handleCloseModal = () => { setSelectedJob(null); setAtsScore(null) }

  useEffect(() => {
    fetchJobs()
  }, [])

  const topJobs = jobs.filter((j) => j.score >= 7).slice(0, 3)
  const watchJobs = jobs.filter((j) => j.score >= 5 && j.score < 7).slice(0, 5)
  const otherJobs = jobs.filter((j) => j.score < 5)

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blarg z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">JobPilot</span>
          </div>
          <Button onClick={fetchJobs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 space-y-8">
        {error && (
          <Card className="border-red-500">
            <CardContent className="p-4 text-red-500">{error}</CardContent>
          </Card>
        )}

        {/* Priority Section - Score >= 7 */}
        {topJobs.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-green-500">🎯</span> Apply Now (score ≥ 7)
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {topJobs.map((job, i) => (
                <Card key={i} className="border-green-500/50 cursor-pointer hover:border-green-500 transition-colors" onClick={() => setSelectedJob(job)}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      <span className={`text-2xl ${getScoreColor(job.score)}`}>
                        {job.score}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-medium text-primary">{job.company}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      {job.location} · {job.remote_type}
                    </div>
                    <p className="text-sm line-clamp-2">{job.summary}</p>
                    <div className="flex justify-between items-center pt-2">
                      {getFreshnessBadge(job.published_at)}
                      <div className="flex gap-2">
                        {job.id && (
                          <Button size="sm" variant="outline" onClick={() => handleSave(job)}>
                            <Bookmark className="h-3 w-3 mr-1" /> Save
                          </Button>
                        )}
                        <a href={job.url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm">
                            Apply <ExternalLink className="h-3 w-3 ml-2" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Watch Section - Score 5-6 */}
        {watchJobs.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-yellow-500">👀</span> Watch (score 5-6)
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {watchJobs.map((job, i) => (
                <Card key={i} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedJob(job)}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      <span className={`text-2xl ${getScoreColor(job.score)}`}>
                        {job.score}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-medium text-primary">{job.company}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      {job.location} · {job.remote_type}
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      {getFreshnessBadge(job.published_at)}
                      <a href={job.url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-3 w-3 ml-2" />
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* All Jobs Table */}
        <section>
          <h2 className="text-xl font-bold mb-4">All Jobs ({jobs.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Score</th>
                  <th className="p-2">Title</th>
                  <th className="p-2">Company</th>
                  <th className="p-2">Location</th>
                  <th className="p-2">Remote</th>
                  <th className="p-2">Age</th>
                  <th className="p-2">Link</th>
                </tr>
              </thead>
              <tbody>
                {otherJobs.map((job, i) => (
                  <tr key={i} className="border-b">
                    <td className={`p-2 ${getScoreColor(job.score)}`}>{job.score}</td>
                    <td className="p-2 font-medium">{job.title}</td>
                    <td className="p-2">{job.company}</td>
                    <td className="p-2">{job.location}</td>
                    <td className="p-2">{job.remote_type}</td>
                    <td className="p-2">{getFreshnessBadge(job.published_at)}</td>
                    <td className="p-2">
                      <a href={job.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        {lastScrape && (
          <footer className="text-center text-sm text-muted-foreground py-4">
            Last scraped: {new Date(lastScrape).toLocaleString()}
          </footer>
        )}

        {/* Job Details Modal */}
        <Modal open={!!selectedJob} onClose={handleCloseModal}>
          {selectedJob && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">{selectedJob.title}</h2>
              <p className="font-medium text-primary">{selectedJob.company}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                {selectedJob.location} · {selectedJob.remote_type}
              </div>
              <p className="text-sm">{selectedJob.summary}</p>
              <div className="flex justify-between items-center">
                <span className={`text-2xl ${getScoreColor(selectedJob.score)}`}>
                  Score: {selectedJob.score}
                </span>
                {atsScore !== null && (
                  <span className={`text-lg font-bold ${atsScore >= 70 ? 'text-green-500' : atsScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                    ATS: {atsScore}/100
                  </span>
                )}
              </div>

              {/* ATS Score Button */}
              {selectedJob.id && (
                <Button 
                  variant="outline" 
                  onClick={handleAtsScore} 
                  disabled={atsLoading}
                  className="w-full"
                >
                  {atsLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {atsLoading ? 'Calculating...' : atsScore !== null ? 'Recalculate ATS Score' : 'Get ATS Score vs My Resume'}
                </Button>
              )}

              <div className="flex gap-2 pt-4">
                {selectedJob.id && (
                  <Button onClick={() => handleSave(selectedJob)} className="flex-1">
                    <Bookmark className="h-4 w-4 mr-2" /> Save to Applications
                  </Button>
                )}
                <a
                  href={selectedJob.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full">
                    Apply <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
          )}
        </Modal>
      </main>
    </div>
  )
}