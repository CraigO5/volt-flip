import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch();try{
 const context=await browser.newContext({viewport:{width:1440,height:1024}}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const game={board:[1,2,1,1,2,0,1,2,0,1,1,0,3,1,0,2,1,0,2,1,0,3,1,1,0],revealed:[],notes:{},history:[],future:[],rounds:[],level:1,bank:0,coins:0,status:'playing'};
 await page.addInitScript(g=>{localStorage.setItem('vf-game',JSON.stringify(g));localStorage.setItem('vf-sound','false');},game);
 await page.goto('http://127.0.0.1:4177/?check=picker');await page.waitForSelector('.motion-ready');
 const tile=page.locator('.tile').nth(6);await tile.hover();const b=await tile.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down({button:'right'});await page.waitForSelector('.marking-menu');await page.waitForTimeout(220);
 const positions={};for(const value of [2,1,3,0])positions[value]=await page.locator(`[data-note-value="${value}"]`).boundingBox();assert.ok(positions[1].x>positions[2].x,'Visible 1 must be on right');assert.ok(positions[0].x>positions[3].x,'Bomb must be below 1');
 const notes=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vf-game')).notes[6]||0);
 async function enter(value){const r=positions[value];await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.waitForTimeout(20);}
 await enter(1);assert.equal(await notes(),2,'Hovering visible 1 toggles the 1 bit, not 2');await enter(1);assert.equal(await notes(),2,'Staying on 1 does not retrigger');await enter(2);assert.equal(await notes(),6,'Hovering visible 2 toggles 2');await enter(1);assert.equal(await notes(),4,'Revisiting 1 toggles only 1 off');await enter(0);await enter(3);await enter(1);assert.equal(await notes(),15,'All four can be chosen in one hold');
 const m=await page.locator('.marking-menu').boundingBox(),cx=m.x+m.width/2,cy=m.y+m.height/2;await page.mouse.move(cx+180,cy-180);assert.equal(await notes(),15,'Same projected sector does not retrigger');await page.mouse.move(cx-180,cy-180);await page.waitForTimeout(30);assert.equal(await notes(),11,'Far projected upper-left is 2');await page.mouse.up({button:'right'});await page.waitForSelector('.marking-menu',{state:'hidden'});assert.equal(await notes(),11,'Release never adds another toggle');
 await page.getByRole('button',{name:'Edit notes',exact:true}).click();await tile.hover();const c=await tile.boundingBox();await page.mouse.move(c.x+c.width/2,c.y+c.height/2);await page.mouse.down();await page.waitForSelector('.marking-menu');await page.waitForTimeout(200);const one=await page.locator('[data-note-value="1"]').boundingBox();await page.mouse.move(one.x+one.width/2,one.y+one.height/2);await page.mouse.up();await page.waitForSelector('.marking-menu',{state:'hidden'});assert.equal(await notes(),9,'Left hold in notes mode also maps 1 correctly without a second click');
 assert.deepEqual(errors,[]);await writeFile('qa/picker-check.json',JSON.stringify({passed:true,positions,finalNotes:await notes(),errors},null,2));console.log(JSON.stringify({passed:true,positions}));
}finally{await browser.close();}
