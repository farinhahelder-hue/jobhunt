"""
Welcome to the Jungle (WTTJ) Scraper — Algolia-powered
Uses dynamic Algolia credentials fetched from the WTTJ homepage.
Requires: requests, playwright (for key extraction)
"""

import re
import json
import time
import requests
from urllib.parse import quote
from typing import Optional
from datetime import datetime

WTTJ_HOME = "https://www.welcometothejungle.com/fr"
ALGOLIA_INDEX = "wttj_jobs_production_fr"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Origin": "https://www.welcometothejungle.com",
    "Referer": "https://www.welcometothejungle.com/",
}

CONTRACT_MAP = {
    "full_time": "full_time",
    "cdi": "full_time",
    "part_time": "part_time",
    "internship": "internship",
    "stage": "internship",
    "apprenticeship": "apprenticeship",
    "alternance": "apprenticeship",
    "temporary": "temporary",
    "freelance": "freelance",
}

REMOTE_MAP = {
    "no": "no",
    "partial": "partial",
    "full": "full",
    "punctual": "punctual",
}


def _get_algolia_credentials() -> tuple[str, str]:
    """
    Fetch Algolia app ID and API key from WTTJ homepage.
    Keys rotate — always fetch fresh.
    Returns: (app_id, api_key)
    """
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(WTTJ_HOME, wait_until="domcontentloaded", timeout=20000)
            app_id = page.evaluate("() => window.env && window.env.ALGOLIA_APPLICATION_ID")
            api_key = page.evaluate("() => window.env && window.env.ALGOLIA_API_KEY_CLIENT")
            browser.close()
            if app_id and api_key:
                return app_id, api_key
    except Exception as e:
        print(f"[WTTJ] Playwright key extraction failed: {e}")

    resp = requests.get(WTTJ_HOME, headers={"User-Agent": HEADERS["User-Agent"]}, timeout=15)
    for pattern in [
        r'ALGOLIA_APPLICATION_ID["\'\:\s]+([A-Z0-9]{8,12})',
        r'algoliaAppId["\'\:\s]+([A-Z0-9]{8,12})',
    ]:
        m = re.search(pattern, resp.text)
        if m:
            app_id = m.group(1)
            break
    else:
        raise RuntimeError("[WTTJ] Could not extract Algolia app ID from WTTJ homepage")

    for pattern in [
        r'ALGOLIA_API_KEY_CLIENT["\'\:\s]+([a-f0-9]{32})',
        r'AlgoliaApiKey["\'\:\s]+([a-f0-9]{32})',
    ]:
        m = re.search(pattern, resp.text)
        if m:
            api_key = m.group(1)
            break
    else:
        raise RuntimeError("[WTTJ] Could not extract Algolia API key from WTTJ homepage")

    return app_id, api_key


def _build_filters(
    contract_type: Optional[str] = None,
    remote: Optional[str] = None,
    country_code: str = "FR",
    company_slug: Optional[str] = None,
) -> str:
    """Build Algolia filter string."""
    filters = [f"offices.country_code:{country_code}"]
    if contract_type:
        ct = CONTRACT_MAP.get(contract_type.lower(), contract_type)
        filters.append(f"contract_type:{ct}")
    if remote:
        rm = REMOTE_MAP.get(remote.lower(), remote)
        filters.append(f"remote:{rom}")
    if company_slug:
        filters.append(f"organization.slug:{company_slug}")
    return " AND ".join(filters)


def _hit_to_job(hit: dict) -> dict:
    org = hit.get("organization", {})
    offices = hit.get("offices", [{}])
    city = offices[0].get("city") if offices else None
    country = offices[0].get("country_code") if offices else None
    location = ", ".join(filter(None, [city, country]))

    slug = hit.get("slug", "")
    org_slug = org.get("slug", "")
    url = f"https://www.welcometothejungle.com/fr/companies/{org_slug}/jobs/{slug}" if org_slug and slug else None

    published_raw = hit.get("published_at")
    published_at = None
    if published_raw:
        try:
            published_at = datetime.fromisoformat(published_raw.replace("Z", "+00:00")).strftime("%Y-%m-%d")
        except Exception:
            published_at = published_raw[:10]

    return {
        "title": hit.get("name"),
        "company": org.get("name"),
        "location": location or None,
        "contract_type": hit.get("contract_type"),
        "url": url,
        "posted_at": published_at,
        "remote": hit.get("remote"),
        "description_snippet": None,
        "source": "welcometothejungle",
        "experience_level": hit.get("experience_level_minimum"),
        "profession": hit.get("profession", {}).get("name") if hit.get("profession") else None,
        "company_size": org.get("size"),
        "sectors": org.get("sectors_name", []),
    }


def search(
    query: str = "développeur",
    contract_type: Optional[str] = None,
    remote: Optional[str] = None,
    country_code: str = "FR",
    max_results: int = 60,
    app_id: Optional[str] = None,
    api_key: Optional[str] = None,
    sleep_seconds: float = 1.0,
) -> list[dict]:
    """
    Search Welcome to the Jungle jobs via Algolia.

    Args:
        query: Search keywords
        contract_type: 'full_time'|'internship'|'apprenticeship'|'temporary'|'freelance'
        remote: 'no'|'partial'|'full'|'punctual'
        country_code: Country filter (default 'FR')
        max_results: Max jobs (max 1000 per query due to Algolia limits)
        app_id: Algolia app ID (auto-fetched if not provided)
        api_key: Algolia API key (auto-fetched if not provided)

    Returns:
        List of job dicts
    """
    if not app_id or not api_key:
        app_id, api_key = _get_algolia_credentials()
        print(f"[WTTJ] Using Algolia app: {app_id}")

    endpoint = f"https://{app_id}-dsn.algolia.net/1/indexes/*/queries"
    hits_per_page = min(60, max_results)
    filters = _build_filters(contract_type=contract_type, remote=remote, country_code=country_code)

    jobs = []
    page = 0

    while len(jobs) < max_results:
        body = {
            "requests": [{
                "indexName": ALGOLIA_INDEX,
                "params": f"query={quote(query)}&histsPerPage={hits_per_page}&page={page}&filters={quote(filters)}",
            }]
        }
        resp = requests.post(
            endpoint,
            headers={**HEADERS, "X-Algolia-Application-Id": app_id, "X-Algolia-API-Key": api_key},
            json=body,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [{}])[0]
        hits = results.get("hits", [])
        nb_pages = results.get("nbPages", 1)

        for hit in hits:
            jobs.append(_hit_to_job(hit))
            if len(jobs) >= max_results:
                break

        if page >= nb_pages - 1 or not hits:
            break

        page += 1
        time.sleep(sleep_seconds)

    return jobs[:max_results]


if __name__ == "__main__":
    results = search(query="développeur", contract_type="full_time", max_results=20)
    print(f"Found {len(results)} jobs")
    print(json.dumps(results[:2], indent=2, ensure_ascii=False))
