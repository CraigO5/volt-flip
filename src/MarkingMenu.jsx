import React,{useEffect,useRef,useState} from 'react';
import {Check,X} from '@phosphor-icons/react';
import {NoteSymbol} from './NoteSymbol.jsx';
import {markDirection,NOTE_LAYOUT} from './notes.js';
export function useMarkingMenu({onToggle,canMark,leftHold=false,excluded=false,onOpen,onClose,onHover}){
 const [menu,setMenu]=useState(null),current=useRef(null),callbacks=useRef({onToggle,canMark,leftHold,excluded,onOpen,onClose,onHover}),timer=useRef(null),gesture=useRef(null),suppressContext=useRef(0),suppressClick=useRef(null),returnFocus=useRef(null),popup=useRef(null),pendingTouchClick=useRef(null),closeTimer=useRef(null);
 callbacks.current={onToggle,canMark,leftHold,excluded,onOpen,onClose,onHover};
 function update(value){current.current=value;setMenu(value);}
 function clearTimer(){clearTimeout(timer.current);timer.current=null;}
 function close(restore=true){const m=current.current;if(m)callbacks.current.onClose?.();gesture.current=null;clearTimer();clearTimeout(closeTimer.current);current.current=null;if(m&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){setMenu({...m,exiting:true});closeTimer.current=setTimeout(()=>setMenu(null),120);}else setMenu(null);if(restore)returnFocus.current?.focus({preventScroll:true});}
 function open(index,x,y,dragging=false,excluded=callbacks.current.excluded){
  if(!callbacks.current.canMark(index))return;
  clearTimeout(closeTimer.current);update({index,x:Math.max(96,Math.min(window.innerWidth-96,x)),y:Math.max(96,Math.min(window.innerHeight-120,y)),active:null,dragging,excluded});callbacks.current.onOpen?.();
 }
 function pointerDown(index,e){
  if(!callbacks.current.canMark(index))return;
  const {clientX:x,clientY:y,pointerId,pointerType}=e;
  if(e.button===2||(e.ctrlKey&&pointerType==='mouse')||(e.button===0&&pointerType!=='touch'&&(callbacks.current.leftHold||e.ctrlKey))){e.preventDefault();clearTimer();returnFocus.current=e.currentTarget;suppressContext.current=Date.now()+2000;gesture.current={index,x,y,pointerId,type:'mouse',primary:e.button===0,excluded:e.ctrlKey||callbacks.current.excluded,waiting:true,latestX:x,latestY:y};timer.current=setTimeout(()=>{const g=gesture.current;if(!g?.waiting)return;g.waiting=false;open(index,x,y,true,gesture.current.excluded);if(current.current){const mark=Math.hypot(g.latestX-g.x,g.latestY-g.y)<12?null:markDirection(g.latestX-current.current.x,g.latestY-current.current.y);g.lastMark=mark;if(mark!==null){callbacks.current.onHover?.(mark);callbacks.current.onToggle(index,mark,g.excluded);g.toggled=true;}update({...current.current,active:mark});}},180);}
  else if(pointerType==='touch'&&e.button===0){
   clearTimer();returnFocus.current=e.currentTarget;gesture.current={index,x,y,pointerId,type:'touch',excluded:callbacks.current.excluded,waiting:true};
   timer.current=setTimeout(()=>{if(!gesture.current?.waiting)return;gesture.current.waiting=false;suppressClick.current={index,until:Date.now()+1500};suppressContext.current=Date.now()+2000;open(index,x,y,true,gesture.current.excluded);},420);
  }
 }
 function contextMenu(index,e){e.preventDefault();}
 function keyboardOpen(index,element){returnFocus.current=element;const r=element.getBoundingClientRect();open(index,r.left+r.width/2,r.top+r.height/2);}
 function consumeClick(index){const block=suppressClick.current;if(block?.index===index&&block.until>Date.now()){suppressClick.current=null;return true;}return false;}
 useEffect(()=>{
  function move(e){const g=gesture.current;if(!g||e.pointerId!==g.pointerId)return;
   if(g.waiting){if(g.type==='mouse'){g.latestX=e.clientX;g.latestY=e.clientY;return;}if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>10){clearTimer();suppressClick.current={index:g.index,until:Date.now()+1500};gesture.current=null;}return;}
   const m=current.current;if(!m)return;
   if(e.cancelable)e.preventDefault();
   const slice=e.target.closest?.('[data-note-value]');const onSlice=slice&&popup.current?.contains(slice);const mark=Math.hypot(e.clientX-g.x,e.clientY-g.y)<12?null:onSlice?Number(slice.dataset.noteValue):markDirection(e.clientX-m.x,e.clientY-m.y);if(mark!==g.lastMark){if(mark!==null){callbacks.current.onHover?.(mark);callbacks.current.onToggle(m.index,mark,g.excluded);g.toggled=true;}g.lastMark=mark;}update({...m,active:mark,excluded:g.excluded});
  }
  function up(e){const g=gesture.current;if(!g||e.pointerId!==g.pointerId)return;clearTimer();gesture.current=null;
   if(g.waiting)return;
   const m=current.current;if(!m)return;
   if(g.type==='touch'||g.primary){suppressClick.current={index:g.index,until:Date.now()+1500};pendingTouchClick.current={x:e.clientX,y:e.clientY,until:Date.now()+1500};}
   suppressContext.current=Date.now()+1000;
   const distance=Math.hypot(e.clientX-g.x,e.clientY-g.y),mark=markDirection(e.clientX-m.x,e.clientY-m.y);
   if(distance<12){if(g.type==='mouse'){close();return;}update({...m,dragging:false,active:null});requestAnimationFrame(()=>popup.current?.focus({preventScroll:true}));}
   else {if(mark!==null&&!g.toggled)callbacks.current.onToggle(m.index,mark,g.excluded);close();}
  }
  function cancel(){if(gesture.current){suppressClick.current={index:gesture.current.index,until:Date.now()+1500};close(false);}}
  function outside(e){pendingTouchClick.current=null;if(current.current&&!gesture.current&&!popup.current?.contains(e.target))close(false);}
  function preventSyntheticClick(e){const p=pendingTouchClick.current;if(p&&Date.now()<p.until&&Math.hypot(e.clientX-p.x,e.clientY-p.y)<12){e.preventDefault();e.stopImmediatePropagation();pendingTouchClick.current=null;suppressClick.current=null;}}
  function preventContext(e){if(current.current||gesture.current||Date.now()<suppressContext.current)e.preventDefault();}
  // Some browsers base their native menu on mouse events rather than pointer events.
  function preventRightMouse(e){if(e.button!==2)return;const inGame=e.target.closest?.('.board-wrap,.marking-menu');if(inGame||current.current||gesture.current||Date.now()<suppressContext.current){e.preventDefault();suppressContext.current=Date.now()+2000;}}
  function escape(e){if(e.key==='Escape'&&current.current){e.preventDefault();e.stopPropagation();close();}}
  function scroll(){if(current.current)close(false);clearTimer();gesture.current=null;}
  window.addEventListener('contextmenu',preventContext,true);document.addEventListener('mousedown',preventRightMouse,true);document.addEventListener('mouseup',preventRightMouse,true);document.addEventListener('click',preventSyntheticClick,true);document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',up);document.addEventListener('pointercancel',cancel);document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape,true);window.addEventListener('blur',scroll);window.addEventListener('scroll',scroll,true);window.addEventListener('resize',scroll);
  return ()=>{clearTimer();clearTimeout(closeTimer.current);window.removeEventListener('contextmenu',preventContext,true);document.removeEventListener('mousedown',preventRightMouse,true);document.removeEventListener('mouseup',preventRightMouse,true);document.removeEventListener('click',preventSyntheticClick,true);document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',cancel);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape,true);window.removeEventListener('blur',scroll);window.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',scroll);};
 },[]);
 return {menu,popup,pointerDown,contextMenu,keyboardOpen,consumeClick,close,hover:value=>callbacks.current.onHover?.(value),select:value=>{if(current.current)callbacks.current.onToggle(current.current.index,value,current.current.excluded);}};
}
export function MarkingMenu({controller,notes,excludedNotes}){
 const {menu,popup}=controller;
 useEffect(()=>{if(menu&&!menu.dragging&&!menu.exiting)popup.current?.focus({preventScroll:true});},[menu?.index,menu?.dragging,menu?.exiting]);
 if(!menu)return null;
 function key(e){
  const buttons=[...popup.current.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);
  if(e.key==='Tab'){e.preventDefault();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}
  else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const next=(i+(e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:e.key==='ArrowUp'?-2:2)+4)%4;buttons[next].focus();}
  else if(['0','1','2','3'].includes(e.key)){e.preventDefault();controller.select(Number(e.key));}
 }
 return <div ref={popup} className={`marking-menu ${menu.exiting?'is-closing':''} ${menu.excluded?'is-excluded':''}`} aria-hidden={menu.exiting||undefined} role="dialog" aria-label="Tile notes. Choose one or more marks. Escape to close." tabIndex={-1} style={{left:menu.x-90,top:menu.y-90}} onKeyDown={key} onContextMenu={e=>e.preventDefault()}>
 {NOTE_LAYOUT.map(({value,row,column})=>{const checked=!!(((menu.excluded?excludedNotes:notes)||0)&(1<<value));return <button key={value} data-note-value={value} style={{top:row===0?3:'auto',bottom:row===1?3:'auto',left:column===0?3:'auto',right:column===1?3:'auto'}} className={`marking-choice marking-${value} ${checked?'is-marked':''} ${menu.active===value?'gesture-active':''}`} onPointerEnter={()=>{if(!menu.dragging&&!menu.exiting)controller.hover(value);}} onClick={e=>controller.select(value)} aria-label={`Toggle ${menu.excluded?'not ':''}${value===0?'Voltorb':value} note`} aria-pressed={checked} title={value===0?'Voltorb':String(value)}><NoteSymbol value={value} excluded={menu.excluded}/>{checked&&<Check className="mark-check" size={13} weight="bold" aria-hidden="true"/>}</button>;})}
 <button className="marking-cancel" onClick={()=>controller.close()} title="Close (Esc)" aria-label="Close note picker"><X size={15} aria-hidden="true"/></button>
 <span className="marking-caption">{menu.excluded?'Sweep to toggle · Not notes':'Ctrl + hold: not'}</span>
 </div>;
}
