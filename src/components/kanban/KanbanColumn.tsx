'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ApplicationCard } from './ApplicationCard'
import type { Application, KanbanColumnConfig } from '@/types'

interface KanbanColumnProps {
  column: KanbanColumnConfig
  applications: Application[]
}

export function KanbanColumn({ column, applications }: KanbanColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isOver,
  } = useSortable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={`w-80 flex-shrink-0 ${isOver ? 'opacity-50' : ''}`}
    >
      <div className="rounded-xl bg-card border">
        {/* Column Header */}
        <div
          {...listeners}
          className={`p-3 border-b ${column.bgColor}`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{column.label}</h3>
            <span className="text-sm bg-background/50 px-2 py-0.5 rounded-full">
              {applications.length}
            </span>
          </div>
        </div>

        {/* Column Content */}
        <div className="p-2 min-h-[200px] max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="space-y-2">
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}