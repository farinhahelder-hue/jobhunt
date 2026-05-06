'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { 
  Briefcase, 
  TrendingUp, 
  MessageSquare, 
  Award,
  Search,
  Plus,
  LogOut,
  FileText,
  Menu,
  Target,
  Users,
  BarChart3,
  PieChart,
  Sun,
  Moon
} from 'lucide-react'

interface AnalyticsData {
  total_applications: number
  funnel: {
    wishlist: number
    saved: number
    applied: number
    interviewing: number
    offer: number
    rejected: number
  }
  response_rate: number
  responses_received: number
  by_source: Record<string, number>
  average_ats_score: number | null
  applications_scored: number
  timeline_30_days: Record<string, { total: number; applied: number }>
}

interface DashboardStats {
  total_applied: number
  interviews: number
  offers: number
  avg_ats_score: number
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Get user profile for personalized message and onboarding check
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single()

      // Extract first name from user_metadata or profile
      const firstName = profile?.full_name 
        ? profile.full_name.split(' ')[0]
        : user.user_metadata?.full_name 
          ? (user.user_metadata.full_name as string).split(' ')[0]
          : user.user_metadata?.name 
            ? (user.user_metadata.name as string).split(' ')[0]
            : null
      
      setUserName(firstName || '')

      // If no profile or no full_name, redirect to onboarding
      if (!profile?.full_name) {
        router.push('/profile?onboarding=true')
        return
      }

      // Get analytics from API
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          const response = await fetch('/api/analytics/stats', {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          })
          if (response.ok) {
            const data = await response.json()
            setAnalytics(data)
          }
        }
      } catch (e) {
        console.error('Failed to fetch analytics:', e)
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

        {/* Theme Toggle */}
        <div className="border-t p-4">
          <Button variant="ghost" className="w-full justify-start" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="mr-3 h-4 w-4" /> : <Moon className="mr-3 h-4 w-4" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>

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

          {/* Theme Toggle Mobile */}
          <div className="p-4">
            <Button variant="ghost" className="w-full justify-start" onClick={() => { toggleTheme(); setSidebarOpen(false) }}>
              {theme === 'dark' ? <Sun className="mr-3 h-4 w-4" /> : <Moon className="mr-3 h-4 w-4" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>
          </div>

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
            <h1 className="text-2xl font-bold">
              {userName ? `Welcome back, ${userName}!` : 'Welcome back!'}
            </h1>
            <p className="text-muted-foreground">
              Here&apos;s an overview of your job search
            </p>
          </div>

          {/* Stats Grid - Analytics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.total_applications || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Across all stages
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.response_rate || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.responses_received || 0} responses received
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Interviews</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.funnel?.interviewing || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Interview scheduled
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg ATS Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.average_ats_score || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.applications_scored || 0} resumes scored
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Funnel Visualization */}
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Application Funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Wishlist</span>
                    <span className="font-medium">{analytics?.funnel?.wishlist || 0}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${((analytics?.funnel?.wishlist || 0) / Math.max(analytics?.total_applications || 1, 1)) * 100}%` }}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Saved</span>
                    <span className="font-medium">{analytics?.funnel?.saved || 0}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${((analytics?.funnel?.saved || 0) / Math.max(analytics?.total_applications || 1, 1)) * 100}%` }}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Applied</span>
                    <span className="font-medium">{analytics?.funnel?.applied || 0}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${((analytics?.funnel?.applied || 0) / Math.max(analytics?.total_applications || 1, 1)) * 100}%` }}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Interviewing</span>
                    <span className="font-medium">{analytics?.funnel?.interviewing || 0}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${((analytics?.funnel?.interviewing || 0) / Math.max(analytics?.total_applications || 1, 1)) * 100}%` }}></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Offer</span>
                    <span className="font-medium">{analytics?.funnel?.offer || 0}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${((analytics?.funnel?.offer || 0) / Math.max(analytics?.total_applications || 1, 1)) * 100}%` }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  By Source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics?.by_source || {}).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{source}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                  {(!analytics?.by_source || Object.keys(analytics.by_source).length === 0) && (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  )}
                </div>
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