import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultConfig, generate, questionStream} from '../js/v2/progression.js';
import {builtins, stream} from '../js/v2/model.js';

for (const mode of ['recognition','singing','play']) {
 test(`${mode}: unique pitches when available, no adjacent repeats when reuse is necessary`,()=>{
  const c={...defaultConfig(mode),chords:[{symbol:'Cmaj7',beats:4},{symbol:'Cmaj7',beats:4}],notes:2,pools:{maj7:['1','3','5','maj7']}};
  const unique=generate(c,()=>0);
  assert.equal(new Set(unique.notes.map(n=>n.midi)).size,4);
  const reused=generate({...c,notes:4},()=>0);
  assert.ok(reused.notes.every((n,i)=>!i||n.midi!==reused.notes[i-1].midi));
  const counts=new Map();for(const n of reused.notes)counts.set(n.midi,(counts.get(n.midi)||0)+1);
  assert.deepEqual([...counts.values()],[2,2,2,2]);
 });
 test(`${mode}: consecutive questions can start with the same degree`,()=>{
  const next=questionStream({...defaultConfig(mode),notes:2},()=>0);
  const first=next(),second=next();
  assert.equal(first.notes[0].degree,second.notes[0].degree);
  assert.notEqual(first.id,second.id);
  assert.equal(second.source.chords[0].symbol,'Dm7');
 });
}
test('pitch identity crosses chord boundaries; enharmonic degrees are the same sound',()=>{
 const c={...defaultConfig('recognition'),notes:1,chords:[{symbol:'Cmaj7',beats:4},{symbol:'Dm7',beats:4}],pools:{maj7:['3'],m7:['9','b3']}};
 const q=generate(c,()=>0);assert.notEqual(q.notes[0].midi,q.notes[1].midi);
 const alias=generate({...c,notes:2,chords:[{symbol:'Cmaj7',beats:4},{symbol:'Cmaj7',beats:4}],pools:{maj7:['b3','#9','5']}},()=>0);
 assert.ok(alias.notes.every((n,i)=>!i||n.midi!==alias.notes[i-1].midi));
});
test('singleton pools terminate and retain valid targets when repetition is unavoidable',()=>{
 const c={...defaultConfig('recognition'),notes:4,chords:[{symbol:'Cmaj7',beats:4},{symbol:'Cmaj7',beats:4}],pools:{maj7:['1']}};
 const next=questionStream(c,()=>0);
 for(let i=0;i<3;i++)assert.ok(next().notes.every(n=>n.degree==='1'));
});
for(const targetPools of [undefined,{maj7:['1','3','5']}]){
 test(`single-chord streams retain balanced draws and allow repeats at bag boundaries (${!!targetPools})`,()=>{
  const c={...structuredClone(builtins[0].config),roots:['C'],qualities:['maj7'],targetMode:'exact',targets:['1','3','5'],targetPools};
  const next=stream(c,'variety');let prior,repeats=0;const counts={};
  for(let i=0;i<300;i++){const q=next();repeats+=Number(q.degree===prior);prior=q.degree;counts[q.degree]=(counts[q.degree]||0)+1;}
  assert.ok(repeats>0);assert.deepEqual(Object.values(counts),[100,100,100]);
 });
}
test('Single Chord Play by Ear accepts repeated starts',()=>{
 const next=questionStream({...defaultConfig('play-single'),roots:['C'],qualities:['maj7'],pools:{maj7:['3']}},()=>0);
 assert.equal(next().notes[0].degree,next().notes[0].degree);
});
function seeded(seed){let state=seed;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
test('random position priority gives early and late slots comparable degree coverage',()=>{
 const c={...defaultConfig('recognition'),chords:[{symbol:'Cmaj7',beats:4},{symbol:'Cmaj7',beats:4}],notes:2,pools:{maj7:['1','3','5','maj7']}};
 const random=seeded(41),counts=Array.from({length:4},()=>({}));
 for(let trial=0;trial<2000;trial++){
  const q=generate(c,random);assert.equal(new Set(q.notes.map(n=>n.midi)).size,4);
  q.notes.forEach((n,i)=>counts[i][n.degree]=(counts[i][n.degree]||0)+1);
 }
 for(const row of counts)for(const degree of c.pools.maj7)assert.ok(Math.abs(row[degree]/2000-.25)<.05,JSON.stringify(counts));
});
test('whole-phrase repair resolves two-pitch traps at the maximum 128-note length',()=>{
 const c={...defaultConfig('play'),chords:Array.from({length:32},()=>({symbol:'Cmaj7',beats:1})),notes:4,pools:{maj7:['1','3']}};
 for(let seed=1;seed<=20;seed++){
  const q=generate(c,seeded(seed));assert.equal(q.notes.length,128);
  assert.ok(q.notes.every((n,i)=>!i||n.midi!==q.notes[i-1].midi));
  assert.ok(q.notes.every(n=>c.pools.maj7.includes(n.degree)));
 }
});
test('repair finds the minimum unavoidable adjacent repeats in a constrained phrase',()=>{
 const c={...defaultConfig('recognition'),chords:[{symbol:'Cmaj7',beats:1},{symbol:'Dm7',beats:1},{symbol:'Cmaj7',beats:1},{symbol:'Dm7',beats:1}],notes:1,pools:{maj7:['1','3'],m7:['9']}};
 // Positions 2 and 4 force E. Choosing C at both other positions avoids all repeats.
 for(let seed=1;seed<=50;seed++){
  const q=generate(c,seeded(seed));assert.deepEqual(q.notes.map(n=>n.midi%12),[0,4,0,4]);
 }
});
