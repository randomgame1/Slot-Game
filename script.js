/**************************************************
 * Constants & Globals
 **************************************************/
const SPIN_DURATION = 1000; // ms
const ROW_HEIGHT = 60;      // each row is 60px

const reelsInput       = document.getElementById('reelsInput');
const rowsInput        = document.getElementById('rowsInput');
const linesInput       = document.getElementById('linesInput');
const rtpInput         = document.getElementById('rtpInput');
const volatilityInput  = document.getElementById('volatilityInput');
const betAmountInput   = document.getElementById('betAmountInput');
const spinButton       = document.getElementById('spinButton');

const balanceDisplay   = document.getElementById('balanceDisplay');
const freeSpinsDisplay = document.getElementById('freeSpinsDisplay');
const messageArea      = document.getElementById('messageArea');

const infoButton       = document.getElementById('infoButton');
const infoModal        = document.getElementById('infoModal');
const closeModal       = document.getElementById('closeModal');

const dynamicPaytable  = document.getElementById('dynamicPaytable');
const paylinesList     = document.getElementById('paylinesList');

const reelsArea        = document.getElementById('reelsArea');
const lineOverlay      = document.getElementById('lineOverlay');

/* Reel divs */
const reelDivs = [
  document.getElementById('reel0'),
  document.getElementById('reel1'),
  document.getElementById('reel2'),
  document.getElementById('reel3'),
  document.getElementById('reel4')
];
let reelAnimationFrameIds = [];

/* Game State */
let balance = 1000;
let freeSpins = 0;
balanceDisplay.textContent = balance.toFixed(2);

/* Row labels for sidebar payline info */
const rowLabels = ["Top row", "2nd row", "3rd row", "4th row", "5th row"];

/**************************************************
 * Symbol Data
 **************************************************/
const symbolData = [
  { symbol: 'bitcoin',  baseWeight: 50, payout3: 5,  payout4: 10,  payout5: 20,  image: 'images/bitcoin.png' },
  { symbol: 'ethereum', baseWeight: 40, payout3: 7,  payout4: 14,  payout5: 28,  image: 'images/ethereum.png' },
  { symbol: 'litecoin', baseWeight: 25, payout3: 10, payout4: 20,  payout5: 40,  image: 'images/litecoin.png' },
  { symbol: 'tether',   baseWeight: 15, payout3: 15, payout4: 30,  payout5: 60,  image: 'images/tether.png' },
  { symbol: 'wild',     baseWeight: 5,  payout3: 20, payout4: 40,  payout5: 100, image: 'images/wild.png' },
  { symbol: 'bonus',    baseWeight: 5,  payout3: 0,  payout4: 0,   payout5: 0,   image: 'images/bonus.png' }
];

/**************************************************
 * Setup & Listeners
 **************************************************/
reelsInput.addEventListener('change', () => {
  let r = parseInt(reelsInput.value, 10);
  r = Math.max(3, Math.min(5, r));
  reelsInput.value = r;
  refreshPaytable(r);
});
rowsInput.addEventListener('change', () => {
  let rr = parseInt(rowsInput.value, 10);
  rr = Math.max(3, Math.min(5, rr));
  rowsInput.value = rr;
  if (parseInt(linesInput.value, 10) > rr) {
    linesInput.value = rr;
  }
  linesInput.max = rr;
  updateReelContainersHeight(rr);
  updatePaylineIndex(rr, parseInt(linesInput.value, 10));
});
linesInput.addEventListener('change', () => {
  let rr = parseInt(rowsInput.value, 10);
  let ll = parseInt(linesInput.value, 10);
  ll = Math.min(ll, rr);
  linesInput.value = ll;
  updatePaylineIndex(rr, ll);
});
function initLayout() {
  let reelsVal = parseInt(reelsInput.value, 10);
  refreshPaytable(reelsVal);
  let rowsVal = parseInt(rowsInput.value, 10);
  updateReelContainersHeight(rowsVal);
  updatePaylineIndex(rowsVal, parseInt(linesInput.value, 10));
}
initLayout();

/**************************************************
 * Update Payline List in Sidebar
 **************************************************/
