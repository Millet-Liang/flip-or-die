// ==================== Player Archive Module ====================

let selectedNewPlayerColor = COLORS[0];
let switchingPlayerIdx = null;

// ==================== Switch Player Modal ====================
function showSwitchPlayerModal(playerIdx) {
  switchingPlayerIdx = playerIdx;
  const db = getPlayersDB();
  const container = document.getElementById('switchPlayerList');
  
  // 获取已在其他位置选中的archiveId
  const count = parseInt(document.getElementById('playerCount').value) || 2;
  const usedIds = [];
  for (let i = 0; i < count; i++) {
    if (i === playerIdx) continue;
    const div = document.getElementById(`setup-player-${i}`);
    if (div && div.getAttribute('data-archive-id')) {
      usedIds.push(div.getAttribute('data-archive-id'));
    }
  }
  
  let html = '';
  db.players.forEach(p => {
    const isUsed = usedIds.includes(p.id);
    const stats = getPlayerStats(p.id);
    if (isUsed) {
      html += `<div style="background:#0f3460; border-radius:8px; padding:12px; opacity:0.4; cursor:not-allowed; border-left:3px solid ${p.color};">
        <strong>${p.name}</strong> <span style="color:#888; font-size:0.85em;">${stats.wins}胜/${stats.gamesPlayed}局</span>
      </div>`;
    } else {
      html += `<div onclick="selectSwitchPlayer('${p.id}')" style="background:#0f3460; border-radius:8px; padding:12px; cursor:pointer; border-left:3px solid ${p.color}; transition:all 0.2s;" onmouseover="this.style.background='#1a4a8a'" onmouseout="this.style.background='#0f3460'">
        <strong>${p.name}</strong> <span style="color:#888; font-size:0.85em;">${stats.wins}胜/${stats.gamesPlayed}局</span>
      </div>`;
    }
  });
  
  if (db.players.length === 0) {
    html = '<p style="color:#aaa; text-align:center;">暂无档案玩家</p>';
  }
  
  container.innerHTML = html;
  document.getElementById('switchPlayerModal').style.display = 'flex';
}

function hideSwitchPlayerModal() {
  document.getElementById('switchPlayerModal').style.display = 'none';
  switchingPlayerIdx = null;
}

function selectSwitchPlayer(archiveId) {
  if (switchingPlayerIdx === null) return;
  const db = getPlayersDB();
  const player = db.players.find(p => p.id === archiveId);
  if (!player) return;
  
  const i = switchingPlayerIdx;
  document.getElementById(`pname_${i}`).value = player.name;
  document.getElementById(`pmain_${i}`).value = player.mainCard;
  
  const setupDiv = document.getElementById(`setup-player-${i}`);
  if (setupDiv) {
    setupDiv.setAttribute('data-archive-id', player.id);
    setupDiv.style.borderLeftColor = player.color;
    const h3 = setupDiv.querySelector('h3');
    if (h3) {
      h3.style.color = player.color;
    }
  }
  
  hideSwitchPlayerModal();
}

