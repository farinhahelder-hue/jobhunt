'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalClose, ModalContent, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useApplicationPackage } from '@/hooks/useApplicationPackage'
import type { ApplicationPackage } from '@/types'
import { 
  Sparkles, 
  Copy, 
  RefreshCw, 
  Loader2, 
  FileText, 
  MessagesSquare, 
  Lightbulb,
  AlertTriangle,
  Check,
  Download
} from 'lucide-react'

interface ApplicationPackageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationId: string
  jobId: string
  userId: string
}

type TabKey = 'cover_letter' | 'elevator_pitch' | 'answers' | 'keywords' | 'tips'

export function ApplicationPackageModal({ 
  open, 
  onOpenChange, 
  applicationId, 
  jobId, 
  userId 
}: ApplicationPackageModalProps) {
  const { package: pkg, loading, error, generatedAt, fetchPackage, generatePackage } = useApplicationPackage()
  const [activeTab, setActiveTab] = useState<TabKey>('cover_letter')
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  useEffect(() => {
    if (open && jobId && userId) {
      fetchPackage(jobId, userId)
    }
  }, [open, jobId, userId, fetchPackage])

  const handleGenerate = async () => {
    await generatePackage(jobId, userId)
  }

  const handleCopy = async (content: string, section: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const handleExport = async () => {
    if (!pkg) return
    
    const text = formatPackageAsText(pkg)
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `application-package-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatPackageAsText = (p: ApplicationPackage) => {
    return `
# Candidature - Package

## Lettre de motivation
${p.cover_letter}

## Elevator Pitch
${p.elevator_pitch}

## Réponses rapides
- Pourquoi cette entreprise: ${p.answers.why_company}
- Pourquoi ce rôle: ${p.answers.why_role}
- Années d'expérience: ${p.answers.experience_years}
- Disponibilité: ${p.answers.availability}
- Attente salariale: ${p.answers.salary_expectation}
- Préférence remote: ${p.answers.remote_preference}

## Mots-clés à mentionner
${p.keywords_to_mention.join(', ')}

## Points d'attention
${p.red_flags.join('\n')}

## Conseils
${p.application_tips.join('\n')}
    `.trim()
  }

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'cover_letter', label: 'Lettre', icon: FileText },
    { key: 'elevator_pitch', label: 'Pitch', icon: MessagesSquare },
    { key: 'answers', label: 'Réponses', icon: Lightbulb },
    { key: 'keywords', label: 'Keywords', icon: Sparkles },
    { key: 'tips', label: 'Conseils', icon: AlertTriangle },
  ]

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Génération du package en cours...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-500">{error}</p>
          <Button onClick={handleGenerate} className="mt-4">
            Réessayer
          </Button>
        </div>
      )
    }

    if (!pkg) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Sparkles className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Aucun package généré</p>
          <Button onClick={handleGenerate} className="mt-4">
            <Sparkles className="mr-2 h-4 w-4" />
            Générer mon dossier
          </Button>
        </div>
      )
    }

    return (
      <>
        {/* Tabs */}
        <div className="flex border-b">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[400px] overflow-y-auto p-4">
          {activeTab === 'cover_letter' && (
            <div className="space-y-2">
              <p className="whitespace-pre-wrap text-sm">{pkg.cover_letter}</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCopy(pkg.cover_letter, 'cover_letter')}
              >
                {copiedSection === 'cover_letter' ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Copier
              </Button>
            </div>
          )}

          {activeTab === 'elevator_pitch' && (
            <div className="space-y-2">
              <p className="whitespace-pre-wrap text-sm">{pkg.elevator_pitch}</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCopy(pkg.elevator_pitch, 'elevator_pitch')}
              >
                {copiedSection === 'elevator_pitch' ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Copier
              </Button>
            </div>
          )}

          {activeTab === 'answers' && (
            <div className="space-y-4">
              {Object.entries(pkg.answers).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <p className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-muted-foreground">{value}</p>
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCopy(Object.values(pkg.answers).join('\n'), 'answers')}
              >
                {copiedSection === 'answers' ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Copier tout
              </Button>
            </div>
          )}

          {activeTab === 'keywords' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">À mentionner</p>
                <div className="flex flex-wrap gap-2">
                  {pkg.keywords_to_mention.map((kw, i) => (
                    <span key={i} className="rounded-full bg-primary/10 px-3 py-1 text-sm">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-500">Points d'attention</p>
                <ul className="list-disc space-y-1 pl-4">
                  {pkg.red_flags.map((flag, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{flag}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'tips' && (
            <ul className="space-y-2">
              {pkg.application_tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </>
    )
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalHeader>
        <ModalTitle>
          <Sparkles className="mr-2 inline h-5 w-5 text-yellow-500" />
          Package de Candidature
        </ModalTitle>
        <ModalClose onClick={() => onOpenChange(false)} />
      </ModalHeader>

      <ModalContent>
        {generatedAt && (
          <p className="mb-4 text-xs text-muted-foreground">
            Généré le {new Date(generatedAt).toLocaleDateString('fr-FR')}
          </p>
        )}
        {renderContent()}
      </ModalContent>

      {pkg && (
        <ModalFooter>
          <Button variant="outline" onClick={handleGenerate}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Régénérer
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Button onClick={handleCopy.bind(null, formatPackageAsText(pkg), 'all')}>
            <Copy className="mr-2 h-4 w-4" />
            Tout copier
          </Button>
        </ModalFooter>
      )}
    </Modal>
  )
}