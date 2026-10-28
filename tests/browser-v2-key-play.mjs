import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium'});
const base=(process.env.BASE_URL||'http://127.0.0.1:4173')+'/jazz-ear-lab-v2/';
try{
 const page=await browser.newPage({viewport:{width:390,height:900}});page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const button=name=>page.getByRole('button',{name,exact:true});
 const change=async(name,value)=>{await page.getByLabel(name,{exact:true}).fill(value);await page.getByLabel(name,{exact:true}).dispatchEvent('change');};
 await page.goto(base+'#progression/recognition');await page.getByLabel('Practice key',{exact:true}).selectOption('Eb');
 assert.equal(await page.getByLabel('Chord 1',{exact:true}).inputValue(),'Dm7');
 await button('Practice').click();await change('BPM','300');await change('Questions (0 = Unlimited)','1');await button('Start practice').click();
 await page.getByRole('group',{name:/1 · Fm7/}).waitFor();await button('Stop').click();await button('Practice again').click();
 await page.getByLabel('Key mode',{exact:true}).selectOption('random');
 const keys=page.getByRole('group',{name:'Random keys',exact:true}).getByRole('checkbox');
 for(let i=0;i<12;i++)await keys.nth(i).uncheck();assert.equal(await button('Start practice').isDisabled(),true);
 await button('All').click();assert.equal(await keys.filter({checked:true}).count(),12);assert.equal(await button('Start practice').isEnabled(),true);
 assert.equal(await page.getByLabel('Chord 1',{exact:true}).inputValue(),'Dm7');
 await page.goto(base+'#home');await page.getByRole('article',{name:'Single Chord · Play by Ear',exact:true}).getByRole('button',{name:'Customize',exact:true}).click();
 await button('Practice').click();await change('BPM','300');await change('Questions (0 = Unlimited)','1');
 await button('Start practice').click();
 assert.equal(await page.locator('.progression-target-degree').count(),0);
 assert.equal(await button('Done — hear full reference').isDisabled(),true);
 await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Done — hear full reference'&&!b.disabled));
 await button('Done — hear full reference').click();await button('All correct').waitFor();await button('All correct').click();await button('Finish').click();
 await page.getByText('1 / 1 assessed notes',{exact:true}).waitFor();await page.getByText(/Post-accompaniment completion delay/).first().waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS fixed/random keys: unchanged C source, actual Eb harmony, All and empty-pool validation.');
}finally{await browser.close();}
