'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Briefcase, Moon, Sun, Monitor, Download, Save, Loader2, Mail, Bell, FileText, Upload, Trash2, Check, Star } from 'lucide-react'
import { useTheme } from 'next-themes'

interface UserPreferences {
  email_notifications: boolean
  notify_score_threshold: number
  notify_frequency: 'daily' | 'weekly'
}

interface ScoringPreferences {
  target_titles?: string[]
  target_keywords?: string[]
  excluded_keywords?: string[]
  min_salary?: number
  preferred_company_size?: string
  preferred_timezones?: string[]
}

interface BaseResume {
  id: number
  file_name: string
  file_url: string
  content: string
  word_count: number
  created_at: string
}

export default function SettingsPage() {
  const [saving, setSaving] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [uploadingResume, setUploadingResume] = useState(false)
  const [resume, setResume] = useState<BaseResume | null>(null)
  const [preferences, setPreferences] = useState<UserPreferences>({
    email_notifications: true,
    notify_score_threshold: 7,
    notify_frequency: 'daily',
  })
  const [scoringPreferences, setScoringPreferences] = useState<ScoringPreferences>({
    target_titles: [],
    target_keywords: [],
    excluded_keywords: [],
    min_salary: undefined,
    preferred_company_size: 'any',
    preferred_timezones: [],
  })
  const [savingScoring, setSavingScoring] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        // Load preferences
        const { data } = await supabase
          .from('user_profiles')
          .select('notification_preferences, scoring_preferences')
          .eq('user_id', user.id)
          .single()
        if (data?.notification_preferences) {
          setPreferences({ ...preferences, ...data.notification_preferences })
        }
        if (data?.scoring_preferences) {
          setScoringPreferences(data.scoring_preferences)
        }
        
        // Load user's resume
        const { data: resumeData } = await supabase
          .from('base_resumes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        if (resumeData) {
          setResume(resumeData)
        }
      }
    }
    getUser()
  }, [])

  const handleSavePreferences = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ notification_preferences: preferences })
        .eq('user_id', user.id)
      if (error) throw error
      alert('Preferences saved!')
    } catch (err) {
      console.error(err)
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Save scoring preferences
  const handleSaveScoringPreferences = async () => {
    if (!user) return
    setSavingScoring(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ scoring_preferences: scoringPreferences })
        .eq('user_id', user.id)
      if (error) throw error
      alert('Scoring preferences saved!')
    } catch (err) {
      console.error(err)
      alert('Failed to save scoring preferences')
    } finally {
      setSavingScoring(false)
    }
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF or DOCX file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be less than 5MB')
      return
    }

    setUploadingResume(true)
    try {
      const ext = file.name.split('.').pop()
      const filePath = `${user.id}/base_resume.${ext}`
      
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileName', file.name)
      formData.append('userId', user.id)
      formData.append('fileUrl', publicUrl)

      const parseRes = await fetch('/api/resume/parse', {
        method: 'POST',
        body: formData,
      })

      const parseData = await parseRes.json()
      
      if (parseData.success) {
        setResume(parseData.resume)
        alert('Resume uploaded and parsed!')
      } else {
        alert('Upload succeeded but parsing failed: ' + parseData.error)
      }
    } catch (err) {
      console.error(err)
      alert('Failed to upload resume')
    } finally {
      setUploadingResume(false)
    }
  }

  const handleDeleteResume = async () => {
    if (!resume || !user) return
    if (!confirm('Delete your resume?')) return

    try {
      await supabase.storage
        .from('resumes')
        .remove([`${user.id}/base_resume.${resume.file_name.split('.').pop()}`])

      await supabase
        .from('base_resumes')
        .delete()
        .eq('id', resume.id)

      setResume(null)
    } catch (err) {
      console.error(err)
      alert('Failed to delete')
    }
  }

  const handleSaveApiKey = async () => {
    setSaving(true)
    // In a real app, this would save to a secure storage
    setTimeout(() => {
      setSaving(false)
    }, 1000)
  }

  const handleExportData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Export all user data
    const applications = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)

    const profile = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)

    const data = {
      profile: profile.data,
      applications: applications.data,
      exportDate: new Date().toISOString(),
    }

    // Download as JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'jobpilot-export.json'
    a.click()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">JobPilot</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm hover:text-primary">
              Dashboard
            </Link>
            <Link href="/search" className="text-sm hover:text-primary">
              Search
            </Link>
            <Link href="/profile" className="text-sm hover:text-primary">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Theme */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how JobPilot looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm font-medium">Theme</p>
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    onClick={() => setTheme('light')}
                    className="flex-1"
                  >
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    onClick={() => setTheme('dark')}
                    className="flex-1"
                  >
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    onClick={() => setTheme('system')}
                    className="flex-1"
                  >
                    <Monitor className="mr-2 h-4 w-4" />
                    System
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resume Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> My Resume
              </CardTitle>
              <CardDescription>Upload your CV for ATS scoring</CardDescription>
            </CardHeader>
            <CardContent>
              {resume ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{resume.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {resume.word_count} words · Uploaded {new Date(resume.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Check className="h-5 w-5 text-green-500" />
                      <Button variant="outline" size="sm" onClick={handleDeleteResume}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your resume is ready for ATS scoring on job applications.
                  </p>
                  <label className="block" htmlFor="resume-input">
                    <div className="cursor-pointer flex items-center justify-center w-full p-2 border border-dashed rounded hover:bg-muted transition-colors">
                      <Upload className="h-4 w-4 mr-2" /> Replace Resume
                    </div>
                    <input
                      id="resume-input"
                      type="file"
                      accept=".pdf,.docx"
                      className="hidden"
                      onChange={handleResumeUpload}
                      disabled={uploadingResume}
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                      {uploadingResume ? (
                        <>
                          <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                          <p>Uploading and parsing...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="font-medium">Drop your resume here</p>
                          <p className="text-sm text-muted-foreground">PDF or DOCX, max 5MB</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      className="hidden"
                      onChange={handleResumeUpload}
                      disabled={uploadingResume}
                    />
                  </label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" /> Email Notifications
              </CardTitle>
              <CardDescription>Get notified about new high-score jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive emails when new jobs match your criteria</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.email_notifications}
                    onChange={(e) => setPreferences({ ...preferences, email_notifications: e.target.checked })}
                    className="h-5 w-5"
                  />
                </div>
                {preferences.email_notifications && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Score Threshold</label>
                      <p className="text-xs text-muted-foreground">Only notify for jobs with score ≥ X</p>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={preferences.notify_score_threshold}
                        onChange={(e) => setPreferences({ ...preferences, notify_score_threshold: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Frequency</label>
                      <select
                        className="w-full p-2 border rounded"
                        value={preferences.notify_frequency}
                        onChange={(e) => setPreferences({ ...preferences, notify_frequency: e.target.value as 'daily' | 'weekly' })}
                      >
                        <option value="daily">Daily (8:30 UTC)</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <Button onClick={handleSavePreferences} disabled={saving} className="w-full">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Preferences
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Scoring Preferences */}
          <Card id="scoring">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" /> Scoring Preferences
              </CardTitle>
              <CardDescription>Personnalisez le scoring des offres</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Titles (séparés par virgule)</label>
                  <Input 
                    placeholder="Product Manager, CPO, Head of Product"
                    value={scoringPreferences.target_titles?.join(', ') || ''}
                    onChange={(e) => setScoringPreferences({...scoringPreferences, target_titles: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Keywords</label>
                  <Input 
                    placeholder="async, remote-first, startup"
                    value={scoringPreferences.target_keywords?.join(', ') || ''}
                    onChange={(e) => setScoringPreferences({...scoringPreferences, target_keywords: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Excluded Keywords</label>
                  <Input 
                    placeholder="on-site, sales, cold calling"
                    value={scoringPreferences.excluded_keywords?.join(', ') || ''}
                    onChange={(e) => setScoringPreferences({...scoringPreferences, excluded_keywords: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Minimum Salary (USD/an)</label>
                  <Input 
                    type="number"
                    placeholder="80000"
                    value={scoringPreferences.min_salary || ''}
                    onChange={(e) => setScoringPreferences({...scoringPreferences, min_salary: parseInt(e.target.value) || undefined})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Size</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={scoringPreferences.preferred_company_size || 'any'}
                    onChange={(e) => setScoringPreferences({...scoringPreferences, preferred_company_size: e.target.value})}
                  >
                    <option value="any">Any</option>
                    <option value="startup">Startup (1-50)</option>
                    <option value="scaleup">Scaleup (50-500)</option>
                    <option value="enterprise">Enterprise (500+)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred Timezones</label>
                  <Input 
                    placeholder="UTC, CET, EST"
                    value={scoringPreferences.preferred_timezones?.join(', ') || ''}
                    onChange={(e) => setScoringPreferences({...scoringPreferences, preferred_timezones: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                  />
                </div>
                <Button onClick={handleSaveScoringPreferences} disabled={savingScoring} className="w-full">
                  {savingScoring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Scoring Preferences
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Configure external services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">OpenAI API Key</label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your key from{' '}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      OpenAI Platform
                    </a>
                  </p>
                </div>
                <Button onClick={handleSaveApiKey} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save API Key
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Export */}
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Export and manage your data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Download all your data including applications and profile.
                </p>
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}