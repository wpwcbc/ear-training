import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {referenceRuns} from './fixtures/insights-reference.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const source='.impeccable/mocks/insights-summary-2026-11-09';
const output='.impeccable/review/insights-reference-baseline';
const manifest=JSON.parse(await readFile(source+'/reference-manifest.json','utf8'));
const seed=referenceRuns(),stored=JSON.stringify(seed);
for(const run of referenceRuns())for(const q of run.questions){
 for(let i=0;i<6;i+=2)assert.notEqual(q.notes[i].degree,q.notes[i+1].degree,'No repeated target within a chord');
}
try{
 const page=await browser.newPage({deviceScaleFactor:1});
 await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});
 await page.goto(base+'/jazz-ear-lab-v2/');
 await page.evaluate((runs)=>{
  localStorage.clear();sessionStorage.clear();
  localStorage.setItem('jazzEarLab:v2:progressionHistory',JSON.stringify(runs));
 },seed);
 await page.goto(base+'/jazz-ear-lab-v2/#insights');await page.reload();
 await page.getByLabel('Practice family',{exact:true}).selectOption('Play by Ear');
 await page.getByRole('button',{name:'Progression',exact:true}).click();
 const outcome=page.locator('.insight-outcome');
 assert.equal(await outcome.getAttribute('data-assessed'),'1326');
 assert.equal(await outcome.getAttribute('data-correct'),'1274');
 const evidence=await page.evaluate(async()=>{
  const {progressionRuns,progressionEvidence}=await import('/js/v2/progression-ui.js');
  const {insightRecords,insightConfusions,insightGroups,insightStats}=await import('/js/v2/insights.js');
  const records=insightRecords([],progressionRuns(),progressionEvidence());
  return {...insightConfusions(records),stats:insightStats(records),cells:insightGroups(records,'degree').map(g=>[g.label,g.m.correct,g.m.n])};
 });
 const fifth=evidence.groups.find(g=>g.quality==='m7'&&g.target==='5'&&g.reported==='1');
 assert.equal(fifth.count,9);
 assert.deepEqual(fifth.roots,[{label:'Dm7',count:7},{label:'Am7',count:1},{label:'Gm7',count:1}]);
 assert.equal(evidence.unknown,17);assert.equal(evidence.unassessed,24);
 assert.equal(evidence.stats.questions,225);assert.equal(evidence.stats.sessions,21);
 assert.deepEqual(evidence.cells.sort(),[
  ['m7 / 1',109,114],['m7 / b3',88,92],['m7 / 5',121,137],['m7 / b7',90,99],
  ['7 / 1',100,103],['7 / 3',104,106],['7 / 5',81,86],['7 / b7',111,111],['7 / 9',29,36],
  ['maj7 / 1',90,90],['maj7 / 3',155,156],['maj7 / 5',90,90],['maj7 / maj7',106,106]
 ].sort());
 for(const [quality,target,reported,count]of [['m7','b7','b3',5],['m7','b3','b7',4],['7','9','1',3]]){
  assert.equal(evidence.groups.find(g=>g.quality===quality&&g.target===target&&g.reported===reported).count,count);
 }
 await page.locator('.confusion-list > details').filter({has:page.locator('summary').filter({hasText:/^m7: 5 → 1/})}).locator('summary').first().click();
 const reports=[];
 await mkdir(output,{recursive:true});
 async function captureScreen(screen){
  const [,,width,height]=screen.crop;
  await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));
  await page.evaluate(()=>document.fonts.ready);
  const capture=await page.screenshot({path:`${output}/${screen.id}-actual.png`});
  await page.screenshot({path:`${output}/${screen.id}-diagnostic-full-page.png`,fullPage:true});
  const reference=await readFile(`${source}/references/${screen.id}.png`);
  const comparisons=await page.evaluate(async({actual,reference,width,height,regions})=>{
   const decode=async(src)=>{const i=new Image();i.src=src;await i.decode();return i;};
   const a=await decode(actual),r=await decode(reference);
   if(a.width!==r.width||a.height!==r.height)throw new Error('Comparison dimensions differ');
   const make=(w=width,h=height)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
   const encode=c=>c.toDataURL('image/png').split(',')[1];
   const pair=make(width*2);let c=pair.getContext('2d');c.drawImage(r,0,0);c.drawImage(a,width,0);
   const overlay=make();c=overlay.getContext('2d');c.drawImage(r,0,0);c.globalAlpha=.5;c.drawImage(a,0,0);
   const diff=make();c=diff.getContext('2d');c.drawImage(r,0,0);c.globalCompositeOperation='difference';c.drawImage(a,0,0);
   const result={pair:encode(pair),overlay:encode(overlay),difference:encode(diff)};
   for(const [name,[x,y,w,h]]of Object.entries(regions)){
    const crop=make(w*2,h);c=crop.getContext('2d');c.drawImage(r,x,y,w,h,0,0,w,h);c.drawImage(a,x,y,w,h,w,0,w,h);result[name]=encode(crop);
   }
   return result;
  },{actual:'data:image/png;base64,'+capture.toString('base64'),reference:'data:image/png;base64,'+reference.toString('base64'),width,height,regions:screen.regions??{panel:[0,0,width,height]}});
  for(const [kind,png]of Object.entries(comparisons))await writeFile(`${output}/${screen.id}-${kind}.png`,Buffer.from(png,'base64'));
  const regions={};
  for(const [name,selector]of Object.entries({summary:'.insight-practice-summary',confusions:'.insight-confusions',performance:'.insight-performance',secondary:'.insight-lead'})){
   const node=page.locator(selector);if(!await node.count())continue;
   regions[name]={bounds:await node.evaluate(el=>{const b=el.getBoundingClientRect();return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};}),text:await node.innerText()};
   await node.screenshot({path:`${output}/${screen.id}-diagnostic-${name}.png`});
  }
  reports.push({screen:screen.id,viewport:{width,height},regions,status:'MISMATCH: current build is not the approved reference'});
 }
 for(const screen of manifest.screens.slice(0,2))await captureScreen(screen);
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:`${output}/responsive-${width}.png`});
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:progressionHistory')),stored);
 await page.locator('.insight-confusions').getByRole('button',{name:'Matrix',exact:true}).click();
 await captureScreen(manifest.screens.find(s=>s.id==='matrix'));
 await page.locator('.insight-confusions').getByRole('button',{name:'List',exact:true}).click();
 const direction=page.locator('.confusion-list > details').filter({has:page.locator('summary').filter({hasText:/^m7: 5 → 1/})});
 await direction.evaluate(el=>el.open=true);
 await captureScreen(manifest.screens.find(s=>s.id==='evidence'));
 await direction.getByRole('button',{name:'Review practice setup for m7: 5 → 1',exact:true}).click();
 await page.waitForURL(/insight-setup/);
 await captureScreen(manifest.screens.find(s=>s.id==='setup-preview'));
 await page.getByRole('button',{name:'Back to Insights',exact:true}).click();
 await captureScreen(manifest.screens.find(s=>s.id==='return-selection'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:progressionHistory')),stored);
 for(const state of ['no-records','empty-period','unassessed','limited','all-correct','unknown-direction']){
  await page.evaluate(runs=>localStorage.setItem('jazzEarLab:v2:progressionHistory',JSON.stringify(runs)),referenceRuns(state));
  await page.reload();await page.setViewportSize({width:390,height:1000});
  await page.screenshot({path:`${output}/state-${state}.png`});
  await captureScreen(manifest.screens.find(s=>s.id===state));
 }
 await writeFile(output+'/observed-regions.json',JSON.stringify(reports,null,2)+'\n');
 console.log('PASS fixture totals, native-size comparison generation and history preservation; visual mismatch remains expected.');
}finally{await browser.close();}
