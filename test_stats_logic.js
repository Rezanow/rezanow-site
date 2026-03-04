const fs = require('fs');

// Minimal mock of what we need
const STATS_HISTORY_KEY = "drr_statsHistory_v1";
const MAX_STATS_HISTORY = 100000;

let localStorageData = {};
const localStorage = {
  getItem: (key) => localStorageData[key] || null,
  setItem: (key, val) => { localStorageData[key] = val; }
};

function loadStatsHistory(){
  try {
    const parsed = JSON.parse(localStorage.getItem(STATS_HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch(e){
    return [];
  }
}

function saveStatsHistory(history){
  try {
    localStorage.setItem(STATS_HISTORY_KEY, JSON.stringify(history.slice(-MAX_STATS_HISTORY)));
  } catch(e) {}
}

function computeStats(history){
  const totalGames = history.length;
  const wins = history.filter(g => g.outcome === 'win');
  const winRate = totalGames ? (wins.length / totalGames) * 100 : 0;

  let currentStreak = 0;
  for(let i=history.length - 1; i>=0; i--){
    if(history[i].outcome !== 'win') break;
    currentStreak++;
  }

  let bestStreak = 0;
  let running = 0;
  for(const game of history){
    if(game.outcome === 'win'){
      running++;
      if(running > bestStreak) bestStreak = running;
    } else {
      running = 0;
    }
  }

  const avgMovesOnWins = wins.length ? Math.round(wins.reduce((sum, g) => sum + g.moveCount, 0) / wins.length) : 0;
  const avgTimeOnWins = wins.length ? Math.round(wins.reduce((sum, g) => sum + g.elapsedMs, 0) / wins.length) : 0;

  return { totalGames, winRate, currentStreak, bestStreak, avgMovesOnWins, avgTimeOnWins };
}

let gameFinished = false;
let runResultRecorded = false;
let moveCount = 0;
let undoCount = 0;
let elapsedMs = 0;

function recordGameResult(outcome){
  if(gameFinished || runResultRecorded) return;
  gameFinished = true;
  runResultRecorded = true;
  const history = loadStatsHistory();
  history.push({ outcome, moveCount, undoCount, elapsedMs, finishedAt: Date.now() });
  saveStatsHistory(history);
}

function resetRunStats(){
  moveCount = 0;
  undoCount = 0;
  elapsedMs = 0;
  gameFinished = false;
  runResultRecorded = false;
}

// Test scenario
console.log("Initial stats:", JSON.stringify(computeStats(loadStatsHistory())));

// Game 1: Win
moveCount = 183;
elapsedMs = 219000;
recordGameResult('win');
console.log("After game 1 (win):", JSON.stringify(computeStats(loadStatsHistory())));

// Reset for Game 2
resetRunStats();

// Game 2: Loss
moveCount = 50;
elapsedMs = 100000;
recordGameResult('loss');
console.log("After game 2 (loss):", JSON.stringify(computeStats(loadStatsHistory())));
