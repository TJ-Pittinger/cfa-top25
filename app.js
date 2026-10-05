// CFA Top 25: pages and routing.
(function () {
  var app = document.getElementById("app");
  var authBox = document.getElementById("auth");

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(n) { return Number(n).toLocaleString("en-US"); }
  function etDay(iso) { return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" }); }
  function etTime(iso) { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET"; }
  // Voting closes at midnight; show it as 11:59 PM
  function closeAt(w) { var d = new Date(new Date(w.closes_at).getTime() - 60000).toISOString(); return etDay(d) + " at " + etTime(d); }
  function liveLine(w) { return DB.isLive(w) ? '<span class="live-dot" aria-hidden="true"></span>Live · updates until ' + closeAt(w) : "Final"; }
  function weekLabel(w) { return w.week === 0 ? "Test week" : "Week " + w.week; }
  function logo(t, size) {
    size = size || "md";
    if (CFA.LOGOS_AVAILABLE) {
      return '<img class="tl tl-' + size + '" src="logos/' + t.id + '.png" alt="" data-abbr="' + esc(t.abbr) + '" loading="lazy">';
    }
    return '<span class="tl tl-badge tl-' + size + '" aria-hidden="true">' + esc(t.abbr) + "</span>";
  }
  document.addEventListener("error", function (e) {
    var img = e.target;
    if (img.tagName === "IMG" && img.classList.contains("tl")) {
      var span = document.createElement("span");
      span.className = img.className + " tl-badge";
      span.textContent = img.dataset.abbr || "";
      img.replaceWith(span);
    }
  }, true);
  function initials(name) { return String(name || "?").split(/\s+/).map(function (p) { return p[0] || ""; }).join("").slice(0, 2).toUpperCase(); }
  var ICON = {
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key) || "null");
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function change(prevRank, rank) {
    if (!prevRank) return '<span class="chg new">NEW</span>';
    var d = prevRank - rank;
    if (d > 0) return '<span class="chg up">▲ ' + d + '<span class="visually-hidden"> up</span></span>';
    if (d < 0) return '<span class="chg down">▼ ' + -d + '<span class="visually-hidden"> down</span></span>';
    return '<span class="chg same">–<span class="visually-hidden"> no change</span></span>';
  }
  function loading(text) { app.innerHTML = '<div class="panel panel-pad loading">' + esc(text || "Loading…") + "</div>"; }
  function errorBox(err) {
    console.error(err);
    return '<div class="panel panel-pad error-box"><h2>Something went wrong</h2><p class="panel-note">' +
      esc((err && err.message) || "Couldn't reach the database.") + " Refresh the page to try again.</p></div>";
  }
  function rankMap(poll) {
    var m = {};
    if (poll) poll.ranked.forEach(function (r) { m[r.teamId] = r.rank; });
    return m;
  }

  // ---------- header sign-in area ----------
  function renderAuth() {
    var u = DB.user();
    if (!u) {
      authBox.innerHTML = '<button type="button" class="btn btn-ghost" id="signin">Sign in</button>';
      document.getElementById("signin").addEventListener("click", function () { DB.signIn(); });
      return;
    }
    var name = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || u.email;
    authBox.innerHTML = (DB.isAdmin() ? '<a href="#admin" data-nav="admin">Admin</a>' : "") +
      '<span class="who" title="' + esc(u.email) + '"><span class="avatar avatar-sm">' + esc(initials(name)) + "</span>" +
      '<span class="who-name">' + esc(name.split(" ")[0]) + "</span></span>" +
      '<button type="button" class="btn btn-ghost btn-sm" id="signout">Sign out</button>';
    document.getElementById("signout").addEventListener("click", function () { DB.signOut(); });
  }
  function signInPanel(why) {
    return '<section class="panel done"><div class="eyebrow"><b>Sign in to vote</b></div><h1>Your Top 25</h1>' +
      '<p class="lede">' + esc(why) + '</p><button type="button" class="btn btn-primary" id="signin2">Sign in with Google</button>' +
      '<p class="panel-note">One ballot per Google account each week. Fan ballots are private; only the totals are shown.</p></section>';
  }

  function voteCard() {
    var open = DB.openWeek(), next = DB.nextWeek();
    if (open && open.week > 0) {
      return '<div class="panel panel-pad callout"><div class="eyebrow"><b>' + weekLabel(open) + ' voting is open</b></div>' +
        '<p class="panel-note" style="color:var(--fg)">Voting closes ' + closeAt(open) + ". " +
        (new Date(open.release_at) <= new Date() ? "Results are live now and update as ballots come in." : "Results go live " + etDay(open.release_at) + " at " + etTime(open.release_at) + " and update until voting closes.") + "</p>" +
        '<a class="btn btn-primary" href="#vote">Cast your ballot</a></div>';
    }
    if (next) {
      return '<div class="panel panel-pad callout"><div class="eyebrow"><b>' + weekLabel(next) + ' voting</b></div>' +
        '<p class="panel-note" style="color:var(--fg)">Opens ' + etDay(next.opens_at) + " at " + etTime(next.opens_at) +
        " and closes " + closeAt(next) + ". Results go live at " + etTime(next.release_at) + ". Sign in with Google to vote.</p></div>";
    }
    return "";
  }

  function firstPollEmpty(title) {
    var next = DB.nextWeek() || DB.openWeek();
    return '<div class="page-head"><div><div class="eyebrow"><b>' + esc(title) + "</b></div><h1>CFA Top 25</h1>" +
      '<p class="lede">' + (next ? "The first poll goes live " + etDay(next.release_at) + " at " + etTime(next.release_at) +
        ". Voting opens " + etDay(next.opens_at) + " at " + etTime(next.opens_at) + "." : "No poll has been released yet.") + "</p></div></div>" +
      '<div class="layout"><section class="main-col panel panel-pad"><h2>How it works</h2>' +
      '<p class="panel-note" style="color:var(--fg)">Every Sunday from 2:00 AM to 11:59 PM ET, voters rank their Top 25. Results go live at 1:00 PM ET and update as ballots come in. ' +
      "A 1st-place vote is worth 25 points, 2nd is worth 24, down to 1 point for 25th, just like the AP poll.</p>" +
      '<p class="panel-note">The Media Poll comes from 50 invited voters, and every media ballot is public. The Fan Poll is open to anyone with a Google account; fan ballots stay private and only the totals are shown.</p></section>' +
      '<aside class="side-col">' + voteCard() + "</aside></div>";
  }

  function pollTabs(which) {
    function tab(id, href, label) { return '<a href="' + href + '"' + (which === id ? ' aria-current="page"' : "") + ">" + label + "</a>"; }
    return '<nav class="tabs" aria-label="Polls">' + tab("media", "#poll", "Media Poll") + tab("fans", "#fans", "Fan Poll") + tab("compare", "#compare", "Media vs. Fans") + "</nav>";
  }

  // ---------- Results ----------
  async function renderPoll(which) {
    var w = DB.releasedWeek();
    if (!w) { app.innerHTML = firstPollEmpty("Coming soon"); return; }
    loading();
    var kind = which === "fans" ? "fan" : "media";
    var prevW = DB.weekByNumber(w.week - 1);
    var res = await Promise.all([
      DB.poll(w.week, kind),
      prevW && prevW.week > 0 ? DB.poll(prevW.week, kind) : null,
      DB.records(w.week),
      kind === "media" ? DB.mediaBallots(w.week) : [],
      DB.counts(w.week)
    ]);
    var poll = res[0], prev = rankMap(res[1]), records = res[2], ballots = res[3], counts = res[4];
    var countText = kind === "media"
      ? fmt(counts.media) + " of " + fmt(counts.mediaVoters) + " ballots submitted"
      : fmt(counts.fan) + " ballots submitted";
    var isFans = kind === "fan";

    var body;
    if (!poll.ballotCount) {
      body = '<section class="main-col panel panel-pad"><h2>No ballots</h2><p class="panel-note">No ' + (isFans ? "fan" : "media") +
        " ballots were cast for " + weekLabel(w) + ".</p></section>";
    } else {
      var rows = poll.ranked.map(function (r) {
        var t = team(r.teamId);
        return '<tr><td class="rank num">' + r.rank + "</td>" +
          '<td><div class="team-cell">' + logo(t) + '<div style="min-width:0"><div class="team-name">' + esc(t.name) +
          '</div><div class="team-conf">' + esc(t.conf) + "</div></div></div></td>" +
          '<td class="rec num">' + esc(records[t.id] || "") + "</td>" +
          '<td class="r pts num">' + fmt(r.pts) + "</td>" +
          '<td class="r fpv num">' + (r.fpv ? "(" + fmt(r.fpv) + ")" : "") + "</td>" +
          '<td class="r">' + (res[1] ? change(prev[r.teamId], r.rank) : "") + "</td></tr>";
      }).join("");
      var others = poll.others.slice(0, 15).map(function (r) { return esc(team(r.teamId).name) + " " + fmt(r.pts); }).join(", ");
      body = '<section class="main-col panel" aria-label="Top 25">' +
        '<div class="table-scroll"><table class="poll"><thead><tr><th>Rk</th><th>Team</th><th>Record</th><th class="r">Pts</th><th class="r">1st</th><th class="r">Chg</th></tr></thead>' +
        "<tbody>" + rows + "</tbody></table></div>" +
        (others ? '<div class="others"><b>Others receiving votes:</b> ' + others + "</div>" : "") + "</section>";
    }

    var side;
    if (isFans) {
      side = '<div class="panel panel-pad"><h2>Fan ballots</h2><div class="big-stat num">' + fmt(counts.fan) + "</div>" +
        '<p class="panel-note">Anyone can vote with a Google account, one ballot per week. Fan ballots are private; only the totals are shown.</p></div>';
    } else if (ballots.length) {
      var voters = ballots.slice(0, 5).map(function (b) {
        return '<a href="#ballot-' + esc(b.id) + '"><span style="display:flex;flex-direction:column"><span class="v-name">' + esc(b.name) +
          '</span><span class="v-outlet">' + esc(b.outlet) + '</span></span><span class="v-outlet">#1 ' + esc(team(b.ranks[0]).abbr) + "</span></a>";
      }).join("");
      side = '<div class="panel panel-pad"><div style="display:flex;justify-content:space-between;align-items:baseline"><h2>Who voted</h2>' +
        '<span class="v-outlet num">' + fmt(counts.media) + " of " + fmt(counts.mediaVoters) + "</span></div>" +
        '<p class="panel-note">Every media ballot is public. Click a name to see their Top 25.</p>' +
        '<div class="voter-list">' + voters + "</div>" +
        '<a class="btn btn-ghost" href="#ballots">See all ' + ballots.length + " ballots</a></div>";
    } else side = "";

    app.innerHTML =
      '<div class="page-head"><div><div class="eyebrow"><b>' + weekLabel(w) + "</b> · " + liveLine(w) + "</div>" +
      "<h1>CFA " + (isFans ? "Fan" : "Media") + ' Poll</h1><p class="lede num">' + countText + "</p></div>" + pollTabs(which) + "</div>" +
      '<div class="layout">' + body + '<aside class="side-col">' + side + voteCard() + "</aside></div>";
  }

  async function renderCompare() {
    var w = DB.releasedWeek();
    if (!w) { app.innerHTML = firstPollEmpty("Coming soon"); return; }
    loading();
    var res = await Promise.all([DB.poll(w.week, "media"), DB.poll(w.week, "fan")]);
    var m = res[0], f = res[1];
    var mr = rankMap(m), fr = rankMap(f);
    var ids = [];
    m.ranked.forEach(function (r) { ids.push(r.teamId); });
    f.ranked.forEach(function (r) { if (ids.indexOf(r.teamId) < 0) ids.push(r.teamId); });
    var biggest = null;
    var rows = ids.map(function (id) {
      var t = team(id), a = mr[id], b = fr[id], chip;
      if (a && b) {
        var d = a - b;
        if (!biggest || Math.abs(d) > Math.abs(biggest.d)) biggest = { t: t, a: a, b: b, d: d };
        chip = d === 0 ? '<span class="gap-chip">Same</span>' :
          d > 0 ? '<span class="gap-chip fans">Fans +' + d + "</span>" : '<span class="gap-chip media">Media +' + -d + "</span>";
      } else {
        chip = a ? '<span class="gap-chip media">Media only</span>' : '<span class="gap-chip fans">Fans only</span>';
      }
      return '<tr><td><div class="team-cell">' + logo(t, "sm") + '<span class="team-name">' + esc(t.name) + "</span></div></td>" +
        '<td class="r num pts">' + (a || "NR") + '</td><td class="r num pts">' + (b || "NR") + '</td><td class="r">' + chip + "</td></tr>";
    }).join("");
    var note = biggest && biggest.d !== 0 ? "Biggest split: <b>" + esc(biggest.t.name) + "</b>, #" + biggest.a + " with the media and #" + biggest.b + " with fans." : "The two polls line up closely this week.";

    app.innerHTML =
      '<div class="page-head"><div><div class="eyebrow"><b>' + weekLabel(w) + "</b> · " + liveLine(w) + " · " + fmt(m.ballotCount) + " media ballots · " + fmt(f.ballotCount) + " fan ballots</div>" +
      "<h1>Media vs. Fans</h1></div>" + pollTabs("compare") + "</div>" +
      '<div class="layout"><section class="main-col panel"><div class="table-scroll"><table class="poll">' +
      '<thead><tr><th>Team</th><th class="r">Media</th><th class="r">Fans</th><th class="r">Who likes them more</th></tr></thead>' +
      "<tbody>" + (rows || '<tr><td colspan="4" class="no-results">No ballots this week.</td></tr>') + "</tbody></table></div></section>" +
      '<aside class="side-col"><div class="panel panel-pad"><h2>The split</h2><p class="panel-note" style="color:var(--fg)">' + note + "</p>" +
      '<p class="panel-note">Green means fans rank the team higher. Red means the media does.</p></div>' + voteCard() + "</aside></div>";
  }

  // ---------- Media ballots ----------
  function hottestTake(b, pollRanks) {
    var best = null;
    b.ranks.forEach(function (id, i) {
      var p = pollRanks[id] || 30, d = p - (i + 1);
      if (!best || d > best.d) best = { id: id, my: i + 1, p: p, d: d };
    });
    var t = team(best.id);
    if (best.d <= 0) return "Matched the poll's order";
    return best.p === 30 ? "Ranked " + t.name + " #" + best.my + " (poll: unranked)" : t.name + " at #" + best.my + " (poll: #" + best.p + ")";
  }

  async function renderBallots() {
    var w = DB.releasedWeek();
    if (!w) { app.innerHTML = firstPollEmpty("Media ballots"); return; }
    loading();
    var res = await Promise.all([DB.mediaBallots(w.week), DB.poll(w.week, "media")]);
    var ballots = res[0], pr = rankMap(res[1]);
    var teamOpts = TEAMS.slice().sort(function (a, b) { return a.name.localeCompare(b.name); })
      .map(function (t) { return '<option value="' + t.id + '">' + esc(t.name) + "</option>"; }).join("");
    app.innerHTML =
      '<div class="page-head"><div><div class="eyebrow"><b>' + weekLabel(w) + "</b> · Media Poll</div><h1>Media Ballots</h1>" +
      '<p class="lede">How each media voter ranked the teams this week. Fan ballots stay private.</p></div>' +
      '<a href="#poll">← Back to the poll</a></div>' +
      '<div class="filters"><div class="field"><label for="q">Search voters</label><input id="q" type="search" placeholder="Name or outlet"></div>' +
      '<div class="field"><label for="tf">Who ranked</label><select id="tf"><option value="">Any team</option>' + teamOpts + "</select></div></div>" +
      '<section class="panel"><div class="table-scroll"><table class="poll" style="min-width:720px"><thead><tr><th>Voter</th><th>Top 3</th><th>Hottest take</th><th class="r">Ballot</th></tr></thead>' +
      '<tbody id="rows"></tbody></table></div><div class="others" id="count"></div></section>';

    var q = document.getElementById("q"), tf = document.getElementById("tf");
    function draw() {
      var term = q.value.trim().toLowerCase(), tid = Number(tf.value);
      var list = ballots.filter(function (b) {
        return (!term || (b.name + " " + b.outlet).toLowerCase().indexOf(term) >= 0) && (!tid || b.ranks.indexOf(tid) >= 0);
      });
      document.getElementById("rows").innerHTML = list.map(function (b) {
        var where = tid ? " · has " + esc(team(tid).abbr) + " #" + (b.ranks.indexOf(tid) + 1) : "";
        return '<tr class="voter-row"><td><div class="team-cell"><span class="avatar">' + esc(initials(b.name)) + "</span>" +
          '<div style="min-width:0"><a class="v-name" style="color:var(--accent)" href="#ballot-' + esc(b.id) + '">' + esc(b.name) + "</a>" +
          '<div class="v-outlet">' + esc(b.outlet) + where + "</div></div></div></td>" +
          '<td><div class="top3">' + b.ranks.slice(0, 3).map(function (id) { return logo(team(id), "sm"); }).join("") + "</div></td>" +
          '<td class="take">' + esc(hottestTake(b, pr)) + "</td>" +
          '<td class="r"><a href="#ballot-' + esc(b.id) + '">View →</a></td></tr>';
      }).join("") || '<tr><td colspan="4" class="no-results">' + (ballots.length ? "No voters match. Try a different name or team." : "No media ballots this week.") + "</td></tr>";
      document.getElementById("count").textContent = "Showing " + list.length + " of " + ballots.length + " ballots";
    }
    q.addEventListener("input", draw);
    tf.addEventListener("change", draw);
    draw();
  }

  async function renderBallot(id) {
    var w = DB.releasedWeek();
    if (!w) { app.innerHTML = firstPollEmpty("Media ballots"); return; }
    loading();
    var res = await Promise.all([DB.mediaBallots(w.week), DB.poll(w.week, "media")]);
    var ballots = res[0], pr = rankMap(res[1]);
    var b = ballots.filter(function (x) { return x.id === id; })[0];
    if (!b) { app.innerHTML = '<div class="panel panel-pad"><p>That ballot could not be found. <a href="#ballots">See all ballots</a></p></div>'; return; }
    var idx = ballots.indexOf(b), prev = ballots[(idx - 1 + ballots.length) % ballots.length], next = ballots[(idx + 1) % ballots.length];
    var inTop = 0, swing = null;
    var lines = b.ranks.map(function (tid, i) {
      var t = team(tid), p = pr[tid] || null, d = p ? p - (i + 1) : null, diff;
      if (p) inTop++;
      if (p && (!swing || Math.abs(d) > Math.abs(swing.d))) swing = { t: t, d: d };
      if (!p) diff = '<span class="chg new">NR</span>';
      else if (d > 0) diff = '<span class="chg up">+' + d + "</span>";
      else if (d < 0) diff = '<span class="chg down">−' + -d + "</span>";
      else diff = '<span class="chg same">–</span>';
      return '<div class="ballot-line"><span class="slot-rank num">' + (i + 1) + "</span>" + logo(t, "sm") +
        '<span class="team-name">' + esc(t.name) + '</span><span class="poll-pos num">' + (p ? "Poll #" + p : "Poll: NR") +
        '</span><span style="width:40px;text-align:right">' + diff + "</span></div>";
    }).join("");
    var swingText = swing && swing.d !== 0 ? esc(swing.t.abbr) + " " + (swing.d > 0 ? "+" : "−") + Math.abs(swing.d) : "None";
    var pager = ballots.length > 1 ? '<span style="display:flex;gap:16px"><a href="#ballot-' + esc(prev.id) + '">← ' + esc(prev.name) +
      '</a><a href="#ballot-' + esc(next.id) + '">' + esc(next.name) + " →</a></span>" : "";

    app.innerHTML =
      '<div class="pager"><a href="#ballots">← All ' + weekLabel(w) + " ballots</a>" + pager + "</div>" +
      '<section class="panel ballot-head"><div class="ballot-who"><span class="avatar">' + esc(initials(b.name)) + "</span><div>" +
      '<div class="eyebrow"><b>Media Poll</b> · ' + weekLabel(w) + "</div><h1>" + esc(b.name) + "</h1>" +
      '<div class="v-outlet">' + (b.outlet ? esc(b.outlet) + " · " : "") + (b.entered ? "Posted on social media · entered by CFA " : "Submitted ") + etDay(b.submitted) + " at " + etTime(b.submitted) + "</div></div></div>" +
      '<div class="stats"><div class="stat"><div class="eyebrow">In the poll\'s Top 25</div><div class="num">' + inTop + " of 25</div></div>" +
      '<div class="stat"><div class="eyebrow">Biggest swing</div><div>' + swingText + "</div></div></div></section>" +
      '<section class="panel" style="margin-top:16px"><div class="ballot-grid">' + lines + "</div>" +
      '<div class="legend">Green: this voter ranked the team higher than the poll. Red: lower. NR: not in the poll\'s Top 25.</div></section>';
  }

  // ---------- Vote ----------
  var vote = null;

  // "Win vs #16 Iowa 32-16 · 6-0". Opponent rank = their CFA Media Poll rank going into the game.
  function gameLine(id, short) {
    var g = vote.games[id];
    if (!g || g.team_score == null) {
      var rec = (g && g.record) || vote.records[id];
      return '<span class="game">' + (short ? "Bye" : "Bye week" + (rec ? " · " + esc(rec) : "")) + "</span>";
    }
    var o = g.opp_id ? team(g.opp_id) : null;
    var oppName = o ? (short ? o.abbr : o.name) : (g.opp_name || "Opponent");
    var rk = g.opp_id && vote.oppRanks[g.opp_id] ? "#" + vote.oppRanks[g.opp_id] + " " : "";
    var res = g.won ? '<span class="w">' + (short ? "W" : "Win") + "</span>" : '<span class="l">' + (short ? "L" : "Loss") + "</span>";
    var where = g.home === false ? "at" : "vs";
    var score = g.team_score != null ? g.team_score + "-" + g.opp_score : "";
    if (short) return '<span class="game">' + res + " " + score + " " + where + " " + esc(rk + oppName) + "</span>";
    return '<span class="game">' + res + " " + where + " " + esc(rk + oppName) + " " + score + (g.record ? " · " + esc(g.record) : "") + "</span>";
  }

  async function renderVote() {
    if (!DB.user()) {
      app.innerHTML = signInPanel("Sign in with your Google account to rank your Top 25.");
      document.getElementById("signin2").addEventListener("click", function () { DB.signIn(); });
      return;
    }
    var w = DB.openWeek();
    if (!w) return renderVoteClosed();
    loading();
    var prevW = DB.weekByNumber(w.week - 1);
    var res = await Promise.all([
      DB.myBallots(), DB.games(w.week), DB.records(w.week),
      prevW && prevW.week > 0 && DB.isClosed(prevW) ? DB.poll(prevW.week, "media") : null
    ]);
    var kinds = DB.isMedia() ? ["media", "fan"] : ["fan"];
    vote = {
      week: w, mine: res[0], games: res[1], records: res[2], oppRanks: rankMap(res[3]),
      kinds: kinds, kind: kinds[0], slots: null, active: 0, q: "", conf: "", note: ""
    };
    loadSlots();
    drawVoteShell();
  }

  function draftKey() { return "cfa-draft:" + DB.user().id + ":" + (vote.admin ? vote.admin.email + ":" : "") + CFA.SEASON + ":" + vote.week.week + ":" + vote.kind; }

  // ---------- Admin: enter a media voter's ballot ----------
  var enterWeekChoice = {};
  async function renderEnter(email) {
    if (!DB.user() || !DB.isAdmin()) { app.innerHTML = '<div class="panel panel-pad"><h2>Admins only</h2></div>'; return; }
    loading();
    var voters = await DB.listMediaVoters();
    var v = voters.filter(function (x) { return x.email === email; })[0];
    if (!v) { app.innerHTML = '<div class="panel panel-pad"><p>That voter isn\'t on the media list. <a href="#admin">Back to admin</a></p></div>'; return; }
    var weeks = DB.weeks().filter(function (w) { return w.week > 0 && new Date(w.opens_at) <= new Date(); });
    var def = DB.openWeek() && DB.openWeek().week > 0 ? DB.openWeek() : (DB.releasedWeek() || weeks[weeks.length - 1]);
    var w = DB.weekByNumber(enterWeekChoice[email]) || def;
    if (!w) { app.innerHTML = '<div class="panel panel-pad"><p>No poll week has opened yet.</p></div>'; return; }
    var prevW = DB.weekByNumber(w.week - 1);
    var res = await Promise.all([
      DB.voterBallots(email), DB.games(w.week), DB.records(w.week),
      prevW && prevW.week > 0 && DB.isClosed(prevW) ? DB.poll(prevW.week, "media") : null
    ]);
    vote = {
      week: w, mine: res[0], games: res[1], records: res[2], oppRanks: rankMap(res[3]),
      kinds: ["media"], kind: "media", slots: null, active: 0, q: "", conf: "", note: "",
      admin: { email: email, name: v.name, outlet: v.outlet, weeks: weeks }
    };
    loadSlots();
    drawVoteShell();
  }

  function loadSlots() {
    var kind = vote.kind, wk = vote.week.week;
    var current = vote.mine.filter(function (b) { return b.week === wk && b.kind === kind; })[0];
    var last = vote.mine.filter(function (b) { return b.week < wk && b.week > 0 && b.kind === kind; })[0];
    var draft = store(draftKey());
    vote.submitted = current || null;
    vote.last = last || null;
    if (current) {
      vote.slots = current.ranks.slice();
      vote.note = vote.admin
        ? "<b>" + esc(vote.admin.name) + " already has a " + weekLabel(vote.week) + " ballot</b> (" + (current.entered_by_admin ? "entered by CFA" : "they voted on the site") + ", " + etDay(current.updated_at) + " at " + etTime(current.updated_at) + "). Saving replaces it."
        : "<b>You submitted this ballot " + etDay(current.updated_at) + " at " + etTime(current.updated_at) + ".</b> You can change it until " + closeAt(vote.week) + ".";
    } else if (draft && draft.length === 25) {
      vote.slots = draft;
      vote.note = "<b>Your draft is saved on this device.</b> It isn't counted until you submit.";
    } else if (last) {
      vote.slots = last.ranks.slice();
      vote.note = vote.admin
        ? "<b>" + esc(vote.admin.name) + "'s Week " + last.week + " ballot is filled in.</b> Adjust it to match what they posted, then save."
        : "<b>Your Week " + last.week + " ballot is filled in.</b> Each team shows how it did this weekend. Move teams, swap in new ones, then submit.";
    } else {
      vote.slots = new Array(25).fill(null);
      vote.note = vote.admin
        ? "<b>Enter " + esc(vote.admin.name) + "'s ballot.</b> Pick a slot, then a team, in the order they posted."
        : "<b>Welcome to the CFA Top 25.</b> Pick a slot on your ballot, then pick a team. Rank all 25 to submit.";
    }
    var empty = vote.slots.indexOf(null);
    vote.active = empty < 0 ? 0 : empty;
  }

  function drawVoteShell() {
    var w = vote.week;
    var kindTabs = vote.kinds.length > 1
      ? '<span class="tabs" role="group" aria-label="Ballot type">' + vote.kinds.map(function (k) {
          return '<button type="button" data-kind="' + k + '" aria-pressed="' + (k === vote.kind) + '">' + (k === "media" ? "Media ballot" : "Fan ballot") + "</button>";
        }).join("") + "</span>"
      : "";
    var chips = ['<button type="button" class="chip" data-conf="" aria-pressed="true">All ' + TEAMS.length + "</button>"]
      .concat(CONFERENCES.map(function (c) { return '<button type="button" class="chip" data-conf="' + esc(c) + '" aria-pressed="false">' + esc(c) + "</button>"; })).join("");

    app.innerHTML =
      (w.week === 0 ? '<div class="preview-banner"><b>Test week</b> Only admins can see this. Ballots here are deleted when you end the test week.</div>' : "") +
      (vote.admin
        ? '<div class="page-head"><div><div class="eyebrow"><b>Admin</b> · Entering a media ballot · <a href="#admin">Back to admin</a></div>' +
          "<h1>" + esc(vote.admin.name) + "</h1>" +
          '<p class="lede">' + esc(vote.admin.outlet || vote.admin.email) + ". The public ballot will say it was entered by CFA from their posted ballot. If they vote on the site themselves, their ballot replaces this one.</p>" +
          '<div class="field" style="margin-top:12px;max-width:240px"><label for="enter-week">Poll week</label><select id="enter-week">' +
          vote.admin.weeks.map(function (x) { return '<option value="' + x.week + '"' + (x.week === w.week ? " selected" : "") + ">" + weekLabel(x) + "</option>"; }).join("") +
          "</select></div></div>"
        : '<div class="page-head"><div><div class="eyebrow"><b>' + weekLabel(w) + " ballot</b> · Open until " + closeAt(w) + "</div>" +
          '<h1>Your Top 25</h1><p class="lede">Pick a slot, then pick a team. Drag teams or use the arrows to reorder.</p></div>') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + kindTabs + '<button type="button" class="btn btn-ghost" id="clear">Clear ballot</button></div></div>' +
      '<div id="vote-body"><div class="prefill-note"><span id="vote-note"></span><button type="button" class="btn btn-ghost" id="reset" hidden>Reset to last week</button></div>' +
      '<div class="vote-grid">' +
      '<section class="ballot-col panel" aria-label="Your ballot"><div class="col-head"><h2 id="ballot-title">Ballot</h2><span class="v-outlet" id="filled"></span></div>' +
      '<ol class="slots" id="slots"></ol></section>' +
      '<section class="picker-col panel" aria-label="Teams"><div class="picker-controls">' +
      '<label class="visually-hidden" for="team-search">Search teams</label><input class="search" id="team-search" type="search" placeholder="Search ' + TEAMS.length + ' FBS teams">' +
      '<div class="chips" role="group" aria-label="Conference">' + chips + "</div></div>" +
      '<div class="team-grid" id="team-grid"></div></section></div>' +
      '<div class="submit-bar"><div class="progress"><div class="progress-track"><div class="progress-fill" id="pfill"></div></div>' +
      '<span class="num" id="ptext"></span></div><span class="privacy" id="privacy"></span>' +
      '<span class="form-error" id="vote-error" role="alert"></span>' +
      '<button type="button" class="btn btn-primary" id="submit">Submit ballot</button></div></div>';

    document.getElementById("team-search").addEventListener("input", function (e) { vote.q = e.target.value.trim().toLowerCase(); drawGrid(); });
    app.querySelectorAll(".chip").forEach(function (c) {
      c.addEventListener("click", function () {
        vote.conf = c.dataset.conf;
        app.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", String(x === c)); });
        drawGrid();
      });
    });
    app.querySelectorAll("[data-kind]").forEach(function (k) {
      k.addEventListener("click", function () {
        vote.kind = k.dataset.kind;
        app.querySelectorAll("[data-kind]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === k)); });
        loadSlots(); drawAll();
      });
    });
    document.getElementById("clear").addEventListener("click", function () {
      vote.slots = new Array(25).fill(null); vote.active = 0; changed();
    });
    document.getElementById("reset").addEventListener("click", function () {
      if (!vote.last) return;
      vote.slots = vote.last.ranks.slice(); vote.active = 0; changed();
    });
    document.getElementById("submit").addEventListener("click", submit);
    var ew = document.getElementById("enter-week");
    if (ew) ew.addEventListener("change", function () {
      enterWeekChoice[vote.admin.email] = Number(ew.value);
      renderEnter(vote.admin.email).catch(showError);
    });
    drawAll();
  }

  function changed() { store(draftKey(), vote.slots); drawAll(); }
  function drawAll() { drawSlots(); drawGrid(); drawFooter(); }

  function drawSlots() {
    document.getElementById("vote-note").innerHTML = vote.note;
    document.getElementById("reset").hidden = !vote.last;
    document.getElementById("ballot-title").textContent = vote.kind === "media" ? "Media ballot" : "Ballot";
    var html = vote.slots.map(function (id, i) {
      var t = id ? team(id) : null;
      var label = t ? logo(t, "sm") + '<span class="slot-team"><span class="team-name">' + esc(t.name) + "</span>" + gameLine(t.id) + "</span>"
                    : '<span class="slot-empty">' + (i === vote.active ? "Pick a team →" : "Empty") + "</span>";
      var tools = t ? '<div class="slot-tools">' +
        '<button type="button" class="icon-btn" data-move="-1" data-i="' + i + '" aria-label="Move ' + esc(t.name) + ' up"' + (i === 0 ? " disabled" : "") + ">" + ICON.up + "</button>" +
        '<button type="button" class="icon-btn" data-move="1" data-i="' + i + '" aria-label="Move ' + esc(t.name) + ' down"' + (i === 24 ? " disabled" : "") + ">" + ICON.down + "</button>" +
        '<button type="button" class="icon-btn" data-remove="' + i + '" aria-label="Remove ' + esc(t.name) + '">' + ICON.x + "</button></div>" : "";
      return '<li class="slot' + (i === vote.active ? " active" : "") + '" data-slot="' + i + '"' + (t ? ' draggable="true"' : "") + ">" +
        '<button type="button" class="slot-pick" data-pick="' + i + '" aria-label="Slot ' + (i + 1) + (t ? ", " + esc(t.name) : ", empty") + '">' +
        '<span class="slot-rank num">' + (i + 1) + "</span>" + label + "</button>" + tools + "</li>";
    }).join("");
    var list = document.getElementById("slots");
    list.innerHTML = html;
    document.getElementById("filled").textContent = vote.slots.filter(Boolean).length + " of 25";

    list.querySelectorAll("[data-pick]").forEach(function (b) {
      b.addEventListener("click", function () { vote.active = Number(b.dataset.pick); drawSlots(); drawGrid(); });
    });
    list.querySelectorAll("[data-move]").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = Number(b.dataset.i), j = i + Number(b.dataset.move);
        var x = vote.slots[i]; vote.slots[i] = vote.slots[j]; vote.slots[j] = x;
        vote.active = j; changed();
      });
    });
    list.querySelectorAll("[data-remove]").forEach(function (b) {
      b.addEventListener("click", function () { var i = Number(b.dataset.remove); vote.slots[i] = null; vote.active = i; changed(); });
    });
    var from = null;
    list.querySelectorAll(".slot").forEach(function (li) {
      li.addEventListener("dragstart", function (e) { from = Number(li.dataset.slot); e.dataTransfer.effectAllowed = "move"; });
      li.addEventListener("dragover", function (e) { e.preventDefault(); li.classList.add("drag-over"); });
      li.addEventListener("dragleave", function () { li.classList.remove("drag-over"); });
      li.addEventListener("drop", function (e) {
        e.preventDefault();
        var to = Number(li.dataset.slot);
        if (from === null || from === to) return;
        var moved = vote.slots.splice(from, 1)[0];
        vote.slots.splice(to, 0, moved);
        vote.active = to; from = null; changed();
      });
    });
  }

  function drawGrid() {
    var picked = {};
    vote.slots.forEach(function (id, i) { if (id) picked[id] = i + 1; });
    var list = TEAMS.filter(function (t) {
      return (!vote.conf || t.conf === vote.conf) &&
        (!vote.q || t.name.toLowerCase().indexOf(vote.q) >= 0 || t.abbr.toLowerCase().indexOf(vote.q) >= 0);
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var grid = document.getElementById("team-grid");
    grid.innerHTML = list.map(function (t) {
      var on = picked[t.id];
      return '<button type="button" class="team-btn" data-team="' + t.id + '"' + (on ? " disabled" : "") +
        ' aria-label="' + esc(t.name) + (on ? ", ranked " + on : ", add to slot " + (vote.active + 1)) + '">' +
        logo(t, "sm") + '<span class="tb-text"><span class="nm">' + esc(t.name) + "</span>" + gameLine(t.id, true) + "</span>" +
        (on ? '<span class="on num">#' + on + "</span>" : "") + "</button>";
    }).join("") || '<div class="no-results">No teams match that search.</div>';
    grid.querySelectorAll("[data-team]").forEach(function (b) {
      b.addEventListener("click", function () {
        vote.slots[vote.active] = Number(b.dataset.team);
        var nextEmpty = vote.slots.indexOf(null, vote.active + 1);
        if (nextEmpty < 0) nextEmpty = vote.slots.indexOf(null);
        vote.active = nextEmpty < 0 ? vote.active : nextEmpty;
        changed();
      });
    });
  }

  function drawFooter() {
    var filled = vote.slots.filter(Boolean).length;
    document.getElementById("pfill").style.width = (filled / 25 * 100) + "%";
    document.getElementById("ptext").textContent = filled === 25 ? "All 25 ranked" : filled + " of 25 ranked";
    document.getElementById("privacy").textContent = vote.kind === "media"
      ? "Media ballots are public, with your name and outlet."
      : "Fan ballots are private. Only the totals are shown.";
    var btn = document.getElementById("submit");
    btn.disabled = filled < 25;
    btn.textContent = vote.submitted ? "Update ballot" : "Submit ballot";
    document.getElementById("vote-error").textContent = "";
  }

  async function submit() {
    if (vote.slots.filter(Boolean).length < 25) return;
    var btn = document.getElementById("submit");
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      if (vote.admin) await DB.adminSetMediaBallot(vote.week.week, vote.admin.email, vote.slots.slice());
      else await DB.submitBallot(vote.week.week, vote.kind, vote.slots.slice());
    } catch (err) {
      console.error(err);
      var msg = /row-level security/i.test(err.message || "")
        ? "Voting for this week has closed, so the ballot couldn't be saved."
        : (err.message || "The ballot couldn't be saved. Check your connection and try again.");
      drawFooter();
      document.getElementById("vote-error").textContent = msg;
      return;
    }
    store(draftKey(), null);
    if (vote.admin) {
      var who = vote.admin;
      document.getElementById("vote-body").innerHTML =
        '<section class="panel done"><div class="eyebrow"><b>Ballot saved</b></div><h1>' + esc(who.name) + " · " + weekLabel(vote.week) + "</h1>" +
        '<p class="lede">It counts in the Media Poll now and shows on the Media Ballots page as entered by CFA.</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button type="button" class="btn btn-ghost" id="edit">Edit again</button>' +
        '<a class="btn btn-primary" href="#admin">Back to admin</a></div></section>';
      document.getElementById("edit").addEventListener("click", function () { renderEnter(who.email).catch(showError); });
      window.scrollTo(0, 0);
      return;
    }
    var list = vote.slots.map(function (id, i) { var t = team(id); return "<div><b>" + (i + 1) + "</b>" + logo(t, "sm") + esc(t.name) + "</div>"; }).join("");
    document.getElementById("vote-body").innerHTML =
      '<section class="panel done"><div class="eyebrow"><b>' + (vote.kind === "media" ? "Media ballot" : "Ballot") + " saved</b></div><h1>You're in for " + weekLabel(vote.week) + "</h1>" +
      '<p class="lede">You can change it until ' + closeAt(vote.week) + ". Results are live from " + etTime(vote.week.release_at) + " and update until voting closes.</p>" +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button type="button" class="btn btn-ghost" id="edit">Edit ballot</button>' +
      '<a class="btn btn-primary" href="#poll">See the current poll</a></div><div class="done-list">' + list + "</div></section>";
    document.getElementById("edit").addEventListener("click", function () { renderVote().catch(showError); });
    window.scrollTo(0, 0);
  }

  async function renderVoteClosed() {
    var next = DB.nextWeek(), released = DB.releasedWeek();
    loading();
    var mine = await DB.myBallots();
    var latest = mine.filter(function (b) { return b.week > 0; })[0];
    var list = latest ? latest.ranks.map(function (id, i) { var t = team(id); return "<div><b>" + (i + 1) + "</b>" + logo(t, "sm") + esc(t.name) + "</div>"; }).join("") : "";
    app.innerHTML =
      '<section class="panel done"><div class="eyebrow"><b>Voting is closed</b></div><h1>' + (next ? weekLabel(next) + " opens " + etDay(next.opens_at) : "See you next season") + "</h1>" +
      '<p class="lede">' + (next ? "Voting runs " + etDay(next.opens_at) + " from " + etTime(next.opens_at) + " to 11:59 PM ET, with results live from " + etTime(next.release_at) + ". Your last ballot will be filled in so you only have to adjust it." : "The season's polls are done.") + "</p>" +
      (released ? '<a class="btn btn-primary" href="#poll">See the ' + weekLabel(released) + " poll</a>" : "") +
      (latest ? '<h2 style="margin-top:16px">Your Week ' + latest.week + " " + (latest.kind === "media" ? "media " : "") + "ballot</h2><div class=\"done-list\">" + list + "</div>" : "") +
      "</section>";
  }

  // ---------- Admin ----------
  async function renderAdmin() {
    if (!DB.user()) {
      app.innerHTML = signInPanel("Sign in with your admin Google account.");
      document.getElementById("signin2").addEventListener("click", function () { DB.signIn(); });
      return;
    }
    if (!DB.isAdmin()) { app.innerHTML = '<div class="panel panel-pad"><h2>Admins only</h2><p class="panel-note">This page is for site admins.</p></div>'; return; }
    loading();
    var open = DB.openWeek(), released = DB.releasedWeek();
    var focus = open || released;
    var test = DB.weekByNumber(0);
    var res = await Promise.all([
      DB.listMediaVoters(),
      focus ? DB.notVoted(focus.week) : [],
      focus ? DB.counts(focus.week).then(function (c) { return c.media; }) : 0,
      focus ? DB.counts(focus.week).then(function (c) { return c.fan; }) : 0,
      DB.lastScoresUpdate()
    ]);
    var voters = res[0], notVoted = res[1], mediaCount = res[2], fanCount = res[3], scores = res[4];

    var status = focus
      ? '<div class="stats"><div class="stat"><div class="eyebrow">Media ballots</div><div class="num">' + mediaCount + " of " + voters.length + "</div></div>" +
        '<div class="stat"><div class="eyebrow">Fan ballots</div><div class="num">' + fmt(fanCount) + "</div></div></div>" +
        (notVoted.length ? '<p class="panel-note"><b style="color:var(--fg)">Haven\'t voted (' + notVoted.length + "):</b> " +
          notVoted.map(function (v) { return esc(v.name); }).join(", ") + "</p>" : '<p class="panel-note">Every media voter has voted.</p>')
      : '<p class="panel-note">No poll week has opened yet.</p>';

    var voterRows = voters.map(function (v) {
      return "<tr><td>" + esc(v.name) + '</td><td class="v-outlet">' + esc(v.outlet || "") + '</td><td class="v-outlet">' + esc(v.email) + "</td>" +
        '<td class="r" style="white-space:nowrap"><a class="btn btn-ghost btn-sm" href="#enter-' + encodeURIComponent(v.email) + '">Enter ballot</a> ' +
        '<button type="button" class="btn btn-ghost btn-sm" data-remove-voter="' + esc(v.email) + '">Remove</button></td></tr>';
    }).join("") || '<tr><td colspan="4" class="no-results">No media voters yet. Add them above.</td></tr>';

    app.innerHTML =
      '<div class="page-head"><div><div class="eyebrow"><b>Admin</b></div><h1>Run the poll</h1></div></div>' +
      '<div class="admin-grid">' +
      '<section class="panel panel-pad"><h2>' + (focus ? (open ? weekLabel(focus) + " · voting open" : weekLabel(focus) + " · final") : "This week") + "</h2>" + status + "</section>" +

      '<section class="panel panel-pad"><h2>Add media voters</h2>' +
      '<p class="panel-note">One voter per line: <b style="color:var(--fg)">Name, Outlet, email</b>. The email must be the Google account they\'ll sign in with. Outlet is optional.</p>' +
      '<label class="visually-hidden" for="bulk">Voters to add</label><textarea id="bulk" rows="6" placeholder="Jane Smith, Gridiron Weekly, jane@gmail.com"></textarea>' +
      '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><button type="button" class="btn btn-primary" id="add-voters">Add voters</button><span class="form-error" id="add-msg" role="status"></span></div></section>' +

      '<section class="panel" style="grid-column:1/-1"><div class="col-head"><h2>Media voters</h2><span class="v-outlet">' + voters.length + "</span></div>" +
      '<div class="table-scroll"><table class="poll" style="min-width:560px"><thead><tr><th>Name</th><th>Outlet</th><th>Google email</th><th></th></tr></thead><tbody>' + voterRows + "</tbody></table></div></section>" +

      '<section class="panel panel-pad"><h2>Test week</h2>' +
      (test ? '<p class="panel-note">A test week is ' + (DB.isClosed(test) ? "closed" : "open until " + closeAt(test)) + '. Only admins can see it. <a href="#vote">Try the ballot</a>.</p>' +
              '<div id="test-results"></div><button type="button" class="btn btn-ghost" id="end-test">End test week and delete its ballots</button>'
            : '<p class="panel-note">Open a two-hour voting window only admins can see, to try the ballot before a real Sunday. Make sure you\'re on the media list to test a media ballot.</p>' +
              '<button type="button" class="btn btn-ghost" id="open-test">Open a test week</button>') + "</section>" +

      '<section class="panel panel-pad"><h2>Scores and records</h2>' +
      '<p class="panel-note">Scores and records load from ESPN automatically early Sunday morning, before voting opens. ' +
      (scores ? "Latest load: " + scores.teams + " teams for Week " + scores.week + "." : "Nothing has loaded yet.") + "</p>" +
      '<a class="btn btn-ghost" href="' + esc(CFA.SCORES_WORKFLOW_URL) + '" target="_blank" rel="noopener">Re-run the score import on GitHub</a></section>' +
      "</div>";

    document.getElementById("add-voters").addEventListener("click", async function () {
      var msg = document.getElementById("add-msg");
      var lines = document.getElementById("bulk").value.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      var rows = [], bad = [];
      lines.forEach(function (l) {
        var parts = l.split(",").map(function (p) { return p.trim(); });
        var email = parts[parts.length - 1].toLowerCase();
        if (parts.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { bad.push(l); return; }
        rows.push({ name: parts[0], outlet: parts.length > 2 ? parts.slice(1, -1).join(", ") : null, email: email });
      });
      if (bad.length) { msg.textContent = "Check these lines: " + bad.join(" | "); return; }
      if (!rows.length) { msg.textContent = "Add at least one line."; return; }
      try { await DB.addMediaVoters(rows); route(); }
      catch (e) { msg.textContent = e.message || "Couldn't add voters."; }
    });
    app.querySelectorAll("[data-remove-voter]").forEach(function (b) {
      b.addEventListener("click", async function () {
        if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "Confirm remove"; return; }
        try { await DB.removeMediaVoter(b.dataset.removeVoter); route(); } catch (e) { b.textContent = "Couldn't remove"; }
      });
    });
    var ot = document.getElementById("open-test");
    if (ot) ot.addEventListener("click", async function () { ot.disabled = true; await DB.openTestWeek(); route(); });
    var et = document.getElementById("end-test");
    if (et) et.addEventListener("click", async function () {
      if (et.dataset.confirm !== "1") { et.dataset.confirm = "1"; et.textContent = "Confirm: delete test ballots"; return; }
      et.disabled = true; await DB.endTestWeek(); route();
    });
    if (test) {
      var tp = await DB.poll(0, "fan"), tm = await DB.poll(0, "media");
      var box = document.getElementById("test-results");
      if (box) box.innerHTML = '<p class="panel-note">Test ballots so far: ' + tm.ballotCount + " media, " + tp.ballotCount + " fan." +
        (tp.ranked.length ? " Fan #1: " + esc(team(tp.ranked[0].teamId).name) + "." : "") + (tm.ranked.length ? " Media #1: " + esc(team(tm.ranked[0].teamId).name) + "." : "") + "</p>";
    }
  }

  // ---------- Router ----------
  function showError(err) { app.innerHTML = errorBox(err); }
  var refreshTimer = null;
  function route() {
    DB.clearCache();
    clearTimeout(refreshTimer);
    var h = (location.hash || "#poll").slice(1);
    // While results are live, refresh the poll pages every 2 minutes
    if (["poll", "fans", "compare", "ballots", ""].indexOf(h) >= 0 && DB.isLive(DB.releasedWeek())) {
      refreshTimer = setTimeout(function () { if ((location.hash || "#poll").slice(1) === h) route(); }, 120000);
    }
    var navKey = h.indexOf("ballot") === 0 ? "ballots" : h === "vote" ? "vote" : (h === "admin" || h.indexOf("enter-") === 0) ? "admin" : "poll";
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      if (a.dataset.nav === navKey) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    var p;
    if (h === "fans") p = renderPoll("fans");
    else if (h === "compare") p = renderCompare();
    else if (h === "ballots") p = renderBallots();
    else if (h.indexOf("ballot-") === 0) p = renderBallot(h.slice(7));
    else if (h === "vote") p = renderVote();
    else if (h === "admin") p = renderAdmin();
    else if (h.indexOf("enter-") === 0) p = renderEnter(decodeURIComponent(h.slice(6)));
    else p = renderPoll("media");
    Promise.resolve(p).catch(showError);
    window.scrollTo(0, 0);
  }

  async function start() {
    loading("Loading the CFA Top 25…");
    try { await DB.init(); } catch (e) { showError(e); return; }
    try {
      var back = sessionStorage.getItem("cfa-return");
      if (back !== null && DB.user()) { sessionStorage.removeItem("cfa-return"); if (back && back !== location.hash) { location.hash = back; } }
    } catch (e) {}
    renderAuth();
    DB.onChange = function () { renderAuth(); route(); };
    window.addEventListener("hashchange", route);
    route();
  }
  start();
})();
