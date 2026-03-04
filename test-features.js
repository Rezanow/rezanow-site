const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const html = fs.readFileSync('./Alaska.html', 'utf-8');
const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost:8080" });
const window = dom.window;

setTimeout(() => {
    console.log("Testing features...");
    const saveStats = window.saveStats;
    const getStats = window.getStats;

    // Test saving a win
    window.currentState = { timer: 45, moveCount: 15 };
    saveStats(true); // first win
    saveStats(true); // second win

    const stats = getStats();
    console.log("Games played:", stats.gamesPlayed);
    console.log("Wins:", stats.gamesWon);
    console.log("Fastest:", stats.fastestWin);
    console.log("Fewest:", stats.fewestMoves);

    process.exit(0);
}, 200);
