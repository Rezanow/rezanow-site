const suits = ["♠","♥","♦","♣"];
const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const suitColors = { "♠":"#111111", "♥":"#c62828", "♦":"#c62828", "♣":"#111111" };

const suitClass = { "♠":"spades", "♥":"hearts", "♦":"diamonds", "♣":"clubs" };

const SUIT_STYLE_KEY = "rs_suitStyle_v1";
const GAME_STATE_KEY = "rs_gameState_v1";
const STATS_HISTORY_KEY = "rs_statsHistory_v1";
const SAVE_PAYLOAD_VERSION = 1;
const DEAL_VARIANT_KEY = "rs_dealVariant_v1";
const DEFAULT_DEAL_VARIANT_KEY = "cells3";
const MAX_STATS_HISTORY = 100000;
const APP_VERSION = "v0.3.0-js";

const DEAL_VARIANTS = {
  cells0: {
    freeCells: 0,
    columns: [
      { total: 7, faceDown: 0 },
      { total: 7, faceDown: 1 },
      { total: 7, faceDown: 2 },
      { total: 7, faceDown: 3 },
      { total: 8, faceDown: 4 },
      { total: 8, faceDown: 5 },
      { total: 8, faceDown: 6 }
    ]
  },
  cells1: {
    freeCells: 1,
    columns: [
      { total: 7, faceDown: 0 },
      { total: 7, faceDown: 1 },
      { total: 7, faceDown: 2 },
      { total: 7, faceDown: 3 },
      { total: 7, faceDown: 4 },
      { total: 8, faceDown: 5 },
      { total: 8, faceDown: 6 }
    ]
  },
  cells2: {
    freeCells: 2,
    columns: [
      { total: 7, faceDown: 0 },
      { total: 7, faceDown: 1 },
      { total: 7, faceDown: 2 },
      { total: 7, faceDown: 3 },
      { total: 7, faceDown: 4 },
      { total: 7, faceDown: 5 },
      { total: 8, faceDown: 6 }
    ]
  },
  cells3: {
    freeCells: 3,
    columns: [
      { total: 7, faceDown: 0 },
      { total: 7, faceDown: 1 },
      { total: 7, faceDown: 2 },
      { total: 7, faceDown: 3 },
      { total: 7, faceDown: 4 },
      { total: 7, faceDown: 5 },
      { total: 7, faceDown: 6 }
    ]
  },
  cells4: {
    freeCells: 4,
    columns: [
      { total: 6, faceDown: 0 },
      { total: 7, faceDown: 1 },
      { total: 7, faceDown: 2 },
      { total: 7, faceDown: 3 },
      { total: 7, faceDown: 4 },
      { total: 7, faceDown: 5 },
      { total: 7, faceDown: 6 }
    ]
  }
};

let currentDealVariantKey = DEFAULT_DEAL_VARIANT_KEY;

function getDealVariantConfig(variantKey){
  return DEAL_VARIANTS[variantKey] || DEAL_VARIANTS[DEFAULT_DEAL_VARIANT_KEY];
}

function getCurrentDealConfig(){
  return getDealVariantConfig(currentDealVariantKey);
}

function loadDealVariantPreference(){
  try {
    const saved = localStorage.getItem(DEAL_VARIANT_KEY);
    if(saved && DEAL_VARIANTS[saved]){
      currentDealVariantKey = saved;
      return;
    }
  } catch(e) {}

  currentDealVariantKey = DEFAULT_DEAL_VARIANT_KEY;
}

function applyDealVariant(variantKey){
  if(!DEAL_VARIANTS[variantKey]) return;
  currentDealVariantKey = variantKey;
  const sel = document.getElementById("dealVariantSelect");
  if(sel && sel.value !== variantKey) sel.value = variantKey;
  try { localStorage.setItem(DEAL_VARIANT_KEY, variantKey); } catch(e) {}
  scheduleFit();
}

function initDealVariantUI(){
  loadDealVariantPreference();
  const sel = document.getElementById("dealVariantSelect");
  if(!sel) return;
  sel.value = currentDealVariantKey;
  sel.addEventListener("change", () => {
    applyDealVariant(sel.value);
    start();
  });
}
function applySuitStyle(style){
  const clsPrefix = "suit-style-";
  // remove existing suit-style-* classes
  document.body.className = document.body.className
    .split(/\s+/)
    .filter(c => c && !c.startsWith(clsPrefix))
    .join(" ");
  document.body.classList.add(clsPrefix + style);

  const sel = document.getElementById("suitStyleSelect");
  if(sel && sel.value !== style) sel.value = style;

  try { localStorage.setItem(SUIT_STYLE_KEY, style); } catch(e) {}
  scheduleFit();
}

function loadSuitStyle(){
  let style = "normal";
  try { style = localStorage.getItem(SUIT_STYLE_KEY) || "normal"; } catch(e) {}

  // Map removed legacy styles to closest current options.
  if(style === "dark") style = "cb";
  if(style === "border") style = "color";

  const allowed = new Set(["normal","color","multicolor","watermark","watermark-hc","pattern","pattern-hc","corners","cb","cb-corners"]);
  if(!allowed.has(style)) style = "normal";
  applySuitStyle(style);
}

function initSuitStyleUI(){
  const sel = document.getElementById("suitStyleSelect");
  if(sel){
    sel.addEventListener("change", () => applySuitStyle(sel.value));
  }
  loadSuitStyle();
}

function renderAppVersion(){
  const versionEl = document.getElementById("appVersion");
  if(!versionEl) return;

  const resolvedVersion = (typeof APP_VERSION === "string" ? APP_VERSION.trim() : "");
  versionEl.textContent = resolvedVersion || "v0.0.0";
}

let tableau=[[],[],[],[],[],[],[]];
let foundations=[[],[],[],[]];
let hand=[];
let historyStack=[];
let selected=null;
let moveCount=0;
let undoCount=0;
let elapsedMs=0;
let timerInterval=null;
let lastTickTs=Date.now();
let timerActive=false;
let gameFinished=false;
let runResultRecorded=false;
let recentMoveContext = null;
let priorMoveContext = null;
let hintHistory = [];

let cachedVisitedKeys = null;
let cachedVisitedKeysState = { moveCount: -1, undoCount: -1 };

const MAX_PERSISTED_HISTORY = 150;
const IMPORT_APPLY_PENDING_KEY = 'RS_IMPORT_APPLY_PENDING';
let suppressPersistenceWrites = false;

function isValidCard(c) {
  if (!c || typeof c !== 'object') return false;
  if (!suits.includes(c.suit)) return false;
  if (!ranks.includes(c.rank)) return false;
  if (typeof c.value !== 'number' || c.value < 1 || c.value > 13) return false;
  if (typeof c.faceUp !== 'boolean') return false;
  return true;
}

function isValidGameState(state) {
  if (!state || typeof state !== 'object') return false;

  if (!Array.isArray(state.tableau) || state.tableau.length !== 7) return false;
  for (const pile of state.tableau) {
    if (!Array.isArray(pile)) return false;
    for (const card of pile) {
      if (!isValidCard(card)) return false;
    }
  }

  if (!Array.isArray(state.foundations) || state.foundations.length !== 4) return false;
  for (const pile of state.foundations) {
    if (!Array.isArray(pile)) return false;
    for (const card of pile) {
      if (!isValidCard(card)) return false;
    }
  }

  if (!Array.isArray(state.hand)) return false;
  for (const card of state.hand) {
    if (card !== null && !isValidCard(card)) return false;
  }

  return true;
}

function persistGameState(){
  if(suppressPersistenceWrites) return;
  const persistedHistory = historyStack.slice(-MAX_PERSISTED_HISTORY);
  const snapshot = {
    tableau,
    foundations,
    hand,
    currentDealVariantKey,
    historyStack: persistedHistory,
    moveCount,
    undoCount,
    elapsedMs,
    gameFinished,
    runResultRecorded
  };

  // Browsers have strict localStorage quotas; if persistence fails, trim
  // history snapshots and retry so current progress is never dropped.
  for(let keep = persistedHistory.length; keep >= 0; keep--){
    snapshot.historyStack = keep === 0 ? [] : persistedHistory.slice(-keep);
    try {
      localStorage.setItem(GAME_STATE_KEY, JSON.stringify(snapshot));
      return;
    } catch(e) {}
  }
}

function applyHydratedGameState(parsed){
  const persistedVariantKey = parsed.currentDealVariantKey && DEAL_VARIANTS[parsed.currentDealVariantKey]
    ? parsed.currentDealVariantKey
    : (parsed.hand.length >= 0 && parsed.hand.length <= 4 ? `cells${parsed.hand.length}` : DEFAULT_DEAL_VARIANT_KEY);
  applyDealVariant(persistedVariantKey);

  const expectedFreeCells = getCurrentDealConfig().freeCells;

  // Adjust legacy or imported save's hand length to match the expected configuration
  if(parsed.hand.length > expectedFreeCells) {
     // If there are more slots than expected, we can only trim them if they are empty
     const extraCards = parsed.hand.slice(expectedFreeCells).filter(c => c !== null);
     if (extraCards.length > 0) return false; // Reject save if it would drop real cards
     parsed.hand = parsed.hand.slice(0, expectedFreeCells);
  } else while(parsed.hand.length < expectedFreeCells) {
     parsed.hand.push(null);
  }

  tableau = parsed.tableau;
  foundations = parsed.foundations;
  hand = parsed.hand;
  historyStack = Array.isArray(parsed.historyStack) ? parsed.historyStack : [];
  moveCount = Number.isFinite(parsed.moveCount) ? parsed.moveCount : 0;
  undoCount = Number.isFinite(parsed.undoCount) ? parsed.undoCount : 0;
  elapsedMs = Number.isFinite(parsed.elapsedMs) ? parsed.elapsedMs : 0;
  gameFinished = !!parsed.gameFinished;
  runResultRecorded = !!parsed.runResultRecorded;
  recentMoveContext = null;
  priorMoveContext = null;
  selected = null;
  return true;
}

function loadPersistedGameState(){
  try {
    const raw = localStorage.getItem(GAME_STATE_KEY);
    if(!raw) return false;
    const parsed = JSON.parse(raw);

    if(!isValidGameState(parsed)) return false;

    return applyHydratedGameState(parsed);
  } catch(e){
    return false;
  }
}

