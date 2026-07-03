// ==================== Game State ====================
let game = {
  gridSize: 6,
  players: [],
  universalCards: [],
  customUniversalCards: [],
  mode: 'mine',
  phase: 'setup',
  currentHidingPlayer: 0,
  currentRevealPlayer: 0,
  grid: [],
  revealedCells: new Set(),
  scores: {},
  eliminated: new Set(),
  logs: [],
  personalCardIdx: 0,
  selectedHandCard: null,
  hideHistory: [],
  extraTurns: 0,
  isRelocating: false,
  relocatingPlayerIdx: null,
  relocateSource: null,
  personalCardCount: 1,
  universalCardCount: 0,
  gameEnded: false,
  pendingRelocateCount: 0
};

// ==================== Setup ====================
function goToPlayerSetup() {
  const count = parseInt(document.getElementById('playerCount').value);
  if (count < 2) { alert('至少需要2名玩家'); return; }
  
  updateUniversalCardInputs();
  updateCardPreview();
  
  const db = getPlayersDB();
  const container = document.getElementById('playerSetups');
  container.innerHTML = '';
  
  // 按创建时间倒序排列档案玩家（最新在前）
  const sortedPlayers = [...db.players].sort((a, b) => {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
  
  for (let i = 0; i < count; i++) {
    const borderColor = COLORS[i % COLORS.length];
    
    // 自动填入档案玩家（按最新创建顺序）
    const autoPlayer = sortedPlayers[i] || null;
    const defaultName = autoPlayer ? autoPlayer.name : '';
    const defaultMain = autoPlayer ? autoPlayer.mainCard : '主牌';
    const archiveId = autoPlayer ? autoPlayer.id : '';
    const playerColor = autoPlayer ? autoPlayer.color : borderColor;
    
    // 切换玩家按钮（仅在有档案时显示）
    const switchBtn = db.players.length > 0 
      ? `<button class="btn btn-secondary" onclick="showSwitchPlayerModal(${i})" style="padding:6px 12px; font-size:0.85em;">切换玩家</button>`
      : '';
    
    container.innerHTML += `
      <div class="player-setup" style="border-left-color:${playerColor}; position:relative;" id="setup-player-${i}" ${archiveId ? `data-archive-id="${archiveId}"` : ''}>
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
          <h3 style="color:${playerColor}; margin:0;">玩家 ${i + 1}</h3>
          ${switchBtn}
        </div>
        <div class="form-group">
          <label>玩家名称</label>
          <input type="text" id="pname_${i}" value="${defaultName}" placeholder="输入名称">
        </div>
        <div class="form-group">
          <label>主牌名称（给你的雷取个名字）</label>
          <input type="text" id="pmain_${i}" placeholder="例如：小明的主牌" value="${defaultMain}">
        </div>
      </div>`;
  }
  showScreen('screen-players');
}

// ==================== Start Game ====================
async function startGame() {
  const count = parseInt(document.getElementById('playerCount').value);
  
  // 防重复校验
  const names = [];
  for (let i = 0; i < count; i++) {
    const name = document.getElementById(`pname_${i}`).value.trim();
    if (!name) { alert(`玩家 ${i + 1} 名称不能为空`); return; }
    if (names.includes(name)) { alert(`玩家名称「${name}」重复，请修改`); return; }
    names.push(name);
  }
  
  // 为没有档案的新玩家依次创建档案
  const setupDivs = document.querySelectorAll('#playerSetups .player-setup');
  for (let i = 0; i < count; i++) {
    const archiveId = setupDivs[i] ? setupDivs[i].getAttribute('data-archive-id') || '' : '';
    if (!archiveId) {
      const name = document.getElementById(`pname_${i}`).value.trim();
      const mainCard = document.getElementById(`pmain_${i}`).value.trim() || '主牌';
      // 系统自动分配颜色
      const selectedColor = COLORS[i % COLORS.length];
      
      // 创建档案
      const db = getPlayersDB();
      const newPlayer = {
        id: 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: name,
        mainCard: mainCard,
        color: selectedColor,
        createdAt: new Date().toISOString()
      };
      db.players.push(newPlayer);
      savePlayersDB(db);
      
      // 绑定到当前位置
      setupDivs[i].setAttribute('data-archive-id', newPlayer.id);
    }
  }
  
  // 正式构建game.players
  game.players = [];
  for (let i = 0; i < count; i++) {
    const name = document.getElementById(`pname_${i}`).value.trim() || `玩家${i + 1}`;
    const mainName = document.getElementById(`pmain_${i}`).value.trim() || '主牌';
    const archiveId = setupDivs[i] ? setupDivs[i].getAttribute('data-archive-id') || '' : '';
    const playerColor = archiveId ? (getPlayersDB().players.find(p => p.id === archiveId) || {}).color || COLORS[i % COLORS.length] : COLORS[i % COLORS.length];
    game.players.push({ name, mainCard: mainName, personalCards: [], color: playerColor, archiveId: archiveId || null });
  }
  
  game.gridSize = parseInt(document.getElementById('gridSize').value);
  game.mode = 'mine'; // 只保留排雷模式
  game.universalCardCount = parseInt(document.getElementById('universalCardCount').value) || 0;
  game.personalCardCount = parseInt(document.getElementById('personalCardCount').value) || 0;
  
  game.customUniversalCards = [];
  const inputs = document.querySelectorAll('.universal-card-input');
  inputs.forEach((input, idx) => {
    const value = input.value.trim();
    game.customUniversalCards[idx] = value || `自定义通用牌${idx + 1}`;
  });
  
  game.grid = [];
  for (let r = 0; r < game.gridSize; r++) {
    game.grid[r] = [];
    for (let c = 0; c < game.gridSize; c++) {
      game.grid[r][c] = [];
    }
  }
  game.revealedCells = new Set();
  game.scores = {};
  game.eliminated = new Set();
  game.logs = [];
  game.currentHidingPlayer = 0;
  game.selectedHandCard = null;
  game.hideHistory = [];
  game.extraTurns = 0;
  game.pendingRelocateCount = 0;
  game.isRelocating = false;
  game.relocatingPlayerIdx = null;
  game.relocateSource = null;
  game.gameEnded = false;

  for (let i = 0; i < game.players.length; i++) {
    game.scores[i] = 0;
  }

  game.players.forEach(p => {
    p.hand = [];
    p.hand.push({ type: 'main', text: p.mainCard, placed: false });
    p.hand.push({ type: 'universal_exclude', text: '排除一个', placed: false });
    p.hand.push({ type: 'universal_relocate', text: '重新放置', placed: false });
    for (let i = 0; i < game.universalCardCount; i++) {
      p.hand.push({ type: 'universal_custom', text: game.customUniversalCards[i], placed: false });
    }
    for (let i = 0; i < game.personalCardCount; i++) {
      p.hand.push({ type: 'personal', text: '', placed: false, edited: false });
    }
  });

  game.phase = 'hide';
  showPrivacyOverlay();
}

// ==================== Hiding Phase ====================
function renderHidePhase() {
  const player = game.players[game.currentHidingPlayer];
  document.getElementById('hideCurrentPlayer').textContent = `${player.name} 的回合`;
  document.getElementById('hideCurrentPlayer').style.color = player.color;

  const remaining = player.hand.filter(c => !c.placed).length;
  document.getElementById('hidePhaseInfo').textContent = `剩余 ${remaining} 张牌需要放置 | 点击个人牌可编辑内容，选择牌后点击格子放置`;

  if (game.selectedHandCard === null && remaining > 0) {
    const firstUnplacedIdx = player.hand.findIndex(c => !c.placed);
    if (firstUnplacedIdx !== -1) {
      game.selectedHandCard = firstUnplacedIdx;
    }
  }

  const handDiv = document.getElementById('handCards');
  handDiv.innerHTML = '';
  player.hand.forEach((card, idx) => {
    const div = document.createElement('div');
    let typeClass = card.type;
    if (card.type === 'universal_exclude') typeClass = 'universal';
    else if (card.type === 'universal_relocate') typeClass = 'universal';
    else if (card.type === 'universal_custom') typeClass = 'universal';
    div.className = `hand-card ${typeClass}${card.placed ? ' placed' : ''}`;
    
    let displayName = '';
    if (card.type === 'main') displayName = `⭐${card.text}`;
    else if (card.type === 'personal') displayName = card.edited ? `📝${card.text}` : '📝点击输入内容';
    else displayName = card.text;
    div.textContent = displayName;
    
    if (!card.placed) {
      div.onclick = () => selectHandCard(idx);
    }
    if (game.selectedHandCard === idx && !card.placed) {
      div.classList.add('selected');
    }
    handDiv.appendChild(div);
  });

  renderGrid('hideGrid', true);
  
  // Update card tip based on selected card
  updateHideCardTip();
}

function updateHideCardTip() {
  const tipDiv = document.getElementById('hideCardTip');
  if (!tipDiv) return;
  
  if (game.selectedHandCard === null) {
    tipDiv.innerHTML = '';
    return;
  }
  
  const player = game.players[game.currentHidingPlayer];
  const card = player.hand[game.selectedHandCard];
  if (!card || card.placed) {
    tipDiv.innerHTML = '';
    return;
  }
  
  const tips = {
    'main': "⭐ 这是你的'雷'！谁翻到它谁出局。藏到对手可能会翻的位置，等他们踩雷吧！",
    'universal_exclude': "🚫 翻到这张牌的人必须多翻一次格子。多翻一次就多一分踩雷的危险！",
    'universal_relocate': "🔄 翻到这张牌的人可以移动自己的主牌到任意位置。",
    'personal': "📝 每个人自己编辑不同内容，被翻到时公开，写点有趣的惩罚/奖励吧～",
    'universal_custom': "🎴 所有人都持有同名的这张牌，翻到后执行统一效果（如：喝一杯、真心话）"
  };
  
  const tip = tips[card.type] || '';
  tipDiv.innerHTML = tip ? `<div class="tip-content">${tip}</div>` : '';
}

let pendingPersonalCardIdx = null;

// 个人牌预设内容池
const PERSONAL_CARD_PRESETS = [
  '请喝奶茶',
  'V我50',
  '学狗叫三声',
  '真心话一次',
  '发朋友圈夸我',
  '做10个俯卧撑',
  '唱一首歌',
  '打电话给指定人说想你了',
  '请全场喝水',
  '模仿动物叫',
  '讲一个冷笑话',
  '原地转5圈',
  '捶背一分钟',
  '用方言自我介绍',
  '做一个鬼脸拍照',
  '说出三个优点夸右边的人',
  '模仿一位明星说话',
  '表演一段舞蹈',
  '用歌词回答一个问题',
  '对手机喊我是猪',
  '闭眼画一幅自画像',
  '说一句土味情话',
  '请全场吃零食',
  '憋笑挑战30秒',
  '用屁股写自己的名字',
  '给指定人一个拥抱',
  '大声说出手机电量',
  '展示最近一张自拍',
  '倒着说一句话',
  '比心拍照发群里'
];

function refreshPersonalCardSuggestions() {
  const container = document.getElementById('personalCardSuggestions');
  if (!container) return;
  
  // 随机抽4个展示
  const shuffled = [...PERSONAL_CARD_PRESETS].sort(() => Math.random() - 0.5);
  const picks = shuffled.slice(0, 4);
  
  container.innerHTML = picks.map(text => 
    `<span class="suggestion-tag" onclick="pickPersonalCardSuggestion('${text.replace(/'/g, "\\'")}')">${text}</span>`
  ).join('');
}

function pickPersonalCardSuggestion(text) {
  document.getElementById('personalCardInput').value = text;
}

function selectHandCard(idx) {
  const player = game.players[game.currentHidingPlayer];
  const card = player.hand[idx];
  
  if (card.type === 'personal' && !card.placed) {
    // Show custom modal for editing personal card
    pendingPersonalCardIdx = idx;
    const input = document.getElementById('personalCardInput');
    input.value = card.edited ? card.text : '';
    refreshPersonalCardSuggestions();
    document.getElementById('personalCardModal').style.display = 'flex';
    input.focus();
    return;
  }
  
  game.selectedHandCard = idx;
  renderHidePhase();
}

function confirmPersonalCardEdit() {
  if (pendingPersonalCardIdx === null) return;
  const player = game.players[game.currentHidingPlayer];
  const card = player.hand[pendingPersonalCardIdx];
  const content = document.getElementById('personalCardInput').value.trim();
  const defaultName = `个人牌${pendingPersonalCardIdx + 1}`;
  card.text = content || defaultName;
  card.edited = true;
  game.selectedHandCard = pendingPersonalCardIdx;
  pendingPersonalCardIdx = null;
  document.getElementById('personalCardModal').style.display = 'none';
  
  // 如果有待放置的格子位置，自动放置
  if (pendingPlaceRow !== null && pendingPlaceCol !== null) {
    doPlaceCard(pendingPlaceRow, pendingPlaceCol);
  } else {
    renderHidePhase();
  }
}

function cancelPersonalCardEdit() {
  if (pendingPersonalCardIdx !== null) {
    game.selectedHandCard = pendingPersonalCardIdx;
  }
  pendingPersonalCardIdx = null;
  pendingPlaceRow = null;
  pendingPlaceCol = null;
  document.getElementById('personalCardModal').style.display = 'none';
  renderHidePhase();
}

function renderGrid(containerId, isHidePhase) {
  const gridDiv = document.getElementById(containerId);
  gridDiv.style.gridTemplateColumns = `repeat(${game.gridSize}, 1fr)`;
  gridDiv.innerHTML = '';

  for (let r = 0; r < game.gridSize; r++) {
    for (let c = 0; c < game.gridSize; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const key = `${r}_${c}`;
      const cards = game.grid[r][c];
      const cellNumber = r * game.gridSize + c + 1;

      if (isHidePhase) {
        const myCards = cards.filter(cd => cd.playerIdx === game.currentHidingPlayer);
        let html = `<span class="cell-number">${cellNumber}</span>`;
        if (myCards.length > 0) {
          cell.classList.add('has-cards');
          myCards.forEach(card => {
            const cardName = card.type === 'main' ? `⭐${escapeHtml(card.text)}` : escapeHtml(card.text);
            html += `<span class="card-count" style="font-size:9px;">${cardName}</span><br>`;
          });
        }
        cell.innerHTML = html;
        cell.onclick = () => placeCard(r, c);
      } else {
        if (game.revealedCells.has(key)) {
          cell.classList.add('revealed');
          let html = `<span class="cell-number">${cellNumber}</span><div class="cell-cards">`;
          cards.forEach(cd => {
            let typeClass = 'universal-card';
            if (cd.type === 'main') typeClass = 'main-card';
            else if (cd.type === 'personal') typeClass = 'personal-card';
            else if (cd.type === 'universal_exclude') typeClass = 'universal-card';
            else if (cd.type === 'universal_relocate') typeClass = 'universal-card';
            else if (cd.type === 'universal_custom') typeClass = 'universal-card';
            const owner = game.players[cd.playerIdx];
            const prefix = cd.type === 'main' ? '⭐' : '';
            html += `<div class="card-item ${typeClass}" title="${escapeHtml(owner.name)}: ${escapeHtml(cd.text)}">${prefix}${escapeHtml(cd.text.substring(0, 4))}</div>`;
          });
          html += '</div>';
          cell.innerHTML = html;
        } else {
          cell.classList.add('hidden-card');
          let cellContent = `<span class="cell-number">${cellNumber}</span><br><span style="font-size:16px;">?</span>`;
          
          if (game.isRelocating && game.relocatingPlayerIdx === game.currentRevealPlayer) {
            if (!game.revealedCells.has(key)) {
              cell.classList.add('relocate-target');
            }
          }
          
          cell.innerHTML = cellContent;
          
          if (game.isRelocating && game.relocatingPlayerIdx === game.currentRevealPlayer) {
            cell.onclick = () => completeRelocate(r, c);
          } else {
            cell.onclick = () => revealCard(r, c);
          }
        }
      }
      gridDiv.appendChild(cell);
    }
  }
}

// 记录待放置的格子位置（用于个人牌编辑后自动放置）
let pendingPlaceRow = null;
let pendingPlaceCol = null;

function placeCard(r, c) {
  // 点击已放置的格子，撤销该位置当前玩家的牌
  const myCards = game.grid[r][c].filter(cd => cd.playerIdx === game.currentHidingPlayer);
  if (myCards.length > 0) {
    // 找到对应的hideHistory记录并撤销
    const histIdx = game.hideHistory.findIndex(h => h.player === game.currentHidingPlayer && h.row === r && h.col === c);
    if (histIdx !== -1) {
      const hist = game.hideHistory[histIdx];
      game.grid[r][c] = game.grid[r][c].filter(cd => cd.playerIdx !== game.currentHidingPlayer);
      game.players[game.currentHidingPlayer].hand[hist.cardIdx].placed = false;
      game.hideHistory.splice(histIdx, 1);
      game.selectedHandCard = hist.cardIdx;
      renderHidePhase();
    }
    return;
  }

  if (game.selectedHandCard === null) { alert('请先选择一张手牌'); return; }
  const player = game.players[game.currentHidingPlayer];
  const card = player.hand[game.selectedHandCard];
  if (card.placed) return;

  const existing = game.grid[r][c].filter(cd => cd.playerIdx === game.currentHidingPlayer);
  if (existing.length >= 1) { alert('每个格子你最多只能放1张牌'); return; }

  // 如果是未编辑的个人牌，先弹编辑窗，编辑完自动放置
  if (card.type === 'personal' && !card.edited) {
    pendingPlaceRow = r;
    pendingPlaceCol = c;
    pendingPersonalCardIdx = game.selectedHandCard;
    const input = document.getElementById('personalCardInput');
    input.value = '';
    refreshPersonalCardSuggestions();
    document.getElementById('personalCardModal').style.display = 'flex';
    input.focus();
    return;
  }

  doPlaceCard(r, c);
}

function doPlaceCard(r, c) {
  const player = game.players[game.currentHidingPlayer];
  const card = player.hand[game.selectedHandCard];

  game.grid[r][c].push({ playerIdx: game.currentHidingPlayer, type: card.type, text: card.text });
  card.placed = true;
  
  const placedCardIdx = game.selectedHandCard;
  game.selectedHandCard = null;
  game.hideHistory.push({ player: game.currentHidingPlayer, row: r, col: c, cardIdx: placedCardIdx });

  // Trigger place animation
  renderHidePhase();
  const cellIdx = r * game.gridSize + c;
  const gridCells = document.getElementById('hideGrid').children;
  if (gridCells[cellIdx]) {
    gridCells[cellIdx].classList.add('anim-place');
    setTimeout(() => gridCells[cellIdx].classList.remove('anim-place'), 400);
  }

  const remaining = player.hand.filter(c => !c.placed).length;
  if (remaining > 0) {
    const nextUnplacedIdx = player.hand.findIndex((c, idx) => !c.placed && idx > placedCardIdx);
    if (nextUnplacedIdx !== -1) {
      game.selectedHandCard = nextUnplacedIdx;
    } else {
      const firstUnplacedIdx = player.hand.findIndex(c => !c.placed);
      if (firstUnplacedIdx !== -1) {
        game.selectedHandCard = firstUnplacedIdx;
      }
    }
  }

  pendingPlaceRow = null;
  pendingPlaceCol = null;
  renderHidePhase();
}

function undoLastPlace() {
  if (game.hideHistory.length === 0) return;
  const last = game.hideHistory[game.hideHistory.length - 1];
  if (last.player !== game.currentHidingPlayer) return;
  
  game.grid[last.row][last.col] = game.grid[last.row][last.col].filter(cd => cd.playerIdx !== last.player);
  const player = game.players[last.player];
  player.hand[last.cardIdx].placed = false;
  game.hideHistory.pop();
  
  game.selectedHandCard = last.cardIdx;
  
  renderHidePhase();
}

function confirmHiding() {
  const player = game.players[game.currentHidingPlayer];
  const remaining = player.hand.filter(c => !c.placed).length;
  if (remaining > 0) {
    if (!confirm(`你还有 ${remaining} 张牌未放置，确定要继续？`)) return;
  }

  game.currentHidingPlayer++;
  game.selectedHandCard = null;
  game.hideHistory = [];

  if (game.currentHidingPlayer >= game.players.length) {
    game.phase = 'reveal';
    game.currentRevealPlayer = 0;
    showScreen('screen-reveal');
    renderRevealPhase();
  } else {
    showPrivacyOverlay();
  }
}

// ==================== Reveal Phase ====================
function renderRevealPhase() {
  const player = game.players[game.currentRevealPlayer];
  
  document.getElementById('revealCurrentPlayer').textContent = `${player.name} 翻牌中`;
  document.getElementById('revealCurrentPlayer').style.color = player.color;
  
  const revealStatusBar = document.getElementById('revealCurrentPlayer').closest('.status-bar');
  if (revealStatusBar) {
    const bgColor = getPlayerBackgroundColor(player.color);
    revealStatusBar.style.backgroundColor = bgColor;
  }
  
  // 计算剩余未翻格子数
  const totalCells = game.gridSize * game.gridSize;
  const revealedCount = game.revealedCells.size;
  const remainingCells = totalCells - revealedCount;

  let infoText = `点击格子翻牌 | 剩余格子：${remainingCells}/${totalCells}`;
  if (game.isRelocating) {
    infoText = `请为「${player.name}」选择主牌的新位置（高亮格子为新位置）`;
  } else if (game.extraTurns > 0) {
    infoText = `请${player.name}再点击一个格子（剩余${game.extraTurns}次）| 剩余格子：${remainingCells}/${totalCells}`;
  } else if (game.eliminated.has(game.currentRevealPlayer)) {
    infoText = '该玩家已出局';
  }
  document.getElementById('revealPhaseInfo').textContent = infoText;

  // 计算各玩家剩余未被翻出的牌数
  const playerRemainingCards = game.players.map((p, idx) => {
    let total = 0;
    for (let r = 0; r < game.gridSize; r++) {
      for (let c = 0; c < game.gridSize; c++) {
        const key = `${r}_${c}`;
        if (!game.revealedCells.has(key)) {
          total += game.grid[r][c].filter(cd => cd.playerIdx === idx).length;
        }
      }
    }
    return total;
  });

  const tabsDiv = document.getElementById('playerTabs');
  tabsDiv.innerHTML = '';
  
  // 存活玩家排前面，出局玩家排后面
  const sortedPlayers = game.players.map((p, i) => ({ player: p, idx: i }));
  sortedPlayers.sort((a, b) => {
    const aOut = game.eliminated.has(a.idx) ? 1 : 0;
    const bOut = game.eliminated.has(b.idx) ? 1 : 0;
    return aOut - bOut;
  });
  
  sortedPlayers.forEach(({ player: p, idx: i }) => {
    const tab = document.createElement('div');
    tab.className = `player-tab${i === game.currentRevealPlayer ? ' active' : ''}${game.eliminated.has(i) ? ' eliminated' : ''}`;
    const remaining = playerRemainingCards[i];
    tab.textContent = `${p.name} (${remaining})`;
    tab.style.borderColor = i === game.currentRevealPlayer ? p.color : 'transparent';
    if (i === game.currentRevealPlayer) {
      tab.style.backgroundColor = getPlayerBackgroundColor(p.color);
    }
    if (!game.eliminated.has(i) && !game.isRelocating) {
      tab.onclick = () => { game.currentRevealPlayer = i; renderRevealPhase(); };
    }
    tabsDiv.appendChild(tab);
  });

  renderGrid('revealGrid', false);

  const logDiv = document.getElementById('logArea');
  logDiv.innerHTML = game.logs.map(l => `<div class="log-entry${l.important ? ' important' : ''}">${l.text}</div>`).join('');
  logDiv.scrollTop = logDiv.scrollHeight;
  
  const nextBtn = document.querySelector('.next-player-btn');
  if (nextBtn) {
    if (game.isRelocating || game.gameEnded) {
      nextBtn.style.display = 'none';
    } else {
      nextBtn.style.display = '';
    }
  }
}

function autoSwitchPlayer() {
  if (game.gameEnded || game.isRelocating) return;
  if (game.extraTurns > 0) return;
  
  let nextPlayer = (game.currentRevealPlayer + 1) % game.players.length;
  let attempts = 0;
  while (game.eliminated.has(nextPlayer) && attempts < game.players.length) {
    nextPlayer = (nextPlayer + 1) % game.players.length;
    attempts++;
  }
  if (attempts >= game.players.length) return;
  
  game.currentRevealPlayer = nextPlayer;
  renderRevealPhase();
}

function switchToPrevPlayer() {
  if (game.gameEnded || game.isRelocating) return;
  if (game.extraTurns > 0) {
    showToast('你还有额外翻牌机会，请继续翻牌', 'warning');
    return;
  }
  
  // Find previous non-eliminated player
  let prevPlayer = (game.currentRevealPlayer - 1 + game.players.length) % game.players.length;
  let attempts = 0;
  while (game.eliminated.has(prevPlayer) && attempts < game.players.length) {
    prevPlayer = (prevPlayer - 1 + game.players.length) % game.players.length;
    attempts++;
  }
  if (attempts >= game.players.length) return;
  
  const overlay = document.getElementById('revealSwitchOverlay');
  const prevName = game.players[prevPlayer].name;
  document.getElementById('revealSwitchMessage').textContent = `请将设备交给「${prevName}」`;
  overlay.style.display = 'flex';
  overlay.dataset.nextPlayer = prevPlayer;
}

function switchToNextPlayer() {
  if (game.gameEnded || game.isRelocating) return;
  if (game.extraTurns > 0) {
    showToast('你还有额外翻牌机会，请继续翻牌', 'warning');
    return;
  }
  
  // Find next non-eliminated player
  let nextPlayer = (game.currentRevealPlayer + 1) % game.players.length;
  let attempts = 0;
  while (game.eliminated.has(nextPlayer) && attempts < game.players.length) {
    nextPlayer = (nextPlayer + 1) % game.players.length;
    attempts++;
  }
  if (attempts >= game.players.length) return;
  
  // Show privacy overlay before switching
  const overlay = document.getElementById('revealSwitchOverlay');
  const nextName = game.players[nextPlayer].name;
  document.getElementById('revealSwitchMessage').textContent = `请将设备交给「${nextName}」`;
  overlay.style.display = 'flex';
  // Store the target player index for when they confirm
  overlay.dataset.nextPlayer = nextPlayer;
}

function confirmRevealSwitch() {
  const overlay = document.getElementById('revealSwitchOverlay');
  const nextPlayer = parseInt(overlay.dataset.nextPlayer);
  overlay.style.display = 'none';
  game.currentRevealPlayer = nextPlayer;
  renderRevealPhase();
}

function revealCard(r, c) {
  if (game.gameEnded) return;
  if (game.isRelocating) return;
  if (game.eliminated.has(game.currentRevealPlayer)) { alert('该玩家已出局'); return; }
  
  const key = `${r}_${c}`;
  if (game.revealedCells.has(key)) return;

  const cards = game.grid[r][c];
  const revealer = game.currentRevealPlayer;
  const cellNum = r * game.gridSize + c + 1;
  
  game.revealedCells.add(key);
  
  if (game.extraTurns > 0) {
    game.extraTurns--;
  }
  
  // Trigger reveal animation
  const cellIdx = r * game.gridSize + c;
  renderRevealPhase();
  const gridCells = document.getElementById('revealGrid').children;
  if (gridCells[cellIdx]) {
    gridCells[cellIdx].classList.add('anim-reveal');
    setTimeout(() => gridCells[cellIdx].classList.remove('anim-reveal'), 500);
  }
  
  let logParts = [];
  let mainCardFound = false;
  
  cards.forEach(cd => {
    if (cd.type === 'main') {
      if (cd.playerIdx === revealer) {
        game.logs.push({ text: `💥 ${escapeHtml(game.players[revealer].name)} 在格子${cellNum}翻到了自己的主牌「${escapeHtml(cd.text)}」！出局！`, important: true });
      } else {
        game.logs.push({ text: `💣 ${escapeHtml(game.players[revealer].name)} 在格子${cellNum}踩到了 ${escapeHtml(game.players[cd.playerIdx].name)} 的主牌「${escapeHtml(cd.text)}」！踩雷出局！`, important: true });
      }
      game.eliminated.add(revealer);
      mainCardFound = true;
      checkMineElimination();
    } else if (cd.type === 'universal_exclude') {
      game.logs.push({ text: `🚫 ${escapeHtml(game.players[revealer].name)} 在格子${cellNum}翻开了「排除一个」！获得额外翻牌机会`, important: true });
    } else if (cd.type === 'universal_relocate') {
      game.logs.push({ text: `🔄 ${escapeHtml(game.players[revealer].name)} 在格子${cellNum}翻开了「重新放置」！`, important: true });
    } else {
      const owner = game.players[cd.playerIdx];
      const typeLabel = cd.type === 'universal_custom' ? '通用牌' : cd.type === 'personal' ? '个人牌' : '通用牌';
      game.logs.push({ text: `${escapeHtml(game.players[revealer].name)} 在格子${cellNum}翻开了 ${escapeHtml(owner.name)}的${typeLabel}「${escapeHtml(cd.text)}」`, important: false });
      
      // 个人牌弹窗展示
      if (cd.type === 'personal') {
        showPersonalCardReveal(game.players[revealer].name, owner.name, cd.text);
      }
    }
  });
  
  if (cards.length === 0) {
    game.logs.push({ text: `${escapeHtml(game.players[revealer].name)} 翻开了格子${cellNum} - 空的`, important: false });
  }
  
  renderRevealPhase();
  
  if (game.gameEnded) return;
  
  let excludeCount = 0;
  let relocateCount = 0;
  
  cards.forEach(cd => {
    if (cd.type === 'universal_exclude') {
      excludeCount++;
    } else if (cd.type === 'universal_relocate') {
      relocateCount++;
    }
  });
  
  if (game.eliminated.has(revealer)) {
    if (!game.gameEnded) {
      autoSwitchPlayer();
    }
    return;
  }
  
  if (excludeCount > 0) {
    game.extraTurns += excludeCount;
  }
  
  if (relocateCount > 0) {
    game.pendingRelocateCount += relocateCount;
  }
  
  if (game.extraTurns > 0) {
    renderRevealPhase();
    return;
  }
  
  if (game.pendingRelocateCount > 0) {
    game.pendingRelocateCount--;
    enterRelocateMode(revealer);
    return;
  }
  
  if (!game.gameEnded) {
    autoSwitchPlayer();
  }
}

// ==================== Personal Card Reveal Modal ====================
function showPersonalCardReveal(revealerName, ownerName, cardText) {
  document.getElementById('personalRevealTitle').textContent = `${revealerName} 触发了 ${ownerName} 的个人牌`;
  document.getElementById('personalRevealContent').textContent = `「${cardText}」`;
  document.getElementById('personalCardRevealModal').style.display = 'flex';
}

function dismissPersonalCardReveal() {
  document.getElementById('personalCardRevealModal').style.display = 'none';
}

function checkMineElimination() {
  const alive = game.players.filter((_, i) => !game.eliminated.has(i));
  if (alive.length <= 1) {
    if (alive.length === 1) {
      const winner = alive[0];
      endGameWithResult(`${winner.name} 获胜！`, `排雷模式 - 最后的幸存者`);
    } else {
      endGameWithResult('游戏结束', '排雷模式 - 所有玩家都已出局');
    }
  }
}

// ==================== Relocate Mode ====================
function enterRelocateMode(playerIdx) {
  game.isRelocating = true;
  game.relocatingPlayerIdx = playerIdx;
  
  let found = false;
  for (let r = 0; r < game.gridSize; r++) {
    for (let c = 0; c < game.gridSize; c++) {
      const cards = game.grid[r][c];
      for (const cd of cards) {
        if (cd.type === 'main' && cd.playerIdx === playerIdx) {
          game.relocateSource = { r, c };
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (found) break;
  }
  
  if (!found) {
    game.logs.push({ text: `ℹ️ ${game.players[playerIdx].name} 的主牌已被翻开，无法重新放置`, important: false });
    game.isRelocating = false;
    game.relocatingPlayerIdx = null;
    game.relocateSource = null;
    autoSwitchPlayer();
    renderRevealPhase();
    return;
  }
  
  game.logs.push({ text: `🔄 ${game.players[playerIdx].name} 正在重新放置主牌...`, important: true });
  renderRevealPhase();
}

function completeRelocate(targetR, targetC) {
  if (!game.isRelocating) return;
  
  const source = game.relocateSource;
  const playerIdx = game.relocatingPlayerIdx;
  
  if (source && source.r === targetR && source.c === targetC) {
    game.logs.push({ text: `🔄 ${game.players[playerIdx].name} 已将主牌重新放置`, important: true });
    
    game.isRelocating = false;
    game.relocatingPlayerIdx = null;
    game.relocateSource = null;
    
    renderRevealPhase();
    
    if (game.pendingRelocateCount > 0) {
      game.pendingRelocateCount--;
      enterRelocateMode(playerIdx);
      return;
    }
    
    if (!game.gameEnded) {
      autoSwitchPlayer();
    }
    return;
  }
  
  const targetKey = `${targetR}_${targetC}`;
  if (game.revealedCells.has(targetKey)) { alert('不能放在已翻开的格子中'); return; }
  
  const existing = game.grid[targetR][targetC].filter(cd => cd.playerIdx === playerIdx);
  if (existing.length >= 1) { alert('该格子你已经有牌了'); return; }
  
  const sourceCards = game.grid[source.r][source.c];
  const mainCardIdx = sourceCards.findIndex(cd => cd.type === 'main' && cd.playerIdx === playerIdx);
  if (mainCardIdx === -1) return;
  
  const mainCard = sourceCards[mainCardIdx];
  sourceCards.splice(mainCardIdx, 1);
  game.grid[targetR][targetC].push({ ...mainCard });
  
  game.logs.push({ text: `🔄 ${game.players[playerIdx].name} 已将主牌重新放置`, important: true });
  
  game.isRelocating = false;
  game.relocatingPlayerIdx = null;
  game.relocateSource = null;
  
  renderRevealPhase();
  
  if (game.pendingRelocateCount > 0) {
    game.pendingRelocateCount--;
    enterRelocateMode(playerIdx);
    return;
  }
  
  if (!game.gameEnded) {
    autoSwitchPlayer();
  }
}

// ==================== Game End ====================
function endGameWithResult(title, details) {
  if (game.gameEnded) return; // Prevent double-ending
  game.gameEnded = true;
  
  // Determine winners and save to leaderboard
  let winnerNames = [];
  let winnerIds = [];
  
  const winnerMatch = title.match(/^(.+?)\s*(?:获胜|并列获胜)/);
  if (winnerMatch) {
    winnerNames = winnerMatch[1].split('、');
    winnerNames.forEach(wn => {
      const player = game.players.find(p => p.name === wn);
      if (player && player.archiveId) {
        winnerIds.push(player.archiveId);
      }
    });
  }
  
  // Save to leaderboard
  saveGameResults(winnerNames, winnerIds);
  checkAndUpdateArchives();
  
  setTimeout(() => {
    revealAllCards();
    // 在状态栏显示获胜信息
    document.getElementById('revealCurrentPlayer').textContent = title;
    document.getElementById('revealCurrentPlayer').style.color = '#f1c40f';
    // 显示获胜者的历史战绩
    document.getElementById('revealPhaseInfo').textContent = getWinnerStatsText(winnerNames);
    // 切换按钮：隐藏"下一个玩家"和"结束游戏"，显示"再来一局"
    const nextBtn = document.querySelector('.next-player-btn');
    if (nextBtn) nextBtn.style.display = 'none';
    document.getElementById('btnEndGame').style.display = 'none';
    document.getElementById('btnPlayAgain').style.display = '';
    document.getElementById('btnViewLeaderboard').style.display = '';
  }, 500);
}

function getWinnerStatsText(winnerNames) {
  if (!winnerNames || winnerNames.length === 0) return '';
  const winnerName = winnerNames[0];
  const player = game.players.find(p => p.name === winnerName);
  if (!player || !player.archiveId) return `${winnerName} 首次获胜！`;
  const stats = getPlayerStats(player.archiveId);
  return `累计 ${stats.wins} 胜 / ${stats.gamesPlayed} 局 · 胜率 ${stats.winRate}%`;
}

function revealAllCards() {
  for (let r = 0; r < game.gridSize; r++) {
    for (let c = 0; c < game.gridSize; c++) {
      const key = `${r}_${c}`;
      if (!game.revealedCells.has(key)) {
        game.revealedCells.add(key);
      }
    }
  }
  renderRevealPhase();
}

function endGame() {
  if (!confirm('确定要结束游戏吗？')) return;
  
  game.gameEnded = true;
  revealAllCards();

  // 以存活玩家作为获胜者
  const alive = game.players.filter((_, i) => !game.eliminated.has(i));
  let title, details;
  
  if (alive.length === 0) {
    title = '游戏结束';
    details = '所有玩家都已出局！';
    saveGameResults([], []);
    checkAndUpdateArchives();
  } else {
    const winners = alive.map(p => p.name);
    title = `🏆 ${winners.join('、')} 获胜！`;
    details = '最后的幸存者';
    const winnerIds = [];
    alive.forEach(p => {
      if (p.archiveId) winnerIds.push(p.archiveId);
    });
    saveGameResults(winners, winnerIds);
    checkAndUpdateArchives();
  }
  
  // 状态栏显示结果
  document.getElementById('revealCurrentPlayer').textContent = title;
  document.getElementById('revealCurrentPlayer').style.color = '#f1c40f';
  document.getElementById('revealPhaseInfo').textContent = getWinnerStatsText(alive.map(p => p.name));
  // 切换按钮
  const nextBtn = document.querySelector('.next-player-btn');
  if (nextBtn) nextBtn.style.display = 'none';
  document.getElementById('btnEndGame').style.display = 'none';
  document.getElementById('btnPlayAgain').style.display = '';
  document.getElementById('btnViewLeaderboard').style.display = '';
}
