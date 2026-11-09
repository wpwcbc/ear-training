import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try{
 const page=await browser.newPage(),url='http://127.0.0.1:4173/jazz-ear-lab-v2/';
 await page.goto(url);
 await page.evaluate(async()=>{
  const {builtins,stream,attempt}=await import('/js/v2/model.js');
  const config=structuredClone(builtins[0].config),next=stream(config,'summary-browser'),now=new Date().toISOString();
  const sessions=Array.from({length:3},(_,i)=>({id:'summary'+i,presetId:builtins[0].id,config,startedAt:now,endedAt:now,attempts:[]}));
  for(let i=0;i<60;i++){const s=sessions[i%3],a=attempt(config,next(),s.id,'fresh');a.exercise='m2';a.gradingSource='automatic';a.configurationSnapshot.volume=i%2?.3:.7;a.target.chord={root:'D',quality:i<30?'m7':'maj7',symbol:i<30?'Dm7':'Dmaj7'};a.target.degree=i<30?'5':'3';a.firstCorrect=i>=6;a.firstAnswer=i<6?'1':a.target.degree;s.attempts.push(a);}
  localStorage.setItem('jazzEarLab:v2:sessions',JSON.stringify(sessions));sessionStorage.clear();
 });
 await page.goto(url+'#insights');await page.reload();
 const summary=page.locator('.practice-summary');
 await summary.getByText(/reported as 1 in 6 first errors/).waitFor();
 assert.equal(await summary.locator('.summary-finding').count(),2);
 const detail=summary.locator('details').filter({has:page.locator('summary').filter({hasText:'View evidence: m7: 5 → 1'})});
 await detail.locator('summary').click();
 assert.equal(await detail.getByRole('link',{name:'Open containing session'}).count(),6);
 assert.equal(await detail.getByRole('combobox').locator('option').count(),2);
 await detail.getByRole('combobox').selectOption('1');
 const before=await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:sessions'));
 await detail.getByRole('button',{name:'Review practice setup'}).click();await page.waitForURL(/insight-setup/);
 await page.getByRole('button',{name:'Back to Insights',exact:true}).click();
 await detail.getByRole('button',{name:'Review practice setup'}).waitFor();
 assert.equal(await detail.getByRole('combobox').inputValue(),'1');
 assert.equal(await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:sessions')),before);
 await mkdir('.impeccable/review/v2-practice-summary',{recursive:true});
 await detail.locator('summary').click();
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});await summary.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await summary.screenshot({path:`.impeccable/review/v2-practice-summary/${width}.png`});}
 await page.getByLabel('Practice family',{exact:true}).selectOption('Degree Recognition');
 await summary.getByText(/reported as 1 in 6 first errors/).waitFor();
 await detail.locator('summary').click();await detail.getByRole('combobox').selectOption('1');
 await page.locator('summary').filter({hasText:/^Practice coverage$/}).click();
 const coverage=page.getByLabel('Coverage setup',{exact:true});
 if(await coverage.count()){const text=await summary.innerText();await coverage.selectOption({index:1});assert.equal(await summary.innerText(),text);assert.equal(await detail.getByRole('combobox').inputValue(),'1');}
 await page.locator('summary').filter({hasText:/^More filters$/}).click();await page.getByLabel('Chord quality',{exact:true}).selectOption('maj7');
 assert.equal(await summary.getByText(/reported as 1/).count(),0);
 await summary.getByText(/All 30 assessed notes/).waitFor();
 console.log('PASS summary evidence, mixed sources, return, filtering, coverage independence and responsive widths');
}finally{await browser.close();}