function updatePaylineIndex(numRows, numLines) {
  paylinesList.innerHTML = "";
  for (let i = 0; i < numLines; i++) {
    const li = document.createElement('li');
    li.textContent = `Payline ${i+1}: ${rowLabels[i] || ('Row ' + (i+1))}`;
    paylinesList.appendChild(li);
  }
}

/**************************************************
 * Adjust Reel Container Heights
 **************************************************/
function updateReelContainersHeight(numRows) {
  const newHeight = numRows * ROW_HEIGHT;
  const containers = document.querySelectorAll('.reel-container');
  containers.forEach(c => { c.style.height = `${newHeight}px`; });
  reelDivs.forEach(rd => { rd.style.height = `${newHeight}px`; });
  setTimeout(updateOverlaySize, 50);
}
function updateOverlaySize() {
  const w = reelsArea.offsetWidth;
  const h = reelsArea.offsetHeight;
  lineOverlay.style.width = `${w}px`;
  lineOverlay.style.height = `${h}px`;
}

/**************************************************
 * Weighted Pool & Paytable
 **************************************************/
function getVolatilityMultiplier(volatility) {
  switch (volatility) {
    case 'low':    return 1.0;
    case 'medium': return 1.5;
    case 'high':   return 2.0;
    default:       return 1.0;
  }
}
function createWeightedSymbolPool(rtpPercent, volatility) {
  let volMult = getVolatilityMultiplier(volatility);
  let highPayReduction = Math.max(0, 100 - rtpPercent);
  let pool = [];
  symbolData.forEach(s => {
    let w = s.baseWeight;
    if (s.payout5 >= 60 || s.symbol === 'bonus') { w -= highPayReduction; }
    w *= volMult;
    w = Math.max(1, w);
    for (let i = 0; i < w; i++) { pool.push(s.symbol); }
  });
  if (pool.length === 0) { return symbolData.map(s => s.symbol); }
  return pool;
}
function refreshPaytable(numReels) {
  let tableHtml = `<p><strong>Credits for Matches</strong></p>`;
  tableHtml += `<table><thead><tr><th>Symbol</th>`;
  if (numReels >= 3) tableHtml += `<th>3-of-a-kind</th>`;
  if (numReels >= 4) tableHtml += `<th>4-of-a-kind</th>`;
  if (numReels >= 5) tableHtml += `<th>5-of-a-kind</th>`;
  tableHtml += `</tr></thead><tbody>`;
  symbolData.forEach(s => {
    let row = `<tr><td>${s.symbol}</td>`;
    if (numReels >= 3) row += `<td>${s.payout3 || 0}</td>`;
    if (numReels >= 4) row += `<td>${s.payout4 || 0}</td>`;
    if (numReels >= 5) row += `<td>${s.payout5 || 0}</td>`;
    row += `</tr>`;
    tableHtml += row;
  });
  tableHtml += `</tbody></table>`;
  dynamicPaytable.innerHTML = tableHtml;
}

/**************************************************
 * Spin Reels & Flicker
 **************************************************/
function spinReels(numReels, numRows, pool) {
  let results = [];
  for (let i = 0; i < numReels; i++) {
    const reelSymbols = [];
    for (let r = 0; r < numRows; r++) {
      reelSymbols.push(getRandomSymbol(pool));
    }
    results.push(reelSymbols);
  }
  return results;
}
function getRandomSymbol(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}
function getRandomSymbolsForRows(pool, numRows) {
  let arr = [];
  for (let i = 0; i < numRows; i++) {
    arr.push(getRandomSymbol(pool));
  }
  return arr;
}
function updateReelDisplay(reelDiv, rowSymbols) {
  let html = "";
  rowSymbols.forEach(sym => {
    let obj = symbolData.find(s => s.symbol === sym);
    if (obj) { html += `<img src="${obj.image}" alt="${sym}">`; }
    else { html += `<div style="width:80px;height:60px;background:#ccc;"></div>`; }
  });
  reelDiv.innerHTML = html;
}
function startReelFlicker(reelDiv, pool, numRows, reelIndex) {
  let startTime = null;
  const flicker = (timestamp) => {
    if (!startTime) startTime = timestamp;
    let elapsed = timestamp - startTime;
    if (elapsed < SPIN_DURATION) {
      let randomRows = getRandomSymbolsForRows(pool, numRows);
      updateReelDisplay(reelDiv, randomRows);
      reelAnimationFrameIds[reelIndex] = requestAnimationFrame(flicker);
    } else {
      setFinalOutcomeForReel(reelIndex);
    }
  };
  reelAnimationFrameIds[reelIndex] = requestAnimationFrame(flicker);
}
function setFinalOutcomeForReel(idx) {
  let finalResults = JSON.parse(spinButton.dataset.finalResults);
  let reelSymbols = finalResults[idx];
  updateReelDisplay(reelDivs[idx], reelSymbols);
  reelAnimationFrameIds[idx] = null;
  if (allReelsStopped()) { finalizeSpin(); }
}
function allReelsStopped() {
  return reelAnimationFrameIds.every(id => id === null || id === undefined);
}

