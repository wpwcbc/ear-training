import test from 'node:test';
import assert from 'node:assert/strict';
import {builtins,stream,attempt,insightRecords,insightStats,insightPeriod} from '../js/v2/model.js';
function single(){const c=structuredClone(builtins[0].config),next=stream(c,'insights');return {id:'single',config:c,startedAt:'2026-10-20T12:00:00Z',endedAt:'2026-10-20T12:30:00Z',attempts:Array.from({length:10},(_,i)=>({...attempt(c,next(),'single','fresh'),firstCorrect:i<9,completedAt:'2026-10-20T12:10:00Z'}))};}
test('recent evidence has distinct first outcomes, questions, sessions and honest dates',()=>{
 const session=single(),records=insightRecords([session],[],[]),m=insightStats([...records,records[0]]);
 assert.equal(m.correct,9);assert.equal(m.n,10);assert.equal(m.questions,10);assert.equal(m.sessions,1);
 const window=insightPeriod(28,new Date(2026,9,29,12));assert.equal(window.start,new Date(2026,9,2).getTime());assert.equal(window.end,new Date(2026,9,30).getTime());
 assert.ok(records.every(r=>r.time>=window.start&&r.time<window.end));
 session.attempts[0].completedAt=null;session.startedAt='missing';assert.equal(insightRecords([session],[],[])[0].time,null);
});

test('actual practice keys and chord roots remain different analysis dimensions',async()=>{
 const {defaultConfig,generate}=await import('../js/v2/progression.js');
 const {insightGroups}=await import('../js/v2/model.js');
 const config={...defaultConfig('play'),keyMode:'random',keyPool:['C','Eb','G']},q=generate(config,()=>0,'Eb');
 const evidence=q.notes.map(n=>({...attempt(builtins[0].config,{id:n.id,chord:n.chord,degree:n.degree,midi:n.midi,options:[],generatorVersion:q.generatorVersion},'key-run','fresh'),id:n.id,exercise:'progression-play-by-ear',firstCorrect:true}));
 const records=insightRecords([],[{id:'key-run',config,questions:[q],ended:true}],evidence);
 assert.equal(insightGroups(records,'key')[0].label,'Eb');assert.equal(insightGroups(records,'key')[0].m.n,6);
 assert.equal(records[0].root,'F');assert.equal(records[0].chord,'Fm7');assert.equal(insightStats(records).n,6);
 delete q.practiceKey;assert.ok(insightRecords([],[{id:'key-run',config,questions:[q],ended:true}],evidence).every(r=>r.key===null));
});

