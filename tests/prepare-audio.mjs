import {chromium} from 'playwright';
import {access,readFile,writeFile,unlink} from 'node:fs/promises';
const browser=await chromium.launch();try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4177/');
 const sources=JSON.parse(await readFile('public/assets/audio/sources.json','utf8'));const report=[];
 for(const name of Object.keys(sources)){try{await access('public/assets/audio/'+name+'.ogg');}catch{continue;}
  const data=await page.evaluate(async name=>{const ctx=new OfflineAudioContext(1,1,44100);const input=await ctx.decodeAudioData(await(await fetch('/assets/audio/'+name+'.ogg')).arrayBuffer());const mono=new Float32Array(input.length);for(let c=0;c<input.numberOfChannels;c++){const channel=input.getChannelData(c);for(let i=0;i<mono.length;i++)mono[i]+=channel[i]/input.numberOfChannels;}let peak=0;for(const v of mono)peak=Math.max(peak,Math.abs(v));let start=0,end=mono.length;while(start<end&&Math.abs(mono[start])<.001)start++;while(end>start&&Math.abs(mono[end-1])<.001)end--;start=Math.max(0,start-220);end=Math.min(mono.length,end+1000);return {samples:Array.from(mono.slice(start,end),v=>v*(peak>0?.8/peak:1)),rate:input.sampleRate,sourceDuration:input.duration};},name);
  const pcm=Buffer.alloc(44+data.samples.length*2);pcm.write('RIFF');pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVE',8);pcm.write('fmt ',12);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);pcm.writeUInt32LE(data.rate,24);pcm.writeUInt32LE(data.rate*2,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(pcm.length-44,40);data.samples.forEach((v,i)=>pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));await writeFile('public/assets/audio/'+name+'.wav',pcm);await unlink('public/assets/audio/'+name+'.ogg');report.push({name,duration:data.samples.length/data.rate,sourceDuration:data.sourceDuration});
 }
 await writeFile('qa/audio-assets.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
