// WebSocket connection and server messages
// ============================================================
//  WEBSOCKET
// ============================================================
function connectWebSocket(onConnect) {
  if (ws && ws.readyState === WebSocket.OPEN) { onConnect && onConnect(); return; }
  if (ws && ws.readyState === WebSocket.CONNECTING) return;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${location.host}`;
  ws = new WebSocket(wsUrl);
  const socket = ws;
  setTimeout(() => installReconnectSocketHandlers(socket), 0);

  ws.onopen = () => { onConnect && onConnect(); };
  ws.onmessage = (e) => handleMessage(JSON.parse(e.data));
  ws.onerror = () => { showError('เชื่อมต่อ Server ไม่ได้ กรุณาลองใหม่'); };
  ws.onclose = () => {
    if (gameRunning) addChat('System', 'หลุดการเชื่อมต่อ...');
  };
}

function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function installReconnectSocketHandlers(socket) {
  if (!socket || socket !== ws) return;
  socket.onerror = () => {
    if (!reconnecting) showError('Cannot connect to server. Please try again.');
  };
  socket.onclose = () => {
    if (socket === ws) ws = null;
    if (shouldReconnectSession()) {
      startReconnectFlow();
    } else if (gameRunning) {
      addChat('System', 'Connection lost...');
    }
  };
}

function getReconnectRoomId() {
  return myRoomId || roomState?.id || localStorage.getItem('bota_last_room_id') || '';
}

function shouldReconnectSession() {
  const roomId = getReconnectRoomId();
  return Boolean(roomId && mySessionToken && (gameRunning || roomState?.status === 'playing' || roomState?.status === 'loading'));
}

function showReconnectPopup(text = 'Trying to restore server connection...') {
  const overlay = document.getElementById('reconnect-overlay');
  const status = document.getElementById('reconnect-status');
  if (status) status.textContent = text;
  overlay?.classList.add('visible');
}

function hideReconnectPopup() {
  document.getElementById('reconnect-overlay')?.classList.remove('visible');
}

function stopReconnectFlow() {
  reconnecting = false;
  reconnectAttempt = 0;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  hideReconnectPopup();
}

function startReconnectFlow() {
  if (!reconnecting) {
    reconnecting = true;
    reconnectAttempt = 0;
    if (gameRunning) addChat('System', 'Connection lost. Reconnecting...');
  }
  showReconnectPopup();
  scheduleReconnectAttempt(600);
}

function scheduleReconnectAttempt(delay = 1200) {
  if (!reconnecting) return;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    attemptReconnectSession();
  }, delay);
}

function attemptReconnectSession() {
  if (!reconnecting) return;
  const roomId = getReconnectRoomId();
  if (!roomId || !mySessionToken) {
    stopReconnectFlow();
    return;
  }
  reconnectAttempt += 1;
  showReconnectPopup(`Trying to restore server connection... attempt ${reconnectAttempt}`);
  connectWebSocket(() => {
    send({ type: 'rejoin_session', roomId, sessionToken: mySessionToken });
  });
  scheduleReconnectAttempt(Math.min(5000, 1000 + reconnectAttempt * 650));
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'connected':
      myPlayerId = msg.playerId;
      if (reconnecting) showReconnectPopup('Connected. Syncing match state...');
      break;
    case 'rejoin_failed':
      localStorage.removeItem('bota_last_room_id');
      if (reconnecting) {
        stopReconnectFlow();
        showError('Reconnect failed. Please return to the lobby.');
      }
      break;
    case 'room_created':
      stopReconnectFlow();
      myRoomId = msg.roomId;
      localStorage.setItem('bota_last_room_id', myRoomId);
      isHost = true;
      roomState = msg.state;
      showLobbyRoom(msg.state);
      break;
    case 'room_joined':
      stopReconnectFlow();
      myRoomId = msg.roomId;
      localStorage.setItem('bota_last_room_id', myRoomId);
      isHost = false;
      roomState = msg.state;
      showLobbyRoom(msg.state);
      break;
    case 'room_left':
      returnToRoomSelect();
      break;
    case 'room_update':
    case 'player_joined':
    case 'player_left':
      isHost = msg.state?.host === myPlayerId;
      roomState = msg.state;
      updateLobbyUI(msg.state);
      break;
    case 'asset_loading_start':
      roomState = msg.state;
      if (msg.state?.id) localStorage.setItem('bota_last_room_id', msg.state.id);
      showAssetLoadingScreen(msg.state);
      startMatchAssetLoading(msg.state);
      break;
    case 'asset_progress':
      roomState = msg.state;
      updateAssetLoadingUI(msg.state);
      break;
    case 'game_start':
      stopReconnectFlow();
      roomState = msg.state;
      if (msg.state?.id) {
        myRoomId = msg.state.id;
        localStorage.setItem('bota_last_room_id', msg.state.id);
      }
      startGameClient(msg.state);
      break;
    case 'world_state':
      syncWorldState(msg);
      break;
    case 'tower_shot':
      towerShots.push({ ...msg, life: Math.max(1, Math.round((msg.travelMs || 560) / 16)), maxLife: Math.max(1, Math.round((msg.travelMs || 560) / 16)), startedAt: Date.now() });
      break;
    case 'unit_death':
      handleWorldUnitDeath(msg);
      break;
    case 'objective_destroyed':
      handleObjectiveDestroyed(msg);
      break;
    case 'unit_hit_confirmed':
      handleWorldUnitHitConfirmed(msg);
      break;
    case 'game_over':
      gameWinner = msg.winner;
      if (Array.isArray(msg.scores)) {
        scores = {};
        msg.scores.forEach(s => { scores[s.id] = s; });
      }
      showKillBanner({ name: msg.winner === myPlayer?.teamId ? 'YOUR TEAM' : 'ENEMY TEAM' }, { name: 'ANCIENT' });
      if (typeof beginCinematicPause === 'function') beginCinematicPause('game-end', msg.winner, {});
      else showGameSummary(msg.winner);
      break;
    case 'player_state':
      if (remotePlayers[msg.playerId]) {
        Object.assign(remotePlayers[msg.playerId], {
          x: msg.x,
          y: msg.y,
          vx: msg.vx,
          vy: msg.vy,
          facing: msg.facing,
          state: msg.hp <= 0 ? 'dead' : msg.state,
          hp: msg.hp,
        });
        if (msg.action) {
          setPlayerAction(remotePlayers[msg.playerId], msg.action, undefined, msg.actionVariant || null);
          spawnEffect(msg.x, msg.y, msg.action, remotePlayers[msg.playerId].charData?.color || '#fff');
        }
      }
      break;
    case 'player_hit':
      handleHitEffect(msg);
      if (msg.hp <= 0) {
        const key = `${msg.attackerId}:${msg.targetId}:${msg.skillId}:${msg.damage}`;
        const killer = getPlayerById(msg.attackerId);
        const victim = getPlayerById(msg.targetId);
        const now = Date.now();
        if (killer && victim && (key !== lastKillAnnouncementKey || now - lastKillAnnouncementAt > 1500)) {
          lastKillAnnouncementKey = key;
          lastKillAnnouncementAt = now;
          showKillBanner(killer, victim);
        }
      }
      break;
    case 'player_respawn':
      if (msg.playerId === myPlayerId) {
        isAlive = true;
        myPlayer.hp = msg.hp;
        myPlayer.x = msg.x; myPlayer.y = msg.y;
        myPlayer.vx = 0; myPlayer.vy = 0;
        myPlayer.state = 'idle';
        myPlayer.hitStunUntil = 0;
        myPlayer.deathUntil = 0;
        myPlayer.deathStartedAt = 0;
        myPlayer.deathFadeStartedAt = 0;
        myPlayer.deathAngle = 0;
        myPlayer.deathSpin = 0;
        myPlayer.bodyShattered = false;
        document.getElementById('death-overlay').classList.remove('visible');
        if (respawnTimer) clearInterval(respawnTimer);
        respawnTimer = null;
      } else if (remotePlayers[msg.playerId]) {
        remotePlayers[msg.playerId].hp = msg.hp;
        remotePlayers[msg.playerId].x = msg.x;
        remotePlayers[msg.playerId].y = msg.y;
        remotePlayers[msg.playerId].vx = 0;
        remotePlayers[msg.playerId].vy = 0;
        remotePlayers[msg.playerId].state = 'idle';
        remotePlayers[msg.playerId].hitStunUntil = 0;
        remotePlayers[msg.playerId].deathUntil = 0;
        remotePlayers[msg.playerId].deathStartedAt = 0;
        remotePlayers[msg.playerId].deathFadeStartedAt = 0;
        remotePlayers[msg.playerId].deathAngle = 0;
        remotePlayers[msg.playerId].deathSpin = 0;
        remotePlayers[msg.playerId].bodyShattered = false;
      }
      break;
    case 'score_update':
      scores = {};
      msg.scores.forEach(s => { scores[s.id] = s; });
      updateScoreboard();
      updateHUD();
      break;
    case 'xp_award':
      grantPlayerXp(myPlayer, msg.amount || 0);
      updateHUD();
      updateSkillsBar();
      break;
    case 'skill_cast':
      handleRemoteSkill(msg);
      break;
    case 'item_picked':
      handleMatchItemPicked(msg);
      break;
    case 'item_spawned':
      handleMatchItemSpawned(msg.item);
      break;
    case 'test_mode':
      testModeState.immortal = !!msg.immortal;
      if (myPlayer && msg.immortal) {
        myPlayer.hp = myPlayer.maxHp;
        myPlayer.mana = myPlayer.maxMana;
      }
      updateTestModePanel();
      break;
    case 'chat':
      if (msg.fromId && mutedChatPlayerIds.has(msg.fromId)) break;
      addChat(msg.from, msg.msg);
      break;
    case 'room_list':
      renderRoomList(msg.rooms || []);
      break;
    case 'error':
      showError(msg.msg);
      break;
  }
}

function showError(msg) {
  ['menu-error','lobby-error','room-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  });
}