function repeatedRecords(count=20){
 const config={...structuredClone(builtins[0].config),roots:['C'],qualities:['7'],targetMode:'exact',targets:['3']},next=stream(config,'recurrence');
 const sessions=Array.from({length:3},(_,i)=>({id:'recurrence-'+i,config,startedAt:'2026-10-20T12:00:00Z',endedAt:'2026-10-20T12:30:00Z',attempts:[]}));
 for(let i=0;i<count;i++){const s=sessions[i%3];s.attempts.push({...attempt(config,next(),s.id,'fresh'),firstCorrect:i>=6,completedAt:'2026-10-20T12:10:00Z'});}
 return insightRecords(sessions,[],[]);
}
test('recurrent errors require independent questions and sessions and merge duplicate musical observations',async()=>{
 const {insightPriorities}=await import('../js/v2/model.js');
 const report=insightPriorities(repeatedRecords());assert.equal(report.errors.length,1);assert.equal(report.errors[0].m.n,20);assert.equal(report.errors[0].m.correct,14);
 assert.equal(insightPriorities(repeatedRecords(19)).errors.length,0);
 const oneQuestion=repeatedRecords().map(r=>({...r,questionId:'one',sessionId:'one'}));assert.equal(insightPriorities(oneQuestion).errors.length,0);
});
test('practice handoff copies the full source, narrows the destination and never mutates history',async()=>{
 const {insightPractice}=await import('../js/v2/model.js');const {defaultConfig,generate}=await import('../js/v2/progression.js');
 const c={...defaultConfig('play'),keyMode:'random',keyPool:['C','Eb']},q=generate(c,()=>0,'Eb');
 const n=q.notes[0],a={...attempt(builtins[0].config,{id:n.id,chord:n.chord,degree:n.degree,midi:n.midi,options:[],generatorVersion:q.generatorVersion},'r','fresh'),id:n.id,exercise:'progression-play-by-ear'};
 const record=insightRecords([],[{id:'r',config:c,questions:[q],ended:true}],[a])[0],before=JSON.stringify(record);
 const preview=insightPractice(record,{key:'Eb',chord:'Fm7',degree:'b7'});
 assert.equal(preview.kind,'progression');assert.equal(preview.config.key,'Eb');assert.equal(preview.config.keyMode,'fixed');
 assert.deepEqual(preview.config.chords.map(r=>r.symbol),['Dm7','G7','Cmaj7']);assert.deepEqual(preview.config.pools.m7,['b7']);
 assert.equal(JSON.stringify(record),before);
});
function trendRows(n,correct,group,date){return repeatedRecords(n).map((r,i)=>({...r,questionId:date+group+i,sessionId:date+group+(i%3),time:Date.parse(date+'T12:00:00Z'),source:{...r.source,volume:group==='A'?.5:.6},a:{...r.a,firstCorrect:i<correct}}));}
test('matched trends remove practice-composition changes and report literal percentage-point changes',async()=>{
 const {insightTrend}=await import('../js/v2/model.js');const now=new Date(2026,9,29,12);
 const shift=[...trendRows(100,90,'A','2026-09-20'),...trendRows(20,5,'B','2026-09-20'),...trendRows(20,18,'A','2026-10-20'),...trendRows(100,25,'B','2026-10-20')];
 const report=insightTrend(shift,28,now);assert.equal(report.groups,2);assert.ok(Math.abs(report.delta)<1e-10);assert.equal(report.current.n,120);
 const gain=[...trendRows(20,16,'A','2026-09-20'),...trendRows(20,10,'B','2026-09-20'),...trendRows(20,18,'A','2026-10-20'),...trendRows(20,12,'B','2026-10-20')];
 assert.ok(Math.abs(insightTrend(gain,28,now).delta-10)<1e-10);
 gain.filter(r=>r.time>Date.parse('2026-10-01')).forEach(r=>r.generator='new-generator');assert.equal(insightTrend(gain,28,now).delta,null);
});
test('instrumental efficiency counts whole questions once and retains a valid zero delay',async()=>{
 const {insightEfficiency}=await import('../js/v2/model.js');const {defaultConfig,generate}=await import('../js/v2/progression.js');
 const c=defaultConfig('play'),q=generate(c,()=>0);q.done=true;q.submitted=true;q.referencePlayed=true;q.completionDelayMs=0;q.completionTimingVersion='v2-play-after-backing-1';
 q.notes.forEach(n=>{n.correct=true;n.exposure='fresh';});
 const evidence=q.notes.map(n=>({...attempt(builtins[0].config,{id:n.id,chord:n.chord,degree:n.degree,midi:n.midi,options:[],generatorVersion:q.generatorVersion},'time','fresh'),id:n.id,exercise:'progression-play-by-ear',firstCorrect:true}));
 const records=insightRecords([],[{id:'time',config:c,questions:[q],ended:true}],evidence);
 const report=insightEfficiency([...records,...records]);assert.equal(report.groups.length,1);assert.equal(report.groups[0].n,1);assert.equal(report.groups[0].median,0);
 q.notes[0].correct=false;assert.equal(insightEfficiency(records).groups.length,0);
 q.notes[0].correct=true;q.before=1;assert.equal(insightEfficiency(records).groups.length,0);
});
test('coverage excludes keys outside the active practice scope',async()=>{
 const {insightPriorities}=await import('../js/v2/model.js');const records=repeatedRecords().map(r=>({...r,source:{...r.source,roots:['C','D']}}));
 assert.ok(insightPriorities(records).gaps.some(g=>g.filters.root==='D'));
 assert.ok(!insightPriorities(records,'',{root:'C'}).gaps.some(g=>g.filters.root==='D'));
});
test('local calendar periods cross daylight-saving changes without drifting a day',()=>{
 const original=process.env.TZ;process.env.TZ='America/New_York';
 try{const p=insightPeriod(28,new Date(2026,10,3,12));assert.deepEqual([new Date(p.start).toISOString(),new Date(p.end).toISOString()],['2026-10-07T04:00:00.000Z','2026-11-04T05:00:00.000Z']);}
 finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});
