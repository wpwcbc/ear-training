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
 const summary=page.locator('.insight-practice-summary');
 await summary.getByText('Strong recorded results in maj7 fifths.',{exact:true}).waitFor();
 assert.equal(await summary.getByText('Recorded results across the current scope; practice settings may differ.',{exact:true}).isVisible(),false);
 await summary.getByRole('button',{name:'Set up practice',exact:true}).click();
 const evidence=summary.locator('.summary-evidence');
 assert.equal(await evidence.getAttribute('open'),'');
 const selected=evidence.locator('details[open]');
 assert.match(await selected.locator('summary').innerText(),/m7: 5 → 1/);
 await selected.getByRole('button',{name:'Review practice setup',exact:true}).click();
 await page.waitForURL(/insight-setup/);
 await page.getByRole('button',{name:'Back to Insights',exact:true}).click();
 await summary.locator('.summary-evidence[open]').waitFor();
 assert.equal(await page.evaluate(()=>localStorage.getItem('jazzEarLab:v2:progressionHistory')),seed);
 await summary.locator('.summary-evidence > summary').click();
 await mkdir('.impeccable/review/insights-summary-36',{recursive:true});
 for(const [width,height,limit]of [[1084,956,520],[379,956,440],[320,1000,530]]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>scrollTo(0,0));const actual=await page.screenshot({path:`.impeccable/review/insights-summary-36/${width}.png`});
  const b=await summary.boundingBox();console.log(width,b);assert.ok(b.y+b.height<limit,`${width}: summary ends at ${b.y+b.height}`);
  if(width!==320){
   const reference=await readFile(`.impeccable/mocks/insights-summary-2026-11-09/references/overview-${width===1084?'desktop':'mobile'}.png`);
   const images=await page.evaluate(async({a,r,width,height})=>{
    const decode=async(data)=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();return i;};
    const actual=await decode(a),ref=await decode(r),result={};
    for(const kind of ['pair','overlay','difference']){const c=document.createElement('canvas');c.width=kind==='pair'?width*2:width;c.height=height;const ctx=c.getContext('2d');ctx.drawImage(ref,0,0);if(kind==='overlay')ctx.globalAlpha=.5;if(kind==='difference')ctx.globalCompositeOperation='difference';ctx.drawImage(actual,kind==='pair'?width:0,0);result[kind]=c.toDataURL('image/png').split(',')[1];}
    return result;
   },{a:actual.toString('base64'),r:reference.toString('base64'),width,height});
   for(const [name,data]of Object.entries(images))await writeFile(`.impeccable/review/insights-summary-36/${width}-${name}.png`,Buffer.from(data,'base64'));
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 await page.getByRole('button',{name:'Navigation',exact:true}).click();
 await page.getByRole('link',{name:'Legacy',exact:true}).waitFor({state:'visible'});
 await page.getByRole('link',{name:'Legacy',exact:true}).focus();await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('button',{name:'Navigation',exact:true}).getAttribute('aria-expanded'),'false');
 await page.evaluate(()=>{const runs=JSON.parse(localStorage.getItem('jazzEarLab:v2:progressionHistory'));for(const run of runs)for(const q of run.questions)delete q.source;localStorage.setItem('jazzEarLab:v2:progressionHistory',JSON.stringify(runs));});
 await page.reload();assert.equal(await summary.getByRole('button',{name:'Set up practice',exact:true}).count(),0);
 console.log('PASS compact summary, exact evidence handoff, preserved history, responsive bounds and navigation');
}finally{await browser.close();}
