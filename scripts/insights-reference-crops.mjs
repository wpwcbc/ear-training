import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Native-pixel extraction only: no reference resizing or repainting.
const root=fileURLToPath(new URL('../',import.meta.url));
const relative='.impeccable/mocks/insights-summary-2026-11-09';
const directory=path.join(root,relative);
const manifest=JSON.parse(await readFile(path.join(directory,'reference-manifest.json'),'utf8'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const hashes={};
try {
  const page=await browser.newPage({deviceScaleFactor:1});
  await mkdir(path.join(directory,'references'),{recursive:true});
  for(const screen of manifest.screens){
    const bytes=await readFile(path.join(directory,screen.board));
    const committed=execFileSync('git',['show',`${manifest.sourceRevision}:${relative}/${screen.board}`],{cwd:root,maxBuffer:20*1024*1024});
    assert.ok(bytes.equals(committed),`${screen.board}: approved source was changed`);
    hashes[screen.board]=createHash('sha256').update(bytes).digest('hex');
    const result=await page.evaluate(async({url,crop})=>{
      const image=new Image();image.src=url;await image.decode();
      const [x,y,width,height]=crop;
      if(x<0||y<0||x+width>image.width||y+height>image.height)throw new Error('Crop outside original image');
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      canvas.getContext('2d').drawImage(image,x,y,width,height,0,0,width,height);
      return {png:canvas.toDataURL('image/png').split(',')[1],sourceSize:[image.width,image.height]};
    },{url:`data:image/png;base64,${bytes.toString('base64')}`,crop:screen.crop});
    await writeFile(path.join(directory,'references',screen.id+'.png'),Buffer.from(result.png,'base64'));
    console.log(`${screen.id}: ${screen.crop[2]}x${screen.crop[3]} from ${result.sourceSize.join('x')}`);
  }
  await writeFile(path.join(directory,'references','source-hashes.json'),JSON.stringify({revision:manifest.sourceRevision,sha256:hashes},null,2)+'\n');
} finally {await browser.close();}