function refreshArchiveManagement() {
  const db = getPlayersDB();
  const container = document.getElementById('archiveManagementList');
  
  if (!container) return;
  
  let html = '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:15px;">';
  
  // 首位加号卡片
  html += `<div onclick="showCreatePlayerDialog()" style="background:#16213e; border-radius:10px; padding:15px; border:2px dashed #555; display:flex; align-items:center; justify-content:center; cursor:pointer; min-height:100px; transition:all 0.2s;" onmouseover="this.style.borderColor='#3498db'" onmouseout="this.style.borderColor='#555'">
    <span style="font-size:2.5em; color:#555;">+</span>
  </div>`;
  
  [...db.players].reverse().forEach(p => {
    const stats = getPlayerStats(p.id);
    html += `<div style="background:#0f3460; border-radius:10px; padding:15px; border-left:4px solid ${p.color}; position:relative;">
      <div style="position:absolute; top:10px; right:10px; display:flex; gap:8px;">
        <button onclick="editArchivePlayer('${p.id}')" style="background:none; border:none; color:#3498db; cursor:pointer; font-size:0.8em;">[编辑]</button>
        <button onclick="deleteArchivePlayer('${p.id}')" style="background:none; border:none; color:#e94560; cursor:pointer; font-size:0.8em;">[删除]</button>
      </div>
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <span style="width:16px;height:16px;border-radius:50%;background:${p.color};display:inline-block;"></span>
        <strong style="font-size:1.1em;">${p.name}</strong>
      </div>
      <div style="font-size:0.9em; color:#aaa; margin-bottom:5px;">主牌：${p.mainCard}</div>
      <div style="font-size:0.9em; color:#aaa;">战绩：${stats.wins}胜 / ${stats.gamesPlayed}局</div>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function deleteArchivePlayer(playerId) {
  if (!confirm('确定要删除这个玩家档案吗？删除后无法恢复。')) return;
  
  const db = getPlayersDB();
  const idx = db.players.findIndex(p => p.id === playerId);
  if (idx === -1) return;
  
  const playerName = db.players[idx].name;
  db.players.splice(idx, 1);
  savePlayersDB(db);
  
  // 从积分榜中移除该玩家的统计数据
  const lb = getLeaderboard();
  if (lb.playerStats && lb.playerStats[playerId]) {
    delete lb.playerStats[playerId];
    saveLeaderboard(lb);
  }
  
  refreshArchiveManagement();
  alert(`✅ 已删除玩家"${playerName}"的档案`);
}

async function editArchivePlayer(playerId) {
  const db = getPlayersDB();
  const player = db.players.find(p => p.id === playerId);
  if (!player) return;
  
  // 弹出编辑对话框
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:1000;display:flex;align-items:center;justify-content:center;';
  
  let selectedColor = player.color;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = 'background:#16213e;padding:30px;border-radius:15px;max-width:400px;width:90%;';
  
  dialog.innerHTML = `
    <h3 style="color:#fff;margin-top:0;">编辑玩家档案</h3>
    <div style="margin-bottom:15px;">
      <label style="display:block;color:#aaa;margin-bottom:5px;">玩家名称</label>
      <input type="text" id="editPlayerName" value="${player.name}" style="width:100%;padding:10px;border:1px solid #333;border-radius:8px;background:#0f3460;color:#eee;font-size:16px;">
    </div>
    <div style="margin-bottom:15px;">
      <label style="display:block;color:#aaa;margin-bottom:5px;">主牌名称</label>
      <input type="text" id="editPlayerMainCard" value="${player.mainCard}" style="width:100%;padding:10px;border:1px solid #333;border-radius:8px;background:#0f3460;color:#eee;font-size:16px;">
    </div>
    <div style="margin-bottom:20px;">
      <label style="display:block;color:#aaa;margin-bottom:5px;">代表颜色</label>
      <div id="editColorPicker" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;"></div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;">
      <button class="btn btn-secondary" id="editCancelBtn">取消</button>
      <button class="btn btn-primary" id="editConfirmBtn">保存</button>
    </div>
  `;
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // 渲染颜色选项
  const colorsDiv = document.getElementById('editColorPicker');
  COLORS.forEach(c => {
    const div = document.createElement('div');
    div.style.cssText = `width:40px;height:40px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${c === selectedColor ? '#fff' : 'transparent'};transition:all 0.2s;`;
    div.onclick = () => {
      selectedColor = c;
      colorsDiv.querySelectorAll('div').forEach(d => d.style.borderColor = 'transparent');
      div.style.borderColor = '#fff';
    };
    colorsDiv.appendChild(div);
  });
  
  return new Promise((resolve) => {
    document.getElementById('editCancelBtn').onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };
    
    document.getElementById('editConfirmBtn').onclick = () => {
      const newName = document.getElementById('editPlayerName').value.trim();
      const newMainCard = document.getElementById('editPlayerMainCard').value.trim();
      
      if (!newName) {
        alert('玩家名称不能为空');
        return;
      }
      
      // 更新档案
      player.name = newName;
      player.mainCard = newMainCard || '主牌';
      player.color = selectedColor;
      savePlayersDB(db);
      
      document.body.removeChild(overlay);
      refreshArchiveManagement();
      alert(`✅ 已更新玩家“${newName}”的档案`);
      resolve(true);
    };
  });
}

function showArchiveManagementPage() {
  showScreen('screen-archive');
}

async function savePlayerToArchive(playerIdx) {
  const name = document.getElementById(`pname_${playerIdx}`).value.trim();
  const mainCard = document.getElementById(`pmain_${playerIdx}`).value.trim();
  
  if (!name) {
    alert('请先输入玩家名称');
    return;
  }
  
  // 弹出颜色选择对话框
  const selectedColor = await promptForColorSelection();
  if (!selectedColor) return; // 用户取消
  
  const db = getPlayersDB();
  
  // 创建新档案（允许重名）
  const newPlayer = {
    id: 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    name: name,
    mainCard: mainCard || '主牌',
    color: selectedColor,
    createdAt: new Date().toISOString()
  };
  
  db.players.push(newPlayer);
  savePlayersDB(db);
  
  // 自动将新档案绑定到当前玩家设置
  const setupDiv = document.getElementById(`setup-player-${playerIdx}`);
  if (setupDiv) {
    setupDiv.setAttribute('data-archive-id', newPlayer.id);
    setupDiv.style.borderLeftColor = selectedColor;
    const h3 = setupDiv.querySelector('h3');
    if (h3) {
      h3.style.color = selectedColor;
      h3.textContent = `玩家 ${playerIdx + 1} 📁`;
    }
    // 更新下拉框，添加新选项并选中
    const select = setupDiv.querySelector('select');
    if (select) {
      const newOption = document.createElement('option');
      newOption.value = newPlayer.id;
      newOption.textContent = `${name} (0胜/0局)`;
      select.appendChild(newOption);
      select.value = newPlayer.id;
    }
  }
  
  alert(`✅ 已将"${name}"保存到档案并自动关联！\n本局结束后积分将自动记录。`);
}

function promptForColorSelection() {
  // 创建一个临时的颜色选择对话框
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:1000;display:flex;align-items:center;justify-content:center;';
  
  let selectedColor = COLORS[0];
  
  const dialog = document.createElement('div');
  dialog.style.cssText = 'background:#16213e;padding:30px;border-radius:15px;max-width:400px;width:90%;';
  
  dialog.innerHTML = `
    <h3 style="color:#fff;margin-top:0;">选择代表颜色</h3>
    <div id="tempColorPicker" style="display:flex;flex-wrap:wrap;gap:10px;margin:20px 0;"></div>
    <div style="display:flex;gap:10px;justify-content:flex-end;">
      <button class="btn btn-secondary" id="tempCancelBtn">取消</button>
      <button class="btn btn-primary" id="tempConfirmBtn">确定</button>
    </div>
  `;
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // 渲染颜色选项
  const colorsDiv = document.getElementById('tempColorPicker');
  COLORS.forEach(c => {
    const div = document.createElement('div');
    div.style.cssText = `width:40px;height:40px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${c === selectedColor ? '#fff' : 'transparent'};transition:all 0.2s;`;
    div.onclick = () => {
      selectedColor = c;
      colorsDiv.querySelectorAll('div').forEach(d => d.style.borderColor = 'transparent');
      div.style.borderColor = '#fff';
    };
    colorsDiv.appendChild(div);
  });
  
  return new Promise((resolve) => {
    document.getElementById('tempCancelBtn').onclick = () => {
      document.body.removeChild(overlay);
      resolve(null);
    };
    
    document.getElementById('tempConfirmBtn').onclick = () => {
      document.body.removeChild(overlay);
      resolve(selectedColor);
    };
  });
}



// When player count is reduced, trim any extra player setup entries
function trimSelectedArchivePlayers() {
  const count = parseInt(document.getElementById('playerCount').value) || 2;
  const container = document.getElementById('playerSetups');
  if (!container) return;
  const setups = container.querySelectorAll('.player-setup');
  // Remove extra setup entries beyond current player count
  for (let i = count; i < setups.length; i++) {
    setups[i].remove();
  }
}

function fillPlayerFromArchive(playerIdx, archiveId) {
  const db = getPlayersDB();
  const archivedPlayer = archiveId ? db.players.find(p => p.id === archiveId) : null;
  
  if (!archivedPlayer) {
    document.getElementById(`pname_${playerIdx}`).value = `玩家${playerIdx + 1}`;
    document.getElementById(`pmain_${playerIdx}`).value = '主牌';
    const setupDiv = document.getElementById(`setup-player-${playerIdx}`);
    if (setupDiv) {
      setupDiv.style.borderLeftColor = COLORS[playerIdx % COLORS.length];
      setupDiv.removeAttribute('data-archive-id');
      const h3 = setupDiv.querySelector('h3');
      if (h3) {
        h3.style.color = COLORS[playerIdx % COLORS.length];
        h3.textContent = `玩家 ${playerIdx + 1}`;
      }
    }
    return;
  }
  
  document.getElementById(`pname_${playerIdx}`).value = archivedPlayer.name;
  document.getElementById(`pmain_${playerIdx}`).value = archivedPlayer.mainCard;
  
  const setupDiv = document.getElementById(`setup-player-${playerIdx}`);
  if (setupDiv) {
    setupDiv.style.borderLeftColor = archivedPlayer.color;
    setupDiv.setAttribute('data-archive-id', archivedPlayer.id);
    const h3 = setupDiv.querySelector('h3');
    if (h3) {
      h3.style.color = archivedPlayer.color;
      h3.textContent = `玩家 ${playerIdx + 1} 📁`;
    }
  }
}

function showCreatePlayerDialog() {
  selectedNewPlayerColor = COLORS[getPlayersDB().players.length % COLORS.length];
  document.getElementById('newPlayerName').value = '';
  document.getElementById('newPlayerMainCard').value = '主牌';
  
  const colorsDiv = document.getElementById('newPlayerColors');
  colorsDiv.innerHTML = '';
  COLORS.forEach(c => {
    const div = document.createElement('div');
    div.style.cssText = `width:30px;height:30px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${c === selectedNewPlayerColor ? '#fff' : 'transparent'};transition:all 0.2s;`;
    div.onclick = () => {
      selectedNewPlayerColor = c;
      colorsDiv.querySelectorAll('div').forEach(d => d.style.borderColor = 'transparent');
      div.style.borderColor = '#fff';
    };
    colorsDiv.appendChild(div);
  });
  
  document.getElementById('createPlayerOverlay').style.display = 'flex';
}

function hideCreatePlayerDialog() {
  document.getElementById('createPlayerOverlay').style.display = 'none';
}

function createNewPlayer() {
  const name = document.getElementById('newPlayerName').value.trim();
  const mainCard = document.getElementById('newPlayerMainCard').value.trim() || '主牌';
  
  if (!name) { alert('请输入玩家名称'); return; }
  
  const db = getPlayersDB();
  
  if (db.players.some(p => p.name === name)) {
    alert('该名称已存在，请换一个名称');
    return;
  }
  
  const newPlayer = {
    id: 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    name: name,
    mainCard: mainCard,
    color: selectedNewPlayerColor,
    createdAt: new Date().toISOString()
  };
  
  db.players.push(newPlayer);
  savePlayersDB(db);
  
  hideCreatePlayerDialog();
  
  // If on archive management screen, refresh it
  if (document.getElementById('screen-archive').classList.contains('active')) {
    refreshArchiveManagement();
  }
  
  alert(`✅ 玩家"${name}"创建成功！`);
}

function checkAndUpdateArchives() {
  const db = getPlayersDB();
  let needsUpdate = false;
  let updateList = [];
  
  game.players.forEach(p => {
    if (!p.archiveId) return;
    const archived = db.players.find(ap => ap.id === p.archiveId);
    if (!archived) return;
    
    if (p.mainCard !== archived.mainCard) {
      needsUpdate = true;
      updateList.push({ player: p, archived: archived });
    }
  });
  
  if (needsUpdate) {
    setTimeout(() => {
      let msg = '以下玩家的主牌名称与档案不同，是否更新档案？\n';
      updateList.forEach(u => {
        msg += `\n${u.player.name}: "${u.archived.mainCard}" → "${u.player.mainCard}"`;
      });
      msg += '\n\n点击"确定"更新，点击"取消"保持不变';
      
      if (confirm(msg)) {
        updateList.forEach(u => {
          const idx = db.players.findIndex(ap => ap.id === u.player.archiveId);
          if (idx !== -1) {
            db.players[idx].mainCard = u.player.mainCard;
          }
        });
        savePlayersDB(db);
      }
    }, 1000);
  }
}


