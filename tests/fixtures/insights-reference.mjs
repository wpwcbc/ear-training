import {defaultConfig,generate} from '../../js/v2/progression.js';
import {targetPc} from '../../js/jazz/theory.js';

// Each quality has 442 assessed and eight unassessed target positions.
const cells={
 m7:[['1',114,109],['b3',92,88],['5',137,121],['b7',99,90]],
 '7':[['1',103,100],['3',106,104],['5',86,81],['b7',111,111],['9',36,29]],
 maj7:[['1',90,90],['3',156,155],['5',90,90],['maj7',106,106]],
};
export function referenceRuns(state='overview'){
 if(state!=='overview'){
  if(state==='no-records')return [];
  const runs=referenceRuns();
  if(state==='empty-period'){
   runs.forEach(r=>r.questions.forEach(q=>q.created='2026-01-01T12:00:00.000Z'));return runs;
  }
  const count=state==='all-correct'?10:2;
  const questions=runs.flatMap(r=>r.questions).slice(0,count);
  let position=0;
  questions.forEach(q=>q.notes.forEach(n=>{
   const i=position++;n.correct=state==='unassessed'?null:state==='all-correct'?true:i>=7;
   n.answer=n.correct===null?null:n.correct?n.degree:state==='unknown-direction'?(i<5?'unknown':null):'unknown';
  }));
  return Array.from({length:state==='all-correct'?4:1},(_,i)=>({...runs[i],questions:questions.filter((_,j)=>j%(state==='all-correct'?4:1)===i)}));
 }
 const config={...defaultConfig('play'),keyMode:'random',keyPool:['C','G','F'],notes:2};
 config.pools=Object.fromEntries(Object.entries(cells).map(([quality,rows])=>[quality,rows.map(r=>r[0])]));
 const outcomes=Object.fromEntries(Object.entries(cells).map(([quality,rows])=>{
  const notes=rows.flatMap(([degree,n,correct])=>Array.from({length:n},(_,i)=>({degree,correct:i>=n-correct,answer:i>=n-correct?degree:'unknown'})));
  const wrong=(degree)=>notes.filter(n=>n.degree===degree&&!n.correct);
  if(quality==='m7'){
   [0,1,2,3,4,5,6,8,10].forEach(i=>wrong('5')[i].answer='1');
   wrong('b7').slice(0,5).forEach(n=>n.answer='b3');
   wrong('b3').forEach(n=>n.answer='b7');
   wrong('1').slice(0,3).forEach(n=>n.answer='5');
   wrong('b7').slice(5,8).forEach(n=>n.answer='1');
   wrong('5')[9].answer='b7';
  }
  if(quality==='7'){
   wrong('9').slice(0,3).forEach(n=>n.answer='1');
   wrong('5').slice(0,2).forEach(n=>n.answer='3');
   wrong('3').slice(0,1).forEach(n=>n.answer='#11');
   wrong('5').slice(2,3).forEach(n=>n.answer='13');
   wrong('5').slice(3,4).forEach(n=>n.answer='b7');
   wrong('9').slice(3,4).forEach(n=>n.answer='3');
  }
  if(quality==='maj7')wrong('3')[0].answer='#11';
  notes.push(...Array.from({length:8},()=>({degree:'1',correct:null,answer:null})));
  return [quality,notes];
 }));
 const runs=Array.from({length:21},(_,i)=>({id:`reference-run-${i}`,config:structuredClone(config),ended:true,questions:[]}));
 for(let i=0;i<225;i++){
  // Directed fifth errors at 206..212, 214, 216: Dm7=7, Am7=1, Gm7=1.
  const key=i===214?'G':i===216?'F':'C';
  const q=generate(config,()=>.2,key);q.id=`reference-question-${i}`;
  q.created='2026-11-08T12:00:00.000Z';q.done=true;q.submitted=true;q.referencePlayed=true;
  q.notes.forEach((note,j)=>{
   const outcome=outcomes[note.chord.quality][i+(j%2)*225];
   Object.assign(note,outcome,{id:`reference-note-${i}-${j}`,exposure:'fresh',assisted:false});
   note.midi=60+targetPc(note.chord,note.degree);
  });
  runs[i%21].questions.push(q);
 }
 return runs;
}
