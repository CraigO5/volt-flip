import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {clues} from '../src/game.js';
import {solvePuzzle} from '../src/solver.js';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1488,height:1058}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4177/');
 const board=[1,2,1,1,2,0,1,2,0,1,1,0,3,1,0,2,1,0,2,1,0,3,1,1,0],p={...clues(board),known:board.map((v,i)=>[0,1,4,7,12].includes(i)?v:null)};
 await page.evaluate(p=>{localStorage.setItem('vf-solver',JSON.stringify(p));localStorage.removeItem('vf-solver-auto-notes');},p);await page.reload();
 const gameBefore=await page.evaluate(()=>localStorage.getItem('vf-game'));
 await page.getByRole('tab',{name:'Solver',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.solver-count').textContent==='74 possible boards');
 const toggle=page.getByRole('button',{name:'Auto notes',exact:true});assert.equal(await toggle.getAttribute('aria-pressed'),'true');
 async function verifyMarks(){const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('vf-solver'))),r=solvePuzzle(stored);for(let i=0;i<25;i++){const expected=stored.known[i]!==null||r.total===1||r.counts[i][0]===r.total?[]:[0,1,2,3].filter(v=>r.counts[i][v]>0);const actual=await page.locator('.solver-cell').nth(i).locator('.corner').evaluateAll(els=>els.map(el=>Number(el.dataset.noteValue)).sort());assert.deepEqual(actual,expected,`Tile ${i} possibilities match exact counts`);}}
 await verifyMarks();await page.locator('.solver-cell').nth(15).hover();
 const stats=page.getByRole('region',{name:'Tile A4 probabilities'});await stats.waitFor();
 const expected=solvePuzzle(p);for(const v of [0,1,2,3]){const row=stats.locator(`.stat-${v}`);const width=await row.locator('.solver-stat-track>span').evaluate(el=>parseFloat(el.style.width));assert.ok(Math.abs(width-expected.counts[15][v]/expected.total*100)<.001);}
 await page.waitForTimeout(300);await page.screenshot({path:'qa/solver-hover-stats.png',fullPage:true});await page.mouse.move(0,0);await page.waitForTimeout(300);await page.screenshot({path:'qa/solver-auto-notes-desktop.png',fullPage:true});
 await toggle.click();assert.equal(await page.locator('#view-solver .corner').count(),0);await page.reload();await page.getByRole('tab',{name:'Solver',exact:true}).click();assert.equal(await toggle.getAttribute('aria-pressed'),'false');await toggle.click();await page.locator('#view-solver .corner').first().waitFor();
 await page.locator('.solver-cell').nth(3).hover();await page.getByRole('button',{name:'Set D1 to 1',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#view-solver').dataset.calculating==='false');await verifyMarks();
 for(const skin of ['park','darkworld','dream','club','plain','neon','pocket']){await page.locator('header select').selectOption(skin);for(const width of [1488,768,620,390]){await page.setViewportSize({width,height:1058});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('#view-solver .corner').evaluateAll(els=>els.every(el=>{const s=el.querySelector('.note-symbol').getBoundingClientRect(),b=el.closest('.card-face').getBoundingClientRect();return getComputedStyle(el).clipPath==='none'&&s.left>=b.left&&s.right<=b.right&&s.top>=b.top&&s.bottom<=b.bottom;})),`${skin} symbols fit at ${width}`);}}
 await page.locator('header select').selectOption('park');await page.mouse.move(0,0);await page.screenshot({path:'qa/solver-auto-notes-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>localStorage.getItem('vf-game')),gameBefore);assert.deepEqual(errors,[]);
 console.log('PASS: exact auto marks, toggle persistence, live updates, game isolation, all skins and mobile fit');
}finally{await browser.close();}
