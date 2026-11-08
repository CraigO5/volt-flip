import React,{useEffect,useRef,useState} from 'react';
export function AnimatedNumber({value,reducedMotion}){
 const [display,setDisplay]=useState(value),current=useRef(value);
 useEffect(()=>{
  if(reducedMotion){current.current=value;setDisplay(value);return;}
  const from=current.current;if(from===value)return;
  const start=performance.now();let frame;
  const tick=now=>{const p=Math.min(1,(now-start)/480),eased=1-Math.pow(1-p,3);current.current=Math.round(from+(value-from)*eased);setDisplay(current.current);if(p<1)frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);return ()=>cancelAnimationFrame(frame);
 },[value,reducedMotion]);
 return <span aria-hidden="true">{(reducedMotion?value:display).toLocaleString()}</span>;
}
