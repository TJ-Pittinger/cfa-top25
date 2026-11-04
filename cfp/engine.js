// CFP Projector engine. Pure functions, no page code: the page (cfp.js) and the tests both use it.
// Input: the season file (cfp/season.json), the team list (teams.js), the fan's picks and the baseline ranking.
// Output: projected records, conference standings with tiebreak reasons, title games, a CFP-style ranking and the 12-team bracket.
(function (root) {
  "use strict";

  // ---------- Scoring (see "How it projects" on the page) ----------
  var S = {
    RANKED_WIN: 0.12,     // beat a ranked team: +12% of that team's points
    UNRANKED_WIN: 20,     // beat anyone else
    RANKED_LOSS: 350,     // a ranked team loses
    UNRANKED_LOSS: 450,   // an unranked team loses (it's already near the bottom)
    CCG_LOSS: 50,         // losing a title game barely hurts (backtest, 2024-25)
    CHAMP_P4: 300,        // won a Power 4 title
    CHAMP_TOP: 150,       // extra for SEC and Big Ten champions: the committee weighs those leagues' schedules more
    CHAMP_OTHER: 75,      // won any other title
    UNBEATEN: 250         // 11-0 or better
  };
  var P4 = ["SEC", "Big Ten", "Big 12", "ACC"];
  var TITLE_CONFS = ["SEC", "Big Ten", "Big 12", "ACC", "Pac-12", "Mountain West", "American", "Sun Belt", "C-USA", "MAC"];
  var SUN_BELT_DIVS = {
    East: ["App State", "Coastal Carolina", "Georgia Southern", "Georgia State", "James Madison", "Marshall", "Old Dominion"],
    West: ["Arkansas State", "Louisiana", "Louisiana Tech", "South Alabama", "Southern Miss", "Troy", "UL Monroe"]
  };

  // ---------- Eastern-time helpers for locking ----------
  var fmt = typeof Intl !== "undefined" ? new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23"
  }) : null;
  function etParts(ms) {
    var o = {};
    fmt.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, min: +o.minute, wd: o.weekday };
  }
  // The UTC instant of a wall-clock time in Eastern time
  function etToMs(y, m, d, h, min) {
    var guess = Date.UTC(y, m - 1, d, h, min);
    for (var i = 0; i < 2; i++) {
      var p = etParts(guess);
      var shown = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
      guess += Date.UTC(y, m - 1, d, h, min) - shown;
    }
    return guess;
  }
  var WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  // Saturday of the game's week (the game day itself if it's a Saturday), as y/m/d
  function weekSaturday(ms) {
    var p = etParts(ms), add = (6 - WD[p.wd] + 7) % 7;
    var noonUtc = Date.UTC(p.y, p.m - 1, p.d + add, 12);
    var dt = new Date(noonUtc);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }
  // Picks lock at noon ET Saturday for Saturday games, at kickoff for every other day.
  function lockAt(g) {
    var k = Date.parse(g.t), p = etParts(k);
    if (p.wd === "Sat" || g.tbd) {
      var s = weekSaturday(k), noon = etToMs(s.y, s.m, s.d, 12, 0);
      return g.tbd ? noon : Math.min(k, noon);
    }
    return k;
  }
  // The week's games come off the page at midnight ET at the end of its Saturday.
  function hideAt(g) {
    var s = weekSaturday(Date.parse(g.t));
    return etToMs(s.y, s.m, s.d, 0, 0) + 24 * 3600 * 1000;
  }

  // ---------- Teams ----------
  function buildTeams(data, teamList, baseline, cfpTop25) {
    var T = {};
    teamList.forEach(function (t) {
      T[String(t.id)] = { key: String(t.id), id: t.id, name: t.name, abbr: t.abbr, conf: t.conf, w: null, l: null, cw: null, cl: null, base: 0, baseRank: null };
    });
    Object.keys(data.names || {}).forEach(function (k) {
      T[k] = { key: k, id: null, name: data.names[k], abbr: data.names[k].slice(0, 4).toUpperCase(), conf: "FCS", w: null, l: null, cw: null, cl: null, base: 0, baseRank: null, fcs: true };
    });
    T.flex = { key: "flex", id: null, name: "Flex game (TBA)", abbr: "TBA", conf: "Pac-12", w: null, l: null, cw: null, cl: null, base: 0, baseRank: null, ph: true };
    Object.keys(data.records || {}).forEach(function (k) {
      var r = data.records[k], t = T[k];
      if (!t) return;
      t.w = r[0]; t.l = r[1]; t.cw = r[2]; t.cl = r[3];
    });
    var apRows = (data.ap && data.ap.rows) || [];
    var apPts = {}; apRows.forEach(function (r) { apPts[r[0]] = r[1]; });
    // The committee publishes no points, so the Nth CFP team gets the points the Nth AP team got that week.
    var curve = apRows.slice().sort(function (a, b) { return b[1] - a[1]; }).slice(0, 25).map(function (r) { return r[1]; });
    while (curve.length < 25) curve.push(Math.max(1, (curve[curve.length - 1] || 100) - 40));
    var top = cfpTop25 || (data.cfp && data.cfp.top25) || [];
    var useCfp = baseline !== "ap" && top.length > 0;
    Object.keys(T).forEach(function (k) {
      var t = T[k], ap = apPts[k] || 0;
      if (useCfp) {
        var i = top.indexOf(k);
        t.baseRank = i >= 0 ? i + 1 : null;
        // Teams the committee left out keep half their AP votes, which stays below No. 25.
        t.base = i >= 0 ? curve[i] : Math.round(Math.min(ap, 90) * 0.5);
      } else {
        var row = apRows.filter(function (r) { return r[0] === k; })[0];
        t.base = ap;
        t.baseRank = row && row[2] ? row[2] : null;
      }
      t.pts = t.base;
      t.power = t.base + (t.w !== null ? 100 * t.w / Math.max(1, t.w + t.l) : 0);
      t.last = null; // result of the most recent game: 'W' or 'L'
    });
    return T;
  }

  // ---------- Projection ----------
  function project(input) {
    var data = input.data, picks = input.picks || {}, now = input.now == null ? Date.now() : input.now;
    var T = buildTeams(data, input.teams, input.baseline || "cfp", input.cfpTop25);
    var H = {}, LOG = {};
    function addLog(w, l) {
      H[w + ">" + l] = (H[w + ">" + l] || 0) + 1;
      (LOG[w] = LOG[w] || []).push({ opp: l, win: 1 });
      (LOG[l] = LOG[l] || []).push({ opp: w, win: 0 });
    }
    (data.results || []).forEach(function (r) { addLog(r[0], r[1]); });

    // Who's favored: the betting line when ESPN has one, then ESPN's FPI matchup prediction,
    // then the gap in FPI ratings (title games, flex games), and last the starting ranking.
    var FPI = data.fpi || {};
    function phi(x) { return 1 / (1 + Math.exp(-1.7 * x)); }
    function favorite(g, neutral) {
      var a = g.a, h = g.h;
      var hp = g.hp != null ? g.hp : null;
      if (hp === null && FPI[a] != null && FPI[h] != null) hp = phi((FPI[h] - FPI[a] + (neutral || g.n ? 0 : 2.5)) / 14);
      if (g.lf === a || g.lf === h) {
        return { key: g.lf, src: "line", line: g.line, prob: hp === null ? null : (g.lf === h ? hp : 1 - hp) };
      }
      if (hp !== null) {
        var k = hp >= 0.5 ? h : a;
        return { key: k, src: g.hp != null ? "fpi" : "fpi-rating", prob: k === h ? hp : 1 - hp };
      }
      return { key: T[a].power >= T[h].power ? a : h, src: "rank", prob: null };
    }
    function apply(win, lose, conf, ccg) {
      var W = T[win], L = T[lose];
      if (W.w !== null) W.w++;
      if (L.w !== null) L.l++;
      if (conf && !ccg) { if (W.cw !== null) W.cw++; if (L.cw !== null) L.cl++; addLog(win, lose); }
      W.pts += L.baseRank ? Math.round(S.RANKED_WIN * L.base) : S.UNRANKED_WIN;
      if (L.w !== null) L.pts -= ccg ? S.CCG_LOSS : (L.baseRank ? S.RANKED_LOSS : S.UNRANKED_LOSS);
      W.last = "W"; L.last = "L";
    }

    // Games after title-game weekend (Army-Navy) don't affect standings or selection.
    var cutoff = data.ccgDate ? Date.parse(data.ccgDate + "T23:59:59Z") + 86400000 : Infinity;
    var games = (data.games || []).filter(function (g) { return T[g.a] && T[g.h] && Date.parse(g.t) < cutoff; })
      .sort(function (x, y) { return Date.parse(x.t) - Date.parse(y.t); });
    var shown = [];
    games.forEach(function (g) {
      var fv = favorite(g), favorite_ = fv.key;
      var locked = now >= lockAt(g), hidden = now >= hideAt(g);
      var pick = picks[g.id] === g.a || picks[g.id] === g.h ? picks[g.id] : null;
      var winner = pick || favorite_;
      apply(winner, winner === g.a ? g.h : g.a, g.conf, false);
      if (!hidden) shown.push({ game: g, favorite: favorite_, fav: fv, pick: pick, winner: winner, locked: locked, lockAt: lockAt(g), hideAt: hideAt(g) });
    });

    // ---------- Standings ----------
    var reasonOf = {};
    var ctx = { T: T, H: H, LOG: LOG };
    var standings = {}, races = {}, ccg = [];
    TITLE_CONFS.forEach(function (c) {
      var members = Object.keys(T).map(function (k) { return T[k]; }).filter(function (t) { return t.conf === c && t.cw !== null && !t.ph; });
      if (members.length < 4) return; // no data for this league yet
      var divisions = c === "Sun Belt" ? Object.keys(SUN_BELT_DIVS).map(function (d) {
        return members.filter(function (t) { return SUN_BELT_DIVS[d].indexOf(t.name) >= 0; });
      }) : [members];
      var ordered = divisions.map(function (m) { return orderStandings(m, c, ctx, reasonOf); });
      var a, b, why;
      if (ordered.length === 2) {
        a = ordered[0][0]; b = ordered[1][0];
        if (byPts(a, b) > 0) { var x = a; a = b; b = x; }
        why = "Division winners";
      } else {
        a = ordered[0][0]; b = ordered[0][1];
        why = b ? tieNote(a, b, ordered[0], reasonOf) : "";
      }
      standings[c] = ordered.length === 2 ? ordered[0].concat(ordered[1]) : ordered[0];
      races[c] = { conf: c, a: a, b: b, why: why, order: standings[c], divisions: ordered.length === 2 ? ["East", "West"] : null, divOrder: ordered };
      var key = "ccg-" + c;
      var pick = picks[key] === a.key || picks[key] === b.key ? picks[key] : null;
      var cf = favorite({ a: a.key, h: b.key }, true), favorite_ = cf.key;
      var winner = pick || favorite_;
      apply(winner, winner === a.key ? b.key : a.key, false, true);
      races[c].champ = T[winner];
      ccg.push({ id: key, conf: c, a: a.key, h: b.key, favorite: favorite_, fav: cf, pick: pick, winner: winner, locked: data.ccgDate ? now >= ccgLock(data.ccgDate) : false });
    });

    // ---------- Ranking and field ----------
    Object.keys(races).forEach(function (c) { var t = races[c].champ; t.pts += (P4.indexOf(c) >= 0 ? S.CHAMP_P4 : S.CHAMP_OTHER) + (c === "SEC" || c === "Big Ten" ? S.CHAMP_TOP : 0); t.champOf = c; });
    Object.keys(T).forEach(function (k) { var t = T[k]; if (!t.ph && !t.fcs && t.l === 0 && t.w >= 11) t.pts += S.UNBEATEN; });
    var order = Object.keys(T).map(function (k) { return T[k]; }).filter(function (t) { return !t.ph && !t.fcs && t.w !== null; }).sort(byPts);
    order.forEach(function (t, i) { t.rank = i + 1; });
    // 2026 format: the four Power 4 champions are in, plus the highest-ranked Group of 6 team (champion or not).
    // Notre Dame is in if it ranks in the top 12. The rest are at-large by ranking; seeds 1-12 go by ranking.
    var auto = {}, field = [];
    P4.forEach(function (c) { if (races[c]) { auto[races[c].champ.key] = "P4"; field.push(races[c].champ); } });
    var g6 = order.filter(function (t) { return P4.indexOf(t.conf) < 0 && t.key !== "87"; })[0];
    if (g6 && !auto[g6.key]) { auto[g6.key] = "G6"; field.push(g6); }
    var nd = T["87"];
    var ndIn = nd && nd.rank && nd.rank <= 12;
    if (ndIn) field.push(nd);
    order.forEach(function (t) { if (field.length < 12 && !auto[t.key] && t !== nd) field.push(t); });
    field.sort(byPts);
    field.forEach(function (t, i) { t.seed = i + 1; });
    var out = order.filter(function (t) { return !t.seed; }).slice(0, 4);
    var bySeed = function (n) { return field[n - 1]; };
    var pods = [[1, 8, 9], [4, 5, 12], [3, 6, 11], [2, 7, 10]].map(function (p) {
      return { bye: bySeed(p[0]), hi: bySeed(p[1]), lo: bySeed(p[2]) };
    });
    return { teams: T, games: shown, ccg: ccg, races: races, standings: standings, order: order, field: field, out: out, pods: pods, reasonOf: reasonOf, auto: auto, ndIn: !!ndIn };
  }

  function ccgLock(dateStr) {
    var p = dateStr.split("-").map(Number);
    return etToMs(p[0], p[1], p[2] - 1, 12, 0); // title games start Friday; lock at noon ET Friday
  }

  function byPts(a, b) { return b.pts - a.pts || (a.baseRank || 99) - (b.baseRank || 99) || (a.name < b.name ? -1 : 1); }
  function pct(t) { return t.cw / Math.max(1, t.cw + t.cl); }

  function tieNote(a, b, ord, reasonOf) {
    var third = ord[2];
    if (third && pct(third) === pct(b)) return b.name + " over " + third.name + ": " + (reasonOf[b.key] || "projected ranking");
    if (pct(a) === pct(b)) return "Both " + a.cw + "-" + a.cl + "; seeding by " + (reasonOf[a.key] || "projected ranking");
    return "";
  }

  // ---------- Tiebreakers ----------
  // Each league's published order of steps. Steps the page can't project (SportSource ratings, scoring margin,
  // committee rankings) use the projected ranking in their place, and a random draw falls back to it too.
  var STEP_NAMES = {
    h2h: "head-to-head", rr: "head-to-head among the tied teams", beatAll: "beat every other tied team",
    beatLose: "head-to-head (beat or lost to every other tied team)", combined: "combined record vs. the tied teams",
    accForwardBack: "head-to-head wins and losses vs. the tied teams",
    common: "record vs. common conference opponents", nextBest: "record vs. the highest-placed common opponent",
    oppPct: "conference opponents' combined record", totalWins: "total wins", overallPct: "overall winning percentage",
    cfpNoLoss: "CFP ranking entering the final week (projected)", rank: "projected ranking (stands in for SportSource)"
  };
  var RULES = {
    "SEC": { two: ["h2h", "common", "nextBest", "oppPct", "rank"], multi: ["rr", "beatAll", "common", "nextBest", "oppPct", "rank"],
      source: "SEC official tiebreakers (2024, unchanged)" },
    "Big Ten": { two: ["h2h", "common", "nextBest", "oppPct", "rank"], multi: ["combined", "common", "nextBest", "oppPct", "rank"],
      source: "Big Ten tiebreaker (2024, updated 2025)" },
    "Big 12": { two: ["h2h", "common", "nextBest", "oppPct", "totalWins", "rank"], multi: ["rr", "beatLose", "common", "oppPct", "totalWins", "rank"],
      source: "Big 12 tiebreaker policy" },
    "ACC": { two: ["h2h", "rank"], multi: ["rr", "accForwardBack", "rank"],
      source: "ACC 2026 policy: head-to-head, then Team Success Ranking" },
    "Pac-12": { two: ["h2h", "nextBest", "common", "rank"], multi: ["rr", "common", "nextBest", "oppPct", "rank"],
      source: "Pac-12 2026 championship game tiebreakers" },
    "Mountain West": { two: ["h2h", "cfpNoLoss", "overallPct", "nextBest", "common"], multi: ["rr", "beatLose", "cfpNoLoss", "overallPct", "nextBest", "common"],
      source: "Mountain West tiebreakers" }
  };
  var DEFAULT_RULE = { two: ["h2h", "common", "nextBest", "oppPct", "rank"], multi: ["rr", "beatLose", "common", "nextBest", "oppPct", "rank"], source: "Generic order (league rules not loaded)" };

  // Teams count as tied when their conference winning percentages match. ACC 2026: teams that played a
  // different number of league games (8 vs. 9) also tie when they have the same wins or the same losses.
  function tied(a, b, conf) {
    if (pct(a) === pct(b)) return true;
    if (conf === "ACC" && a.cw + a.cl !== b.cw + b.cl) return a.cw === b.cw || a.cl === b.cl;
    return false;
  }

  function orderStandings(members, conf, ctx, reasonOf) {
    var m = members.slice().sort(function (a, b) { return pct(b) - pct(a) || b.cw - a.cw; });
    var out = [];
    for (var i = 0; i < m.length;) {
      var j = i + 1;
      while (j < m.length && tied(m[j - 1], m[j], conf)) j++;
      out = out.concat(breakTie(m.slice(i, j), conf, ctx, reasonOf, members));
      i = j;
    }
    return out;
  }

  function breakTie(g, conf, ctx, reasonOf, members) {
    if (g.length <= 1) return g;
    var rule = RULES[conf] || DEFAULT_RULE;
    var steps = g.length === 2 ? rule.two : rule.multi;
    for (var s = 0; s < steps.length; s++) {
      var scores = STEPS[steps[s]](g, ctx, members);
      if (!scores) continue;
      var vals = g.map(function (t, i) { return { t: t, v: scores[i] }; });
      var best = Math.max.apply(null, scores);
      var top = vals.filter(function (x) { return x.v === best; }).map(function (x) { return x.t; });
      if (top.length === g.length) continue;
      var rest = g.filter(function (t) { return top.indexOf(t) < 0; });
      if (top.length === 1) {
        reasonOf[top[0].key] = STEP_NAMES[steps[s]];
        return [top[0]].concat(breakTie(rest, conf, ctx, reasonOf, members));
      }
      var head = breakTie(top, conf, ctx, reasonOf, members);
      return head.concat(breakTie(rest, conf, ctx, reasonOf, members));
    }
    // Nothing separates them (the leagues use a draw): fall back to the projected ranking.
    var sorted = g.slice().sort(byPts);
    reasonOf[sorted[0].key] = "draw (projected ranking used)";
    return [sorted[0]].concat(breakTie(sorted.slice(1), conf, ctx, reasonOf, members));
  }

  function among(t, g, H) {
    var w = 0, l = 0;
    g.forEach(function (o) { if (o !== t) { w += H[t.key + ">" + o.key] || 0; l += H[o.key + ">" + t.key] || 0; } });
    return { w: w, l: l };
  }
  function played(a, b, H) { return (H[a.key + ">" + b.key] || 0) + (H[b.key + ">" + a.key] || 0) > 0; }
  function roundRobin(g, H) { return g.every(function (a) { return g.every(function (b) { return a === b || played(a, b, H); }); }); }
  function realOpp(k, ctx) { var o = ctx.T[k]; return o && !o.ph && !o.fcs; }
  function commonOpps(g, ctx) {
    var keys = g.map(function (t) { return t.key; });
    var sets = g.map(function (t) {
      var s = {}; (ctx.LOG[t.key] || []).forEach(function (r) { if (keys.indexOf(r.opp) < 0 && realOpp(r.opp, ctx)) s[r.opp] = true; }); return s;
    });
    return Object.keys(sets[0]).filter(function (o) { return sets.every(function (s) { return s[o]; }); });
  }
  function pctVs(t, opps, ctx) {
    var w = 0, n = 0;
    (ctx.LOG[t.key] || []).forEach(function (r) { if (opps.indexOf(r.opp) >= 0) { n++; w += r.win; } });
    return n ? w / n : null;
  }

  var STEPS = {
    h2h: function (g, ctx) {
      var a = among(g[0], g, ctx.H), b = among(g[1], g, ctx.H);
      if (a.w + a.l === 0) return null;
      return [a.w - a.l, b.w - b.l];
    },
    rr: function (g, ctx) {
      if (!roundRobin(g, ctx.H)) return null;
      return g.map(function (t) { var r = among(t, g, ctx.H); return r.w / Math.max(1, r.w + r.l); });
    },
    beatAll: function (g, ctx) {
      return g.map(function (t) { return g.every(function (o) { return o === t || ctx.H[t.key + ">" + o.key]; }) ? 1 : 0; });
    },
    beatLose: function (g, ctx) {
      return g.map(function (t) {
        if (g.every(function (o) { return o === t || ctx.H[t.key + ">" + o.key]; })) return 1;
        if (g.every(function (o) { return o === t || ctx.H[o.key + ">" + t.key]; })) return -1;
        return 0;
      });
    },
    combined: function (g, ctx) {
      // A team with no games against the others counts as .500.
      return g.map(function (t) { var r = among(t, g, ctx.H); return r.w + r.l ? r.w / (r.w + r.l) : 0.5; });
    },
    accForwardBack: function (g, ctx) {
      return g.map(function (t) {
        var r = among(t, g, ctx.H);
        return r.w > 0 && r.l === 0 ? 1 : r.l > 0 && r.w === 0 ? -1 : 0;
      });
    },
    common: function (g, ctx) {
      var c = commonOpps(g, ctx);
      if (!c.length) return null;
      return g.map(function (t) { return pctVs(t, c, ctx); });
    },
    nextBest: function (g, ctx, members) {
      // Go down the standings one level at a time; a tied group of opponents counts as one level.
      var c = commonOpps(g, ctx);
      if (!c.length) return null;
      var opp = c.map(function (k) { return ctx.T[k]; }).sort(function (a, b) { return pct(b) - pct(a); });
      for (var i = 0; i < opp.length;) {
        var j = i + 1;
        while (j < opp.length && pct(opp[j]) === pct(opp[i])) j++;
        var level = opp.slice(i, j).map(function (t) { return t.key; });
        var sc = g.map(function (t) { return pctVs(t, level, ctx); });
        if (sc.some(function (v) { return v !== sc[0]; })) return sc;
        i = j;
      }
      return null;
    },
    oppPct: function (g, ctx) {
      return g.map(function (t) {
        var w = 0, n = 0;
        (ctx.LOG[t.key] || []).forEach(function (r) {
          var o = ctx.T[r.opp];
          if (o && o.cw !== null && !o.ph) { w += o.cw; n += o.cw + o.cl; }
        });
        return n ? Math.round(1e6 * w / n) : 0;
      });
    },
    totalWins: function (g) { return g.map(function (t) { return t.w || 0; }); },
    overallPct: function (g) { return g.map(function (t) { return Math.round(1e6 * t.w / Math.max(1, t.w + t.l)); }); },
    cfpNoLoss: function (g) { return g.map(function (t) { return t.last === "L" ? -1e6 : t.pts; }); },
    rank: function (g) { return g.map(function (t) { return t.pts; }); }
  };

  var api = { project: project, lockAt: lockAt, hideAt: hideAt, etToMs: etToMs, RULES: RULES, STEP_NAMES: STEP_NAMES, SCORING: S, P4: P4, TITLE_CONFS: TITLE_CONFS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CFPEngine = api;
})(typeof window !== "undefined" ? window : this);
