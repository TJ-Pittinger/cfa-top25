"""
Build cfp/season.json for the CFP Projector from ESPN: every FBS team's record, every finished
conference game (for head-to-head and common-opponent tiebreakers), every remaining game with its
kickoff time, the betting favorite and ESPN's FPI win chance for each game, and the latest AP and CFP rankings.

Runs on GitHub (see .github/workflows/update-cfp.yml), which commits the file when it changes.
No keys needed: ESPN's scoreboard is public.

Run by hand:  python3 tools/update_cfp.py             (writes cfp/season.json)
              python3 tools/update_cfp.py --dry-run   (prints a summary, writes nothing)

Flex games (opponents not set yet) live in cfp/flex.json. Each one shows until ESPN lists a real
opponent for that team that week.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

SEASON = 2026
CCG_DATE = "2026-12-05"   # conference championship Saturday
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "cfp", "season.json")
FLEX = os.path.join(ROOT, "cfp", "flex.json")
SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard"
RANKINGS = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def load_teams():
    """FBS teams from teams.js: {id: conference}"""
    src = open(os.path.join(ROOT, "teams.js"), encoding="utf-8").read()
    teams = {}
    for m in re.finditer(r'\[(\d+),\s*"[^"]*",\s*"[^"]*",\s*"([^"]+)"\]', src):
        teams[m.group(1)] = m.group(2)
    return teams


def fetch_week(week):
    q = urllib.parse.urlencode({"dates": SEASON, "seasontype": 2, "week": week, "groups": 80, "limit": 500})
    try:
        return get(SCOREBOARD + "?" + q).get("events", [])
    except urllib.error.HTTPError as e:
        print("  ESPN returned %s for week %s" % (e.code, week))
        return []


def is_title_game(ev):
    comp = (ev.get("competitions") or [{}])[0]
    notes = " ".join(n.get("headline", "") for n in (comp.get("notes") or []))
    return "championship" in notes.lower()


def parse(events, fbs):
    names, records, results, games = {}, {}, [], []
    seen = set()
    for t in fbs:
        records[t] = [0, 0, 0, 0]
    for ev in events:
        if ev.get("id") in seen or is_title_game(ev):
            continue
        if (ev.get("date") or "")[:10] > CCG_DATE:
            continue  # after title-game weekend (Army-Navy): doesn't affect standings or selection
        seen.add(ev.get("id"))
        comp = (ev.get("competitions") or [{}])[0]
        cs = comp.get("competitors") or []
        if len(cs) != 2:
            continue
        side = {c.get("homeAway"): c for c in cs}
        if "home" not in side or "away" not in side:
            continue

        def key(c):
            tid = str(c["team"].get("id"))
            if tid in fbs:
                return tid
            name = c["team"].get("location") or c["team"].get("displayName") or "TBD"
            if name.upper() == "TBD":
                return None
            names["x:" + name] = name
            return "x:" + name

        a, h = key(side["away"]), key(side["home"])
        if not a or not h or (a not in fbs and h not in fbs):
            continue
        conf = bool(comp.get("conferenceCompetition")) and a in fbs and h in fbs and fbs[a] == fbs[h] and fbs[a] != "Independent"
        status = (comp.get("status") or ev.get("status") or {}).get("type", {})
        wk = (ev.get("week") or {}).get("number")
        if status.get("completed"):
            win = next((c for c in cs if c.get("winner")), None)
            if win is None:
                sa, sh = float(side["away"].get("score") or 0), float(side["home"].get("score") or 0)
                if sa == sh:
                    continue
                win = side["away"] if sa > sh else side["home"]
            w = a if win is side["away"] else h
            l = h if w == a else a
            if w in fbs:
                records[w][0] += 1
                if conf:
                    records[w][2] += 1
            if l in fbs:
                records[l][1] += 1
                if conf:
                    records[l][3] += 1
            if conf:
                results.append([w, l])
        elif status.get("state") != "post" and status.get("name") not in ("STATUS_CANCELED", "STATUS_POSTPONED"):
            g = {"id": a + "@" + h, "wk": wk, "t": ev.get("date"), "a": a, "h": h, "conf": conf, "eid": ev.get("id")}
            if comp.get("neutralSite"):
                g["n"] = True
            line = odds_line(comp.get("odds") or [], a, h)
            if line:
                g.update(line)
            if comp.get("timeValid") is False or ev.get("timeValid") is False:
                g["tbd"] = True
            games.append(g)
    return names, records, results, games


def odds_line(odds, a, h):
    """Betting line from ESPN's odds block: {"line": "MIA -7.5", "lf": favorite key}"""
    for o in odds:
        details = (o.get("details") or "").strip()
        if not details or details.upper() in ("EVEN", "OFF"):
            continue
        fav = None
        if (o.get("homeTeamOdds") or {}).get("favorite"):
            fav = h
        elif (o.get("awayTeamOdds") or {}).get("favorite"):
            fav = a
        else:
            sp = o.get("spread")
            if isinstance(sp, (int, float)) and sp != 0:
                fav = h if sp < 0 else a   # ESPN's spread is from the home team's side
        if fav:
            return {"line": details, "lf": fav}
    return None


SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary"