/**************************************************
 * calcLineCreditsPartial: Partial Combos
 * Scan left-to-right for the largest contiguous run (>=3)
 * If the run includes any wilds, double the credits.
 **************************************************/
function calcLineCreditsPartial(lineSymbols) {
  const n = lineSymbols.length;
  let bestCombo = 0;
  let i = 0;
  while (i < n) {
    let runSymbol = lineSymbols[i];
    let runCount = 1;
    let hasWild = (runSymbol === 'wild');
    let j = i + 1;
    while (j < n) {
      if (
        lineSymbols[j] === runSymbol ||
        lineSymbols[j] === 'wild' ||
        runSymbol === 'wild'
      ) {
        if (lineSymbols[j] === 'wild') { hasWild = true; }
        if (runSymbol === 'wild' && lineSymbols[j] !== 'wild') {
          runSymbol = lineSymbols[j];
        }
        runCount++;
        j++;
      } else {
        break;
      }
    }
    if (runCount >= 3) {
      let symObj = symbolData.find(s => s.symbol === runSymbol);
      if (!symObj) { symObj = symbolData.find(s => s.symbol === 'wild'); }
      let baseCredits = 0;
      if (runCount === 3 && symObj.payout3) baseCredits = symObj.payout3;
      else if (runCount === 4 && symObj.payout4) baseCredits = symObj.payout4;
      else if (runCount >= 5 && symObj.payout5) baseCredits = symObj.payout5;
      if (hasWild && baseCredits > 0) { baseCredits *= 2; }
      if (baseCredits > bestCombo) { bestCombo = baseCredits; }
    }
    i = j;
  }
  return bestCombo;
}

/**************************************************
 * Spin Button Handler
 **************************************************/
spinButton.addEventListener('click', () => {
  messageArea.innerHTML = "";
  messageArea.classList.remove('error');

  let numReels = parseInt(reelsInput.value, 10);
  let numRows  = parseInt(rowsInput.value, 10);
  let linesToCheck = parseInt(linesInput.value, 10);
  linesToCheck = Math.min(linesToCheck, numRows);

  let betAmount = parseFloat(betAmountInput.value);
  if (isNaN(betAmount) || betAmount <= 0) {
    messageArea.innerHTML = `<span class="error">Please enter a valid Bet Amount.</span>`;
    return;
  }
  let denom = betAmount / linesToCheck;

  // If no free spins, deduct bet; otherwise, use a free spin.
  if (freeSpins === 0) {
    if (balance < betAmount) {
      messageArea.innerHTML = `<span class="error">Not enough balance! Need at least ${betAmount.toFixed(2)} dollars.</span>`;
      return;
    }
    balance -= betAmount;
    messageArea.innerHTML += `You wagered <strong>${betAmount.toFixed(2)}</strong> dollars.<br/>
      Denomination = ${betAmount.toFixed(2)} / ${linesToCheck} = <strong>${denom.toFixed(2)}</strong> dollars per line.<br/>
      Reels: ${numReels}, Rows: ${numRows}, Paylines: ${linesToCheck}<br/><br/>`;
  } else {
    freeSpins--;
    messageArea.innerHTML += `Used 1 free spin. <strong>${freeSpins}</strong> free spins left.<br/><br/>`;
  }
  balanceDisplay.textContent = balance.toFixed(2);
  freeSpinsDisplay.textContent = freeSpins;

  let pool = createWeightedSymbolPool(parseInt(rtpInput.value, 10), volatilityInput.value);
  let finalResults = spinReels(numReels, numRows, pool);

  spinButton.dataset.finalResults = JSON.stringify(finalResults);
  spinButton.dataset.numReels = numReels;
  spinButton.dataset.numRows = numRows;
  spinButton.dataset.linesToCheck = linesToCheck;
  spinButton.dataset.betAmount = betAmount;
  spinButton.dataset.denomination = denom;

  // Clear old winning lines from overlay
  lineOverlay.innerHTML = "";

  reelAnimationFrameIds.forEach((id, i) => {
    if (id) {
      cancelAnimationFrame(id);
      reelAnimationFrameIds[i] = null;
    }
  });

  // Flicker reels
  for (let i = 0; i < reelDivs.length; i++) {
    if (i < numReels) {
      reelDivs[i].parentElement.style.display = "inline-block";
      startReelFlicker(reelDivs[i], pool, numRows, i);
    } else {
      reelDivs[i].parentElement.style.display = "none";
    }
  }
});

