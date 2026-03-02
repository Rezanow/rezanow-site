const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:8080/');

  await page.evaluate(() => start());

  // Make a single identifiable move so the state is distinct
  const moveRes = await page.evaluate(() => {
     const p = tableau.findIndex(x => x.length > 0);
     if(p !== -1) {
       executePileToHand(p, 0);
       return true;
     }
     return false;
  });

  const originalStateStr = await page.evaluate(() => localStorage.getItem('rs_gameState_v1'));

  await page.evaluate(() => exportSave());
  const exported = await page.evaluate(() => document.getElementById('exportSaveData').value);

  // Reset game to default start
  await page.evaluate(() => start());
  const resetStateStr = await page.evaluate(() => localStorage.getItem('rs_gameState_v1'));
  console.log("Did reset change state?", originalStateStr !== resetStateStr);

  // Overwrite alert
  await page.evaluate(() => { window.alert = console.log; });

  await page.evaluate((data) => {
    document.getElementById('importSaveData').value = data;
    importSave();
  }, exported);

  await page.waitForTimeout(1000);

  const finalStateStr = await page.evaluate(() => localStorage.getItem('rs_gameState_v1'));

  console.log("Original matched final?:", originalStateStr === finalStateStr);

  await browser.close();
})();
