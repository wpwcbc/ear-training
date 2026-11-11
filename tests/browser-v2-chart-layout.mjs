import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {referenceRuns} from './fixtures/insights-reference.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
try{
 const page=await browser.newPage({viewport:{width:1084,height:956}});
 await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});
 await page.goto('http://127.0.0.1:4173/jazz-ear-lab-v2/');
 const seed=JSON.stringify(referenceRuns());
 await page.evaluate(seed=>localStorage.setItem('jazzEarLab:v2:progressionHistory',seed),seed);
 await page.goto('http://127.0.0.1:4173/jazz-ear-lab-v2/#insights');await page.reload();
 await page.getByLabel('Practice family',{exact:true}).selectOption('Play by Ear');
 await page.getByRole('button',{name:'Progression',exact:true}).click();
 const heatmap=page.locator('.insight-performance');
 assert.equal(await heatmap.locator('.table-scroll').evaluate(n=>n.scrollWidth>n.clientWidth),false,'ordinary seven-degree heatmap must fit');
 assert.equal(await heatmap.locator('.heatmap-cell small').count(),0,'counts belong in evidence');
 const confusions=page.locator('.insight-confusions');
 assert.equal(await confusions.locator('.confusion-list>details:visible').count(),3);
 assert.equal(await confusions.getByLabel('Practice source for m7: 5 → 1',{exact:true}).isVisible(),false);
 await confusions.getByRole('button',{name:'All confusions',exact:true}).click();
 assert.ok(await confusions.locator('.confusion-list>details:visible').count()>3);
 await confusions.getByRole('button',{name:'Show fewer',exact:true}).click();
 await mkdir('.impeccable/review/insights-charts-37-38',{recursive:true});
 const geometry=[];
 for(const width of [1084,379,320]){
  await page.setViewportSize({width,height:956});await page.evaluate(()=>scrollTo(0,0));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  geometry.push(await page.evaluate(()=>({width:innerWidth,regions:Object.fromEntries(['.insight-practice-summary','.insight-confusions','.insight-performance','.insight-performance table'].map(selector=>{const n=document.querySelector(selector),r=n.getBoundingClientRect();return [selector,{x:r.x,y:r.y,width:r.width,height:r.height,scrollWidth:n.scrollWidth,clientWidth:n.clientWidth}];}))})));
  const actual=await page.screenshot({path:`.impeccable/review/insights-charts-37-38/${width}.png`});
  if(width!==320){
   const reference=await readFile(`.impeccable/mocks/insights-summary-2026-11-09/references/overview-${width===1084?'desktop':'mobile'}.png`);
   const comparisons=await page.evaluate(async({a,r,width})=>{
    const decode=async(data)=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();return i;};
    const actual=await decode(a),ref=await decode(r),result={};
    for(const mode of ['pair','overlay','difference']){const canvas=document.createElement('canvas');canvas.width=mode==='pair'?width*2:width;canvas.height=956;const ctx=canvas.getContext('2d');ctx.drawImage(ref,0,0);if(mode==='overlay')ctx.globalAlpha=.5;if(mode==='difference')ctx.globalCompositeOperation='difference';ctx.drawImage(actual,mode==='pair'?width:0,0);result[mode]=canvas.toDataURL().split(',')[1];}return result;
   },{a:actual.toString('base64'),r:reference.toString('base64'),width});
   for(const [mode,data]of Object.entries(comparisons))await writeFile(`.impeccable/review/insights-charts-37-38/${width}-${mode}.png`,Buffer.from(data,'base64'));
  }
 }
 await writeFile('.impeccable/review/insights-charts-37-38/geometry.json',JSON.stringify(geometry,null,2)+'\n');
 await page.setViewportSize({width:1084,height:956});
 await confusions.getByRole('button',{name:'Matrix',exact:true}).click();
 await confusions.getByRole('button',{name:'m7: target 5, reported 1, 9 errors',exact:true}).click();
 await confusions.getByText('9 of 137 assessed target notes',{exact:true}).waitFor();
 await confusions.locator('.confusion-list>details:not([hidden])').getByText('16 first errors in this target group',{exact:true}).waitFor();
 await confusions.screenshot({path:'.impeccable/review/insights-charts-37-38/matrix.png'});
 await confusions.getByRole('button',{name:'List',exact:true}).click();
 const cell=heatmap.getByRole('button',{name:/^7: 9, 81 percent/});
 await cell.focus();await page.keyboard.press('Enter');
 await heatmap.getByText(/^29 \/ 36 assessed notes · 36 questions · \d+ sessions · 0 unassessed notes$/).waitFor();
 await heatmap.screenshot({path:'.impeccable/review/insights-charts-37-38/selected-cell.png'});
 await heatmap.getByRole('button',{name:'Back to heatmap'}).click();
 assert.equal(await cell.evaluate(n=>n===document.activeElement),true);
 assert.equal(await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:progressionHistory')),seed);
 console.log('PASS chart layout, compact disclosure, complete heatmap and preserved records');
}finally{await browser.close();}
