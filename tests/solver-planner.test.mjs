import test from 'node:test';
import assert from 'node:assert/strict';
import {planContinuations} from '../src/solver-planner.js';

// Independent, deliberately simple exhaustive oracle: no memoization and no
// automatic collection of deterministic tiles, so it tests those optimizations.
function oracle(boards,known){
 if(boards.every(b=>b.every((v,i)=>v<2||known[i]!==null)))return {wins:boards.length};
 let min=Infinity,value=-1,candidates=[];
 for(let i=0;i<known.length;i++)if(known[i]===null){
  const bombs=boards.filter(b=>b[i]===0).length,sum=boards.reduce((n,b)=>n+b[i],0);
  if(bombs<min||(bombs===min&&sum>value)){min=bombs;value=sum;candidates=[i];}else if(bombs===min&&sum===value)candidates.push(i);
 }
 let best=-1,ids=[];
 for(const i of candidates){let wins=0;for(let v=1;v<=3;v++){const branch=boards.filter(b=>b[i]===v);if(branch.length){const next=[...known];next[i]=v;wins+=oracle(branch,next).wins;}}
  if(wins>best){best=wins;ids=[i];}else if(wins===best)ids.push(i);
 }
 return {wins:best,candidates:ids};
}
test('bounded continuation planner matches independent complete decision trees',()=>{
 let seed=20261107;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 for(let trial=0;trial<40;trial++){
  const boards=Array.from({length:6},()=>Array.from({length:5},()=>Math.floor(random()*4))),known=Array(5).fill(null);
  const expected=oracle(boards,known),actual=planContinuations(boards,known,{timeLimit:1000});
  assert.equal(actual.status,'complete');assert.equal(actual.winChance,expected.wins/boards.length);
  if(expected.candidates)assert.deepEqual(actual.candidates,expected.candidates);
 }
});
test('planner retains guaranteed ones ahead of risky multipliers and respects limits',()=>{
 const boards=[[1,0,3],[1,3,0]],known=[null,null,null];
 const r=planContinuations(boards,known);assert.deepEqual(r.candidates,[0]);assert.equal(r.winChance,.5);
 assert.deepEqual(planContinuations(boards,known,{maxStates:0}),{status:'limited'});
});

function objectiveOracle(boards,known,objective,level){
 const n=boards.length,threshold=level>=8?Infinity:level<=1?0:level;
 if(boards.every(b=>b.every((v,i)=>v<2||known[i]!==null)))return {wins:n,protected:n};
 let candidates=known.map((v,i)=>v===null?i:-1).filter(i=>i>=0);
 const count=i=>boards.filter(b=>b[i]===0).length,value=i=>boards.reduce((s,b)=>s+b[i],0);
 const safe=candidates.filter(i=>count(i)===0);if(safe.length)candidates=safe;
 const secured=known.filter(v=>v!==null&&v!==0).length>=threshold;
 let best=null,ids=[];
 for(const i of candidates){let wins=0,protectedCount=secured?count(i):0;
  for(let v=1;v<=3;v++){const branch=boards.filter(b=>b[i]===v);if(branch.length){const next=[...known];next[i]=v;const child=objectiveOracle(branch,next,objective,level);wins+=child.wins;protectedCount+=child.protected;}}
  const score=objective==='protect'?[protectedCount,wins,-count(i),value(i)]:[wins,protectedCount,-count(i),value(i)];
  let cmp=best?0:1;if(best)for(let k=0;k<score.length;k++)if(score[k]!==best.score[k]){cmp=Math.sign(score[k]-best.score[k]);break;}
  if(cmp>0){best={score,wins,protected:protectedCount};ids=[i];}else if(cmp===0)ids.push(i);
 }
 return {...best,candidates:ids};
}
test('win and protect objectives match independent exhaustive outcome trees',()=>{
 let seed=8219;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 for(const objective of ['win','protect'])for(const level of [1,3,8])for(let trial=0;trial<30;trial++){
  const boards=Array.from({length:6},()=>Array.from({length:5},()=>Math.floor(random()*4))),known=Array(5).fill(null);
  const expected=objectiveOracle(boards,known,objective,level),actual=planContinuations(boards,known,{objective,level,timeLimit:1000,maxStates:100000});
  assert.equal(actual.status,'complete');assert.equal(actual.winChance,expected.wins/boards.length);assert.equal(actual.protectChance,expected.protected/boards.length);
  if(expected.candidates)assert.deepEqual(actual.candidates,expected.candidates);
 }
});

test('level protection counts recorded and inferred safe tiles without counting bombs',()=>{
 const boards=[[1,0,1,2,0],[1,0,1,0,2]],known=[1,0,null,null,null];
 const actual=planContinuations(boards,known,{objective:'protect',level:3});
 const expected=objectiveOracle(boards,known,'protect',3);
 assert.equal(actual.protectChance,expected.protected/2);assert.deepEqual(actual.candidates,[2]);
 assert.equal(actual.protectChance,.5);
 const secured=planContinuations(boards,known,{objective:'protect',level:2});assert.equal(secured.protectChance,1);
 const level8=planContinuations(boards,known,{objective:'protect',level:8});assert.equal(level8.protectChance,level8.winChance);
});
