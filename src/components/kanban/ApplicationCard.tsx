'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import type { Application } from '@/types'
import { MapPin, Calendar, MoreVertical, Trash2, Edit2 } from 'lucide-react'

interface ApplicationCardProps {
  application: Application
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: application.id,
    data: {
      type: 'application',
      application,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const job = application.job

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card 
        className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
      >
        <CardContent className="p-3">
          {/* Company logo or initial */}
          <div className="flex items-start gap-2">
            <div className="rounded-full bg-primary/10 w-8 h-8 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
              {job?.company?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/apply/${application.id}`}
                className="font-medium hover:text-primary text-sm truncate block"
              >
                {job?.title || 'Unknown Job'}
              </Link>
              <p className="text-xs text-muted-foreground truncate">
                {job?.company || 'Unknown Company'}
              </p>
            </div>
          </div>

          {/* Location */}
          {job?.location && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {job.location}
            </div>
          )}

          {/* Dates and ATS score */}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {application.created_at
                ? new Date(application.created_at).toLocaleDateString()
                : 'N/A'}
            </div>
            {application.ats_score?.overall && (
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${
                  application.ats_score.ats_safe
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                }`}
              >
                {application.ats_score.overall}%
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}