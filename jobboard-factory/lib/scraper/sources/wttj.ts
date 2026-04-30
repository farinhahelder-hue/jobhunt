import { ScrapedJob, ScrapeParams } from '../../types'
import { BaseAdapter } from '../base/BaseAdapter'
import { hashUrl, normalizeJobType, getUserAgent } from '../utils'

export class WTTJAdapter extends BaseAdapter {
  name = 'wttj'
  
  async scrape(params: ScrapeParams): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = []
    const query = encodeURIComponent(params.keywords || 'dev')
    const url = `https://www.welcomejungle.com/wtj-api/v1/searches/articles?query=${query}&page=0&size=20`
    
    try {
      const res = await this.fetch(url)
      const data = await res.json()
      
      for (const item of data.results || []) {
        const job = item._source || item
        jobs.push({
          id: hashUrl(job.url || job.id),
          title: job.title || '',
          company: job.company?.name || '',
          location: job.location?.city || '',
          url: job.url || '',
          description: job.description?.substring(0, 1000),
          source: 'wttj',
          postedAt: job.publishedAt,
          jobType: normalizeJobType(job.type),
        })
      }
    } catch (e: any) { console.error(e.message) }
    return jobs
  }
}

export const wttj = new WTTJAdapter()
