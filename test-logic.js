const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const html = fs.readFileSync('./Alaska.html', 'utf-8');
const dom = new JSDOM(html, { runScripts: "dangerously" });
const window = dom.window;

setTimeout(() => {
    console.log("Testing Rules...");
    const state = window.currentState;
    const canMoveToTableau = window.canMoveToTableau;

    // Test 1: Ascending/Descending
    const c1 = {suit: 'hearts', rank: '5', value: 5};
    const c2 = {suit: 'hearts', rank: '4', value: 4};
    const c3 = {suit: 'hearts', rank: '6', value: 6};
    console.log("5 on 4:", canMoveToTableau(c1, c2)); // true
    console.log("5 on 6:", canMoveToTableau(c1, c3)); // true

    // Test 2: Same suit required
    const c4 = {suit: 'spades', rank: '4', value: 4};
    console.log("5h on 4s:", canMoveToTableau(c1, c4)); // false

    // Test 3: K on A / A on K
    const k = {suit: 'hearts', rank: 'K', value: 13};
    const a = {suit: 'hearts', rank: 'A', value: 1};
    console.log("K on A:", canMoveToTableau(k, a)); // false
    console.log("A on K:", canMoveToTableau(a, k)); // false

    process.exit(0);
}, 100);
