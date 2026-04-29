'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'
import { Briefcase, MapPin, Search, Filter, Loader2 } from 'lucide-react'
import type { Job, JobSearchFilters } from '@/types'

export default function SearchPage() {
  const [filters, setFilters] = useState<JobSearchFilters>({
    keywords: '',
    location: '',
    remote: false,
    language: '',
    job_type: '',
    salary_min: 0,
  })
  const [jobs, setJobs] = useState<Job[]>([])
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
      let query = supabase
        .from('jobs')
        .select('*')
        .order('scraped_at', { ascending: false })

      if (filters.keywords) {
        query = query.ilike('title', `%${filters.keywords}%`)
      }
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`)
      }
      if (filters.remote) {
        query = query.eq('remote', true)
      }
      if (filters.language) {
        query = query.eq('detected_language', filters.language)
      }
      if (filters.job_type) {
        query = query.eq('job_type', filters.job_type)
      }

      const { data, error } = await query.limit(50)

      if (error) throw error
      setJobs(data || [])
    } catch (err) {
      console.error('Error searching jobs:', err)
    } finally {
      setLoading(false)
    }
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
        {/* Search Form */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Keywords</label>
                  <Input
                    placeholder="Job title, skills..."
                    value={filters.keywords}
                    onChange={(e) =>
                      setFilters({ ...filters, keywords: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    placeholder="City, country..."
                    value={filters.location}
                    onChange={(e) =>
                      setFilters({ ...filters, location: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Job Type</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={filters.job_type}
                    onChange={(e) =>
                      setFilters({ ...filters, job_type: e.target.value })
                    }
                  >
                    <option value="">All types</option>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Language</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={filters.language}
                    onChange={(e) =>
                      setFilters({ ...filters, language: e.target.value })
                    }
                  >
                    <option value="">Any language</option>
                    <option value="en">English</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.remote}
                    onChange={(e) =>
                      setFilters({ ...filters, remote: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Remote only</span>
                </label>

                <div className="flex-1" />

                <Button type="submit" variant="outline" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>

                <Button type="button" onClick={handleScrape} disabled={scraping}>
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
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {loading || scraping ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or scrape new jobs
            </p>
            <Button onClick={handleScrape}>Scrape Jobs Now</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {jobs.length} jobs found
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
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
                          {job.remote && (
                            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              Remote
                            </span>
                          )}
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
        )}
      </div>
    </div>
  )
}