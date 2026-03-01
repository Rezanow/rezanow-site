const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///app/index.html');
  await page.evaluate(() => start());
  await page.evaluate(() => exportSave());

  // Wait for transition
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'zindex-test-export.png' });
  await browser.close();
})();
