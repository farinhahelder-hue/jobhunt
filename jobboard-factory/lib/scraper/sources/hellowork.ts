import { ScrapedJob, ScrapeParams } from '../../types'
import { BaseAdapter } from '../base/BaseAdapter'
import { hashUrl, normalizeJobType, stripHtml, detectRemote } from '../utils'

export class HelloWorkAdapter extends BaseAdapter {
  readonly source = 'hellowork' as const
  readonly baseUrl = 'https://www.hellowork.com'

  async scrape(params: ScrapeParams): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = []
    const query = encodeURIComponent(params.keywords || 'developpeur')
    const location = encodeURIComponent(params.location || 'France')

    for (let page = 1; page <= (params.pages || 1); page++) {
      try {
        const url = `${this.baseUrl}/emploi/recherche.html?k=${query}&l=${location}&p=${page}`
        const html = await this.fetchHtml(url)

        // Parse JSON-LD structured data
        const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([^<]*JobPosting[^<]*)<\/script>/gs)

        for (const match of jsonLdMatches) {
          try {
            const data = JSON.parse(match[1])
            jobs.push({
              id: hashUrl(data.url || data.identifier?.value || ''),
              title: data.title || '',
              company: data.hiringOrganization?.name || '',
              location: data.jobLocation?.address?.addressLocality || '',
              url: data.url || '',
              description: stripHtml(data.description || '').substring(0, 1500),
              source: 'hellowork',
              postedAt: data.datePosted,
              jobType: normalizeJobType(data.employmentType),
              salaryRange: data.baseSalary?.value?.value,
              remote: detectRemote(data.description),
            })
          } catch { /* skip malformed JSON-LD */ }
        }
      } catch (e: any) { console.error(e.message) }
    }
    return jobs
  }
}

export const hellowork = new HelloWorkAdapter()
