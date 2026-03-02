const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:8080/');

  // Create an explicit mock state to import, using the valid structure
  const mockState = {
    tableau: [
      [],[],[],[],[],[],[]
    ],
    foundations: [
      [],[],[],[]
    ],
    hand: [
      {suit: '♠', rank: 'A', value: 1, faceUp: true},
      null, null, null
    ],
    currentDealVariantKey: "cells3",
    historyStack: [],
    moveCount: 0,
    undoCount: 0,
    elapsedMs: 0,
    gameFinished: false,
    runResultRecorded: false
  };

  const str = JSON.stringify(mockState);
  const encoded = btoa(encodeURIComponent(str));

  await page.evaluate((data) => {
    window.alert = console.log;
    document.getElementById('importSaveData').value = data;
    importSave();
  }, encoded);

  await page.waitForTimeout(1000);

  const hand0 = await page.evaluate(() => hand[0]);
  console.log("Imported Hand[0]:", hand0);

  await browser.close();
})();
