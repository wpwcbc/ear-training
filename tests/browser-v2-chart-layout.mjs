import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {referenceRuns} from './fixtures/insights-reference.mjs';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const references='.impeccable/mocks/insights-summary-2026-11-09';
const output=process.env.INSIGHTS_CHART_ARTIFACTS||'.impeccable/review/insights-chart-fidelity';
const manifest=JSON.parse(await readFile(references+'/reference-manifest.json','utf8'));
const url=(process.env.BASE_URL||'http://127.0.0.1:4173')+'/jazz-ear-lab-v2/';
const geometry={};

try{
 const page=await browser.newPage({viewport:{width:1084,height:956},deviceScaleFactor:1,hasTouch:true});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});
 await page.goto(url);
 const seed=JSON.stringify(referenceRuns());
 await page.evaluate(seed=>localStorage.setItem('jazzEarLab:v2:progressionHistory',seed),seed);
 await page.goto(url+'#insights');await page.reload();
 await page.getByLabel('Practice family',{exact:true}).selectOption('Play by Ear');
 await page.getByRole('button',{name:'Progression',exact:true}).click();
 await mkdir(output,{recursive:true});
 const heatmap=page.locator('.insight-performance'),confusions=page.locator('.insight-confusions');
 const list=confusions.getByRole('button',{name:'List',exact:true});
 const visibleRows=confusions.locator('.confusion-list>details:visible');
 const eighth=heatmap.getByRole('columnheader',{name:'9',exact:true});
 assert.equal(await heatmap.locator('.table-scroll').evaluate(n=>n.scrollWidth>n.clientWidth),false,'ordinary seven-degree heatmap must fit');
 assert.deepEqual(await heatmap.getByRole('columnheader').allTextContents(),['Degree','1','b3','3','5','b7','maj7','9']);
 const lastColumn=await eighth.boundingBox(),table=await heatmap.getByRole('table').boundingBox();
 assert.ok(lastColumn.x+lastColumn.width<=table.x+table.width);
 assert.equal(await heatmap.locator('.heatmap-cell small').count(),0,'counts belong in evidence');
 assert.deepEqual(await visibleRows.locator('summary').evaluateAll(rows=>rows.map(row=>[...row.children].map(span=>span.textContent))),[['m7 · 5 → 1','9'],['m7 · b7 → b3','5'],['m7 · b3 → b7','4']]);
 assert.equal(await confusions.getByLabel('Practice source for m7: 5 → 1',{exact:true}).isVisible(),false);
 assert.equal(await list.getAttribute('aria-expanded'),'false');
 await list.focus();await page.keyboard.press('Enter');
 assert.equal(await list.getAttribute('aria-expanded'),'true');
 assert.ok(await visibleRows.count()>3);
 assert.equal(await list.evaluate(n=>n===document.activeElement),true);
 await list.tap();
 assert.equal(await visibleRows.count(),3);
 assert.equal(await confusions.getByText('All confusions',{exact:true}).count(),0,'no added default copy or row');
 await confusions.getByText('Unknown 17 · No annotation 0,not included in directions.',{exact:true}).waitFor();
 assert.equal((await confusions.locator('.confusion-overview').innerText()).replace(/\s+/g,' ').trim(),
  'Degree confusions List Matrix Target → Reported Errors m7 · 5 → 1 9 Dm77 Am71 Gm71 View matching records m7 · b7 → b3 5 m7 · b3 → b7 4 Unknown 17 · No annotation 0,not included in directions.');
 for(const copy of [...manifest.copy.confusions.slice(0,-1),...manifest.copy.performance]){
  const node=page.locator('.insight-musical-overview').getByText(copy,{exact:true}).and(page.locator(':visible'));
  await node.waitFor({state:'visible'});
 }
 const checkAccessibility=async()=>{
  if(!process.env.QUALITY_AXE_PATH)return;
  if(!await page.evaluate(()=>Boolean(window.axe)))await page.addScriptTag({path:process.env.QUALITY_AXE_PATH});
  const violations=await page.evaluate(async()=> (await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
  assert.deepEqual(violations,[]);
 };

 async function compare(id,observed){
  const screen=manifest.screens.find(s=>s.id===id),[,,width,height]=screen.crop;
  await page.setViewportSize({width,height});
  await page.evaluate(async()=>{document.activeElement?.blur();scrollTo(0,0);await document.fonts.ready;});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const actual=await page.screenshot({path:`${output}/${id}.png`});
  const reference=await readFile(`${references}/references/${id}.png`);
  const results=await page.evaluate(async({a,r,width,height,regions})=>{
   const decode=async(data)=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();return image;};
   const actual=await decode(a),reference=await decode(r),images={};
   if(actual.width!==reference.width||actual.height!==reference.height)throw Error('Native dimensions do not match');
   const canvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
   const encode=c=>c.toDataURL().split(',')[1];
   for(const mode of ['pair','overlay','difference']){
    const c=canvas(mode==='pair'?width*2:width,height),ctx=c.getContext('2d');ctx.drawImage(reference,0,0);
    if(mode==='overlay')ctx.globalAlpha=.5;
    if(mode==='difference')ctx.globalCompositeOperation='difference';
    ctx.drawImage(actual,mode==='pair'?width:0,0);images[mode]=encode(c);
   }
   for(const [name,[x,y,w,h]]of Object.entries(regions)){
    const c=canvas(w*2,h),ctx=c.getContext('2d');ctx.drawImage(reference,x,y,w,h,0,0,w,h);ctx.drawImage(actual,x,y,w,h,w,0,w,h);images[name]=encode(c);
   }
   return images;
  },{a:actual.toString('base64'),r:reference.toString('base64'),width,height,regions:screen.regions?Object.fromEntries(Object.entries(screen.regions).filter(([key])=>['confusions','performance'].includes(key))):{}});
  for(const [kind,data]of Object.entries(results))await writeFile(`${output}/${id}-${kind}.png`,Buffer.from(data,'base64'));
  geometry[id]={width,height,regions:await page.evaluate(selectors=>Object.fromEntries(selectors.map(selector=>{
   const n=document.querySelector(selector),b=n.getBoundingClientRect();
   return [selector,{x:b.x,y:b.y,width:b.width,height:b.height,clientWidth:n.clientWidth,scrollWidth:n.scrollWidth,text:n.innerText}];
  })),observed)};
 }

 const overview=['.insight-practice-summary','.confusion-heading','.confusion-columns','.confusion-list','.confusion-accounting','.insight-performance','.insight-performance table','.insight-performance tbody','.heatmap-legend'];
 await compare('overview-desktop',overview);
 await compare('overview-mobile',overview);
 const summary=await page.locator('.insight-practice-summary').boundingBox(),performance=await heatmap.boundingBox();
 assert.equal(Math.round(performance.y-summary.y-summary.height),240,'mobile confusion band must occupy the reference height');
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:956});await page.evaluate(()=>scrollTo(0,0));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`${output}/responsive-${width}.png`});
 }
 assert.ok(await heatmap.locator('.table-scroll').evaluate(n=>n.scrollWidth>n.clientWidth),'narrow charts use local scrolling');

 await page.setViewportSize({width:971,height:503});
 await confusions.getByRole('button',{name:'Matrix',exact:true}).click();
 await page.getByRole('heading',{name:'Degree confusions',level:1,exact:true}).waitFor();
 assert.equal(await page.getByRole('heading',{name:'Your practice focus',exact:true}).isVisible(),false);
 const scope='Play by Ear · Progression · Last 28 days';
 await confusions.getByText(scope,{exact:true}).waitFor();
 const direction=confusions.getByRole('button',{name:'m7: target 5, reported 1, 9 errors',exact:true});
 await direction.focus();await page.keyboard.press('Enter');
 for(const copy of ['m7: 5 → 1','9 of 137 assessed target notes','16 first errors in this target group','Unknown: 9 · Without annotation: 0','Unassessed notes: 8','Recorded first errors · 0 to 9','Target degree','Reported degree']){
  await confusions.getByText(copy,{exact:true}).waitFor();
 }
 await compare('matrix',['.confusion-matrix h1','.confusion-matrix .chart-scope','.matrix-toolbar','.matrix-plot','.confusion-matrix tbody','.matrix-legend','.matrix-selection','.matrix-accounting']);
 await checkAccessibility();
 await confusions.getByRole('button',{name:'Evidence',exact:true}).tap();
 const evidence=confusions.locator('.confusion-evidence-panel');
 for(const copy of ['m7: 5 → 1',scope,'9 recorded confusions','121 / 137 correct target notes','Across recorded roots and practice setups.','This setup is one source of these results.']){
  await evidence.getByText(copy,{exact:true}).waitFor();
 }
 assert.equal(await evidence.getByRole('link',{name:'Open containing session'}).count(),0);
 await compare('evidence',['.chart-back','.confusion-evidence-panel h1','.confusion-evidence-panel .chart-scope','.direction-totals','.confusion-evidence-panel .direction-roots','.direction-source','.direction-source select','.direction-source button']);
 await checkAccessibility();
 await page.setViewportSize({width:448,height:360});
 await evidence.getByRole('button',{name:'Review practice setup for m7: 5 → 1',exact:true}).click();
 await page.waitForURL(/insight-setup/);
 const setup=page.locator('.recorded-setup-review');
 await setup.getByRole('heading',{name:'Review practice setup',exact:true}).waitFor({timeout:2000});
 assert.equal(await page.evaluate(()=>scrollY),0);
 assert.deepEqual(await setup.locator('dt').allTextContents(),['Mode','Context','Changes','Tempo','Keys','Target pool change','Other chord pools']);
 assert.deepEqual(await setup.locator('dd').allTextContents(),['Play by Ear','Progression','Dm7 → G7 → Cmaj7','80 BPM','C, G, F','m7: 5','unchanged']);
 await compare('setup-preview',['.recorded-setup-review','.recorded-setup-review h1','.recorded-setup-review dl','.setup-review-actions']);
 await page.setViewportSize({width:320,height:850});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:971,height:503});
 await setup.getByRole('button',{name:'Open Customize',exact:true}).click();
 assert.match(page.url(),/#insight-setup$/);
 assert.equal(await page.getByRole('navigation',{name:'Configuration chapters',exact:true}).getByRole('button',{name:'Harmony',exact:true}).evaluate(n=>n===document.activeElement),true);
 await setup.getByRole('button',{name:'Back to evidence',exact:true}).click();
 await evidence.getByRole('heading',{name:'m7: 5 → 1',exact:true}).waitFor();
 await evidence.getByRole('button',{name:'Back to Insights',exact:true}).tap();
 assert.equal(await direction.getAttribute('aria-pressed'),'true');
 assert.equal(await confusions.getByRole('button',{name:'Evidence',exact:true}).evaluate(n=>n===document.activeElement),true);
 await list.click();
 const matching=visibleRows.first().getByRole('button',{name:'View matching records',exact:true});
 await matching.tap();await evidence.getByRole('button',{name:'Back to Insights',exact:true}).tap();
 assert.equal(await matching.evaluate(n=>n===document.activeElement),true);
 await page.setViewportSize({width:1084,height:956});
 const cell=heatmap.getByRole('button',{name:/^7: 9, 81 percent/});
 await cell.focus();await page.keyboard.press('Enter');
 await heatmap.getByText(/^29 \/ 36 assessed notes · 36 questions · \d+ sessions · 0 unassessed notes$/).waitFor();
 await heatmap.screenshot({path:`${output}/selected-heatmap.png`});
 await heatmap.getByRole('button',{name:'Back to heatmap'}).click();
 assert.equal(await cell.evaluate(n=>n===document.activeElement),true);
 assert.equal(await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:progressionHistory')),seed);
 assert.deepEqual(errors,[]);
 await writeFile(output+'/geometry.json',JSON.stringify(geometry,null,2)+'\n');
 console.log('PASS native overview, matrix and evidence comparisons; chart controls and preserved records');
}finally{await browser.close();}
