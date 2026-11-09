import test from 'node:test';
import assert from 'node:assert/strict';
import {insightPracticeSummary,insightRecords} from '../js/v2/insights.js';
import {builtins,stream,attempt} from '../js/v2/model.js';
function records(count=30){
 const config=structuredClone(builtins[0].config),next=stream(config,'summary');
 const sessions=Array.from({length:3},(_,i)=>({id:'s'+i,config,startedAt:'2026-11-09T00:00:00Z',attempts:[]}));
 for(let i=0;i<count;i++){const s=sessions[i%3],a=attempt(config,next(),s.id,'fresh');a.target.chord.quality='m7';a.target.degree='5';a.firstCorrect=i>=6;a.firstAnswer=i<6?'1':'5';a.gradingSource='automatic';s.attempts.push(a);}
 return insightRecords(sessions,[],[]);
}
test('summary trusts first outcomes and reports supported recurrent confusion once',()=>{
 const rows=records(),before=JSON.stringify(rows),report=insightPracticeSummary([...rows,rows[0]]);
 assert.equal(report.findings.length,1);
 assert.equal(report.findings[0].kind,'confusion');assert.equal(report.findings[0].m.n,30);
 assert.match(report.findings[0].text,/6/);assert.equal(report.findings[0].items.length,6);
 assert.equal(JSON.stringify(rows),before);
 assert.equal(insightPracticeSummary(records(19)).findings.length,0);
 assert.equal(insightPracticeSummary(rows.map(r=>({...r,sessionId:'one'}))).findings.length,0);
 assert.equal(insightPracticeSummary(rows.map(r=>({...r,questionId:'one'}))).findings.length,0);
 const varied=rows.map((r,i)=>({...r,source:{...r.source,volume:i%2?.3:.7},generator:i%2?'old':'new'}));
 assert.equal(insightPracticeSummary(varied).findings[0].m.n,30);
 const mixed=rows.map((r,i)=>i%2?{...r,a:{...r.a,gradingSource:'self',imaginedWrongDegree:r.a.firstCorrect?undefined:'1'}}:r);
 assert.equal(insightPracticeSummary(mixed).findings[0].m.n,30);
 assert.equal(insightPracticeSummary(mixed).findings[0].items.length,6);
 const twoErrors=rows.map((r,i)=>({...r,a:{...r.a,firstCorrect:i>=2}}));
 assert.equal(insightPracticeSummary(twoErrors).findings.length,0);
 const unknown=rows.map(r=>({...r,a:{...r.a,firstAnswer:r.a.firstCorrect?'5':'unknown'}}));
 assert.equal(insightPracticeSummary(unknown).unknown,6);
 assert.ok(insightPracticeSummary(unknown).findings.every(f=>f.kind!=='confusion'));
 const correct=rows.map(r=>({...r,a:{...r.a,firstCorrect:true}}));
 assert.equal(insightPracticeSummary(correct).findings[0].kind,'strength');
 assert.match(insightPracticeSummary([]).message,/No recorded/);
 assert.match(insightPracticeSummary(rows.map(r=>({...r,a:{...r.a,firstCorrect:null}}))).message,/unassessed/);
});
