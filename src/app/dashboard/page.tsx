'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'
import { 
  Briefcase, 
  TrendingUp, 
  MessageSquare, 
  Award,
  Search,
  Plus,
  LogOut,
  FileText,
  Menu
} from 'lucide-react'

interface DashboardStats {
  total_applied: number
  interviews: number
  offers: number
  avg_ats_score: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_applied: 0,
    interviews: 0,
    offers: 0,
    avg_ats_score: 0,
  })
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

      // Get stats
      const { data: applications } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)

      if (applications) {
        const applied = applications.filter(a => a.kanban_column !== 'saved').length
        const interview = applications.filter(a => a.kanban_column === 'interview').length
        const offer = applications.filter(a => a.kanban_column === 'offer').length
        
        let totalScore = 0
        let scoreCount = 0
        applications.forEach(a => {
          if (a.ats_score?.overall) {
            totalScore += a.ats_score.overall
            scoreCount++
          }
        })

        setStats({
          total_applied: applied,
          interviews: interview,
          offers: offer,
          avg_ats_score: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
        })
      }

      setLoading(false)
    }

    getUser()
  }, [supabase, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Briefcase },
    { href: '/search', label: 'Search Jobs', icon: Search },
    { href: '/board', label: 'Applications', icon: FileText },
    { href: '/profile', label: 'Profile', icon: TrendingUp },
    { href: '/settings', label: 'Settings', icon: Menu },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="border-b md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="font-bold">JobPilot</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Briefcase className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">JobPilot</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t p-4">
          <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="mr-3 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-background md:hidden">
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              <span className="font-bold">JobPilot</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              ×
            </Button>
          </div>
          <nav className="p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 border-t p-4">
            <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
              <LogOut className="mr-3 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="md:pl-64">
        <div className="container mx-auto p-6">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Welcome back!</h1>
            <p className="text-muted-foreground">
              Here&apos;s an overview of your job search
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Applied</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_applied}</div>
                <p className="text-xs text-muted-foreground">
                  Applications submitted
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Interviews</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.interviews}</div>
                <p className="text-xs text-muted-foreground">
                  Interview scheduled
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offers</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.offers}</div>
                <p className="text-xs text-muted-foreground">
                  Job offers received
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg ATS Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avg_ats_score}%</div>
                <p className="text-xs text-muted-foreground">
                  Average resume score
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            <Link href="/search">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Search className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Search for Jobs</h3>
                    <p className="text-sm text-muted-foreground">
                      Find your next opportunity
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/board">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-full bg-primary/10 p-3">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">View Applications</h3>
                    <p className="text-sm text-muted-foreground">
                      Track your job applications
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Add Job Button */}
          <div className="flex justify-center">
            <Link href="/search">
              <Button size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                Find Jobs
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}