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
test('Play by Ear freezes post-backing delay and commits explicit self-ratings once',()=>{
 const q=progression.generate({...structuredClone(progression.defaults),mode:'play-single',roots:['C'],qualities:['maj7'],notes:1,chords:[{symbol:'Cmaj7',beats:4}]},()=>0);
 assert.throws(()=>progression.finishPerformance(q,1000));
 progression.performanceComplete(q,1000);progression.finishPerformance(q,3400);
 assert.equal(q.completionDelayMs,2400);assert.equal(q.done,true);
 progression.finishPerformance(q,9000);assert.equal(q.completionDelayMs,2400);
 assert.throws(()=>progression.assessPerformance(q,{}));
 q.referencePlayed=true;progression.assessPerformance(q,{});assert.equal(progression.report([q]).correct,1);
 progression.assessPerformance(q,{[q.notes[0].id]:'unknown'});assert.equal(progression.report([q]).correct,1);
});
test('completion-delay summaries use correct unassisted whole questions, never notes',()=>{
 const questions=[1000,3000,5000].map(delay=>{const q=progression.generate({...structuredClone(progression.defaults),mode:'play'});progression.performanceComplete(q,100);progression.finishPerformance(q,100+delay);q.referencePlayed=true;progression.assessPerformance(q,{});return q;});
 const assisted=structuredClone(questions[0]);assisted.id='assisted';assisted.before=1;
 const wrong=structuredClone(questions[0]);wrong.id='wrong';wrong.notes[0].correct=false;
 const interrupted=structuredClone(questions[0]);interrupted.id='interrupted';interrupted.interrupted=true;
 const report=progression.completionTiming([...questions,assisted,wrong,interrupted]);
 assert.equal(report.groups[0].n,3);assert.equal(report.groups[0].median,3000);assert.equal(report.excluded,3);
});
