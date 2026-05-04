"""
Auticonsult Scraper
Company exclusively recruiting autistic consultants.
"""

import requests
from bs4 import BeautifulSoup
from typing import List, Dict
from datetime import datetime

# Check current URL - may have changed
BASE_URL = "https://www.auticonsult.com"
SEARCH_URL = "https://www.auticonsult.com/nos-missions"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}


def _extract_job(card) -> Dict:
    """Extract mission/card data."""
    title_el = card.select_one("h3, h2, h4, [class*='title'], .mission-title")
    company_el = card.select_one("[class*='company'], [class*='client']")
    location_el = card.select_one("[class*='location'], [class*='lieu'], .ville")
    desc_el = card.select_one("[class*='desc'], [class*='description'], p")
    link_el = card.select_one("a[href*='mission'], a[href*='offre']")
    
    title = title_el.get_text(strip=True) if title_el else ""
    link = ""
    if link_el:
        link = link_el.get("href", "")
        if link and not link.startswith("http"):
            link = BASE_URL + link if link.startswith("/") else f"{BASE_URL}/{link}"
    
    if not title:
        return None
        
    return {
        "title": title,
        "company": company_el.get_text(strip=True) if company_el else "Auticonsult",
        "location": location_el.get_text(strip=True) if location_el else "",
        "url": link,
        "description": desc_el.get_text(strip=True)[:500] if desc_el else "",
        "source": "Auticonsult",
        "scraped_at": datetime.utcnow().isoformat()
    }


def scrape_jobs(keywords: str = "", location: str = "", limit: int = 30) -> List[Dict]:
    """Scrape missions from Auticonsult."""
    jobs = []
    
    try:
        params = {"q": keywords} if keywords else {}
        
        response = requests.get(SEARCH_URL, params=params, headers=HEADERS, timeout=15)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            cards = soup.select("article, [class*='mission'], [class*='offre'], li, .result")
            
            for card in cards[:limit]:
                job = _extract_job(card)
                if job:
                    jobs.append(job)
                    
    except Exception as e:
        print(f"Auticonsult error: {e}")
    
    return jobs


if __name__ == "__main__":
    jobs = scrape_jobs("développeur", "", 10)
    print(f"Found {len(jobs)} missions from Auticonsult")