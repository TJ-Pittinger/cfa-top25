"""
Load this week's college football scores and records from ESPN into the CFA Top 25 database.

Runs automatically on GitHub early every Sunday (see .github/workflows/update-scores.yml).
It finds the next poll week, pulls final scores from Monday through Saturday before it,
and saves one row per FBS team: opponent, home/away, score, win/loss, and record.

Needs two settings (GitHub repository secrets):
  SUPABASE_URL         e.g. https://emppkooealsxujshlbhc.supabase.co
  SUPABASE_SECRET_KEY  the Supabase *secret* key (never put this in the website)

Run by hand:  python3 tools/update_scores.py            (next poll week)
              python3 tools/update_scores.py --week 8   (a specific week)
              python3 tools/update_scores.py --dry-run  (show what would be saved)
"""
import argparse
import datetime as dt
import json
import os
import sys
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

SEASON = 2026
ET = ZoneInfo("America/New_York")
SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"


def http(method, url, headers=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


class Supabase:
    def __init__(self, url, key):
        self.base = url.rstrip("/") + "/rest/v1/"
        self.headers = {"apikey": key, "Content-Type": "application/json"}
        if key.startswith("eyJ"):  # older-style keys also go in the Authorization header
            self.headers["Authorization"] = "Bearer " + key

    def get(self, path):
        return http("GET", self.base + path, self.headers)

    def upsert(self, table, rows, conflict):
        headers = dict(self.headers, Prefer="resolution=merge-duplicates,return=minimal")
        return http("POST", self.base + table + "?on_conflict=" + conflict, headers, rows)


def pick_week(weeks, wanted=None):
    real = [w for w in weeks if w["week"] > 0]
    if wanted is not None:
        return next((w for w in real if w["week"] == wanted), None)
    now = dt.datetime.now(dt.timezone.utc)
    for w in sorted(real, key=lambda w: w["week"]):
        if dt.datetime.fromisoformat(w["closes_at"].replace("Z", "+00:00")) > now:
            return w
    return None


def game_dates(week):
    """Monday through Saturday before the poll's Sunday, as ESPN's YYYYMMDD-YYYYMMDD range."""
    sunday = dt.datetime.fromisoformat(week["opens_at"].replace("Z", "+00:00")).astimezone(ET).date()
    start, end = sunday - dt.timedelta(days=6), sunday - dt.timedelta(days=1)
    return start.strftime("%Y%m%d") + "-" + end.strftime("%Y%m%d")


def fetch_scoreboard(dates):
    q = urllib.parse.urlencode({"groups": 80, "dates": dates, "limit": 1000})
    return http("GET", SCOREBOARD + "?" + q, {"User-Agent": UA, "Accept": "application/json"})


def overall_record(comp):
    for r in comp.get("records") or []:
        if r.get("type") == "total" or r.get("name") in ("overall", "All Splits"):
            return r.get("summary")
    recs = comp.get("records") or []
    return recs[0].get("summary") if recs else None


def rows_from_scoreboard(data, week_no, fbs_ids):
    rows = {}
    for ev in data.get("events", []):
        comp_ = (ev.get("competitions") or [{}])[0]
        status = (comp_.get("status") or ev.get("status") or {}).get("type", {})
        if not status.get("completed"):
            continue
        teams = comp_.get("competitors") or []
        if len(teams) != 2:
            continue
        neutral = bool(comp_.get("neutralSite"))
        for me, opp in ((teams[0], teams[1]), (teams[1], teams[0])):
            tid = int(me["team"]["id"])
            if tid not in fbs_ids:
                continue
            oid = int(opp["team"]["id"])
            my_score, opp_score = int(float(me.get("score") or 0)), int(float(opp.get("score") or 0))
            won = me.get("winner")
            if won is None:
                won = my_score > opp_score
            rows[tid] = {
                "season": SEASON,
                "week": week_no,
                "team_id": tid,
                "opp_id": oid if oid in fbs_ids else None,
                "opp_name": opp["team"].get("location") or opp["team"].get("displayName"),
                "home": True if neutral else me.get("homeAway") == "home",
                "team_score": my_score,
                "opp_score": opp_score,
                "won": bool(won),
                "record": overall_record(me),
            }
    return list(rows.values())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--week", type=int)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SECRET_KEY")
    if not url or not key:
        sys.exit("Set SUPABASE_URL and SUPABASE_SECRET_KEY first.")
    db = Supabase(url, key)

    weeks = db.get("weeks?season=eq.%d&order=week" % SEASON)
    week = pick_week(weeks, args.week)
    if not week:
        print("No upcoming poll week found. Nothing to do.")
        return
    fbs_ids = {t["id"] for t in db.get("teams?select=id")}
    dates = game_dates(week)
    print("Poll week %d · games %s · %d FBS teams" % (week["week"], dates, len(fbs_ids)))

    rows = rows_from_scoreboard(fetch_scoreboard(dates), week["week"], fbs_ids)
    print("Finals found for %d FBS teams" % len(rows))
    for r in sorted(rows, key=lambda r: r["team_id"])[:5]:
        print("  sample:", r)
    if args.dry_run or not rows:
        return
    db.upsert("games", rows, "season,week,team_id")
    print("Saved.")


if __name__ == "__main__":
    main()
