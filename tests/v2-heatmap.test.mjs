import test from 'node:test';
import assert from 'node:assert/strict';
import {insightHeatmap,insightRecords} from '../js/v2/insights.js';
import {builtins,stream,attempt} from '../js/v2/model.js';

test('performance cells sum first grades, deduplicate and preserve musical spellings',()=>{
 const c=structuredClone(builtins[0].config),next=stream(c,'heatmap');
 const s={id:'heatmap',config:c,startedAt:'2026-11-09T00:00:00Z',attempts:[]};
 for(let i=0;i<30;i++){const a=attempt(c,next(),s.id,'fresh');a.target.chord.quality='7';a.target.degree='9';a.firstCorrect=i<6||i>=10&&i<19;s.attempts.push(a);}
 const records=insightRecords([s],[],[]),before=JSON.stringify(records);
 const report=insightHeatmap([...records,records[0]]),cell=report.cells[0];
 assert.equal(cell.m.correct,15);assert.equal(cell.m.n,30);assert.equal(cell.rate,.5);
 assert.equal(cell.status,'limited');assert.deepEqual(report.degrees,['9']);
 assert.equal(JSON.stringify(records),before);
 const extra=records.slice(0,3).map((r,i)=>({...r,degree:['#11','b5','maj7'][i],a:{...r.a,id:'extra'+i,firstCorrect:i===2?null:false}}));
 const expanded=insightHeatmap([...records,...extra]);
 assert.ok(expanded.degrees.includes('#11')&&expanded.degrees.includes('b5'));
 assert.equal(expanded.cells.find(c=>c.degree==='maj7').status,'unassessed');
 assert.equal(expanded.cells.find(c=>c.degree==='b5').rate,0);
 assert.equal(insightHeatmap([]).cells.length,0);
});
