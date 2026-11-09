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
  localStorage.setItem('jazzEarLab:v2:sessions',JSON.stringify([s]));
  sessionStorage.clear();
 });
 await page.goto('http://127.0.0.1:4173/jazz-ear-lab-v2/#insights');await page.reload();
 const section=page.locator('.insight-confusions');
 await section.getByRole('heading',{name:'Degree confusions'}).waitFor();
 const summary=section.locator('summary').filter({hasText:'m7: 5 → 1'});
 await summary.focus();await page.keyboard.press('Enter');
 await section.getByText('Dm7: 7',{exact:true}).waitFor();
 await section.getByText('Am7: 1',{exact:true}).waitFor();
 await section.getByText('Gm7: 1',{exact:true}).waitFor();
 await section.locator('summary').filter({hasText:'View matching records'}).click();
 assert.equal(await section.getByRole('link',{name:'Open containing session'}).count(),9);
 assert.ok((await section.innerText()).includes('Question '));
 assert.ok((await section.getByRole('combobox').locator('option').first().innerText()).includes('Recognition'));
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
 await section.getByText('Dm7: 7',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:sessions')),before);
 console.log('PASS confusion totals, keyboard disclosure, responsive widths, setup and return history preservation');
}finally{await browser.close();}
