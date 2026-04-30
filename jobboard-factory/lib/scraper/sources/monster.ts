import { ScrapedJob, ScrapeParams } from '../../types'
import { BaseAdapter } from '../base/BaseAdapter'
import { hashUrl, normalizeJobType } from '../utils'

export class MonsterAdapter extends BaseAdapter {
  name = 'monster'
  
  async scrape(params: ScrapeParams): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = []
    const query = encodeURIComponent(params.keywords || 'developer')
    const location = encodeURIComponent(params.location || 'France')
    
    for (let page = 0; page < (params.pages || 1); page++) {
      try {
        const url = `https://www.monster.fr/emploi/recherche? keywords=${query}&location=${location}&page=${page}`
        const html = await this.fetchHtml(url)
        
        const matches = html.matchAll(/class="job-card[^>]*href="([^"]*)"[^>]*>([^<]*)<.*?company-brand[^>]*>([^<]*)<g)
        
        for (const m of matches) {
          jobs.push({
            id: hashUrl(m[1]),
            title: m[2].trim(),
            company: m[3].trim(),
            url: m[1],
            source: 'monster',
          })
        }
      } catch (e: any) { console.error(e.message) }
    }
    return jobs
  }
}

export const monster = new MonsterAdapter()
