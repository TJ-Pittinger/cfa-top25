// CFA Top 25: the CFP Projector page (#cfp). Admins only while it's being tested.
// Fans pick every remaining game; the engine (cfp/engine.js) turns the picks into standings,
// title games, a CFP-style ranking and the 12-team bracket.
(function () {
  var E = window.CFPEngine;
  var KEY = "cfa-cfp-picks-" + CFA.SEASON;
  var S = { data: null, ranking: null, picks: null, baseline: "cfp", show: "top", saveTimer: null, saved: "", stats: null, entry: null, open: null };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function logo(t, size) {
    size = size || "sm";
    if (t.id && CFA.LOGOS_AVAILABLE) return '<img class="tl tl-' + size + '" src="logos/' + t.id + '.png" alt="" data-abbr="' + esc(t.abbr) + '" loading="lazy">';
    return '<span class="tl tl-badge tl-' + size + '" aria-hidden="true">' + esc(t.abbr) + "</span>";
  }
  function et(ms, opts) { return new Date(ms).toLocaleString("en-US", Object.assign({ timeZone: "America/New_York" }, opts)); }
  function kick(g) {
    if (g.tbd) return et(Date.parse(g.t), { weekday: "short", month: "short", day: "numeric" }) + " · Time TBA";
    return et(Date.parse(g.t), { weekday: "short", hour: "numeric", minute: "2-digit" }) + " ET";
  }
  function rec(t) { return t.w === null ? "" : t.w + "-" + t.l; }

  // ---------- Loading and saving ----------
  async function load() {
    var res = await Promise.all([
      fetch("cfp/season.json?t=" + Date.now()).then(function (r) { if (!r.ok) throw new Error("Couldn't load the schedule"); return r.json(); }),
      DB.cfpRanking(),
      DB.myCfpPicks()
    ]);
    S.data = res[0];
    var entered = res[1];
    // Use the admin-entered Top 25 when it's newer than the one in the schedule file.
    if (entered && entered.ranks && entered.ranks.length && (!S.data.cfp || entered.released >= S.data.cfp.date)) {
      S.ranking = { date: entered.released, top25: entered.ranks.map(String) };
    } else S.ranking = S.data.cfp || null;
    var local = {};
    try { local = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
    S.picks = res[2] || local || {};
    // A pick tapped just before signing in waits in the browser; save it to the account now.
    if (DB.user() && !res[2] && Object.keys(S.picks).length) persist();
    try { S.baseline = localStorage.getItem(KEY + "-base") || "cfp"; } catch (e) {}
    if (!S.ranking) S.baseline = "ap";
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(S.picks)); } catch (e) {}
    clearTimeout(S.saveTimer);
    if (!DB.user()) return;
    S.saveTimer = setTimeout(function () {
      DB.saveCfpPicks(S.picks).then(function (ok) { S.saved = ok ? "Saved" : ""; var el = document.getElementById("cfp-saved"); if (el) el.textContent = S.saved; });
    }, 800);
  }

  function run() {
    return E.project({ data: S.data, teams: TEAMS, picks: S.picks, baseline: S.baseline, cfpTop25: S.ranking && S.ranking.top25 });
  }

  // ---------- Rendering ----------
  // mode "admin": the admin-only tools page (#cfp-admin). Otherwise the public projector (#cfp).
  async function render(app, mode) {
    S.mode = mode === "admin" ? "admin" : "public";
    if (S.mode === "admin" && (!DB.user() || !DB.isAdmin())) {
      app.innerHTML = '<div class="panel panel-pad"><h2>Admins only</h2><p class="panel-note">This page is for site admins.</p></div>';
      return;
    }
    app.innerHTML = '<div class="loading">Loading the projector…</div>';
    await load();
    draw(app);
    wire(app);
  }

  function draw(app) {
    var r = run(), T = r.teams;
    var y = window.scrollY;
    if (S.mode === "admin") {
      app.innerHTML = '<div class="cfp"><div class="page-head"><div><div class="eyebrow"><b>Admin</b> · <a href="#admin">Back to admin</a> · <a href="#cfp">Open the projector</a></div>' +
        "<h1>CFP Projector tools</h1></div></div>" + adminHtml(r, T) + "</div>";
    } else {
      app.innerHTML =
        '<div class="cfp">' +
        head(r) +
        '<div class="layout">' +
        '<div class="main-col">' + weeksHtml(r, T) + ccgHtml(r, T) + "</div>" +
        '<aside class="side-col">' + bracketHtml(r) + racesHtml(r) + top25Html(r) + howHtml() + "</aside>" +
        "</div>" + stripHtml(r) + "</div>";
    }
    window.scrollTo(0, y);
  }

  function head(r) {
    var cfpLabel = S.ranking ? "CFP · " + shortDate(S.ranking.date) : "CFP (not out yet)";
    var apLabel = "AP · " + shortDate(S.data.ap && S.data.ap.date);
    var n = Object.keys(S.picks).length;
    return '<div class="page-head"><div><div class="eyebrow"><b>CFA Top 25</b> · Playoff projector</div>' +
      "<h1>CFP Projector</h1>" +
      '<p class="lede">Pick the rest of the season. Standings, title games and the 12-team bracket update with every pick. ' +
      "Games you leave alone go to the favorite.</p></div>" +
      '<div class="cfp-controls"><div class="tabs" role="group" aria-label="Starting ranking">' +
      '<button type="button" data-base="cfp" aria-pressed="' + (S.baseline === "cfp") + '"' + (S.ranking ? "" : " disabled") + ">" + esc(cfpLabel) + "</button>" +
      '<button type="button" data-base="ap" aria-pressed="' + (S.baseline === "ap") + '">' + esc(apLabel) + "</button></div>" +
      '<div class="cfp-btns"><button type="button" class="btn btn-primary btn-sm" data-act="share">Share my bracket</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-act="reset"' + (n ? "" : " disabled") + ">Reset all</button>" +
      (DB.user() ? '<span class="cfp-saved" id="cfp-saved" aria-live="polite">' + esc(S.saved) + "</span>" :
        '<button type="button" class="btn btn-ghost btn-sm" data-act="signin">Sign in to make picks</button>') + "</div></div></div>" +
      '<div id="cfp-share"></div>' +
      (S.data.source === "seed" ? '<p class="cfp-note">Schedule and results are the hand-checked set through ' + shortDate(S.data.through) +
        '. Kickoff times appear once the ESPN feed runs.</p>' : '<p class="cfp-note">Schedule and results from ESPN, updated ' +
        et(Date.parse(S.data.updated), { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " ET.</p>");
  }
  function shortDate(d) {
    if (!d) return "";
    var p = d.split("-");
    return ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."][+p[1] - 1] + " " + (+p[2]);
  }

  // Games that matter: at least one team in this week's CFP Top 25 (AP Top 25 before the first CFP ranking)
  function matters(r) {
    var top = {};
    if (S.ranking && S.ranking.top25) S.ranking.top25.forEach(function (k) { top[String(k)] = true; });
    else ((S.data.ap && S.data.ap.rows) || []).forEach(function (row) { if (row[2]) top[row[0]] = true; });
    return function (g) { return !!(top[g.a] || top[g.h]); };
  }

  function weeksHtml(r, T) {
    var isHot = matters(r);
    var byWk = {};
    r.games.forEach(function (x) { (byWk[x.game.wk] = byWk[x.game.wk] || []).push(x); });
    var wks = Object.keys(byWk).map(Number).sort(function (a, b) { return a - b; });
    var total = r.games.length, hot = r.games.filter(function (x) { return isHot(x.game); }).length;
    var html = '<div class="cfp-filter tabs" role="group" aria-label="Which games">' +
      '<button type="button" data-show="top" aria-pressed="' + (S.show === "top") + '">Games with a Top 25 team (' + hot + ")</button>" +
      '<button type="button" data-show="all" aria-pressed="' + (S.show === "all") + '">All games (' + total + ")</button></div>";
    if (!wks.length) html += '<div class="panel panel-pad"><p class="panel-note">The regular season is over. Pick the title games below.</p></div>';
    wks.forEach(function (wk) {
      var list = byWk[wk].filter(function (x) { return S.show === "all" || isHot(x.game); });
      list.sort(function (x, y) { return importance(x, T) - importance(y, T) || Date.parse(x.game.t) - Date.parse(y.game.t); });
      var first = Math.min.apply(null, byWk[wk].map(function (x) { return Date.parse(x.game.t); }));
      var last = Math.max.apply(null, byWk[wk].map(function (x) { return Date.parse(x.game.t); }));
      var picked = byWk[wk].some(function (x) { return x.pick; });
      var allLocked = byWk[wk].every(function (x) { return x.locked; });
      var lockNote = allLocked ? "Picks locked · results replace them after Saturday" :
        "Picks lock at noon ET Saturday, or at kickoff for games on other days";
      var key = "w" + wk;
      if (S.open === null) S.open = key; // first remaining week starts open
      var nPicked = list.filter(function (x) { return x.pick; }).length;
      var summary = list.length + " games" + (nPicked ? " · " + nPicked + " picked" : "") + (allLocked ? " · Locked" : "");
      html += weekShell(key, "Week " + wk, esc(dateRange(first, last)) + " · " + esc(summary),
        '<p class="cfp-week-note">' + esc(lockNote) + "</p>" +
        (picked && !allLocked ? '<div class="cfp-week-tools"><button type="button" class="btn btn-ghost btn-sm" data-reset-week="' + wk + '">Reset week</button></div>' : "") +
        '<div class="cfp-games">' + list.map(function (x) { return gameHtml(x, T); }).join("") + "</div>");
    });
    return html;
  }
  // One week open at a time: tap a week's header to open it (and close the others).
  function weekShell(key, title, sub, body) {
    var open = S.open === key;
    return '<section class="cfp-week' + (open ? " is-open" : "") + '" id="cfp-' + key + '">' +
      '<button type="button" class="cfp-week-head" data-week="' + key + '" aria-expanded="' + open + '" aria-controls="cfp-body-' + key + '">' +
      "<span><span class=\"cfp-week-title\">" + title + '</span><span class="cfp-week-sub">' + sub + "</span></span>" +
      '<span class="cfp-chev" aria-hidden="true">' + (open ? "−" : "+") + "</span></button>" +
      (open ? '<div class="cfp-week-body" id="cfp-body-' + key + '">' + body + "</div>" : "") + "</section>";
  }
  function importance(x, T) {
    var a = T[x.game.a].baseRank, h = T[x.game.h].baseRank;
    if (a && h) return Math.min(a, h);
    if (a || h) return 100 + (a || h);
    return 1000;
  }
  function dateRange(a, b) {
    var o = { weekday: "short", month: "short", day: "numeric" };
    var s = et(a, o), e = et(b, o);
    return s === e ? s : s + " – " + e;
  }

  function gameHtml(x, T) {
    var g = x.game;
    var lockLabel = x.locked ? '<span class="cfp-lock">Locked</span>' : '<span>Locks ' + esc(et(x.lockAt, { weekday: "short", hour: "numeric", minute: "2-digit" })) + "</span>";
    return '<div class="cfp-game' + (x.locked ? " is-locked" : "") + '">' +
      '<div class="cfp-game-meta"><span>' + esc(kick(g)) + (g.conf ? "" : " · Non-conf.") + "</span>" + lockLabel + "</div>" +
      favLine(x, T) +
      side(x, g.a, T) + side(x, g.h, T, true) + "</div>";
  }
  // "Favorite: Miami −7.5 · FPI 64%" (line from ESPN's odds; FPI is ESPN's matchup prediction)
  function favLine(x, T) {
    var f = x.fav;
    if (!f || f.src === "rank") return "";
    var t = T[f.key], bits = [];
    if (f.src === "line") bits.push(esc(f.line));
    if (f.prob != null) bits.push((f.src === "fpi-rating" ? "FPI rating " : "FPI ") + Math.round(100 * f.prob) + "%");
    return '<div class="cfp-fav">Favorite: <b>' + esc(t.name) + "</b> · " + bits.join(" · ") + "</div>";
  }
  function side(x, k, T, home) {
    var t = T[k], won = x.winner === k;
    var cls = "cfp-side" + (won ? (x.pick ? " is-pick" : " is-fav") : " is-loser");
    var rk = t.baseRank ? '<span class="cfp-rank">' + t.baseRank + "</span>" : "";
    var orig = S.data.records[k];
    var r0 = orig ? orig[0] + "-" + orig[1] : "";
    var label = won ? (x.pick ? "Your pick" : "Favorite") : "";
    return '<button type="button" class="' + cls + '" data-game="' + esc(x.game.id) + '" data-team="' + esc(k) + '"' +
      (x.locked ? " disabled" : "") + ' aria-pressed="' + (won && !!x.pick) + '">' +
      (home ? '<span class="cfp-at">@</span>' : "") + logo(t) + rk + '<span class="cfp-name">' + esc(t.name) + "</span>" +
      '<span class="cfp-rec">' + esc(r0) + "</span>" + (label ? '<span class="cfp-tag">' + label + "</span>" : "") + "</button>";
  }

  function ccgHtml(r, T) {
    if (!r.ccg.length) return "";
    if (S.open === null) S.open = "ccg";
    var body = '<p class="cfp-week-note">Matchups come from the standings your picks produce.</p><div class="cfp-games">';
    r.ccg.forEach(function (x) {
      var g = { id: x.id, a: x.a, h: x.h };
      var row = { game: g, winner: x.winner, pick: x.pick, locked: x.locked, fav: x.fav };
      body += '<div class="cfp-game' + (x.locked ? " is-locked" : "") + '"><div class="cfp-game-meta"><span>' + esc(x.conf) + " Championship</span>" +
        (x.locked ? '<span class="cfp-lock">Locked</span>' : "") + "</div>" + favLine(row, T) + side(row, x.a, T) + side(row, x.h, T) + "</div>";
    });
    body += "</div>";
    var nPicked = r.ccg.filter(function (x) { return x.pick; }).length;
    return weekShell("ccg", "Championship week", esc(shortDate(S.data.ccgDate)) + " · " + r.ccg.length + " title games" + (nPicked ? " · " + nPicked + " picked" : ""), body);
  }

  function racesHtml(r) {
    var html = '<div class="panel panel-pad"><h2>Conference races</h2>';
    Object.keys(r.races).forEach(function (c) {
      var x = r.races[c];
      html += '<div class="cfp-race"><div class="cfp-race-head">' + esc(c) + '<span>Champion: ' + esc(x.champ.name) + "</span></div>";
      var lists = x.divOrder.length === 2 ? x.divOrder : [x.order];
      lists.forEach(function (list, di) {
        if (x.divisions) html += '<div class="cfp-race-div">' + x.divisions[di] + "</div>";
        list.slice(0, 4).forEach(function (t, i) {
          var inG = t === x.a || t === x.b;
          html += '<div class="cfp-race-row' + (inG ? " in" : "") + '"><span>' + (i + 1) + ". " + esc(t.name) + "</span><span class=\"num\">" + t.cw + "-" + t.cl + "</span></div>";
        });
      });
      if (x.why) html += '<div class="cfp-race-why">' + esc(x.why) + "</div>";
      html += "</div>";
    });
    return html + "</div>";
  }

  function bracketHtml(r) {
    function slot(t) {
      if (!t) return '<div class="cfp-slot">—</div>';
      var tag = r.auto[t.key] === "P4" ? "Champ" : r.auto[t.key] === "G6" ? "G6" : t.key === "87" ? "ND" : "";
      return '<div class="cfp-slot"><span class="cfp-seed">' + t.seed + "</span>" + logo(t) + '<span class="cfp-name">' + esc(t.name) + "</span>" +
        '<span class="cfp-rec">' + rec(t) + "</span>" + (tag ? '<span class="cfp-tag">' + tag + "</span>" : "") + "</div>";
    }
    var html = '<div class="panel panel-pad" id="cfp-bracket"><h2>Projected bracket</h2>';
    r.pods.forEach(function (p) {
      html += '<div class="cfp-pod"><div class="cfp-pod-bye">Bye</div>' + slot(p.bye) + '<div class="cfp-pod-vs">First round</div>' + slot(p.hi) + slot(p.lo) + "</div>";
    });
    html += '<p class="panel-note">First four out: ' + esc(r.out.map(function (t) { return t.name; }).join(", ")) + "</p></div>";
    return html;
  }

  function top25Html(r) {
    var html = '<div class="panel panel-pad"><h2>Projected Top 25</h2><ol class="cfp-top25">';
    r.order.slice(0, 25).forEach(function (t) {
      var move = t.baseRank ? t.baseRank - t.rank : null;
      var mv = move === null ? '<span class="chg">new</span>' : move > 0 ? '<span class="chg up">▲' + move + "</span>" : move < 0 ? '<span class="chg down">▼' + (-move) + "</span>" : '<span class="chg">–</span>';
      html += "<li" + (t.seed ? ' class="in"' : "") + '><span class="cfp-seed">' + t.rank + "</span>" + logo(t) + '<span class="cfp-name">' + esc(t.name) + "</span>" +
        '<span class="cfp-rec">' + rec(t) + "</span>" + mv + "</li>";
    });
    return html + "</ol></div>";
  }

  function howHtml() {
    var R = E.RULES, N = E.STEP_NAMES, s = E.SCORING;
    var rules = Object.keys(R).map(function (c) {
      return "<li><b>" + esc(c) + ":</b> " + R[c].two.map(function (k) { return N[k]; }).join(" → ") + ". <span class=\"faint\">" + esc(R[c].source) + "</span></li>";
    }).join("");
    return '<details class="panel panel-pad cfp-how"><summary><h2>How it projects</h2></summary>' +
      "<p>Every team starts with the points of its spot in the starting ranking (the committee publishes no points, so the Nth CFP team gets the Nth AP team's points). " +
      "A win over a ranked team adds " + Math.round(s.RANKED_WIN * 100) + "% of that team's points; any other win adds " + s.UNRANKED_WIN + ". " +
      "A loss costs " + s.RANKED_LOSS + " for a ranked team and " + s.UNRANKED_LOSS + " for an unranked one (" + s.CCG_LOSS + " in a title game). " +
      "Power 4 champions get +" + s.CHAMP_P4 + " (SEC and Big Ten champions another +" + s.CHAMP_TOP + "), other champions +" + s.CHAMP_OTHER + ", and 11-0 or better gets +" + s.UNBEATEN + ".</p>" +
      "<p><b>Favorites</b> (games you leave alone): the betting line when ESPN has one, otherwise ESPN's FPI matchup prediction. Title games and flex games use the gap in FPI ratings.</p>" +
      "<p><b>The field (2026 rules):</b> the SEC, Big Ten, Big 12 and ACC champions, plus the highest-ranked Group of 6 team. Notre Dame is in if it's in the top 12. " +
      "The rest go by ranking, and seeds 1–12 go straight by ranking.</p>" +
      "<p><b>Tiebreakers</b> follow each league's published order (two-team ties shown; ties of three or more use the multi-team order). " +
      "Steps that can't be projected, like SportSource ratings, scoring margin or committee rankings, use the projected ranking.</p><ul>" + rules + "</ul></details>";
  }

  function stripHtml(r) {
    return '<div class="cfp-strip" role="region" aria-label="Current bracket"><button type="button" class="cfp-strip-label" data-act="to-bracket" aria-label="Jump to the projected bracket">Bracket ↑</button><div class="cfp-strip-list">' +
      r.field.map(function (t) { return '<span class="cfp-chip' + (t.seed <= 4 ? " bye" : "") + '"><b>' + t.seed + "</b>" + esc(t.abbr) + "</span>"; }).join("") +
      "</div></div>";
  }

  // ---------- Admin tools: Tuesday rankings and pick analytics ----------
  function adminHtml(r, T) {
    var html = '<section class="panel panel-pad cfp-admin"><h2>Enter the CFP Top 25</h2>' +
      '<p class="panel-note">Paste the committee\'s rankings, one team per line (numbers and records are fine: "1. Miami (9-0)"). ' +
      "Check the matches, then save. Everyone's projector starts from the newest ranking the next time they open it." +
      (S.ranking ? " Current: " + esc(shortDate(S.ranking.date)) + "." : "") + "</p>";
    if (!S.entry) {
      html += '<textarea id="cfp-paste" rows="6" placeholder="1. Miami&#10;2. Georgia&#10;3. Utah&#10;…"></textarea>' +
        '<div><button type="button" class="btn btn-ghost btn-sm" data-act="parse">Match teams</button></div>';
    } else {
      var opts = TEAMS.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
      html += '<label class="field">Release date <input type="date" id="cfp-date" value="' + esc(S.entry.date) + '"></label><ol class="cfp-entry">';
      for (var i = 0; i < 25; i++) {
        var row = S.entry.rows[i] || { text: "", id: "" };
        html += '<li><span class="cfp-entry-raw">' + esc(row.text || "—") + '</span><select data-entry="' + i + '"><option value="">Pick a team</option>' +
          opts.map(function (t) { return '<option value="' + t.id + '"' + (String(t.id) === String(row.id) ? " selected" : "") + ">" + esc(t.name) + "</option>"; }).join("") +
          "</select></li>";
      }
      html += '</ol><div class="cfp-btns"><button type="button" class="btn btn-primary btn-sm" data-act="save-rank">Save ranking</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="cancel-rank">Cancel</button><span id="cfp-rank-msg" class="form-error"></span></div>';
    }
    html += "</section>";
    html += '<section class="panel panel-pad cfp-admin"><h2>Pick analytics</h2>' +
      (S.stats ? statsHtml(r, T) : '<div><button type="button" class="btn btn-ghost btn-sm" data-act="stats">Load pick analytics</button></div>') + "</section>";
    return html;
  }

  function statsHtml(r, T) {
    if (!S.stats.length) return '<p class="panel-note">No saved picks yet (or the CFP Projector SQL hasn\'t been run).</p>';
    var people = S.stats[0].people;
    var by = {};
    S.stats.forEach(function (s) { (by[s.game_id] = by[s.game_id] || {})[s.team_id] = Number(s.picks); });
    var rows = [];
    r.games.forEach(function (x) {
      var c = by[x.game.id];
      if (!c) return;
      var dog = x.favorite === x.game.a ? x.game.h : x.game.a;
      var nd = c[dog] || 0, nf = c[x.favorite] || 0;
      if (nd + nf) rows.push({ fav: T[x.favorite], dog: T[dog], nd: nd, n: nd + nf });
    });
    rows.sort(function (a, b) { return b.nd / b.n - a.nd / a.n || b.n - a.n; });
    return '<p class="panel-note">' + people + " people have saved picks. Most-picked upsets (share of people who picked that game):</p>" +
      '<ol class="cfp-stats">' + rows.slice(0, 15).map(function (x) {
        return "<li><b>" + esc(x.dog.name) + "</b> over " + esc(x.fav.name) + ' <span class="num">' + Math.round(100 * x.nd / x.n) + "% · " + x.n + " picks</span></li>";
      }).join("") + "</ol>";
  }

  // Ranking paste: match each line to a team
  var ALIASES = {
    "miami fl": "Miami", "miami (fl)": "Miami", "the u": "Miami", "miami ohio": "Miami (OH)", "miami (oh)": "Miami (OH)",
    "southern cal": "USC", "southern california": "USC", "texas am": "Texas A&M", "texas a and m": "Texas A&M", "tamu": "Texas A&M",
    "pitt": "Pittsburgh", "nc state": "NC State", "north carolina state": "NC State", "hawaii": "Hawai'i", "san jose state": "San José State",
    "ole miss": "Ole Miss", "mississippi": "Ole Miss", "byu": "BYU", "brigham young": "BYU", "smu": "SMU", "ucf": "UCF", "tcu": "TCU",
    "lsu": "LSU", "unlv": "UNLV", "uconn": "UConn", "app state": "App State", "appalachian state": "App State", "ulm": "UL Monroe",
    "louisiana monroe": "UL Monroe", "jmu": "James Madison", "fiu": "FIU", "utsa": "UTSA", "uab": "UAB", "utep": "UTEP", "usf": "South Florida",
    "fau": "Florida Atlantic", "wku": "Western Kentucky", "niu": "Northern Illinois", "ndsu": "North Dakota State"
  };
  function norm(s) { return s.toLowerCase().replace(/&/g, " and ").replace(/[.'’]/g, "").replace(/é/g, "e").replace(/\s+/g, " ").trim(); }
  function matchTeam(line) {
    var s = line.replace(/^\s*(no\.?\s*)?\d+[.)\s-]*/i, "").replace(/\(\s*\d+\s*-\s*\d+\s*\)/g, "").replace(/\b\d+\s*-\s*\d+\b/g, "").trim();
    var n = norm(s), bare = norm(s.replace(/\(.*?\)/g, ""));
    var byName = {};
    TEAMS.forEach(function (t) { byName[norm(t.name)] = t; byName[norm(t.abbr)] = byName[norm(t.abbr)] || t; });
    var hit = byName[n] || (ALIASES[n] && byName[norm(ALIASES[n])]) || byName[bare] || (ALIASES[bare] && byName[norm(ALIASES[bare])]);
    if (!hit) hit = byName[n.replace(/\bst\b/g, "state")] || byName[bare.replace(/\bst\b/g, "state")];
    return { text: s, id: hit ? String(hit.id) : "" };
  }
  function nextTuesday() {
    var d = new Date(), p = d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    var wd = new Date(p + "T12:00:00Z").getUTCDay();
    var back = (wd - 2 + 7) % 7;
    var t = new Date(Date.parse(p + "T12:00:00Z") - back * 86400000);
    return t.toISOString().slice(0, 10);
  }

  // ---------- Share image ----------
  async function shareImage() {
    var r = run();
    var cv = document.createElement("canvas");
    cv.width = 1080; cv.height = 1350;
    var c = cv.getContext("2d");
    var DISPLAY = '"Saira Extra Condensed", "Arial Narrow", sans-serif', BODY = '"Archivo", Arial, sans-serif';
    if (document.fonts && document.fonts.load) await Promise.all([document.fonts.load("800 80px " + DISPLAY), document.fonts.load("600 30px " + BODY)]).catch(function () {});
    function img(src) { return new Promise(function (res) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = src; }); }
    var logos = await Promise.all([img("assets/cfa-logo.png")].concat(r.field.map(function (t) { return CFA.LOGOS_AVAILABLE ? img("logos/" + t.id + ".png") : Promise.resolve(null); })));
    c.fillStyle = "#0b0b0c"; c.fillRect(0, 0, 1080, 1350);
    c.fillStyle = "#f36c21"; c.fillRect(0, 0, 1080, 10);
    if (logos[0]) { c.fillStyle = "#fff"; c.fillRect(64, 56, 96, 96); c.drawImage(logos[0], 68, 60, 88, 88); }
    c.fillStyle = "#f4f4f5"; c.font = "800 84px " + DISPLAY; c.textBaseline = "alphabetic";
    c.fillText("MY CFP BRACKET", 184, 128);
    c.fillStyle = "#a6a6ad"; c.font = "500 28px " + BODY;
    c.fillText("CFATop25.com · CFP Projector", 186, 166);
    var pods = r.pods, y0 = 222;
    pods.forEach(function (p, i) {
      var x = i % 2 ? 556 : 64, y = y0 + Math.floor(i / 2) * 470;
      c.fillStyle = "#151517"; c.fillRect(x, y, 460, 440);
      c.fillStyle = "#6f6f78"; c.font = "700 22px " + BODY; c.fillText("FIRST-ROUND BYE", x + 24, y + 42);
      row(p.bye, x, y + 56, true);
      c.fillStyle = "#6f6f78"; c.fillText("FIRST ROUND", x + 24, y + 196);
      row(p.hi, x, y + 210); row(p.lo, x, y + 320);
    });
    function row(t, x, y, bye) {
      if (!t) return;
      c.fillStyle = bye ? "#2a1a10" : "#1e1e21"; c.fillRect(x + 16, y, 428, 96);
      c.fillStyle = "#f36c21"; c.font = "800 52px " + DISPLAY; c.fillText(String(t.seed), x + 32, y + 66);
      c.fillStyle = "#f1f1f3"; c.beginPath(); c.arc(x + 128, y + 48, 34, 0, Math.PI * 2); c.fill();
      var im = logos[r.field.indexOf(t) + 1];
      if (im) c.drawImage(im, x + 102, y + 22, 52, 52);
      c.fillStyle = "#f4f4f5";
      var name = t.name.toUpperCase(), size = 40;
      c.font = "800 " + size + "px " + DISPLAY;
      while (c.measureText(name).width > 250 && size > 28) { size -= 2; c.font = "800 " + size + "px " + DISPLAY; }
      while (c.measureText(name).width > 250 && name.length > 3) name = name.slice(0, -1);
      c.fillText(name, x + 178, y + 58);
      c.fillStyle = "#a6a6ad"; c.font = "500 22px " + BODY;
      var sub = rec(t) + (t.champOf ? " · " + t.champOf + " champ" : "");
      if (c.measureText(sub).width > 250) sub = rec(t) + (t.champOf ? " · " + ({ "Mountain West": "MWC", "American": "AAC" }[t.champOf] || t.champOf) + " champ" : "");
      while (c.measureText(sub).width > 250 && sub.length > 4) sub = sub.slice(0, -1);
      c.fillText(sub, x + 180, y + 84);
    }
    c.fillStyle = "#a6a6ad"; c.font = "600 24px " + BODY;
    c.fillText("First four out: " + r.out.map(function (t) { return t.name; }).join(", "), 64, 1210);
    c.fillStyle = "#f36c21"; c.font = "800 40px " + DISPLAY;
    c.fillText("MAKE YOUR OWN AT CFATOP25.COM/CFP", 64, 1290);
    return new Promise(function (res) { cv.toBlob(function (b) { res({ blob: b, url: cv.toDataURL("image/png") }); }, "image/png"); });
  }
  async function openShare() {
    var box = document.getElementById("cfp-share");
    box.innerHTML = '<div class="panel panel-pad"><p class="panel-note">Drawing your bracket…</p></div>';
    var out = await shareImage();
    var file = new File([out.blob], "cfa-cfp-bracket.png", { type: "image/png" });
    var canShare = navigator.canShare && navigator.canShare({ files: [file] });
    box.innerHTML = '<div class="panel panel-pad cfp-share"><img src="' + out.url + '" alt="Your projected CFP bracket">' +
      '<div class="cfp-btns">' + (canShare ? '<button type="button" class="btn btn-primary btn-sm" data-act="native-share">Share</button>' : "") +
      '<a class="btn btn-ghost btn-sm" download="cfa-cfp-bracket.png" href="' + out.url + '">Download</a>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-act="close-share">Close</button></div></div>';
    S.shareFile = file;
  }

  // ---------- Events ----------
  function wire(app) {
    app.onclick = async function (e) {
      if (e.target.id === "cfp-signin-sheet") { closeSignIn(); return; }
      var b = e.target.closest("button, [data-act]");
      if (!b || b.disabled) return;
      if (!DB.user() && (b.dataset.game || b.dataset.resetWeek || b.dataset.act === "share" || b.dataset.act === "reset")) {
        // Remember the tapped pick so it's waiting after sign-in.
        if (b.dataset.game) { S.pending = b.dataset.game; S.picks[b.dataset.game] = b.dataset.team; try { localStorage.setItem(KEY, JSON.stringify(S.picks)); } catch (x) {} }
        askSignIn(app); return;
      }
      if (b.dataset.act === "signin") { DB.signIn(); return; }
      if (b.dataset.act === "close-signin") { closeSignIn(); return; }
      if (b.dataset.game) {
        var k = b.dataset.game, t = b.dataset.team;
        if (S.picks[k] === t) delete S.picks[k]; else S.picks[k] = t;
        persist(); draw(app); return;
      }
      if (b.dataset.base) { S.baseline = b.dataset.base; try { localStorage.setItem(KEY + "-base", S.baseline); } catch (x) {} draw(app); return; }
      if (b.dataset.show) { S.show = b.dataset.show; draw(app); return; }
      if (b.dataset.week) {
        S.open = S.open === b.dataset.week ? "" : b.dataset.week;
        draw(app);
        var sec = document.getElementById("cfp-" + b.dataset.week);
        if (S.open && sec && sec.getBoundingClientRect().top < 70) sec.scrollIntoView({ block: "start" });
        return;
      }
      if (b.dataset.resetWeek) {
        var wk = Number(b.dataset.resetWeek), now = Date.now();
        S.data.games.forEach(function (g) { if (g.wk === wk && now < E.lockAt(g)) delete S.picks[g.id]; });
        persist(); draw(app); return;
      }
      var act = b.dataset.act;
      if (act === "reset") {
        if (!confirmReset(b)) return;
        var keep = {};
        // Locked picks stay; everything else clears.
        run().games.forEach(function (x) { if (x.locked && S.picks[x.game.id]) keep[x.game.id] = S.picks[x.game.id]; });
        S.picks = keep; persist(); draw(app);
      } else if (act === "share") openShare();
      else if (act === "to-bracket") document.getElementById("cfp-bracket").scrollIntoView({ block: "start" });
      else if (act === "close-share") document.getElementById("cfp-share").innerHTML = "";
      else if (act === "native-share" && S.shareFile) navigator.share({ files: [S.shareFile], text: "My CFP bracket. Build yours: https://cfatop25.com/cfp" }).catch(function () {});
      else if (act === "parse") {
        var lines = (document.getElementById("cfp-paste").value || "").split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 25);
        S.entry = { date: nextTuesday(), rows: lines.map(matchTeam) };
        draw(app);
      } else if (act === "cancel-rank") { S.entry = null; draw(app); }
      else if (act === "save-rank") {
        var ids = [], msg = document.getElementById("cfp-rank-msg");
        app.querySelectorAll("[data-entry]").forEach(function (s) { ids.push(s.value); });
        if (ids.some(function (v) { return !v; })) { msg.textContent = "Pick a team for every spot."; return; }
        if (new Set(ids).size !== 25) { msg.textContent = "A team is listed twice."; return; }
        var date = document.getElementById("cfp-date").value;
        b.disabled = true;
        try {
          await DB.saveCfpRanking(date, ids.map(Number));
          S.ranking = { date: date, top25: ids }; S.entry = null; S.baseline = "cfp"; draw(app);
        } catch (err) { b.disabled = false; msg.textContent = "Couldn't save: " + (err.message || err) + " (has supabase/cfp_projector.sql been run?)"; }
      } else if (act === "stats") {
        b.disabled = true; S.stats = (await DB.cfpPickStats()) || []; draw(app);
      }
    };
    app.onchange = function (e) {
      var s = e.target;
      if (s.dataset && s.dataset.entry !== undefined && S.entry) { S.entry.rows[+s.dataset.entry] = { text: (S.entry.rows[+s.dataset.entry] || {}).text || "", id: s.value }; }
      if (s.id === "cfp-date" && S.entry) S.entry.date = s.value;
    };
  }
  // "Not now": drop the pick that was waiting for sign-in.
  function closeSignIn() {
    var m = document.getElementById("cfp-signin-sheet");
    if (m) m.remove();
    if (S.pending) { delete S.picks[S.pending]; S.pending = null; try { localStorage.setItem(KEY, JSON.stringify(S.picks)); } catch (x) {} }
  }
  function askSignIn(app) {
    if (document.getElementById("cfp-signin-sheet")) return;
    var d = document.createElement("div");
    d.id = "cfp-signin-sheet"; d.className = "cfp-sheet"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Sign in to make picks");
    d.innerHTML = '<div class="cfp-sheet-card"><h2>Sign in to make your picks</h2>' +
      '<p class="panel-note">Free with Google. Your picks save to your account and follow you to any device. The pick you just tapped will be waiting.</p>' +
      '<div class="cfp-btns"><button type="button" class="btn btn-primary" data-act="signin">Sign in with Google</button>' +
      '<button type="button" class="btn btn-ghost" data-act="close-signin">Not now</button></div></div>';
    app.querySelector(".cfp").appendChild(d);
    d.querySelector("[data-act=signin]").focus();
  }
  function confirmReset(b) {
    if (b.dataset.armed) return true;
    b.dataset.armed = "1"; b.textContent = "Tap again to reset";
    setTimeout(function () { if (b.isConnected) { delete b.dataset.armed; b.textContent = "Reset all"; } }, 3000);
    return false;
  }

  window.CFP = { render: render };
})();