function applyImportedSaveState(rawPayload, options = {}){
  const { reloadAfterImport = false } = options;
  const parsed = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
  if (!isValidGameState(parsed)) {
    throw new Error('Invalid save format');
  }

  const normalizedPayload = JSON.stringify(parsed);
  localStorage.setItem(GAME_STATE_KEY, normalizedPayload);
  if(reloadAfterImport){
    localStorage.setItem(IMPORT_APPLY_PENDING_KEY, '1');
  } else {
    localStorage.removeItem(IMPORT_APPLY_PENDING_KEY);
  }

  const previousSuppress = suppressPersistenceWrites;
  suppressPersistenceWrites = true;
  const applied = applyHydratedGameState(parsed);
  suppressPersistenceWrites = previousSuppress;

  if(!applied) {
    throw new Error('Imported save is incompatible with current deal configuration');
  }

  closeModals();
  clearHints();
  updateRunStatsUI();
  lastTickTs = Date.now();
  fit();
  render();
  syncTimerPresence();
}


function formatDuration(ms){
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const secs = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function updateRunStatsUI(){
  const moveEl = document.getElementById('moveCountStat');
  const timeEl = document.getElementById('elapsedTimeStat');
  const undoEl = document.getElementById('undoCountStat');
  if(moveEl) moveEl.textContent = `Moves: ${moveCount}`;
  if(timeEl) timeEl.textContent = `Time: ${formatDuration(elapsedMs)}`;
  if(undoEl) undoEl.textContent = `Undos: ${undoCount}`;
}

function startTimer(){
  if(timerInterval) clearInterval(timerInterval);
  syncTimerPresence();
  timerInterval = setInterval(() => {
    if(!timerActive || gameFinished) return;
    const now = Date.now();
    elapsedMs += now - lastTickTs;
    lastTickTs = now;
    updateRunStatsUI();
    persistGameState();
  }, 1000);
}

function isPlayerPresent(){
  return !document.hidden && document.hasFocus();
}

function syncTimerPresence(){
  const shouldBeActive = !gameFinished && isPlayerPresent();
  if(shouldBeActive){
    lastTickTs = Date.now();
    timerActive = true;
    return;
  }

  if(timerActive){
    const now = Date.now();
    elapsedMs += Math.max(0, now - lastTickTs);
    timerActive = false;
    updateRunStatsUI();
    persistGameState();
  }
}

function resetRunStats(){
  moveCount = 0;
  undoCount = 0;
  elapsedMs = 0;
  gameFinished = false;
  runResultRecorded = false;
  recentMoveContext = null;
  priorMoveContext = null;
  timerActive = false;
  lastTickTs = Date.now();
  updateRunStatsUI();
}

function cardKey(card){
  if(!card) return null;
  return `${card.rank}${card.suit}`;
}

function recordRecentMove(type, source, target, card){
  priorMoveContext = recentMoveContext;
  recentMoveContext = {
    type,
    source: source ? { ...source } : null,
    target: target ? { ...target } : null,
    cardKey: cardKey(card)
  };
}

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
  return statsHistory.every(isValidStatsRecord) ? statsHistory : [];
}

function recordGameResult(outcome){
  if(gameFinished || runResultRecorded) return;
  syncTimerPresence();
  gameFinished = true;
  runResultRecorded = true;
  const history = loadStatsHistory();
  history.push({ outcome, moveCount, undoCount, elapsedMs, finishedAt: Date.now(), variant: currentDealVariantKey });
  saveStatsHistory(history);
  persistGameState();
  renderStatsModal();

  // Attempt to log to global stats if Firebase is enabled
  if(typeof window.logGlobalStat === 'function') {
    const variantHistory = history.filter(g => g.variant === currentDealVariantKey || !g.variant); // fallback to include older pre-variant records
    const computed = computeStats(variantHistory);
    window.logGlobalStat({
      outcome,
      moveCount,
      undoCount,
      elapsedMs,
      variant: currentDealVariantKey,
      appVersion: APP_VERSION,
      // Include the player's personal computed stats
      playerStats: {
        totalGames: computed.totalGames,
        winRate: computed.winRate,
        currentStreak: computed.currentStreak,
        bestStreak: computed.bestStreak,
        avgMovesOnWins: computed.avgMovesOnWins,
        avgTimeOnWins: computed.avgTimeOnWins
      }
    });
  }
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

function renderStatsModal(){
  const grid = document.getElementById('statsGrid');
  if(!grid) return;
  const stats = computeStats(loadStatsHistory());
  grid.innerHTML = `
    <span>Total games</span><strong>${stats.totalGames}</strong>
    <span>Win rate</span><strong>${stats.winRate.toFixed(1)}%</strong>
    <span>Current streak</span><strong>${stats.currentStreak}</strong>
    <span>Best streak</span><strong>${stats.bestStreak}</strong>
    <span>Avg moves (wins)</span><strong>${stats.avgMovesOnWins}</strong>
    <span>Avg time (wins)</span><strong>${formatDuration(stats.avgTimeOnWins)}</strong>
  `;
}

function exportSave() {
  const gameStateStr = localStorage.getItem(GAME_STATE_KEY);
  if (!gameStateStr) {
    alert("No active game to export.");
    return;
  }

  let gameState;
  try {
    gameState = JSON.parse(gameStateStr);
  } catch (e) {
    alert("Unable to export: game state is corrupted.");
    return;
  }

  let statsHistory = [];
  try {
    statsHistory = JSON.parse(localStorage.getItem(STATS_HISTORY_KEY) || '[]');
  } catch (e) {
    statsHistory = [];
  }

  const payload = {
    version: SAVE_PAYLOAD_VERSION,
    gameState,
    statsHistory: Array.isArray(statsHistory) ? statsHistory : []
  };

  const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
  document.getElementById('exportSaveData').value = encoded;
  document.getElementById('modalExport').classList.add('active');
}

async function copyExportData() {
  const input = document.getElementById('exportSaveData');
  const btn = document.getElementById('copyExportBtn');
  const oldText = btn.textContent;

  const setButtonTextTemporarily = (text) => {
    btn.textContent = text;
    setTimeout(() => btn.textContent = oldText, 2000);
  };

  if (!input.value.trim()) {
    setButtonTextTemporarily("No code yet");
    return;
  }

  let copied = false;
  if (window.isSecureContext && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(input.value);
      copied = true;
    } catch (e) {
      copied = false;
    }
  }

  if (!copied) {
    try {
      input.focus();
      input.select();
      input.setSelectionRange(0, input.value.length);
      copied = document.execCommand('copy');
    } catch (e) {
      copied = false;
    }
  }

  if (copied) {
    setButtonTextTemporarily("Copied!");
  } else {
    setButtonTextTemporarily("Copy failed");
  }
}

function showImportModal() {
  document.getElementById('importSaveData').value = '';
  document.getElementById('modalImport').classList.add('active');
}

function importSave() {
  const input = document.getElementById('importSaveData').value.trim();
  if (!input) return;

  try {
    const normalizedInput = (() => {
      let normalized = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
      const paddingLength = normalized.length % 4;
      if (paddingLength) {
        normalized += '='.repeat(4 - paddingLength);
      }
      return normalized;
    })();

    const decoded = decodeURIComponent(atob(normalizedInput));
    const parsed = JSON.parse(decoded);

    let gameStateToImport = null;
    let statsHistoryToImport = [];
    let importedStats = false;

    if (isValidGameState(parsed)) {
      gameStateToImport = parsed;
    } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.gameState !== undefined) {
      if (!isValidGameState(parsed.gameState)) {
        throw new Error("Invalid save format");
      }
      gameStateToImport = parsed.gameState;
      statsHistoryToImport = sanitizeStatsHistory(parsed.statsHistory);
      importedStats = statsHistoryToImport.length > 0;
    } else {
      throw new Error("Invalid save format");
    }

    applyImportedSaveState(gameStateToImport);
    localStorage.setItem(STATS_HISTORY_KEY, JSON.stringify(statsHistoryToImport.slice(-MAX_STATS_HISTORY)));
    renderStatsModal();

    alert(`Save imported successfully (${importedStats ? 'game + stats' : 'game only'}).`);

  } catch (e) {
    alert("Invalid save data. Please check the code, try pasting again, or use the Copy button.");
  }
}

function closeExportModal() {
  document.getElementById('modalExport').classList.remove('active');
}

function closeImportModal() {
  document.getElementById('modalImport').classList.remove('active');
}

function makeDeck(){
  const d=[]; for(const s of suits){ for(let r=0;r<ranks.length;r++){ d.push({suit:s,rank:ranks[r],value:r+1,faceUp:true}); } }
  return d;
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} }

function save(){
  // Save snapshot of current state (used as a "pre-move" history entry).
  historyStack.push(JSON.stringify({
    tableau,
    foundations,
    hand,
    currentDealVariantKey,
    moveCount,
    undoCount,
    elapsedMs,
    gameFinished,
    runResultRecorded
  }));
}
function undo(){
  closeModals();
  clearHints();
  // History stores snapshots from BEFORE each committed change.
  // So undo should restore the LAST saved snapshot (top of stack).
  if(historyStack.length > 0){
    const prev = JSON.parse(historyStack.pop());
    tableau = prev.tableau;
    foundations = prev.foundations;
    hand = prev.hand;
    moveCount = Number.isFinite(prev.moveCount) ? prev.moveCount : moveCount;
    undoCount = Number.isFinite(prev.undoCount) ? prev.undoCount : undoCount;
    elapsedMs = Number.isFinite(prev.elapsedMs) ? prev.elapsedMs : elapsedMs;
    gameFinished = typeof prev.gameFinished === 'boolean' ? prev.gameFinished : false;
    runResultRecorded = typeof prev.runResultRecorded === 'boolean' ? prev.runResultRecorded : false;
    recentMoveContext = null;
    priorMoveContext = null;
    hintHistory = []; // Reset hint history on undo
    selected = null;
    undoCount++;
    lastTickTs = Date.now();
    persistGameState();
    updateRunStatsUI();
    fit(); render();
  }
}

function start(){
  if(hasActiveRunToRecordAsLoss()) recordGameResult('loss');
  closeModals();
  const config = getCurrentDealConfig();
  tableau=[[],[],[],[],[],[],[]]; foundations=[[],[],[],[]]; hand=Array(config.freeCells).fill(null); historyStack=[]; selected=null;
  recentMoveContext = null;
  priorMoveContext = null;
  resetRunStats();
  const deck=makeDeck(); shuffle(deck);
  for(let i=0;i<7;i++){
    const col = config.columns[i];
    for(let d=0;d<col.faceDown;d++){
      const c=deck.pop();
      c.faceUp=false;
      tableau[i].push(c);
    }
    for(let u=0;u<col.total-col.faceDown;u++){
      const c=deck.pop();
      c.faceUp=true;
      tableau[i].push(c);
    }
  }
  for(let k=0;k<hand.length;k++) hand[k]=deck.pop();
  persistGameState();
  startTimer();
  fit();
  render();
}

