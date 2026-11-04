// Backtest: start from the committee's first ranking, apply what actually happened through Selection Day,
// and compare the projector's final order with the committee's final Top 25.
// Results are summarized per team: wins/losses after the first ranking, which wins came against teams
// ranked in that first ranking, title-game result. Built from the published rankings and records; approximate.
const CURVE = [1740,1648,1540,1476,1473,1446,1358,1253,1107,1057,1049,953,931,898,814,719,590,539,475,451,401,179,163,154,94];
// team: [first CFP rank (0 = unranked), wins after, losses after (incl. title game), ranked wins [names], champ conf or '', lostTitleGame, unranked AP-vote guess, final record]
const Y2024 = {
  first: ['Oregon','Ohio State','Georgia','Miami','Texas','Penn State','Tennessee','Indiana','BYU','Notre Dame','Alabama','Boise State','SMU','Texas A&M','LSU','Ole Miss','Iowa State','Pittsburgh','Kansas State','Colorado','Washington State','Louisville','Clemson','Missouri','Army'],
  final: ['Oregon','Georgia','Texas','Penn State','Notre Dame','Ohio State','Tennessee','Indiana','Boise State','SMU','Alabama','Arizona State','Miami','Ole Miss','South Carolina','Clemson','BYU','Iowa State','Missouri','Illinois','Syracuse','Colorado','Army','Memphis','UNLV'],
  teams: {
    'Oregon': [4, 0, ['Penn State'], 'B1G', false, 0, [13, 0]],
    'Ohio State': [3, 1, ['Indiana'], '', false, 0, [10, 2]],
    'Georgia': [4, 1, ['Tennessee', 'Texas'], 'SEC', false, 0, [11, 2]],
    'Miami': [1, 2, [], '', false, 0, [10, 2]],
    'Texas': [4, 1, ['Texas A&M'], '', true, 0, [11, 2]],
    'Penn State': [4, 1, [], '', true, 0, [11, 2]],
    'Tennessee': [3, 1, [], '', false, 0, [10, 2]],
    'Indiana': [2, 1, [], '', false, 0, [11, 1]],
    'BYU': [2, 2, [], '', false, 0, [10, 2]],
    'Notre Dame': [4, 0, ['Army'], '', false, 0, [11, 1]],
    'Alabama': [3, 1, ['LSU'], '', false, 0, [9, 3]],
    'Boise State': [5, 0, [], 'G6', false, 0, [12, 1]],
    'SMU': [3, 1, [], '', true, 0, [11, 2]],
    'Texas A&M': [1, 2, [], '', false, 0, [8, 4]],
    'LSU': [2, 2, [], '', false, 0, [8, 4]],
    'Ole Miss': [2, 1, ['Georgia'], '', false, 0, [9, 3]],
    'Iowa State': [3, 2, ['Kansas State'], '', true, 0, [10, 3]],
    'Pittsburgh': [0, 4, [], '', false, 0, [7, 5]],
    'Kansas State': [1, 2, [], '', false, 0, [8, 4]],
    'Colorado': [3, 1, [], '', false, 0, [9, 3]],
    'Washington State': [1, 3, [], '', false, 0, [8, 4]],
    'Louisville': [2, 1, ['Pittsburgh'], '', false, 0, [8, 4]],
    'Clemson': [4, 1, ['Pittsburgh', 'SMU'], 'ACC', false, 0, [10, 3]],
    'Missouri': [3, 1, [], '', false, 0, [9, 3]],
    'Army': [3, 1, [], 'G6', false, 0, [11, 1]],
    'South Carolina': [4, 0, ['Missouri', 'Clemson'], '', false, 60, [9, 3]],
    'Arizona State': [5, 0, ['Kansas State', 'BYU', 'Iowa State'], 'B12', false, 40, [11, 2]],
    'Illinois': [3, 0, [], '', false, 50, [9, 3]],
    'Syracuse': [4, 0, ['Miami'], '', false, 5, [9, 3]],
    'Memphis': [3, 0, [], '', false, 30, [10, 2]],
    'UNLV': [3, 2, [], '', true, 80, [10, 3]],
    'Tulane': [2, 2, [], '', true, 20, [9, 4]]
  }
};
const Y2025 = {
  first: ['Ohio State','Indiana','Texas A&M','Alabama','Georgia','Ole Miss','BYU','Texas Tech','Oregon','Notre Dame','Texas','Oklahoma','Utah','Virginia','Louisville','Vanderbilt','Georgia Tech','Miami','USC','Iowa','Michigan','Missouri','Washington','Pittsburgh','Tennessee'],
  final: ['Indiana','Ohio State','Georgia','Texas Tech','Oregon','Ole Miss','Texas A&M','Oklahoma','Alabama','Miami','Notre Dame','BYU','Texas','Vanderbilt','Utah','USC','Arizona','Michigan','Virginia','Tulane','Houston','Georgia Tech','Iowa','James Madison','North Texas'],
  teams: {
    'Ohio State': [4, 1, ['Michigan'], '', true, 0, [12, 1]],
    'Indiana': [4, 0, ['Ohio State'], 'B1G', false, 0, [13, 0]],
    'Texas A&M': [3, 1, ['Missouri'], '', false, 0, [11, 1]],
    'Alabama': [3, 2, [], '', true, 0, [10, 3]],
    'Georgia': [5, 0, ['Texas', 'Georgia Tech', 'Alabama'], 'SEC', false, 0, [12, 1]],
    'Ole Miss': [3, 0, [], '', false, 0, [11, 1]],
    'BYU': [3, 2, [], '', true, 0, [11, 2]],
    'Texas Tech': [4, 0, ['BYU', 'BYU'], 'B12', false, 0, [12, 1]],
    'Oregon': [4, 0, ['Iowa', 'USC', 'Washington'], '', false, 0, [11, 1]],
    'Notre Dame': [4, 0, ['Pittsburgh'], '', false, 0, [10, 2]],
    'Texas': [2, 1, ['Texas A&M'], '', false, 0, [9, 3]],
    'Oklahoma': [3, 0, ['Alabama', 'Missouri'], '', false, 0, [10, 2]],
    'Utah': [3, 0, [], '', false, 0, [10, 2]],
    'Virginia': [2, 2, [], '', true, 0, [10, 3]],
    'Louisville': [1, 3, [], '', false, 0, [8, 4]],
    'Vanderbilt': [3, 0, [], '', false, 0, [10, 2]],
    'Georgia Tech': [1, 2, [], '', false, 0, [9, 3]],
    'Miami': [4, 0, ['Pittsburgh'], '', false, 0, [10, 2]],
    'USC': [3, 1, ['Iowa'], '', false, 0, [9, 3]],
    'Iowa': [2, 2, [], '', false, 0, [8, 4]],
    'Michigan': [2, 1, [], '', false, 0, [9, 3]],
    'Missouri': [2, 2, [], '', false, 0, [8, 4]],
    'Washington': [2, 2, [], '', false, 0, [8, 4]],
    'Pittsburgh': [1, 2, ['Georgia Tech'], '', false, 0, [8, 4]],
    'Tennessee': [2, 1, [], '', false, 0, [8, 4]],
    'Arizona': [4, 0, [], '', false, 10, [9, 3]],
    'Tulane': [4, 1, [], 'G6', false, 40, [11, 2]],
    'Houston': [3, 1, [], '', false, 30, [9, 3]],
    'James Madison': [4, 0, [], 'G6', false, 30, [12, 1]],
    'North Texas': [4, 1, [], '', true, 20, [11, 2]],
    'Duke': [3, 2, ['Virginia'], 'ACC', false, 0, [8, 5]]
  }
};

