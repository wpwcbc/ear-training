import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {channel:'msedge'})});
try {
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:4173/jazz-ear-lab-v2/');
 const results=await page.evaluate(async()=>{
  const {AudioEngine}=await import('/js/jazz/audio.js');
  const {parseChord,chordNotes}=await import('/js/jazz/theory.js');
  const native=window.AudioContext;
  const results=[];
  try {
   // Exercise the real public playback API against an actual rendered Web Audio
   // output. Replace only the device/clock boundary, never engine internals.
   for(const quality of ['maj','7','7alt'])for(const kind of ['question','reference','live','audition']){
    const offline=new OfflineAudioContext(1,44100*6,44100);
    window.AudioContext=function(){return new Proxy(offline,{get(target,key){
     if(key==='state')return 'running';if(key==='resume')return async()=>{};
     const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
    }});};
    const engine=new AudioEngine();await engine.ready();
    const chord=parseChord('C'+quality),target=76,voiceLevels=[2,2,2,2,2];
    if(kind==='reference')engine.playReference(chord,target,1,null,voiceLevels);
    else if(kind==='live'){
     const plan=engine.playSingle(chord,null,1,true,{excludeTarget:target,voiceLevels});
     // A running-device façade advances currentTime to the scheduled onset.
     // The offline device still renders the exact scheduled graph.
     Object.defineProperty(offline,'currentTime',{value:0.05,configurable:true});
     engine.playReference(chord,target,1,plan,voiceLevels);
    } else engine.playSingle(chord,kind==='question'?target:null,1,true,{voiceLevels});
    const buffer=await offline.startRendering();
    let peak=0;for(const value of buffer.getChannelData(0))peak=Math.max(peak,Math.abs(value));
    results.push({quality,voices:chordNotes(chord).length,kind,peak});engine.stop();
   }
  } finally {window.AudioContext=native;}
  return results;
 });
 for(const result of results){assert.ok(result.peak>0,result.quality+' is audible');assert.ok(result.peak<1,JSON.stringify(result));}
 assert.deepEqual([...new Set(results.map(r=>r.voices))].sort(),[3,4,5]);
 console.log('Rendered output passed: 3/4/5-voice chords at 200%, maximum overall volume; question, reference, live and audition all below clipping.',JSON.stringify(results));
} finally {await browser.close();}
