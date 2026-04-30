import { ScrapedJob, ScrapeParams } from '../../types'
import { BaseAdapter } from '../base/BaseAdapter'
import { hashUrl, normalizeJobType, parseLocation, detectRemote } from '../utils'

export class FranceTravailAdapter extends BaseAdapter {
  name = 'france_travail'
  baseUrl = 'https://api.francetravail.io/partenanies/offres/search'
  
  async scrape(params: ScrapeParams): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = []
    const query = encodeURIComponent(params.keywords || 'developpeur')
    
    const headers = {
      'Authorization': `Bearer ${process.env.FRANCE_TRAVAIL_TOKEN}`,
      'Accept': 'application/json',
    }
    
    for (let page = 0; page < (params.pages || 1); page++) {
      try {
        const url = `${this.baseUrl}?motsCles=${query}&page=${page}&perPage=20`
        const res = await this.fetch(url, { headers })
        const data = await res.json()
        
        for (const item of data.resultats || []) {
          const parsed = parseLocation(item.lieuTravail?.[0]?.libVille || '')
          jobs.push({
            id: hashUrl(item.id),
            title: item.intitule || '',
            company: item.entreprise?.nom || '',
            location: parsed.city,
            postalCode: parsed.postalCode,
            url: item.OrigineUrl || '',
            description: item.description?.substring(0, 1500),
            source: 'france_travail',
            postedAt: item.dateCreation,
            jobType: normalizeJobType(item.typeContrat),
            salaryRange: item.salaire?.libelle,
            remote: detectRemote(item.description),
          })
        }
      } catch (e: any) { console.error(e.message) }
    }
    return jobs
  }
}

export const franceTravail = new FranceTravailAdapter()
