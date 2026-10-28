import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium'});
const base=(process.env.BASE_URL||'http://127.0.0.1:4173')+'/jazz-ear-lab-v2/';
try{
 const context=await browser.newContext({viewport:{width:320,height:900}}),page=await context.newPage();page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const button=name=>page.getByRole('button',{name,exact:true});
 const ready=()=>page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Done — hear full reference'&&!b.disabled));
 const setup=async(mode,large=false)=>{
  await page.goto(base+'#home');
  await page.evaluate(async({mode,large})=>{const {defaultConfig}=await import('/js/v2/progression.js');const c=defaultConfig(mode);c.bpm=300;c.count=1;
   if(mode==='play-single'){c.roots=['C'];c.qualities=['maj7'];c.pools.maj7=['1'];}
   else {c.chords=Array.from({length:large?32:3},()=>({symbol:'C7alt',beats:1}));c.notes=large?4:2;c.key='F#';c.pools['7alt']=['b9'];}
   localStorage.setItem('jazzEarLab:v2:progressionPresets',JSON.stringify({[mode]:c}));},{mode,large});
  await page.goto(base+'#progression/'+mode);await button('Start practice').waitFor();
 };
 await page.goto(base+'#progression/play-single');await button('Target degrees').click();
 const disclosure=page.locator('summary').filter({hasText:/^m7/});if(!await disclosure.evaluate(n=>n.parentElement.open))await disclosure.click();
 const pool=page.getByRole('group',{name:'m7',exact:true}).getByRole('checkbox');
 for(let i=0;i<await pool.count();i++)if(await pool.nth(i).isChecked())await pool.nth(i).uncheck();
 assert.equal(await button('Start practice').isDisabled(),true);await button('Practice').click();await button('Review invalid settings: Target degrees').click();
 await page.getByRole('group',{name:'m7',exact:true}).waitFor();console.log('PASS invalid single-chord m7 pool routes to Target degrees rather than Sound.');
 await setup('play-single');await button('Start practice').click();await ready();
 await button('Replay demonstration').click();assert.equal(await button('Done — hear full reference').isDisabled(),true);await ready();
 await button('Done — hear full reference').click();await button('All correct').waitFor();await button('All correct').click();
 await page.getByText('Unavailable · n=0 eligible questions',{exact:true}).waitFor();await page.locator('p').filter({hasText:/^\d.*s · Replay-assisted$/}).waitFor();
 await button('Finish').click();console.log('PASS whole-cycle replay: retained task, gated Done and excluded assisted timing.');
 await setup('play-single');await button('Start practice').click();
 await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='jazzEarLab:v2:progressionHistory')throw Error('quota');return window.originalSetItem.call(this,k,v);};});
 await ready();await page.getByRole('alert').filter({hasText:'Could not save V2 data'}).waitFor();
 await page.evaluate(()=>Storage.prototype.setItem=window.originalSetItem);await button('Retry saving').click();
 await button('Done — hear full reference').click();await button('All correct').waitFor();await button('All correct').click();
 await page.getByText(/s median · n=1/).waitFor();await page.locator('p').filter({hasText:/^\d.*s · Unassisted$/}).waitFor();await button('Finish').click();
 console.log('PASS quota at healthy backing completion does not invalidate unassisted timing.');

 await setup('play-single');await button('Start practice').click();await ready();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.getByRole('alert').filter({hasText:'Playback interrupted'}).waitFor();assert.equal(await button('Done — hear full reference').isDisabled(),true);
 await page.evaluate(()=>delete document.hidden);await button('Replay demonstration').click();await ready();await button('Done — hear full reference').click();await button('All correct').waitFor();
 await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='jazzEarLab:v2:progressionHistory')throw Error('quota');return window.originalSetItem.call(this,k,v);};});
 await button('All correct').click();await page.getByRole('alert').filter({hasText:'Could not save V2 data'}).waitFor();await button('Retry saving').waitFor();
 await page.evaluate(()=>Storage.prototype.setItem=window.originalSetItem);await button('Retry saving').click();await page.getByText('1 / 1 assessed notes',{exact:true}).waitFor();
 await page.getByText('Unavailable · n=0 eligible questions',{exact:true}).waitFor();await button('Finish').click();
 console.log('PASS waiting-phase interruption/recovery and visible save retry preserve one committed outcome and exclude interrupted timing.');
 await setup('play-single');await button('Start practice').click();await ready();await button('Done — hear full reference').click();await button('All correct').waitFor();
 await page.getByRole('checkbox',{name:'Incorrect',exact:true}).check();await button('Stop').click();
 await page.getByText('0 / 0 assessed notes',{exact:true}).waitFor();await page.getByText('1 unassessed',{exact:true}).waitFor();
 console.log('PASS unsubmitted error draft is not a grade.');
 await setup('play',true);await page.getByLabel('Chord 32',{exact:true}).focus();
 const field=await page.getByLabel('Chord 32',{exact:true}).boundingBox(),launch=await button('Start practice').boundingBox();assert.ok(field.y+field.height<=launch.y);
 await button('Start practice').click();await page.getByRole('region',{name:'Instrumental reproduction board',exact:true}).waitFor();
 assert.equal(await page.getByText('Target hidden',{exact:true}).count(),128);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await button('Stop').click();await page.getByText('128 unassessed',{exact:true}).waitFor();assert.deepEqual(errors,[]);
 console.log('PASS maximum32×4 altered/repeated progression at320: all128 hidden slots, actual-key harmony, visible final field and Stop.');
 await context.close();
}finally{await browser.close();}