def add_predictions(games):
    """ESPN FPI matchup predictor: home team's chance to win (0-1), saved as "hp"."""
    got = 0
    for g in games:
        if not g.get("eid"):
            continue
        try:
            data = get(SUMMARY + "?event=" + str(g["eid"]))
        except Exception:
            continue
        pr = data.get("predictor") or {}
        home = pr.get("homeTeam") or {}
        away = pr.get("awayTeam") or {}
        hp = home.get("gameProjection")
        if hp in (None, "") and away.get("gameProjection") not in (None, ""):
            hp = 100 - float(away["gameProjection"])
        if hp not in (None, ""):
            hp = float(hp) / 100.0
            # ESPN lists teams by id; make sure "home" here is our home team
            if str(home.get("id") or g["h"]) == g["a"]:
                hp = 1 - hp
            g["hp"] = round(hp, 3)
            got += 1
        if "line" not in g:
            line = odds_line(data.get("pickcenter") or [], g["a"], g["h"])
            if line:
                g.update(line)
    print("FPI win chances for %d of %d games, betting lines for %d" % (got, len(games), sum(1 for g in games if g.get("line"))))
    return games


POWER_INDEX = "https://site.web.api.espn.com/apis/fitt/v3/sports/football/college-football/powerindex"


def fpi_ratings(fbs):
    """Each team's FPI rating (points better than an average team). Used for title games and flex games."""
    out = {}
    try:
        data = get(POWER_INDEX + "?" + urllib.parse.urlencode({"region": "us", "lang": "en", "season": SEASON, "limit": 200}))
    except Exception as e:
        print("  could not load FPI ratings (%s)" % e)
        return out
    names = []
    for c in data.get("categories") or []:
        if c.get("name") in ("fpi", "FPI") or "Power" in (c.get("displayName") or ""):
            names = c.get("names") or c.get("labels") or []
            break
    for t in data.get("teams") or []:
        tid = str((t.get("team") or {}).get("id") or "")
        if tid not in fbs:
            continue
        for c in t.get("categories") or []:
            vals = c.get("values") or []
            if c.get("name") in ("fpi", "FPI") and vals:
                i = names.index("fpi") if "fpi" in names else 0
                try:
                    out[tid] = round(float(vals[i]), 1)
                except (TypeError, ValueError, IndexError):
                    pass
                break
    print("FPI ratings for %d teams" % len(out))
    return out


def add_flex(games, fbs):
    if not os.path.exists(FLEX):
        return games
    flex = json.load(open(FLEX, encoding="utf-8"))
    for f in flex:
        team = str(f["team"])
        ft = dt.datetime.fromisoformat(f["t"].replace("Z", "+00:00"))
        def near(g):
            gt = dt.datetime.fromisoformat((g["t"] or f["t"]).replace("Z", "+00:00"))
            return abs((gt - ft).days) <= 3
        if any(team in (g["a"], g["h"]) and near(g) for g in games):
            continue  # ESPN lists a real opponent that week
        f = dict(f, wk=next((g["wk"] for g in games if near(g) and g["wk"]), f["wk"]))
        a, h = ("flex", team) if f.get("home") else (team, "flex")
        games.append({"id": a + "@" + h, "wk": f["wk"], "t": f["t"], "tbd": True, "a": a, "h": h, "conf": True})
    return games


def rankings(fbs):
    ap, cfp = None, None
    try:
        data = get(RANKINGS)
    except Exception as e:
        print("  could not load rankings (%s)" % e)
        return ap, cfp
    for r in data.get("rankings", []):
        name = (r.get("name") or "") + " " + (r.get("shortName") or "")
        date = (r.get("date") or "")[:10]
        ranks = r.get("ranks") or []
        if "AP" in name and not ap:
            rows = [[str(x["team"]["id"]), int(x.get("points") or 0), int(x.get("current") or 0)] for x in ranks]
            rows += [[str(x["team"]["id"]), int(x.get("points") or 0), 0] for x in (r.get("others") or [])]
            ap = {"date": date, "rows": [x for x in rows if x[0] in fbs]}
        if "Playoff" in name and not cfp and ranks:
            top = [str(x["team"]["id"]) for x in sorted(ranks, key=lambda x: x.get("current") or 99)][:25]
            cfp = {"date": date, "top25": top}
    return ap, cfp


def main():
    ap_ = argparse.ArgumentParser()
    ap_.add_argument("--dry-run", action="store_true")
    args = ap_.parse_args()
    fbs = load_teams()
    print("%d FBS teams in teams.js" % len(fbs))
    events = []
    for wk in range(1, 17):
        evs = fetch_week(wk)
        print("  week %d: %d games" % (wk, len(evs)))
        events += evs
    names, records, results, games = parse(events, fbs)
    games = add_predictions(games)
    games = add_flex(games, fbs)
    ap, cfp = rankings(fbs)
    fpi = fpi_ratings(fbs)
    played = sum(1 for r in records.values() if r[0] + r[1] > 0)
    print("Records for %d teams, %d conference results, %d games left" % (played, len(results), len(games)))
    if played < 100:
        sys.exit("Too few teams with results; ESPN may be down. Leaving cfp/season.json alone.")

    old = {}
    if os.path.exists(OUT):
        old = json.load(open(OUT, encoding="utf-8"))
    out = {
        "season": SEASON, "source": "espn", "updated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "names": names, "records": records, "results": results, "games": sorted(games, key=lambda g: (g["t"] or "", g["id"])),
        # Keep the last rankings we had if ESPN doesn't list one this time.
        "cfp": cfp or old.get("cfp"), "ap": ap or old.get("ap"), "fpi": fpi or old.get("fpi") or {}, "ccgDate": CCG_DATE,
    }
    same = {k: v for k, v in out.items() if k != "updated"} == {k: v for k, v in old.items() if k != "updated"}
    if same:
        print("No changes.")
        return
    if args.dry_run:
        print(json.dumps({k: (v if k in ("cfp", "updated") else (len(v) if isinstance(v, (list, dict)) else v)) for k, v in out.items()}, indent=1))
        return
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"))
    print("Wrote cfp/season.json")


if __name__ == "__main__":
    main()
