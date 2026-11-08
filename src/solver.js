import {modelCompositions,fitsPublicTotals} from './board-model.js';
import {planContinuations,normalizeObjective} from './solver-planner.js';
const patterns=Array.from({length:1024},(_,code)=>{
 const values=Array.from({length:5},(_,i)=>(code>>(i*2))&3);
 return {values,twos:values.filter(v=>v===2).length,threes:values.filter(v=>v===3).length,sum:values.reduce((a,b)=>a+b,0),bombs:values.filter(v=>v===0).length};
});
export const emptyPuzzle=()=>({rows:Array.from({length:5},()=>({sum:'',bombs:''})),cols:Array.from({length:5},()=>({sum:'',bombs:''})),known:Array(25).fill(null)});
export function parseCluePaste(text){
 const parts=text.trim().split(/[\s,;:/|]+/).filter(Boolean);
 if(parts.length!==20||parts.some(v=>!/^\d{1,2}$/.test(v)))return null;
 const pairs=Array.from({length:10},(_,i)=>({sum:parts[i*2],bombs:parts[i*2+1]}));
 if(pairs.some(p=>Number(p.sum)>15||Number(p.bombs)>5))return null;
 return {rows:pairs.slice(0,5),cols:pairs.slice(5)};
}
// Preserve the user's priority: safety first, then expected value. A safe 1
// stays ahead of any risky tile and can still protect the player's level.
export function lowestRiskTiles(result,known){
 if(result.status!=='ready')return [];
 let min=Infinity,bestValue=-1,ids=[];
 result.counts.forEach((counts,i)=>{
  if(known[i]!==null)return;
  const risk=counts[0],value=counts[1]+2*counts[2]+3*counts[3];
  if(risk<min||(risk===min&&value>bestValue)){min=risk;bestValue=value;ids=[i];}
  else if(risk===min&&value===bestValue)ids.push(i);
 });
 return ids;
}
export function recommendationTiles(result,known){
 const eligible=result.recommendation?.method==='continuations'&&result.recommendation.objective!=='safest'?known.map((v,i)=>v===null&&result.counts[i][0]<result.total?i:-1).filter(i=>i>=0):lowestRiskTiles(result,known);
 const ranked=result.recommendation?.candidates.filter(i=>eligible.includes(i));
 return ranked?.length?ranked:eligible;
}
// A unique deduction is not a played win: all possible multipliers must be recorded.
export function solverRoundOutcome(result,known){
 if(known.includes(0))return 'lost';
 if(result.status!=='ready')return null;
 return known.every((v,i)=>v!==null||(result.counts[i][2]===0&&result.counts[i][3]===0))?'won':null;
}

// Break otherwise-equal moves by how many new safe multiplier opportunities
// they uncover, then information gained on surviving. Bomb branches earn no
// information reward. This is a one-reveal lookahead, not a full win policy.
export function rankRecommendations(result,known,boards=null,checkBudget=()=>{}){
 let candidates=lowestRiskTiles(result,known);
 const information=result.counts.map(c=>{
  const safe=result.total-c[0];
  return safe?c.slice(1).reduce((h,n)=>n?h-(n/result.total)*Math.log2(n/safe):h,0):0;
 });
 const safeUnlocks=Array(known.length).fill(0);
 let method='risk-value';
 if(candidates.length>1&&boards){
  const unknown=known.map((v,i)=>v===null?i:-1).filter(i=>i>=0);
  for(const i of candidates){
   checkBudget();
   const branches=Array.from({length:4},()=>[]);
   for(const board of boards)branches[board[i]].push(board);
   for(let v=1;v<=3;v++){
    const branch=branches[v];if(!branch.length)continue;
    for(const j of unknown){
     // Already safe cards are available whichever tied move we choose.
     if(j===i||result.counts[j][0]===0)continue;
     checkBudget();let safe=true,hasMultiplier=false;
     for(const board of branch){
      if(board[j]===0){safe=false;break;}
      if(board[j]>1)hasMultiplier=true;
     }
     if(safe&&hasMultiplier)safeUnlocks[i]+=branch.length;
    }
   }
  }
  const best=Math.max(...candidates.map(i=>safeUnlocks[i]));
  candidates=candidates.filter(i=>safeUnlocks[i]===best);
  method='lookahead';
 }
 if(candidates.length>1){
  const best=Math.max(...candidates.map(i=>information[i]));
  candidates=candidates.filter(i=>Math.abs(information[i]-best)<1e-12);
  if(method!=='lookahead')method='information';
 }
 return {candidates,method,information,safeUnlocks:safeUnlocks.map(n=>n/result.total)};
}

