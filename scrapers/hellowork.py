"""
HelloWork France Job Scraper
Extracts job IDs from the GTM dataLayer in the static HTML,
then fetches structured data from individual job pages (Schema.org JobPosting).
"""

import re
import json
import time
import requests
from bs4 import BeautifulSoup
from typing import Optional
from datetime import datetime

BASE_SEARCH_URL = "https://www.hellowork.com/fr-fr/emploi/recherche.html"
BASE_JOB_URL = "https://www.hellowork.com/fr-fr/emploi/offre-{id}.html"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9",
    "Referer": "https://www.hellowork.com/",
}


def _extract_ids_from_html(html: str) -> list[str]:
    """Extract job IDs from GTM dataLayer in the page HTML."""
    matches = re.findall(r'"idOffre":"([\d,]+)"', html)
    if matches:
        return matches[0].split(",")
    fallback = re.findall(r'/emploi/offre-(\d+)\.html', html)
    return list(dict.fromkeys(fallback))


def _parse_job_page(html: str, job_id: str, url: str) -> Optional[dict]:
    """Parse a HelloWork job detail page using Schema.org JobPosting LD+JSON."""
    soup = BeautifulSoup(html, "lxml")

    ld_scripts = soup.find_all("script", type="application/ld+json")
    for script in ld_scripts:
        try:
            data = json.loads(script.string)
            if data.get("@type") == "JobPosting":
                org = data.get("hiringOrganization", {})
                location = data.get("jobLocation", {})
                address = location.get("address", {}) if isinstance(location, dict) else {}
                city = address.get("addressLocality") or (location.get("name") if isinstance(location, dict) else None)
                country = address.get("addressCountry", "FR")
                loc_str = ", ".join(filter(None, [city, country]))

                base_salary = data.get("baseSalary", {})
                salary = None
                if base_salary:
                    value = base_salary.get("value", {})
                    if isinstance(value, dict):
                        mn = value.get("minValue")
                        mx = value.get("maxValue")
                        currency = base_salary.get("currency", "EUR")
                        if mn and mx:
                            salary = f"{mn}-{mx} {currency}"
                        elif mn:
                            salary = f"{mn}+ {currency}"

                date_posted = data.get("datePosted", "")[:10] if data.get("datePosted") else None

                return {
                    "title": data.get("title"),
                    "company": org.get("name"),
                    "location": loc_str or None,
                    "contract_type": data.get("employmentType"),
                    "url": url,
                    "posted_at": date_posted,
                    "remote": "full" if data.get("jobLocationType") == "TELECOMMUTE" else None,
                    "description_snippet": (data.get("description") or "")[:300].strip() or None,
                    "salary": salary,
                    "source": "hellowork",
                }
        except (json.JSONDecodeError, AttributeError):
            continue

    title_el = soup.select_one("h1")
    company_el = soup.select_one("[itemprop='name'], .company-name")
    return {
        "title": title_el.get_text(strip=True) if title_el else None,
        "company": company_el.get_text(strip=True) if company_el else None,
        "location": None,
        "contract_type": None,
        "url": url,
        "posted_at": None,
        "remote": None,
        "description_snippet": None,
        "salary": None,
        "source": "hellowork",
    }


def search(
    query: str = "développeur",
    location: str = "France",
    contract_type: Optional[str] = None,
    max_results: int = 30,
    sleep_seconds: float = 1.0,
) -> list[dict]:
    """
    Search HelloWork jobs.

    Args:
        query: Keywords (e.g. 'développeur', 'data scientist')
        location: City or 'France' for nationwide
        contract_type: 'CDI'|'CDC'|'Stage'|'Alternance'|'Freelance'|'Interim'
        max_results: Max jobs to return
        sleep_seconds: Delay between requests

    Returns:
        List of job dicts
    """
    params = {"k": query, "l": location, "p": 1}
    if contract_type:
        params["wt"] = contract_type

    jobs = []
    page = 1

    while len(jobs) < max_results:
        params["p"] = page
        resp = requests.get(BASE_SEARCH_URL, params=params, headers=HEADERS, timeout=15)
        resp.raise_for_status()

        job_ids = _extract_ids_from_html(resp.text)
        if not job_ids:
            break

        for job_id in job_ids:
            if len(jobs) >= max_results:
                break
            job_url = BASE_JOB_URL.format(id=job_id)
            try:
                job_resp = requests.get(job_url, headers=HEADERS, timeout=15)
                if job_resp.status_code == 200:
                    job = _parse_job_page(job_resp.text, job_id, job_url)
                    if job and job.get("title"):
                        jobs.append(job)
                time.sleep(sleep_seconds)
            except Exception as e:
                print(f"[HelloWork] Error fetching job {job_id}: {e}")
                continue

        page += 1
        if page > 10:
            break
        time.sleep(sleep_seconds)

    return jobs[:max_results]


if __name__ == "__main__":
    results = search(query="développeur", location="France", max_results=10)
    print(f"Found {len(results)} jobs")
    print(json.dumps(results[:2], indent=2, ensure_ascii=False))
