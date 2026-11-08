// Kenney CC0 samples, packaged locally. See public/assets/audio/sources.json.
const files=['flip-slide','flip-snap','note-on','note-off','collect-chips','collect-chime','explosion','picker-open','picker-close','picker-hover','earn-points','win-jingle','lose-jingle'];
let raw;const decoded=new WeakMap(),activeSources=new WeakMap();
export function stopSounds(context){for(const source of activeSources.get(context)||[]){try{source.stop();}catch{}}activeSources.get(context)?.clear();}
export function warmSounds(){
 if(!raw)raw=Promise.all(files.map(async name=>{try{const r=await fetch(`${import.meta.env.BASE_URL}assets/audio/${name}.wav`);if(!r.ok)return [name,null];return [name,await r.arrayBuffer()];}catch{return [name,null];}})).then(Object.fromEntries);
 return raw;
}
export function loadSoundBuffers(context){
 if(!decoded.has(context))decoded.set(context,warmSounds().then(async data=>Object.fromEntries(await Promise.all(files.map(async name=>{try{return [name,data[name]?await context.decodeAudioData(data[name].slice(0)):null];}catch{return [name,null];}})))));
 return decoded.get(context);
}
export async function playSound(context,output,type,amount=1,alive=()=>true){
 const buffers=await loadSoundBuffers(context);if(!alive()||context.state==='closed')return;
 const now=context.currentTime;
 function clip(name,volume,delay=0,rate=1){
  if(!buffers[name])return;const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers[name];source.playbackRate.value=rate;let filter;const start=now+delay;if(name==='explosion'){filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1400;source.connect(filter);filter.connect(gain);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.045);gain.gain.exponentialRampToValueAtTime(.0001,start+Math.min(.70,source.buffer.duration/rate));}else{gain.gain.value=volume;source.connect(gain);}gain.connect(output);if(!activeSources.has(context))activeSources.set(context,new Set());activeSources.get(context).add(source);source.start(start);source.onended=()=>{activeSources.get(context)?.delete(source);source.disconnect();filter?.disconnect();gain.disconnect();};
 }
 if(type==='flip'){clip('flip-slide',.40,0,.98+Math.random()*.04);clip('flip-snap',.27,.17);}
 else if(type==='note')clip(amount?'note-on':'note-off',.30,0,amount?1.05:.95);
 else if(type==='collect'){if(amount>0){clip('collect-chips',.50);clip('collect-chime',.30,.06);}else clip('flip-snap',.20);}
 else if(type==='voltorb')clip('explosion',.18,.16);
 else if(type==='picker-open')clip('picker-open',.20);
 else if(type==='picker-close')clip('picker-close',.14);
 else if(type==='picker-hover')clip('picker-hover',.12,0,1.08);
 else if(type==='points')clip('earn-points',.32,.16,1.08);
 else if(type==='win')clip('win-jingle',.38,.6);
 else if(type==='lose')clip('lose-jingle',.22,.9);
 else if(type==='level-down')clip('lose-jingle',.16,.05,.82);
 else if(type==='level-up')clip('win-jingle',.18,.05,1.08);
}
