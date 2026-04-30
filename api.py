#!/usr/bin/env python3
"""
JobHunt API — FastAPI web service for French job board scraping.
"""

from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse
from typing import Optional, List

from scrapers import run_all

app = FastAPI(
    title="JobHunt France API",
    description="Scrape major French job boards in one request.",
    version="1.0.0",
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/search")
def search(
    query: str = Query("développeur", description="Keywords"),
    location: str = Query("France", description="Location"),
    max: int = Query(10, ge=1, le=50, description="Max results per board"),
    boards: Optional[List[str]] = Query(None, description="Boards to search"),
):
    """Search French job boards and return combined results."""
    if isinstance(boards, str) and boards:
        boards = [b.strip() for b in boards.split(",")]
    results = run_all(
        query=query,
        location=location,
        max_results_per_board=max,
        boards=boards or None,
    )
    all_jobs = results.pop("all", [])
    return {
        "query": query,
        "location": location,
        "total": len(all_jobs),
        "by_board": {k: len(v) for k, v in results.items()},
        "jobs": all_jobs,
    }

@app.get("/", response_class=HTMLResponse)
def index():
    return open("static/index.html").read()
@app.get("/test/ft")
async def test_ft():
    """Debug France Travail auth."""
    import os, requests
    from scrapers.france_travail import SCOPE
    cid = os.environ.get("FRANCE_ITAL_CLIENT_") or os.environ.get("FRANCE_ITAL_CLIENT_") or "NOT_"
    csecret = os.environ.get("FRANCE_ITAL_CLIENT_") or os.environ.get("FRANCE_ITAL_CLIENT_") or "NOT_"
    try:
        resp = requests.post(
            "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire",
            data={"grant_": "client_", "client_": cid, "client_": csecret, "scope": SCOPE},
            headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=10,
        )
        return {"status": resp.status_code, "cid": cid[:20], "has_": bool(csecret and csecret != "NOT_"), "resp": resp.text[:200]}
    except Exception as e:
        return {"error": str(e)}
