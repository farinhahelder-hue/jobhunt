"""
Monster France Job Scraper
Monster France uses heavy JS rendering, so we use Playwright.
Fallback: static HTML scraping if the API path is available.
"""

import re
import json
import time
import requests
from bs4 import BeautifulSoup
from typing import Optional
from datetime import datetime, timedelta

BASE_URL = "https://www.monster.fr"
SEARCH_URL = "https://www.monster.fr/offres-d-emploi/recherche"
API_URL = "https://www.monster.fr/api/jwt/jobs/search"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9",
    "Accept": "application/json, text/html, */*",
    "Referer": f"https://www.monster.fr/",
}


def _parse_relative_date(rel: str) -> Optional[str]:
    now = datetime.utcnow()
    rel = rel.lower().strip()
    if "jour" in rel or "day" in rel:
        n = int(re.search(r'\d+', rel).group()) if re.search(r'\d+', rel) else 1
        return (now - timedelta(days=n)).strftime("%Y-%m-%d")
    if "heure" in rel or "hour" in rel:
        return now.strftime("%Y-%m-%d")
    if "semaine" in rel or "week" in rel:
        n = int(re.search(r'\d+', rel).group()) if re.search(r'\d+', rel) else 1
        return (now - timedelta(weeks=n)).strftime("%Y-%m-%d")
    return now.strftime("%Y-%m-%d")


def _parse_job_json(data: dict) -> dict:
    location = data.get("location") or data.get("city") or None
    if isinstance(location, dict):
        location = location.get("city") or location.get("label")
    return {
        "title": data.get("title") or data.get("jobTitle"),
        "company": data.get("company") or data.get("recruiter", {}).get("name"),
        "location": location,
        "contract_type": data.get("contractType") or data.get("employmentType"),
        "url": data.get("url") or data.get("applyUrl"),
        "posted_at": (data.get("date") or data.get("publicationDate") or "")[:10] or None,
        "remote": None,
        "description_snippet": (data.get("description") or "")[:300].strip() or None,
        "source": "monster",
    }


def _search_via_api(query: str, location: str, max_results: int) -> list[dict]:
    session = requests.Session()
    session.headers.update(HEADERS)
    session.get(BASE_URL, timeout=15)

    params = {"q": query, "loc": location, "page": 1, "limit": min(50, max_results)}
    resp = session.get(API_URL, params=params, timeout=15)
    if resp.status_code != 200:
        return []

    data = resp.json()
    jobs_raw = data.get("jobs") or data.get("results") or (data if isinstance(data, list) else [])
    return [_parse_job_json(j) for j in jobs_raw[:max_results]]


def _search_via_browser(query: str, location: str, max_results: int) -> list[dict]:
    from playwright.sync_api import sync_playwright

    jobs = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        url = f"{SEARCH_URL}?q={query}&loc={location}"
        page.goto(url, wait_until="networkidle", timeout=30000)
        time.sleep(2)

        next_data = page.evaluate("() => { var el = document.getElementById('__NEXT_DATA__'); return el ? el.textContent : null; }")
        if next_data:
            try:
                data = json.loads(next_data)
                jobs_raw = (data.get("props", {}).get("pageProps", {}).get("jobs", [])
                            or data.get("props", {}).get("pageProps", {}).get("results", []))
                jobs = [_parse_job_json(j) for j in jobs_raw[:max_results]]
            except Exception:
                pass

        if not jobs:
            soup = BeautifulSoup(page.content(), "lxml")
            cards = soup.select("[data-testid*'jub'], .job-card, .search-result-card")
            for card in cards[:max_results]:
                title_el = card.select_one("h2, h3, [data-testid='title']")
                company_el = card.select_one("[data-testid='company'], .company-name")
                link = card.select_one("a[href]")
                loc_el = card.select_one("[data-testid='location'], .location")
                jobs.append({
                    "title": title_el.get_text(strip=True) if title_el else None,
                    "company": company_el.get_text(strip=True) if company_el else None,
                    "location": loc_el.get_text(strip=True) if loc_el else None,
                    "contract_type": None,
                    "url": BASE_URL + link["href"] if link and link["href"].startswith("/") else (link["href"] if link else None),
                    "posted_at": None, "remote": None, "description_snippet": None, "source": "monster",
                })

        browser.close()
    return jobs


def search(
    query: str = "développeur",
    location: str = "France",
    max_results: int = 30,
) -> list[dict]:
    """
    Search Monster France jobs.

    Args:
        query: Job keywords
        location: City or region
        max_results: Max jobs to return

    Returns:
        List of job dicts
    """
    try:
        results = _search_via_api(query, location, max_results)
        if results:
            return results
        print("[Monster] API failed, falling back to browser")
    except Exception as e:
        print(f"[Monster] API error: {e} - falling back to browser")
    return _search_via_browser(query, location, max_results)


if __name__ == "__main__":
    results = search(query="développeur", location="Paris", max_results=10)
    print(f"Found {len(results)} jobs")
    print(json.dumps(results[:2], indent=2, ensure_ascii=False))
