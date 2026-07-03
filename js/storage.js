// ==================== Storage Module ====================

function getPlayersDB() {
  try {
    const data = localStorage.getItem(PLAYERS_DB_KEY);
    if (data) return JSON.parse(data);
  } catch(e) {
    console.error('[Storage] Failed to read players DB:', e);
  }
  return { version: 1, players: [] };
}

function savePlayersDB(db) {
  try {
    localStorage.setItem(PLAYERS_DB_KEY, JSON.stringify(db));
  } catch(e) {
    console.error('[Storage] Failed to save players DB:', e);
    showToast && showToast('存储空间不足，数据可能丢失', 'error');
  }
}

function getLeaderboard() {
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    if (data) return JSON.parse(data);
  } catch(e) {
    console.error('[Storage] Failed to read leaderboard:', e);
  }
  return { version: 1, lastUpdated: null, games: [], playerStats: {} };
}

function saveLeaderboard(lb) {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(lb));
  } catch(e) {
    console.error('[Storage] Failed to save leaderboard:', e);
    showToast && showToast('存储空间不足，积分数据可能丢失', 'error');
  }
}

function getPlayerStats(playerId) {
  const lb = getLeaderboard();
  const stats = lb.playerStats[playerId];
  if (!stats) return { wins: 0, gamesPlayed: 0, winRate: 0 };
  return {
    wins: stats.wins || 0,
    gamesPlayed: stats.gamesPlayed || 0,
    winRate: stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0
  };
}
