// ==================== Leaderboard Module ====================

function showLeaderboard() {
  renderLeaderboard();
  showScreen('screen-leaderboard');
}

function hideLeaderboard() {
  showScreen('screen-setup');
}

function renderLeaderboard() {
  const lb = getLeaderboard();
  const db = getPlayersDB();
  
  let playerList = [];
  for (const [id, stats] of Object.entries(lb.playerStats || {})) {
    const playerInfo = db.players.find(p => p.id === id);
    if (playerInfo) {
      playerList.push({
        id: id,
        name: playerInfo.name,
        color: playerInfo.color,
        wins: stats.wins || 0,
        gamesPlayed: stats.gamesPlayed || 0,
        winRate: stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0
      });
    }
  }
  
  playerList.sort((a, b) => b.wins - a.wins || a.gamesPlayed - b.gamesPlayed);
  
  const topDiv = document.getElementById('topPlayers');
  if (playerList.length === 0) {
    topDiv.innerHTML = '<p style="color:#aaa; text-align:center; width:100%;">暂无数据，开始第一局游戏吧！</p>';
  } else {
    const medals = ['🥇', '🥈', '🥉'];
    const classes = ['gold', 'silver', 'bronze'];
    let topHtml = '';
    const top3 = playerList.slice(0, 3);
    top3.forEach((p, idx) => {
      topHtml += `
        <div class="top-player-card ${classes[idx] || ''}">
          <div class="top-player-rank">${medals[idx]}</div>
          <div class="top-player-name" style="color:${p.color}">${p.name}</div>
          <div class="top-player-stats">
            <div class="stat-item">
              <div class="stat-value">${p.wins}</div>
              <div class="stat-label">胜局</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${p.gamesPlayed}</div>
              <div class="stat-label">参与局数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${p.winRate}%</div>
              <div class="stat-label">胜率</div>
            </div>
          </div>
        </div>`;
    });
    topDiv.innerHTML = topHtml;
  }
  
  const tbody = document.getElementById('leaderboardBody');
  let tableHtml = '';
  playerList.forEach((p, idx) => {
    const rank = idx + 1;
    let badgeClass = 'normal';
    if (rank === 1) badgeClass = 'top1';
    else if (rank === 2) badgeClass = 'top2';
    else if (rank === 3) badgeClass = 'top3';
    
    tableHtml += `<tr>
      <td><span class="rank-badge ${badgeClass}">${rank}</span></td>
      <td><span style="color:${p.color}; font-weight:bold;">${p.name}</span></td>
      <td style="color:#f1c40f; font-weight:bold;">${p.wins}</td>
      <td>${p.gamesPlayed}</td>
      <td>${p.winRate}%</td>
    </tr>`;
  });
  tbody.innerHTML = tableHtml || '<tr><td colspan="5" style="text-align:center; color:#aaa;">暂无数据</td></tr>';
  
  const historyDiv = document.getElementById('gameHistoryList');
  const games = lb.games || [];
  if (games.length === 0) {
    historyDiv.innerHTML = '<p style="color:#aaa;">暂无历史对局</p>';
  } else {
    let historyHtml = '';
    [...games].reverse().forEach(g => {
      const date = new Date(g.date).toLocaleString('zh-CN');
      
      // 用archiveId查最新名字
      const resolvedScores = g.scores.map(s => {
        if (s.archiveId) {
          const archived = db.players.find(p => p.id === s.archiveId);
          return { ...s, name: archived ? archived.name : s.name };
        }
        return s;
      });
      
      const winner = resolvedScores.filter(s => s.isWinner).map(s => s.name).join('、') || g.winnerText || '无';
      const participants = resolvedScores.filter(s => !s.isWinner).map(s => s.name);
      
      historyHtml += `
        <div class="history-item" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="color:#aaa; font-size:0.85em;">${date}</span>
            <span style="color:#f1c40f; font-weight:bold;">🏆 ${winner}</span>
            <span style="color:#888; font-size:0.85em;">${participants.length > 0 ? '击败 ' + participants.join('、') : ''}</span>
          </div>
        </div>`;
    });
    historyDiv.innerHTML = historyHtml;
  }
}

function saveGameResults(winnerNames, winnerIds) {
  try {
    const lb = getLeaderboard();
    if (!lb.playerStats) lb.playerStats = {};
    if (!lb.games) lb.games = [];
    
    game.players.forEach((p, i) => {
      const archiveId = p.archiveId;
      if (!archiveId) return;
      
      if (!lb.playerStats[archiveId]) {
        lb.playerStats[archiveId] = { wins: 0, gamesPlayed: 0 };
      }
      lb.playerStats[archiveId].gamesPlayed++;
      
      if (winnerIds && winnerIds.includes(archiveId)) {
        lb.playerStats[archiveId].wins++;
      }
    });
    
    const scoresData = game.players.map((p, i) => ({
      name: p.name,
      archiveId: p.archiveId || null,
      color: p.color,
      found: game.scores[i] || 0,
      eliminated: game.eliminated.has(i),
      isWinner: winnerNames && winnerNames.includes(p.name)
    }));
    
    lb.games.push({
      date: new Date().toISOString(),
      mode: game.mode,
      winnerText: (winnerNames && winnerNames.length > 0) ? winnerNames.join('、') : '无',
      winnerIds: winnerIds || [],
      scores: scoresData
    });
    
    lb.lastUpdated = new Date().toISOString();
    saveLeaderboard(lb);
    console.log('[Leaderboard] Game saved successfully', { winnerNames, winnerIds, gamesCount: lb.games.length });
  } catch(e) {
    console.error('[Leaderboard] Failed to save game results:', e);
  }
}
