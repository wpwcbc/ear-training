import {selectFamily} from './insights-browser-support.mjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try{
 const page=await browser.newPage(),url='http://127.0.0.1:4173/jazz-ear-lab-v2/';
 await page.goto(url);
 await page.evaluate(async()=>{
  const {builtins,stream,attempt}=await import('/js/v2/model.js');
  const config=structuredClone(builtins[0].config),next=stream(config,'heatmap-browser'),now=new Date().toISOString();
  const s={id:'heatmap',presetId:builtins[0].id,config,startedAt:now,endedAt:now,attempts:[]};
  for(let i=0;i<32;i++){const a=attempt(config,next(),s.id,'fresh');a.exercise='m2';a.target.chord={root:'C',quality:i<31?'7':'m7',symbol:i<31?'C7':'Cm7'};a.target.degree=i<30?'9':'#11';a.firstCorrect=i<30?(i<6||i>=10&&i<19):null;s.attempts.push(a);}
  localStorage.setItem('jazzEarLab:v2:sessions',JSON.stringify([s]));sessionStorage.clear();
 });
 await page.goto(url+'#insights');await page.reload();
 const section=page.locator('.insight-performance'),cell=section.getByRole('button',{name:/^7: 9, 50 percent/});
 const bandColor=await cell.evaluate(n=>getComputedStyle(n).backgroundColor);
 await cell.focus();await page.keyboard.press('Enter');
 assert.equal(await cell.evaluate(n=>getComputedStyle(n).backgroundColor),bandColor);
 await section.getByText('15 / 30 assessed notes · 30 questions · 1 sessions · 0 unassessed notes',{exact:true}).waitFor();
 await section.locator('summary').filter({hasText:'Matching heatmap records'}).click();
 assert.equal(await section.getByRole('link',{name:'Open containing session'}).count(),30);
 const before=await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:sessions'));
 await section.getByRole('button',{name:'Review practice setup',exact:true}).click();await page.waitForURL(/insight-setup/);
 await page.getByRole('button',{name:'Back to Insights',exact:true}).click();await section.getByRole('heading',{name:'7: 9 · Recorded results',exact:true}).waitFor();
 assert.equal(await cell.getAttribute('aria-pressed'),'true');
 await page.waitForFunction(()=>document.activeElement?.textContent==='Review practice setup');
 const session=section.getByRole('link',{name:'Open containing session'}).first();
 await session.click();await page.waitForURL(/#results\//);await page.goBack();
 await page.waitForFunction(()=>document.activeElement?.textContent==='Open containing session');
 await section.getByRole('button',{name:'Back to heatmap'}).click();assert.equal(await cell.evaluate(n=>n===document.activeElement),true);
 assert.equal(await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:sessions')),before);
 await mkdir('.impeccable/review/v2-heatmap',{recursive:true});
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await section.screenshot({path:`.impeccable/review/v2-heatmap/${width}.png`});}
 await section.getByRole('button',{name:/^m7: #11, unassessed/}).click();await section.getByText('No accuracy result yet.',{exact:true}).waitFor();
 await selectFamily(page,'Degree Recognition');
 await section.getByRole('button',{name:/^7: 9, 50 percent/}).waitFor();
 console.log('PASS performance heatmap values, evidence, source preview, return, keyboard, states and responsive widths');
}finally{await browser.close();}