function canTableau(c,t){return c.suit===t.suit && c.value===t.value-1;}
function canFoundation(c,p){if(!p.length)return c.value===1;return c.suit===p[p.length-1].suit&&c.value===p[p.length-1].value+1;}

function executePileToPile(srcI, j, destI){
  // Prevent dropping onto the same tableau pile (would otherwise orphan the moved cards).
  if(srcI===destI) return false;

  const moving = tableau[srcI].slice(j);
  const destPile = tableau[destI];
  if(!moving.length) return false;
  if(!moving[0].faceUp) return false;

  if(!destPile.length){
    if(moving[0].rank!=="K") return false;
  } else {
    if(!canTableau(moving[0], destPile[destPile.length-1])) return false;
  }

  save();
  moveCount++;
  tableau[srcI] = tableau[srcI].slice(0, j);
  destPile.push(...moving);
  flipTop(srcI);
  recordRecentMove('pile_to_tableau', { pileIdx: srcI, cardIdx: j }, { pileIdx: destI, targetCardIdx: destPile.length - moving.length - 1 }, moving[0]);
  hintHistory = []; // Reset hint history on successful move
  persistGameState();
  return true;
}

function executeHandToPile(handIdx, destI){
  const c = hand[handIdx];
  const destPile = tableau[destI];
  if(!destPile.length){ if(c.rank!=="K") return false; }
  else { if(!canTableau(c, destPile[destPile.length-1])) return false; }
  save();
  moveCount++;
  hand[handIdx]=null;
  const targetCardIdx = destPile.length ? destPile.length - 1 : null;
  destPile.push(c);
  recordRecentMove('hand_to_tableau', { handIdx }, { pileIdx: destI, targetCardIdx }, c);
  hintHistory = []; // Reset hint history on successful move
  persistGameState();
  return true;
}

function tryFoundation(c, srcType, srcIdx, cardIdx){
  for(let f=0; f<4; f++){
    if(canFoundation(c, foundations[f])){
      save();
      moveCount++;
      foundations[f].push(c);
      if(srcType==="pile") { tableau[srcIdx].pop(); flipTop(srcIdx); }
      else if(srcType==="hand") { hand[srcIdx]=null; }
      recordRecentMove(srcType === 'pile' ? 'pile_to_foundation' : 'hand_to_foundation', srcType === 'pile' ? { pileIdx: srcIdx, cardIdx } : { handIdx: srcIdx }, { foundationIdx: f }, c);
      hintHistory = []; // Reset hint history on successful move
      persistGameState();
      return true;
    }
  }
  return false;
}

function executePileToHand(srcI, handIdx){
  if(hand[handIdx]) return false;
  const p = tableau[srcI];
  if(!p.length) return false;
  save();
  moveCount++;
  const movedCard = p.pop();
  hand[handIdx] = movedCard;
  flipTop(srcI);
  recordRecentMove('pile_to_hand', { pileIdx: srcI, cardIdx: p.length }, { handIdx }, movedCard);
  hintHistory = []; // Reset hint history on successful move
  persistGameState();
  return true;
}

function moveCardToAnyFoundation(type, idx, cardIdx){
  if(type === 'pile'){
    if(cardIdx !== tableau[idx].length - 1) return false;
    const c = tableau[idx][cardIdx];
    return tryFoundation(c, 'pile', idx, cardIdx);
  }
  if(type === 'hand'){
    const c = hand[idx];
    if(!c) return false;
    return tryFoundation(c, 'hand', idx);
  }
  return false;
}

function moveCardToAnyTableau(type, idx, cardIdx){
  let movingCard;
  if(type === 'pile'){
    const pile = tableau[idx];
    if(!pile[cardIdx] || !pile[cardIdx].faceUp) return false;
    movingCard = pile[cardIdx];
  } else if(type === 'hand'){
    movingCard = hand[idx];
    if(!movingCard) return false;
  } else {
    return false;
  }

  // Deterministic target selection policy:
  // 1) Prefer non-empty tableau piles where canTableau(movingCard, topCard) is valid.
  // 2) Only if none exist, allow moving a King to an empty tableau pile.
  // 3) In either case, choose the leftmost valid tableau index.
  let targetIdx = -1;
  for(let t=0; t<7; t++){
    if(type === 'pile' && t === idx) continue;
    const targetPile = tableau[t];
    if(targetPile.length && canTableau(movingCard, targetPile[targetPile.length-1])){
      targetIdx = t;
      break;
    }
  }

  if(targetIdx === -1 && movingCard.rank === 'K'){
    for(let t=0; t<7; t++){
      if(type === 'pile' && t === idx) continue;
      if(!tableau[t].length){
        targetIdx = t;
        break;
      }
    }
  }

  if(targetIdx === -1) return false;
  if(type === 'pile') return executePileToPile(idx, cardIdx, targetIdx);
  return executeHandToPile(idx, targetIdx);
}

function moveCardToAnyCell(type, idx, cardIdx){
  if(type !== 'pile') return false;
  if(cardIdx !== tableau[idx].length - 1) return false;
  for(let h=0; h<hand.length; h++){
    if(!hand[h]) return executePileToHand(idx, h);
  }
  return false;
}

function tryAutoMoveFromTap(type, idx, cardIdx){
  if(type === 'pile' && cardIdx !== tableau[idx].length - 1){
    return moveCardToAnyTableau(type, idx, cardIdx);
  }
  return (
    moveCardToAnyFoundation(type, idx, cardIdx) ||
    moveCardToAnyTableau(type, idx, cardIdx) ||
    moveCardToAnyCell(type, idx, cardIdx)
  );
}

function hasActiveRunToRecordAsLoss(){
  if(gameFinished) return false;
  if(moveCount > 0 || undoCount > 0 || elapsedMs > 0) return true;
  if(historyStack.length > 0) return true;
  return foundations.some(p => p.length > 0);
}

function flipTop(i){
  const p=tableau[i]; 
  if(p.length && !p[p.length-1].faceUp) p[p.length-1].faceUp=true;
}

function autoPlay(){
  clearHints();
  let moved = true; let loops = 0;
  while(moved && loops < 50){ 
    moved = false; loops++;
    for(let h=0; h<hand.length; h++){
      if(hand[h] && tryFoundation(hand[h], "hand", h)) { moved=true; break; }
    }
    if(moved) continue;
    for(let t=0; t<7; t++){
      const p = tableau[t];
      if(p.length){
        const c = p[p.length-1];
        if(tryFoundation(c, "pile", t, p.length-1)){ moved=true; break; }
      }
    }
  }
  if(loops>0) render();
  checkGameState();
}

function clearHints(){
  document.querySelectorAll('.hint-source, .hint-target').forEach(el => {
    el.classList.remove('hint-source'); el.classList.remove('hint-target');
  });
}

function cloneGameState(state){
  return {
    tableau: state.tableau.map(pile => pile.map(card => ({ ...card }))),
    hand: state.hand.map(card => (card ? { ...card } : null)),
    foundations: state.foundations.map(pile => pile.map(card => ({ ...card })))
  };
}

function encodeCardWithFace(card){
  if(!card) return '_';
  return `${card.rank}${card.suit}${card.faceUp ? 'U' : 'D'}`;
}

function buildCompactStateKey(state){
  const tableauKey = state.tableau
    .map(pile => pile.map(encodeCardWithFace).join(','))
    .join('|');
  const handKey = state.hand
    .map(encodeCardWithFace)
    .join(',');
  const foundationsKey = state.foundations
    .map(pile => pile.map(encodeCardWithFace).join(','))
    .join('|');
  return `${tableauKey}#${handKey}#${foundationsKey}`;
}

function countFoundationCards(state){
  return state.foundations.reduce((total, pile) => total + pile.length, 0);
}

function applyMoveToState(state, move){
  const nextState = cloneGameState(state);
  const beforeFoundationCount = countFoundationCards(nextState);
  let exposedFaceDown = false;

  if(move.type === 'hand_to_foundation'){
    const moved = nextState.hand[move.source.handIdx];
    if(!moved) return null;
    nextState.hand[move.source.handIdx] = null;
    nextState.foundations[move.target.foundationIdx].push(moved);
  } else if(move.type === 'pile_to_foundation'){
    const source = nextState.tableau[move.source.pileIdx];
    const moved = source.pop();
    if(!moved) return null;
    nextState.foundations[move.target.foundationIdx].push(moved);
    if(source.length && !source[source.length-1].faceUp){
      source[source.length-1].faceUp = true;
      exposedFaceDown = true;
    }
  } else if(move.type === 'hand_to_tableau'){
    const moved = nextState.hand[move.source.handIdx];
    if(!moved) return null;
    nextState.hand[move.source.handIdx] = null;
    nextState.tableau[move.target.pileIdx].push(moved);
  } else if(move.type === 'pile_to_tableau'){
    const source = nextState.tableau[move.source.pileIdx];
    const movedStack = source.splice(move.source.cardIdx);
    if(!movedStack.length) return null;
    nextState.tableau[move.target.pileIdx].push(...movedStack);
    if(source.length && !source[source.length-1].faceUp){
      source[source.length-1].faceUp = true;
      exposedFaceDown = true;
    }
  } else if(move.type === 'pile_to_hand'){
    const source = nextState.tableau[move.source.pileIdx];
    const moved = source.pop();
    if(!moved) return null;
    nextState.hand[move.target.handIdx] = moved;
    if(source.length && !source[source.length-1].faceUp){
      source[source.length-1].faceUp = true;
      exposedFaceDown = true;
    }
  } else {
    return null;
  }

  const foundationGain = countFoundationCards(nextState) > beforeFoundationCount;
  return {
    nextState,
    madeProgress: foundationGain || exposedFaceDown
  };
}

function classifyHintBranches({ includeAllCellMoves=false, depthLimit=4, nodeCap=280, state=null } = {}){
  const rootState = state || { tableau, hand, foundations };
  const rootMoves = enumerateMoves({ includeCellShuffles: true, includeAllCellMoves, state: rootState });
  const rootKey = buildCompactStateKey(rootState);
  const branches = [];
  let exploredNodes = 0;
  let hitNodeCap = false;

  for(const move of rootMoves){
    const initial = applyMoveToState(rootState, move);
    if(!initial) continue;

    const branchVisited = new Set([rootKey]);
    const nextKey = buildCompactStateKey(initial.nextState);
    branchVisited.add(nextKey);

    if(initial.madeProgress){
      branches.push({ move, kind: 'progress-creating' });
      continue;
    }

    const stack = [{ state: initial.nextState, depth: 1 }];
    let isProgressBranch = false;

    while(stack.length && exploredNodes < nodeCap && !isProgressBranch){
      const current = stack.pop();
      exploredNodes += 1;
      if(exploredNodes >= nodeCap) hitNodeCap = true;
      if(current.depth >= depthLimit) continue;

      const childMoves = enumerateMoves({ includeCellShuffles: true, includeAllCellMoves, state: current.state });
      for(const childMove of childMoves){
        if(exploredNodes >= nodeCap) break;
        const simulated = applyMoveToState(current.state, childMove);
        if(!simulated) continue;

        if(simulated.madeProgress){
          isProgressBranch = true;
          break;
        }

        const key = buildCompactStateKey(simulated.nextState);
        if(branchVisited.has(key)) continue;

        branchVisited.add(key);
        stack.push({ state: simulated.nextState, depth: current.depth + 1 });
      }
    }

    branches.push({ move, kind: isProgressBranch ? 'progress-creating' : 'loop-only' });
  }

  return {
    branches,
    progressBranches: branches.filter(branch => branch.kind === 'progress-creating'),
    hitNodeCap
  };
}

