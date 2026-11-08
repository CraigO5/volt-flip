import test from 'node:test';
import assert from 'node:assert/strict';
import {solvePuzzle,emptyPuzzle,parseCluePaste,lowestRiskTiles,solverRoundOutcome,rankRecommendations,recommendationTiles} from '../src/solver.js';
import {clues} from '../src/game.js';
const fromBoard=(board,known=Array(25).fill(null))=>({...clues(board),known});
test('all-one clues determine a unique board and every tile is safe',()=>{const r=solvePuzzle(fromBoard(Array(25).fill(1)));assert.equal(r.status,'ready');assert.equal(r.total,1);r.counts.forEach(c=>assert.deepEqual(c,[0,1,0,0]));assert.equal(lowestRiskTiles(r,Array(25).fill(null)).length,25);});
test('one bomb per row and column yields 120 permutations and 20 percent risk',()=>{const p=emptyPuzzle();p.rows=p.rows.map(()=>({sum:'4',bombs:'1'}));p.cols=p.cols.map(()=>({sum:'4',bombs:'1'}));let r=solvePuzzle(p);assert.equal(r.total,120);r.counts.forEach(c=>assert.deepEqual(c,[24,96,0,0]));p.known[0]=0;r=solvePuzzle(p);assert.equal(r.total,24);assert.deepEqual(r.counts[0],[24,0,0,0]);assert.deepEqual(r.counts[1],[0,24,0,0]);assert.equal(r.counts[6][0],6);assert.ok(!lowestRiskTiles(r,p.known).includes(0));});
test('marginal counts agree with independent exhaustive search for mixed 0/2 tiles',()=>{const board=Array(25).fill(1);[board[0],board[1],board[5],board[6]]=[0,2,2,0];const unknown=[0,1,5,6],known=board.map((v,i)=>unknown.includes(i)?null:v),p=fromBoard(board,known),r=solvePuzzle(p),counts=Array.from({length:25},()=>[0,0,0,0]);let total=0;for(let code=0;code<256;code++){const trial=[...board];unknown.forEach((i,j)=>trial[i]=(code>>(j*2))&3);if(JSON.stringify(clues(trial))!==JSON.stringify(clues(board)))continue;total++;trial.forEach((v,i)=>counts[i][v]++);}assert.equal(total,2);assert.equal(r.total,total);assert.deepEqual(r.counts,counts);});
test('incomplete, contradictory and bounded searches never produce made-up probabilities',()=>{assert.equal(solvePuzzle(emptyPuzzle()).status,'incomplete');const p=fromBoard(Array(25).fill(1));p.rows[0].sum=6;assert.equal(solvePuzzle(p).status,'invalid');const q=fromBoard(Array(25).fill(1));q.known[0]=0;assert.equal(solvePuzzle(q).status,'invalid');const limited=solvePuzzle(fromBoard(Array(25).fill(1)),{maxStates:0});assert.equal(limited.status,'limited');assert.equal(limited.counts,undefined);});
test('paste accepts ten pairs and rejects incomplete or out-of-range clues',()=>{const text='7 0\n4 2\n5 2\n6 1\n5 2\n4 2\n7 1\n7 1\n5 1\n4 2';assert.equal(parseCluePaste(text).rows[0].sum,'7');assert.equal(parseCluePaste(text).cols[4].bombs,'2');assert.equal(parseCluePaste('7 0'),null);assert.equal(parseCluePaste(text.replace('7 0','16 0')),null);});

test('round win requires recording every possible multiplier, not a unique board',()=>{
 const board=Array(25).fill(1);board[0]=2;board[1]=3;
 const p=fromBoard(board),r=solvePuzzle(p);
 assert.equal(r.total,1);assert.equal(solverRoundOutcome(r,p.known),null);
 p.known[0]=2;assert.equal(solverRoundOutcome(r,p.known),null);
 p.known[1]=3;assert.equal(solverRoundOutcome(r,p.known),'won');
 assert.equal(solverRoundOutcome({status:'working'},p.known),null);
 p.known[6]=0;assert.equal(solverRoundOutcome({status:'working'},p.known),'lost');
});
test('round can be won with ambiguous remaining ones and bombs',()=>{
 const p=emptyPuzzle();p.rows=p.rows.map(()=>({sum:'4',bombs:'1'}));p.cols=p.cols.map(()=>({sum:'4',bombs:'1'}));
 const r=solvePuzzle(p);assert.equal(r.total,120);assert.equal(solverRoundOutcome(r,p.known),'won');
});

