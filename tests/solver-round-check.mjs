import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {clues} from '../src/game.js';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const board=Array(25).fill(1);for(let i=0;i<5;i++)board[i]=0;for(let i=0;i<4;i++)board[(i+1)*5+i]=2;
 const puzzle={...clues(board),known:Array(25).fill(null)};
 await page.goto('http://127.0.0.1:4177/');
 await page.evaluate(p=>localStorage.setItem('vf-solver',JSON.stringify(p)),puzzle);await page.reload();
 await page.getByRole('tab',{name:'Solver',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.solver-count').textContent==='24 possible boards');
 assert.equal(await page.locator('.solver-risk.certain-bomb').count(),5);
 assert.equal(await page.locator('.solver-risk.certain-bomb strong').count(),0);
 assert.equal(await page.locator('.solver-round-won').count(),0);
 async function choose(i,value){await page.locator('.solver-cell').nth(i).hover();await page.getByRole('button',{name:`Set ${'ABCDE'[i%5]}${Math.floor(i/5)+1} to ${value}`,exact:true}).click();}
 await choose(0,'bomb');await page.locator('.solver-round-lost').waitFor();
 await page.getByRole('button',{name:'Continue',exact:true}).click();assert.equal(await page.locator('.solver-round-lost').count(),0);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vf-solver')).known[0]),0);
 await page.locator('.solver-cell').first().click({button:'right'});
 for(let i=0;i<4;i++)await choose((i+1)*5+i,'2');
 await page.locator('.solver-round-won').waitFor();
 await page.getByRole('button',{name:'Continue',exact:true}).click();assert.equal(await page.locator('.solver-round-won').count(),0);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vf-solver')).known.filter(v=>v===2).length),4);
 await choose(0,'bomb');await page.locator('.solver-round-lost').waitFor();
 await page.getByRole('button',{name:'Restart',exact:true}).click();
 assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('vf-solver')).known.every(v=>v===null)));
 assert.deepEqual(errors,[]);
 console.log('PASS: certain-bomb icons, multiplier win, bomb loss, Continue preserves inputs, Restart clears puzzle');
}finally{await browser.close();}
