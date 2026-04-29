'use client'

interface DocumentPreviewProps {
  html: string
}

export function DocumentPreview({ html }: DocumentPreviewProps) {
  if (!html) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-lg">
        <p>Click Generate to create your document</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border">
      <div 
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}