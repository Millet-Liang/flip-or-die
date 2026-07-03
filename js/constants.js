// ==================== Constants ====================
const COLORS = ['#e94560','#3498db','#27ae60','#f39c12','#9b59b6','#1abc9c','#e67e22','#2ecc71'];
const PLAYERS_DB_KEY = 'cardGamePlayers';
const LEADERBOARD_KEY = 'cardGameLeaderboard';

// ==================== Utility ====================
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