test('key comparison uses compatible source conditions and distinct eligible questions per actual key',async()=>{
 const {insightKeyComparison}=await import('../js/v2/model.js');const {defaultConfig,generate}=await import('../js/v2/progression.js');
 const config={...defaultConfig('play'),keyMode:'random',keyPool:['C','Eb']},runs=[],evidence=[];
 for(const key of ['C','Eb'])for(let i=0;i<12;i++){
  const q=generate(config,()=>.3,key);q.created='2026-10-20T12:00:00Z';const id=key+'-'+i%3;let run=runs.find(r=>r.id===id);if(!run){run={id,config,questions:[],ended:true};runs.push(run);}run.questions.push(q);
  for(const n of q.notes){n.correct=true;n.exposure='fresh';evidence.push({...attempt(builtins[0].config,{id:n.id,chord:n.chord,degree:n.degree,midi:n.midi,options:[],generatorVersion:q.generatorVersion},id,'fresh'),id:n.id,exercise:'progression-play-by-ear',firstCorrect:true});}
 }
 const rows=insightRecords([],runs,evidence),comparison=insightKeyComparison(rows);assert.equal(insightStats(comparison.items).n,144);assert.equal(new Set(comparison.items.map(r=>r.key)).size,2);
 rows.filter(r=>r.key==='Eb').forEach(r=>r.source={...r.source,bpm:120});assert.equal(insightKeyComparison(rows).items.length,0);
});
test('incompatible small groups cannot create a recurrent-error recommendation',async()=>{
 const {insightPriorities}=await import('../js/v2/model.js');const rows=repeatedRecords().map((r,i)=>({...r,source:{...r.source,volume:i%2?.5:.6}}));assert.equal(insightPriorities(rows).errors.length,0);
});
test('unassessed questions and sessions cannot satisfy the recurrent evidence gate',async()=>{
 const {insightPriorities}=await import('../js/v2/model.js');
 const assessed=repeatedRecords().map((r,i)=>({...r,questionId:'phrase-'+i%2,sessionId:'rated-'+i%2}));
 const unassessed=repeatedRecords(8).map((r,i)=>({...r,questionId:'unfinished-'+i,sessionId:'unrated-session',a:{...r.a,firstCorrect:null}}));
 assert.equal(insightPriorities([...assessed,...unassessed]).errors.length,0);
});
test('the most recent assessed stratum wins over a newly unassessed older setup',async()=>{
 const {insightPriorities}=await import('../js/v2/model.js');
 const older=repeatedRecords().map(r=>({...r,time:1,source:{...r.source,volume:.5}})),newer=repeatedRecords().map(r=>({...r,time:2,source:{...r.source,volume:.6}}));
 const unfinished={...older[0],a:{...older[0].a,id:'unassessed-later',firstCorrect:null},time:3};
 assert.equal(insightPriorities([...older,...newer,unfinished]).errors[0].basis.source.volume,.6);
});
test('musical grouping preserves recorded chord spelling for display',async()=>{
 const {insightGroups}=await import('../js/v2/model.js');const {parseChord}=await import('../js/jazz/theory.js');const session=single();session.attempts[0].target.chord=parseChord('Db7');session.attempts=[session.attempts[0]];
 const records=insightRecords([session],[],[]),group=insightGroups(records.filter(r=>r.root==='C#'),'chord')[0];assert.equal(group.label,'C#7');assert.equal(group.displayLabel,'Db7');
});
