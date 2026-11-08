// HGSS composition data: pret/pokeheartgold, sBoardConfigs.
// https://github.com/pret/pokeheartgold/blob/master/src/voltorb_flip/voltorb_flip_game.c
// These are counts, NOT an exact prior for the original rejection-based RNG.
// Entries are [bombs, twos, threes]; duplicate count configurations are collapsed.
const HGSS=[
 [[6,3,1],[6,0,3],[6,5,0],[6,2,2],[6,4,1]],
 [[7,1,3],[7,6,0],[7,3,2],[7,0,4],[7,5,1]],
 [[8,2,3],[8,7,0],[8,4,2],[8,1,4],[8,6,1]],
 [[8,3,3],[8,0,5],[10,8,0],[10,5,2],[10,2,4]],
 [[10,7,1],[10,4,3],[10,1,5],[10,9,0],[10,6,2]],
 [[10,3,4],[10,0,6],[10,8,1],[10,5,3],[10,2,5]],
 [[10,7,2],[10,4,4],[13,1,6],[13,9,1],[10,6,3]],
 [[10,0,7],[10,8,2],[10,5,4],[10,2,6],[10,7,3]],
];
export function gameComposition(level){
 return [Math.min(6+level-1,10),Math.min(3+Math.floor(level/2),7),Math.min(1+Math.floor(level/3),4)];
}
export function modelCompositions(model,level){
 if(!model||model==='uniform')return null;
 if(!['volt','hgss'].includes(model)||!Number.isInteger(Number(level))||Number(level)<1||Number(level)>8)return [];
 return model==='volt'?[gameComposition(Number(level))]:HGSS[Number(level)-1];
}
export function fitsPublicTotals(composition,rows){
 const [bombs,twos,threes]=composition;
 return rows.reduce((n,r)=>n+Number(r.bombs),0)===bombs&&rows.reduce((n,r)=>n+Number(r.sum),0)===25-bombs+twos+2*threes;
}
