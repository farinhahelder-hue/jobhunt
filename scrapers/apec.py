"""
APEC.fr Scraper — French job board for executive/cadre roles.
Uses Playwright for stealth scraping.
"""

import json
import re
from datetime import datetime, timedelta
from typing import Optional

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

BASE_URL = "https://www.apec.fr"


def search(
    query: str = "developpeur",
    location: str = "France",
    max_results: int = 20,
    contract_type: Optional[str] = None,
) -> list[dict]:
    """
    Scrape APEC for jobs matching query.
    """
    if not PLAYWRIGHT_AVAILABLE:
        print("[apec] Playwright not available, skipping")
        return []

    print(f"[apec] Searching for '{query}' in {location}...")

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )

            # APEC search URL
            search_url = f"{BASE_URL}/candidat/recherche-emploi.html?motsCles={query.replace(' ', '+')}"
            if location:
                search_url += f"&lieux={location.replace(' ', '+')}"
            if contract_type:
                search_url += f"&typeContrat={contract_type}"

            page.goto(search_url, wait_until="networkidle", timeout=15000)

            # Wait for results
            page.wait_for_selector(".resultat", timeout=10000)

            results = []
            hits = page.query_selector_all(".resultat")[:max_results]

            for hit in hits:
                try:
                    job = _parse_job(hit)
                    if job:
                        results.append(job)
                except Exception as e:
                    print(f"[apec] Error parsing hit: {e}")

            browser.close()
            print(f"[apec] Found {len(results)} jobs")
            return results

    except Exception as e:
        print(f"[apec] Search failed: {e}")
        return []


def _parse_job(hit) -> Optional[dict]:
    """Parse a job card element."""
    try:
        title_elem = (
            hit.query_selector("h2 a") or
            hit.query_selector(".title a") or
            hit.query_selector("a[data-testid='title']")
        )
        if not title_elem:
            return None

        title = title_elem.inner_text().strip()
        url = title_elem.get_attribute("href")
        if url and not url.startswith("http"):
            url = BASE_URL + url

        company_elem = (
            hit.query_selector(".company-name") or
            hit.query_selector("[class*='company']")
        )
        company = company_elem.inner_text().strip() if company_elem else "N/A"

        loc_elem = hit.query_selector("[class*='location'], .location")
        location = loc_elem.inner_text().strip() if loc_elem else None

        contract_elem = hit.query_selector("[class*='contract'], .contract-type")
        contract_type = contract_elem.inner_text().strip() if contract_elem else None

        return {
            "title": title,
            "company": company,
            "location": location,
            "contract_type": contract_type,
            "url": url,
            "posted_at": None,
            "description_snippet": None,
            "source": "apec",
            "job_id": url.split("-")[-1].replace(".html", "") if url else None,
        }
    except Exception as e:
        return None
