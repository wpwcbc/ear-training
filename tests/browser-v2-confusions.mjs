import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try{
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:4173/jazz-ear-lab-v2/');
 await page.evaluate(async()=>{
  const {builtins,stream,attempt}=await import('/js/v2/model.js');
  const c=structuredClone(builtins[0].config),next=stream(c,'browser-confusion');
  const s={id:'confusion',config:c,presetId:builtins[0].id,startedAt:new Date().toISOString(),endedAt:new Date().toISOString(),attempts:[]};
  for(let i=0;i<9;i++){
   const a=attempt(c,next(),s.id,'fresh'),root=i<7?'D':i===7?'A':'G';
   a.target.chord={...a.target.chord,root,quality:'m7',symbol:root+'m7'};a.target.degree='5';
   a.firstCorrect=false;a.firstAnswer='1';a.gradingSource='automatic';s.attempts.push(a);
  }
  for(let i=0;i<3;i++){const a=attempt(c,next(),s.id,'fresh');a.exercise='m2';a.gradingSource='automatic';a.target.chord={root:'C',quality:'7',symbol:'C7'};a.target.degree='#11';a.firstAnswer='b5';a.firstCorrect=false;s.attempts.push(a);}
  const unassessed=attempt(c,next(),s.id,'fresh');unassessed.target.chord={root:'C',quality:'maj7',symbol:'Cmaj7'};unassessed.firstCorrect=null;s.attempts.push(unassessed);
  localStorage.setItem('jazzEarLab:v2:sessions',JSON.stringify([s]));
  sessionStorage.clear();
 });
 await page.goto('http://127.0.0.1:4173/jazz-ear-lab-v2/#insights');await page.reload();
 const section=page.locator('.insight-confusions');
 await section.getByRole('heading',{name:'Degree confusions'}).waitFor();
 const summary=section.locator('summary[aria-label="m7: 5 → 1 · 9 errors"]');
 await summary.focus();await page.keyboard.press('Enter');
 assert.equal(await section.getByLabel('Dm7: 7',{exact:true}).isVisible(),false);
 await page.keyboard.press('Enter');
 await section.getByLabel('Dm7: 7',{exact:true}).waitFor();
 await section.getByLabel('Am7: 1',{exact:true}).waitFor();
 await section.getByLabel('Gm7: 1',{exact:true}).waitFor();
 await summary.click();
 await section.getByRole('button',{name:'Matrix',exact:true}).click();
 const matrix=section.getByRole('table',{name:'m7 · First-error directions'});
 await matrix.waitFor();
 await section.getByText('Unassessed notes: 0',{exact:true}).waitFor();
 const direction=matrix.getByRole('button',{name:'m7: target 5, reported 1, 9 errors'});
 await direction.focus();await page.keyboard.press('Enter');
 assert.ok((await page.evaluate(()=>document.activeElement.getAttribute('aria-label'))).includes('m7: 5 → 1'));
 assert.notEqual(await summary.locator('..').getAttribute('open'),null);
 await page.keyboard.press('Enter');
 assert.equal(await direction.evaluate(n=>n===document.activeElement),true);
 await page.keyboard.press('Enter');
 assert.equal(await matrix.getByRole('button').count(),1);
 const listRow=summary.locator('..');
 await listRow.locator('summary').filter({hasText:/^Evidence$/}).click();
 assert.equal(await listRow.getByRole('link',{name:'Open containing session'}).count(),9);
 await section.getByLabel('Matrix chord quality',{exact:true}).selectOption('7');
 await section.getByRole('button',{name:'7: target #11, reported b5, 3 errors'}).waitFor();
 assert.equal(await listRow.getAttribute('open'),null);
 await section.getByLabel('Matrix chord quality',{exact:true}).selectOption('m7');
 await section.getByRole('button',{name:'m7: target 5, reported 1, 9 errors'}).click();
 assert.ok((await section.innerText()).includes('Question '));
 assert.ok((await section.getByRole('combobox',{name:'Practice source for m7: 5 → 1',exact:true}).locator('option').first().innerText()).includes('Recognition'));
 await mkdir('.impeccable/review/v2-confusions',{recursive:true});
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`.impeccable/review/v2-confusions/${width}.png`,fullPage:true});
 }
 const before=await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:sessions'));
 await section.getByRole('button',{name:'Review practice setup for m7: 5 → 1'}).click();
 await page.waitForURL(/insight-setup/);
 await page.goto('http://127.0.0.1:4173/jazz-ear-lab-v2/#insights');
 await section.getByLabel('Dm7: 7',{exact:true}).waitFor();
 assert.equal(await section.getByRole('button',{name:'Matrix',exact:true}).getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:sessions')),before);
 await page.getByLabel('Practice family',{exact:true}).selectOption('Degree Recognition');
 await page.locator('summary').filter({hasText:/^More filters$/}).click();await page.getByLabel('Root',{exact:true}).selectOption('D');
 await section.getByRole('button',{name:'Matrix',exact:true}).click();
 await section.getByRole('button',{name:'m7: target 5, reported 1, 7 errors'}).waitFor();
 assert.equal(await section.getByRole('button',{name:/target #11/}).count(),0);
 console.log('PASS confusion totals, keyboard disclosure, responsive widths, setup and return history preservation');
}finally{await browser.close();}
