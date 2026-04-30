import { ScrapedJob, ScrapeParams } from '../../types'
import { BaseAdapter } from '../base/BaseAdapter'
import { hashUrl, normalizeJobType, getUserAgent } from '../utils'

export class HelloWorkAdapter extends BaseAdapter {
  name = 'hellowork'
  
  async scrape(params: ScrapeParams): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = []
    const query = encodeURIComponent(params.keywords || 'developpeur')
    
    const headers = { 'User-Agent': getUserAgent() }
    
    for (let page = 0; page < (params.pages || 1); page++) {
      try {
        const url = `https://api.hellowork.com/api/v1/offres?page=${page}&keywords=${query}`
        const res = await this.fetch(url, { headers })
        const data = await res.json()
        
        for (const item of data.results || []) {
          jobs.push({
            id: hashUrl(item.id),
            title: item.title,
            company: item.company?.name,
            location: item.location?.city,
            url: item.url,
            description: item.description?.substring(0, 1000),
            source: 'hellowork',
            postedAt: item.publishedAt,
            jobType: normalizeJobType(item.contractType),
          })
        }
      } catch (e: any) { console.error(e.message) }
    }
    return jobs
  }
}

export const hellowork = new HelloWorkAdapter()
