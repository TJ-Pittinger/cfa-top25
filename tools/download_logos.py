"""
Download every FBS team logo for the CFA Top 25 site, and double-check the team list.

Run it once from the site's main folder:
    python3 tools/download_logos.py

What it does:
  - Reads the 138 teams in teams.js
  - Looks each one up on ESPN to confirm the id matches the school
  - Saves each logo as logos/<id>.png (500x500, transparent background)
  - Prints a short report. Anything flagged "CHECK" should be fixed in teams.js.

Needs only Python 3 (no extra installs).
"""
import json
import os
import re
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEAMS_FILE = os.path.join(ROOT, "teams.js")
LOGO_DIR = os.path.join(ROOT, "logos")
TEAM_URL = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/{id}"
LOGO_URL = "https://a.espncdn.com/i/teamlogos/ncaa/500/{id}.png"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept": "application/json,image/png,*/*",
}


def get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def load_teams():
    text = open(TEAMS_FILE, encoding="utf-8").read()
    rows = re.findall(r'\[(\d+),\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\]', text)
    return [{"id": int(i), "name": n, "abbr": a, "conf": c} for i, n, a, c in rows]


def simplify(s):
    s = s.lower().replace("'", "").replace("é", "e").replace("&", "and")
    return re.sub(r"[^a-z0-9]", "", s)


def main():
    teams = load_teams()
    os.makedirs(LOGO_DIR, exist_ok=True)
    print(f"Found {len(teams)} teams in teams.js\n")

    problems = []
    for n, t in enumerate(teams, 1):
        label = f"[{n:3}/{len(teams)}] {t['name']:<22}"
        espn_name = "?"
        try:
            data = json.loads(get(TEAM_URL.format(id=t["id"])))
            team = data.get("team", {})
            espn_name = team.get("location") or team.get("displayName") or "?"
            names = [simplify(team.get(k, "")) for k in ("location", "displayName", "shortDisplayName", "nickname")]
            if not any(simplify(t["name"]) in nm or nm in simplify(t["name"]) for nm in names if nm):
                problems.append(f"CHECK id {t['id']}: teams.js says '{t['name']}', ESPN says '{espn_name}'")
        except Exception as e:
            problems.append(f"CHECK id {t['id']} ({t['name']}): could not look up on ESPN ({e})")

        path = os.path.join(LOGO_DIR, f"{t['id']}.png")
        try:
            png = get(LOGO_URL.format(id=t["id"]))
            with open(path, "wb") as f:
                f.write(png)
            print(f"{label} saved   (ESPN: {espn_name})")
        except Exception as e:
            problems.append(f"MISSING logo for {t['name']} (id {t['id']}): {e}")
            print(f"{label} FAILED")
        time.sleep(0.15)

    print("\n" + "=" * 60)
    if problems:
        print(f"{len(problems)} thing(s) to look at:")
        for p in problems:
            print("  - " + p)
    else:
        print(f"All {len(teams)} teams matched ESPN and every logo downloaded.")
    print(f"Logos are in: {LOGO_DIR}")


if __name__ == "__main__":
    sys.exit(main())
