import assert from 'node:assert/strict';
import {defaultConfig,generate} from '../js/v2/progression.js';
import {referenceRuns} from './fixtures/insights-reference.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {openDisclosure,openSources,selectFamily} from './insights-browser-support.mjs';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const url=(process.env.BASE_URL||'http://127.0.0.1:4173')+'/jazz-ear-lab-v2/';
const ref='.impeccable/mocks/insights-summary-2026-11-09';
const out=process.env.INSIGHTS_STATE_ARTIFACTS;
const manifest=JSON.parse(await readFile(ref+'/reference-manifest.json','utf8'));
const keys='jazzEarLab:v2:progressionHistory';
function fixture(id){
 if(id!=='limited'&&id!=='all-correct')return referenceRuns(id);
 const config={...defaultConfig('play'),notes:1,chords:[{symbol:'Dm7',beats:4},{symbol:'Gm7',beats:4}],pools:{m7:['5']}};
 const runs=Array.from({length:id==='limited'?1:4},(_,i)=>({id:'state-'+i,config,ended:true,questions:[]}));
 for(let i=0;i<(id==='limited'?2:30);i++){
  const q=generate(config,()=>.2,'C');
  Object.assign(q,{created:'2026-11-08T12:00:00Z',done:true,submitted:true,referencePlayed:true});
  q.notes.forEach((n,j)=>{n.correct=id==='all-correct'||i+j>0;n.answer=n.correct?n.degree:'1';});
  runs[i%runs.length].questions.push(q);
 }
 return runs;
}
const geometry={};
async function compare(page,id,region){
 if(!out)return;
 const screen=manifest.screens.find(s=>s.id===id);
 const [,,w,h]=screen.crop,[x,y,cw,ch]=region??[0,0,w,h];
 const actual=await page.screenshot({path:`${out}/${id}.png`});
 const reference=await readFile(`${ref}/references/${id}.png`);
 const images=await page.evaluate(async({a,b,x,y,cw,ch})=>{
  async function decode(data){const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();return img;}
  const first=await decode(b),second=await decode(a);
  if(first.width!==second.width||first.height!==second.height)throw Error('Comparison dimensions differ');
  return Object.fromEntries(['pair','overlay','difference'].map(mode=>{
   const c=document.createElement('canvas');c.width=cw*(mode==='pair'?2:1);c.height=ch;
   const ctx=c.getContext('2d');ctx.drawImage(first,x,y,cw,ch,0,0,cw,ch);
   if(mode==='overlay')ctx.globalAlpha=.5;
   if(mode==='difference')ctx.globalCompositeOperation='difference';
   ctx.drawImage(second,x,y,cw,ch,mode==='pair'?cw:0,0,cw,ch);
   return [mode,c.toDataURL().split(',')[1]];
  }));
 },{a:actual.toString('base64'),b:reference.toString('base64'),x,y,cw,ch});
 for(const [type,data]of Object.entries(images))await writeFile(`${out}/${id}-${type}.png`,Buffer.from(data,'base64'));
 geometry[id]=await page.locator(id.startsWith('overview')?'.insight-secondary-disclosure>summary':'header, .insight-toolbar select, .insight-state-panel h2, .insight-state-lead, .insight-state-icon, .insight-state-footer, .insight-state-action').evaluateAll(nodes=>nodes.map(n=>({text:n.innerText,rect:n.getBoundingClientRect().toJSON()})));
}
const expected={
 'no-records':['No practice records in this browser.','Choose an exercise'],
 'empty-period':['No records in the last 28 days.','Show all time'],
 unassessed:['12 unassessed recorded notes','0 assessed notes · 2 questions · 1 session','No accuracy result yet.','View sessions'],
 limited:['Early observations','m7 fifth: 3 / 4 correct','4 assessed notes · 2 questions · 1 session','Limited sample','More practice is needed before highlighting a pattern.','View evidence'],
 'all-correct':['All assessed notes were correct in this period.','60 / 60 assessed notes · 30 questions · 4 sessions','No recorded first-error directions.','Review performance'],
 'unknown-direction':['Errors recorded, but no specific wrong degrees.','Unknown: 5 · Without annotation: 2','These errors count in accuracy, not in the confusion matrix.','View evidence']
};
const fits=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
try{
 if(out)await mkdir(out,{recursive:true});
 for(const [id,copy]of Object.entries(expected)){
  const [,,width,height]=manifest.screens.find(s=>s.id===id).crop;
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});
  await page.goto(url);
  const seed=JSON.stringify(fixture(id));
  if(id!=='no-records')await page.evaluate(([key,seed])=>localStorage.setItem(key,seed),[keys,seed]);
  await page.goto(url+'#insights');await page.reload();
  const panel=page.locator('.insight-state-panel');
  assert.equal(await page.getByLabel('Period',{exact:true}).inputValue(),'Last 28 days');
  assert.equal(await panel.getAttribute('data-state'),id);
  assert.equal((await panel.innerText()).replace(/\s+/g,' ').trim(),['Your practice focus',...copy].join(' '));
  await page.evaluate(()=>document.fonts.ready);
  await compare(page,id);
  if(out&&process.env.QUALITY_AXE_PATH){
   await page.addScriptTag({path:process.env.QUALITY_AXE_PATH});
   const violations=await page.evaluate(async()=> (await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id));
   assert.deepEqual(violations,[],id);
  }
  for(const width of [320,390,1440]){
   await page.setViewportSize({width,height:900});
   assert.ok(await fits(page),`${id} fits ${width}px`);
  }
  await page.setViewportSize({width,height});
  if(id==='no-records'){
   assert.equal(await page.getByRole('heading',{name:'Degree confusions',exact:true}).count(),0);
   await panel.getByRole('link',{name:'Choose an exercise',exact:true}).tap();await page.waitForURL(/#home$/);
  }else if(id==='empty-period'){
   await panel.getByRole('button',{name:'Show all time',exact:true}).tap();
   assert.equal(await page.getByLabel('Period',{exact:true}).inputValue(),'All time');
   await page.getByRole('heading',{name:'Degree confusions',exact:true}).waitFor();
  }else if(id==='unassessed'){
   await panel.getByRole('button',{name:'View sessions',exact:true}).tap();
   await page.waitForFunction(()=>document.activeElement?.textContent==='Sessions');
   const link=page.getByRole('link',{name:'View latest matching session',exact:true});
   await link.click();await page.waitForURL(/results/);await page.goBack();await link.waitFor();
   await page.waitForFunction(()=>document.activeElement?.textContent==='View latest matching session');
  }else if(id==='all-correct'){
   await panel.getByRole('button',{name:'Review performance',exact:true}).tap();
   await page.waitForFunction(()=>document.activeElement?.textContent==='Performance by chord degree');
   await page.getByRole('button',{name:/^m7: 5, 100 percent, 60 of 60 assessed notes/}).waitFor();
  }else{
   const disclosure=panel.locator('summary');await disclosure.focus();await page.keyboard.press('Enter');
   const links=panel.getByRole('link');
   await links.first().waitFor();
   assert.equal(await links.count(),id==='limited'?4:7);
   if(id==='unknown-direction')assert.equal(await panel.getByRole('link',{name:/Without annotation/}).count(),2);
   const first=links.first(),label=await first.textContent();await first.click();await page.waitForURL(/results/);await page.goBack();
   await page.waitForFunction(label=>document.activeElement?.textContent===label,label);
  }
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),keys),id==='no-records'?null:seed);
  assert.deepEqual(errors,[]);
  await page.close();
 }
 if(out){
  const page=await browser.newPage({deviceScaleFactor:1});
  await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});
  await page.goto(url);
  await page.evaluate(([key,seed])=>localStorage.setItem(key,seed),[keys,JSON.stringify(referenceRuns())]);
  await page.goto(url+'#insights');await page.reload();await selectFamily(page,'Play by Ear');
  await page.getByRole('button',{name:'Progression',exact:true}).click();
  for(const id of ['overview-desktop','overview-mobile']){
   const {crop:[,,width,height],regions}=manifest.screens.find(s=>s.id===id);
   await page.setViewportSize({width,height});
   await page.evaluate(async()=>{document.activeElement?.blur();scrollTo(0,0);await document.fonts.ready;});
   assert.equal(await page.locator('.insight-secondary-disclosure[open]').count(),0);
   await compare(page,id,regions.secondary);
  }
  for(const width of [1084,379]){
   await page.setViewportSize({width,height:956});
   await openDisclosure(page,'Timing and replay');await openSources(page);
   const support=page.locator('.insight-secondary');
   assert.ok(await fits(page));
   await support.screenshot({path:`${out}/expanded-${width}.png`});
  }
  await writeFile(out+'/geometry.json',JSON.stringify(geometry,null,2)+'\n');
 }
 console.log('PASS six state panels, exact copy, truthful actions, responsive widths and preserved records');
}finally{await browser.close();}
