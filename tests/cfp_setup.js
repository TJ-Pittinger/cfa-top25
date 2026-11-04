const fs=require('fs'),vm=require('vm');
const E=require(''+__dirname+'/../cfp/engine.js');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(''+__dirname+'/../teams.js','utf8'),ctx);
const TEAMS=JSON.parse(JSON.stringify(ctx.window.TEAMS));
const data=JSON.parse(fs.readFileSync(''+__dirname+'/cfp_fixture.json','utf8'));
function run(picks,opts){return E.project(Object.assign({data,teams:TEAMS,picks:picks||{},now:Date.parse('2026-11-04T12:00:00Z')},opts||{}));}
module.exports={E,TEAMS,data,run};
if(require.main===module){
 const r=run();
 console.log(r.field.map(t=>t.seed+' '+t.name+' '+t.w+'-'+t.l+' '+t.pts).join('\n'));
 Object.values(r.races).forEach(x=>console.log(x.conf,':',x.a.name,x.a.cw+'-'+x.a.cl,'v',x.b.name,x.b.cw+'-'+x.b.cl,'|',x.why,'| champ',x.champ.name));
 console.log('out',r.out.map(t=>t.name).join(', '));
 console.log('games shown',r.games.length);
}
