const suits = ["♠","♥","♦","♣"];
const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const suitColors = { "♠":"#212121", "♥":"#d50000", "♦":"#0277bd", "♣":"#2e7d32" };

const suitClass = { "♠":"spades", "♥":"hearts", "♦":"diamonds", "♣":"clubs" };

const SUIT_STYLE_KEY = "rs_suitStyle_v1";
const GAME_STATE_KEY = "rs_gameState_v1";
const STATS_HISTORY_KEY = "rs_statsHistory_v1";
const DBL_CLICK_FOUNDATION_KEY = "rs_dblClickFoundation_v1";
const MAX_STATS_HISTORY = 100;
const APP_VERSION = "v0.1.2";
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
}

function loadSuitStyle(){
  let style = "normal";
  try { style = localStorage.getItem(SUIT_STYLE_KEY) || "normal"; } catch(e) {}
  const allowed = new Set(["normal","color","dark","border","watermark","pattern","corners","cb"]);
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

function loadDoubleClickFoundationPreference(){
  try {
    const raw = localStorage.getItem(DBL_CLICK_FOUNDATION_KEY);
    if(raw === null){
      doubleClickToFoundationEnabled = true;
      return;
    }
    doubleClickToFoundationEnabled = raw === "1";
  } catch(e){
    doubleClickToFoundationEnabled = true;
  }
}

function applyDoubleClickFoundationPreference(enabled){
  doubleClickToFoundationEnabled = !!enabled;
  const checkbox = document.getElementById("doubleClickFoundationToggle");
  if(checkbox) checkbox.checked = doubleClickToFoundationEnabled;
  try {
    localStorage.setItem(DBL_CLICK_FOUNDATION_KEY, doubleClickToFoundationEnabled ? "1" : "0");
  } catch(e) {}
}

function initDoubleClickFoundationUI(){
  loadDoubleClickFoundationPreference();
  const checkbox = document.getElementById("doubleClickFoundationToggle");
  if(!checkbox) return;
  checkbox.checked = doubleClickToFoundationEnabled;
  checkbox.addEventListener("change", () => applyDoubleClickFoundationPreference(checkbox.checked));
}

function renderAppVersion(){
  const versionEl = document.getElementById("appVersion");
  if(!versionEl) return;

  const resolvedVersion = (typeof APP_VERSION === "string" ? APP_VERSION.trim() : "");
  versionEl.textContent = resolvedVersion || "v0.0.0";
}

let tableau=[[],[],[],[],[],[],[]];
let foundations=[[],[],[],[]];
let hand=[null,null,null];
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
let doubleClickToFoundationEnabled=true;

const MAX_PERSISTED_HISTORY = 150;

function isValidCard(card){
  return !!card &&
    typeof card === 'object' &&
    suits.includes(card.suit) &&
    ranks.includes(card.rank) &&
    Number.isFinite(card.value) &&
    card.value >= 1 && card.value <= 13 &&
    typeof card.faceUp === 'boolean';
}

function clearPersistedGameState(){
  try { localStorage.removeItem(GAME_STATE_KEY); } catch(e) {}
}

function isValidPile(pile){
  return Array.isArray(pile) && pile.every(isValidCard);
}

function persistGameState(){
  const persistedHistory = historyStack.slice(-MAX_PERSISTED_HISTORY);
  const snapshot = {
    tableau,
    foundations,
    hand,
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

function loadPersistedGameState(){
  try {
    const raw = localStorage.getItem(GAME_STATE_KEY);
    if(!raw) return false;
    const parsed = JSON.parse(raw);
    if(!parsed || !Array.isArray(parsed.tableau) || !Array.isArray(parsed.foundations) || !Array.isArray(parsed.hand)){
      clearPersistedGameState();
      return false;
    }
    if(parsed.tableau.length !== 7 || parsed.foundations.length !== 4 || parsed.hand.length !== 3){
      clearPersistedGameState();
      return false;
    }
    if(!parsed.tableau.every(isValidPile) || !parsed.foundations.every(isValidPile) || !parsed.hand.every(card => card === null || isValidCard(card))){
      clearPersistedGameState();
      return false;
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
    selected = null;
    return true;
  } catch(e){
    clearPersistedGameState();
    return false;
  }
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
  timerActive = false;
  lastTickTs = Date.now();
  updateRunStatsUI();
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

function recordGameResult(outcome){
  if(gameFinished || runResultRecorded) return;
  syncTimerPresence();
  gameFinished = true;
  runResultRecorded = true;
  const history = loadStatsHistory();
  history.push({ outcome, moveCount, undoCount, elapsedMs, finishedAt: Date.now() });
  saveStatsHistory(history);
  persistGameState();
  renderStatsModal();
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
  tableau=[[],[],[],[],[],[],[]]; foundations=[[],[],[],[]]; hand=[null,null,null]; historyStack=[]; selected=null;
  resetRunStats();
  const deck=makeDeck(); shuffle(deck);
  for(let i=0;i<7;i++){
    for(let d=0;d<i;d++){const c=deck.pop();c.faceUp=false;tableau[i].push(c);}
    for(let u=0;u<7-i;u++){const c=deck.pop();c.faceUp=true;tableau[i].push(c);}
  }
  for(let k=0;k<3;k++) hand[k]=deck.pop();
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
  destPile.push(c);
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
  hand[handIdx] = p.pop();
  flipTop(srcI);
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
    if(cardIdx !== tableau[idx].length - 1) return false;
    movingCard = tableau[idx][cardIdx];
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
  if(type === 'pile'){
    const srcPile = tableau[idx];
    if(!srcPile.length) return false;
    if(cardIdx < 0 || cardIdx >= srcPile.length) return false;
    if(!srcPile[cardIdx].faceUp) return false;
    for(let destI = 0; destI < 7; destI++){
      if(destI === idx) continue;
      if(executePileToPile(idx, cardIdx, destI)) return true;
    }
    return false;
  }
  if(type === 'hand'){
    if(!hand[idx]) return false;
    for(let destI = 0; destI < 7; destI++){
      if(executeHandToPile(idx, destI)) return true;
    }
    return false;
  }
  return false;
}

function tryAutoMoveFromTap(type, idx, cardIdx){
  return moveCardToAnyFoundation(type, idx, cardIdx) || moveCardToAnyTableau(type, idx, cardIdx);
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
    for(let h=0; h<3; h++){
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

function showHint(){
  clearHints();
  if(findAnyMove(true)) return;
  alert("No suggestions found.");
}

function canFinalizeLoss(){
  return historyStack.length === 0;
}

/* --- GAME STATE CHECKS --- */
function checkGameState(){
  if(isWin()){
    celebrate();
    recordGameResult('win');
    document.getElementById('modalWin').classList.add('active');
  } else {
    // Check for loss (no moves possible)
    if(!findAnyMove(false)){
      if(canFinalizeLoss()) recordGameResult('loss');
      document.getElementById('modalLose').classList.add('active');
    }
  }
}

function findAnyMove(highlight){
  // Returns true if a move exists. If highlight=true, it highlights it.
  
  // 1. Hand -> Foundation
  for(let i=0; i<3; i++){
    if(hand[i]){
      for(let f=0; f<4; f++){
        if(canFoundation(hand[i], foundations[f])){
          if(highlight) { highlightHand(i, 'source'); highlightFoundation(f, 'target'); }
          return true;
        }
      }
    }
  }
  // 2. Pile Top -> Foundation
  for(let i=0; i<7; i++){
    if(tableau[i].length){
      const c = tableau[i][tableau[i].length-1];
      for(let f=0; f<4; f++){
        if(canFoundation(c, foundations[f])){
          if(highlight) { highlightPileCard(i, tableau[i].length-1, 'source'); highlightFoundation(f, 'target'); }
          return true;
        }
      }
    }
  }
  // 3. Hand -> Tableau
  for(let i=0; i<3; i++){
    if(hand[i]){
      for(let t=0; t<7; t++){
        const tp = tableau[t];
        if(!tp.length){ 
          if(hand[i].rank==='K'){ 
            if(highlight) { highlightHand(i,'source'); highlightPile(t,'target'); }
            return true; 
          } 
        }
        else if(canTableau(hand[i], tp[tp.length-1])){ 
          if(highlight) { highlightHand(i,'source'); highlightPileCard(t, tp.length-1, 'target'); }
          return true; 
        }
      }
    }
  }
  // 4. Pile -> Tableau (Deep moves allowed)
  // Prefer stronger progress first; fallback can include king-to-empty only when it reveals cards (j > 0).
  const findPileToTableauMove = (allowBaseKingToEmpty) => {
    for(let i=0; i<7; i++){
      const p = tableau[i];
      for(let j=0; j<p.length; j++){
        if(!p[j].faceUp) continue;
        const c = p[j];
        for(let t=0; t<7; t++){
          if(i===t) continue;
          const tp = tableau[t];
          if(!tp.length){
            const movingKingToEmpty = c.rank === 'K' && j > 0 && (allowBaseKingToEmpty || j > 0);
            if(movingKingToEmpty){
              if(highlight) { highlightPileCard(i,j,'source'); highlightPile(t,'target'); }
              return true;
            }
          }
          else if(canTableau(c, tp[tp.length-1])){
            if(highlight) { highlightPileCard(i,j,'source'); highlightPileCard(t, tp.length-1, 'target'); }
            return true;
          }
        }
      }
    }
    return false;
  };

  // Pass 1: stronger progress only (no base king -> empty pile moves).
  if(findPileToTableauMove(false)) return true;
  // Pass 2: fallback still excludes j === 0 king-to-empty shuffles.
  if(findPileToTableauMove(true)) return true;
  // 5. Pile Top -> Hand (Only if Hand slot empty)
  for(let h=0; h<3; h++){
      if(!hand[h]){
          // Can we move a top card to hand? Yes.
          // Is it useful? Maybe to uncover a card. Any visible top card on a pile > 1 deep is a candidate.
          for(let i=0; i<7; i++){
              if(tableau[i].length > 1){ // Only valid if revealing something or saving a card
                  if(highlight) { highlightPileCard(i, tableau[i].length-1, 'source'); highlightHand(h, 'target'); }
                  return true;
              }
          }
      }
  }
  
  return false;
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
  else if(type==='target') document.querySelector(`.hand-slot[data-id="${idx}"]`).classList.add('hint-'+type);
}
function highlightFoundation(idx, type){ 
  const el = document.querySelector(`.foundation[data-id="${idx}"]`); if(el) el.classList.add('hint-'+type); 
}
function highlightPile(idx, type){ 
  const el = document.querySelector(`.pile[data-id="${idx}"]`); if(el) el.classList.add('hint-'+type); 
}
function highlightPileCard(pileIdx, cardIdx, type){ 
  const pile = document.querySelector(`.pile[data-id="${pileIdx}"]`);
  const cards = pile.querySelectorAll('.card');
  if(cards[cardIdx]) cards[cardIdx].classList.add('hint-'+type);
}

/* --- INTERACTION --- */
let dragSource = null;
let touchClone = document.getElementById('drag-ghost');
let touchStartCoords = {x:0, y:0};
let isDragGesture = false;
let touchOriginalEl = null;
let lastTap = { ts: 0, type: null, idx: null, cardIdx: null };
const DOUBLE_TAP_WINDOW_MS = 300;

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
        touchClone.innerHTML = original.innerHTML;
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
  } else {
    e.preventDefault();
    const now = Date.now();
    const isDoubleTap =
      doubleClickToFoundationEnabled &&
      lastTap.type === dragSource.type &&
      lastTap.idx === dragSource.idx &&
      lastTap.cardIdx === dragSource.cardIdx &&
      (now - lastTap.ts) <= DOUBLE_TAP_WINDOW_MS;

    if(isDoubleTap && tryAutoMoveFromTap(dragSource.type, dragSource.idx, dragSource.cardIdx)){
      selected = null;
      render();
      checkGameState();
      lastTap = { ts: 0, type: null, idx: null, cardIdx: null };
    } else {
      cardClick(dragSource.type, dragSource.idx, dragSource.cardIdx);
      lastTap = { ts: now, type: dragSource.type, idx: dragSource.idx, cardIdx: dragSource.cardIdx };
    }
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
  el.onclick = (e) => { e.stopPropagation(); cardClick(type, idx, cardIdx); };
  el.ondblclick = (e) => {
    e.stopPropagation();
    if(!doubleClickToFoundationEnabled) return;
    if(tryAutoMoveFromTap(type, idx, cardIdx)){
      selected = null;
      render();
      checkGameState();
    } else {
      cardClick(type, idx, cardIdx);
    }
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
    slot.ondragover = handleDragOver; slot.ondragenter = handleDragEnter;
    slot.ondragleave = handleDragLeave; slot.ondrop = (e) => handleDrop(e, 'hand', i);
    slot.onclick = () => cardClick('hand', i);
    const card = isValidCard(hand[i]) ? hand[i] : null;
    if(card) slot.appendChild(createCardEl(card, 'hand', i));
  });
  document.querySelectorAll('.foundation').forEach(found => {
    found.innerHTML = "";
    const i = parseInt(found.dataset.id);
    found.ondragover = handleDragOver; found.ondragenter = handleDragEnter;
    found.ondragleave = handleDragLeave; found.ondrop = (e) => handleDrop(e, 'foundation', i);
    found.onclick = () => cardClick('foundation', i);
    const p = Array.isArray(foundations[i]) ? foundations[i] : [];
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
    pile.onclick = () => { if(selected) { 
        if(selected.type==='pile') executePileToPile(selected.idx, selected.cardIdx, i);
        else executeHandToPile(selected.idx, i);
        selected=null; render();
    }};
    const stack = Array.isArray(tableau[i]) ? tableau[i] : [];
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
  const availH = app.clientHeight;

  // Track actual header height (it can wrap on mobile) so the play area never hides behind it.
  const headerEl = document.querySelector('header');
  if(headerEl){
    const hh = Math.ceil(headerEl.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--header-h', hh + "px");
  }

  const maxLen = Math.max(...tableau.map(p=>p.length || 1));

  // "Design" dimensions (desktop-ish baseline), then scale down as needed.
  const baseW = 84;            // card width
  const baseH = baseW * 1.45;  // card height ratio
  const baseGap = 24;          // stack gap
  const baseColGap = 8;        // column gap
  const cardBorder = 2;        // rough border allowance

  const needW = (W, CG) => 7*(W + cardBorder) + 6*CG;
  const pileH = (N, H, G) => H + (N - 1) * G;

  // Compute a single scale factor that satisfies both width and height.
  const targetNeedW = needW(baseW, baseColGap);
  const targetNeedH = pileH(maxLen, baseH, baseGap);

  // Avoid division by zero in pathological cases.
  const sW = targetNeedW ? (availW / targetNeedW) : 1;
  const sH = targetNeedH ? (availH / targetNeedH) : 1;
  const s = Math.min(1, sW, sH);

  // Clamp for usability (phone → desktop).
  const w = Math.round(Math.min(120, Math.max(34, baseW * s)));
  const h = Math.round(w * 1.45);
  let g = Math.round(Math.min(36, Math.max(14, baseGap * s)));
  // Extra vertical separation on narrow screens so ranks/suits remain readable.
  if (window.innerWidth <= 520) {
    g = Math.round(Math.min(44, Math.max(18, baseGap * s * 1.25)));
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
function initActionControls(){
  document.querySelectorAll('[data-action="show-hint"]').forEach((button) => {
    button.addEventListener('click', showHint);
  });
  document.querySelectorAll('[data-action="start-game"]').forEach((button) => {
    button.addEventListener('click', start);
  });
  document.querySelectorAll('[data-action="undo-move"]').forEach((button) => {
    button.addEventListener('click', undo);
  });

  const newGameBtn = document.getElementById("newGameBtn");
  if(newGameBtn) newGameBtn.addEventListener('click', start);

  const undoBtn = document.getElementById("undoBtn");
  if(undoBtn) undoBtn.addEventListener('click', undo);

  const autoBtn = document.getElementById("autoBtn");
  if(autoBtn) autoBtn.addEventListener('click', autoPlay);

  const giveUpBtn = document.getElementById("giveUpBtn");
  if(giveUpBtn){
    giveUpBtn.addEventListener('click', () => {
      if(hasActiveRunToRecordAsLoss() && !runResultRecorded) recordGameResult('loss');
      document.getElementById('modalLose').classList.add('active');
    });
  }

  const statsBtn = document.getElementById("statsBtn");
  if(statsBtn){
    statsBtn.addEventListener('click', () => {
      renderStatsModal();
      document.getElementById('modalStats').classList.add('active');
    });
  }

  const closeStatsBtn = document.getElementById("closeStatsBtn");
  if(closeStatsBtn) closeStatsBtn.addEventListener('click', () => document.getElementById('modalStats').classList.remove('active'));

  const resetStatsBtn = document.getElementById("resetStatsBtn");
  if(resetStatsBtn){
    resetStatsBtn.addEventListener('click', () => {
      saveStatsHistory([]);
      renderStatsModal();
    });
  }
}

initActionControls();
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

if(loadPersistedGameState()){
  startTimer();
  fit();
  render();
} else {
  start();
}
renderStatsModal();

initSuitStyleUI();
initDoubleClickFoundationUI();
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

['newGameBtn', 'autoBtn', 'giveUpBtn'].forEach((id) => {
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
document.addEventListener('DOMContentLoaded', () => {
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
});
