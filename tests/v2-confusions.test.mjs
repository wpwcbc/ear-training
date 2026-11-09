import test from 'node:test';
import assert from 'node:assert/strict';
import {insightConfusions, insightRecords} from '../js/v2/insights.js';
import {builtins, stream, attempt} from '../js/v2/model.js';

test('confusions combine roots within a quality and count each first outcome once', () => {
  const config=structuredClone(builtins[0].config), next=stream(config,'confusions');
  const session={id:'s',config,startedAt:new Date().toISOString(),attempts:[]};
  for(const [root,count] of [['D',7],['A',1],['G',1]]) for(let i=0;i<count;i++){
    const a=attempt(config,next(),'s','fresh');
    a.target.chord={...a.target.chord,root,quality:'m7',symbol:root+'m7'};
    a.target.degree='5';a.firstCorrect=false;a.firstAnswer='1';a.gradingSource='automatic';
    session.attempts.push(a);
  }
  const rows=insightRecords([session],[],[]), before=JSON.stringify(rows);
  const report=insightConfusions([...rows,rows[0]]);
  assert.equal(report.groups.length,1);
  assert.equal(report.groups[0].count,9);
  assert.equal(report.groups[0].assessed,9);
  assert.equal(report.groups[0].questions,9);
  assert.equal(report.groups[0].sessions,1);
  assert.deepEqual(report.groups[0].roots.map(r=>[r.label,r.count]),[['Dm7',7],['Am7',1],['Gm7',1]]);
  assert.equal(JSON.stringify(rows),before);
  const variants=rows.slice(0,5).map((r,i)=>({...r,a:{...r.a,id:'variant-'+i}}));
  variants[0].a.gradingSource='self';variants[0].a.imaginedWrongDegree='unknown';
  variants[1].a.gradingSource='self';variants[1].a.imaginedWrongDegree=undefined;
  variants[2].a.firstCorrect=null;
  variants[3].a.firstCorrect=true;
  variants[4].quality='7';
  const mixed=insightConfusions([...rows,...variants]);
  assert.equal(mixed.unknown,1);assert.equal(mixed.unspecified,1);assert.equal(mixed.unassessed,1);
  assert.equal(mixed.groups.length,2);assert.equal(mixed.groups[0].count,9);
  assert.equal(mixed.groups[0].assessed,12);
  const enharmonic=rows.slice(0,2).map((r,i)=>({...r,root:'C#',chordLabel:i?'Dbm7':'C#m7'}));
  assert.deepEqual(insightConfusions(enharmonic).groups[0].roots,[{label:'C#m7 / Dbm7',count:2}]);
});