function showHint(){
  clearHints();
  const moveState = getMoveAvailabilityState();

  if(moveState.hasPracticalMoves){
    findAnyMove(true);
    return;
  }

  if(!moveState.hasLegalMoves){
    announceHint('No legal moves available.');
    alert('No legal moves available.');
    return;
  }

  announceHint('No practical moves found; try undo/new game.');
  alert('No practical moves found; try undo/new game.');
}

function canFinalizeLoss(){
  return historyStack.length === 0;
}

function restorePostLoadModalState(){
  if(!gameFinished) return;

  if(isWin()){
    document.getElementById('modalWin').classList.add('active');
  } else {
    document.getElementById('modalLose').classList.add('active');
  }
}

/* --- GAME STATE CHECKS --- */
function checkGameState(){
  if(isWin()){
    celebrate();
    recordGameResult('win');
    document.getElementById('modalWin').classList.add('active');
  } else {
    const moveState = getMoveAvailabilityState();

    if(!moveState.hasLegalMoves){
      if(canFinalizeLoss()) recordGameResult('loss');
      setLoseModalContent({
        title: 'Out of Moves',
        message: 'No legal moves remain.'
      });
      document.getElementById('modalLose').classList.add('active');
      return;
    }

    if(!moveState.hasPracticalMoves){
      announceHint('No practical moves remain. Try undo or start a new game.');
    }
  }
}

function getMoveAvailabilityState({ state=null } = {}){
  const gameState = state || { tableau, hand, foundations };
  const legalMoves = enumerateMoves({
    includeCellShuffles: true,
    includeAllCellMoves: true,
    state: gameState
  });

  const branchClassification = classifyHintBranches({
    includeAllCellMoves: false,
    state: gameState
  });
  const { progressBranches, hitNodeCap } = branchClassification;
  const practicalMoves = progressBranches.map(branch => branch.move);
  const fallbackPracticalMoves = !practicalMoves.length && hitNodeCap
    ? legalMoves.filter(move => !isImmediateReverse(move, recentMoveContext, gameState) && !isHintLoop(move, gameState))
    : [];
  const hasPracticalMoves = practicalMoves.length > 0 || fallbackPracticalMoves.length > 0;

  return {
    hasLegalMoves: legalMoves.length > 0,
    hasPracticalMoves,
    legalMoves,
    practicalMoves
  };
}

function setLoseModalContent({ title, message }){
  const titleEl = document.getElementById('modalLoseTitle');
  const messageEl = document.getElementById('modalLoseMessage');
  if(titleEl) titleEl.textContent = title;
  if(messageEl) messageEl.textContent = message;
}

function enumerateMoves({ includeCellShuffles=true, includeAllCellMoves=false, suppressImmediateReverse=null, state=null } = {}){
  const gameState = state || { tableau, hand, foundations };
  const moves = [];

  const pushMove = (type, source, target) => {
    if(
      suppressImmediateReverse &&
      type === 'hand_to_tableau' &&
      source.handIdx === suppressImmediateReverse.handIdx &&
      target.pileIdx === suppressImmediateReverse.pileIdx
    ) return;
    moves.push({ type, source, target });
  };

  // 1. Hand -> Foundation
  for(let i=0; i<gameState.hand.length; i++){
    if(gameState.hand[i]){
      for(let f=0; f<4; f++){
        if(canFoundation(gameState.hand[i], gameState.foundations[f])){
          pushMove('hand_to_foundation', { handIdx: i }, { foundationIdx: f });
        }
      }
    }
  }

  // 2. Pile Top -> Foundation
  for(let i=0; i<7; i++){
    if(gameState.tableau[i].length){
      const c = gameState.tableau[i][gameState.tableau[i].length-1];
      for(let f=0; f<4; f++){
        if(canFoundation(c, gameState.foundations[f])){
          pushMove('pile_to_foundation', { pileIdx: i, cardIdx: gameState.tableau[i].length-1 }, { foundationIdx: f });
        }
      }
    }
  }

  // 3. Hand -> Tableau
  for(let i=0; i<gameState.hand.length; i++){
    if(gameState.hand[i]){
      for(let t=0; t<7; t++){
        const tp = gameState.tableau[t];
        if(!tp.length){
          if(gameState.hand[i].rank==='K') pushMove('hand_to_tableau', { handIdx: i }, { pileIdx: t, targetCardIdx: null });
        }
        else if(canTableau(gameState.hand[i], tp[tp.length-1])){
          pushMove('hand_to_tableau', { handIdx: i }, { pileIdx: t, targetCardIdx: tp.length-1 });
        }
      }
    }
  }

  // 4. Pile -> Tableau (Deep moves allowed)
  const enumeratePileToTableauMoves = ({ includeRegular, includeKingToEmpty }) => {
    for(let i=0; i<7; i++){
      const p = gameState.tableau[i];
      for(let j=0; j<p.length; j++){
        if(!p[j].faceUp) continue;
        const c = p[j];
        for(let t=0; t<7; t++){
          if(i===t) continue;
          const tp = gameState.tableau[t];
          if(!tp.length){
            const movingKingToEmpty = c.rank === 'K' && j > 0 && includeKingToEmpty;
            if(movingKingToEmpty) pushMove('pile_to_tableau', { pileIdx: i, cardIdx: j }, { pileIdx: t, targetCardIdx: null });
          }
          else if(includeRegular && canTableau(c, tp[tp.length-1])){
            pushMove('pile_to_tableau', { pileIdx: i, cardIdx: j }, { pileIdx: t, targetCardIdx: tp.length-1 });
          }
        }
      }
    }
  };

  enumeratePileToTableauMoves({ includeRegular: true, includeKingToEmpty: false });
  enumeratePileToTableauMoves({ includeRegular: false, includeKingToEmpty: true });

  if(!includeCellShuffles) return moves;

  const isSuppressedImmediateReversePileToHand = (pileIdx, handIdx) => (
    suppressImmediateReverse &&
    Number.isInteger(suppressImmediateReverse.handIdx) &&
    Number.isInteger(suppressImmediateReverse.pileIdx) &&
    suppressImmediateReverse.handIdx === handIdx &&
    suppressImmediateReverse.pileIdx === pileIdx
  );

  const unlocksProgressMove = (pileIdx, handIdx) => {
    const simulatedState = {
      tableau: gameState.tableau.map(p => p.map(card => ({ ...card }))),
      hand: [...gameState.hand],
      foundations: gameState.foundations.map(p => p.map(card => ({ ...card })))
    };
    const fromPile = simulatedState.tableau[pileIdx];
    const movedCard = fromPile.pop();
    if(!movedCard) return false;
    simulatedState.hand[handIdx] = movedCard;
    const exposedCardWasFaceDown = !!(
      fromPile.length &&
      fromPile[fromPile.length - 1] &&
      !fromPile[fromPile.length - 1].faceUp
    );
    if(exposedCardWasFaceDown) fromPile[fromPile.length - 1].faceUp = true;

    const resultingMoves = enumerateMoves({
      includeCellShuffles: false,
      suppressImmediateReverse: { handIdx, pileIdx },
      state: simulatedState
    });

    return {
      hasNearTermProgress: resultingMoves.some(move =>
      move.type === 'hand_to_foundation' ||
      move.type === 'pile_to_foundation' ||
      move.type === 'hand_to_tableau' ||
      move.type === 'pile_to_tableau'
      ),
      revealsFaceDown: exposedCardWasFaceDown
    };
  };

  // 5. Pile Top -> Hand (tiered fallback)
  const tier1PileToHandMoves = [];
  const tier2PileToHandMoves = [];
  const tier3PileToHandMoves = [];

  for(let h=0; h<gameState.hand.length; h++){
    if(gameState.hand[h]) continue;
    for(let i=0; i<7; i++){
      if(!gameState.tableau[i].length) continue;

      if(isSuppressedImmediateReversePileToHand(i, h)) continue;

      if(includeAllCellMoves){
        pushMove('pile_to_hand', { pileIdx: i, cardIdx: gameState.tableau[i].length-1 }, { handIdx: h });
        continue;
      }

      const move = {
        type: 'pile_to_hand',
        source: { pileIdx: i, cardIdx: gameState.tableau[i].length-1 },
        target: { handIdx: h }
      };
      const { hasNearTermProgress, revealsFaceDown } = unlocksProgressMove(i, h);

      if(hasNearTermProgress){
        tier1PileToHandMoves.push(move);
      } else if(revealsFaceDown){
        tier2PileToHandMoves.push(move);
      } else {
        tier3PileToHandMoves.push({ ...move, lowPriority: true });
      }
    }
  }

  if(tier1PileToHandMoves.length){
    moves.push(...tier1PileToHandMoves);
  } else if(tier2PileToHandMoves.length){
    moves.push(...tier2PileToHandMoves);
  } else {
    moves.push(...tier3PileToHandMoves);
  }

  return moves;
}

