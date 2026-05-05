'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Briefcase, Moon, Sun, Monitor, Download, Save, Loader2, Mail, Bell } from 'lucide-react'
import { useTheme } from 'next-themes'

interface UserPreferences {
  email_notifications: boolean
  notify_score_threshold: number
  notify_frequency: 'daily' | 'weekly'
}

export default function SettingsPage() {
  const [saving, setSaving] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [preferences, setPreferences] = useState<UserPreferences>({
    email_notifications: true,
    notify_score_threshold: 7,
    notify_frequency: 'daily',
  })
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
          .select('notification_preferences')
          .eq('user_id', user.id)
          .single()
        if (data?.notification_preferences) {
          setPreferences({ ...preferences, ...data.notification_preferences })
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