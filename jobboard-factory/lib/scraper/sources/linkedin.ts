import { ScrapedJob, ScrapeParams } from '../../types'
import { BaseAdapter } from '../base/BaseAdapter'
import { hashUrl, normalizeJobType, stripHtml } from '../utils'

// NOTE: LinkedIn blocks most scrapers — this adapter uses the public
// job search API endpoint which doesn't require authentication.
// For production use, consider the official LinkedIn API.
export class LinkedInAdapter extends BaseAdapter {
  readonly source = 'linkedin' as const

  async scrape(params: ScrapeParams): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = []
    const query = encodeURIComponent(params.keywords || 'developer')
    const location = encodeURIComponent(params.location || 'France')

    for (let page = 0; page < (params.pages || 1); page++) {
      const start = page * 25
      const url = `https://www.linkedin.com/jobs/search/?keywords=${query}&location=${location}&start=${start}`

      try {
        const html = await this.fetchHtml(url)

        // Extract JSON from embedded script
        const jsonMatch = html.match(/"jobPostings":\[(.*?)\]/s)
        if (jsonMatch) {
          const rawItems = jsonMatch[1].split('},{').map((item, i, arr) => {
            if (i === 0) return item + '}'
            if (i === arr.length - 1) return '{' + item
            return '{' + item + '}'
          })
          for (const rawItem of rawItems) {
            try {
              const item = JSON.parse(rawItem)
              const jobUrl = item.jobUrl || item.dashEntityUrn || ''
              jobs.push({
                id: hashUrl(jobUrl),
                title: item.title || item.jobTitle || '',
                company: item.companyName || item.company || '',
                location: item.formattedLocation || location,
                url: jobUrl.startsWith('http') ? jobUrl : `https://www.linkedin.com${jobUrl}`,
                source: 'linkedin',
                postedAt: item.listedAt ? new Date(item.listedAt) : undefined,
                jobType: normalizeJobType(item.workType),
              })
            } catch { /* skip malformed */ }
          }
        } else {
          // Fallback: parse HTML job cards
          const matches = html.matchAll(/data-job-id="([^"]+)".*?base-search-card__title[^>]*>([^<]+)<.*?base-search-card__subtitle[^>]*>([^<]+)</gs)
          for (const m of matches) {
            jobs.push({
              id: hashUrl(m[1]),
              title: m[2].trim(),
              company: m[3].trim(),
              url: `https://www.linkedin.com/jobs/view/${m[1]}`,
              source: 'linkedin',
              location: params.location || 'France',
            })
          }
        }
      } catch (e: any) { console.error(e.message) }
    }
    return jobs
  }
}

export const linkedin = new LinkedInAdapter()
