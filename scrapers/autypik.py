"""
Autypik Scraper
Neuro-inclusive job platform in France.

NOTE: Check current URL - may require Playwright for dynamic content.
"""

import re
import json
import time
import requests
from bs4 import BeautifulSoup
from typing import Optional, List, Dict
from datetime import datetime, timedelta

# Try to find current Autypik URL
BASE_URL = "https://autypik.fr"
SEARCH_URL = "https://autypik.fr/offres-emploi"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/json",
}


def _parse_date(rel: str) -> Optional[str]:
    """Parse relative date to ISO format."""
    now = datetime.utcnow()
    rel = rel.lower().strip() if rel else ""
    
    if not rel:
        return now.strftime("%Y-%m-%d")
    
    if "heure" in rel or "hour" in rel:
        return now.strftime("%Y-%m-%d")
    if "jour" in rel or "day" in rel:
        n = int(re.search(r'\d+', rel).group()) if re.search(r'\d+', rel) else 1
        return (now - timedelta(days=n)).strftime("%Y-%m-%d")
    if "semaine" in rel or "week" in rel:
        n = int(re.search(r'\d+', rel).group()) if re.search(r'\d+', rel) else 1
        return (now - timedelta(weeks=n)).strftime("%Y-%m-%d")
    if "mois" in rel or "month" in rel:
        n = int(re.search(r'\d+', rel).group()) if re.search(r'\d+', rel) else 1
        return (now - timedelta(days=30*n)).strftime("%Y-%m-%d")
    return now.strftime("%Y-%m-%d")


def _extract_job_card(card) -> Optional[Dict]:
    """Extract job data from a card element."""
    try:
        # Try multiple selectors for title
        title_el = (
            card.select_one("h2, h3, [class*='title'] a, a[class*='title'], .job-title a")
            or card.select_one(".title a")
        )
        
        # Company
        company_el = (
            card.select_one("[class*='company'], [class*='employeur'], .company-name")
        )
        
        # Location
        location_el = (
            card.select_one("[class*='location'], [class*='lieu'], .location, [class*='ville']")
        )
        
        # Description/Snippet
        desc_el = (
            card.select_one("[class*='description'], [class*='excerpt'], .desc, p")
        )
        
        # Link
        link_el = card.select_one("a")
        link = link_el.get("href") if link_el else None
        if link and not link.startswith("http"):
            link = BASE_URL + link if link.startswith("/") else f"{BASE_URL}/{link}"
        
        title = title_el.get_text(strip=True) if title_el else ""
        company = company_el.get_text(strip=True) if company_el else ""
        location = location_el.get_text(strip=True) if location_el else ""
        
        if not title:
            return None
            
        return {
            "title": title,
            "company": company,
            "location": location,
            "url": link,
            "description": desc_el.get_text(strip=True)[:500] if desc_el else "",
            "source": "Autypik",
            "scraped_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return None


def scrape_jobs(keywords: str = "", location: str = "", limit: int = 30) -> List[Dict]:
    """Scrape jobs from Autypik."""
    jobs = []
    
    try:
        # Build search URL
        params = {}
        if keywords:
            params["q"] = keywords
        if location:
            params["l"] = location
        params["limit"] = limit
        
        response = requests.get(
            SEARCH_URL,
            params=params,
            headers=HEADERS,
            timeout=15
        )
        
        if response.status_code != 200:
            return jobs
            
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Find job cards - try multiple selectors
        cards = (
            soup.select("[class*='offre'], [class*='job'], article, .result, .job-card")
            or soup.select(".jobs-list > div, .offers-list > div")
            or soup.select("li a[href*='offre'], li a[href*='job']")
        )
        
        for card in cards[:limit]:
            job = _extract_job_card(card)
            if job:
                jobs.append(job)
        
        # If no cards found, try to extract from links
        if not jobs:
            links = soup.select("a[href*='/offres/'], a[href*='/emploi/']")
            for link in links[:limit]:
                href = link.get("href", "")
                if href and ("offre" in href or "emploi" in href):
                    full_url = href if href.startswith("http") else BASE_URL + href
                    title = link.get_text(strip=True)
                    if title and len(title) > 5:
                        jobs.append({
                            "title": title,
                            "company": "",
                            "location": "",
                            "url": full_url,
                            "description": "",
                            "source": "Autypik",
                            "scraped_at": datetime.utcnow().isoformat()
                        })
        
    except Exception as e:
        print(f"Autypik scraper error: {e}")
    
    return jobs


if __name__ == "__main__":
    jobs = scrape_jobs("développeur", "france", 10)
    print(f"Found {len(jobs)} jobs from Autypik")
    for j in jobs[:3]:
        print(f"  - {j['title']} @ {j['company']}")