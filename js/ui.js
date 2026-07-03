// ==================== UI Module ====================

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  
  // Refresh archive management when showing archive screen
  if (id === 'screen-archive') {
    refreshArchiveManagement();
  }
  
  // Update nav brand arrow
  if (typeof updateNavBrand === 'function') updateNavBrand();
}

function showPrivacyOverlay() {
  const overlay = document.getElementById('privacyOverlay');
  const player = game.players[game.currentHidingPlayer];
  document.getElementById('overlayTitle').textContent = '请将设备交给';
  document.getElementById('overlayMessage').textContent = `${player.name}（${game.currentHidingPlayer + 1}/${game.players.length}）进行藏牌`;
  overlay.style.display = 'flex';
}

function dismissOverlay() {
  document.getElementById('privacyOverlay').style.display = 'none';
  if (game.phase === 'hide' || game.phase === 'setup') {
    game.phase = 'hide';
    showScreen('screen-hide');
    renderHidePhase();
  }
}

// Helper function to generate a comfortable background color from player color
function getPlayerBackgroundColor(playerColor) {
  const hex = playerColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const bgR = Math.floor(r * 0.5);
  const bgG = Math.floor(g * 0.5);
  const bgB = Math.floor(b * 0.5);
  
  return `rgb(${bgR}, ${bgG}, ${bgB})`;
}

// ==================== Toast Notification ====================
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('show'));
  
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Override native alert to use toast for simple messages
const _nativeAlert = window.alert;
window.alert = function(msg) {
  if (typeof msg === 'string' && msg.startsWith('✅')) {
    showToast(msg.replace('✅ ', ''), 'success');
  } else if (typeof msg === 'string' && (msg.includes('请') || msg.includes('不能') || msg.includes('至少'))) {
    showToast(msg, 'warning');
  } else {
    showToast(msg, 'info');
  }
};
