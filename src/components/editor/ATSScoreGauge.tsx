'use client'

import type { ATSScore } from '@/types'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface ATSScoreGaugeProps {
  score: ATSScore
}

export function ATSScoreGauge({ score }: ATSScoreGaugeProps) {
  const getColor = (value: number) => {
    if (value >= 70) return 'text-green-500'
    if (value >= 50) return 'text-amber-500'
    return 'text-red-500'
  }

  const getBgColor = (value: number) => {
    if (value >= 70) return 'bg-green-500'
    if (value >= 50) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">ATS Score</h3>
      
      {/* Overall Score */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              className="text-muted"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${score.overall * 2.26} 226`}
              className={getColor(score.overall)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold">{score.overall}</span>
          </div>
        </div>
        <div>
          <p className="font-medium">
            {score.ats_safe ? (
              <span className="text-green-500 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                ATS Safe
              </span>
            ) : (
              <span className="text-red-500 flex items-center gap-1">
                <XCircle className="h-4 w-4" />
                Needs Improvement
              </span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {score.suggestions?.length || 0} suggestions
          </p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Keyword Match</span>
          <span className={getColor(score.keyword_match)}>{score.keyword_match}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Format Score</span>
          <span className={getColor(score.format_score)}>{score.format_score}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Length Score</span>
          <span className={getColor(score.length_score)}>{score.length_score}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Language Match</span>
          <span className={score.language_match ? 'text-green-500' : 'text-red-500'}>
            {score.language_match ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* Missing Keywords */}
      {score.missing_keywords?.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Missing Keywords</p>
          <div className="flex flex-wrap gap-1">
            {score.missing_keywords.slice(0, 10).map((kw, i) => (
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

      {/* Suggestions */}
      {score.suggestions?.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Suggestions</p>
          <ul className="space-y-1">
            {score.suggestions.map((sug, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                {sug}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}