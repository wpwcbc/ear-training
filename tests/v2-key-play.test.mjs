import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as progression from '../js/v2/progression.js';
test('fixed practice key changes sounding harmony without changing the C source',()=>{
 const source={...structuredClone(progression.defaults),keyMode:'fixed',key:'Eb'};
 const q=progression.generate(source,()=>0);
 assert.deepEqual(q.config.chords.map(c=>c.symbol),['Fm7','Bb7','Ebmaj7']);
 assert.deepEqual(source.chords.map(c=>c.symbol),['Dm7','G7','Cmaj7']);
 assert.equal(q.practiceKey,'Eb');
 assert.deepEqual(q.source.chords,source.chords);
});
test('random keys cover the selected pool without replay consumption or boundary repeats',()=>{
 const next=progression.questionStream({...structuredClone(progression.defaults),keyMode:'random',keyPool:['C','Eb','F#']},()=>0.25);
 const keys=Array.from({length:9},()=>next().practiceKey);
 for(let i=0;i<9;i+=3)assert.deepEqual([...keys.slice(i,i+3)].sort(),['C','Eb','F#']);
 assert.notEqual(keys[2],keys[3]);assert.notEqual(keys[5],keys[6]);
 assert.throws(()=>progression.validate({...progression.defaults,keyMode:'random',keyPool:[]}));
 const single=progression.questionStream({...progression.defaults,keyMode:'random',keyPool:['Eb']});assert.equal(single().practiceKey,'Eb');assert.equal(single().practiceKey,'Eb');
});
