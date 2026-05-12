const WebSocket = require('ws');

function createPlayerId() {
  return `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
}

function setupWebSocket(server, rooms) {
  const wss = new WebSocket.Server({ server });
  const clients = new Map();

  function sendTo(playerId, message) {
    const ws = clients.get(playerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  function broadcast(roomId, message, excludeId = null) {
    const room = rooms.get(roomId);
    if (!room) return;

    room.players.forEach(pid => {
      if (pid !== excludeId) sendTo(pid, message);
    });
  }

  function sendScores(roomId, attackerId) {
    const scores = rooms.getScores(roomId);
    broadcast(roomId, { type: 'score_update', scores });
    sendTo(attackerId, { type: 'score_update', scores });
  }

  function sendRoomList(playerId) {
    sendTo(playerId, { type: 'room_list', rooms: rooms.listOpenRooms() });
  }

  function broadcastRoomList() {
    const message = { type: 'room_list', rooms: rooms.listOpenRooms() };
    clients.forEach((client, clientId) => {
      if (client.readyState === WebSocket.OPEN) sendTo(clientId, message);
    });
  }

  function scheduleRespawn(roomId, targetId) {
    setTimeout(() => {
      const room = rooms.get(roomId);
      const target = room?.playerData[targetId];
      if (!room || !target) return;

      const spawn = rooms.getRespawnPoint();
      target.hp = target.maxHp;
      target.x = spawn.x;
      target.y = spawn.y;

      room.players.forEach(pid => sendTo(pid, {
        type: 'player_respawn',
        playerId: targetId,
        x: target.x,
        y: target.y,
        hp: target.hp,
      }));
    }, 3000);
  }

  function handleMessage(ws, playerId, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'create_room': {
        const roomId = rooms.create(playerId, msg);
        ws.roomId = roomId;
        ws.playerId = playerId;
        sendTo(playerId, { type: 'room_created', roomId, state: rooms.getState(roomId) });
        broadcastRoomList();
        break;
      }

      case 'get_rooms': {
        sendRoomList(playerId);
        break;
      }

      case 'join_room': {
        const roomId = String(msg.roomId || '').toUpperCase();
        const result = rooms.addPlayer(roomId, playerId, msg);
        if (!result.ok) {
          sendTo(playerId, { type: 'error', msg: result.error });
          break;
        }

        ws.roomId = roomId;
        ws.playerId = playerId;
        sendTo(playerId, { type: 'room_joined', roomId, state: rooms.getState(roomId) });
        broadcast(roomId, { type: 'player_joined', state: rooms.getState(roomId) }, playerId);
        broadcastRoomList();
        break;
      }

      case 'set_ready': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room || !room.playerData[playerId]) break;

        room.playerData[playerId].ready = msg.ready;
        broadcast(roomId, { type: 'room_update', state: rooms.getState(roomId) });
        sendTo(playerId, { type: 'room_update', state: rooms.getState(roomId) });
        break;
      }

      case 'start_game': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room || room.host !== playerId) break;
        if (room.players.length < 1) break;

        rooms.startGame(roomId);
        const state = rooms.getState(roomId);
        room.players.forEach(pid => sendTo(pid, { type: 'game_start', state }));
        broadcastRoomList();
        break;
      }

      case 'player_input': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'playing') break;

        const player = room.playerData[playerId];
        if (!player) break;

        const { x, y, hp, vx, vy, onGround, facing, state: pstate, action } = msg;
        Object.assign(player, { x, y, vx, vy, onGround, facing, state: pstate });
        if (hp !== undefined) player.hp = hp;

        broadcast(roomId, {
          type: 'player_state',
          playerId,
          x,
          y,
          vx,
          vy,
          onGround,
          facing,
          state: pstate,
          hp,
          action,
        }, playerId);
        break;
      }

      case 'player_hit': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'playing') break;

        const target = room.playerData[msg.targetId];
        if (!target) break;

        target.hp = Math.max(0, target.hp - msg.damage);

        if (target.hp <= 0) {
          target.deaths = (target.deaths || 0) + 1;
          const attacker = room.playerData[playerId];
          if (attacker) attacker.score = (attacker.score || 0) + 100;
          scheduleRespawn(roomId, msg.targetId);
        }

        room.players.forEach(pid => sendTo(pid, {
          type: 'player_hit',
          targetId: msg.targetId,
          attackerId: playerId,
          damage: msg.damage,
          hp: target.hp,
          skillId: msg.skillId,
        }));

        sendScores(roomId, playerId);
        break;
      }

      case 'skill_cast': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room) break;

        broadcast(roomId, {
          type: 'skill_cast',
          playerId,
          skillId: msg.skillId,
          x: msg.x,
          y: msg.y,
          facing: msg.facing,
        }, playerId);
        break;
      }

      case 'chat': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room) break;

        const player = room.playerData[playerId];
        room.players.forEach(pid => sendTo(pid, {
          type: 'chat',
          from: player ? player.name : 'Unknown',
          msg: String(msg.msg || '').substr(0, 100),
        }));
        break;
      }

      case 'change_stage': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room || room.host !== playerId) break;

        room.stage = msg.stage;
        broadcast(roomId, { type: 'room_update', state: rooms.getState(roomId) });
        sendTo(playerId, { type: 'room_update', state: rooms.getState(roomId) });
        break;
      }
    }
  }

  wss.on('connection', (ws) => {
    const playerId = createPlayerId();
    clients.set(playerId, ws);

    sendTo(playerId, { type: 'connected', playerId });

    ws.on('message', raw => handleMessage(ws, playerId, raw));
    ws.on('close', () => {
      const roomId = ws.roomId;
      const room = rooms.removePlayer(roomId, playerId);

      if (room) {
        broadcast(roomId, { type: 'player_left', playerId, state: rooms.getState(roomId) });
      }

      clients.delete(playerId);
      broadcastRoomList();
    });
  });

  return wss;
}

module.exports = { setupWebSocket };
