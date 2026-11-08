import React,{useEffect,useState} from 'react';
export function Explosion({effect,reducedMotion}){
 const [frame,setFrame]=useState(-1);
 useEffect(()=>{if(!effect)return;if(reducedMotion){setFrame(7);return;}let raf;const start=performance.now()+160;setFrame(-1);function tick(now){const n=Math.floor((now-start)/50);setFrame(Math.min(15,n));if(n<16)raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);return ()=>cancelAnimationFrame(raf);},[effect?.id,reducedMotion]);
 if(!effect||frame<0)return null;
 return <span className={`explosion-effect ${reducedMotion?'static-impact':''}`} aria-hidden="true" style={{left:effect.x,top:effect.y,width:effect.size,height:effect.size,backgroundPosition:`${(frame%4)/3*100}% ${Math.floor(frame/4)/3*100}%`}}/>;
}
