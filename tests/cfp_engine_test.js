// Run: node tests/cfp_engine_test.js  (uses tests/cfp_fixture.json, the Nov. 3 seed)
const {E,TEAMS,data,run}=require('./cfp_setup.js');
let pass=0,fail=0;function ok(c,m){if(c)pass++;else{fail++;if(fail<20)console.log('FAIL',m);}}
const idOf=n=>String(TEAMS.find(t=>t.name===n).id);
const gamesOf=n=>data.games.filter(g=>g.a===idOf(n)||g.h===idOf(n));
function lose(picks,n,filter){gamesOf(n).filter(filter||(()=>true)).forEach(g=>{picks[g.id]=g.a===idOf(n)?g.h:g.a;});return picks;}
// Miami loses its last 3 ACC games -> out of ACC title game
{let p={};const acc=gamesOf('Miami').filter(g=>g.conf);lose(p,'Miami',g=>acc.slice(-3).includes(g));const r=run(p);
 const m=r.teams[idOf('Miami')];ok(m.cw===6&&m.cl===3,'miami 6-3 '+m.cw+'-'+m.cl);ok(r.races.ACC.a.name!=='Miami'&&r.races.ACC.b.name!=='Miami','miami out of ACC ccg '+r.races.ACC.a.name+' '+r.races.ACC.b.name);}
// Georgia loses 2 SEC games -> out
{let p={};const s=gamesOf('Georgia').filter(g=>g.conf);lose(p,'Georgia',g=>s.slice(0,2).includes(g));const r=run(p);
 ok(![r.races.SEC.a.name,r.races.SEC.b.name].includes('Georgia'),'uga out '+r.races.SEC.a.name+' '+r.races.SEC.b.name);}
