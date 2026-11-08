import {lowestRiskTiles} from './solver.js';

const bits=n=>{let count=0;while(n){n&=n-1;count++;}return count;};
export const normalizeObjective=value=>['win','protect'].includes(value)?value:'safest';

// Complete adaptive search, bounded by work/time. All objectives take free
// safe reveals before risk. Only completed searches publish outcome odds.
export function planContinuations(boards,known,{timeLimit=120,maxStates=12000,objective='safest',level=1}={}){
 objective=normalizeObjective(objective);
 const deadline=performance.now()+timeLimit,memo=new Map();let states=0;
 const check=()=>{if(++states>maxStates||performance.now()>deadline)throw new Error('planner-limit');};
 const initialMask=known.reduce((m,v,i)=>v===null?m:m|(1<<i),0),bombMask=known.reduce((m,v,i)=>v===0?m|(1<<i):m,0);
 // At level 1 a loss cannot demote; level 8 requires a win without history
 // sufficient to establish the special five-round retention rule.
 const threshold=level>=8?Infinity:level<=1?0:level;
 function visit(ids,mask,root=false){
  check();const n=ids.length,counts=Array.from({length:known.length},()=>[0,0,0,0]);
  for(const id of ids)boards[id].forEach((v,i)=>counts[i][v]++);
  let normalized=mask;
  counts.forEach((c,i)=>{if(c[1]===n||c[2]===n||c[3]===n)normalized|=1<<i;});
  const stateKnown=counts.map((_,i)=>((root?mask:normalized)&(1<<i))?1:null);
  const ranked=lowestRiskTiles({status:'ready',total:n,counts},stateKnown);
  const done=counts.every((c,i)=>(normalized&(1<<i))||c[2]+c[3]===0);
  if(done)return {wins:n,protected:n,candidates:root?ranked:[]};
  const key=normalized+':'+ids.join(',');
  if(!root&&memo.has(key))return memo.get(key);
  let candidates=ranked;
  if(objective!=='safest'){
   const eligible=counts.map((c,i)=>stateKnown[i]===null&&c[0]<n?i:-1).filter(i=>i>=0);
   const safe=eligible.filter(i=>counts[i][0]===0);
   candidates=safe.length?safe:eligible;
  }
  // The first click hasn't collected inferred safe cards yet. In deeper
  // branches collecting deterministic safe cards is a free optimization.
  const activeMask=root?mask:normalized,secured=bits(activeMask&~bombMask)>=threshold;
  let best=null,bestIds=[];
  for(const i of candidates){
   check();let wins=0,protectedCount=secured?counts[i][0]:0;
   const branches=[[],[],[],[]];for(const id of ids)branches[boards[id][i]].push(id);
   for(let v=1;v<=3;v++)if(branches[v].length){
    const child=visit(branches[v],activeMask|(1<<i));wins+=child.wins;protectedCount+=child.protected;
   }
   const value=counts[i][1]+2*counts[i][2]+3*counts[i][3];
   const score=objective==='protect'?[protectedCount,wins,-counts[i][0],value]:objective==='win'?[wins,protectedCount,-counts[i][0],value]:[wins];
   let compare=best?0:1;
   if(best)for(let k=0;k<score.length;k++)if(score[k]!==best.score[k]){compare=score[k]>best.score[k]?1:-1;break;}
   if(compare>0){best={score,wins,protected:protectedCount};bestIds=[i];}else if(compare===0)bestIds.push(i);
  }
  const result={wins:best?.wins||0,protected:best?.protected||0,candidates:bestIds};
  if(!root)memo.set(key,result);return result;
 }
 try{
  const result=visit(boards.map((_,i)=>i),initialMask,true);
  return {status:'complete',objective,candidates:result.candidates,winChance:result.wins/boards.length,protectChance:result.protected/boards.length,states};
 }catch(e){if(e.message!=='planner-limit')throw e;return {status:'limited'};}
}
