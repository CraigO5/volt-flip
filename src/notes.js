// Notes are independent bit flags, with snapshots for reversible edits.
const snapshot=game=>({notes:game.notes,excludedNotes:game.excludedNotes||{}});
const restore=(game,saved)=>saved.notes?{...game,notes:saved.notes,excludedNotes:saved.excludedNotes||{}}:{...game,notes:saved,excludedNotes:{}};
export function toggleNote(game,index,value,excluded=false){
 if(![0,1,2,3].includes(value))return game;
 return toggleNoteGroup(game,index,1<<value,excluded);
}
export function undoNote(game){
 if(game.status!=='playing'||!game.history?.length)return game;
 return {...restore(game,game.history.at(-1)),history:game.history.slice(0,-1),future:[...(game.future||[]),snapshot(game)]};
}
export function redoNote(game){
 if(game.status!=='playing'||!game.future?.length)return game;
 return {...restore(game,game.future.at(-1)),history:[...(game.history||[]),snapshot(game)],future:game.future.slice(0,-1)};
}
// One source of truth for rendering and radial hit testing.
export const NOTE_LAYOUT=[{value:2,row:0,column:0},{value:1,row:0,column:1},{value:3,row:1,column:0},{value:0,row:1,column:1}];
export function markDirection(dx,dy){
  if(Math.hypot(dx,dy)<24)return null;
  return NOTE_LAYOUT[(dy<0?0:2)+(dx<0?0:1)].value;
}

// Apply the sidebar selection together; a complete selection toggles off together.
export function toggleNoteGroup(game,index,mask,excluded=false){
 if(game.status!=='playing'||game.revealed.includes(index)||!Number.isInteger(mask)||mask<=0||mask>15)return game;
 const field=excluded?'excludedNotes':'notes',other=excluded?'notes':'excludedNotes';
 const current=game[field]?.[index]||0,removing=(current&mask)===mask;
 return {...game,history:[...(game.history||[]).slice(-49),snapshot(game)],future:[],[field]:{...game[field],[index]:removing?current&~mask:current|mask},[other]:{...game[other],[index]:removing?(game[other]?.[index]||0):(game[other]?.[index]||0)&~mask}};
}

export function clearTileNotes(game,index){
 if(game.status!=='playing'||game.revealed.includes(index)||!(game.notes[index]||game.excludedNotes?.[index]))return game;
 return {...game,history:[...(game.history||[]).slice(-49),snapshot(game)],future:[],notes:{...game.notes,[index]:0},excludedNotes:{...game.excludedNotes,[index]:0}};
}
