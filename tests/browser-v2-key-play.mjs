import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium'});
const base=(process.env.BASE_URL||'http://127.0.0.1:4173')+'/jazz-ear-lab-v2/';
try{
 const page=await browser.newPage({viewport:{width:390,height:900}});page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const folder=process.env.V2_KEY_SCREENSHOTS;if(folder)await mkdir(folder,{recursive:true});
 const capture=async name=>{if(!folder)return;for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+width);await page.screenshot({path:`${folder}/${name}-${width}.png`,fullPage:true});}await page.setViewportSize({width:390,height:900});};
 const button=name=>page.getByRole('button',{name,exact:true});
 const change=async(name,value)=>{await page.getByLabel(name,{exact:true}).fill(value);await page.getByLabel(name,{exact:true}).dispatchEvent('change');};
 // Homepage selection owns the mode; saved presets cannot switch exercise family.
 await page.goto(base+'#home');
 const modes=await page.evaluate(async()=>{
  const {defaultConfig}=await import('/js/v2/progression.js');
  const {progressionModes,progressionName}=await import('/js/v2/exercise-names.js');
  const entries=Object.values(progressionModes).map(mode=>[mode,progressionName(mode)]);
  localStorage.setItem('jazzEarLab:v2:progressionPresets',JSON.stringify(Object.fromEntries(entries.flatMap(([mode])=>[[mode,defaultConfig(mode)],[mode+' / My preset',defaultConfig(mode)]]))));
  return entries;
 });
 for(const [mode,name] of modes){
  await page.goto(base+'#home');
  await page.getByRole('article',{name,exact:true}).getByRole('button',{name:'Customize',exact:true}).click();
  await page.getByRole('heading',{name:'Customize '+name,exact:true}).waitFor();
  assert.equal(await page.getByLabel('Mode',{exact:true}).count(),0);
  if(mode!=='play-single'){
   assert.equal(await page.getByLabel('Transpose',{exact:true}).count(),0);
   await page.getByText('Enter your chords in C key below.',{exact:false}).waitFor();
   const source=await page.getByLabel('Chord 1',{exact:true}).inputValue();
   await page.getByLabel('Practice key',{exact:true}).selectOption('Eb');
   assert.equal(await page.getByLabel('Chord 1',{exact:true}).inputValue(),source);
   await page.getByLabel('Key mode',{exact:true}).selectOption('random');
   const pool=page.getByRole('group',{name:'Random keys',exact:true});
   await pool.getByRole('checkbox',{name:'C',exact:true}).uncheck();
   assert.equal(await pool.getByRole('checkbox').evaluateAll(nodes=>nodes.filter(node=>node.checked).length),11);
   await pool.getByRole('button',{name:'All',exact:true}).click();
   assert.equal(await pool.getByRole('checkbox').evaluateAll(nodes=>nodes.filter(node=>node.checked).length),12);
   assert.equal(await page.getByLabel('Chord 1',{exact:true}).inputValue(),source);
  }
  const presets=page.getByLabel('Saved preset',{exact:true});
  assert.deepEqual(await presets.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value)),[mode,mode+' / My preset']);
  await presets.selectOption(mode+' / My preset');
  await page.getByRole('heading',{name:'Customize '+name,exact:true}).waitFor();
  await page.reload();await page.getByRole('heading',{name:'Customize '+name,exact:true}).waitFor();
 }
 // A stale base preset with the wrong mode must not override the homepage route.
 await page.evaluate(()=>{const key='jazzEarLab:v2:progressionPresets',presets=JSON.parse(localStorage.getItem(key));presets.play=presets.recognition;localStorage.setItem(key,JSON.stringify(presets));});
 await page.goto(base+'#progression/play');
 await page.getByRole('heading',{name:'Customize Progression · Play by Ear',exact:true}).waitFor();
 await page.evaluate(()=>localStorage.removeItem('jazzEarLab:v2:progressionPresets'));
 await page.goto(base+'#progression/recognition');await page.getByLabel('Practice key',{exact:true}).selectOption('Eb');
 assert.equal(await page.getByLabel('Chord 1',{exact:true}).inputValue(),'Dm7');await capture('fixed-key-config');
 await button('Practice').click();await change('BPM','300');await change('Questions (0 = Unlimited)','1');await button('Start practice').click();
 await page.getByRole('group',{name:/1 · Fm7/}).waitFor();await button('Stop').click();await button('Practice again').click();
 await page.getByLabel('Key mode',{exact:true}).selectOption('random');
 const keys=page.getByRole('group',{name:'Random keys',exact:true}).getByRole('checkbox');
 for(let i=0;i<12;i++)await keys.nth(i).uncheck();assert.equal(await button('Start practice').isDisabled(),true);await capture('empty-key-pool');
 await button('All').click();await capture('random-key-config');assert.equal(await keys.evaluateAll(nodes=>nodes.filter(node=>node.checked).length),12);assert.equal(await button('Start practice').isEnabled(),true);assert.equal(await page.getByRole('alert').count(),0);
 assert.equal(await page.getByLabel('Chord 1',{exact:true}).inputValue(),'Dm7');
 await page.goto(base+'#home');await page.getByRole('article',{name:'Single Chord · Play by Ear',exact:true}).getByRole('button',{name:'Customize',exact:true}).click();
 await button('Practice').click();await change('BPM','300');await change('Questions (0 = Unlimited)','1');
 await button('Start practice').click();
 assert.equal(await page.locator('.progression-target-degree').count(),0);
 assert.equal(await button('Done — hear full reference').isDisabled(),true);
 await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Done — hear full reference'&&!b.disabled));
 await capture('single-performance');await button('Done — hear full reference').click();await button('All correct').waitFor();await capture('single-check');await button('All correct').click();await button('Finish').click();
 await page.getByText('1 / 1 assessed notes',{exact:true}).waitFor();await page.getByText(/Post-accompaniment completion delay/).first().waitFor();
 await page.goto(base+'#home');await page.getByRole('article',{name:'Progression · Play by Ear',exact:true}).getByRole('button',{name:'Customize',exact:true}).click();
 await page.getByLabel('Practice key',{exact:true}).selectOption('Eb');
 for(let i=1;i<=3;i++)await change('Chord '+i+' beats','1');
 await button('Practice').click();await change('BPM','300');await change('Questions (0 = Unlimited)','1');
 await button('Start practice').click();assert.equal(await page.locator('.progression-target-degree').count(),0);
 await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Done — hear full reference'&&!b.disabled));
 await capture('progression-performance');await button('Done — hear full reference').click();await button('All correct').waitFor();await capture('progression-check');
 assert.equal(await page.locator('.progression-target-degree').count(),6);
 const wrong=page.getByRole('checkbox',{name:'Incorrect',exact:true});await wrong.nth(1).check();await wrong.nth(4).check();
 const annotation=page.getByLabel('Degree you played · 1/2',{exact:true});const option=await annotation.locator('option').nth(1).getAttribute('value');await annotation.selectOption(option);
 await button('Remaining notes correct and submit').click();await page.getByText('4 / 6 assessed notes',{exact:true}).waitFor();
 await button('Finish').click();await page.getByText('4 / 6 assessed notes',{exact:true}).waitFor();await capture('progression-results');
 await button('Overall Insights').click();await button('Progression · Play by Ear').click();
 await page.getByText('4 / 6 assessed',{exact:true}).waitFor();await page.getByText('Unavailable · n=0 eligible questions',{exact:true}).waitFor();await capture('play-insights');
 await button('Overall').click();await page.getByText('5 / 7 assessed',{exact:true}).waitFor();
 await page.getByText('Sessions',{exact:true}).click();const latest=page.getByRole('link',{name:'View latest matching session',exact:true});await latest.click();
 await page.getByText('4 / 6 assessed notes',{exact:true}).waitFor();await page.reload();await page.getByText('4 / 6 assessed notes',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS homepage mode retained, mode-scoped presets and stale-preset recovery; fixed/random keys; both Play by Ear automatic cycles, 4/6 mixed grades, Overall5/7, isolated delay and matching-history reload.');
}finally{await browser.close();}
