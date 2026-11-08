import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {gameComposition} from '../src/board-model.js';
import {clues,flip} from '../src/game.js';
import {solvePuzzle,lowestRiskTiles,recommendationTiles} from '../src/solver.js';
const strategies=['baseline','safest','win','protect'];
const hash=n=>{n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return (n^(n>>>16))>>>0;};
function boardFor(id){
 const level=id%8+1,[bombs,twos,threes]=gameComposition(level);let seed=hash(20261107+id);
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 const board=[...Array(bombs).fill(0),...Array(twos).fill(2),...Array(threes).fill(3),...Array(25-bombs-twos-threes).fill(1)];
 for(let i=24;i>0;i--){const j=Math.floor(random()*(i+1));[board[i],board[j]]=[board[j],board[i]];}
 return {board,level};
}
function runBoard(id){
 const {board,level}=boardFor(id),publicClues=clues(board),runs={};
 for(const strategy of strategies){
  let game={board,level,revealed:[],coins:0,bank:0,status:'playing',notes:{},history:[],future:[],rounds:[]},moves=0,planned=0,fallback=0,limited=0;const times=[];
  while(game.status==='playing'){
   const puzzle={...publicClues,known:board.map((v,i)=>game.revealed.includes(i)?v:null),level,model:'volt',objective:strategy};
   const start=performance.now(),result=solvePuzzle(puzzle,{timeLimit:Infinity,planningTime:Infinity,lookaheadTime:Infinity,...(strategy==='baseline'?{maxPlanningBoards:0,maxLookaheadBoards:0}:{})});times.push(performance.now()-start);
   if(result.status!=='ready'){limited++;break;}
   if(strategy!=='baseline'){if(result.recommendation.method==='continuations')planned++;else fallback++;}
   const candidates=strategy==='baseline'?lowestRiskTiles(result,puzzle.known):recommendationTiles(result,puzzle.known);
   if(!candidates.length)throw new Error(`No move for board ${id}, ${strategy}`);
   const mask=game.revealed.reduce((n,i)=>n|(1<<i),0);
   // Identical public state + same candidate set means identical tie choice.
   const chosen=candidates.reduce((best,i)=>hash(id^mask^Math.imul(i+1,0x9e3779b1))<hash(id^mask^Math.imul(best+1,0x9e3779b1))?i:best);
   game=flip(game,chosen);if(++moves>25)throw new Error('Round did not terminate');
  }
  runs[strategy]={won:game.status==='won',bank:game.bank,retained:game.status!=='playing'&&game.nextLevel>=level,nextLevel:game.nextLevel??level,moves,planned,fallback,limited,times};
 }
 return {id,level,runs};
}
if(!isMainThread){
 for(const id of workerData.ids){parentPort.postMessage(runBoard(id));}
}else{
 const option=(name,fallback)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.split('=').slice(1).join('=')??fallback;
 const size=Number(option('boards',2000)),workers=Number(option('workers',3)),out=option('out','qa/strategy-benchmark.json');
 const records=[],started=performance.now();
 await Promise.all(Array.from({length:workers},(_,worker)=>new Promise((resolve,reject)=>{
  const ids=Array.from({length:size},(_,i)=>i).filter(i=>i%workers===worker),w=new Worker(new URL(import.meta.url),{workerData:{ids}});
  w.on('message',r=>{records.push(r);if(records.length%100===0)console.log(`${records.length}/${size} paired boards · ${((performance.now()-started)/1000).toFixed(1)}s`);});w.on('error',reject);w.on('exit',code=>code===0?resolve():reject(new Error(`Worker exited ${code}`)));
 })));
 records.sort((a,b)=>a.id-b.id);
 const summarize=list=>Object.fromEntries(strategies.map(strategy=>{
  const runs=list.map(r=>r.runs[strategy]),sum=key=>runs.reduce((n,r)=>n+Number(r[key]),0),times=runs.flatMap(r=>r.times).sort((a,b)=>a-b);
  return [strategy,{rounds:runs.length,wins:sum('won'),winRate:sum('won')/runs.length,meanBank:sum('bank')/runs.length,retained:sum('retained'),retentionRate:sum('retained')/runs.length,meanNextLevel:sum('nextLevel')/runs.length,moves:sum('moves'),planned:sum('planned'),fallback:sum('fallback'),limited:sum('limited'),medianMoveMs:times[Math.floor(times.length*.5)],p95MoveMs:times[Math.floor(times.length*.95)],maxMoveMs:times.at(-1)}];
 }));
 const paired={};for(const strategy of ['win','protect']){paired[strategy]={};for(const metric of ['won','retained']){
  const differences=records.map(r=>Number(r.runs[strategy][metric])-Number(r.runs.safest[metric])),mean=differences.reduce((a,b)=>a+b,0)/size,variance=differences.reduce((n,x)=>n+(x-mean)**2,0)/(size-1),margin=1.96*Math.sqrt(variance/size);
  paired[strategy][metric]={difference:mean,approx95CI:[mean-margin,mean+margin]};
 }}
 const result={seed:20261107,boards:size,elapsedSeconds:(performance.now()-started)/1000,method:'Same seeded local-generator boards, 250 per level in a 2000-board run; public clues/reveals only; matched deterministic tie choices; play to win or loss, no cash-out; isolated rounds without history. Fixed work limits, disabled wall-clock limits for reproducibility.',summary:summarize(records),pairedVersusSafest:paired,byLevel:Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,summarize(records.filter(r=>r.level===i+1))])),rounds:records.map(({id,level,runs})=>({id,level,runs:Object.fromEntries(Object.entries(runs).map(([s,{times,...r}])=>[s,r]))}))};
 mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({out,elapsedSeconds:result.elapsedSeconds,summary:result.summary,paired},null,2));
}