function scoreMove(move, gameState){
  const state = gameState || { tableau, hand, foundations };
  const sourcePile = move.source && Number.isInteger(move.source.pileIdx)
    ? state.tableau[move.source.pileIdx]
    : null;

  const revealsFaceDown = !!(
    sourcePile &&
    Number.isInteger(move.source.cardIdx) &&
    move.source.cardIdx > 0 &&
    sourcePile[move.source.cardIdx - 1] &&
    !sourcePile[move.source.cardIdx - 1].faceUp
  );

  const createsTableauSequence = move.type === 'pile_to_tableau' &&
    sourcePile &&
    Number.isInteger(move.source.cardIdx) &&
    sourcePile.length - move.source.cardIdx > 1;

  const extendsTableauOnCard =
    (move.type === 'pile_to_tableau' || move.type === 'hand_to_tableau') &&
    Number.isInteger(move.target.targetCardIdx);

  const unlocksNearTermProgress = () => {
    if(move.type !== 'pile_to_hand' || !sourcePile || !Number.isInteger(move.target.handIdx)) return false;

    const simulatedState = {
      tableau: state.tableau.map(p => p.map(card => ({ ...card }))),
      hand: [...state.hand],
      foundations: state.foundations.map(p => p.map(card => ({ ...card })))
    };

    const fromPile = simulatedState.tableau[move.source.pileIdx];
    const movedCard = fromPile.pop();
    if(!movedCard) return false;
    simulatedState.hand[move.target.handIdx] = movedCard;
    if(fromPile.length && !fromPile[fromPile.length - 1].faceUp){
      fromPile[fromPile.length - 1].faceUp = true;
    }

    const resultingMoves = enumerateMoves({
      includeCellShuffles: false,
      suppressImmediateReverse: { handIdx: move.target.handIdx, pileIdx: move.source.pileIdx },
      state: simulatedState
    });

    return resultingMoves.some(nextMove =>
      nextMove.type === 'hand_to_foundation' ||
      nextMove.type === 'pile_to_foundation' ||
      nextMove.type === 'hand_to_tableau' ||
      nextMove.type === 'pile_to_tableau'
    );
  };

  let score = 0;

  if(move.type === 'hand_to_foundation' || move.type === 'pile_to_foundation') score += 100;
  if(move.type === 'pile_to_tableau' || move.type === 'hand_to_tableau') score += 35;
  if(revealsFaceDown) score += 45;
  if(createsTableauSequence) score += 15;
  if(extendsTableauOnCard) score += 10;

  if(move.type === 'pile_to_hand'){
    const hasNearTermProgress = unlocksNearTermProgress();
    score += 3;
    if(revealsFaceDown) score += 35;
    if(hasNearTermProgress) score += 25;
    if(move.lowPriority) score -= 20;
    if(!revealsFaceDown && !hasNearTermProgress) score -= 15;
  }

  return score;
}


function announceHint(message){
  const announcer = document.getElementById('hintAnnouncement');
  if(!announcer) return;
  announcer.textContent = '';
  setTimeout(() => { announcer.textContent = message; }, 20);
}

function describeCard(card){
  if(!card) return 'card';
  const suitMap = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
  const rankMap = { A: 'ace', J: 'jack', Q: 'queen', K: 'king' };
  const rank = rankMap[card.rank] || card.rank;
  const suit = suitMap[card.suit] || card.suit;
  return `${rank} of ${suit}`;
}

function announceMoveHint(move){
  if(move.type === 'hand_to_foundation' || move.type === 'hand_to_tableau'){
    const card = hand[move.source.handIdx];
    announceHint(`Hint: move ${describeCard(card)} from free cell ${move.source.handIdx + 1}.`);
    return;
  }

  if(move.type === 'pile_to_foundation' || move.type === 'pile_to_tableau' || move.type === 'pile_to_hand'){
    const pile = tableau[move.source.pileIdx];
    const card = pile && pile[move.source.cardIdx];
    announceHint(`Hint: move ${describeCard(card)} from tableau column ${move.source.pileIdx + 1}.`);
    return;
  }

  announceHint('Hint available: move the highlighted card.');
}

function getMoveCardKey(move, gameState = { tableau, hand }){
  if(!move) return null;
  if(move.type === 'hand_to_foundation' || move.type === 'hand_to_tableau'){
    return cardKey(gameState.hand[move.source.handIdx]);
  }
  if(move.type === 'pile_to_foundation' || move.type === 'pile_to_tableau' || move.type === 'pile_to_hand'){
    const pile = gameState.tableau[move.source.pileIdx] || [];
    return cardKey(pile[move.source.cardIdx]);
  }
  return null;
}

function isImmediateReverse(candidate, lastMove, gameState = { tableau, hand }){
  if(!candidate || !lastMove) return false;

  const candidateCard = getMoveCardKey(candidate, gameState);
  const lastCard = lastMove.cardKey || null;

  if(lastMove.type === 'pile_to_hand' && candidate.type === 'hand_to_tableau'){
    return (
      candidate.source.handIdx === lastMove.target?.handIdx &&
      candidate.target.pileIdx === lastMove.source?.pileIdx &&
      (!lastCard || candidateCard === lastCard)
    );
  }

  if(lastMove.type === 'hand_to_tableau' && candidate.type === 'pile_to_hand'){
    return (
      candidate.source.pileIdx === lastMove.target?.pileIdx &&
      candidate.target.handIdx === lastMove.source?.handIdx &&
      (!lastCard || candidateCard === lastCard)
    );
  }

  return false;
}

function scoreHintMove(move, {
  recentMove = recentMoveContext,
  priorMove = priorMoveContext,
  gameState = { tableau, hand }
} = {}){
  const priority = {
    hand_to_foundation: 0,
    pile_to_foundation: 1,
    pile_to_tableau: 2,
    hand_to_tableau: 3,
    pile_to_hand: 4
  };

  let score = priority[move.type] ?? 10;
  if(isImmediateReverse(move, recentMove, gameState)) score += 1000;
  else if(isImmediateReverse(move, priorMove, gameState)) score += 100;
  return score;
}

function scoreEmptyTableauKingHeuristic(move, gameState = { tableau, hand, foundations }){
  const isKingToEmptyTableau =
    (move.type === 'hand_to_tableau' || move.type === 'pile_to_tableau') &&
    move.target &&
    move.target.targetCardIdx === null;

  if(!isKingToEmptyTableau) return 0;

  if(move.type !== 'pile_to_tableau') return 0;

  const sourcePile = gameState.tableau[move.source.pileIdx] || [];
  if(!sourcePile.length || !Number.isInteger(move.source.cardIdx)) return 0;

  const movingLength = sourcePile.length - move.source.cardIdx;
  const exposedCard = move.source.cardIdx > 0 ? sourcePile[move.source.cardIdx - 1] : null;
  const revealsFaceDown = !!(exposedCard && !exposedCard.faceUp);

  const simulatedTableau = gameState.tableau.map(pile => pile.map(card => ({ ...card })));
  const sourceAfterMove = simulatedTableau[move.source.pileIdx];
  sourceAfterMove.splice(move.source.cardIdx);
  if(sourceAfterMove.length && !sourceAfterMove[sourceAfterMove.length - 1].faceUp){
    sourceAfterMove[sourceAfterMove.length - 1].faceUp = true;
  }

  const newTopCard = sourceAfterMove[sourceAfterMove.length - 1] || null;
  const canMoveToFoundation = !!(
    newTopCard &&
    newTopCard.faceUp &&
    gameState.foundations.some(pile => canFoundation(newTopCard, pile))
  );

  const canMoveToTableau = !!(
    newTopCard &&
    newTopCard.faceUp &&
    simulatedTableau.some((pile, pileIdx) => {
      if(pileIdx === move.source.pileIdx || !pile.length) return false;
      return canTableau(newTopCard, pile[pile.length - 1]);
    })
  );

  let heuristicScore = 0;
  if(revealsFaceDown) heuristicScore += 100;
  heuristicScore += Math.max(0, 20 - movingLength * 3);
  if(canMoveToFoundation) heuristicScore += 60;
  if(canMoveToTableau) heuristicScore += 40;

  return heuristicScore;
}

function getVisitedKeys() {
  if (cachedVisitedKeys && cachedVisitedKeysState.moveCount === moveCount && cachedVisitedKeysState.undoCount === undoCount) {
    return cachedVisitedKeys;
  }
  cachedVisitedKeys = new Set();
  for (const snapshotStr of historyStack) {
    try {
      cachedVisitedKeys.add(buildCompactStateKey(JSON.parse(snapshotStr)));
    } catch(e) {}
  }
  cachedVisitedKeys.add(buildCompactStateKey({tableau, hand, foundations}));
  cachedVisitedKeysState = { moveCount, undoCount };
  return cachedVisitedKeys;
}

function isHintLoop(candidate, gameState = { tableau, hand, foundations }) {
  if (!candidate) return false;
  // Simulate the state after the candidate move
  const simulatedState = applyMoveToState(gameState, candidate);
  if (!simulatedState) return false;

  const simulatedStateKey = buildCompactStateKey(simulatedState.nextState);

  // 1. Check if the resulting state matches any previously visited state in the game
  const visitedKeys = getVisitedKeys();
  if (visitedKeys.has(simulatedStateKey)) return true;

  // 2. Check if this resulting state has been suggested before in this hint cycle
  return hintHistory.includes(simulatedStateKey);
}

function selectHintMove(moves, {
  gameState = { tableau, hand, foundations },
  recentMove = recentMoveContext,
  priorMove = priorMoveContext
} = {}){
  if(!moves.length) return null;

  // Filter out moves that reverse the immediate last move, AND moves that lead to a previously suggested state
  const nonLoopMoves = moves.filter(move =>
    !isImmediateReverse(move, recentMove, gameState) &&
    !isHintLoop(move, gameState)
  );

  const candidates = nonLoopMoves.length ? nonLoopMoves : moves.filter(move => !isImmediateReverse(move, recentMove, gameState));
  const finalCandidates = candidates.length ? candidates : moves;

  return finalCandidates
    .map((move, index) => ({
      move,
      score: scoreHintMove(move, { recentMove, priorMove, gameState }),
      strategicScore: scoreMove(move, gameState),
      heuristic: scoreEmptyTableauKingHeuristic(move, gameState),
      index
    }))
    .sort((a, b) =>
      a.score - b.score ||
      b.strategicScore - a.strategicScore ||
      b.heuristic - a.heuristic ||
      a.index - b.index
    )[0].move;
}

