'use client'

import { useState } from 'react'

interface Job {
  title: string
  company: string
  location: string
  url: string
  source: string
}

export default function ScrapePage() {
  const [keywords, setKeywords] = useState('développeur')
  const [location, setLocation] = useState('france')
  const [source, setSource] = useState('all')
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const scrapeJobs = async () => {
    setLoading(true)
    setError('')
    setJobs([])
    
    try {
      const params = new URLSearchParams({ keywords, location, source, limit: '20' })
      const res = await fetch(`/api/scrape?${params}`)
      const data = await res.json()
      
      if (data.jobs) setJobs(data.jobs)
      if (data.error) setError(data.error)
    } catch (e: any) {
      setError(e.message)
    }
    
    setLoading(false)
  }

  const sourceLabels: Record<string, string> = {
    all: 'Toutes',
    autypik: 'Autypik',
    mission: 'Mission Handicap',
    handialt: 'Handi-Alternance',
    auticonsult: 'Auticonsult'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🔍 Scraping Neuro-Inclusif</h1>
        <p className="text-gray-600 mb-8">Recherchez des offres sur les plateformes neuro-inclusives</p>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mots-clés</label>
              <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg" placeholder="développeur, data..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg" placeholder="France, Remote..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg">
                {Object.entries(sourceLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <button onClick={scrapeJobs} disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {loading ? '🔄 Recherche...' : '🔍 Rechercher'}
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>}
        {jobs.length > 0 && <p className="mb-4 text-gray-600">{jobs.length} offres trouvées</p>}

        <div className="space-y-4">
          {jobs.map((job, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-800">{job.title}</h3>
                  <p className="text-gray-600">{job.company}</p>
                  {job.location && <p className="text-gray-500 text-sm">📍 {job.location}</p>}
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">{job.source}</span>
              </div>
              {job.url && <a href={job.url} target="_blank" className="text-emerald-600 text-sm hover:underline mt-2 block">Voir l'offre →</a>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}