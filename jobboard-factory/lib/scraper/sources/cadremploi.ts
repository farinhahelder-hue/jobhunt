import { ScrapedJob, ScrapeParams } from '../../types'
import { BaseAdapter } from '../base/BaseAdapter'
import { hashUrl, normalizeJobType, stripHtml, detectRemote } from '../utils'

export class CadremploiAdapter extends BaseAdapter {
  name = 'cadremploi'
  
  async scrape(params: ScrapeParams): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = []
    const query = encodeURIComponent(params.keywords || 'developpeur')
    
    for (let page = 0; page < (params.pages || 1); page++) {
      try {
        const url = `https://www.cadremploi.com/emploi/liste? keyword=${query}&page=${page}`
        const html = await this.fetchHtml(url)
        
        // Look for JSON-LD
        const jsonLd = html.match(/<script type="application/ld\+json">([^<]*)<\/script>/)
        if (jsonLd) {
          const data = JSON.parse(jsonLd[1])
          for (const item of data.itemListElement || []) {
            jobs.push({
              id: hashUrl(item.url),
              title: item.title,
              company: item.hiringOrganization?.name,
              location: item.jobLocation?.address?.addressLocality,
              url: item.url,
              description: stripHtml(item.description),
              source: 'cadremploi',
              postedAt: item.datePosted,
              jobType: normalizeJobType(item.employmentType),
            })
          }
        }
      } catch (e: any) { console.error(e.message) }
    }
    return jobs
  }
}

export const cadremploi = new CadremploiAdapter()
