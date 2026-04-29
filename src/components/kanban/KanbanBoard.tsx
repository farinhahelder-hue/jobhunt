import { KanbanColumn } from './KanbanColumn'
import type { Application, KanbanColumnConfig } from '@/types'

interface KanbanBoardProps {
  columns: KanbanColumnConfig[]
  applications: Application[]
  onDragEnd: (event: any) => void
  getApplicationsForColumn: (columnId: string) => Application[]
}

export function KanbanBoard({
  columns,
  applications,
  onDragEnd,
  getApplicationsForColumn,
}: KanbanBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          applications={getApplicationsForColumn(column.id)}
        />
      ))}
    </div>
  )
}