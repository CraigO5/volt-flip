import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {solvePuzzle} from '../src/solver.js';
import {clues} from '../src/game.js';
const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:1488,height:1058}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4177/');
 const board=[0,0,2,1,1,1,0,1,2,1,1,1,0,1,3,1,2,1,0,1,1,1,1,1,0];
 const game={board,revealed:[],coins:0,bank:20,level:1,status:'playing',notes:{},history:[],future:[],rounds:[]};
 await page.evaluate(game=>{localStorage.setItem('vf-game',JSON.stringify(game));localStorage.removeItem('vf-solver');},game);await page.reload();
 await page.getByRole('tab',{name:'Solver',exact:true}).click();await page.getByRole('button',{name:'Use game clues',exact:true}).click();await page.locator('.solver-cell.is-suggested').waitFor();
 assert.equal(await page.getByLabel('Board rules',{exact:true}).inputValue(),'volt');assert.equal(await page.getByLabel('Solver level',{exact:true}).inputValue(),'1');
 const expected=solvePuzzle({...clues(board),known:Array(25).fill(null),model:'volt',level:1});
 assert.equal(await page.locator('.solver-count').textContent(),`${expected.total.toLocaleString()} possible boards`);
 await page.getByLabel('Solver level',{exact:true}).selectOption('2');await page.waitForFunction(()=>document.querySelector('.solver-count').textContent==='Check your entries');assert.equal(await page.locator('.is-suggested').count(),0);
 await page.getByLabel('Solver level',{exact:true}).selectOption('1');await page.locator('.is-suggested').waitFor();
 await page.getByLabel('Board rules',{exact:true}).selectOption('hgss');await page.locator('.solver-model p').waitFor();await page.waitForFunction(()=>document.querySelector('#view-solver').dataset.calculating==='false');
 assert.equal(await page.locator('.solver-count').textContent(),`${solvePuzzle({...clues(board),known:Array(25).fill(null),model:'hgss',level:1}).total.toLocaleString()} possible boards`);
 await page.getByLabel('Board rules',{exact:true}).selectOption('volt');await page.locator('.is-suggested').waitFor();
 for(const skin of ['park','darkworld','dream','club','plain','neon','pocket']){
  await page.locator('header select').selectOption(skin);
  const ring=await page.locator('.solver-cell.is-suggested').evaluate(el=>{const s=getComputedStyle(el,'::after');return {border:s.borderWidth,animation:s.animationName,pointer:s.pointerEvents};});
  assert.equal(ring.border,'3px');assert.equal(ring.animation,'solver-target-pulse');assert.equal(ring.pointer,'none');
 }
 await page.locator('header select').selectOption('park');await page.mouse.move(0,0);await page.screenshot({path:'qa/solver-highlight-desktop.png',fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.is-suggested').evaluate(el=>getComputedStyle(el,'::after').animationName),'none');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'qa/solver-highlight-mobile.png',fullPage:true});
 await page.reload();await page.getByRole('tab',{name:'Solver',exact:true}).click();assert.equal(await page.getByLabel('Board rules',{exact:true}).inputValue(),'volt');
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('vf-game'))),game);assert.deepEqual(errors,[]);
 console.log('PASS: automatic local level model, HGSS approximation, mismatches, persistence, seven-skin pulsing outline and reduced motion');
}finally{await browser.close();}
