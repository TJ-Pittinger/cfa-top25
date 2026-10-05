// CFA Top 25: the data layer. Every read and write to the database goes through window.DB.
// The database (Supabase) enforces the rules: voting windows, one ballot per person per week,
// media ballots only from the media list, and fan ballots kept private.

window.team = (function () {
  var map = null;
  return function (id) {
    if (!map) { map = {}; TEAMS.forEach(function (t) { map[t.id] = t; }); }
    return map[id];
  };
})();

(function () {
  var sb = window.supabase.createClient(CFA.SUPABASE_URL, CFA.SUPABASE_KEY, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  var state = { session: null, isAdmin: false, isMedia: false, weeks: [] };
  var cache = {};

  function check(res) { if (res.error) throw res.error; return res.data; }
  function once(key, fn) {
    if (!cache[key]) cache[key] = fn().catch(function (e) { delete cache[key]; throw e; });
    return cache[key];
  }
  function now() { return Date.now(); }
  function t(s) { return new Date(s).getTime(); }

  async function loadRoles() {
    if (!state.session) { state.isAdmin = state.isMedia = false; return; }
    var r = await Promise.all([sb.rpc("is_admin"), sb.rpc("is_media_voter")]);
    state.isAdmin = !!r[0].data;
    state.isMedia = !!r[1].data;
  }
  async function loadWeeks() {
    state.weeks = check(await sb.from("weeks").select("*").eq("season", CFA.SEASON).order("week"));
  }
  // Week 0 is the admin-only test week.
  function visible(w) { return w.week > 0 || state.isAdmin; }

  window.DB = {
    state: state,

    init: async function () {
      var s = await sb.auth.getSession();
      state.session = s.data.session;
      await Promise.all([loadRoles(), loadWeeks()]);
      sb.auth.onAuthStateChange(function (event, session) {
        var before = state.session && state.session.user.id, after = session && session.user.id;
        state.session = session;
        if (before !== after) {
          // Defer: calling Supabase inside this callback can stall the client.
          setTimeout(async function () {
            cache = {};
            await loadRoles();
            if (DB.onChange) DB.onChange();
          }, 0);
        }
      });
    },

    // ---------- Sign-in ----------
    user: function () { return state.session ? state.session.user : null; },
    isAdmin: function () { return state.isAdmin; },
    isMedia: function () { return state.isMedia; },
    signIn: function () {
      try { sessionStorage.setItem("cfa-return", location.hash || ""); } catch (e) {}
      return sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: location.origin + location.pathname }
      });
    },
    signOut: function () { return sb.auth.signOut(); },

    // ---------- Weeks ----------
    weeks: function () { return state.weeks.filter(visible); },
    // The week whose voting window is open right now (test week only for admins)
    openWeek: function () {
      var open = state.weeks.filter(function (w) { return visible(w) && now() >= t(w.opens_at) && now() < t(w.closes_at); });
      return open.filter(function (w) { return w.week > 0; })[0] || open[0] || null;
    },
    // The next real week that hasn't opened yet
    nextWeek: function () {
      return state.weeks.filter(function (w) { return w.week > 0 && t(w.opens_at) > now(); })[0] || null;
    },
    // The most recent real week whose results are public (from 1 PM Sunday; live until voting closes)
    releasedWeek: function () {
      var done = state.weeks.filter(function (w) { return w.week > 0 && t(w.release_at || w.closes_at) <= now(); });
      return done[done.length - 1] || null;
    },
    // Results are still changing because voting hasn't closed
    isLive: function (w) { return !!w && now() < t(w.closes_at); },
    weekByNumber: function (n) { return state.weeks.filter(function (w) { return w.week === n; })[0] || null; },
    isClosed: function (w) { return !!w && t(w.closes_at) <= now(); },
    reloadWeeks: function () { return loadWeeks(); },
    clearCache: function () { cache = {}; },

    // ---------- Results ----------
    // AP-style totals for one poll. Public after the week closes; admins can see them anytime.
    poll: function (week, kind) {
      return once("poll:" + week + ":" + kind, async function () {
        var rows = check(await sb.rpc("poll_results", { p_season: CFA.SEASON, p_week: week, p_kind: kind })) || [];
        rows = rows.map(function (r) {
          return { teamId: r.team_id, pts: Number(r.points), fpv: Number(r.first_place), votes: Number(r.votes), count: Number(r.ballot_count) };
        }).filter(function (r) { return team(r.teamId); });
        rows.sort(function (a, b) { return b.pts - a.pts || b.fpv - a.fpv || team(a.teamId).name.localeCompare(team(b.teamId).name); });
        rows.forEach(function (r, i) { r.rank = i + 1; });
        return { ranked: rows.slice(0, 25), others: rows.slice(25), ballotCount: rows.length ? rows[0].count : 0 };
      });
    },
    // Public ballot counts for a week: media submitted, fan submitted, media voters invited
    counts: function (week) {
      return once("counts:" + week, async function () {
        var rows = check(await sb.rpc("ballot_counts", { p_season: CFA.SEASON, p_week: week })) || [];
        var r = rows[0] || {};
        return { media: Number(r.media || 0), fan: Number(r.fan || 0), mediaVoters: Number(r.media_voters || 0) };
      });
    },
    mediaBallots: function (week) {
      return once("media:" + week, async function () {
        var rows = check(await sb.rpc("media_ballots", { p_season: CFA.SEASON, p_week: week })) || [];
        return rows.map(function (r) {
          return { id: String(r.ballot_id), name: r.name, outlet: r.outlet || "", ranks: r.ranks, submitted: r.submitted_at, entered: !!r.entered_by_admin };
        });
      });
    },

    // ---------- Scores and records (imported from ESPN each Sunday) ----------
    games: function (week) {
      return once("games:" + week, async function () {
        var rows = check(await sb.from("games").select("*").eq("season", CFA.SEASON).eq("week", week)) || [];
        var map = {};
        rows.forEach(function (g) { map[g.team_id] = g; });
        return map;
      });
    },
    // Each team's latest record as of a poll week
    records: function (uptoWeek) {
      return once("records:" + uptoWeek, async function () {
        var rows = check(await sb.from("games").select("team_id, week, record")
          .eq("season", CFA.SEASON).lte("week", uptoWeek).order("week")) || [];
        var map = {};
        rows.forEach(function (g) { if (g.record) map[g.team_id] = g.record; });
        return map;
      });
    },

    // ---------- My ballots ----------
    myBallots: function () {
      var u = DB.user();
      if (!u) return Promise.resolve([]);
      return once("mine:" + u.id, async function () {
        var email = String(u.email || "").toLowerCase();
        return check(await sb.from("ballots").select("season, week, kind, ranks, updated_at, entered_by_admin")
          .or("user_id.eq." + u.id + ",voter_email.eq.\"" + email + "\"")
          .eq("season", CFA.SEASON).order("week", { ascending: false })) || [];
      });
    },
    submitBallot: async function (week, kind, ranks) {
      var u = DB.user();
      check(await sb.from("ballots").upsert(
        { season: CFA.SEASON, week: week, kind: kind, ranks: ranks, user_id: u.id },
        { onConflict: "season,week,user_id,kind" }
      ));
      delete cache["mine:" + u.id];
      delete cache["poll:" + week + ":" + kind];
      delete cache["counts:" + week];
    },

    // ---------- Admin ----------
    listMediaVoters: async function () {
      return check(await sb.from("media_voters").select("*").order("name")) || [];
    },
    addMediaVoters: async function (rows) {
      check(await sb.from("media_voters").upsert(rows, { onConflict: "email" }));
    },
    removeMediaVoter: async function (email) {
      check(await sb.from("media_voters").delete().eq("email", email));
    },
    // All of one media voter's ballots (admin only)
    voterBallots: async function (email) {
      return check(await sb.from("ballots").select("season, week, kind, ranks, updated_at, entered_by_admin")
        .eq("voter_email", email).eq("kind", "media").eq("season", CFA.SEASON).order("week", { ascending: false })) || [];
    },
    adminSetMediaBallot: async function (week, email, ranks) {
      check(await sb.rpc("admin_set_media_ballot", { p_season: CFA.SEASON, p_week: week, p_email: email, p_ranks: ranks }));
      cache = {};
    },
    notVoted: async function (week) {
      return check(await sb.rpc("media_not_voted", { p_season: CFA.SEASON, p_week: week })) || [];
    },
    // Fresh counts for the admin page (skips the cache)
    ballotCount: async function (week, kind) {
      delete cache["poll:" + week + ":" + kind];
      return (await DB.poll(week, kind)).ballotCount;
    },
    openTestWeek: async function () {
      var start = new Date(now() - 60 * 1000).toISOString(), end = new Date(now() + 2 * 3600 * 1000).toISOString();
      check(await sb.from("weeks").upsert({ season: CFA.SEASON, week: 0, opens_at: start, release_at: start, closes_at: end }, { onConflict: "season,week" }));
      cache = {};
      await loadWeeks();
    },
    endTestWeek: async function () {
      check(await sb.from("ballots").delete().eq("season", CFA.SEASON).eq("week", 0));
      check(await sb.from("weeks").delete().eq("season", CFA.SEASON).eq("week", 0));
      cache = {};
      await loadWeeks();
    },
    lastScoresUpdate: async function () {
      var rows = check(await sb.from("games").select("week").eq("season", CFA.SEASON).order("week", { ascending: false }).limit(1)) || [];
      if (!rows.length) return null;
      var wk = rows[0].week;
      var res = await sb.from("games").select("team_id", { count: "exact", head: true }).eq("season", CFA.SEASON).eq("week", wk);
      if (res.error) throw res.error;
      return { week: wk, teams: res.count || 0 };
    }
  };
})();
