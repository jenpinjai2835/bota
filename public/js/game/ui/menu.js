// Character menu and screen switching
// ============================================================
//  CHARACTER GRID (MENU)
// ============================================================
function buildCharGrid() {
  const grid = document.getElementById('char-grid');
  grid.innerHTML = '';
  CHARACTERS.forEach(ch => {
    const card = document.createElement('div');
    const locked = ch.id !== 'dragonfist';
    card.className = 'char-card' + (ch.id === myCharId ? ' selected' : '') + (locked ? ' locked' : '');
    card.innerHTML = `<div class="char-icon">${ch.icon}</div><div class="char-name">${ch.name}</div><div class="char-class">${ch.class}</div>`;
    card.onclick = () => {
      if (locked) return;
      myCharId = ch.id;
      document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    };
    grid.appendChild(card);
  });
}
buildCharGrid();

// ============================================================
//  SCREEN MANAGEMENT
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function goToLobbyMenu() {
  const name = document.getElementById('input-name').value.trim();
  if (!name) { document.getElementById('menu-error').textContent = 'กรุณาใส่ชื่อก่อนนะ!'; return; }
  myName = name;
  document.getElementById('menu-error').textContent = '';
  connectWebSocket(() => {
    const lastRoomId = localStorage.getItem('bota_last_room_id');
    if (lastRoomId) send({ type: 'rejoin_session', roomId: lastRoomId, sessionToken: mySessionToken });
    showScreen('screen-lobby-select');
    refreshRoomList();
  });
}
