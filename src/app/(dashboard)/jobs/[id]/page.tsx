import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Globe, Calendar, Briefcase } from 'lucide-react'

interface PageProps {
  params: { id: string }
}

export default async function JobDetailPage({ params }: PageProps) {
  const supabase = createClient()

  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!job) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/search" className="flex items-center gap-2">
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
        {/* Job Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center text-2xl font-bold text-primary">
                {job.company.charAt(0)}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{job.title}</h1>
                <p className="text-lg text-muted-foreground">{job.company}</p>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {job.location || 'Remote'}
                  </span>
                  {job.remote && (
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Remote
                    </span>
                  )}
                  {job.job_type && (
                    <span className="bg-muted px-2 py-0.5 rounded">
                      {job.job_type}
                    </span>
                  )}
                  {job.salary_range && (
                    <span className="bg-muted px-2 py-0.5 rounded">
                      {job.salary_range}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Description */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {job.description_html ? (
                    <div dangerouslySetInnerHTML={{ __html: job.description_html }} />
                  ) : job.description_text ? (
                    <div className="whitespace-pre-wrap">{job.description_text}</div>
                  ) : (
                    <p className="text-muted-foreground">No description available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Apply Card */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Link href={`/apply/${job.id}`} className="w-full">
                    <Button className="w-full">
                      Generate & Apply
                    </Button>
                  </Link>
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button variant="outline" className="w-full">
                      <Globe className="mr-2 h-4 w-4" />
                      View Original
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Job Meta */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Source</span>
                    <span className="font-medium capitalize">{job.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Language</span>
                    <span className="font-medium uppercase">{job.detected_language}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posted</span>
                    <span className="font-medium">
                      {job.posted_at
                        ? new Date(job.posted_at).toLocaleDateString()
                        : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scraped</span>
                    <span className="font-medium">
                      {new Date(job.scraped_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            {job.skills_required && job.skills_required.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills_required.map((skill: string, i: number) => (
                      <span
                        key={i}
                        className="bg-muted px-2 py-1 rounded text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}