import React from 'react';
import {Bomb,Minus} from '@phosphor-icons/react';

export function NoteSymbol({value,excluded=false,bombSize=25}){
 return <span className={`note-symbol ${excluded?'is-excluded':''}`} aria-hidden="true">
  {value===0?<Bomb size={bombSize}/>:value}
  {excluded&&<Minus className="note-strike" weight="light"/>}
 </span>;
}

// Shared corner marks for manual game notes and solver-derived possibilities.
export function CornerMarks({mask=0,excludedMask=0}){
 return [1,2,3,0].map(value=>{
  const excluded=!!(excludedMask&(1<<value));
  return (mask&(1<<value))||excluded?<span key={value} className={`corner corner-${value} ${excluded?'corner-excluded':''}`} data-note-value={value}><NoteSymbol value={value} excluded={excluded} bombSize={13}/></span>:null;
 });
}
