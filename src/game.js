import {gameComposition} from './board-model.js';
export const clues = board => {
  const line = a => ({sum:a.reduce((s,v)=>s+v,0), bombs:a.filter(v=>v===0).length});
  return {rows:Array.from({length:5},(_,r)=>line(board.slice(r*5,r*5+5))),cols:Array.from({length:5},(_,c)=>line(board.filter((_,i)=>i%5===c)))};
};
export function newGame(level=1,bank=0,rounds=[]){
  const [bombs,twos,threes]=gameComposition(level);
  const board=[...Array(bombs).fill(0),...Array(twos).fill(2),...Array(threes).fill(3),...Array(25-bombs-twos-threes).fill(1)];
  for(let i=24;i>0;i--){const j=Math.floor(Math.random()*(i+1));[board[i],board[j]]=[board[j],board[i]];}
  return {board,revealed:[],notes:{},history:[],future:[],rounds:rounds.slice(-5),level,bank,coins:0,status:'playing'};
}
export function flip(game,index){
  if(game.status!=='playing'||game.revealed.includes(index))return game;
  const revealed=[...game.revealed,index],value=game.board[index];
  if(value===0)return finishRound({...game,revealed,coins:0},'lost');
  const coins=game.revealed.length?game.coins*value:value;
  const won=game.board.every((v,i)=>v<2||revealed.includes(i));
  const updated={...game,revealed,coins,history:[],future:[]};
  return won?finishRound(updated,'won'):updated;
}
// Based on pret/pokeheartgold's CalcNextLevel and safe-card counter.
// A Voltorb reveal never contributes to level protection.
export const safeFlips = game => game.revealed.filter(i=>game.board[i]!==0).length;
export function levelAfterRound(game,outcome=game.status){
  const count=safeFlips(game);
  const rounds=[...(game.rounds||[]),{level:game.level,outcome,safe:count}].slice(-5);
  if(game.level===8&&outcome==='won')return 8;
  if(game.level>=5&&rounds.length===5&&rounds.every(r=>r.outcome!=='lost'&&r.safe>=8))return 8;
  if(outcome==='won')return Math.min(7,game.level+1);
  return Math.max(1,Math.min(7,game.level,count));
}
function finishRound(game,outcome){
  const nextLevel=levelAfterRound(game,outcome);
  return {...game,status:outcome,bank:game.bank+(outcome==='lost'?0:game.coins),history:[],future:[],nextLevel,rounds:[...(game.rounds||[]),{level:game.level,outcome,safe:safeFlips(game)}].slice(-5)};
}
export function collectRound(game){
  return game.status==='playing'?finishRound(game,'collected'):game;
}
export function nextBoard(game){
  if(game.status==='playing')return game;
  // Completed older saves lack a nextLevel/round record. Migrate on continue.
  const migrated=game.nextLevel==null;
  const level=migrated?levelAfterRound(game):game.nextLevel;
  const rounds=migrated?[...(game.rounds||[]),{level:game.level,outcome:game.status,safe:safeFlips(game)}].slice(-5):game.rounds;
  return newGame(level,game.bank,rounds||[]);
}
export function hint(game){
  if(game.status!=='playing')return 'Start the next board to keep playing.';
  const cs=clues(game.board);
  for(let axis=0;axis<2;axis++)for(let k=0;k<5;k++){
    const ids=Array.from({length:5},(_,i)=>axis?i*5+k:k*5+i), hidden=ids.filter(i=>!game.revealed.includes(i));
    if(!hidden.length)continue;
    const label=axis?`Column ${'ABCDE'[k]}`:`Row ${k+1}`;
    const cl=axis?cs.cols[k]:cs.rows[k];
    if(cl.bombs===0)return `${label} has no Voltorb. Its remaining tiles are safe.`;
    const sum=cl.sum-ids.filter(i=>game.revealed.includes(i)).reduce((s,i)=>s+game.board[i],0);
    if(sum===hidden.length-cl.bombs)return `${label}'s remaining sum is ${sum}, with ${cl.bombs} Voltorb. Its hidden tiles are only 1s or Voltorb; none are multipliers.`;
  }
  return 'No simple row or column deduction is available. Compare intersecting clues; a guess may be necessary. Notes are your own assumptions, not guarantees.';
}