// stale CCG pick ignored
{let p={'ccg-ACC':idOf('Miami')};const acc=gamesOf('Miami').filter(g=>g.conf);lose(p,'Miami',g=>acc.slice(-3).includes(g));const r=run(p);ok(r.races.ACC.champ.name!=='Miami','stale ccg pick');}
// ND rule
{let p={};lose(p,'Notre Dame');const r=run(p);ok(!r.field.some(t=>t.name==='Notre Dame'),'ND out after losing all');}
{const p={};gamesOf('Notre Dame').forEach(g=>p[g.id]=idOf('Notre Dame'));const r=run(p);ok(r.ndIn&&r.field.some(t=>t.name==='Notre Dame'),'ND in when it wins out');}
// Lock rules
const g0={t:'2026-11-07T20:30:00Z'}; // Sat 3:30 ET
ok(E.lockAt(g0)===Date.parse('2026-11-07T17:00:00Z'),'sat lock noon ET (EST) '+new Date(E.lockAt(g0)).toISOString());
const gf={t:'2026-11-07T00:00:00Z'}; // Fri 7 PM ET
ok(E.lockAt(gf)===Date.parse(gf.t),'fri lock at kickoff');
ok(E.hideAt(gf)===Date.parse('2026-11-08T05:00:00Z'),'fri game hides sat midnight '+new Date(E.hideAt(gf)).toISOString());
ok(E.hideAt(g0)===Date.parse('2026-11-08T05:00:00Z'),'sat hide');
const gearly={t:'2026-11-07T16:00:00Z'}; ok(E.lockAt(gearly)===Date.parse(gearly.t),'11am kickoff locks at kickoff');
const gtue={t:'2026-11-11T00:00:00Z'}; ok(E.hideAt(gtue)===Date.parse('2026-11-15T05:00:00Z'),'tue game hides that sat');
ok(E.lockAt({t:'2026-11-07T17:00:00Z',tbd:true})===Date.parse('2026-11-07T17:00:00Z'),'tbd lock');
ok(E.lockAt({t:'2026-10-03T19:30:00Z'})===Date.parse('2026-10-03T16:00:00Z'),'EDT noon');
// hidden & locked behavior
{const r=run({}, {now:Date.parse('2026-11-08T06:00:00Z')});ok(r.games.every(x=>x.game.wk!==10),'week 10 hidden');ok(r.games.some(x=>x.game.wk===11),'week 11 shown');}
{const r=run({}, {now:Date.parse('2026-11-07T18:00:00Z')});ok(r.games.filter(x=>x.game.wk===10).every(x=>x.locked),'week10 locked sat 1pm');ok(r.games.filter(x=>x.game.wk===11).every(x=>!x.locked),'week11 open');}
// Fuzz
let seed=7;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
for(let it=0;it<2000;it++){
  const p={};data.games.forEach(g=>{const x=rnd();if(x<0.35)p[g.id]=g.a;else if(x<0.7)p[g.id]=g.h;});
  let r=run(p);
  // also random ccg picks
  Object.values(r.races).forEach(x=>{if(rnd()<0.5)p['ccg-'+x.conf]=rnd()<0.5?x.a.key:x.b.key;});
  r=run(p);
  ok(r.field.length===12&&new Set(r.field.map(t=>t.key)).size===12,'field 12');
  ['SEC','Big Ten','Big 12','ACC'].forEach(c=>ok(r.field.includes(r.races[c].champ),'p4 champ in '+c));
  const g6=r.order.find(t=>!['SEC','Big Ten','Big 12','ACC'].includes(t.conf)&&t.key!=='87');ok(r.field.includes(g6),'g6 in');
  const nd=r.teams['87'];ok(!(nd.rank<=12)||r.field.includes(nd),'nd rule');
  Object.values(r.races).forEach(x=>{
    ok(x.champ===x.a||x.champ===x.b,'champ participant');
    const pc=t=>t.cw/(t.cw+t.cl);const o=x.order;
    for(let i=1;i<o.length;i++){ if(x.conf!=='ACC') ok(pc(o[i-1])>=pc(o[i]),'sorted '+x.conf);}
    if(x.conf!=='ACC'){const others=o.filter(t=>t!==x.a&&t!==x.b);ok(others.every(t=>pc(t)<=pc(x.b)),'ccg are top2 '+x.conf);}
    const k='ccg-'+x.conf;if(p[k]&&(p[k]===x.a.key||p[k]===x.b.key))ok(x.champ.key===p[k],'ccg pick honored');
  });
  r.field.forEach((t,i)=>{if(i)ok(r.field[i-1].pts>=t.pts,'seed order');});
}
console.log('pass',pass,'fail',fail);
// Favorites: betting line, then FPI prediction, then FPI ratings, then ranking
{
  const g = data.games.find(g => g.a === idOf('Miami') && g.h === idOf('Notre Dame'));
  const d2 = JSON.parse(JSON.stringify(data));
  const gg = d2.games.find(x => x.id === g.id);
  gg.hp = 0.6; // FPI likes Notre Dame at home
  let r = E.project({ data: d2, teams: TEAMS, now: Date.parse('2026-11-04T12:00:00Z') });
  let x = r.games.find(y => y.game.id === g.id);
  ok(x.favorite === idOf('Notre Dame') && x.fav.src === 'fpi', 'fpi favorite');
  gg.line = 'MIA -2.5'; gg.lf = idOf('Miami');
  r = E.project({ data: d2, teams: TEAMS, now: Date.parse('2026-11-04T12:00:00Z') });
  x = r.games.find(y => y.game.id === g.id);
  ok(x.favorite === idOf('Miami') && x.fav.src === 'line', 'line beats fpi');
  delete gg.line; delete gg.lf; delete gg.hp; d2.fpi = {}; d2.fpi[idOf('Miami')] = 5; d2.fpi[idOf('Notre Dame')] = 20;
  r = E.project({ data: d2, teams: TEAMS, now: Date.parse('2026-11-04T12:00:00Z') });
  x = r.games.find(y => y.game.id === g.id);
  ok(x.favorite === idOf('Notre Dame') && x.fav.src === 'fpi-rating', 'fpi rating favorite');
  console.log('favorite checks', pass, fail);
}
