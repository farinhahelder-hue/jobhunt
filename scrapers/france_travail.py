"""
France Travail (ex-Pôle Emploi) Job Scraper
Uses the official France Travail REST API (francetravail.io).

SETUP:
1. Create a free account at https://francetravail.io/
2. Create an app and get client_id + client_secret
3. Add to .env file:
   FRANCE_TRAVAIL_CLIENT_ID=your_client_id
   FRANCE_TRAVAIL_CLIENT_SECRET=your_client_secret

API Docs: https://francetravail.io/data/api/offres-emploi
"""

import os
import time
import json
import requests
from typing import Optional
from datetime import datetime

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

AUTH_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire"
SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search"
DETAIL_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/{id}"

SCOPE = "api_offresdemploiv2 o2dsoffre"

CONTRACT_MAP = {
    "CDI": "CDI",
    "CDD": "CDD",
    "MIS": "Intérim",
    "SAI": "Saisonnier",
    "CCE": "Profession commerciale",
    "FRA": "Franchise",
    "LIB": "Libéral / Indépendant",
    "REP": "Reprise entreprise",
    "TTI": "Travail temporaire insertion",
    "DIN": "Contrat travail intermittent",
}


class FranceTravailAuth:
    """Handles OAuth2 token for France Travail API."""

    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self._token = None
        self._expires_at = 0

    def get_token(self) -> str:
        if self._token and time.time() < self._expires_at - 60:
            return self._token

        resp = requests.post(
            AUTH_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "scope": SCOPE,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        self._token = data["access_token"]
        self._expires_at = time.time() + data.get("expires_in", 1500)
        return self._token


def _parse_offer(offer: dict) -> dict:
    lieu = offer.get("lieuTravail", {})
    location_parts = [lieu.get("libelle"), lieu.get("codePostal")]
    location = ", ".join(filter(None, location_parts)) or None

    salary_info = offer.get("salaire", {})
    salary = salary_info.get("libelle") or None

    contract_code = offer.get("typeContrat", "")
    contract_label = CONTRACT_MAP.get(contract_code, contract_code) or None

    date_raw = offer.get("dateCreation", "")
    posted_at = date_raw[:10] if date_raw else None

    description = offer.get("description", "")
    snippet = description[:300].strip() if description else None

    return {
        "title": offer.get("intitule"),
        "company": offer.get("entreprise", {}).get("nom"),
        "location": location,
        "contract_type": contract_label,
        "url": offer.get("origineOffre", {}).get("urlOrigine") or f"https://candidat.francetravail.fr/offres/recherche/detail/{offer.get('id', '')}",
        "posted_at": posted_at,
        "remote": None,
        "description_snippet": snippet,
        "salary": salary,
        "experience_required": offer.get("experienceLibelle"),
        "source": "france_travail",
        "job_id": offer.get("id"),
    }


def search(
    query: str = "développeur",
    departement: Optional[str] = None,
    commune: Optional[str] = None,
    contract_type: Optional[str] = None,
    min_salary: Optional[int] = None,
    experience: Optional[str] = None,
    max_results: int = 50,
    client_id: Optional[str] = None,
    client_secret: Optional[str] = None,
) -> list[dict]:
    """
    Search France Travail (Pôle Emploi) job listings.

    Args:
        query: Keywords (e.g. 'développeur')
        departement: Department code (e.g. '75' for Paris, '69' for Lyon)
        commune: INSEE commune code (5 digits)
        contract_type: 'CDI'|'CDD'|'MIS' (intérim)|'SAI' (saisonnier)
        min_salary: Minimum annual salary in EUR
        experience: '1' (< 1yr) | '2' (1-3yr) | '3' (> 3yr)
        max_results: Max results (API max 150 per call)
        client_id: Override env var FRANCE_TRAVAIL_CLIENT_ID
        client_secret: Override env var FRANCE_TRAVAIL_CLIENT_SECRET

    Returns:
        List of job dicts
    """
    cid = client_id or os.environ.get("FRANCE_TRAVAIL_CLIENT_ID")
    csecret = client_secret or os.environ.get("FRANCE_TRAVAIL_CLIENT_SECRET")

    if not cid or not csecret:
        raise ValueError(
            "France Travail API credentials required.\n"
            "Set FRANCE_TRAVAIL_CLIENT_ID and FRANCE_TRAVAIL_CLIENT_SECRET in your .env file.\n"
            "Get credentials at: https://francetravail.io/"
        )

    auth = FranceTravailAuth(cid, csecret)
    jobs = []
    start = 0
    batch = min(150, max_results)

    while len(jobs) < max_results:
        end = start + batch - 1
        params = {
            "motsCles": query,
            "range": f"{start}-{end}",
            "sort": 1,
        }
        if departement:
            params["departement"] = departement
        if commune:
            params["commune"] = commune
        if contract_type:
            params["typeContrat"] = contract_type
        if experience:
            params["experience"] = experience

        token = auth.get_token()
        resp = requests.get(
            SEARCH_URL,
            params=params,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            timeout=15,
        )

        if resp.status_code == 204:
            break
        resp.raise_for_status()

        data = resp.json()
        offers = data.get("resultats", [])

        for offer in offers:
            jobs.append(_parse_offer(offer))
            if len(jobs) >= max_results:
                break

        if len(offers) < batch:
            break

        start += batch
        time.sleep(0.5)

    return jobs[:max_results]


if __name__ == "__main__":
    results = search(query="développeur", departement="75", max_results=10)
    print(f"Found {len(results)} jobs")
    print(json.dumps(results[:2], indent=2, ensure_ascii=False))
