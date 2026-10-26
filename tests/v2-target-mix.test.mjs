import test from 'node:test';
import assert from 'node:assert/strict';
import {builtins, validate, stream} from '../js/v2/model.js';

test('per-quality pools drive balanced quality sampling without changing old presets or recognition options',()=>{
 const old=structuredClone(builtins[0].config), original=JSON.stringify(old);
 const config={...old,qualities:['maj7','m7'],targetPools:{maj7:['3'],m7:['1','b3','5','b7']}};
 const next=stream(config,'per-quality');
 const rows=Array.from({length:80},()=>next());
 assert.equal(rows.filter(q=>q.chord.quality==='maj7').length,40);
 assert.deepEqual([...new Set(rows.filter(q=>q.chord.quality==='maj7').map(q=>q.degree))],['3']);
 for(const degree of ['1','b3','5','b7'])assert.equal(rows.filter(q=>q.chord.quality==='m7'&&q.degree===degree).length,10);
 assert.ok(rows.every(q=>q.options.length===12&&q.generatorVersion==='v2-quality-balanced-2'));
 assert.equal(JSON.stringify(old),original);
 assert.throws(()=>validate({...config,targetPools:{maj7:[],m7:['b3']}}),/maj7/);
});

test('editable old presets preserve their eligible degrees, missing levels, and valid history',async()=>{
 const {editableConfig}=await import('../js/v2/model.js');
 const old={...structuredClone(builtins[0].config),qualities:['maj7','m7']};
 const saved=JSON.stringify(old), converted=editableConfig(old);
 assert.deepEqual(converted.targetPools,{maj7:['3','maj7'],m7:['b3','b7']});
 assert.deepEqual(converted.voiceLevels,[1,1,1,1,1]);
 assert.equal(JSON.stringify(old),saved);
 assert.throws(()=>validate({...converted,voiceLevels:[0,0,0,0,0]}),/maj7 \/ 3/);
 for(const level of [-0.1,2.1,NaN,Infinity])assert.throws(()=>validate({...converted,voiceLevels:[1,level,1,1,1]}),/0% to 200%/);
 assert.deepEqual(validate({...converted,voiceLevels:[2,1,0,1,1]}).voiceLevels,[2,1,0,1,1]);
});

test('Overall deduplicates assessed identities and pools valid first-correct times without losing grades',async()=>{
 const {attempt,metrics}=await import('../js/v2/model.js');
 const q=stream(builtins[0].config,'stats')();
 const rows=[1000,2000,3000,4000].map((time,i)=>({...attempt(builtins[0].config,q,'s','fresh'),exercise:i===0?'m1':'m2',firstCorrect:true,firstResponseMs:time,timingValidity:'valid'}));
 rows.push({...attempt(builtins[0].config,q,'s','fresh'),firstCorrect:false,firstResponseMs:10,timingValidity:'valid'});
 rows.push({...attempt(builtins[0].config,q,'s','fresh'),firstCorrect:true,firstResponseMs:NaN,timingValidity:'valid'});
 rows.push({...attempt(builtins[0].config,q,'s','fresh'),firstCorrect:true,firstResponseMs:-100,timingValidity:'valid'});
 const before=JSON.stringify(rows), result=metrics([...rows,rows[0]]);
 assert.equal(result.n,7);assert.equal(result.correct,6);assert.equal(result.median,2500);assert.equal(result.timed,4);
 assert.equal(JSON.stringify(rows),before);
});

test('reporting includes both modules equally and maps M1 methods only at read time',async()=>{
 const {attempt,insightRows}=await import('../js/v2/model.js');
 const q=stream(builtins[0].config,'method')();
 const rows=['imagined','sung','played',''].map(responseMethod=>({...attempt(builtins[0].config,q,'s','fresh'),exercise:'m1',responseMethod,firstCorrect:true}));
 const m2={...attempt(builtins[0].config,q,'s','fresh'),exercise:'m2',firstCorrect:true};
 const legacy={...m2,id:'legacy',exercise:'m3'};
 const saved=JSON.stringify(rows);
 assert.equal(insightRows([...rows,m2,legacy,rows[0]]).length,5);
 assert.equal(insightRows(rows,'m1','imagined-sung').length,2);
 assert.equal(insightRows(rows,'m1','played').length,1);
 assert.equal(insightRows([...rows,m2],'m2','played').length,1);
 assert.equal(JSON.stringify(rows),saved);
});

test('new pool and mix metadata remains traceable without changing historical cohort identities',async()=>{
 const {attempt,cohort}=await import('../js/v2/model.js');
 const c=builtins[0].config,q=stream(c,'trace')(),a=attempt(c,q,'s','fresh');
 const original=cohort(a);
 const newer=structuredClone(a);newer.configurationSnapshot.targetPools={'7':['3','b7']};newer.configurationSnapshot.voiceLevels=[1,1,1,1,1];
 const different=structuredClone(newer);different.configurationSnapshot.voiceLevels[1]=2;
 assert.notEqual(cohort(newer),cohort(different));
 const reordered=structuredClone(newer);reordered.configurationSnapshot.targetPools['7'].reverse();
 assert.equal(cohort(newer),cohort(reordered));assert.equal(cohort(a),original);
});
