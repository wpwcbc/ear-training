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
 test(`${mode}: first degrees differ across questions, including random-key draws`,()=>{
  const c={...defaultConfig(mode),keyMode:'random',keyPool:['C','Eb'],notes:2};
  const next=questionStream(c,()=>0);let prior;
  for(let i=0;i<40;i++){
   const q=next();assert.notEqual(q.notes[0].degree,prior);prior=q.notes[0].degree;
   assert.ok(q.notes.every((n,j)=>!j||n.midi!==q.notes[j-1].midi));
   assert.equal(q.source.chords[0].symbol,'Dm7');
  }
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
 test(`single-chord streams avoid consecutive degrees across balanced bag boundaries (${!!targetPools})`,()=>{
  const c={...structuredClone(builtins[0].config),roots:['C'],qualities:['maj7'],targetMode:'exact',targets:['1','3','5'],targetPools};
  const next=stream(c,'variety');let prior;const counts={};
  for(let i=0;i<300;i++){const q=next();assert.notEqual(q.degree,prior);prior=q.degree;counts[q.degree]=(counts[q.degree]||0)+1;}
  assert.deepEqual(Object.values(counts),[100,100,100]);
 });
}
test('Single Chord Play by Ear inherits distinct starting degrees',()=>{
 const next=questionStream({...defaultConfig('play-single'),roots:['C'],qualities:['maj7'],pools:{maj7:['1','3','5']}},()=>0);let prior;
 for(let i=0;i<40;i++){const q=next();assert.notEqual(q.notes[0].degree,prior);prior=q.notes[0].degree;}
});

test('different singleton-quality pools alternate at quality-bag boundaries',()=>{
 const c={...structuredClone(builtins[0].config),roots:['C'],qualities:['maj7','m7'],targetPools:{maj7:['3'],m7:['b3']}};
 const next=stream(c,'quality-boundary');let prior;
 for(let i=0;i<100;i++){const q=next();assert.notEqual(q.degree,prior);prior=q.degree;}
});
