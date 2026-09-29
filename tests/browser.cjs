const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = process.env.TEST_URL || 'http://localhost:4173';
async function records(page) {
  return page.evaluate(() => new Promise((resolve,reject)=>{const request=indexedDB.open('goodspin',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('history'),read=tx.objectStore('history').getAll();read.onsuccess=()=>{resolve(read.result);db.close();};read.onerror=()=>reject(read.error);};}));
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base);await page.locator('#spin-button:not([disabled])').waitFor();await page.evaluate(()=>document.fonts.ready);await page.locator('#welcome[open]').waitFor();await page.locator('#welcome-name').fill('Welcome guest');await page.locator('#welcome-anonymous').check();await page.locator('#welcome-form .primary').click();assert.equal(await page.locator('#participant').inputValue(),'Welcome guest');assert.ok(await page.locator('#anonymous').isChecked());await page.locator('#participant').fill('');await page.locator('#anonymous').uncheck();
  await page.screenshot({path:'/tmp/spinwheel-desktop.png',fullPage:true});
  assert.equal(await page.locator('#prize-list .prize-item').count(),8);
  const beforeShuffle=await page.locator('#wheel text').allTextContents();
  const beforeChances=await page.locator('#prize-list .prize-item').allTextContents();
  await page.evaluate(()=>{window.savedRandom=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=array=>{array.fill(0);return array;};});
  await page.locator('#shuffle-button').click();
  await page.evaluate(()=>{crypto.getRandomValues=window.savedRandom;});
  await page.getByText('Shuffle saved on this device. Winning percentages stay the same.').waitFor();
  const afterShuffle=await page.locator('#wheel text').allTextContents();
  await page.reload();await page.locator('#welcome[open]').waitFor();await page.locator('#welcome-close').click();
  assert.deepEqual(await page.locator('#wheel text').allTextContents(),afterShuffle);
  assert.notDeepEqual(afterShuffle,beforeShuffle);assert.deepEqual([...afterShuffle].sort(),[...beforeShuffle].sort());
  assert.deepEqual((await page.locator('#prize-list .prize-item').allTextContents()).sort(),beforeChances.sort());
  assert.equal((await records(page)).length,0);
  await page.locator('#wheel-spin').click();await page.locator('#welcome[open]').waitFor();assert.equal((await records(page)).length,0);await page.locator('#welcome-close').click();
  await page.locator('#spin-button').click();assert.equal((await records(page)).length,0);
  await page.locator('#participant').fill('   ');await page.locator('#spin-button').click();assert.equal((await records(page)).length,0);
  await page.locator('#participant').fill('Private Name');await page.locator('#anonymous').check();
  await page.evaluate(()=>{document.querySelector('#spin-form').requestSubmit();document.querySelector('#spin-form').requestSubmit();});
  await page.locator('#result:not([hidden])').waitFor();
  let history=await records(page);assert.equal(history.length,1);assert.equal(history[0].name,'Anonymous');assert.ok(!JSON.stringify(history).includes('Private Name'));assert.equal(await page.locator('#participant').inputValue(),'');
  await page.locator('#participant').fill('Alex');await page.locator('#anonymous').uncheck();await page.locator('#wheel-spin').focus();await page.keyboard.press('Enter');await page.locator('#result:not([hidden])').waitFor();
  history=await records(page);assert.equal(history.length,2);assert.ok(history.some(r=>r.name==='Alex'));
  await page.locator('#result button').click();await page.locator('#welcome[open]').waitFor();
  assert.equal(await page.locator('#welcome-name').inputValue(),'');await page.locator('#welcome-close').click();
  await page.locator('#sound-toggle').click();assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'false');
  await page.locator('#sound-toggle').click();assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>audioContext.state),'running');
  const oldPrizeNames=history.map(r=>r.prizeName);
  await page.locator('nav [data-view=settings]').click();
  await page.locator('#category-name-c0').fill('First category');await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'+ Add prize');
  await page.locator('#category-p0').focus();await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'category-p0');
  await page.keyboard.press('ArrowUp');assert.equal(await page.evaluate(()=>document.activeElement.id),'category-p0');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'chance-p0');
  await page.locator('#chance-p0').fill('0');await page.locator('#save-settings').click();await page.getByText('All changes saved on this device.').waitFor();
  await page.locator('nav [data-view=spin]').click();assert.ok(await page.locator('#spin-button').isEnabled());
  await page.locator('nav [data-view=settings]').click();
  await page.locator('#chance-p0').fill('100');
  for(let i=1;i<8;i++)await page.locator(`#chance-p${i}`).fill('0');
  await page.locator('#name-p0').fill('Guaranteed gift');
  await page.locator('#image-p0').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('invalid image')});
  await page.getByText('This image could not be read. Try another image.').waitFor();
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=64;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#eaa895';ctx.fillRect(0,0,64,64);return c.toDataURL('image/png').split(',')[1];});
  await page.locator('#image-p0').setInputFiles({name:'gift.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.locator('.upload-controls').first().getByText('Remove image').waitFor();
  await page.locator('[data-preset=berry]').click();await page.locator('#save-settings').click();await page.getByText('All changes saved on this device.').waitFor();
  await page.reload();await page.locator('#welcome[open]').waitFor();await page.locator('#welcome-close').click();await page.locator('#chance-p0').waitFor();assert.equal(await page.locator('#chance-p0').inputValue(),'100');assert.equal(await page.locator('.upload-controls').first().getByText('Remove image').count(),1);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()),'#8b3155');
  assert.deepEqual((await records(page)).map(r=>r.prizeName),oldPrizeNames);
  await page.screenshot({path:'/tmp/spinwheel-settings.png',fullPage:true});
  await page.locator('nav [data-view=spin]').click();await page.locator('#participant').fill('Winner');await page.locator('#spin-button').click();await page.locator('#result:not([hidden])').waitFor();assert.equal(await page.locator('#result h3').textContent(),'Guaranteed gift');
  await page.locator('nav [data-view=history]').click();assert.equal(await page.locator('tbody tr').count(),3);await page.screenshot({path:'/tmp/spinwheel-history.png',fullPage:true});
  // Storage failure must prevent the draw and retain the participant input.
  await page.locator('nav [data-view=spin]').click();
  await page.evaluate(()=>{window.originalTransaction=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(name,...rest){if(name==='history')throw new DOMException('Quota exceeded','QuotaExceededError');return window.originalTransaction.call(this,name,...rest);};});
  await page.locator('#participant').fill('Retry');await page.locator('#spin-button').click();await page.getByText('Your result could not be saved, so the spin did not start.',{exact:false}).waitFor();assert.equal(await page.locator('#participant').inputValue(),'Retry');
  await page.evaluate(()=>{IDBDatabase.prototype.transaction=window.originalTransaction;});assert.equal((await records(page)).length,3);
  await page.reload();await page.locator('#welcome[open]').waitFor();await page.locator('#welcome-close').click();await page.locator('#spin-button:not([disabled])').waitFor();
  // A saved result survives refresh during normal motion.
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#participant').fill('Refresh');await page.locator('#wheel-spin').click();assert.ok(await page.locator('#wheel-spin').isDisabled());assert.ok(await page.locator('#shuffle-button').isDisabled());await page.waitForFunction(()=>document.querySelector('#history-count').textContent==='4');await page.reload();await page.locator('#welcome[open]').waitFor();await page.locator('#welcome-close').click();await page.locator('#spin-button:not([disabled])').waitFor();assert.equal((await records(page)).length,4);
  await page.locator('nav [data-view=history]').click();page.once('dialog',dialog=>dialog.dismiss());await page.locator('#clear-history').click();assert.equal((await records(page)).length,4);
  page.once('dialog',dialog=>dialog.accept());await page.locator('#clear-history').click();await page.locator('.empty-state').waitFor();assert.equal((await records(page)).length,0);
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,reducedMotion:'reduce'});const phone=await mobile.newPage();phone.on('pageerror',error=>errors.push(error.message));await phone.goto(base);await phone.locator('#spin-button:not([disabled])').waitFor();await phone.evaluate(()=>document.fonts.ready);await phone.locator('#welcome[open]').waitFor();await phone.screenshot({path:'/tmp/spinwheel-welcome.png'});await phone.locator('#welcome-close').click();await phone.screenshot({path:'/tmp/spinwheel-mobile.png',fullPage:true});
  for(const view of ['spin','settings','history']) {await phone.locator(`nav [data-view=${view}]`).click();assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${view} mobile overflow`);}
  await phone.locator('nav [data-view=settings]').click();await phone.screenshot({path:'/tmp/spinwheel-mobile-settings.png',fullPage:true});
  for (const width of [320,768,1024]) {
    await phone.setViewportSize({width,height:1024});
    for (const view of ['spin','settings','history']) {
      await phone.locator(`nav [data-view=${view}]`).click();
      assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${view} overflow at ${width}`);
      if (view === 'spin') await phone.screenshot({path:`/tmp/spinwheel-${width}.png`,fullPage:true});
    }
  }
  await phone.locator('nav [data-view=settings]').click();
  // Removing all prizes is a valid saved draft but cannot be spun.
  while(await phone.locator('.delete-prize').count())await phone.locator('.delete-prize').first().click();await phone.locator('#save-settings').click();await phone.getByText('Saved. Complete your prize chances to enable spinning.').waitFor();await phone.locator('nav [data-view=spin]').click();assert.ok(await phone.locator('#spin-button').isDisabled());assert.ok(await phone.locator('#wheel-spin').isDisabled());assert.ok(await phone.locator('#shuffle-button').isDisabled());
  assert.deepEqual(errors,[]);await browser.close();console.log('Passed: desktop/mobile, validation, duplicate spins, anonymous privacy, image/theme persistence, history snapshots, storage failure, mid-spin reload, and empty configuration.');
})().catch(error=>{console.error(error);process.exit(1);});