test('equal bomb risk prefers higher expected value over a one',()=>{
 const r={status:'ready',total:10,counts:[[0,10,0,0],[0,0,10,0],[0,0,0,10],[1,0,0,9],[0,0,0,10]]};
 assert.deepEqual(lowestRiskTiles(r,Array(5).fill(null)),[2,4]);
 assert.deepEqual(lowestRiskTiles(r,[null,null,3,null,3]),[1]);
});

test('guaranteed ones stay ahead of every risky multiplier for level protection',()=>{
 const r={status:'ready',total:10,counts:[[0,10,0,0],[1,0,0,9],[0,10,0,0]]};
 r.recommendation=rankRecommendations(r,[null,null,null]);
 assert.deepEqual(recommendationTiles(r,[null,null,null]),[0,2]);
});
test('surviving information breaks equal risk and value ties without promoting risk',()=>{
 const r={status:'ready',total:10,counts:[[0,0,10,0],[0,5,0,5],[1,0,0,9]]};
 const ranked=rankRecommendations(r,Array(3).fill(null));
 assert.deepEqual(lowestRiskTiles(r,Array(3).fill(null)),[0,1]);
 assert.deepEqual(ranked.candidates,[1]);assert.equal(ranked.information[0],0);assert.equal(ranked.information[1],1);
});
test('lookahead chooses tied reveals that unlock safe multipliers, with exact fallback odds',()=>{
 const p={rows:[{sum:6,bombs:3},{sum:7,bombs:1},{sum:5,bombs:2},{sum:5,bombs:3},{sum:12,bombs:0}],cols:[{sum:3,bombs:4},{sum:10,bombs:1},{sum:8,bombs:1},{sum:9,bombs:1},{sum:5,bombs:2}],known:[null,null,null,null,null,null,2,2,1,2,null,null,1,null,1,null,null,null,2,null,3,2,2,3,2]};
 const r=solvePuzzle(p),fallback=solvePuzzle(p,{maxLookaheadBoards:0});
 assert.equal(r.total,3);assert.deepEqual(r.counts,fallback.counts);
 assert.deepEqual(lowestRiskTiles(r,p.known),[1,2,3,11,16]);
 assert.deepEqual(r.recommendation.candidates,[2,3,11,16]);
 assert.equal(r.recommendation.safeUnlocks[1],0);assert.equal(r.recommendation.safeUnlocks[2],2/3);
 assert.deepEqual(fallback.recommendation.candidates,[1,2,3,11,16]);
});
test('pruning and either search orientation match independent exhaustive enumeration',()=>{
 let seed=11371;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 for(let trial=0;trial<12;trial++){
  const board=Array.from({length:25},()=>Math.floor(random()*4)),unknown=[0,1,5,6,12,23];
  const known=board.map((v,i)=>unknown.includes(i)?null:v),p=fromBoard(board,known),expected=JSON.stringify(clues(board));
  const counts=Array.from({length:25},()=>[0,0,0,0]);let total=0;
  for(let code=0;code<4096;code++){
   const b=[...board];unknown.forEach((i,k)=>b[i]=(code>>(k*2))&3);
   if(JSON.stringify(clues(b))!==expected)continue;
   total++;b.forEach((v,i)=>counts[i][v]++);
  }
  const r=solvePuzzle(p);assert.equal(r.total,total);assert.deepEqual(r.counts,counts);
  const transpose=a=>Array.from({length:25},(_,i)=>a[(i%5)*5+Math.floor(i/5)]);
  const t=solvePuzzle({rows:p.cols,cols:p.rows,known:transpose(known)});
  assert.equal(t.total,total);assert.deepEqual(t.counts,transpose(counts));
 }
});