function runHintRegressionScenario(){
  const scenarioState = {
    tableau: [
      [{ suit: '♥', rank: '5', value: 5, faceUp: true }],
      [{ suit: '♥', rank: '5', value: 5, faceUp: true }],
      [{ suit: '♥', rank: '6', value: 6, faceUp: true }],
      [], [], [], []
    ],
    hand: [{ suit: '♥', rank: '4', value: 4, faceUp: true }],
    foundations: [[], [], [], []]
  };

  const scenarioLastMove = {
    type: 'pile_to_hand',
    source: { pileIdx: 0, cardIdx: 0 },
    target: { handIdx: 0 },
    cardKey: '4♥'
  };

  const moves = enumerateMoves({ includeCellShuffles: true, state: scenarioState });

  const prevRecentMoveContext = recentMoveContext;
  const prevPriorMoveContext = priorMoveContext;
  recentMoveContext = scenarioLastMove;
  priorMoveContext = null;
  const chosen = selectHintMove(moves);
  recentMoveContext = prevRecentMoveContext;
  priorMoveContext = prevPriorMoveContext;

  const endlesslyAlternates = chosen && chosen.type === 'hand_to_tableau' && chosen.target.pileIdx === 0;
  console.assert(!endlesslyAlternates, 'Hint should avoid immediate reverse when alternatives exist.');

  const twoCardTwoCellCycleState = {
    tableau: [
      [{ suit: '♣', rank: '6', value: 6, faceUp: true }],
      [{ suit: '♦', rank: '7', value: 7, faceUp: true }],
      [], [], [], [], []
    ],
    hand: [
      { suit: '♥', rank: '5', value: 5, faceUp: true },
      { suit: '♣', rank: '6', value: 6, faceUp: true }
    ],
    foundations: [
      [
        { suit: '♥', rank: 'A', value: 1, faceUp: true },
        { suit: '♥', rank: '2', value: 2, faceUp: true },
        { suit: '♥', rank: '3', value: 3, faceUp: true },
        { suit: '♥', rank: '4', value: 4, faceUp: true }
      ],
      [], [], []
    ]
  };

  const twoCardTwoCellCycleLastMove = {
    type: 'pile_to_hand',
    source: { pileIdx: 0, cardIdx: 0 },
    target: { handIdx: 1 },
    cardKey: '6♣'
  };

  const twoCardTwoCellCycleMoves = enumerateMoves({ includeCellShuffles: true, state: twoCardTwoCellCycleState });
  const twoCardTwoCellProgressExists = twoCardTwoCellCycleMoves.some(move =>
    move.type === 'hand_to_foundation' &&
    move.source.handIdx === 0
  );
  const twoCardTwoCellChoice = selectHintMove(twoCardTwoCellCycleMoves, {
    gameState: twoCardTwoCellCycleState,
    recentMove: twoCardTwoCellCycleLastMove,
    priorMove: null
  });
  const choosesTwoCardTwoCellLoopOnlyMove = !!(
    twoCardTwoCellChoice &&
    twoCardTwoCellChoice.type === 'hand_to_tableau' &&
    twoCardTwoCellChoice.source.handIdx === 1 &&
    twoCardTwoCellChoice.target.pileIdx === 0
  );

  console.assert(twoCardTwoCellProgressExists, 'Two-card/two-cell cycle scenario should include a progress-creating branch.');
  console.assert(!choosesTwoCardTwoCellLoopOnlyMove, 'Hint should avoid loop-only cycle moves when progress-creating branches exist.');

  const singleCardUnlockState = {
    tableau: [
      [{ suit: '♠', rank: 'K', value: 13, faceUp: true }],
      [{ suit: '♦', rank: 'Q', value: 12, faceUp: true }],
      [{ suit: '♥', rank: '7', value: 7, faceUp: true }],
      [], [], [], []
    ],
    hand: [null],
    foundations: [[], [], [], []]
  };

  const singleCardUnlockMoves = enumerateMoves({ includeCellShuffles: true, state: singleCardUnlockState });
  const singleCardUnlockChoice = selectHintMove(singleCardUnlockMoves);
  const hasUnlockingCellMove = singleCardUnlockMoves.some(move =>
    move.type === 'pile_to_hand' &&
    move.source.pileIdx === 0 &&
    move.target.handIdx === 0
  );

  const hasFollowupProgressMove = (() => {
    const simulatedState = {
      tableau: singleCardUnlockState.tableau.map(p => p.map(card => ({ ...card }))),
      hand: [...singleCardUnlockState.hand],
      foundations: singleCardUnlockState.foundations.map(p => p.map(card => ({ ...card })))
    };

    const movedCard = simulatedState.tableau[0].pop();
    if(!movedCard) return false;
    simulatedState.hand[0] = movedCard;

    return enumerateMoves({
      includeCellShuffles: false,
      suppressImmediateReverse: { handIdx: 0, pileIdx: 0 },
      state: simulatedState
    }).some(move => move.type === 'hand_to_tableau' && move.source.handIdx === 0 && move.target.targetCardIdx === null);
  })();

  const previousTableau = tableau;
  const previousHand = hand;
  const previousFoundations = foundations;
  const previousHighlightHand = highlightHand;
  const previousHighlightPileCard = highlightPileCard;
  const previousAnnounceMoveHint = announceMoveHint;

  let hasFindAnyMoveHint = false;
  try {
    tableau = singleCardUnlockState.tableau.map(pile => pile.map(card => ({ ...card })));
    hand = [...singleCardUnlockState.hand];
    foundations = singleCardUnlockState.foundations.map(pile => pile.map(card => ({ ...card })));
    highlightHand = () => {};
    highlightPileCard = () => {};
    announceMoveHint = () => {};

    hasFindAnyMoveHint = findAnyMove(true);
  } finally {
    tableau = previousTableau;
    hand = previousHand;
    foundations = previousFoundations;
    highlightHand = previousHighlightHand;
    highlightPileCard = previousHighlightPileCard;
    announceMoveHint = previousAnnounceMoveHint;
  }

  const hasHintCandidate = !!singleCardUnlockChoice;

  console.assert(hasUnlockingCellMove, 'Single-card pile should be considered for free-cell unlock moves.');
  console.assert(hasFollowupProgressMove, 'Free-cell unlock should expose a follow-up king-to-empty-tableau move.');
  console.assert(hasFindAnyMoveHint, 'findAnyMove(true) should return a hint for the unlock chain scenario.');
  console.assert(hasHintCandidate, 'Hint selection should not report "No suggestions found" for the unlock chain scenario.');

  const twoKingDecisionState = {
    tableau: [
      [
        { suit: '♣', rank: '5', value: 5, faceUp: false },
        { suit: '♣', rank: 'K', value: 13, faceUp: true }
      ],
      [
        { suit: '♥', rank: '7', value: 7, faceUp: true },
        { suit: '♦', rank: 'K', value: 13, faceUp: true }
      ],
      [
        { suit: '♥', rank: '8', value: 8, faceUp: true }
      ],
      [], [], [], []
    ],
    hand: [null],
    foundations: [[], [], [], []]
  };

  const twoKingDecisionMoves = enumerateMoves({ includeCellShuffles: true, state: twoKingDecisionState });
  const twoKingDecisionChoice = (() => {
    const prevTableau = tableau;
    const prevHand = hand;
    const prevFoundations = foundations;
    try {
      tableau = twoKingDecisionState.tableau.map(pile => pile.map(card => ({ ...card })));
      hand = [...twoKingDecisionState.hand];
      foundations = twoKingDecisionState.foundations.map(pile => pile.map(card => ({ ...card })));
      return selectHintMove(twoKingDecisionMoves);
    } finally {
      tableau = prevTableau;
      hand = prevHand;
      foundations = prevFoundations;
    }
  })();

  const choosesUnlockingKing = !!(
    twoKingDecisionChoice &&
    twoKingDecisionChoice.type === 'pile_to_tableau' &&
    twoKingDecisionChoice.source.pileIdx === 0 &&
    twoKingDecisionChoice.target.targetCardIdx === null
  );

  console.assert(choosesUnlockingKing, 'When two kings can move to an empty tableau, hint should choose the one that unlocks follow-up play.');

  const noPracticalMovesState = {
    tableau: [
      [{ suit: '♠', rank: 'Q', value: 12, faceUp: true }],
      [{ suit: '♥', rank: 'K', value: 13, faceUp: true }],
      [], [], [], [], []
    ],
    hand: [null],
    foundations: [[], [], [], []]
  };

  const noPracticalRecentMove = {
    type: 'pile_to_tableau',
    source: { pileIdx: 0, cardIdx: 0 },
    target: { pileIdx: 1, targetCardIdx: 0 },
    cardKey: 'Q♠'
  };

  const previousNoPracticalRecentMoveContext = recentMoveContext;
  const previousNoPracticalPriorMoveContext = priorMoveContext;
  recentMoveContext = noPracticalRecentMove;
  priorMoveContext = null;
  const noPracticalMoveState = getMoveAvailabilityState({ state: noPracticalMovesState });
  recentMoveContext = previousNoPracticalRecentMoveContext;
  priorMoveContext = previousNoPracticalPriorMoveContext;

  console.assert(noPracticalMoveState.hasLegalMoves, 'Reverse-only scenario should still report legal moves.');
  console.assert(!noPracticalMoveState.hasPracticalMoves, 'Reverse-only scenario should report no practical moves.');

  const cellShuffleCycleState = {
    tableau: [
      [{ suit: '♥', rank: 'Q', value: 12, faceUp: true }],
      [{ suit: '♣', rank: 'J', value: 11, faceUp: true }],
      [], [], [], [], []
    ],
    hand: [null],
    foundations: [[], [], [], []]
  };

  const cellShuffleCycleRecentMove = {
    type: 'pile_to_hand',
    source: { pileIdx: 1, cardIdx: 0 },
    target: { handIdx: 0 },
    cardKey: 'J♣'
  };

  const previousCellShuffleRecentMoveContext = recentMoveContext;
  const previousCellShufflePriorMoveContext = priorMoveContext;
  recentMoveContext = cellShuffleCycleRecentMove;
  priorMoveContext = null;
  const cellShuffleMoveState = getMoveAvailabilityState({ state: cellShuffleCycleState });
  recentMoveContext = previousCellShuffleRecentMoveContext;
  priorMoveContext = previousCellShufflePriorMoveContext;

  console.assert(cellShuffleMoveState.hasLegalMoves, 'Cell shuffle cycle should still report legal moves.');
  console.assert(!cellShuffleMoveState.hasPracticalMoves, 'Cell shuffle cycle should report no practical progress moves.');
}


function findAnyMove(highlight, { includeAllCellMoves=false } = {}){
  const gameState = { tableau, hand, foundations };
  const moves = enumerateMoves({ includeCellShuffles: true, includeAllCellMoves });
  const branchClassification = classifyHintBranches({ includeAllCellMoves, state: gameState });
  let candidateMoves = branchClassification.progressBranches.map(branch => branch.move);

  if(!candidateMoves.length && branchClassification.hitNodeCap){
    const nonLoopMoves = moves.filter(move => !isImmediateReverse(move, recentMoveContext, gameState));
    candidateMoves = nonLoopMoves.length ? nonLoopMoves : [];
  }

  const move = selectHintMove(candidateMoves, { gameState, recentMove: recentMoveContext, priorMove: priorMoveContext });
  if(!move) return false;
  if(!highlight) return true;

  // Record the state resulting from this hint to avoid loops
  const simulatedState = applyMoveToState(gameState, move);
  if (simulatedState) {
    const stateKey = buildCompactStateKey(simulatedState.nextState);
    hintHistory.push(stateKey);
    // Keep the history manageable
    if (hintHistory.length > 10) hintHistory.shift();
  }

  if(move.type === 'hand_to_foundation'){
    highlightHand(move.source.handIdx, 'source');
    highlightFoundation(move.target.foundationIdx, 'target');
    announceMoveHint(move);
    return true;
  }

  if(move.type === 'hand_to_tableau'){
    highlightHand(move.source.handIdx, 'source');
    highlightPile(move.target.pileIdx, 'target');
    announceMoveHint(move);
    return true;
  }

  if(move.type === 'pile_to_foundation'){
    highlightPileCard(move.source.pileIdx, move.source.cardIdx, 'source');
    highlightFoundation(move.target.foundationIdx, 'target');
    announceMoveHint(move);
    return true;
  }

  if(move.type === 'pile_to_tableau'){
    highlightPileCard(move.source.pileIdx, move.source.cardIdx, 'source');
    highlightPile(move.target.pileIdx, 'target');
    announceMoveHint(move);
    return true;
  }

  if(move.type === 'pile_to_hand'){
    highlightPileCard(move.source.pileIdx, move.source.cardIdx, 'source');
    highlightHand(move.target.handIdx, 'target');
    announceMoveHint(move);
    return true;
  }

  announceMoveHint(move);
  return true;
}

