const { chromium } = require('playwright');

(async () => {
    console.log("Launching browser...");
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 812 });

    console.log("Navigating...");
    await page.goto('http://localhost:8080/Alaska.html');

    console.log("Waiting for game area...");
    await page.waitForSelector('#gameArea');

    // Take a screenshot
    console.log("Taking screenshot...");
    await page.screenshot({ path: 'alaska-mobile.png', fullPage: true });

    // Open Stats Modal
    console.log("Opening Stats...");
    await page.click('#menuToggle');
    await page.waitForTimeout(500); // Wait for menu animation
    await page.click('#btnStats');
    await page.waitForSelector('#statsModalOverlay.open');
    await page.screenshot({ path: 'alaska-stats.png' });

    await browser.close();
    console.log("Tests complete.");
})();