/**************************************************
 * Finalize Spin: Calculate Wins, Detailed Math & Glow Winning Lines
 **************************************************/
function finalizeSpin() {
  let finalResults = JSON.parse(spinButton.dataset.finalResults);
  let numReels = parseInt(spinButton.dataset.numReels, 10);
  let numRows = parseInt(spinButton.dataset.numRows, 10);
  let linesToCheck = parseInt(spinButton.dataset.linesToCheck, 10);
  let betAmount = parseFloat(spinButton.dataset.betAmount);
  let denom = parseFloat(spinButton.dataset.denomination);

  let roundMessages = [];

  // Count Bonus symbols for Scatter
  let bonusCount = 0;
  finalResults.forEach(reelArr => {
    reelArr.forEach(sym => {
      if (sym === 'bonus') bonusCount++;
    });
  });

  let totalLineWin = 0;
  // Check each payline (each row from 0 to linesToCheck-1)
  for (let lineIdx = 0; lineIdx < linesToCheck; lineIdx++) {
    const lineSymbols = [];
    for (let r = 0; r < numReels; r++) {
      lineSymbols.push(finalResults[r][lineIdx]);
    }
    let credits = calcLineCreditsPartial(lineSymbols);
    if (credits > 0) {
      let lineWin = credits * denom;
      totalLineWin += lineWin;
      highlightWinningLine(lineIdx);
      let rowName = rowLabels[lineIdx] || (`Row ${lineIdx+1}`);
      roundMessages.push(`
      <div class="win-text">
        <strong>Payline ${lineIdx+1}</strong> (${rowName}):<br/>
        Symbols: [${lineSymbols.join(", ")}]<br/>
        Credits Earned: ${credits} × Denomination ${denom.toFixed(2)} = 
        <strong>${lineWin.toFixed(2)} dollars</strong>
      </div>
      `);
    }
  }

  // Scatter / Bonus
  let scatterWin = 0;
  if (bonusCount >= 3) {
    let { freeSpinsAward, scatterMult } = getBonusAward(bonusCount);
    freeSpins += freeSpinsAward;
    scatterWin = scatterMult * betAmount;
    roundMessages.push(`
    <div class="win-text">
      <strong>Scatter Bonus!</strong><br/>
      Bonus Symbols: ${bonusCount}<br/>
      Free Spins Awarded: ${freeSpinsAward}<br/>
      Scatter Payout: ${scatterMult} × Bet Amount ${betAmount.toFixed(2)} = 
      <strong>${scatterWin.toFixed(2)} dollars</strong>
    </div>`);
  }
  let spinWin = totalLineWin + scatterWin;
  if (spinWin > 0) { balance += spinWin; }
  balanceDisplay.textContent = balance.toFixed(2);
  freeSpinsDisplay.textContent = freeSpins;

  if (spinWin > 0) {
    roundMessages.push(`
    <div class="win-text">
      <strong>Total Spin Win:</strong> ${spinWin.toFixed(2)} dollars.<br/>
      New Balance: ${balance.toFixed(2)} dollars.
    </div>
    <div class="win-text">
      <em>Math Recap:</em><br/>
      Risk (Total Bet) = ${betAmount.toFixed(2)} dollars for ${linesToCheck} lines → Denomination = ${denom.toFixed(2)} dollars per line.<br/>
      Winning line payout = Credits × Denomination.<br/>
      (Wild symbols double the credits.)
    </div>
    `);
  } else {
    if (freeSpins > 0) {
      roundMessages.push(`<div class="lose-text">No winning lines, but you still have ${freeSpins} free spins left.</div>`);
    } else {
      roundMessages.push(`<div class="lose-text">No win. Bet was ${betAmount.toFixed(2)} dollars, you earned 0. New Balance: ${balance.toFixed(2)} dollars.</div>`);
    }
  }
  messageArea.innerHTML += roundMessages.join("<br/><br/>");
}

