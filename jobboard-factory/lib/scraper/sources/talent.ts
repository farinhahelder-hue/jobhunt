import { ScrapedJob, ScrapeParams } from '../../types'
import { BaseAdapter } from '../base/BaseAdapter'
import { hashUrl, normalizeJobType } from '../utils'

export class TalentAdapter extends BaseAdapter {
  name = 'talent'
  
  async scrape(params: ScrapeParams): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = []
    const query = encodeURIComponent(params.keywords || 'developpeur')
    const location = encodeURIComponent(params.location || 'France')
    
    for (let page = 0; page < (params.pages || 1); page++) {
      try {
        const url = `https://www.talent.com/ jobs?keyword=${query}&location=${location}&page=${page}`
        const html = await this.fetchHtml(url)
        
        const matches = html.matchAll(/data-job-id="([^"]*)"[^>]*>.*?job-title[^>]*>([^<]*)<.*?company[^>]*>([^<]*)<g)
        
        for (const m of matches) {
          jobs.push({
            id: hashUrl(m[1]),
            title: m[2].trim(),
            company: m[3].trim(),
            url: `https://www.talent.com/job/${m[1]}`,
            source: 'talent',
          })
        }
      } catch (e: any) { console.error(e.message) }
    }
    return jobs
  }
}

export const talent = new TalentAdapter()
