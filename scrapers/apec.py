"""
APEC (Association Pour l'Emploi des Cadres) Scraper
Scrapes executive/cadre job listings from apec.fr.
Uses Playwright browser automation due to heavy JS rendering.
"""

import re
import json
import time
from typing import Optional
from datetime import datetime

BASE_URL = "https://www.apec.fr"
SEARCH_URL = "https://www.apec.fr/candidat/recherche-emploi/resultat-recherche.html"
API_SEARCH_URL = "https://www.apec.fr/prive/rest/service/offresemploi/offres"

CONTRACT_MAP = {
    "cdi": 1,
    "cdd": 2,
    "international": 3,
    "stage": 4,
    "alternance": 5,
    "independant": 6,
}


def _format_date(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    try:
        if "T" in raw:
            return raw[:10]
        dt = datetime.strptime(raw[:10], "%d/%m/%Y")
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return raw[:10]


def _parse_hit(hit: dict) -> dict:
    loc_parts = filter(None, [hit.get("ville"), hit.get("departement"), hit.get("region")])
    location = ", ".join(loc_parts) or None
    return {
        "title": hit.get("intitule") or hit.get("titre"),
        "company": hit.get("nomEntreprise") or hit.get("societe"),
        "location": location,
        "contract_type": hit.get("typeContrat") or hit.get("natureContrat"),
        "url": f"{BASE_URL}/candidat/recherche-emploi/offres-emploi/offre-{hit.get('numeroAncien')�.html" if hit.get("numeroAncien") else None,
        "posted_at": _format_date(hit.get("dateCreation") or hit.get("dateDiffusion")),
        "remote": "partial" if hit.get("teletravail") else None,
        "description_snippet": (hit.get("resume") or "")[:300].strip() or None,
        "source": "apec",
        "job_id": hit.get("numeroAncien"),
    }


def _search_via_api(
    query: str,
    max_results: int = 30,
    contract_type: Optional[str] = None,
) -> list[dict]:
    """Attempt to search via APEC JSON API (may require session cookies)."""
    import requests

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.apec.fr/",
    })

    session.get(BASE_URL, timeout=15)

    page_size = min(20, max_results)
    jobs = []
    page = 0

    while len(jobs) < max_results:
        params = {
            "motsCles": query,
            "indexDebut": page * page_size,
            "nbreResultats": page_size,
            "triAnnonce": 1,
        }
        if contract_type and contract_type.lower() in CONTRACT_MAP:
            params["typesContrat"] = CONTRACT_MAP[contract_type.lower()]

        resp = session.get(API_SEARCH_URL, params=params, timeout=15)
        if resp.status_code != 200:
            print(f"[APEC] API returned {resp.status_code} - may require authentication")
            break

        data = resp.json()
        hits = data.get("listOffres", []) or data.get("resultats", []) or (data if isinstance(data, list) else [])
        if not hits:
            break

        for hit in hits:
            jobs.append(_parse_hit(hit))
            if len(jobs) >= max_results:
                break
        page += 1

    return jobs


def search(
    query: str = "directeur",
    max_results: int = 30,
    contract_type: Optional[str] = None,
    use_browser: bool = False,
) -> list[dict]:
    """
    Search APEC jobs (executive/cadre roles).

    Args:
        query: Keywords
 or title (e.g. 'directeur', 'ingenier')
        max_results: Max results
        contract_type: 'cdi'|'cdd'|'stage'|'alternance'|'independant'
        use_browser: Force Playwright browser (slower, but more reliable)

    Returns:
        List of job dicts
    """
    if not use_browser:
        try:
            results = _search_via_api(query, max_results=max_results, contract_type=contract_type)
            if results:
                return results
            print("[APEC] API failed, falling back to browser")
        except Exception as e:
            print(f"[APEC] API error: {e} - falling back to browser")

    return _search_via_browser(query, max_results=max_results, contract_type=contract_type)


def _search_via_browser(
    query: str,
    max_results: int = 30,
    contract_type: Optional[str] = None,
) -> list[dict]:
    """Scrape APEC via Playwright browser."""
    from playwright.sync_api import sync_playwright

    jobs = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(SEARCH_URL, wait_until="networkidle", timeout=30000)

        search_input = page.locator("input[placeholder*='Métier'], input[name='motsCles'], .search-input")
        if search_input.count():
            search_input.first().fill(query)
            page.keyboard.press("Enter")
            page.wait_for_load_state("networkidle", timeout=20000)

        for _ in range(3):
            raw_text = page.evaluate("() => { var a = window.resultsState || window.__STATE__; return a ? JSON.stringify(a) : null; }")
            if raw_text:
                try:
                    state = json.loads(raw_text)
                    hits = state.get("listOffres", []) or state.get("resultats", [])
                    for hit in hits[:max_results]:
                        jobs.append(_parse_hit(hit))
                    if jobs:
                        break
                except Exception:
                    pass
            time.sleep(2)

        if not jobs:
            cards = page.locator(".card-offre, .offre-card, [class*='offre']").all()
            for card in cards[:max_results]:
                try:
                    title_el = card.locator("h2, h3, .title").first()
                    company_el = card.locator(".company, .societe, .entreprise").first()
                    link_el = card.locator("a").first()
                    jobs.append({
                        "title": title_el.inner_text() if title_el.count() else None,
                        "company": company_el.inner_text() if company_el.count() else None,
                        "location": None, "contract_type": None,
                        "url": BASE_URL + link_el.get_attribute("href") if link_el.count() and link_el.get_attribute("href") else None,
                        "posted_at": None, "remote": None, "description_snippet": None, "source": "apec",
                    })
                except Exception:
                    continue

        browser.close()

    return jobs


if __name__ == "__main__":
    results = search(query="ingénieur informatique", max_results=10)
    print(f"Found {len(results)} jobs")
    print(json.dumps(results[:2], indent=2, ensure_ascii=False))
