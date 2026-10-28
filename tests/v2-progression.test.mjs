import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,generate,submit,rate,validate,report} from '../js/v2/progression.js';
test('progression positions retain chord occurrence and first grades through review',()=>{
 const c=structuredClone(defaults);c.notes=4;c.chords.push({symbol:'Dm7',beats:2});
 const q=generate(c,()=>0);
 assert.equal(q.notes.length,16);assert.equal(new Set(q.notes.map(n=>n.id)).size,16);
 assert.ok(q.notes.every(n=>c.pools[n.chord.quality].includes(n.degree)));
 assert.throws(()=>submit(q,[]),/every/);
 submit(q,q.notes.map((n,i)=>i===0?'unknown':n.degree));
 assert.equal(q.notes.filter(n=>n.correct).length,15);
 submit(q,q.notes.map(n=>n.degree));assert.equal(q.notes[0].correct,false);
 assert.equal(report([q]).correct,15);
});
test('degree audiation unassessed and Unknown remain separate; invalid configuration rejected',()=>{
 const c={...structuredClone(defaults),mode:'singing'};const q=generate(c,()=>0);
 rate(q,0,false,'unknown');assert.equal(report([q]).assessed,1);assert.equal(report([q]).unassessed,q.notes.length-1);
 assert.throws(()=>validate({...c,notes:5}));assert.throws(()=>validate({...c,pools:{}}));
});

test('report adapter keeps replay events separate from assisted notes and excludes progression timing',async(t)=>{
 const {metrics,insightRows}=await import('../js/v2/model.js');
 const {progressionEvidence}=await import('../js/v2/progression-ui.js');
 const q=generate(defaults,()=>0);q.before=2;q.after=3;submit(q,q.notes.map(n=>n.degree));
 const store=JSON.stringify([{id:'run',config:defaults,questions:[q],ended:true}]);
 const original=globalThis.localStorage;
 globalThis.localStorage={getItem:key=>key==='jazzEarLab:v2:progressionHistory'?store:null};
 try {const rows=progressionEvidence(),m=metrics(insightRows(rows));assert.equal(m.n,6);assert.equal(m.replayed,6);assert.equal(m.before,2);assert.equal(m.after,3);assert.equal(metrics(rows.filter(n=>n.target.chord.quality==='7')).before,2);assert.equal(m.timed,0);assert.equal(rows[0].progressionContext,JSON.stringify(q.config));}
 finally{if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;}
});

test('audio plan evenly distributes four targets within unequal chord durations after one bar count-in',async()=>{
 const {sequence}=await import('../js/v2/progression.js');
 const c=structuredClone(defaults);c.bpm=120;c.notes=4;c.levels=[0,0,0,0,0];c.chords[1].beats=2;c.chords[2].beats=6;
 const q=generate(c,()=>0),plan=sequence(q,true);
 assert.deepEqual(plan.starts,[2,4,5]);assert.equal(plan.duration,8);
 assert.deepEqual(plan.events.map(e=>e.start),[2,2.5,3,3.5,4,4.25,4.5,4.75,5,5.75,6.5,7.25]);
 assert.equal(sequence(q,false).events.length,0,'silent accompaniment still retains full timeline');
});
