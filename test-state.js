const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const html = fs.readFileSync('./Alaska.html', 'utf-8');
const dom = new JSDOM(html, { runScripts: "dangerously" });
const window = dom.window;

setTimeout(() => {
    console.log("Game State initialized successfully.");
    const state = window.currentState;
    console.log("Tableau columns:", state.tableau.length);
    console.log("Col 0 counts (down, up):", state.tableau[0].filter(c=>!c.faceUp).length, state.tableau[0].filter(c=>c.faceUp).length);
    console.log("Col 6 counts (down, up):", state.tableau[6].filter(c=>!c.faceUp).length, state.tableau[6].filter(c=>c.faceUp).length);
    console.log("Filled cells:", state.cells.filter(c=>c!==null).length);
    process.exit(0);
}, 100);
