// WebSocket connection and server messages
// ============================================================
//  WEBSOCKET
// ============================================================
function connectWebSocket(onConnect) {
  if (ws && ws.readyState === WebSocket.OPEN) { onConnect && onConnect(); return; }
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${location.host}`;
  ws = new WebSocket(wsUrl);

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

function handleMessage(msg) {
  switch (msg.type) {
    case 'connected':
      myPlayerId = msg.playerId;
      break;
    case 'rejoin_failed':
      localStorage.removeItem('bota_last_room_id');
      break;
    case 'room_created':
      myRoomId = msg.roomId;
      localStorage.setItem('bota_last_room_id', myRoomId);
      isHost = true;
      roomState = msg.state;
      showLobbyRoom(msg.state);
      break;
    case 'room_joined':
      myRoomId = msg.roomId;
      localStorage.setItem('bota_last_room_id', myRoomId);
      isHost = false;
      roomState = msg.state;
      showLobbyRoom(msg.state);
      break;
    case 'room_update':
    case 'player_joined':
    case 'player_left':
      roomState = msg.state;
      updateLobbyUI(msg.state);
      break;
    case 'game_start':
      roomState = msg.state;
      if (msg.state?.id) localStorage.setItem('bota_last_room_id', msg.state.id);
      startGameClient(msg.state);
      break;
    case 'world_state':
      syncWorldState(msg);
      break;
    case 'tower_shot':
      towerShots.push({ ...msg, life: 14, maxLife: 14 });
      break;
    case 'game_over':
      gameWinner = msg.winner;
      gameRunning = false;
      isAlive = false;
      if (respawnTimer) {
        clearInterval(respawnTimer);
        respawnTimer = null;
      }
      document.getElementById('controls-hint')?.classList.remove('visible');
      document.getElementById('death-overlay')?.classList.remove('visible');
      document.getElementById('scoreboard')?.classList.remove('visible');
      showKillBanner({ name: msg.winner === myPlayer?.teamId ? 'YOUR TEAM' : 'ENEMY TEAM' }, { name: 'ANCIENT' });
      showGameSummary(msg.winner);
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
          setPlayerAction(remotePlayers[msg.playerId], msg.action);
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
