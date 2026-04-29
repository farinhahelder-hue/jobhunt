#!/usr/bin/env python3
"""
JobHunt CLI — Run scrapers from the command line.

Usage:
    python run.py --query "développeur Python" --location Paris --boards linkedin wttj hellowork
    python run.py --query "data scientist" --max 50 --output jobs.json
"""

import argparse
import json
from scrapers import run_all


def main():
    parser = argparse.ArgumentParser(description="Scrape French job boards")
    parser.add_argument("--query", "-q", default="développeur", help="Search keywords")
    parser.add_argument("--location", "-l", default="France", help="Location")
    parser.add_argument("--max", "-m", type=int, default=20, help="Max results per board")
    parser.add_argument(
        "--boards", "-b", nargs="+",
        choices=["linkedin", "wttj", "hellowork", "france_travail", "apec", "monster", "indeed"],
        help="Job boards to scrape (default: all)",
    )
    parser.add_argument("--output", "-o", help="Output JSON file path")
    args = parser.parse_args()

    print(f"\n🔍 Searching: \"{args.query}\" in {args.location}")
    print(f"📋 Boards: {args.boards or 'all'}")
    print(f"📊 Max per board: {args.max}\n")

    results = run_all(
        query=args.query,
        location=args.location,
        max_results_per_board=args.max,
        boards=args.boards,
    )

    all_jobs = results.get("all", [])
    print(f"\n✅ Total unique jobs found: {len(all_jobs)}")
    for board, jobs in results.items():
        if board != "all":
            print(f"  • {board}: {len(jobs)} jobs")

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Results saved to {args.output}")
    else:
        print("\n--- Sample Results (first 3) ---")
        for job in all_jobs[:3]:
            print(f"  [{job['source']}] {job['title']} @ {job['company']} — {job['location']}")
            print(f"    {job['url']}")


if __name__ == "__main__":
    main()
