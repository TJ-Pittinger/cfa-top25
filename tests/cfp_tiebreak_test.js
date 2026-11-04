const {E,TEAMS}=require('./cfp_setup.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m);}};
const id=n=>String(TEAMS.find(t=>t.name===n).id);
function mk(conf,recs,results,cfp){ // recs: name->[cw,cl]
  const records={};Object.keys(recs).forEach(n=>records[id(n)]=[recs[n][0]+2,recs[n][1],recs[n][0],recs[n][1]]);
  const data={records,results:results.map(s=>s.split('>').map(id)),games:[],cfp:{top25:(cfp||[]).map(id)},ap:{rows:[]}};
  return E.project({data,teams:TEAMS,now:0}).races[conf];
}
// ACC: 7-1 (8 games) ties 7-2 (9 games); head-to-head decides
let r=mk('ACC',{'Miami':[8,0],'Clemson':[7,1],'Wake Forest':[7,2],'SMU':[5,3]},['Wake Forest>Clemson'],['Clemson']);
ok(r.b.name==='Wake Forest','ACC 8v9 tie, h2h -> Wake ('+r.b.name+')');
r=mk('ACC',{'Miami':[8,0],'Clemson':[7,1],'Wake Forest':[7,2],'SMU':[5,3]},[],['Wake Forest','Clemson']);
ok(r.b.name==='Wake Forest','ACC no h2h -> Team Success (rank) ('+r.b.name+')');
// Big 12 three-way, not round robin, one beat both
r=mk('Big 12',{'Utah':[8,1],'BYU':[7,2],'Texas Tech':[7,2],'Houston':[7,2],'Baylor':[2,7]},['Houston>BYU','Houston>Texas Tech'],['BYU','Texas Tech','Houston']);
ok(r.b.name==='Houston','Big 12 beat-all ('+r.b.name+')');
// Big 12: lost to both is removed, other two go to h2h
r=mk('Big 12',{'Utah':[8,1],'BYU':[7,2],'Texas Tech':[7,2],'Houston':[7,2],'Baylor':[2,7]},['BYU>Houston','Texas Tech>Houston','Texas Tech>Baylor'],['BYU','Houston']);
ok(r.b.name!=='Houston','Big 12 lost-to-all removed ('+r.b.name+')');
// SEC: round robin mini-league
r=mk('SEC',{'Georgia':[8,0],'Alabama':[6,2],'Texas':[6,2],'LSU':[6,2],'Florida':[1,7]},['Alabama>Texas','Texas>LSU','Alabama>LSU'],['LSU','Texas','Alabama']);
ok(r.b.name==='Alabama','SEC round robin ('+r.b.name+')');
// SEC common opponents
r=mk('SEC',{'Georgia':[8,0],'Alabama':[6,2],'Texas':[6,2],'Florida':[1,7],'Auburn':[3,5]},['Alabama>Florida','Auburn>Alabama','Texas>Florida','Texas>Auburn'],['Alabama']);
ok(r.b.name==='Texas','SEC common opps ('+r.b.name+')');
// Big Ten combined record among tied teams (not round robin)
r=mk('Big Ten',{'UCLA':[9,0],'Indiana':[8,1],'Ohio State':[8,1],'USC':[8,1],'Iowa':[1,8]},['USC>Ohio State'],['Indiana','Ohio State']);
ok(r.b.name==='USC','B1G combined ('+r.b.name+')');
console.log('pass',pass,'fail',fail);
