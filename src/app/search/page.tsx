'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'
import { Briefcase, MapPin, Search, Filter, Loader2, Plus, X, Layers } from 'lucide-react'
import type { Job, JobSearchFilters } from '@/types'

interface ProfileSearch {
  id: string
  keywords: string
  location: string
  remote: boolean
  results: Job[]
  loading: boolean
}

export default function SearchPage() {
  const [filters, setFilters] = useState<JobSearchFilters>({
    keywords: '',
    location: '',
    remote: false,
    language: '',
    job_type: '',
    salary_min: 0,
  })
  // Multi-profile: array of searches
  const [profiles, setProfiles] = useState<ProfileSearch[]>([
    { id: '1', keywords: '', location: '', remote: false, results: [], loading: false }
  ])
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
    }
    getUser()
  }, [supabase, router])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Search all profiles in parallel
      const searchPromises = profiles.map(async (profile) => {
        if (!profile.keywords) return { ...profile, results: [], loading: false }
        
        let query = supabase
          .from('jobs')
          .select('*')
          .order('scraped_at', { ascending: false })
          .ilike('title', `%${profile.keywords}%`)

        if (profile.location) {
          query = query.ilike('location', `%${profile.location}%`)
        }
        if (profile.remote) {
          query = query.eq('remote', true)
        }

        const { data, error } = await query.limit(50)
        
        return { 
          ...profile, 
          results: data || [], 
          loading: false 
        }
      })

      const results = await Promise.all(searchPromises)
      setProfiles(results)
    } catch (err) {
      console.error('Error searching jobs:', err)
    } finally {
      setLoading(false)
    }
  }

  // Add a new search profile
  const addProfile = () => {
    setProfiles([
      ...profiles,
      { 
        id: Date.now().toString(), 
        keywords: '', 
        location: '', 
        remote: false, 
        results: [], 
        loading: false 
      }
    ])
  }

  // Remove a search profile
  const removeProfile = (id: string) => {
    if (profiles.length <= 1) return
    setProfiles(profiles.filter(p => p.id !== id))
  }

  // Update a profile's filters
  const updateProfile = (id: string, updates: Partial<ProfileSearch>) => {
    setProfiles(profiles.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  const handleScrape = async () => {
    setScraping(true)

    try {
      const response = await fetch('/api/jobs/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      })

      if (!response.ok) throw new Error('Scraping failed')

      // Poll for results
      const interval = setInterval(async () => {
        const { data } = await supabase
          .from('jobs')
          .select('*')
          .order('scraped_at', { ascending: false })
          .limit(50)

        if (data) setJobs(data)
      }, 2000)

      setTimeout(() => {
        clearInterval(interval)
        setScraping(false)
      }, 30000)
    } catch (err) {
      console.error('Error scraping:', err)
      setScraping(false)
    }
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
            <Link href="/board" className="text-sm hover:text-primary">
              Board
            </Link>
            <Link href="/profile" className="text-sm hover:text-primary">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto p-6">
        {/* Multi-Profile Search Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Multi-Profile Search</h1>
          </div>
          <Button variant="outline" onClick={addProfile}>
            <Plus className="mr-2 h-4 w-4" />
            Add Profile
          </Button>
        </div>

        {/* Search Forms - One per profile */}
        {profiles.map((profile, index) => (
          <Card key={profile.id} className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-medium">Profile {index + 1}</span>
                {profile.loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {profiles.length > 1 && (
                  <button
                    onClick={() => removeProfile(profile.id)}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Keywords</label>
                  <Input
                    placeholder="Job title, skills..."
                    value={profile.keywords}
                    onChange={(e) => updateProfile(profile.id, { keywords: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    placeholder="City, country..."
                    value={profile.location}
                    onChange={(e) => updateProfile(profile.id, { location: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={profile.remote}
                      onChange={(e) => updateProfile(profile.id, { remote: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Remote only</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Unified Search Button */}
        <div className="flex gap-4 mb-6">
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching all profiles...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search All Profiles
              </>
            )}
          </Button>

          <Button variant="outline" onClick={handleScrape} disabled={scraping}>
            {scraping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scraping...
              </>
            ) : (
              'Scrape Jobs'
            )}
          </Button>
        </div>

        {/* Results by Profile */}
        {profiles.map((profile, index) => (
          profile.results.length > 0 && (
            <div key={profile.id} className="mb-8">
              <h2 className="text-lg font-semibold mb-4">
                Profile {index + 1}: {profile.keywords || 'All jobs'}
                {profile.location && ` in ${profile.location}`}
                <span className="text-muted-foreground font-normal ml-2">
                  ({profile.results.length} jobs)
                </span>
              </h2>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {profile.results.map((job) => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-primary/10 w-10 h-10 flex items-center justify-center text-sm font-bold">
                          {job.company.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/jobs/${job.id}`}
                            className="font-semibold hover:text-primary truncate block"
                          >
                            {job.title}
                          </Link>
                          <p className="text-sm text-muted-foreground truncate">
                            {job.company}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {job.location || 'Remote'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Link href={`/jobs/${job.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            View
                          </Button>
                        </Link>
                        <Link href={`/apply/${job.id}`} className="flex-1">
                          <Button size="sm" className="w-full">
                            Apply
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}

        {!loading && !scraping && profiles.every(p => p.results.length === 0) && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
            <p className="text-muted-foreground mb-4">
              Add profiles and search for jobs
            </p>
          </div>
        )}
      </div>
    </div>
  )
}