export function solvePuzzle(input,{maxStates=350000,timeLimit=5000,maxLookaheadBoards=2048,maxPlanningBoards=256,planningTime=120,planningStates=12000,lookaheadTime=80}={}){
 const invalid=message=>({status:'invalid',message});
 if(!input||!Array.isArray(input.rows)||!Array.isArray(input.cols)||input.rows.length!==5||input.cols.length!==5||!Array.isArray(input.known)||input.known.length!==25)return invalid('Enter five row and five column clues.');
 const {rows,cols,known}=input;
 if([...rows,...cols].some(p=>!p))return invalid('Enter five row and five column clues.');
 if([...rows,...cols].some(p=>p.sum===''||p.bombs===''))return {status:'incomplete',message:'Enter the point total and bomb count for every row and column.'};
 if([...rows,...cols].some(p=>!/^\d{1,2}$/.test(String(p.sum))||!/^\d$/.test(String(p.bombs))||Number(p.sum)>15||Number(p.bombs)>5)||known.some(v=>v!==null&&![0,1,2,3].includes(v)))return invalid('Points must be 0–15 and bombs 0–5.');
 if(['sum','bombs'].some(field=>rows.reduce((s,p)=>s+Number(p[field]),0)!==cols.reduce((s,p)=>s+Number(p[field]),0)))return invalid('Row and column totals disagree. Check the clues.');
 const configurations=modelCompositions(input.model,input.level)?.filter(c=>fitsPublicTotals(c,rows));
 if(configurations&&!configurations.length)return invalid('These clues do not match the selected game and level. Check the level or choose Any board.');
 const allowed=(t,h,complete=false)=>!configurations||configurations.some(c=>complete?c[1]===t&&c[2]===h:c[1]>=t&&c[2]>=h);
 const deadline=performance.now()+timeLimit;
 let states=0,steps=0;
 const budget=()=>{if((++steps&255)===0&&performance.now()>deadline)throw new Error('limit');};
 const fits=(clue,ids)=>patterns.filter(p=>p.sum===Number(clue.sum)&&p.bombs===Number(clue.bombs)&&ids.every((i,k)=>known[i]===null||known[i]===p.values[k]));
 let rowChoices=rows.map((p,r)=>fits(p,Array.from({length:5},(_,c)=>r*5+c)));
 let colChoices=cols.map((p,c)=>fits(p,Array.from({length:5},(_,r)=>r*5+c)));
 try{
  // Arc consistency: a line pattern needs support at every crossing. Repeat
  // in both directions; never remove a value supported by a valid board.
  let changed=true;
  while(changed){
   budget();changed=false;
   for(let axis=0;axis<2;axis++){
    const lines=axis?colChoices:rowChoices,cross=axis?rowChoices:colChoices;
    const masks=cross.map(list=>Array.from({length:5},(_,k)=>list.reduce((m,p)=>m|(1<<p.values[k]),0)));
    for(let i=0;i<5;i++){
     const filtered=lines[i].filter(p=>p.values.every((v,k)=>masks[k][i]&(1<<v)));
     if(!filtered.length)return invalid('No board fits these clues and revealed tiles. Check your entries.');
     if(filtered.length!==lines[i].length){lines[i]=filtered;changed=true;}
    }
   }
  }
  // Search from the more constrained axis, mapping marginals back to cells.
  const cost=lists=>lists.reduce((s,list)=>s+Math.log(list.length),0);
  const transposed=cost(colChoices)<cost(rowChoices);
  const choices=transposed?colChoices:rowChoices,crossClues=transposed?rows:cols;
  const cell=(r,c)=>transposed?c*5+r:r*5+c;
  const cs=crossClues.map(p=>Number(p.sum)),cb=crossClues.map(p=>Number(p.bombs));
  const order=[0,1,2,3,4].sort((a,b)=>choices[a].length-choices[b].length);
  const memo=Array.from({length:5},()=>new Map());
  // Exact reachable (sum,bombs) pairs per crossing line from the remaining
  // cell domains. This rejects gaps that broad min/max bounds cannot detect.
  const reachable=Array.from({length:6},()=>Array.from({length:5},()=>new Uint8Array(96)));
  for(let c=0;c<5;c++)reachable[5][c][0]=1;
  for(let depth=4;depth>=0;depth--)for(let c=0;c<5;c++){
   const values=[...new Set(choices[order[depth]].map(p=>p.values[c]))];
   for(let b=0;b<=5;b++)for(let s=0;s<=15;s++)if(reachable[depth+1][c][b*16+s]){
    for(const v of values){const nb=b+(v===0?1:0),ns=s+v;if(nb<=5&&ns<=15)reachable[depth][c][nb*16+ns]=1;}
   }
  }
  const feasible=(depth,s,b)=>s.every((n,c)=>n>=0&&n<=15&&b[c]>=0&&b[c]<=5&&reachable[depth][c][b[c]*16+n]);
  const key=(s,b,t=0,h=0)=>{let n=0;for(let c=0;c<5;c++)n=n*16+s[c];for(let c=0;c<5;c++)n=n*6+b[c];return configurations?(n*26+t)*26+h:n;};
  function count(depth,s,b,t=0,h=0){
   budget();if(!feasible(depth,s,b)||!allowed(t,h,depth===5))return 0;if(depth===5)return 1;
   const k=key(s,b,t,h),cached=memo[depth].get(k);if(cached!==undefined)return cached;
   if(++states>maxStates)throw new Error('limit');
   let total=0;
   for(const p of choices[order[depth]]){
    budget();const ns=s.map((v,c)=>v-p.values[c]),nb=b.map((v,c)=>v-(p.values[c]===0?1:0));
    if(feasible(depth+1,ns,nb))total+=count(depth+1,ns,nb,t+p.twos,h+p.threes);
   }
   memo[depth].set(k,total);return total;
  }
  const total=count(0,cs,cb);
  if(!total)return invalid('No board fits these clues and revealed tiles. Check your entries.');
  const counts=Array.from({length:25},()=>[0,0,0,0]);
  let front=new Map([[key(cs,cb),{s:cs,b:cb,t:0,h:0,ways:1}]]);
  for(let depth=0;depth<5;depth++){
   const next=new Map(),row=order[depth];
   for(const {s,b,t,h,ways} of front.values())for(const p of choices[row]){
    budget();const ns=s.map((v,c)=>v-p.values[c]),nb=b.map((v,c)=>v-(p.values[c]===0?1:0));
    if(!feasible(depth+1,ns,nb))continue;
    const nt=t+p.twos,nh=h+p.threes,tail=count(depth+1,ns,nb,nt,nh);if(!tail)continue;
    p.values.forEach((v,c)=>counts[cell(row,c)][v]+=ways*tail);
    const k=key(ns,nb,nt,nh),prev=next.get(k);if(prev)prev.ways+=ways;else next.set(k,{s:ns,b:nb,t:nt,h:nh,ways});
   }
   front=next;
  }
  const result={status:'ready',total,counts,objective:normalizeObjective(input.objective)};
  result.recommendation=rankRecommendations(result,known);
  // Optional lookahead only uses the COMPLETE solution set. If its budget
  // expires, retain exact odds and the completed information-based ranking.
  const tied=lowestRiskTiles(result,known);
  if((total<=maxLookaheadBoards&&tied.length>1&&tied.some(i=>counts[i].every(n=>n!==total)))||total<=maxPlanningBoards){
   try{
    const boards=[],board=Array(25).fill(0),lookaheadDeadline=Math.min(deadline,performance.now()+lookaheadTime);
    const lookaheadBudget=()=>{if(performance.now()>lookaheadDeadline)throw new Error('limit');};
    function enumerate(depth,s,b,t=0,h=0){
     lookaheadBudget();if(!allowed(t,h,depth===5))return;if(depth===5){boards.push([...board]);return;}
     const row=order[depth];
     for(const p of choices[row]){
      const ns=s.map((v,c)=>v-p.values[c]),nb=b.map((v,c)=>v-(p.values[c]===0?1:0));
      if(!feasible(depth+1,ns,nb))continue;
      if(depth<4&&!memo[depth+1].get(key(ns,nb,t+p.twos,h+p.threes)))continue;
      p.values.forEach((v,c)=>board[cell(row,c)]=v);
      enumerate(depth+1,ns,nb,t+p.twos,h+p.threes);
     }
    }
    enumerate(0,cs,cb);
    if(boards.length===total){
     if(total<=maxLookaheadBoards)result.recommendation=rankRecommendations(result,known,boards,lookaheadBudget);
     if(total<=maxPlanningBoards){
      const plan=planContinuations(boards,known,{timeLimit:planningTime,maxStates:planningStates,objective:input.objective,level:Number(input.level)||1});
      result.planning=plan.status;
      if(plan.status==='complete'){
       const preferred=result.recommendation.candidates.filter(i=>plan.candidates.includes(i));
       result.recommendation={...result.recommendation,candidates:preferred.length?preferred:plan.candidates,method:'continuations',objective:plan.objective,winChance:plan.winChance,protectChance:plan.protectChance};
      }
     }
    }
   }catch(e){if(e.message!=='limit')throw e;}
  }
  return result;
 }catch(e){
  if(e.message!=='limit')throw e;
  return {status:'limited',message:'Too many possibilities to finish yet. Record another revealed tile to narrow the search.'};
 }
}