function isWin(){
  return foundations.reduce((a,b)=>a+b.length,0)===52;
}

function celebrate(){
  // Confetti logic
  for(let i=0; i<50; i++){
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random()*100 + 'vw';
    c.style.animationDuration = (Math.random()*2 + 2) + 's';
    c.style.background = `hsl(${Math.random()*360}, 100%, 50%)`;
    document.body.appendChild(c);
    setTimeout(()=>c.remove(), 4000);
  }
}

function closeModals(){
  document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
}

/* --- HIGHLIGHTERS --- */
function highlightHand(idx, type){ 
  const el = document.querySelector(`.hand-slot[data-id="${idx}"] .card`); if(el) el.classList.add('hint-'+type); 
  else if(type==='target') {
    const slotEl = document.querySelector(`.hand-slot[data-id="${idx}"]`);
    if(slotEl) slotEl.classList.add('hint-'+type);
  }
}
function highlightFoundation(idx, type){ 
  const el = document.querySelector(`.foundation[data-id="${idx}"]`); if(el) el.classList.add('hint-'+type); 
}
function highlightPile(idx, type){ 
  const el = document.querySelector(`.pile[data-id="${idx}"]`); if(el) el.classList.add('hint-'+type); 
}
function highlightPileCard(pileIdx, cardIdx, type){ 
  const pile = document.querySelector(`.pile[data-id="${pileIdx}"]`);
  if(!pile) return;
  const cards = pile.querySelectorAll('.card');
  if(cards[cardIdx]) cards[cardIdx].classList.add('hint-'+type);
}

/* --- INTERACTION --- */
let dragSource = null;
let lastTouchEndTs = 0;
const TOUCH_CLICK_GUARD_MS = 400;
let touchClone = document.getElementById('drag-ghost');
let touchStartCoords = {x:0, y:0};
let isDragGesture = false;
let touchOriginalEl = null;

function handleDragStart(e, type, idx, cardIdx){
  clearHints();
  if(type === 'pile' && !tableau[idx][cardIdx].faceUp) { e.preventDefault(); return; }
  dragSource = { type, idx, cardIdx };
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", JSON.stringify(dragSource));
  setTimeout(()=>e.target.classList.add('dragging'), 0);
}
function handleDragEnd(e){
  e.target.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));
  dragSource = null;
}
function handleDragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect = "move"; }
function handleDragEnter(e){ e.currentTarget.classList.add('drag-over'); }
function handleDragLeave(e){ e.currentTarget.classList.remove('drag-over'); }
function handleDrop(e, targetType, targetIdx){
  e.preventDefault();
  document.querySelectorAll('.drag-over').forEach(el=>el.classList.remove('drag-over'));
  if(!dragSource) return;
  commitMove(targetType, targetIdx);
}

function handleTouchStart(e, type, idx, cardIdx){
  clearHints();
  if(type === 'pile' && !tableau[idx][cardIdx].faceUp) return;
  e.preventDefault();
  const touch = e.touches[0];
  touchStartCoords = {x: touch.clientX, y: touch.clientY};
  isDragGesture = false;
  dragSource = { type, idx, cardIdx };
  touchOriginalEl = e.target.closest('.card');
}
function handleTouchMove(e){
  if(!dragSource) return;
  const touch = e.touches[0];
  const dist = Math.sqrt(Math.pow(touch.clientX - touchStartCoords.x, 2) + Math.pow(touch.clientY - touchStartCoords.y, 2));
  if(dist > 10 && !isDragGesture){
    isDragGesture = true;
    const original = touchOriginalEl || e.target.closest('.card');
    if(original){
        const rect = original.getBoundingClientRect();
        touchClone.replaceChildren(original.cloneNode(true));
        touchClone.className = "card";
        touchClone.style.width = rect.width + "px";
        touchClone.style.height = rect.height + "px";
        touchClone.style.color = original.style.color;
        touchClone.style.background = original.style.background;
        touchClone.style.display = "block";
        original.classList.add('dragging');
    }
  }
  if(isDragGesture){
     e.preventDefault();
     touchClone.style.left = (touch.clientX - 20) + "px";
     touchClone.style.top = (touch.clientY - 20) + "px";
  }
}
function handleTouchEnd(e){
  if(!dragSource) return;
  if(isDragGesture){
    e.preventDefault();
    const original = touchOriginalEl;
    if(original) original.classList.remove('dragging');
    touchClone.style.display = 'none';
    const touch = e.changedTouches[0];
    const elBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    let target = elBelow ? elBelow.closest('.pile, .foundation, .hand-slot') : null;
    if(target){
      let tType = target.classList.contains('pile') ? 'pile' : (target.classList.contains('foundation') ? 'foundation' : 'hand');
      let tIdx = parseInt(target.dataset.id);
      commitMove(tType, tIdx);
    } else render();
    lastTouchEndTs = Date.now();
  } else {
    e.preventDefault();
    if(tryAutoMoveFromTap(dragSource.type, dragSource.idx, dragSource.cardIdx)){
      selected = null;
      render();
      checkGameState();
    } else {
      cardClick(dragSource.type, dragSource.idx, dragSource.cardIdx);
    }
    lastTouchEndTs = Date.now();
  }
  dragSource = null;
  isDragGesture = false;
  touchOriginalEl = null;
}

function commitMove(targetType, targetIdx){
  let success = false;
  if(targetType === 'pile'){
    if(dragSource.type === 'pile') success = executePileToPile(dragSource.idx, dragSource.cardIdx, targetIdx);
    else if(dragSource.type === 'hand') success = executeHandToPile(dragSource.idx, targetIdx);
  } else if(targetType === 'hand'){
    if(dragSource.type === 'pile' && dragSource.cardIdx === tableau[dragSource.idx].length-1)
      success = executePileToHand(dragSource.idx, targetIdx);
  } else if(targetType === 'foundation'){
     let c;
     if(dragSource.type==='pile'){
       if(dragSource.cardIdx !== tableau[dragSource.idx].length-1) return;
       c = tableau[dragSource.idx][dragSource.cardIdx];
     } else c = hand[dragSource.idx];
     if(canFoundation(c, foundations[targetIdx])){
        save(); moveCount++; foundations[targetIdx].push(c);
        if(dragSource.type==='pile'){ tableau[dragSource.idx].pop(); flipTop(dragSource.idx); }
        else hand[dragSource.idx]=null;
        persistGameState();
        success = true;
     }
  }
  if(success) { render(); checkGameState(); } else render();
}

function cardClick(type, idx, cardIdx){
  clearHints();
  if(selected){
    let success=false;
    if(type==='foundation'){
       let c;
       if(selected.type==='pile'){
         if(selected.cardIdx !== tableau[selected.idx].length-1) { selected=null; render(); return; }
         c = tableau[selected.idx][selected.cardIdx];
       } else {
         c = hand[selected.idx];
       }
       if(canFoundation(c, foundations[idx])){
         save(); moveCount++; foundations[idx].push(c);
         if(selected.type==='pile'){ tableau[selected.idx].pop(); flipTop(selected.idx); }
         else hand[selected.idx]=null;
         persistGameState();
         success=true;
       }
    } 
    else if(type==='pile') {
       if(selected.type==='pile') success=executePileToPile(selected.idx, selected.cardIdx, idx);
       else success=executeHandToPile(selected.idx, idx);
    } else if(type==='hand'){
       if(selected.type==='pile' && selected.cardIdx === tableau[selected.idx].length-1) 
         success=executePileToHand(selected.idx, idx);
    }
    
    if(success) { selected=null; render(); checkGameState(); return; }
    else {
        if(type==='pile' && !tableau[idx][cardIdx].faceUp){ selected=null; render(); return; }
    }
  }
  
  if(type==='pile'){
    if(!tableau[idx][cardIdx].faceUp) return;
    if(selected && selected.type==='pile' && selected.idx===idx && selected.cardIdx===cardIdx) selected=null;
    else selected = {type:'pile', idx, cardIdx};
  } else if (type==='hand'){
    if(!hand[idx]) return;
    if(selected && selected.type==='hand' && selected.idx===idx) selected=null;
    else selected = {type:'hand', idx};
  }
  render();
}

function createCardEl(c, type, idx, cardIdx){
  const el = document.createElement("div");
  el.className = "card";
  if(!c.faceUp){ el.classList.add("back"); return el; }
  el.classList.add("face");
  const sc = suitClass[c.suit];
  if(sc) el.classList.add(`suit-${sc}`);
  el.dataset.suitglyph = c.suit;
  el.style.color = suitColors[c.suit];
  if(selected && selected.type===type && selected.idx===idx){
    if(type==='hand' || (type==='pile' && cardIdx >= selected.cardIdx)) el.classList.add('selected');
  }
  el.draggable = true;
  el.ondragstart = (e) => handleDragStart(e, type, idx, cardIdx);
  el.ondragend = handleDragEnd;
  el.ontouchstart = (e) => handleTouchStart(e, type, idx, cardIdx);
  el.ontouchmove = handleTouchMove;
  el.ontouchend = handleTouchEnd;
  el.onclick = (e) => {
    if(Date.now() - lastTouchEndTs < TOUCH_CLICK_GUARD_MS) return;
    e.stopPropagation();
    if(Date.now() - lastTouchEndTs < TOUCH_CLICK_GUARD_MS){
      e.preventDefault();
      return;
    }
    if(tryAutoMoveFromTap(type, idx, cardIdx)){
      selected = null;
      render();
      checkGameState();
      return;
    }
    cardClick(type, idx, cardIdx);
  };
  el.innerHTML = `<div class="val-tl">${c.rank}</div><div class="suit-tr">${c.suit}</div><div class="val-center">${c.rank}</div>`;
  return el;
}

