"""
Indeed France Job Scraper
Indeed aggressively blocks bots. Uses Playwright with stealth mode.
Requires: playwright, playwright-stealth (optional)

NOTE: Indeed is best scraped with residential proxies or on a real browser.
Free scraping may return CAPTCHAs in some environments.
"""

import re
import json
import time
import requests
from bs4 import BeautifulSoup
from typing import Optional
from datetime import datetime, timedelta

BASE_URL = "https://fr.indeed.com"
SEARCH_URL = "https://fr.indeed.com/emplois"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9",
    "Accept": "text/html,application/xhtml+xml",
}


def _parse_relative_date(rel: str) -> Optional[str]:
    now = datetime.utcnow()
    rel = rel.lower().strip()
    if "heure" in rel or "hour" in rel:
        return now.strftime("%Y-%m-%d")
    if "jour" in rel or "day" in rel:
        n = int(re.search(r'\d+', rel).group()) if re.search(r'\d+', rel) else 1
        return (now - timedelta(days=n)).strftime("%Y-%m-%d")
    if "semaine" in rel or "week" in rel:
        n = int(re.search(r'\d+', rel).group()) if re.search(r'\d+', rel) else 1
        return (now - timedelta(weeks=n)).strftime("%Y-%m-%d")
    return now.strftime("%Y-%m-%d")


def _parse_card(soup_card) -> dict:
    title_el = soup_card.select_one("[data-jk-comp] h3, [class*='jobTitle'], h3, h2")
    company_el = soup_card.select_one("[class*='companyName'], [data-testid='company-name']")
    location_el = soup_card.select_one("[data-testid='text-location'], [class*='companyLocation']")
    date_el = soup_card.select_one("[data-testid='myjobscote-date'], span[class*='date']")
    link_el = soup_card.select_one("h[data-jk], h[data-value]")
    jk = soup_card.get("data-jk") or soup_card.get("data-value")
    url = f"{BASE_URL}/viewjob?jk={jk}" if jk else None

    date_str = date_el.get_text(strip=True) if date_el else ""
    posted_at = _parse_relative_date(date_str) if date_str else None

    return {
        "title": title_el.get_text(strip=True) if title_el else None,
        "company": company_el.get_text(strip=True) if company_el else None,
        "location": location_el.get_text(strip=True) if location_el else None,
        "contract_type": None,
        "url": url,
        "posted_at": posted_at,
        "remote": None,
        "description_snippet": None,
        "source": "indeed",
    }


def _search_via_static(query: str, location: str, max_results: int) -> list[dict]:
    session = requests.Session()
    session.headers.update(HEADERS)
    jobs = []
    start = 0

    while len(jobs) < max_results:
        params = {"q": query, "l": location, "start": start}
        resp = session.get(SEARCH_URL, params=params, timeout=15)
        if resp.status_code != 200:
            break

        soup = BeautifulSoup(resp.text, "lxml")
        cards = soup.select("[data-jk], [data-value]")

        if not cards:
            break

        for card in cards:
            job = _parse_card(card)
            if job["title"]:
                jobs.append(job)
            if len(jobs) >= max_results:
                break

        start += 10
        time.sleep(2)

    return jobs


def _search_via_browser(query: str, location: str, max_results: int) -> list[dict]:
    from playwright.sync_api import sync_playwright

    jobs = []
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            user_agent=HEADERS["User-Agent"],
            locale="fr-FR",
            timezone_id="Europe/Paris",
        )
        page = context.new_page()
        page.add_init_script("""Object.defineProperty(navigator, 'webdriver', {get: () => undefined});""")

        url = f"{SEARCH_URL}?q={query}&l={location}"
        page.goto(url, wait_until="networkidle", timeout=30000)
        time.sleep(2)

        soup = BeautifulSoup(page.content(), "lxml")
        cards = soup.select("[data-jk], [data-value]")
        for card in cards[:max_results]:
            job = _parse_card(card)
            if job["title"]:
                jobs.append(job)

        browser.close()
    return jobs


def search(
    query: str = "développeur",
    location: str = "France",
    max_results: int = 30,
    force_browser: bool = False,
) -> list[dict]:
    """
    Search Indeed France jobs.

    Args:
        query: Job keywords
        location: Location
        max_results: Max jobs to return
        force_browser: Skip static attempt and use Playwright directly

    Returns:
        List of job dicts

    Note: Indeed blocks most automated requests - results may be empty without
    residential proxies or a real browser session.
    """
    if not force_browser:
        try:
            results = _search_via_static(query, location, max_results)
            if results:
                return results
            print("[Indeed] Static failed, falling back to browser")
        except Exception as e:
            print(f"[Indeed] Static error: {e} - falling back to browser")
    return _search_via_browser(query, location, max_results)


if __name__ == "__main__":
    results = search(query="développeur", location="Paris", max_results=10)
    print(f"Found {len(results)} jobs")
    print(json.dumps(results[:2], indent=2, ensure_ascii=False))
