const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///app/index.html');
  await page.evaluate(() => start());

  // Set up a loop scenario: move a card to an empty cell
  const res = await page.evaluate(() => {
    const fromPile = tableau.findIndex(p => p.length > 0);
    if (fromPile !== -1) {
      executePileToHand(fromPile, 0);
      return { moved: true, fromPile };
    }
    return { moved: false };
  });

  if (!res.moved) {
    console.log("Could not setup loop scenario");
    await browser.close();
    return;
  }

  // Now, what does the hint suggest? It should NEVER suggest moving that card back to its original pile,
  // as that would recreate the previous state.
  const hintSuggestion = await page.evaluate(() => {
    const gameState = { tableau, hand, foundations };
    const moves = enumerateMoves({ includeCellShuffles: true, includeAllCellMoves: true });

    // We want to see if selectHintMove chooses the loop move
    const candidates = moves.filter(m => !isImmediateReverse(m, recentMoveContext, gameState) && !isHintLoop(m, gameState));
    return candidates.length;
  });

  console.log("Candidate non-looping moves left:", hintSuggestion);

  await browser.close();
})();
