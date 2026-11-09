import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const url=(process.env.BASE_URL||'http://127.0.0.1:4173')+'/jazz-ear-lab-v2/';
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.insightAudioStarts=0;for(const Context of new Set([window.AudioContext,window.webkitAudioContext].filter(Boolean)))for(const method of ['createOscillator','createBufferSource']){const original=Context.prototype[method];Context.prototype[method]=function(...args){window.insightAudioStarts++;return original.apply(this,args);};}});
 await page.goto(url);
 const expected=await page.evaluate(async()=>{
  const {builtins,stream,attempt}=await import('/js/v2/model.js');const {defaultConfig,generate}=await import('/js/v2/progression.js');
  const now=new Date().toISOString(),sessions=[],runs=[],totals={};
  for(const exercise of ['m1','m2']){
   const c={...structuredClone(builtins[0].config),exercise,roots:['D'],qualities:['m7'],targetPools:{m7:['5']},targets:['5'],targetMode:'exact'},next=stream(c,'integration-'+exercise);
   const group=Array.from({length:3},(_,i)=>({id:exercise+i,config:c,presetId:builtins[0].id,startedAt:now,endedAt:now,attempts:[]}));
   for(let i=0;i<27;i++){const s=group[i%3],a=attempt(c,next(),s.id,'fresh');a.responseMethod=exercise==='m1'?['imagined','sung','played'][i%3]:'degree-button';a.firstCorrect=i%5!==0;a.firstAnswer=exercise==='m1'?(a.firstCorrect?'correct':'incorrect'):(a.firstCorrect?'5':'1');if(!a.firstCorrect)a.imaginedWrongDegree=i?'1':'unknown';a.completedAt=now;a.timingValidity='valid';a.firstResponseMs=1000;a.retryCount=2;s.attempts.push(a);}
   if(exercise==='m2')group[0].attempts.push(structuredClone(group[0].attempts[0]));
   sessions.push(...group);totals[exercise]={n:27,correct:21,questions:27};
  }
  for(const mode of ['recognition','singing','play','play-single']){
   const c={...defaultConfig(mode),keyMode:'random',keyPool:['C','Eb']},group=Array.from({length:3},(_,i)=>({id:mode+i,config:c,ended:true,questions:[]}));let n=0,correct=0;
   for(let i=0;i<27;i++){const q=generate(c,()=>.2,i%2?'Eb':'C');q.created=now;q.submitted=true;q.done=true;q.referencePlayed=true;q.completionDelayMs=250;q.completionTimingVersion='v2-play-after-backing-1';q.notes.forEach((note,j)=>{note.exposure='fresh';note.correct=!(j===0&&i%5===0);note.answer=note.correct?note.degree:(i?'unknown':note.degree==='1'?'5':'1');n++;if(note.correct)correct++;});group[i%3].questions.push(q);}
   totals[mode]={n,correct,questions:27};runs.push(...group);
  }
  const oldDate=new Date(Date.now()-45*86400000).toISOString(),oldConfig={...structuredClone(builtins[0].config),exercise:'m2'},old=attempt(oldConfig,stream(oldConfig,'old-period')(),'old-period','fresh');old.firstCorrect=true;old.firstAnswer=old.target.degree;old.completedAt=oldDate;
  sessions.push({id:'old-period',config:oldConfig,presetId:builtins[0].id,startedAt:oldDate,endedAt:oldDate,attempts:[old]});
  localStorage.setItem('jazzEarLab:v2:sessions',JSON.stringify(sessions));localStorage.setItem('jazzEarLab:v2:progressionHistory',JSON.stringify(runs));sessionStorage.clear();return totals;
 });
 await page.goto(url+'#insights');await page.reload();
 assert.match(await page.locator('.insight-total-line').textContent(),/531\/567 assessed notes · 162 questions · 18 sessions/);
 const saved=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
 for(const [family,contexts]of [['Degree Recognition',[['Single Chord','m2'],['Progression','recognition']]],['Degree Audiation',[['Single Chord','m1'],['Progression','singing']]],['Play by Ear',[['Single Chord','play-single'],['Progression','play']]]]){
  await page.getByLabel('Practice family',{exact:true}).selectOption(family);
  for(const [context,id]of contexts){await page.getByRole('button',{name:context,exact:true}).click();const outcome=page.locator('.insight-outcome');await outcome.waitFor();assert.equal(await outcome.getAttribute('data-assessed'),String(expected[id].n));assert.equal(await outcome.getAttribute('data-correct'),String(expected[id].correct));
   assert.ok(await page.locator('.insight-practice-summary').count());assert.ok(await page.locator('.insight-performance table').count());
  }
 }
 await page.getByLabel('Practice family',{exact:true}).selectOption('Degree Recognition');await page.getByRole('button',{name:'Single Chord',exact:true}).click();
 await page.getByLabel('Period',{exact:true}).selectOption('All time');assert.equal(await page.locator('.insight-outcome').getAttribute('data-assessed'),'28');
 await page.getByLabel('Period',{exact:true}).selectOption('Last 7 days');assert.equal(await page.locator('.insight-outcome').getAttribute('data-assessed'),'27');
 await page.getByLabel('Practice family',{exact:true}).selectOption('Play by Ear');await page.getByRole('button',{name:'Progression',exact:true}).click();
 await mkdir('.impeccable/review/v2-insights-integration',{recursive:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>window.scrollTo(0,0));
  await page.getByRole('heading',{name:'Your practice focus',exact:true}).waitFor({state:'visible'});
  const summary=await page.locator('.insight-practice-summary').boundingBox(),confusions=await page.locator('.insight-confusions').boundingBox(),performance=await page.locator('.insight-performance').boundingBox(),support=await page.locator('.insight-lead').boundingBox();
  assert.ok(summary.y+summary.height<=confusions.y+1);assert.ok(confusions.y<support.y);
  if(width===1440)assert.ok(confusions.x+confusions.width<=performance.x+1);else assert.ok(confusions.y+confusions.height<=performance.y+1);
  await page.screenshot({path:`.impeccable/review/v2-insights-integration/first-viewport-${width}.png`});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.getByLabel('Practice family',{exact:true}).selectOption('Degree Audiation');await page.getByRole('button',{name:'Single Chord',exact:true}).click();
 await page.locator('summary').filter({hasText:/^More filters$/}).click();await page.getByLabel('Production category',{exact:true}).selectOption('imagined-sung');assert.equal(await page.locator('.insight-outcome').getAttribute('data-assessed'),'18');
 await page.getByLabel('Production category',{exact:true}).selectOption('played');assert.equal(await page.locator('.insight-outcome').getAttribute('data-assessed'),'9');
 await page.getByLabel('Practice family',{exact:true}).selectOption('Play by Ear');await page.getByRole('button',{name:'Progression',exact:true}).click();
 await page.getByLabel('Period',{exact:true}).selectOption('Last 7 days');await page.getByRole('button',{name:'Degree',exact:true}).click();
 if(!await page.getByLabel('Chord quality',{exact:true}).isVisible())await page.locator('summary').filter({hasText:/^More filters$/}).click();await page.getByLabel('Chord quality',{exact:true}).selectOption('m7');
 assert.ok((await page.locator('.insight-performance tbody th').allTextContents()).every(x=>x==='m7'));
 await page.getByRole('button',{name:'Key',exact:true}).click();await page.getByRole('button',{name:'Inspect C',exact:true}).click();
 assert.equal(await page.locator('.insight-outcome').getAttribute('data-assessed'),'28');
 await page.getByLabel('Root',{exact:true}).selectOption('D');
 assert.equal(await page.locator('.insight-outcome').getAttribute('data-assessed'),'28');
 await page.getByRole('button',{name:'Degree',exact:true}).click();await page.getByRole('button',{name:/^Inspect m7 \//}).first().click();
 assert.equal(await page.locator('.insight-performance thead th').count(),2);
 const confusion=page.locator('.insight-confusions');await confusion.getByRole('button',{name:'Matrix',exact:true}).click();
 const direction=confusion.getByRole('button',{name:'m7: target 1, reported 5, 1 errors'});await direction.focus();await page.keyboard.press('Enter');
 const selected=confusion.locator('.confusion-list>details:not([hidden])');await selected.locator('summary').filter({hasText:'View matching records'}).click();assert.equal(await selected.getByRole('link',{name:'Open containing session'}).count(),1);
 assert.equal(await page.locator('.insight-outcome').getAttribute('data-assessed'),'14');
 await selected.getByRole('button',{name:'Review practice setup for m7: 1 → 5'}).click();await page.waitForURL(/insight-setup/);
 await page.getByRole('button',{name:'Back to Insights',exact:true}).click();await direction.waitFor();
 assert.equal(await page.getByLabel('Root',{exact:true}).inputValue(),'D');assert.equal(await page.locator('.insight-outcome').getAttribute('data-assessed'),'14');
 await page.getByLabel('Practice family',{exact:true}).selectOption('Overall');
 const filterBox=await page.locator('.insight-current-scope').boundingBox(),summaryBox=await page.locator('.insight-practice-summary').boundingBox();
 assert.ok(filterBox.y+filterBox.height<=summaryBox.y);assert.match(await page.locator('.insight-current-scope').textContent(),/root: D/);
 await mkdir('.impeccable/review/v2-insights-integration',{recursive:true});
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`.impeccable/review/v2-insights-integration/${width}.png`,fullPage:true});}
 await page.setViewportSize({width:1280,height:1000});await page.evaluate(()=>document.documentElement.style.zoom='2');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'.impeccable/review/v2-insights-integration/zoom-200.png',fullPage:true});
 assert.equal(await page.evaluate(()=>window.insightAudioStarts),0);
 if(process.env.QUALITY_AXE_PATH){await page.addScriptTag({path:process.env.QUALITY_AXE_PATH});const violations=await page.evaluate(async()=> (await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));assert.deepEqual(violations,[]);}
 assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))),saved);
 assert.deepEqual(errors,[]);console.log('PASS six exercise counts, M1 categories, period/quality scope, persistence, no audio and 200% zoom');
 const wide=await browser.newPage({viewport:{width:320,height:1000}});await wide.goto(url);
 await wide.evaluate(async()=>{
  const {builtins,attempt,optionsFor}=await import('/js/v2/model.js'),{degrees,targetPc}=await import('/js/jazz/theory.js');
  const config={...structuredClone(builtins[0].config),exercise:'m2',roots:['D'],qualities:['m7'],targetPools:{m7:degrees},targetMode:'exact',targets:degrees},chord={root:'D',quality:'m7',symbol:'Dm7'},now=new Date().toISOString();
  const attempts=degrees.map((degree,i)=>({...attempt(config,{id:'wide'+i,chord,degree,midi:60+targetPc(chord,degree),options:optionsFor(chord,degree),generatorVersion:'synthetic-wide'},'wide','fresh'),firstCorrect:false,firstAnswer:degree==='1'?'5':'1',completedAt:now}));
  localStorage.setItem('jazzEarLab:v2:sessions',JSON.stringify([{id:'wide',config,presetId:builtins[0].id,startedAt:now,endedAt:now,attempts}]));sessionStorage.clear();
 });
 await wide.goto(url+'#insights');await wide.reload();await wide.locator('.insight-confusions').getByRole('button',{name:'Matrix',exact:true}).click();
 const grid=wide.getByRole('region',{name:'Degree confusion matrix',exact:true});
 assert.ok(await grid.evaluate(n=>n.scrollWidth>n.clientWidth));
 const altered=grid.getByRole('button',{name:'m7: target bb7, reported 1, 1 errors'});await altered.focus();await wide.keyboard.press('Enter');
 assert.ok((await wide.evaluate(()=>document.activeElement.textContent)).includes('bb7 → 1'));
 assert.equal(await wide.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await wide.setViewportSize({width:1280,height:1000});await wide.evaluate(()=>document.documentElement.style.zoom='2');assert.equal(await wide.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 console.log('PASS 18-degree wide matrices, alteration labels, keyboard evidence and bounded zoom reflow');
}finally{await browser.close();}
