# CFP Projector checks

Run from the repo root with Node:

- `node tests/cfp_engine_test.js` — standings, title games, the 2026 field rules, Notre Dame rule, pick locking and hiding, plus 2,000 random pick sets.
- `node tests/cfp_tiebreak_test.js` — league tiebreaker cases (ACC 8 vs. 9 games, Big 12 beat-all and lost-to-all, SEC round robin and common opponents, Big Ten combined record).
- `node tests/cfp_backtest.js` — scores the 2024 and 2025 seasons from the committee's first ranking and compares with its final Top 25, then searches nearby scoring settings.

The tests use `tests/cfp_fixture.json` (the Nov. 3, 2026 data), so they don't change when the live schedule file updates.
