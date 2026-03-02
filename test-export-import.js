const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  await page.goto('file:///app/index.html');
  await page.evaluate(() => start());

  // Try to export
  const exportData = await page.evaluate(() => {
    exportSave();
    return document.getElementById('exportSaveData').value;
  });
  console.log("Exported data length:", exportData.length);

  // Validate it manually in JS context
  const isValid = await page.evaluate((data) => {
    try {
      const decoded = decodeURIComponent(atob(data));
      const parsed = JSON.parse(decoded);
      return isValidGameState(parsed);
    } catch (e) {
      return e.message;
    }
  }, exportData);
  console.log("Is valid game state?:", isValid);

  await browser.close();
})();
