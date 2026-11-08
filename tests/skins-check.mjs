import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:1488,height:1058}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4177/');
 const fixture={board:[1,2,1,1,2,0,1,2,0,1,1,0,3,1,0,2,1,0,2,1,0,3,1,1,0],revealed:[0,1,4,7,12],coins:24,bank:1280,level:3,status:'playing',notes:{2:2,6:6,13:1,14:3,15:8,18:4,22:9},excludedNotes:{8:8,14:4},history:[],future:[],rounds:[]};
 await page.evaluate(g=>localStorage.setItem('vf-game',JSON.stringify(g)),fixture);await page.reload();await page.waitForSelector('.motion-ready');
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vf-game'))),results=[];
 for(const skin of ['park','darkworld','dream']){
  await page.setViewportSize({width:1488,height:1058});await page.locator('header select').selectOption(skin);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);assert.equal(await page.locator(`.skin-${skin}.game-skin`).count(),1);assert.deepEqual(await saved(),fixture,'Skin switches preserve exact game state');
  assert.equal(await page.getByText('Saved locally',{exact:true}).count(),0);assert.equal(await page.getByText('Virtual coins only',{exact:true}).count(),0);
  await page.screenshot({path:`qa/skin-${skin}-desktop.png`,fullPage:true});
  for(const width of [1440,1024,920,768,720,390,360]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(30);const bounds=await page.evaluate(()=>{const grid=document.querySelector('.note-grid').getBoundingClientRect(),clear=document.querySelector('.clear-notes').getBoundingClientRect();return{width:innerWidth,scroll:document.documentElement.scrollWidth,levelOverflow:document.querySelector('.level-score').scrollWidth>document.querySelector('.level-score').clientWidth,clearCentered:Math.abs((clear.left+clear.right)-(grid.left+grid.right))<2};});assert.ok(bounds.scroll<=width,`${skin} fit ${width}`);assert.equal(bounds.levelOverflow,false);assert.ok(bounds.clearCentered);results.push({skin,...bounds});}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`qa/skin-${skin}-mobile.png`,fullPage:true});await page.reload();await page.waitForSelector('.motion-ready');assert.equal(await page.locator('header select').inputValue(),skin,'Skin persists');assert.deepEqual(await saved(),fixture);
 }

 // Ended boards must not inherit Emerald's hard-coded green status surface.
 for(const skin of ['park','darkworld','dream'])for(const status of ['won','lost','collected']){
  await page.evaluate(({fixture,skin,status})=>{localStorage.setItem('vf-game',JSON.stringify({...fixture,status,nextLevel:3}));localStorage.setItem('vf-skin-v2',JSON.stringify(skin));},{fixture,skin,status});await page.reload();await page.waitForSelector('.board-status:not(.sr-only)');
  const colors=await page.locator('.board-status').evaluate(el=>{const s=getComputedStyle(el);return{bg:s.backgroundColor,fg:s.color};});assert.notEqual(colors.bg,'rgb(7, 58, 42)');assert.notEqual(colors.bg,colors.fg);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(status==='lost')await page.locator('.board-status').screenshot({path:`qa/skin-${skin}-result-bar.png`});
 }
 await page.evaluate(g=>localStorage.setItem('vf-game',JSON.stringify(g)),fixture);await page.reload();await page.waitForSelector('.motion-ready');
 await page.setViewportSize({width:1488,height:1058});await page.locator('header select').selectOption('darkworld');await page.getByRole('button',{name:'Hints and rules'}).click();assert.equal(await page.locator('dialog').evaluate(e=>e.open),true);await page.getByRole('button',{name:'Close hints and rules'}).click();
 // Real Ctrl gesture must use the selected skin without changing note polarity.
 const tile=page.locator('.tile').nth(3);await tile.hover();await page.keyboard.down('Control');await page.mouse.down({button:'right'});await page.waitForSelector('.marking-menu.is-excluded');await page.keyboard.up('Control');await page.waitForTimeout(200);await page.locator('.marking-menu [data-note-value="2"]').hover();await page.mouse.up({button:'right'});await page.waitForSelector('.marking-menu',{state:'hidden'});assert.equal((await saved()).excludedNotes[3],4);assert.equal((await saved()).revealed.length,5);
 await page.getByRole('button',{name:'Clear notes',exact:true}).click();await tile.click();assert.equal((await saved()).excludedNotes[3],0);
 await page.getByRole('button',{name:'Flip',exact:true}).click();await tile.click();assert.equal((await saved()).revealed.includes(3),true);
 // Existing skins remain selectable and preserve state, too.
 const after=await saved();for(const skin of ['club','plain','neon','pocket']){await page.locator('header select').selectOption(skin);assert.deepEqual(await saved(),after);}
 assert.deepEqual(errors,[]);await writeFile('qa/skins-check.json',JSON.stringify({passed:true,results,errors},null,2));console.log('PASS: three videogame skins, 7 viewport widths, persistence, unchanged state, Ctrl not picker, eraser, flip, help, existing skins');
}finally{await browser.close();}
