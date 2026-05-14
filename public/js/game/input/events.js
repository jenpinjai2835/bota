// Keyboard, pointer, touch, and resize events
// ============================================================
//  INPUT HANDLING
// ============================================================
document.addEventListener('keydown', (e) => {
  const chatInp = document.getElementById('chat-input');
  const isTypingChat = gameRunning && document.activeElement === chatInp;

  if (!isTypingChat) {
    keys[e.key] = true;
  }

  // Skills
  if (gameRunning && !isTypingChat) {
    if (isJumpKey(e.key)) {
      e.preventDefault();
      tryJump();
    }
    if (e.key === 'z' || e.key === 'Z') trySkill(0);
    if (e.key === 'x' || e.key === 'X') trySkill(1);
    if (e.key === 'c' || e.key === 'C') trySkill(2);
    if (e.key === 'v' || e.key === 'V') trySkill(3);
  }

  // Scoreboard
  if (e.key === 'Tab') {
    e.preventDefault();
    document.getElementById('scoreboard').classList.toggle('visible');
  }

  // Chat
  if (e.key === 'Enter') {
    if (document.activeElement === chatInp) {
      sendChat();
    } else if (gameRunning) {
      openChatInput();
    }
  }
});

document.addEventListener('keyup', (e) => { keys[e.key] = false; });

document.getElementById('game-canvas').addEventListener('pointerdown', (e) => {
  if (!gameRunning) return;
  const chatInp = document.getElementById('chat-input');
  if (document.activeElement === chatInp) closeChatInput();
  const clickedPlayer = getPlayerAtScreenPoint(e.clientX, e.clientY);
  focusPlayer(clickedPlayer?.id || myPlayer?.id || null);
});

function getPlayerAtScreenPoint(screenX, screenY) {
  const canvas = document.getElementById('game-canvas');
  const rect = canvas.getBoundingClientRect();
  const x = screenX - rect.left;
  const y = screenY - rect.top;
  const scaleX = canvas.width / WORLD_W;
  const scaleY = canvas.height / WORLD_H;
  const candidates = [...Object.values(remotePlayers), myPlayer].filter(Boolean);
  for (let i = candidates.length - 1; i >= 0; i--) {
    const p = candidates[i];
    const px = p.x * scaleX;
    const py = p.y * scaleY;
    const pw = p.width * scaleX;
    const ph = p.height * scaleY;
    const padX = Math.max(18, pw * 0.65);
    const padTop = Math.max(26, ph * 0.9);
    if (
      x >= px - padX &&
      x <= px + pw + padX &&
      y >= py - padTop &&
      y <= py + ph + 12
    ) {
      return p;
    }
  }
  return null;
}

// Mobile touch controls (basic)
let touchStartX = null, touchStartY = null;
document.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!gameRunning) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < 40 && dy < -40) tryJump();
}, { passive: true });

// Window resize
window.addEventListener('resize', () => {
  const canvas = document.getElementById('game-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});
