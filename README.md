# CFA Top 25

The College Football Addiction weekly Top 25 at **cfatop25.com**: a media poll from invited voters and a free fan poll, scored like the AP poll.

## How it fits together
- **Website:** plain HTML/CSS/JS hosted on GitHub Pages (`index.html`, `app.js`, `data.js`, `styles.css`).
- **Database and sign-in:** Supabase with Google sign-in. Setup SQL is in `supabase/`.
- **Scores and records:** `.github/workflows/update-scores.yml` loads final scores from ESPN early every Sunday.
- **Logos:** `.github/workflows/logos.yml` downloads all FBS logos into `logos/`.

## Weekly rhythm
- Sunday 2:00 AM ET voting opens; your last ballot is pre-filled with each team's result.
- Sunday 12:00 PM ET voting closes and results go public automatically.
- Media ballots are public; fan ballots are private (only totals are shown).

## Admin
Sign in as an admin and open **Admin** to add media voters, see who hasn't voted, and open a private test week.

## Settings
`config.js` holds the Supabase URL and the public (publishable) key. The secret key lives only in GitHub repository secrets.
