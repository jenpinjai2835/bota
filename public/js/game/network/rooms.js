// Room creation, joining, and lobby UI
// ============================================================
//  ROOM MANAGEMENT
// ============================================================
function createRoom() {
  send({ type: 'create_room', name: myName, character: myCharId, stage: 1 });
}

function refreshRoomList() {
  const list = document.getElementById('online-room-list');
  if (list) list.innerHTML = '<div class="empty-room-list">กำลังค้นหาห้อง...</div>';
  send({ type: 'get_rooms' });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function renderRoomList(rooms) {
  const list = document.getElementById('online-room-list');
  if (!list) return;

  const openRooms = rooms.filter(room => room.players < room.maxPlayers);
  if (openRooms.length === 0) {
    list.innerHTML = '<div class="empty-room-list">ยังไม่มีห้องที่ join ได้</div>';
    return;
  }

  list.innerHTML = '';
  openRooms.forEach(room => {
    const stageName = STAGES.find(stage => stage.id === room.stage)?.name || `Stage ${room.stage}`;
    const row = document.createElement('div');
    row.className = 'online-room-row';
    row.innerHTML = `
      <div class="online-room-main">
        <div class="online-room-code">${escapeHtml(room.id)}</div>
        <div class="online-room-meta">${escapeHtml(stageName)} · Host: ${escapeHtml(room.hostName)}</div>
      </div>
      <div class="online-room-count">${room.players}/${room.maxPlayers}</div>
      <button class="online-room-join" type="button">Join</button>
    `;
    row.querySelector('.online-room-join').onclick = () => joinOnlineRoom(room.id);
    list.appendChild(row);
  });
}

function joinOnlineRoom(roomId) {
  document.getElementById('lobby-error').textContent = '';
  send({ type: 'join_room', roomId, name: myName, character: myCharId });
}

function joinRoom() {
  const code = document.getElementById('input-room-code').value.trim().toUpperCase();
  if (!code || code.length !== 6) { document.getElementById('lobby-error').textContent = 'รหัสต้อง 6 ตัว'; return; }
  send({ type: 'join_room', roomId: code, name: myName, character: myCharId });
}

function showLobbyRoom(state) {
  showScreen('screen-lobby-room');
  document.getElementById('display-room-code').textContent = state.id;

  // stage buttons (host only)
  const stageSection = document.getElementById('stage-section');
  const stageSelect = document.getElementById('stage-select');
  if (isHost) {
    stageSection.style.display = 'block';
    stageSelect.innerHTML = '';
    STAGES.forEach(st => {
      const b = document.createElement('button');
      b.className = 'stage-btn' + (st.id === state.stage ? ' active' : '');
      b.textContent = st.name;
      b.onclick = () => {
        document.querySelectorAll('.stage-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        send({ type: 'change_stage', stage: st.id });
      };
      stageSelect.appendChild(b);
    });
  } else {
    stageSection.style.display = 'none';
  }

  document.getElementById('host-controls').style.display = isHost ? 'block' : 'none';
  document.getElementById('guest-controls').style.display = isHost ? 'none' : 'block';
  updateLobbyUI(state);
}

function updateLobbyUI(state) {
  roomState = state;
  const list = document.getElementById('player-list');
  document.getElementById('lobby-title').textContent = `ห้องรอเกม (${state.players.length}/5)`;
  list.innerHTML = '';
  state.players.forEach(p => {
    const ch = CHARACTERS.find(c => c.id === p.character) || CHARACTERS[0];
    const isMe = p.id === myPlayerId;
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `
      <span class="picon">${ch.icon}</span>
      <div>
        <div class="pname">${p.name}${isMe ? ' (คุณ)' : ''} ${p.id === state.host ? '<span class="phost">HOST</span>' : ''}</div>
        <div class="pchar">${ch.name} · ${ch.class}</div>
      </div>
      <div style="margin-left:auto;text-align:right">
        <div class="pready ${p.ready || p.id === state.host ? 'yes' : 'no'}">${p.ready || p.id === state.host ? '✓ พร้อม' : '○ รอ'}</div>
      </div>
    `;
    list.appendChild(row);
  });

  // Update stage buttons
  if (isHost) {
    document.querySelectorAll('.stage-btn').forEach((b, i) => {
      b.classList.toggle('active', STAGES[i]?.id === state.stage);
    });
  } else {
    const stageName = STAGES.find(s => s.id === state.stage)?.name || '';
    document.getElementById('lobby-info').textContent = stageName ? `ด่าน: ${stageName}` : '';
  }

  const allReady = state.players.filter(p => p.id !== state.host).every(p => p.ready);
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.disabled = state.players.length < 1;
    startBtn.style.opacity = allReady ? '1' : '0.6';
  }
}

function toggleReady() {
  isReady = !isReady;
  send({ type: 'set_ready', ready: isReady });
  document.getElementById('ready-btn').textContent = isReady ? '✓ พร้อมแล้ว!' : '○ ยังไม่พร้อม';
  document.getElementById('ready-btn').style.color = isReady ? '#4CAF50' : '';
  document.getElementById('ready-btn').style.borderColor = isReady ? '#4CAF50' : '';
}

function startGame() { send({ type: 'start_game' }); }
