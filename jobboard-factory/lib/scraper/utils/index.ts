// Utility functions for jobboard-factory

import crypto from 'crypto'

/**
 * Hash URL using SHA-256 for deduplication
 */
export function hashUrl(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex').substring(0, 16)
}

/**
 * Normalize job type to standard values
 */
export function normalizeJobType(type: string | null): string {
  if (!type) return 'UNKNOWN'
  const lower = type.toLowerCase()
  if (lower.includes('cdi') || lower.includes('permanent')) return 'CDI'
  if (lower.includes('cdd') || lower.includes('contract')) return 'CDD'
  if (lower.includes('mis') || lower.includes('interim')) return 'MIS'
  if (lower.includes('alt') || lower.includes('alternative')) return 'ALT'
  if (lower.includes('stagiaire') || lower.includes('stage')) return 'STG'
  if (lower.includes('freelance') || lower.includes('independent')) return 'FREELANCE'
  return 'UNKNOWN'
}

/**
 * Normalize salary to "XXk - YYk € / an" format
 */
export function normalizeSalary(salary: string | null | number): string {
  if (!salary) return ''
  if (typeof salary === 'number') {
    if (salary < 1000) return `${salary}€ / h`
    return `${Math.round(salary / 1000)}k - ${Math.round(salary / 1000)}k€ / an`
  }
  return salary.replace(/[^\d€kK\s-]/g, '').trim()
}

/**
 * Strip HTML tags to get plain text
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Parse French location (city + postal code)
 */
export function parseLocation(location: string): { city: string; postalCode?: string } {
  const match = location.match(/^(\d{5})\s*(.+)$/)
  if (match) return { postalCode: match[1], city: match[2].trim() }
  return { city: location.trim() }
}

/**
 * Detect if job is remote-friendly
 */
export function detectRemote(description: string | null): boolean {
  if (!description) return false
  const lower = description.toLowerCase()
  return lower.includes('télétravail') || lower.includes('remote') || 
         lower.includes('flexible') || lower.includes('100% remote')
}

/**
 * Random delay between min and max milliseconds
 */
export function randomDelay(min = 1200, max = 3800): number {
  return Math.floor(Math.random() * (max - min) + min)
}

/**
 * Deduplicate jobs by URL hash
 */
export function deduplicateJobs<T extends { url: string }>(jobs: T[]): T[] {
  const seen = new Set<string>()
  const unique: T[] = []
  for (const job of jobs) {
    const hash = hashUrl(job.url)
    if (!seen.has(hash)) {
      seen.add(hash)
      unique.push(job)
    }
  }
  return unique
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
]

let uaIndex = 0

/**
 * Get next User-Agent with rotation
 */
export function getUserAgent(): string {
  uaIndex = (uaIndex + 1) % USER_AGENTS.length
  return USER_AGENTS[uaIndex]
}