function score(Y, S) {
  const pts = {}, base = {};
  Object.keys(Y.teams).forEach(n => { const i = Y.first.indexOf(n); base[n] = i >= 0 ? CURVE[i] : Math.round(Math.min(Y.teams[n][5], 90) * 0.5); pts[n] = base[n]; });
  Object.keys(Y.teams).forEach(n => {
    const [w, l, rw, champ, lostCcg, , fin] = Y.teams[n];
    const ranked = Y.first.indexOf(n) >= 0;
    pts[n] += rw.reduce((s, o) => s + Math.round(S.RANKED_WIN * (base[o] || 0)), 0) + (w - rw.length) * S.UNRANKED_WIN;
    const regL = l - (lostCcg ? 1 : 0);
    pts[n] -= regL * (ranked ? S.RANKED_LOSS : S.UNRANKED_LOSS) + (lostCcg ? S.CCG_LOSS : 0);
    if (champ === 'SEC' || champ === 'B1G') pts[n] += S.CHAMP_P4 + (S.CHAMP_TOP || 0); else if (champ === 'B12' || champ === 'ACC') pts[n] += S.CHAMP_P4; else if (champ) pts[n] += S.CHAMP_OTHER;
    if (fin[1] === 0 && fin[0] >= 11) pts[n] += S.UNBEATEN;
  });
  return Object.keys(pts).sort((a, b) => pts[b] - pts[a]);
}
function evaluate(Y, order) {
  const top12 = order.slice(0, 12), real12 = Y.final.slice(0, 12);
  const overlap12 = top12.filter(t => real12.includes(t)).length;
  const overlap25 = order.slice(0, 25).filter(t => Y.final.includes(t)).length;
  // mean absolute rank error over the committee's final top 25
  const err = Y.final.reduce((s, t, i) => s + Math.abs((order.indexOf(t) < 0 ? 30 : order.indexOf(t)) - i), 0) / 25;
  const err12 = Y.final.slice(0, 12).reduce((s, t, i) => s + Math.abs(order.indexOf(t) - i), 0) / 12;
  return { overlap12, overlap25, err: +err.toFixed(2), err12: +err12.toFixed(2) };
}
const BASE = { CHAMP_TOP: 150, RANKED_WIN: 0.12, UNRANKED_WIN: 20, RANKED_LOSS: 350, UNRANKED_LOSS: 450, CCG_LOSS: 50, CHAMP_P4: 300, CHAMP_OTHER: 75, UNBEATEN: 250 };
function report(S, label) {
  const a = evaluate(Y2024, score(Y2024, S)), b = evaluate(Y2025, score(Y2025, S));
  return { label, y2024: a, y2025: b, total: +(a.err + b.err + a.err12 + b.err12).toFixed(2) };
}
module.exports = { score, evaluate, report, Y2024, Y2025, BASE };
if (require.main === module) {
  console.log(JSON.stringify(report(BASE, 'current')));
  console.log('2024 projected:', score(Y2024, BASE).slice(0, 14).join(', '));
  console.log('2024 actual:   ', Y2024.final.slice(0, 14).join(', '));
  console.log('2025 projected:', score(Y2025, BASE).slice(0, 14).join(', '));
  console.log('2025 actual:   ', Y2025.final.slice(0, 14).join(', '));
  // grid search
  const res = [];
  for (const RL of [200, 250, 300, 350, 400]) for (const CL of [50, 100, 150, 250]) for (const CP of [100, 150, 200, 300]) for (const RW of [0.08, 0.12, 0.18, 0.25]) for (const UW of [10, 20, 40])
    res.push(report(Object.assign({}, BASE, { RANKED_LOSS: RL, CCG_LOSS: CL, CHAMP_P4: CP, RANKED_WIN: RW, UNRANKED_WIN: UW }), [RL, CL, CP, RW, UW].join('/')));
  res.sort((x, y) => x.total - y.total);
  console.log('best:'); res.slice(0, 8).forEach(r => console.log(JSON.stringify(r)));
  console.log('current rank among', res.length, ':', res.findIndex(r => r.label === '350/50/300/0.12/20') + 1);
}
