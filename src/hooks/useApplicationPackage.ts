'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { ApplicationPackage } from '@/types'

interface UseApplicationPackageReturn {
  package: ApplicationPackage | null
  loading: boolean
  error: string | null
  generatedAt: string | null
  fetchPackage: (jobId: string, userId: string) => Promise<ApplicationPackage | null>
  generatePackage: (jobId: string, userId: string) => Promise<ApplicationPackage | null>
}

export function useApplicationPackage(): UseApplicationPackageReturn {
  const [package, setPackage] = useState<ApplicationPackage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const supabase = createClient()

  const fetchPackage = useCallback(async (jobId: string, userId: string) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('applications')
        .select('application_package, package_generated_at')
        .eq('job_id', jobId)
        .eq('user_id', userId)
        .single()

      if (fetchError) throw fetchError

      if (data?.application_package) {
        setPackage(data.application_package as ApplicationPackage)
        setGeneratedAt(data.package_generated_at)
        return data.application_package as ApplicationPackage
      }

      return null
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const generatePackage = useCallback(async (jobId: string, userId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/app-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, user_id: userId }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate package')
      }

      const generatedPkg = data.application_package as ApplicationPackage
      setPackage(generatedPkg)
      setGeneratedAt(new Date().toISOString())

      return generatedPkg
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    package,
    loading,
    error,
    generatedAt,
    fetchPackage,
    generatePackage,
  }
}