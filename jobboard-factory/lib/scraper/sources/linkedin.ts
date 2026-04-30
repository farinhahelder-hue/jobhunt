import { ScrapedJob, ScrapeParams } from '../../types'
import { BaseAdapter } from '../base/BaseAdapter'
import { hashUrl, normalizeJobType } from '../utils'

export class LinkedInAdapter extends BaseAdapter {
  name = 'linkedin'
  
  async scrape(params: ScrapeParams): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = []
    const query = encodeURIComponent(params.keywords || 'dev')
    const location = encodeURIComponent(params.location || 'France')
    
    for (let page = 0; page < (params.pages || 1); page++) {
      const start = page * 25
      const url = `https://fr.linkedin.com/jobs/search/?keywords=${query}&location=${location}&start=${start}`
      
      try {
        await this.page.goto(url, { waitUntil: 'networkidle' })
        await this.page.waitForTimeout(2000)
        
        const elements = await this.page.$$('.job-card-container')
        
        for (const el of elements) {
          const title = await el.$eval('.job-card-list__title', (e: any) => e.innerText).catch(() => null)
          const company = await el.$eval('.job-card-container__company-name', (e: any) => e.innerText).catch(() => '')
          const locationText = await el.$eval('.job-card-container__metadata-item', (e: any) => e.innerText).catch(() => '')
          
          if (title) {
            jobs.push({
              id: hashUrl(''),
              title: title.trim(),
              company,
              location: locationText,
              source: 'linkedin',
              url: '',
            })
          }
        }
      } catch (e: any) { console.error(e.message) }
    }
    return jobs
  }
}

export const linkedin = new LinkedInAdapter()
