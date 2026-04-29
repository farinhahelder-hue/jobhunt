"""
LinkedIn France Job Scraper
Static HTML scraping — no auth required.
Returns up to ~25 jobs per page (LinkedIn paginates at 25).
"""

import re
import time
import requests
from bs4 import BeautifulSoup
from typing import Optional
from datetime import datetime, timedelta

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}

BASE_URL = "https://www.linkedin.com/jobs/search/"


def _parse_date(relative: str) -> Optional[str]:
    """Convert LinkedIn relative dates to ISO format approx."""
    now = datetime.utcnow()
    relative = relative.lower().strip()
    if "heure" in relative or "hour" in relative:
        n = int(re.search(r'\d+', relative).group()) if re.search(r'\d+', relative) else 1
        return (now - timedelta(hours=n)).strftime("%Y-%m-%d")
    if "jour" in relative or "day" in relative:
        n = int(re.search(r'\d+', relative).group()) if re.search(r'\d+', relative) else 1
        return (now - timedelta(days=n)).strftime("%Y-%m-%d")
    if "semaine" in relative or "week" in relative:
        n = int(re.search(r'\d+', relative).group()) if re.search(r'\d+', relative) else 1
        return (now - timedelta(weeks=n)).strftime("%Y-%m-%d")
    if "mois" in relative or "month" in relative:
        n = int(re.search(r'\d+', relative).group()) if re.search(r'\d+', relative) else 1
        return (now - timedelta(days=n * 30)).strftime("%Y-%m-%d")
    return now.strftime("%Y-%m-%d")


def _parse_card(card) -> dict:
    title_el = card.select_one("h3.base-search-card__title, h3")
    company_el = card.select_one("h4.base-search-card__subtitle, h4")
    location_el = card.select_one(".job-search-card__location, .base-search-card__metadata span")
    date_el = card.select_one("time")
    link_el = card.select_one("a.base-card__full-link, a[href*='/jobs/view/']")

    title = title_el.get_text(strip=True) if title_el else None
    company = company_el.get_text(strip=True) if company_el else None
    location = location_el.get_text(strip=True) if location_el else None
    posted_at = _parse_date(date_el.get_text(strip=True)) if date_el else None
    url = link_el["href"].split("?")[0] if link_el and link_el.get("href") else None

    return {
        "title": title,
        "company": company,
        "location": location,
        "contract_type": None,
        "url": url,
        "posted_at": posted_at,
        "remote": None,
        "description_snippet": None,
        "source": "linkedin",
    }


def search(
    query: str = "développeur",
    location: str = "France",
    max_results: int = 50,
    remote_only: bool = False,
    contract_type: Optional[str] = None,
    sleep_seconds: float = 1.5,
) -> list[dict]:
    """
    Search LinkedIn jobs for France.

    Args:
        query: Job keywords (e.g. 'développeur', 'data scientist')
        location: Location string (default 'France')
        max_results: Max jobs to return
        remote_only: Filter remote jobs (f_WT=2)
        contract_type: 'full_time' (f_JT=F), 'part_time' (f_JT=P), 'contract' (f_JT=C)
        sleep_seconds: Delay between paginated requests

    Returns:
        List of job dicts
    """
    jobs = []
    start = 0
    contract_map = {"full_time": "F", "part_time": "P", "contract": "C", "internship": "I"}

    while len(jobs) < max_results:
        params = {
            "keywords": query,
            "location": location,
            "start": start,
            "sortBy": "DD",
        }
        if remote_only:
            params["f_WT"] = "2"
        if contract_type and contract_type in contract_map:
            params["f_JT"] = contract_map[contract_type]

        resp = requests.get(BASE_URL, params=params, headers=HEADERS, timeout=15)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")
        cards = soup.select("li.jobs-search__results-list > div, .base-card")

        if not cards:
            break

        for card in cards:
            job = _parse_card(card)
            if job["title"]:
                jobs.append(job)
            if len(jobs) >= max_results:
                break

        if len(cards) < 25:
            break

        start += 25
        time.sleep(sleep_seconds)

    return jobs[:max_results]


if __name__ == "__main__":
    import json
    results = search(query="développeur", location="France", max_results=25)
    print(f"Found {len(results)} jobs")
    print(json.dumps(results[:3], indent=2, ensure_ascii=False))
