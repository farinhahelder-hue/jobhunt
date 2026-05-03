'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { UserProfile, BaseResume } from '@/types'
import { 
  Briefcase, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Link2,
  FileText,
  Upload,
  Loader2,
  Save,
  Trash2,
} from 'lucide-react'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Partial<UserProfile>>({})
  const [resumes, setResumes] = useState<BaseResume[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    linkedin_url: '',
    portfolio_url: '',
    available_from: '',
    salary_expectation: 0,
    work_authorization: '',
  })

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (profileData) {
        setProfile(profileData as UserProfile)
      }

      const { data: resumeData } = await supabase
        .from('base_resumes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (resumeData) {
        setResumes(resumeData as BaseResume[])
      }

      setLoading(false)
    }

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      fetchProfile(user.id)
    }
    getUser()
  }, [supabase, router])

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    const { data: resumeData } = await supabase
      .from('base_resumes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (profileData) {
      setProfile(profileData)
      setFormData({
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        location: profileData.location || '',
        linkedin_url: profileData.linkedin_url || '',
        portfolio_url: profileData.portfolio_url || '',
        available_from: profileData.available_from || '',
        salary_expectation: profileData.salary_expectation || 0,
        work_authorization: profileData.work_authorization || '',
      })
    }

    if (resumeData) {
      setResumes(resumeData)
    }

    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          ...formData,
          email: user.email,
          updated_at: new Date().toISOString(),
        })

      if (!error) {
        await fetchProfile(user.id)
      }
    } catch (err) {
      console.error('Error saving:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Read file content
    const reader = new FileReader()
    reader.onload = async () => {
      const content = reader.result as string

      const { error } = await supabase
        .from('base_resumes')
        .insert({
          user_id: user.id,
          filename: file.name,
          content_text: content.substring(0, 50000), // Limit size
          storage_path: `users/${user.id}/resumes/${file.name}`,
        })

      if (!error) {
        fetchProfile(user.id)
      }
    }
    reader.readAsText(file)
  }

  const handleDeleteResume = async (id: string) => {
    const { error } = await supabase
      .from('base_resumes')
      .delete()
      .eq('id', id)

    if (!error && user) {
      fetchProfile(user.id)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
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
            <Link href="/board" className="text-sm hover:text-primary">
              Board
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Profile & Settings</h1>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Your details for job applications</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <Input
                      placeholder="John Doe"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      placeholder="+1 234 567 8900"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <Input
                      placeholder="Paris, France"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">LinkedIn URL</label>
                    <Input
                      placeholder="linkedin.com/in/johndoe"
                      value={formData.linkedin_url}
                      onChange={(e) =>
                        setFormData({ ...formData, linkedin_url: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Portfolio URL</label>
                    <Input
                      placeholder="johndoe.com"
                      value={formData.portfolio_url}
                      onChange={(e) =>
                        setFormData({ ...formData, portfolio_url: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Available From</label>
                    <Input
                      type="date"
                      value={formData.available_from}
                      onChange={(e) =>
                        setFormData({ ...formData, available_from: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Salary Expectation</label>
                    <Input
                      type="number"
                      placeholder="50000"
                      value={formData.salary_expectation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          salary_expectation: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Work Authorization</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={formData.work_authorization}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        work_authorization: e.target.value,
                      })
                    }
                  >
                    <option value="">Select authorization</option>
                    <option value="citizen">Citizen</option>
                    <option value="work_visa">Work Visa</option>
                    <option value="need_sponsorship">Need Sponsorship</option>
                  </select>
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Profile
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Base Resumes */}
          <Card>
            <CardHeader>
              <CardTitle>Base Resumes</CardTitle>
              <CardDescription>Upload your master resume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <label className="flex items-center justify-center w-full border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm">
                      Click to upload your resume (text files only)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".txt,.md"
                    className="hidden"
                    onChange={handleResumeUpload}
                  />
                </label>

                {resumes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Uploaded Resumes</p>
                    {resumes.map((resume) => (
                      <div
                        key={resume.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted"
                      >
                        <div>
                          <p className="font-medium">{resume.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(resume.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteResume(resume.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}