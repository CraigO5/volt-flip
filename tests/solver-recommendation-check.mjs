import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {clues} from '../src/game.js';
const browser=await chromium.launch();
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4177/');
 const board=Array(25).fill(1);[board[0],board[1],board[5],board[6]]=[0,3,3,0];
 const p={...clues(board),known:board.map((v,i)=>[0,1,5,6,24].includes(i)?null:v)};
 await page.evaluate(p=>localStorage.setItem('vf-solver',JSON.stringify(p)),p);await page.reload();
 await page.getByRole('tab',{name:'Solver',exact:true}).click();
 await page.locator('.solver-target').waitFor();
 assert.ok((await page.locator('.solver-target').getAttribute('aria-label')).startsWith('E5,'));
 assert.ok((await page.locator('.solver-suggestion').textContent()).includes('level protection'));
 await page.getByLabel('Row 1 points',{exact:true}).fill('15');
 assert.equal(await page.locator('.solver-target').count(),0,'No stale recommendation while inputs change');
 await page.waitForFunction(()=>document.querySelector('.solver-count').textContent==='Check your entries');
 assert.equal(await page.locator('.solver-suggestion').count(),0);
 await page.getByLabel('Row 1 points',{exact:true}).fill(String(p.rows[0].sum));
 await page.locator('.solver-target').waitFor();
 assert.ok((await page.locator('.solver-target').getAttribute('aria-label')).startsWith('E5,'));
 assert.deepEqual(errors,[]);
 console.log('PASS: guaranteed one protects level, stale recommendation suppressed, invalid input recovers');
}finally{await browser.close();}
