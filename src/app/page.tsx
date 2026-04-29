import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Briefcase, 
  FileText, 
  Target, 
  Zap,
  BarChart3,
  Globe,
  Moon,
  Sun
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">JobPilot</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Land Your Dream Job,{' '}
            <span className="text-primary">Smarter</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            JobPilot is an intelligent job application automation platform. Find jobs, 
            auto-apply with AI-tailored resumes, and track your applications on a Kanban board.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Start Applying Today
              </Button>
            </Link>
            <Link href="/search">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Browse Jobs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Land Your Next Role
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Job Scraping</h3>
              <p className="text-muted-foreground">
                Automatically scrape jobs from LinkedIn, Indeed, and more. 
                Get fresh listings delivered to your dashboard.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Resume Builder</h3>
              <p className="text-muted-foreground">
                Upload your base resume and let AI adapt it for each job. 
                Match keywords and generate matching cover letters automatically.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">ATS Scoring</h3>
              <p className="text-muted-foreground">
                Score your resume against Applicant Tracking Systems. 
                Get actionable suggestions to beat the bots.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Auto-Apply</h3>
              <p className="text-muted-foreground">
                Let JobPilot handle the application process. 
                Auto-fill forms and upload documents with one click.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Kanban Tracker</h3>
              <p className="text-muted-foreground">
                Visual boards to track every application. 
                From saved to offer - never lose track again.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <Moon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Dark Mode</h3>
              <p className="text-muted-foreground">
                Easy on the eyes with our warm beige light / 
                charcoal dark theme. Full dark mode support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Accelerate Your Job Search?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of job seekers who are using JobPilot to land their dream jobs faster.
          </p>
          <Link href="/login">
            <Button size="lg">Get Started for Free</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <span className="font-semibold">JobPilot</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 JobPilot. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}