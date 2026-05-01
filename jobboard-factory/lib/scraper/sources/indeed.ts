import { ScrapedJob, ScrapeParams } from '../../types'
import { BaseAdapter } from '../base/BaseAdapter'
import { hashUrl, normalizeJobType, stripHtml, detectRemote } from '../utils'

export class IndeedAdapter extends BaseAdapter {
  readonly source = 'indeed' as const

  async scrape(params: ScrapeParams): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = []
    const query = encodeURIComponent(params.keywords || 'developer')
    const location = encodeURIComponent(params.location || 'France')

    for (let page = 0; page < (params.pages || 1); page++) {
      const start = page * 10
      const url = `https://fr.indeed.com/jobs?q=${query}&l=${location}&start=${start}`

      try {
        const html = await this.fetchHtml(url)
        const matches = html.matchAll(/<a class="jobtitle[^>]*href="([^"]*)"[^>]*>([^<]*)<.*?company>([^<]*)<.*?location>([^<]*)</gs)

        for (const m of matches) {
          jobs.push({
            id: hashUrl(m[1]),
            title: m[2].trim(),
            company: m[3].trim(),
            location: m[4].trim(),
            url: 'https://fr.indeed.com' + m[1],
            source: 'indeed',
          })
        }
      } catch (e: any) { console.error(e.message) }
    }
    return jobs
  }
}

export const indeed = new IndeedAdapter()
