import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {clues} from '../src/game.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/solver-objectives.json',import.meta.url)));
const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:1488,height:1058}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4177/');
 async function load(p){await page.evaluate(p=>localStorage.setItem('vf-solver',JSON.stringify(p)),p);await page.reload();await page.getByRole('tab',{name:'Solver',exact:true}).click();await page.locator('.solver-target').waitFor();}
 await load(fixture.p);const game=await page.evaluate(()=>localStorage.getItem('vf-game'));
 const goal=page.getByLabel('Goal',{exact:true});assert.equal(await goal.inputValue(),'safest');
 const targetIndex=()=>page.locator('.solver-cell').evaluateAll(els=>els.findIndex(el=>el.classList.contains('is-suggested')));
 assert.ok(fixture.safest.includes(await targetIndex()));
 await goal.selectOption('win');await page.waitForFunction(()=>document.querySelector('.solver-suggestion .eyebrow')?.textContent==='Clear the round');
 assert.ok(fixture.win.includes(await targetIndex()));assert.ok((await page.locator('.solver-suggestion').textContent()).includes('Planned clear chance: 67%'));
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('vf-solver')).known),fixture.p.known);
 await page.reload();await page.getByRole('tab',{name:'Solver',exact:true}).click();assert.equal(await goal.inputValue(),'win');
 await goal.selectOption('protect');await page.waitForFunction(()=>document.querySelector('.solver-suggestion .eyebrow')?.textContent==='Protect level');
 assert.ok((await page.locator('.solver-suggestion').textContent()).includes('Keep level or higher: 100%'));
 await page.getByLabel('Board rules',{exact:true}).selectOption('uniform');assert.equal(await page.getByLabel('Solver level',{exact:true}).isVisible(),true);
 const b=[0,0,2,1,1,1,0,1,2,1,1,1,0,1,3,1,2,1,0,1,1,1,1,1,0];
 await load({...clues(b),known:Array(25).fill(null),model:'volt',level:1,objective:'win'});
 assert.equal(await page.locator('.solver-suggestion .eyebrow').textContent(),'Safest fallback');assert.equal(await page.locator('.solver-fallback').isVisible(),true);
 assert.ok(!(await page.locator('.solver-suggestion').textContent()).includes('Planned clear chance'));
 for(const skin of ['park','darkworld','dream','club','plain','neon','pocket']){await page.locator('header select').selectOption(skin);await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.getByRole('button',{name:'Clear all',exact:true}).click();assert.equal(await goal.inputValue(),'win');
 assert.equal(await page.evaluate(()=>localStorage.getItem('vf-game')),game);assert.deepEqual(errors,[]);
 console.log('PASS: objective-specific moves, completed odds, honest fallback, persistence/reset, known-tile/game isolation, all-skin mobile fit');
}finally{await browser.close();}
