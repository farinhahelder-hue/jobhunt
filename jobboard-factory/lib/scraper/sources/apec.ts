import { ScrapedJob, ScrapeParams } from '../../types'
import { BaseAdapter } from '../base/BaseAdapter'
import { hashUrl, normalizeJobType, stripHtml, detectRemote } from '../utils'

export class APECAdapter extends BaseAdapter {
  name = 'apec'
  baseUrl = 'https://api.apec.fr/api/cartographiesproformations'
  
  async scrape(params: ScrapeParams): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = []
    const query = encodeURIComponent(params.keywords || 'developpeur')
    
    for (let page = 0; page < (params.pages || 1); page++) {
      try {
        const url = `${this.baseUrl}/offres?motsCles=${query}&page=${page}&nbFiltres=20`
        const res = await this.fetch(url)
        const data = await res.json()
        
        for (const item of data.items || data.offres || []) {
          jobs.push({
            id: hashUrl(item.lienVersDetail || item.id),
            title: item.intitule || item.titre,
            company: item.entreprise?.nom || item.societe,
            location: item.lieuTravail?.[0]?.libelle || '',
            url: item.lienVersDetail || '',
            description: stripHtml(item.description || item.resume),
            source: 'apec',
            postedAt: item.publication,
            jobType: normalizeJobType(item.typeContrat),
            remote: detectRemote(item.description),
          })
        }
      } catch (e: any) { console.error(e.message) }
    }
    return jobs
  }
}

export const apec = new APECAdapter()