test('level composition constraints match exhaustive assignments and reject wrong levels',()=>{
 const board=[0,0,0,0,0,0,2,2,2,3,...Array(15).fill(1)];
 const unknown=[0,6,7,9,10,11],known=board.map((v,i)=>unknown.includes(i)?null:v),p={...fromBoard(board,known),model:'volt',level:1};
 const counts=Array.from({length:25},()=>[0,0,0,0]);let total=0;
 for(let code=0;code<4096;code++){
  const b=[...board];unknown.forEach((i,k)=>b[i]=(code>>(k*2))&3);
  if(b.filter(v=>v===2).length!==3||b.filter(v=>v===3).length!==1||JSON.stringify(clues(b))!==JSON.stringify(clues(board)))continue;
  total++;b.forEach((v,i)=>counts[i][v]++);
 }
 const r=solvePuzzle(p);assert.equal(r.total,total);assert.deepEqual(r.counts,counts);
 assert.equal(solvePuzzle({...p,level:2}).status,'invalid');
 assert.equal(solvePuzzle({...p,model:'hgss'}).status,'ready');
 assert.equal(solvePuzzle({...p,model:'hgss',level:9}).status,'invalid');
});
test('future continuations improve a one-reveal tie, and budgets preserve exact odds',()=>{
 const p={rows:[{sum:11,bombs:1},{sum:9,bombs:1},{sum:13,bombs:0},{sum:8,bombs:1},{sum:8,bombs:1}],cols:[{sum:6,bombs:2},{sum:9,bombs:1},{sum:13,bombs:0},{sum:11,bombs:1},{sum:10,bombs:0}],known:[null,null,3,null,2,null,null,3,null,1,2,3,3,2,3,null,null,1,null,3,null,null,3,null,1]};
 const old=solvePuzzle(p,{maxPlanningBoards:0}),r=solvePuzzle(p),limited=solvePuzzle(p,{planningStates:0});
 assert.equal(r.total,10);assert.deepEqual(old.recommendation.candidates,[1,3,8]);assert.deepEqual(r.recommendation.candidates,[3,8]);assert.equal(r.recommendation.winChance,.4);
 assert.equal(limited.planning,'limited');assert.equal(limited.recommendation.winChance,undefined);assert.deepEqual(limited.counts,r.counts);assert.deepEqual(limited.recommendation.candidates,old.recommendation.candidates);
});

test('HGSS counts combine distinct compatible level configurations without double-counting',()=>{
 const board=Array(25).fill(1);[board[0],board[1],board[5],board[6]]=[1,2,3,1];board[2]=2;board[3]=2;
 for(const i of [10,11,12,13,14,15])board[i]=0;
 const unknown=[0,1,5,6],p={...fromBoard(board,board.map((v,i)=>unknown.includes(i)?null:v)),model:'hgss',level:1};
 const counts=Array.from({length:25},()=>[0,0,0,0]);let total=0;
 for(let code=0;code<256;code++){
  const b=[...board];unknown.forEach((i,k)=>b[i]=(code>>(k*2))&3);
  const t=b.filter(v=>v===2).length,h=b.filter(v=>v===3).length;
  if(!((t===3&&h===1)||(t===5&&h===0))||JSON.stringify(clues(b))!==JSON.stringify(clues(board)))continue;
  total++;b.forEach((v,i)=>counts[i][v]++);
 }
 const r=solvePuzzle(p);assert.ok(total>1);assert.equal(r.total,total);assert.deepEqual(r.counts,counts);
 const local=solvePuzzle({...p,model:'volt'});assert.ok(local.total<r.total);
});

test('winning objective can recommend outside the immediate safety/value shortlist',async()=>{
 const {readFileSync}=await import('node:fs');
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/solver-objectives.json',import.meta.url))),p=fixture.p;
 const safe=solvePuzzle(p),win=solvePuzzle({...p,objective:'win'});
 assert.deepEqual(win.counts,safe.counts);
 assert.deepEqual(recommendationTiles(safe,p.known),fixture.safest);
 assert.deepEqual(recommendationTiles(win,p.known),fixture.win);
 assert.equal(win.recommendation.winChance,2/3);assert.equal(safe.recommendation.winChance,1/9);
 const fallback=solvePuzzle({...p,objective:'win'},{planningStates:0});assert.equal(fallback.planning,'limited');assert.equal(fallback.recommendation.winChance,undefined);
 assert.ok(recommendationTiles(fallback,p.known).every(i=>lowestRiskTiles(fallback,p.known).includes(i)));
});
