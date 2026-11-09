import test from 'node:test';
import assert from 'node:assert/strict';
import {insightConfusionMatrix,insightConfusions,insightRecords} from '../js/v2/insights.js';
import {builtins,stream,attempt} from '../js/v2/model.js';
test('matrix projects the quality-specific first-error list without recounting outcomes',()=>{
 const config=structuredClone(builtins[0].config),next=stream(config,'matrix');
 const session={id:'matrix',config,attempts:[],startedAt:new Date().toISOString()};
 for(let i=0;i<12;i++){const a=attempt(config,next(),session.id,'fresh');a.target.chord.quality=i<10?'m7':'7';a.target.degree='5';a.firstCorrect=false;a.firstAnswer=i===9?'unknown':'1';a.gradingSource='automatic';session.attempts.push(a);}
 const rows=insightRecords([session],[],[]),report=insightConfusions([...rows,rows[0]]),matrix=insightConfusionMatrix(report,'m7');
 assert.deepEqual(matrix.degrees,['1','5']);assert.equal(matrix.groups.length,1);
 assert.equal(matrix.groups[0].count,9);assert.equal(matrix.groups[0],report.groups[0]);
 assert.equal(report.unknown,1);assert.equal(insightConfusionMatrix(report,'7').groups[0].count,2);
 assert.equal(insightConfusionMatrix(report,'maj7').groups.length,0);
 assert.deepEqual(insightConfusionMatrix(insightConfusions([]),'m7').degrees,[]);
 const altered={...rows[0],degree:'#11',a:{...rows[0].a,id:'altered',firstAnswer:'b5'}};
 const alteredMatrix=insightConfusionMatrix(insightConfusions([altered]),'m7');
 assert.deepEqual(alteredMatrix.degrees,['#11','b5']);
 assert.equal(alteredMatrix.groups[0].count,1);
 const filtered=insightConfusions(rows.filter(r=>r.quality==='7'));
 assert.equal(insightConfusionMatrix(filtered,'m7').groups.length,0);
 assert.equal(insightConfusionMatrix(filtered,'7').groups[0].count,2);
});
