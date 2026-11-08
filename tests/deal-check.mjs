import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:1440,height:1024}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4177/');
 const game={board:[1,2,1,1,2,0,1,2,0,1,1,0,3,1,0,2,1,0,2,1,0,3,1,1,0],revealed:[0,1,4,7,12],coins:24,bank:1304,level:3,nextLevel:3,status:'collected',notes:{},history:[],future:[],rounds:[]};
 async function reset(){await page.evaluate(g=>localStorage.setItem('vf-game',JSON.stringify(g)),game);await page.reload();await page.waitForSelector('.motion-ready');}
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vf-game')));
 await reset();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForSelector('.dealing-out');assert.equal((await saved()).status,'collected');assert.equal(await page.getByRole('button',{name:'Continue',exact:true}).isDisabled(),true);
 await page.waitForTimeout(90);const turns=await page.evaluate(()=>['.tile','.clue'].map(s=>new DOMMatrix(getComputedStyle(document.querySelector(s)).transform).m11));assert.ok(turns.every(v=>v>0&&v<1));await page.screenshot({path:'qa/deal-out.png',fullPage:true});
 await page.waitForSelector('.dealing-in');assert.equal((await saved()).status,'playing');assert.equal((await saved()).bank,1304);await page.locator('.tile').first().click({force:true});assert.equal((await saved()).revealed.length,0,'No reveal during new deal');await page.screenshot({path:'qa/deal-in.png',fullPage:true});
 await page.waitForSelector('.board-grid[aria-busy="false"]');assert.equal((await saved()).revealed.length,0);assert.equal(await page.locator('#view-play .clue').count(),10);
 await reset();await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Continue',exact:true}).click();assert.equal((await saved()).status,'playing');assert.equal(await page.locator('.dealing-out,.dealing-in').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS: tiles and clues flip, state swaps at midpoint, input blocked during deal, bank retained, reduced motion');
}finally{await browser.close();}
