import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium'});
const base=(process.env.BASE_URL||'http://127.0.0.1:4173')+'/jazz-ear-lab-v2/';
try{
 const page=await browser.newPage({viewport:{width:320,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'#insights');await page.getByRole('link',{name:'Choose an exercise',exact:true}).waitFor();
 await page.evaluate(async()=>{
  const {builtins,stream,attempt,keys}=await import('/js/v2/model.js');const {defaultConfig,generate}=await import('/js/v2/progression.js');
  const config={...structuredClone(builtins[1].config),roots:['C'],qualities:['7'],method:'played'},a=attempt(config,stream(config,'old-played')(),'old-played','previously-seen');a.firstCorrect=true;delete a.target.generatorVersion;
  localStorage.setItem(keys.sessions,JSON.stringify([{id:'old-played',presetId:'audiation-thirds',config,startedAt:'not-recorded',endedAt:null,attempts:[a]}]));
  const c=defaultConfig('play');c.chords[0].symbol='Dbm7';const q=generate(c,()=>.2);q.notes.forEach(n=>{n.correct=true;n.answer=n.degree;});q.done=true;q.submitted=true;q.referencePlayed=true;delete q.source;delete q.practiceKey;delete q.generatorVersion;delete q.created;
  localStorage.setItem('jazzEarLab:v2:progressionHistory',JSON.stringify([{id:'old-progression',config:c,questions:[q],ended:true}]));sessionStorage.removeItem('jazzEarLab:v2:insightView');
 });
 await page.reload();await page.getByText(/records have no usable date/).waitFor();
 await page.getByLabel('Period',{exact:true}).selectOption('All time');
 await page.getByLabel('Practice family',{exact:true}).selectOption('Play by Ear');await page.getByRole('button',{name:'Progression',exact:true}).click();
 await page.getByText('6 / 6 assessed',{exact:true}).waitFor();await page.getByRole('button',{name:'Inspect Not recorded',exact:true}).click();
 await page.getByLabel('Chord view',{exact:true}).selectOption('Full chord');await page.getByRole('heading',{name:'Dbm7',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:/^Setup practice:/}).count(),0);
 await page.getByLabel('Practice family',{exact:true}).selectOption('Degree Audiation');await page.getByRole('button',{name:'Single Chord',exact:true}).click();
 await page.getByText('1 / 1 assessed',{exact:true}).waitFor();await page.locator('summary').filter({hasText:/^More filters$/}).click();await page.getByLabel('Production category',{exact:true}).selectOption('played');await page.getByText('1 / 1 assessed',{exact:true}).waitFor();
 await page.getByLabel('Practice family',{exact:true}).selectOption('Play by Ear');await page.getByRole('heading',{name:'Single Chord · Play by Ear',exact:true}).waitFor();await page.getByText('No records for this exercise yet.',{exact:true}).waitFor();
 // Hundreds of settings remain in disclosed evidence, never hundreds of open paragraphs.
 await page.evaluate(async()=>{
  const {defaultConfig,generate}=await import('/js/v2/progression.js');
  const runs=Array.from({length:300},(_,i)=>{const config={...defaultConfig('play'),bpm:40+i%250,volume:.5+(i%10)/100},q=generate(config,()=>.3);q.notes.forEach(n=>{n.correct=true;n.answer=n.degree;n.exposure='fresh';});q.done=true;q.submitted=true;q.referencePlayed=true;return {id:'dense-'+i,config,questions:[q],ended:true};});
  localStorage.setItem('jazzEarLab:v2:progressionHistory',JSON.stringify(runs));
 });
 const raw=await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:progressionHistory'));
 await page.reload();await page.getByLabel('Period',{exact:true}).selectOption('Last 28 days');await page.getByRole('button',{name:'Progression',exact:true}).click();
 await page.getByText('1800 / 1800 assessed',{exact:true}).waitFor();
 assert.ok(await page.locator('.insight-priority').count()<=3);assert.ok(await page.locator('p:visible').count()<40);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.equal(await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:progressionHistory')),raw);
 assert.deepEqual(errors,[]);console.log('PASS empty/unknown-date and unknown-key history, original chord spelling, old played Audiation, 300 saved settings with bounded initial evidence and preserved bytes.');
}finally{await browser.close();}
