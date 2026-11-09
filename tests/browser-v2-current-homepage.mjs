import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const url=(process.env.BASE_URL||'http://127.0.0.1:4173')+'/jazz-ear-lab-v2/';
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
 assert.deepEqual(await page.locator('.exercises h2').allTextContents(),['Single Chord · Degree Audiation','Single Chord · Degree Recognition','Progression · Degree Recognition','Progression · Degree Audiation','Single Chord · Play by Ear','Progression · Play by Ear']);
 const entries=page.locator('.exercises .exercise');assert.equal(await entries.count(),6);
 for(const entry of await entries.all())assert.deepEqual(await entry.getByRole('button').allTextContents(),['Start','Customize']);
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('jazzEarLab:v2:presets'))??[]);
 for(const id of ['m1-general','m2-general']){
  await page.goto(url+'#home');const before=await read(),entry=page.locator(`[data-preset-id="${id}"]`);
  await entry.getByRole('button',{name:'Customize',exact:true}).click();
  const roots=page.getByRole('group',{name:'Roots',exact:true});
  for(const root of ['F#','Bb'])await roots.getByLabel(root,{exact:true}).check();
  for(const root of ['C','C#','D','Eb','E','F','G','Ab','A','B'])await roots.getByLabel(root,{exact:true}).uncheck();
  await page.getByRole('button',{name:'Target degrees',exact:true}).click();
  await page.getByRole('group',{name:'maj7',exact:true}).getByLabel('9',{exact:true}).check();
  const edited=(await read()).find(p=>p.id===id).config;
  assert.deepEqual(edited.roots,['F#','Bb']);assert.deepEqual(edited.qualities,['maj7','m7','7']);assert.ok(edited.targetPools.maj7.includes('9'));
  for(const preset of before.filter(p=>p.id!==id))assert.deepEqual((await read()).find(p=>p.id===preset.id),preset);
  await page.getByRole('button',{name:'Practice',exact:true}).click();await page.getByLabel('Questions (0 = Unlimited)',{exact:true}).fill('1');await page.getByLabel('Questions (0 = Unlimited)',{exact:true}).blur();
  await page.reload();await page.getByRole('button',{name:'Start practice',exact:true}).click();await page.waitForURL(/#practice$/);
  const session=await page.evaluate(()=>JSON.parse(localStorage.getItem('jazzEarLab:v2:sessions')).at(-1));assert.deepEqual(session.config.roots,['F#','Bb']);assert.ok(session.config.targetPools.maj7.includes('9'));
  await page.getByRole('button',{name:'Stop',exact:true}).click();await page.goto(url+'#home');await page.locator(`[data-preset-id="${id}"]`).getByRole('button',{name:'Customize',exact:true}).click();
  await page.getByText('Preset actions',{exact:true}).click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Restore Default',exact:true}).click();
  assert.equal((await read()).find(p=>p.id===id).config.roots.length,12);
 }
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 assert.deepEqual(errors,[]);console.log('PASS current six homepage entries, independent root/quality/per-quality targets, autosave, source isolation, frozen practice and Restore Default');
}finally{await browser.close();}
