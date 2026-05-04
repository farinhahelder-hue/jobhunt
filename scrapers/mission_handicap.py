"""
Mission Handicap Scraper
Portal for companies with active inclusion policies.
"""

import re
import requests
from bs4 import BeautifulSoup
from typing import Optional, List, Dict
from datetime import datetime, timedelta

BASE_URL = "https://www.mission-handicap.com"
SEARCH_URL = "https://www.mission-handicap.com/accès-simplier/search"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9",
    "Accept": "text/html,application/xhtml+xml",
}


def _extract_job_card(card) -> Optional[Dict]:
    """Extract job from card element."""
    try:
        title_el = card.select_one("h3, h2, [class*='title'], .job-title, a[href*='offre']")
        company_el = card.select_one("[class*='company'], [class*='entreprise'], .employer")
        location_el = card.select_one("[class*='location'], [class*='lieu'], .city")
        desc_el = card.select_one("[class*='desc'], [class*='description']")
        link_el = card.select_one("a[href*='offre'], a[href*='job']")
        
        title = title_el.get_text(strip=True) if title_el else ""
        link = link_el.get("href") if link_el else ""
        
        if link and not link.startswith("http"):
            link = BASE_URL + link if link.startswith("/") else f"{BASE_URL}/{link}"
        
        if not title:
            return None
            
        return {
            "title": title,
            "company": company_el.get_text(strip=True) if company_el else "",
            "location": location_el.get_text(strip=True) if location_el else "",
            "url": link,
            "description": desc_el.get_text(strip=True)[:500] if desc_el else "",
            "source": "Mission Handicap",
            "scraped_at": datetime.utcnow().isoformat()
        }
    except:
        return None


def scrape_jobs(keywords: str = "", location: str = "", limit: int = 30) -> List[Dict]:
    """Scrape jobs from Mission Handicap."""
    jobs = []
    
    try:
        params = {}
        if keywords:
            params["keywords"] = keywords
        if location:
            params["location"] = location
        
        response = requests.get(SEARCH_URL, params=params, headers=HEADERS, timeout=15)
        
        if response.status_code != 200:
            return jobs
            
        soup = BeautifulSoup(response.text, "html.parser")
        cards = soup.select("[class*='result'], [class*='offre'], article, .job-card, li")
        
        for card in cards[:limit]:
            job = _extract_job_card(card)
            if job:
                jobs.append(job)
                
        if not jobs:
            links = soup.select("a[href*='/offre/']")
            for link in links[:limit]:
                title = link.get_text(strip=True)
                href = link.get("href", "")
                if title and len(title) > 5 and href:
                    jobs.append({
                        "title": title,
                        "company": "",
                        "location": "",
                        "url": BASE_URL + href if href.startswith("/") else href,
                        "description": "",
                        "source": "Mission Handicap",
                        "scraped_at": datetime.utcnow().isoformat()
                    })
                    
    except Exception as e:
        print(f"Mission Handicap error: {e}")
    
    return jobs


if __name__ == "__main__":
    jobs = scrape_jobs("développeur", "france", 10)
    print(f"Found {len(jobs)} jobs from Mission Handicap")