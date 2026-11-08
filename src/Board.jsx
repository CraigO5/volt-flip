import React,{forwardRef} from 'react';
import {Bomb,Coin} from '@phosphor-icons/react';

export function BoardGrid({activeRow=-1,activeCol=-1,renderTile,renderClue,className='',...props}){
 return <div className={`board-grid ${className}`} {...props}><div/>{'ABCDE'.split('').map((c,i)=><div className={`axis ${i===activeCol?'axis-highlight':''}`} key={c}>{c}</div>)}<div/>{Array.from({length:5},(_,r)=><React.Fragment key={r}><div className={`axis ${r===activeRow?'axis-highlight':''}`}>{r+1}</div>{Array.from({length:5},(_,c)=>renderTile(r*5+c,r,c))}{renderClue('rows',r)}</React.Fragment>)}<div/>{Array.from({length:5},(_,c)=>renderClue('cols',c))}<div/></div>;
}
export function ClueCard({sum,bombs,highlight=false,children,...props}){
 return <div className={`clue ${highlight?'line-highlight':''}`} {...props}>{children||<><span title="Total tile points in this line" aria-label={`Points: ${sum}`}><Coin size={20} aria-hidden="true"/> {sum}</span><span title="Number of Voltorb" aria-label={`Voltorb: ${bombs}`}><Bomb size={20} aria-hidden="true"/> {bombs}</span></>}</div>;
}
export const BoardTile=forwardRef(function BoardTile({value=1,visible=false,children,className='',backClassName='',...props},ref){
 return <button ref={ref} className={`tile ${className}`} {...props}><span className="card-float"><span className={`card-turn ${visible?'is-flipped':''}`}><span className={`card-face card-back ${backClassName}`} aria-hidden="true">{children}</span><span className="card-face card-front" data-value={value} aria-hidden="true"><span className="value">{value===0?<Bomb size={32} weight="fill" aria-hidden="true"/>:value}</span></span></span></span></button>;
});
