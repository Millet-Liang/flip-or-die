// ==================== Config Module ====================

// Navigate back to home (setup screen)
function goHome() {
  showScreen('screen-setup');
  updateNavBrand();
}

// Update nav brand to show/hide back arrow based on current screen
function updateNavBrand() {
  const brand = document.getElementById('navBrand');
  const homeActive = document.getElementById('screen-setup').classList.contains('active');
  const sub = '<span style="font-size:0.6em; color:#888; font-weight:normal;">线下聚会版</span>';
  brand.innerHTML = homeActive ? '🃏 翻到就死 ' + sub : '← 🃏 翻到就死 ' + sub;
}

// Quick start with recommended defaults
function quickStart() {
  document.getElementById('gridSize').value = 6;
  document.getElementById('playerCount').value = 2;
  document.getElementById('universalCardCount').value = 0;
  document.getElementById('personalCardCount').value = 1;
  updateUniversalCardInputs();
  updateCardPreview();
  goToPlayerSetup();
}

// Toggle advanced settings panel
function toggleAdvancedSettings() {
  const panel = document.getElementById('advancedSettings');
  const arrow = document.getElementById('advancedToggleArrow');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    arrow.textContent = '▲';
  } else {
    panel.style.display = 'none';
    arrow.textContent = '▼';
  }
}

// Update universal card input fields dynamically
function updateUniversalCardInputs() {
  const universalCount = parseInt(document.getElementById('universalCardCount').value) || 0;
  const container = document.getElementById('universalCardInputs');
  
  if (universalCount === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    game.customUniversalCards = [];
    updateCardPreview();
    return;
  }
  
  container.style.display = 'block';
  
  const existingValues = [];
  const existingInputs = container.querySelectorAll('.universal-card-input');
  existingInputs.forEach((input, idx) => {
    if (idx < universalCount) {
      existingValues.push(input.value);
    }
  });
  
  container.innerHTML = '';
  
  for (let i = 0; i < universalCount; i++) {
    const defaultValue = existingValues[i] || `自定义通用牌${i + 1}`;
    const div = document.createElement('div');
    div.className = 'form-group';
    div.style.marginBottom = '8px';
    div.style.marginLeft = '20px';
    div.innerHTML = `
      <label style="font-size: 13px; color: #aaa;">✏️ 自定义通用牌${i + 1}名称：</label>
      <input type="text" class="universal-card-input" data-index="${i}" value="${defaultValue}" 
             placeholder="例如：炸弹、跳过、反转..." oninput="updateCustomUniversalCards()">
    `;
    container.appendChild(div);
  }
  
  updateCustomUniversalCards();
}

function updateCustomUniversalCards() {
  const inputs = document.querySelectorAll('.universal-card-input');
  game.customUniversalCards = [];
  
  inputs.forEach((input, idx) => {
    const value = input.value.trim();
    game.customUniversalCards[idx] = value || `自定义通用牌${idx + 1}`;
  });
  
  updateCardPreview();
}

function updateCardPreview() {
  const universalCount = parseInt(document.getElementById('universalCardCount').value) || 0;
  const personalCount = parseInt(document.getElementById('personalCardCount').value) || 0;
  
  let html = '';
  html += `<div class="preview-card main" style="background:#e94560; color:#fff;">⭐ 主牌</div>`;
  html += `<div class="preview-card special" style="background:#ff9800; color:#fff;">🚫 排除一个</div>`;
  html += `<div class="preview-card special" style="background:#9c27b0; color:#fff;">🔄 重新放置</div>`;
  
  for (let i = 0; i < universalCount; i++) {
    const cardName = game.customUniversalCards[i] || `自定义通用牌${i + 1}`;
    html += `<div class="preview-card" style="background:#3498db; color:#fff;">️ ${cardName}</div>`;
  }
  
  for (let i = 0; i < personalCount; i++) {
    html += `<div class="preview-card" style="background:#27ae60; color:#fff;">📝 个人牌${i+1}（藏匿时编辑）</div>`;
  }
  
  document.getElementById('cardPreview').innerHTML = html;
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// Toggle reveal phase log
function toggleRevealLog() {
  const logArea = document.getElementById('logArea');
  const arrow = document.getElementById('revealLogArrow');
  if (logArea.style.display === 'none') {
    logArea.style.display = 'block';
    arrow.textContent = '▲';
  } else {
    logArea.style.display = 'none';
    arrow.textContent = '▼';
  }
}

// Rules Modal Control
function showRulesModal() {
  const modal = document.getElementById('rulesModal');
  if (modal) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling
  }
}

function hideRulesModal() {
  const modal = document.getElementById('rulesModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
  }
}
