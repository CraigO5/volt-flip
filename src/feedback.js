import {useCallback,useEffect,useRef,useState} from 'react';

import {playSound,warmSounds,loadSoundBuffers,stopSounds} from './audio.js';

export function useGameFeedback(game,{boardRef,bankRef,tilesRef}){
 const [soundOn,setSoundOn]=useState(()=>{try{return JSON.parse(localStorage.getItem('vf-sound'))!==false;}catch{return true;}});
 const [reducedMotion,setReducedMotion]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [blast,setBlast]=useState(null),blastTimer=useRef(null),[levelNotice,setLevelNotice]=useState(null),levelTimer=useRef(null);
 const [displayLevel,setDisplayLevel]=useState(game.status==='playing'?game.level:game.nextLevel??game.level);
 const [result,setResult]=useState(null),resultTimers=useRef(new Set()),noticeRound=useRef(null);
 const [payout,setPayout]=useState(null),[scoreGains,setScoreGains]=useState([]),[ready,setReady]=useState(false);
 const [deposit,setDeposit]=useState(null),depositBefore=useRef(game);
 useEffect(()=>{
  const before=depositBefore.current;depositBefore.current=game;
  const ended=game.status==='won'||game.status==='collected';
  if(before.board!==game.board||!ended||before.status!=='playing'||reducedMotion){setDeposit(null);return;}
  const amount=game.bank-before.bank;if(amount<=0){setDeposit(null);return;}
  let frame;const start=performance.now()+220,duration=1250;
  setDeposit({board:game.board,round:amount,bank:before.bank});
  const tick=now=>{
   const progress=Math.max(0,Math.min(1,(now-start)/duration));
   const moved=Math.round(amount*(1-Math.pow(1-progress,3)));
   setDeposit({board:game.board,round:amount-moved,bank:before.bank+moved});
   if(progress<1)frame=requestAnimationFrame(tick);else setDeposit(null);
  };
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[game.board,game.status,game.bank,reducedMotion]);
 const deposited=game.status==='won'||game.status==='collected';
 const displayCoins=deposit?.board===game.board?deposit.round:deposited?0:game.coins;
 const displayBank=deposit?.board===game.board?deposit.bank:game.bank;
 const soundRef=useRef(soundOn),audio=useRef(null),previous=useRef(game),payoutTimer=useRef(null),gainTimers=useRef(new Set()),sequence=useRef(0),scoreOrigin=useRef(null),lastHoverSound=useRef(0),audioEpoch=useRef(0);
 soundRef.current=soundOn;
 const play=useCallback((type,amount=1)=>{if(!soundRef.current||!audio.current)return;const {context,master}=audio.current;const epoch=audioEpoch.current;const run=()=>{if(soundRef.current&&context.state==='running'&&epoch===audioEpoch.current)playSound(context,master,type,amount,()=>soundRef.current&&audio.current?.context===context&&epoch===audioEpoch.current).catch(()=>{});};if(context.state==='running')run();else if(context.state==='suspended')context.resume().then(run).catch(()=>{});},[]);
 const later=useCallback((fn,delay)=>{const timer=setTimeout(()=>{resultTimers.current.delete(timer);fn();},delay);resultTimers.current.add(timer);},[]);
 const announceLevel=useCallback((round,target)=>{if(target==null||target===round.level||noticeRound.current===round.board)return;noticeRound.current=round.board;setDisplayLevel(target);clearTimeout(levelTimer.current);const direction=target>round.level?'up':'down';setLevelNotice({id:++sequence.current,level:target,direction});play(direction==='up'?'level-up':'level-down');levelTimer.current=setTimeout(()=>setLevelNotice(null),2500);},[play]);
 const uiSound=useCallback(type=>{if(type==='picker-hover'){const now=performance.now();if(now-lastHoverSound.current<45)return;lastHoverSound.current=now;}play(type);},[play]);
 useEffect(()=>{localStorage.setItem('vf-sound',JSON.stringify(soundOn));if(!soundOn&&audio.current){audioEpoch.current++;stopSounds(audio.current.context);}if(audio.current)audio.current.master.gain.setTargetAtTime(soundOn ? .50 : 0,audio.current.context.currentTime,.025);},[soundOn]);
 useEffect(()=>{
  const query=window.matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReducedMotion(query.matches);
  warmSounds();change();query.addEventListener('change',change);let innerFrame;const frame=requestAnimationFrame(()=>{innerFrame=requestAnimationFrame(()=>setReady(true));});
  function unlock(){
   if(!soundRef.current)return;
   try{if(!audio.current){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;const context=new Audio(),master=context.createGain();master.gain.value=.50;master.connect(context.destination);audio.current={context,master};loadSoundBuffers(context).catch(()=>{});}if(audio.current.context.state==='suspended')audio.current.context.resume().catch(()=>{});}catch{/* Audio is optional; gameplay never depends on it. */}
  }
  document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
  return ()=>{query.removeEventListener('change',change);cancelAnimationFrame(frame);cancelAnimationFrame(innerFrame);document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);clearTimeout(payoutTimer.current);clearTimeout(blastTimer.current);clearTimeout(levelTimer.current);resultTimers.current.forEach(clearTimeout);gainTimers.current.forEach(clearTimeout);audio.current?.context.close().catch(()=>{});audio.current=null;};
 },[]);
 useEffect(()=>{
  const before=previous.current;previous.current=game;
  if(before.board!==game.board){setDisplayLevel(game.level);audioEpoch.current++;if(audio.current)stopSounds(audio.current.context);resultTimers.current.forEach(clearTimeout);resultTimers.current.clear();setResult(null);if(noticeRound.current!==before.board){clearTimeout(levelTimer.current);setLevelNotice(null);announceLevel(before,game.level);}setPayout(null);setScoreGains([]);setBlast(null);clearTimeout(blastTimer.current);clearTimeout(payoutTimer.current);gainTimers.current.forEach(clearTimeout);gainTimers.current.clear();return;}


  if(game.revealed.length>before.revealed.length){
   const i=game.revealed.at(-1);play('flip');
   const gain=game.coins-before.coins;if(gain>0){play('points',gain);const id=++sequence.current;setScoreGains(list=>[...list.slice(-5),{id,amount:gain,...(scoreOrigin.current?.index===i?scoreOrigin.current:(()=>{const r=tilesRef.current[i]?.getBoundingClientRect();return {x:r?r.left+r.width/2:window.innerWidth/2,y:r?r.top+r.height/2:window.innerHeight/2};})())}]);const timer=setTimeout(()=>{setScoreGains(list=>list.filter(item=>item.id!==id));gainTimers.current.delete(timer);},1050);gainTimers.current.add(timer);}
   if(game.board[i]===0){play('voltorb');play('lose');const r=tilesRef.current[i]?.getBoundingClientRect();if(r){setBlast({id:++sequence.current,x:r.left+r.width/2,y:r.top+r.height/2,size:Math.min(320,Math.max(150,r.width*2.4))});clearTimeout(blastTimer.current);blastTimer.current=setTimeout(()=>setBlast(null),1100);}if(!reducedMotion)boardRef.current?.animate([{transform:'translateX(0)'},{transform:'translateX(-5px)'},{transform:'translateX(4px)'},{transform:'translateX(-2px)'},{transform:'translateX(0)'}],{duration:340,easing:'cubic-bezier(.16,1,.3,1)'});}
  }
  if(game.notes!==before.notes||game.excludedNotes!==before.excludedNotes){
   const changed=Object.keys({...before.notes,...game.notes}).find(i=>(before.notes[i]||0)!==(game.notes[i]||0));
   if(changed===undefined&&game.excludedNotes!==before.excludedNotes)play('note');
   if(changed!==undefined)play('note',((game.notes[changed]||0)&~(before.notes[changed]||0))!==0);
  }
  if(before.status==='playing'&&(game.status==='collected'||game.status==='won')){
   const amount=game.bank-before.bank;play('collect',amount);if(game.status==='won')play('win');
   if(amount>0){setPayout({amount,id:++sequence.current});clearTimeout(payoutTimer.current);payoutTimer.current=setTimeout(()=>setPayout(null),1700);if(!reducedMotion)bankRef.current?.animate([{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:450,easing:'cubic-bezier(.16,1,.3,1)'});}
  }
  if(before.status==='playing'&&(game.status==='won'||game.status==='lost')){
   const id=++sequence.current;setResult({id,status:game.status,exiting:false});
   later(()=>{setResult(r=>r?.id===id?{...r,exiting:true}:r);later(()=>{setResult(null);announceLevel(game,game.nextLevel);},reducedMotion?0:280);},game.status==='won'?2200:2700);
  }else if(before.status==='playing'&&game.status==='collected')later(()=>announceLevel(game,game.nextLevel),game.coins>0?950:250);
 },[game,reducedMotion,boardRef,bankRef]);
 return {displayCoins,displayBank,depositing:!!deposit,soundOn,toggleSound:()=>setSoundOn(v=>!v),reducedMotion,ready,payout,scoreGains,blast,levelNotice,result,displayLevel,uiSound,setScoreOrigin:(index,point)=>{scoreOrigin.current={index,...point};}};
}
