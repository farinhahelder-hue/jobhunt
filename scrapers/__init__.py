"""
JobHunt France — Scrapers for major French job boards.

Available scrapers:
- linkedin: LinkedIn France (static HTML, no auth)
- wttj: Welcome to the Jungle (Algolia API)
- hellowork: HelloWork (static HTML + LD+JSON)
- france_travail: France Travail API (OAuth2 needed)
- apec: APEC (Playwright, executive roles)
- monster: Monster France (Playwright)
- indeed: Indeed France (Playwright + stealth)
"""

from . import linkedin, wttj, hellowork, france_travail, apec, monster, indeed

__all__ = ["linkedin", "wttj", "hellowork", "france_travail", "apec", "monster", "indeed", "run_all"]


def run_all(
    query: str = "développeur",
    location: str = "France",
    max_results_per_board: int = 20,
    boards: list = None,
    **kwargs,
) -> dict:
    """
    Run all scrapers and return combined results by board.

    Args:
        query: Job search keywords
        location: Location (default: 'France')
        max_results_per_board: Max results per job board
        boards: List of board names to run (default: all)

    Returns:
        Dict with board names as keys, list of jobs as values.
        Also includes 'all' key with deduplicated combined list.
    """
    available = {
        "linkedin": lambda: linkedin.search(query=query, location=location, max_results=max_results_per_board),
        "wttj": lambda: wttj.search(query=query, max_results=max_results_per_board),
        "hellowork": lambda: hellowork.search(query=query, location=location, max_results=max_results_per_board),
        "france_travail": lambda: france_travail.search(query=query, max_results=max_results_per_board),
        "apec": lambda: apec.search(query=query, max_results=max_results_per_board),
        "monster": lambda: monster.search(query=query, location=location, max_results=max_results_per_board),
        "indeed": lambda: indeed.search(query=query, location=location, max_results=max_results_per_board),
    }

    selected = boards or list(available.keys())
    results = {}

    for board in selected:
        if board not in available:
            print(f"[run_all] Unknown board: {board}")
            continue
        try:
            print(f"[run_all] Scraping {board}...")
            jobs = available[board]()
            results[board] = jobs
            print(f"[run_all] {board}: {len(jobs)} jobs found")
        except Exception as e:
            print(f"[run_all] {board} failed: {e}")
            results[board] = []

    seen_urls = set()
    all_jobs = []
    for board_jobs in results.values():
        for job in board_jobs:
            url = job.get("url")
            if url and url not in seen_urls:
                seen_urls.add(url)
                all_jobs.append(job)
            elif not url:
                all_jobs.append(job)

    results["all"] = all_jobs
    return results
