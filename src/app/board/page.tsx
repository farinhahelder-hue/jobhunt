'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { KanbanColumn as KanbanColumnComponent } from '@/components/kanban/KanbanColumn'
import type { Application, KanbanColumn } from '@/types'
import { KANBAN_COLUMNS } from '@/types'
import { Briefcase, Plus, Loader2 } from 'lucide-react'

export default function KanbanBoardPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      fetchApplications(user.id)
    }
    getUser()
  }, [supabase, router])

  const fetchApplications = async (userId: string) => {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        job:jobs(*)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setApplications(data)
    }
    setLoading(false)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const applicationId = active.id as string
    const newColumn = over.id as KanbanColumn

    // Update locally first
    setApplications(prev => 
      prev.map(app => 
        app.id === applicationId 
          ? { ...app, kanban_column: newColumn }
          : app
      )
    )

    // Update in database
    await supabase
      .from('applications')
      .update({ 
        kanban_column: newColumn,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
  }

  const getApplicationsForColumn = (column: string) => {
    return applications.filter(app => app.kanban_column === column)
  }

  const saveApplication = async (jobId: string) => {
    if (!user) return

    // Check if already saved
    const existing = applications.find(a => a.job_id === jobId)
    if (existing) {
      router.push(`/apply/${existing.id}`)
      return
    }

    const { data, error } = await supabase
      .from('applications')
      .insert({
        user_id: user.id,
        job_id: jobId,
        kanban_column: 'saved',
      })
      .select()
      .single()

    if (!error && data) {
      setApplications(prev => [...prev, data])
      router.push(`/apply/${data.id}`)
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
            <Link href="/profile" className="text-sm hover:text-primary">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Application Tracker</h1>
          <Link href="/search">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Job
            </Button>
          </Link>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((column) => (
              <SortableContext
                key={column.id}
                items={getApplicationsForColumn(column.id).map(a => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <KanbanColumnComponent
                  column={column}
                  applications={getApplicationsForColumn(column.id)}
                />
              </SortableContext>
            ))}
          </div>
        </DndContext>

        {applications.length === 0 && (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by searching for jobs and saving them to your board
            </p>
            <Link href="/search">
              <Button>Search Jobs</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}