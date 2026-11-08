import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=new URL(process.env.PAGES_URL||'http://127.0.0.1:4180/volt-flip/');
const home=new URL('home/',base).href,solver=new URL('solver/',base).href;
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:1440,height:1024}});
 const page=await context.newPage(),errors=[],bad=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)bad.push(`${r.status()} ${r.url()}`);});
 async function expectView(view,url){
  await page.waitForURL(url);
  await page.locator(`#view-${view}`).waitFor({state:'visible'});
  assert.equal(await page.locator(`#tab-${view}`).getAttribute('aria-selected'),'true');
  assert.equal(await page.locator(`#view-${view==='play'?'solver':'play'}`).isVisible(),false);
  assert.equal(await page.title(),view==='solver'?'Solver · Volt Flip':'Volt Flip');
 }
 assert.equal((await page.goto(solver)).status(),200);
 await expectView('solver',solver);
 await page.getByLabel('Row 1 points',{exact:true}).fill('7');
 const savedPuzzle=await page.evaluate(()=>localStorage.getItem('vf-solver'));
 const savedGame=await page.evaluate(()=>localStorage.getItem('vf-game'));
 await page.reload();await expectView('solver',solver);
 assert.equal(await page.getByLabel('Row 1 points',{exact:true}).inputValue(),'7');
 await page.locator('#tab-play').click();await expectView('play',home);
 await page.getByRole('button',{name:'Edit notes',exact:true}).click();
 await page.evaluate(()=>window.routeSession='still mounted');
 await page.locator('#tab-solver').click();await expectView('solver',solver);
 assert.equal(await page.evaluate(()=>window.routeSession),'still mounted');
 await page.goBack();await expectView('play',home);
 assert.equal(await page.getByRole('button',{name:'Edit notes',exact:true}).getAttribute('aria-pressed'),'true');
 await page.goForward();await expectView('solver',solver);
 assert.equal(await page.evaluate(()=>localStorage.getItem('vf-game')),savedGame);
 assert.equal(await page.evaluate(()=>localStorage.getItem('vf-solver')),savedPuzzle);
 await page.locator('#tab-solver').press('ArrowLeft');await expectView('play',home);
 assert.equal(await page.locator('#tab-solver').getAttribute('href'),new URL(solver).pathname);
 const opened=context.waitForEvent('page');
 await page.locator('#tab-solver').click({button:'middle'});
 const other=await opened;await other.waitForLoadState();
 await other.locator('#view-solver').waitFor({state:'visible'});
 assert.equal(other.url(),solver);assert.equal(page.url(),home);await other.close();
 assert.equal((await page.goto(home)).status(),200);await expectView('play',home);
 await page.reload();await expectView('play',home);
 for(const [path,view] of [['solver','solver'],['home','play'],['solver/index.html','solver'],['','play']]){
  const response=await page.goto(new URL(path,base).href);assert.equal(response.status(),200,path);
  await page.locator(`#view-${view}`).waitFor({state:'visible'});
  assert.equal(await page.locator(`#tab-${view}`).getAttribute('aria-selected'),'true');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 console.log(JSON.stringify({base:base.href,passed:true,directLinks:true,refresh:true,history:true,keyboard:true,newTab:true,savedState:true,rootAlias:true}));
}finally{await browser.close();}
