import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium'});
const url=(process.env.BASE_URL||'http://127.0.0.1:4173')+'/jazz-ear-lab-v2/';
try{
 const folder=process.env.V2_INSIGHT_SCREENSHOTS;if(folder)await mkdir(folder,{recursive:true});
 const page=await browser.newPage({viewport:{width:390,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 await page.evaluate(async()=>{
  const {builtins,stream,attempt,keys}=await import('/js/v2/model.js');const config=structuredClone(builtins[0].config),next=stream(config,'reporting'),now=new Date().toISOString();
  const s={id:'reporting',config,presetId:'m2-general',startedAt:now,endedAt:now,attempts:Array.from({length:10},(_,i)=>({...attempt(config,next(),'reporting','fresh'),firstCorrect:i<9,completedAt:now}))};
  const {defaultConfig,generate}=await import('/js/v2/progression.js');
  const c={...defaultConfig('play'),keyMode:'random',keyPool:['C','Eb'],pools:{m7:['b7'],7:['3'],maj7:['5']}};
  const runs=Array.from({length:3},(_,session)=>({id:'play-'+session,config:c,ended:true,questions:Array.from({length:10},(_,i)=>{
   const q=generate(c,()=>.2,'Eb');q.created=now;q.notes.forEach((n,j)=>{n.correct=j!==0||i%3===2;n.answer=n.correct?n.degree:'1';n.exposure='fresh';});q.done=true;q.submitted=true;q.referencePlayed=true;q.completionDelayMs=100;q.completionTimingVersion='v2-play-after-backing-1';return q;
  })}));
  localStorage.setItem('jazzEarLab:v2:progressionHistory',JSON.stringify(runs));
  localStorage.setItem(keys.sessions,JSON.stringify([s]));sessionStorage.removeItem('jazzEarLab:v2:insightView');
 });
 await page.goto(url+'#insights');await page.reload();
 await page.getByLabel('Practice family',{exact:true}).selectOption('Degree Recognition');
 await page.getByRole('heading',{name:'Single Chord · Degree Recognition',exact:true}).waitFor();
 await page.getByText('9 / 10 assessed',{exact:true}).waitFor();
 await page.getByText('10 questions · 1 sessions · 0 unassessed',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Period',{exact:true}).inputValue(),'Last 28 days');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByLabel('Practice family',{exact:true}).selectOption('Play by Ear');await page.getByRole('button',{name:'Progression',exact:true}).click();
 await page.getByText('159 / 180 assessed',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Inspect Eb',exact:true}).focus();await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Explore the music');
 await page.getByLabel('Chord view',{exact:true}).selectOption('Full chord');
 await page.getByRole('button',{name:'Inspect Fm7',exact:true}).focus();await page.keyboard.press('Enter');
 await page.getByRole('heading',{name:'m7 / b7',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Explore the music');
 assert.ok(await page.getByRole('button',{name:'key: Eb · remove',exact:true}).count());
 await page.locator('summary').filter({hasText:/^More filters$/}).click();await page.getByLabel('Root',{exact:true}).selectOption('F');
 await page.getByLabel('Practice family',{exact:true}).selectOption('Degree Audiation');
 assert.ok((await page.locator('main').innerText()).includes('root: F'));
 await page.getByRole('button',{name:'Single Chord',exact:true}).click();
 await page.getByText(/Cleared incompatible filters: playback key/).waitFor();
 assert.ok((await page.locator('main').innerText()).includes('root: F'));
 await page.getByLabel('Practice family',{exact:true}).selectOption('Play by Ear');await page.getByRole('button',{name:'Progression',exact:true}).click();
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();
 await page.getByRole('heading',{name:'What to practise next',exact:true}).waitFor();
 await page.locator('summary').filter({hasText:/^Detailed breakdown$/}).click();assert.equal(await page.getByRole('table',{name:'Full chord × degree',exact:true}).count(),1);
 await page.locator('summary').filter({hasText:/^Detailed breakdown$/}).click();
 assert.ok(await page.getByText('Repeated first-response errors',{exact:true}).count());
 assert.ok(await page.getByText('Coverage gap · insufficient practice, not a weakness',{exact:true}).count());
 await page.getByRole('button',{name:/^View evidence:.*Fm7.*b7/}).first().click();
 await page.getByRole('button',{name:'Matching practice conditions · remove',exact:true}).waitFor();
 await page.getByRole('button',{name:'Progression',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Matching practice conditions · remove',exact:true}).count(),1);
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();
 const before=await page.evaluate(()=>({presets:localStorage.getItem('jazzEarLab:v2:progressionPresets'),history:localStorage.getItem('jazzEarLab:v2:progressionHistory')}));
 const setup=page.getByRole('button',{name:/^Setup practice:.*Fm7.*b7/});await setup.first().click();
 await page.getByRole('heading',{name:'Customize Progression · Play by Ear',exact:true}).waitFor();
 assert.equal(await page.getByLabel('Practice key',{exact:true}).inputValue(),'Eb');
 assert.equal(await page.getByLabel('Chord 1',{exact:true}).inputValue(),'Dm7');
 await page.getByLabel('Chord 1 beats',{exact:true}).fill('2');await page.getByLabel('Chord 1 beats',{exact:true}).dispatchEvent('change');
 assert.deepEqual(await page.evaluate(()=>({presets:localStorage.getItem('jazzEarLab:v2:progressionPresets'),history:localStorage.getItem('jazzEarLab:v2:progressionHistory')})),before);
 await page.getByRole('button',{name:'Back to Insights',exact:true}).click();
 await page.getByRole('heading',{name:'Progression · Play by Ear',exact:true}).waitFor();
 await page.locator('summary').filter({hasText:/^Sessions$/}).click();await page.getByRole('link',{name:'View latest matching session',exact:true}).click();
 await page.getByRole('heading',{name:'Progression · Play by Ear',exact:true}).waitFor();
 await page.reload();await page.getByRole('button',{name:'Overall Insights',exact:true}).click();
 await page.getByRole('heading',{name:'Progression · Play by Ear',exact:true}).waitFor();
 if(folder){await page.getByRole('button',{name:'Key',exact:true}).click();for(const width of [320,390,1440]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:folder+'/play-insights-'+width+'.png',fullPage:true});}}
 for(const family of ['Degree Recognition','Degree Audiation','Play by Ear']){
  await page.getByLabel('Practice family',{exact:true}).selectOption(family);
  for(const context of ['Single Chord','Progression']){await page.getByRole('button',{name:context,exact:true}).click();await page.getByRole('heading',{name:context+' · '+family,exact:true}).waitFor();}
 }
 await page.getByLabel('Practice family',{exact:true}).selectOption('Overall');
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 if(folder){for(const width of [320,390,1440]){await page.setViewportSize({width,height:1000});await page.screenshot({path:folder+'/overall-'+width+'.png',fullPage:true});}}
 // An independent Single Chord draft must not persist edits into the source preset.
 await page.getByLabel('Practice family',{exact:true}).selectOption('Degree Recognition');await page.getByRole('button',{name:'Single Chord',exact:true}).click();
 const singlePresets=await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:presets'));
 await page.getByRole('button',{name:/^Setup practice:/}).first().click();
 await page.getByRole('heading',{name:'Customize Single Chord · Degree Recognition',exact:true}).waitFor();
 await page.getByRole('button',{name:'Practice',exact:true}).click();
 await page.getByLabel('Questions (0 = Unlimited)',{exact:true}).fill('2');await page.getByLabel('Questions (0 = Unlimited)',{exact:true}).dispatchEvent('change');
 assert.equal(await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:presets')),singlePresets);
 await page.getByRole('button',{name:'Back to Insights',exact:true}).click();
 // A progression-history read failure must preserve bytes and offer retry.
 const bytes=await page.evaluate(()=>{window.insightGetItem=Storage.prototype.getItem;const bytes=localStorage.getItem('jazzEarLab:v2:progressionHistory');Storage.prototype.getItem=function(key){if(key==='jazzEarLab:v2:progressionHistory')throw Error('read blocked');return window.insightGetItem.call(this,key);};return bytes;});
 await page.goto(url+'#home');await page.goto(url+'#insights');await page.getByRole('button',{name:'Retry Insights',exact:true}).waitFor();
 await page.evaluate(()=>Storage.prototype.getItem=window.insightGetItem);await page.getByRole('button',{name:'Retry Insights',exact:true}).click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:progressionHistory')),bytes);
 assert.deepEqual(errors,[]);console.log('PASS actionable Insights recent overview, family/context, date scope and distinct counts.');
}finally{await browser.close();}
