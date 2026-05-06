'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Search, 
  Layout, 
  BarChart3, 
  Settings, 
  User, 
  ChevronLeft, 
  ChevronRight,
  LogOut 
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface SidebarProps {
  user: SupabaseUser | null
  userName?: string
}

const navItems = [
  { href: '/jobs', icon: Search, label: 'Jobs' },
  { href: '/board', icon: Layout, label: 'Board' },
  { href: '/dashboard', icon: BarChart3, label: 'Dashboard' },
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export default function Sidebar({ user, userName }: SidebarProps) {
  const [expanded, setExpanded] = useState(false)
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className={`
          hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-background border-r z-50
          transition-all duration-300 ease-in-out
          ${expanded ? 'w-52' : 'w-16'}
        `}
      >
        {/* Logo */}
        <div className={`p-4 border-b flex items-center ${expanded ? 'justify-start' : 'justify-center'}`}>
          <span className="text-xl font-bold">JobPilot</span>
        </div>

        {/* Toggle Button */}
        <button 
          onClick={() => setExpanded(!expanded)}
          className="absolute -right-3 top-20 bg-background border rounded-full p-1 shadow"
        >
          {expanded ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors
                  ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}
                  ${!expanded && 'justify-center'}
                `}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {expanded && <span className="text-sm">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className={`p-4 border-t ${expanded ? 'flex-row' : 'flex-col'} flex items-center gap-3`}>
          {user && (
            <>
              <div className={`rounded-full bg-primary/20 p-2 ${expanded ? '' : 'mx-auto'}`}>
                <User className="h-4 w-4 text-primary" />
              </div>
              {expanded && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{userName || 'User'}</p>
                </div>
              )}
            </>
          )}
          <button 
            onClick={handleLogout}
            className={`p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg ${expanded ? '' : 'mx-auto mt-2'}`}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center gap-1 p-2 rounded-lg transition-colors
                  ${isActive ? 'text-primary' : 'text-muted-foreground'}
                `}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}