// Room creation, joining, and lobby UI
function createRoom() {
  send({ type: 'create_room', name: myName, character: 'dragonfist', stage: 1, sessionToken: mySessionToken, teamId: 'sun' });
}

function refreshRoomList() {
  const list = document.getElementById('online-room-list');
  if (list) list.innerHTML = '<div class="empty-room-list">Searching rooms...</div>';
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
    list.innerHTML = '<div class="empty-room-list">No joinable rooms</div>';
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
  send({ type: 'join_room', roomId, name: myName, character: 'dragonfist', sessionToken: mySessionToken, teamId: 'moon' });
}

function joinRoom() {
  const code = document.getElementById('input-room-code').value.trim().toUpperCase();
  if (!code || code.length !== 6) {
    document.getElementById('lobby-error').textContent = 'Room code must be 6 characters';
    return;
  }
  send({ type: 'join_room', roomId: code, name: myName, character: 'dragonfist', sessionToken: mySessionToken, teamId: 'moon' });
}

function showLobbyRoom(state) {
  showScreen('screen-lobby-room');
  document.getElementById('display-room-code').textContent = state.id;

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
  const counts = getLobbyTeamCounts(state);
  document.getElementById('lobby-title').textContent = `Lobby (${counts.sun} v ${counts.moon})`;
  list.innerHTML = '';

  ['sun', 'moon'].forEach(teamId => {
    const teamPlayers = state.players.filter(p => p.teamId === teamId);
    const col = document.createElement('div');
    col.className = `team-column team-${teamId}`;
    col.innerHTML = `
      <div class="team-head"><span>${teamId === 'sun' ? 'Team 1' : 'Team 2'}</span><span>${teamPlayers.length}</span></div>
      <div class="team-list"></div>
      ${isHost ? `<div class="team-actions"><button type="button" onclick="addAI('${teamId}')">+ AI</button><button type="button" onclick="removeAI('${teamId}')">- AI</button></div>` : ''}
    `;
    const teamList = col.querySelector('.team-list');
    teamPlayers.forEach(p => teamList.appendChild(buildLobbyPlayerRow(p, state)));
    list.appendChild(col);
  });

  if (isHost) {
    document.querySelectorAll('.stage-btn').forEach((b, i) => {
      b.classList.toggle('active', STAGES[i]?.id === state.stage);
    });
  } else {
    const stageName = STAGES.find(s => s.id === state.stage)?.name || '';
    document.getElementById('lobby-info').textContent = stageName ? `Stage: ${stageName}` : '';
  }

  const allReady = state.players.filter(p => p.id !== state.host && !p.isAI).every(p => p.ready);
  const balanced = counts.sun > 0 && counts.sun === counts.moon;
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.disabled = !balanced || !allReady;
    startBtn.style.opacity = balanced && allReady ? '1' : '0.45';
  }
  document.getElementById('room-error').textContent = balanced ? '' : 'Team sizes must match before starting';
}

function buildLobbyPlayerRow(p, state) {
  const ch = CHARACTERS.find(c => c.id === p.character) || CHARACTERS[0];
  const isMe = p.id === myPlayerId;
  const row = document.createElement('div');
  row.className = 'player-row' + (p.isAI ? ' ai-row' : '') + (!p.connected && !p.isAI ? ' disconnected' : '');
  row.innerHTML = `
    <span class="picon">${ch.icon}</span>
    <div>
      <div class="pname">${escapeHtml(p.name)}${isMe ? ' (คุณ)' : ''} ${p.id === state.host ? '<span class="phost">HOST</span>' : ''}</div>
      <div class="pchar">${p.isAI ? 'AI · ' : ''}${ch.class}${!p.connected && !p.isAI ? ' · reconnectable' : ''}</div>
    </div>
    <div style="margin-left:auto;text-align:right">
      <div class="pready ${p.ready || p.id === state.host || p.isAI ? 'yes' : 'no'}">${p.ready || p.id === state.host || p.isAI ? 'READY' : 'WAIT'}</div>
    </div>
  `;
  return row;
}

function getLobbyTeamCounts(state) {
  return {
    sun: state.players.filter(p => p.teamId === 'sun').length,
    moon: state.players.filter(p => p.teamId === 'moon').length,
  };
}

function addAI(teamId) {
  send({ type: 'add_ai', teamId });
}

function removeAI(teamId) {
  send({ type: 'remove_ai', teamId });
}

function toggleReady() {
  isReady = !isReady;
  send({ type: 'set_ready', ready: isReady });
  document.getElementById('ready-btn').textContent = isReady ? 'READY!' : 'NOT READY';
  document.getElementById('ready-btn').style.color = isReady ? '#4CAF50' : '';
  document.getElementById('ready-btn').style.borderColor = isReady ? '#4CAF50' : '';
}

function startGame() {
  send({ type: 'start_game' });
}

function showAssetLoadingScreen(state) {
  showScreen('screen-loading');
  updateAssetLoadingUI(state);
}

function updateAssetLoadingUI(state = roomState) {
  if (!state) return;
  const progress = state.assetProgress || {};
  const players = state.players || [];
  const humanPlayers = players.filter(player => !player.isAI);
  const average = humanPlayers.length
    ? humanPlayers.reduce((sum, player) => sum + (progress[player.id] || 0), 0) / humanPlayers.length
    : 100;
  const pct = Math.max(0, Math.min(100, Math.round(average)));
  const fill = document.getElementById('loading-progress-fill');
  const text = document.getElementById('loading-progress-text');
  const list = document.getElementById('loading-player-list');
  if (fill) fill.style.width = `${pct}%`;
  if (text) text.textContent = `${pct}%`;
  if (!list) return;
  list.innerHTML = players.map(player => {
    const playerPct = player.isAI ? 100 : Math.max(0, Math.min(100, progress[player.id] || 0));
    return `
      <div class="loading-player-row">
        <div class="loading-player-name">${escapeHtml(player.name)}${player.id === myPlayerId ? ' (YOU)' : ''}${player.isAI ? ' · AI' : ''}</div>
        <div class="loading-player-bar"><div class="loading-player-fill" style="width:${playerPct}%"></div></div>
        <div class="loading-player-percent">${playerPct}%</div>
      </div>
    `;
  }).join('');
}

async function startMatchAssetLoading(state) {
  if (!state?.id || assetLoadingStartedForRoomId === state.id) return;
  assetLoadingStartedForRoomId = state.id;
  const startedAt = Date.now();
  const urls = collectMatchAssetUrls();
  const total = Math.max(1, urls.length);
  let loaded = 0;
  const report = () => {
    const progress = Math.min(99, Math.round((loaded / total) * 100));
    send({ type: 'asset_progress', progress });
  };
  report();
  for (const url of urls) {
    await loadAssetUrl(url);
    loaded += 1;
    report();
  }
  preloadSpriteAssets();
  preloadMonsterAssets();
  const elapsed = Date.now() - startedAt;
  if (elapsed < 900) {
    await new Promise(resolve => setTimeout(resolve, 900 - elapsed));
  }
  send({ type: 'asset_progress', progress: 100 });
}
