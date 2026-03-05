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

function isValidStatsRecord(record){
  if(!record || typeof record !== 'object' || Array.isArray(record)) return false;
  if(record.outcome !== 'win' && record.outcome !== 'loss') return false;
  if(!Number.isFinite(record.moveCount) || record.moveCount < 0) return false;
  if(!Number.isFinite(record.undoCount) || record.undoCount < 0) return false;
  if(!Number.isFinite(record.elapsedMs) || record.elapsedMs < 0) return false;
  if(!Number.isFinite(record.finishedAt) || record.finishedAt < 0) return false;
  if(record.variant !== undefined && record.variant !== null && typeof record.variant !== 'string') return false;
  return true;
}

function sanitizeStatsHistory(statsHistory){
  if(!Array.isArray(statsHistory)) return [];
  // THIS IS THE BUGGY LINE IN double_russian_reserve.html
  return statsHistory.every(isValidStatsRecord) ? statsHistory : [];
}

function computeStats(history){
  const totalGames = history.length;
  const wins = history.filter(g => g.outcome === 'win');
  const winRate = totalGames ? (wins.length / totalGames) * 100 : 0;
  // ... (rest doesn't matter for this test)
  return { totalGames };
}

let moveCount = 0;
let undoCount = 0;
let elapsedMs = 0;

function recordGameResult(outcome){
  const history = loadStatsHistory();
  // In double_russian_reserve.html, it does NOT add 'variant'
  history.push({ outcome, moveCount, undoCount, elapsedMs, finishedAt: Date.now() });
  saveStatsHistory(history);
}

// SIMULATION
console.log("Starting simulation...");

// 1. Play first game (Win)
moveCount = 100;
recordGameResult('win');
let history = loadStatsHistory();
let sanitized = sanitizeStatsHistory(history);
console.log("After 1st game, history length:", history.length);
console.log("Sanitized history length:", sanitized.length);

// 2. Play second game (Loss)
moveCount = 50;
recordGameResult('loss');
history = loadStatsHistory();
sanitized = sanitizeStatsHistory(history);
console.log("After 2nd game, history length:", history.length);
console.log("Sanitized history length:", sanitized.length);

// Wait, I need to see where sanitizeStatsHistory is CALLED in double_russian_reserve.html
