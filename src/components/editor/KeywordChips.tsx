import { cn } from '@/lib/utils'

interface KeywordChipsProps {
  matched: string[]
  missing: string[]
  className?: string
}

export function KeywordChips({ matched, missing, className }: KeywordChipsProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {matched.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1">Matched</p>
          <div className="flex flex-wrap gap-1">
            {matched.map((kw, i) => (
              <span
                key={i}
                className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded text-xs"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
      {missing.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1">Missing</p>
          <div className="flex flex-wrap gap-1">
            {missing.map((kw, i) => (
              <span
                key={i}
                className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 px-2 py-0.5 rounded text-xs"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}