function render(){
  updateRunStatsUI();
  const computedStyle = getComputedStyle(document.documentElement);
  let gapStr = computedStyle.getPropertyValue('--stack-gap').trim();
  let gap = parseInt(gapStr); if(isNaN(gap)) gap = 24;

  document.querySelectorAll('.hand-slot').forEach(slot => {
    slot.innerHTML = "";
    const i = parseInt(slot.dataset.id);
    const isActiveSlot = i < hand.length;
    slot.style.display = isActiveSlot ? '' : 'none';
    if(!isActiveSlot) return;
    slot.ondragover = handleDragOver; slot.ondragenter = handleDragEnter;
    slot.ondragleave = handleDragLeave; slot.ondrop = (e) => handleDrop(e, 'hand', i);
    slot.onclick = (e) => {
      if(shouldIgnoreClickAfterTouch()){ e.preventDefault(); return; }
      cardClick('hand', i);
    };
    if(hand[i]) slot.appendChild(createCardEl(hand[i], 'hand', i));
  });
  document.querySelectorAll('.foundation').forEach(found => {
    found.innerHTML = "";
    const i = parseInt(found.dataset.id);
    found.ondragover = handleDragOver; found.ondragenter = handleDragEnter;
    found.ondragleave = handleDragLeave; found.ondrop = (e) => handleDrop(e, 'foundation', i);
    found.onclick = (e) => {
      if(shouldIgnoreClickAfterTouch()){ e.preventDefault(); return; }
      cardClick('foundation', i);
    };
    const p = foundations[i];
    if(p.length){
      const el = createCardEl(p[p.length-1], 'foundation', i, p.length-1);
      el.draggable = false; el.onclick = null; el.ontouchstart=null;
      found.appendChild(el);
    }
  });
  document.querySelectorAll('.pile').forEach(pile => {
    pile.innerHTML = "";
    const i = parseInt(pile.dataset.id);
    pile.ondragover = handleDragOver; pile.ondragenter = handleDragEnter;
    pile.ondragleave = handleDragLeave; pile.ondrop = (e) => handleDrop(e, 'pile', i);
    pile.onclick = (e) => { if(shouldIgnoreClickAfterTouch()){ e.preventDefault(); return; } if(selected) { 
        if(selected.type==='pile') executePileToPile(selected.idx, selected.cardIdx, i);
        else executeHandToPile(selected.idx, i);
        selected=null; render();
    }};
    const stack = tableau[i];
    let ch = parseInt(computedStyle.getPropertyValue('--card-h').trim()) || 116;
    pile.style.height = (ch + (stack.length-1)*gap) + "px";
    stack.forEach((c, j) => {
      const el = createCardEl(c, 'pile', i, j);
      el.style.top = (j * gap) + "px";
      pile.appendChild(el);
    });
  });
}

function fit(){
  const app = document.querySelector('.app'); if(!app) return;

  // Available space (account for header + safe areas already in CSS heights)
  const availW = app.clientWidth;
  // Track actual header height (it can wrap on mobile) so the play area never hides behind it.
  const headerEl = document.querySelector('header');
  if(headerEl){
    const hh = Math.ceil(headerEl.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--header-h', hh + "px");
  }

  // "Design" dimensions (desktop-ish baseline), then scale down as needed.
  const baseW = 84;            // card width
  const baseH = baseW * 1.45;  // card height ratio
  const baseGap = 24;          // stack gap
  const baseColGap = 8;        // column gap
  const topRowGap = 4;         // .foundations-row/.hand-row gap
  const topSectionGap = 12;    // .top-section gap between zone groups
  const cardBorder = 2;        // rough border allowance

  const needW = (W, CG) => 7*(W + cardBorder) + 6*CG;
  const currentConfig = getCurrentDealConfig();
  const foundationSlots = 4;
  const freeCellSlots = currentConfig.freeCells;

  const foundationNeedW = foundationSlots * (baseW + cardBorder) + Math.max(0, foundationSlots - 1) * topRowGap;
  const handNeedW = freeCellSlots > 0
    ? freeCellSlots * (baseW + cardBorder) + Math.max(0, freeCellSlots - 1) * topRowGap
    : 0;
  const topSectionNeedW = foundationNeedW + handNeedW + (freeCellSlots > 0 ? topSectionGap : 0);

  // Compute a scale factor based on width so the tableau still fits horizontally.
  const tableauNeedW = needW(baseW, baseColGap);
  const targetNeedW = Math.max(tableauNeedW, topSectionNeedW);

  // Avoid division by zero in pathological cases.
  const sW = targetNeedW ? (availW / targetNeedW) : 1;
  const s = Math.min(1, sW);

  // Clamp for usability (phone → desktop).
  const w = Math.round(Math.min(120, Math.max(34, baseW * s)));
  const h = Math.round(w * 1.45);
  let g = Math.round(Math.min(36, Math.max(14, baseGap * s)));
  // Extra vertical separation on narrow screens so ranks/suits remain readable.
  if (window.innerWidth <= 520) {
    g = Math.round(Math.min(44, Math.max(18, baseGap * s * 1.25)));
  }
  // Big Corner Glyphs need additional overlap clearance.
  if(document.body.classList.contains('suit-style-corners') || document.body.classList.contains('suit-style-cb-corners')){
    g = Math.round(Math.min(52, g * 1.35));
  }
  const cg = Math.round(Math.min(12, Math.max(2, baseColGap * s)));

  document.documentElement.style.setProperty('--card-w', w + "px");
  document.documentElement.style.setProperty('--card-h', h + "px");
  document.documentElement.style.setProperty('--stack-gap', g + "px");
  document.documentElement.style.setProperty('--col-gap', cg + "px");
}


let fitRaf = 0;
function scheduleFit(){
  if(fitRaf) return;
  fitRaf = requestAnimationFrame(() => {
    fitRaf = 0;
    fit();
    render();
  });
}
export function initGame(){
document.getElementById("undoBtn").onclick = undo;
document.getElementById("autoBtn").onclick = autoPlay;
document.getElementById("giveUpBtn").onclick = () => {
  if(hasActiveRunToRecordAsLoss() && !runResultRecorded) recordGameResult('loss');
  setLoseModalContent({
    title: 'Out of Moves',
    message: 'The cards have won this round.'
  });
  document.getElementById('modalLose').classList.add('active');
};
document.getElementById("statsBtn").onclick = () => {
  renderStatsModal();
  document.getElementById('modalStats').classList.add('active');
};
document.getElementById("closeStatsBtn").onclick = () => document.getElementById('modalStats').classList.remove('active');
document.getElementById("resetStatsBtn").onclick = () => {
  saveStatsHistory([]);
  renderStatsModal();
};
window.addEventListener('resize', scheduleFit, {passive:true});
window.addEventListener('orientationchange', scheduleFit, {passive:true});
if(window.visualViewport){
  visualViewport.addEventListener('resize', scheduleFit, {passive:true});
  visualViewport.addEventListener('scroll', scheduleFit, {passive:true});
}
// Re-fit if the app container changes size (e.g., address bar show/hide)
try {
  const ro = new ResizeObserver(() => scheduleFit());
  ro.observe(document.body);
} catch(e) {}

loadDealVariantPreference();
applyDealVariant(currentDealVariantKey);
// Use ?debug=1 to enable runtime hint regression assertions.
const isDebugMode = new URLSearchParams(location.search).get('debug') === '1' || ['localhost','127.0.0.1'].includes(location.hostname);
if(isDebugMode){
  console.info('[debug] Hint regression assertions enabled.');
  runHintRegressionScenario();
}

const hasImportApplyPending = localStorage.getItem(IMPORT_APPLY_PENDING_KEY) === '1';
if(hasImportApplyPending){
  suppressPersistenceWrites = true;
}

if(loadPersistedGameState()){
  startTimer();
  fit();
  render();
  restorePostLoadModalState();
} else {
  start();
}
if(hasImportApplyPending){
  localStorage.removeItem(IMPORT_APPLY_PENDING_KEY);
  suppressPersistenceWrites = false;
}
renderStatsModal();

initSuitStyleUI();
initDealVariantUI();
renderAppVersion();
const headerEl = document.querySelector('header');
const menuToggleBtn = document.getElementById('menuToggle');
const headerControlsEl = document.getElementById('headerControls');
const mobileMenuQuery = window.matchMedia('(max-width: 520px)');

function syncMenuAccessibility(){
  if(!headerEl || !menuToggleBtn || !headerControlsEl) return;
  const isOpen = headerEl.classList.contains('menu-open');
  const shouldHideControls = mobileMenuQuery.matches && !isOpen;
  headerControlsEl.toggleAttribute('inert', shouldHideControls);
  headerControlsEl.setAttribute('aria-hidden', String(shouldHideControls));
  menuToggleBtn.setAttribute('aria-expanded', String(isOpen));
  menuToggleBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
}

function setMenuOpen(isOpen){
  if(!headerEl || !menuToggleBtn || !headerControlsEl) return;
  const wasOpen = headerEl.classList.contains('menu-open');
  headerEl.classList.toggle('menu-open', isOpen);
  syncMenuAccessibility();
  if(wasOpen !== isOpen){
    scheduleFit();
  }
}

function syncMenuForViewport(){
  if(!headerEl || !menuToggleBtn || !headerControlsEl) return;
  setMenuOpen(!mobileMenuQuery.matches);
}

if(menuToggleBtn){
  menuToggleBtn.addEventListener('click', () => {
    setMenuOpen(!headerEl.classList.contains('menu-open'));
  });
}

document.addEventListener('keydown', (event) => {
  if(event.key !== 'Escape' || !mobileMenuQuery.matches || !headerEl?.classList.contains('menu-open')) return;
  setMenuOpen(false);
  menuToggleBtn?.focus();
});

['autoBtn', 'giveUpBtn'].forEach((id) => {
  const actionBtn = document.getElementById(id);
  if(!actionBtn) return;
  actionBtn.addEventListener('click', () => {
    if(mobileMenuQuery.matches){
      setMenuOpen(false);
    }
  });
});

syncMenuForViewport();
mobileMenuQuery.addEventListener('change', syncMenuForViewport);

window.addEventListener('focus', syncTimerPresence);
window.addEventListener('blur', syncTimerPresence);
document.addEventListener('visibilitychange', syncTimerPresence);

// Rules modal behavior
const rulesBtn = document.getElementById('rulesBtn');
const modal = document.getElementById('rulesModal');
const closeBtn = document.getElementById('closeRulesBtn');

if(rulesBtn && modal){
  rulesBtn.addEventListener('click', () => modal.classList.remove('hidden'));
}
if(closeBtn && modal){
  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
}
if(modal){
  modal.addEventListener('click', (e) => {
    if(e.target === modal) modal.classList.add('hidden');
  });
}

}