/**************************************************
 * calcLineCreditsPartial: Partial Combo Calculation
 * Scans left-to-right for the largest contiguous run (>=3)
 * If any wild appears in the run, doubles the credits.
 **************************************************/
function calcLineCreditsPartial(lineSymbols) {
  const n = lineSymbols.length;
  let bestCombo = 0;
  let i = 0;
  while (i < n) {
    let runSymbol = lineSymbols[i];
    let runCount = 1;
    let hasWild = (runSymbol === 'wild');
    let j = i + 1;
    while (j < n) {
      if (lineSymbols[j] === runSymbol || lineSymbols[j] === 'wild' || runSymbol === 'wild') {
        if (lineSymbols[j] === 'wild') { hasWild = true; }
        if (runSymbol === 'wild' && lineSymbols[j] !== 'wild') { runSymbol = lineSymbols[j]; }
        runCount++;
        j++;
      } else {
        break;
      }
    }
    if (runCount >= 3) {
      let symObj = symbolData.find(s => s.symbol === runSymbol);
      if (!symObj) { symObj = symbolData.find(s => s.symbol === 'wild'); }
      let baseCredits = 0;
      if (runCount === 3 && symObj.payout3) baseCredits = symObj.payout3;
      else if (runCount === 4 && symObj.payout4) baseCredits = symObj.payout4;
      else if (runCount >= 5 && symObj.payout5) baseCredits = symObj.payout5;
      if (hasWild && baseCredits > 0) { baseCredits *= 2; }
      if (baseCredits > bestCombo) { bestCombo = baseCredits; }
    }
    i = j;
  }
  return bestCombo;
}

/**************************************************
 * highlightWinningLine: Glowing effect on winning line
 **************************************************/
function highlightWinningLine(lineIdx) {
  const colors = ["red", "blue", "orange", "purple", "green", "yellow", "lime"];
  let color = colors[lineIdx % colors.length];
  let y = (lineIdx * ROW_HEIGHT) + (ROW_HEIGHT / 2);
  updateOverlaySize();
  let lineDiv = document.createElement("div");
  lineDiv.className = "payline-line";
  lineDiv.style.top = `${y - 1}px`;
  lineDiv.style.backgroundColor = color;
  lineOverlay.appendChild(lineDiv);
}

/**************************************************
 * getBonusAward: Bonus/Scatter Calculation
 **************************************************/
function getBonusAward(bonusCount) {
  let freeSpinsAward = 0;
  if (bonusCount === 3) freeSpinsAward = 10;
  else if (bonusCount === 4) freeSpinsAward = 15;
  else if (bonusCount === 5) freeSpinsAward = 20;
  else if (bonusCount >= 6) freeSpinsAward = 25;
  let scatterMult = 0;
  if (bonusCount === 3) scatterMult = 5;
  else if (bonusCount === 4) scatterMult = 20;
  else if (bonusCount === 5) scatterMult = 100;
  else if (bonusCount >= 6) scatterMult = 200;
  return { freeSpinsAward, scatterMult };
}

/**************************************************
 * Modal Info Handlers
 **************************************************/
infoButton.addEventListener("click", () => {
  infoModal.style.display = "block";
});
closeModal.addEventListener("click", () => {
  infoModal.style.display = "none";
});
window.addEventListener("click", (e) => {
  if (e.target === infoModal) { infoModal.style.display = "none"; }
});
