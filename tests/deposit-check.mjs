import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:1024}});
 const fixture={board:[1,2,1,1,2,0,1,2,0,1,1,0,3,1,0,2,1,0,2,1,0,3,1,1,0],revealed:[1,4,7,12,15,18],coins:96,bank:1280,level:3,status:'playing',notes:{},history:[],future:[],rounds:[]};
 await page.goto('http://127.0.0.1:4177/');
 async function reset(g=fixture){await page.evaluate(g=>localStorage.setItem('vf-game',JSON.stringify(g)),g);await page.reload();await page.waitForSelector('.motion-ready');}
 const numbers=()=>page.evaluate(()=>{const n=s=>Number(document.querySelector(s).getAttribute('aria-label').replace(/[^0-9]/g,''));return{round:n('.round-score strong'),bank:n('.bank-score strong')};});
 for(const win of [false,true]){
  await reset();
  if(win)await page.locator('.tile').nth(21).click();else await page.getByRole('button',{name:'Cash out, collect 96 coins',exact:true}).click();
  const amount=win?288:96,total=1280+amount;
  await page.waitForTimeout(450);const mid=await numbers();assert.ok(mid.round>0&&mid.round<amount);assert.ok(mid.bank>1280&&mid.bank<total);assert.equal(mid.round+mid.bank,total);
  await page.waitForTimeout(1200);assert.deepEqual(await numbers(),{round:0,bank:total});
  if(win)assert.ok((await page.locator('.outcome-won').textContent()).includes('288 coins banked'));
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('vf-game')));assert.equal(saved.bank,total);assert.equal(saved.coins,amount);
  await page.reload();await page.waitForSelector('.motion-ready');assert.deepEqual(await numbers(),{round:0,bank:total});
 }
 await reset();await page.getByRole('button',{name:'Cash out, collect 96 coins',exact:true}).click();await page.waitForTimeout(350);await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForTimeout(1500);assert.deepEqual(await numbers(),{round:0,bank:1376});
 await reset();await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Cash out, collect 96 coins',exact:true}).click();assert.deepEqual(await numbers(),{round:0,bank:1376});
 assert.equal(await page.getByText('Find every 2 and 3. Avoid Voltorb.',{exact:true}).count(),0);assert.equal(await page.locator('.level-protection').count(),0);
 console.log('PASS: synchronized win/cash-out deposits, conservation, persistence, early Continue, reduced motion, removed copy');
}finally{await browser.close();}
