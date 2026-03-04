const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const html = fs.readFileSync('./Alaska.html', 'utf-8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost:8080' });
const window = dom.window;

setTimeout(() => {
    window.currentState = {
        status: 'playing',
        moveCount: 0,
        timer: 0,
        tableau: [
            [{ id: '1', faceUp: true, rank: '5', suit: 'hearts', value: 5 }],
            [{ id: '2', faceUp: true, rank: '6', suit: 'spades', value: 6 }],
            [], [], [], [], []
        ],
        foundations: { spades: [], hearts: [], clubs: [], diamonds: [] },
        cells: [null, null, null]
    };
    window.render(window.currentState);

    try {
        window.document.getElementById('btnHint').click();
        console.log('Hint executed successfully');
    } catch(err) {
        console.error('Error during hint:', err);
    }
    process.exit(0);
}, 500);
