// CFA Top 25 settings.
// The Supabase key below is the public "publishable" key. It is meant to be in the website;
// the database's security rules decide what it can do. Never put the secret key here.
window.CFA = {
  SUPABASE_URL: "https://emppkooealsxujshlbhc.supabase.co",
  SUPABASE_KEY: "sb_publishable_p88GzazEEFth7mvcH7wuTw_8aG-NLNs",
  SEASON: 2026,
  // Show logos from logos/<id>.png. A missing logo falls back to the team's abbreviation.
  LOGOS_AVAILABLE: true,
  // Where an admin can re-run the ESPN score import by hand.
  SCORES_WORKFLOW_URL: "https://github.com/tj-pittinger/cfa-top25/actions/workflows/update-scores.yml"
};
