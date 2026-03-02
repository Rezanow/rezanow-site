const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('LOG:', msg.text()));

  await page.goto('http://127.0.0.1:8080/');

  const mockState = {
    tableau: [[],[],[],[],[],[],[]],
    foundations: [[],[],[],[]],
    hand: [{suit: '♠', rank: 'A', value: 1, faceUp: true}, null, null, null],
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

    // override location.reload so we can inspect localStorage immediately
    const realReload = location.reload;
    location.reload = () => {
      console.log("RELOAD INTERCEPTED");
      console.log("LocalStorage post-import:", localStorage.getItem('rs_gameState_v1'));
    };

    importSave();
  }, encoded);

  await browser.close();
})();
