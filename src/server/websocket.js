const WebSocket = require('ws');

function createPlayerId() {
  return `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
}

function setupWebSocket(server, rooms) {
  const wss = new WebSocket.Server({ server });
  const clients = new Map();
  const worldLoops = new Map();
  const ASSIST_WINDOW_MS = 8000;
  const UNIT_DEATH_XP = 110;
  const CREEP_DEATH_XP = 38;
  const XP_SHARE_RADIUS = 280;
  const CREEP_WAVE_MS = 8500;
  const CREEP_LIMIT_PER_TEAM = 12;
  const CREEP_TYPES = ['monster_6', 'monster_7', 'monster_8'];
  const TEAM_IDS = ['sun', 'moon'];
  const TEAM_DIR = { sun: 1, moon: -1 };
  const CREEP_SPAWN = {
    sun: { x: 260, y: 478 },
    moon: { x: 2218, y: 478 },
  };

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
    if (attackerId) sendTo(attackerId, { type: 'score_update', scores });
  }

  function unitWidth(unit) {
    return Number(unit?.width || unit?.w || 40);
  }

  function unitHeight(unit) {
    return Number(unit?.height || unit?.h || 56);
  }

  function unitFoot(unit) {
    return {
      x: (Number(unit?.x) || 0) + unitWidth(unit) / 2,
      y: (Number(unit?.y) || 0) + unitHeight(unit),
    };
  }

  function distanceBetween(a, b) {
    const af = unitFoot(a);
    const bf = unitFoot(b);
    const ax = af.x;
    const ay = af.y;
    const bx = bf.x;
    const by = bf.y;
    const dx = ax - bx;
    const dy = (ay - by) * 1.45;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function awardUnitDeathXp(room, target, attacker, xpAmount = UNIT_DEATH_XP) {
    if (!room || !target || !attacker?.teamId) return;
    const recipients = room.players
      .map(pid => room.playerData[pid])
      .filter(player =>
        player &&
        !player.isAI &&
        player.teamId === attacker.teamId &&
        player.hp > 0 &&
        distanceBetween(player, target) <= XP_SHARE_RADIUS
      );
    if (!recipients.length) return;

    const amount = Math.max(1, Math.floor(xpAmount / recipients.length));
    recipients.forEach(player => sendTo(player.id, {
      type: 'xp_award',
      amount,
      source: 'unit_death',
      targetId: target.id,
      sharedWith: recipients.length,
    }));
  }

  function getLivingObjectives(room, teamId = null) {
    return (room.objectives || []).filter(obj => obj.hp > 0 && (!teamId || obj.teamId === teamId));
  }

  function spawnCreep(room, teamId) {
    const existing = (room.creeps || []).filter(creep => creep.teamId === teamId && creep.hp > 0).length;
    if (existing >= CREEP_LIMIT_PER_TEAM) return;
    const spawn = CREEP_SPAWN[teamId];
    const type = CREEP_TYPES[(room.creepSeq || 0) % CREEP_TYPES.length];
    room.creepSeq = (room.creepSeq || 0) + 1;
    room.creeps.push({
      id: `cr_${teamId}_${Date.now()}_${room.creepSeq}`,
      type,
      teamId,
      x: spawn.x,
      y: spawn.y + ((room.creepSeq % 3) - 1) * 28,
      w: 42,
      h: 42,
      hp: 125,
      maxHp: 125,
      damage: 16,
      speed: 2.15,
      range: 34,
      attackAt: 0,
      state: 'walk',
      facing: TEAM_DIR[teamId],
    });
  }

  function findNearestEnemyUnit(room, creep) {
    const enemyCreeps = (room.creeps || []).filter(other => other.hp > 0 && other.teamId !== creep.teamId);
    const enemyObjectives = getLivingObjectives(room).filter(obj => obj.teamId !== creep.teamId);
    return [...enemyCreeps, ...enemyObjectives]
      .map(unit => ({ unit, distance: distanceBetween(creep, unit) }))
      .sort((a, b) => a.distance - b.distance)[0]?.unit || null;
  }

  function damageCreep(room, creep, amount, attacker = null) {
    if (!creep || creep.hp <= 0) return false;
    creep.hp = Math.max(0, creep.hp - amount);
    if (creep.hp > 0) return false;
    creep.state = 'dead';
    if (attacker) awardUnitDeathXp(room, creep, attacker, CREEP_DEATH_XP);
    return true;
  }

  function damageObjective(room, objective, amount) {
    if (!objective || objective.hp <= 0) return;
    objective.hp = Math.max(0, objective.hp - amount);
    if (objective.type === 'ancient' && objective.hp <= 0 && !room.winner) {
      room.winner = objective.teamId === 'sun' ? 'moon' : 'sun';
    }
  }

  function tickWorld(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return stopWorldLoop(roomId);
    const now = Date.now();

    if (!room.nextCreepWaveAt || now >= room.nextCreepWaveAt) {
      TEAM_IDS.forEach(teamId => {
        for (let i = 0; i < 3; i++) spawnCreep(room, teamId);
      });
      room.nextCreepWaveAt = now + CREEP_WAVE_MS;
    }

    (room.creeps || []).forEach(creep => {
      if (creep.hp <= 0) return;
      const target = findNearestEnemyUnit(room, creep);
      if (!target) return;
      const creepFoot = unitFoot(creep);
      const targetFoot = unitFoot(target);
      const dir = Math.sign(targetFoot.x - creepFoot.x) || TEAM_DIR[creep.teamId];
      creep.facing = dir;
      const dist = distanceBetween(creep, target);
      if (dist > creep.range) {
        creep.state = 'walk';
        creep.x += dir * creep.speed;
        creep.y += Math.sign(targetFoot.y - creepFoot.y) * Math.min(1.25, Math.abs(targetFoot.y - creepFoot.y));
      } else if ((creep.attackAt || 0) <= now) {
        creep.state = 'attack';
        creep.attackAt = now + 900;
        if (target.id?.startsWith?.('cr_')) damageCreep(room, target, creep.damage, creep);
        else damageObjective(room, target, creep.damage);
      }
    });

    getLivingObjectives(room).forEach(obj => {
      if (obj.type !== 'tower' || (obj.attackAt || 0) > now) return;
      const target = (room.creeps || [])
        .filter(creep => creep.hp > 0 && creep.teamId !== obj.teamId && distanceBetween(obj, creep) <= (obj.range || 170))
        .sort((a, b) => distanceBetween(obj, a) - distanceBetween(obj, b))[0];
      if (!target) return;
      obj.attackAt = now + 1100;
      damageCreep(room, target, obj.damage || 30, obj);
      room.players.forEach(pid => sendTo(pid, {
        type: 'tower_shot',
        from: { x: obj.x + obj.w / 2, y: obj.y + obj.h * 0.35 },
        to: { x: target.x + target.w / 2, y: target.y + target.h * 0.45 },
        teamId: obj.teamId,
      }));
    });

    room.creeps = (room.creeps || []).filter(creep => creep.hp > 0);
    room.players.forEach(pid => sendTo(pid, {
      type: 'world_state',
      creeps: room.creeps || [],
      objectives: room.objectives || [],
      winner: room.winner || null,
    }));
    if (room.winner) {
      room.status = 'finished';
      sendScores(roomId);
      room.players.forEach(pid => sendTo(pid, { type: 'game_over', winner: room.winner }));
      stopWorldLoop(roomId);
    }
  }

  function startWorldLoop(roomId) {
    stopWorldLoop(roomId);
    worldLoops.set(roomId, setInterval(() => tickWorld(roomId), 100));
  }

  function stopWorldLoop(roomId) {
    const loop = worldLoops.get(roomId);
    if (loop) clearInterval(loop);
    worldLoops.delete(roomId);
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

  const RESPAWN_DELAY_MS = 10000;

  function scheduleRespawn(roomId, targetId) {
    setTimeout(() => {
      const room = rooms.get(roomId);
      const target = room?.playerData[targetId];
      if (!room || !target) return;

      const spawn = rooms.getTeamRespawnPoint(target.teamId, target.lastRespawnIndex);
      target.lastRespawnIndex = spawn.index;
      target.hp = target.maxHp;
      target.x = spawn.x;
      target.y = spawn.y;
      target.vx = 0;
      target.vy = 0;
      target.state = 'idle';

      room.players.forEach(pid => sendTo(pid, {
        type: 'player_respawn',
        playerId: targetId,
        x: target.x,
        y: target.y,
        hp: target.hp,
      }));
    }, RESPAWN_DELAY_MS);
  }

  function handleMessage(ws, connectionPlayerId, raw) {
    const playerId = ws.playerId || connectionPlayerId;
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'create_room': {
        msg.character = 'dragonfist';
        const roomId = rooms.create(playerId, msg);
        ws.roomId = roomId;
        ws.playerId = playerId;
        ws.sessionToken = msg.sessionToken || null;
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
        msg.character = 'dragonfist';
        const result = rooms.addPlayer(roomId, playerId, msg);
        if (!result.ok) {
          sendTo(playerId, { type: 'error', msg: result.error });
          break;
        }

        if (result.rejoinedPlayerId) {
          clients.delete(connectionPlayerId);
          clients.set(result.rejoinedPlayerId, ws);
          ws.playerId = result.rejoinedPlayerId;
          rooms.reconnectPlayer(roomId, result.rejoinedPlayerId);
          sendTo(result.rejoinedPlayerId, { type: 'connected', playerId: result.rejoinedPlayerId });
        }
        ws.roomId = roomId;
        ws.sessionToken = msg.sessionToken || null;
        sendTo(ws.playerId || playerId, { type: 'room_joined', roomId, state: rooms.getState(roomId), rejoined: !!result.rejoinedPlayerId });
        broadcast(roomId, { type: 'player_joined', state: rooms.getState(roomId) }, ws.playerId || playerId);
        broadcastRoomList();
        break;
      }

      case 'rejoin_session': {
        const roomId = String(msg.roomId || '').toUpperCase();
        const seat = rooms.findReconnectSeat(roomId, msg.sessionToken);
        if (!seat) {
          sendTo(connectionPlayerId, { type: 'rejoin_failed' });
          break;
        }
        clients.delete(connectionPlayerId);
        clients.set(seat.id, ws);
        ws.roomId = roomId;
        ws.playerId = seat.id;
        ws.sessionToken = msg.sessionToken;
        rooms.reconnectPlayer(roomId, seat.id);
        sendTo(seat.id, { type: 'connected', playerId: seat.id });
        sendTo(seat.id, { type: 'game_start', state: rooms.getState(roomId), rejoined: true });
        broadcast(roomId, { type: 'player_joined', state: rooms.getState(roomId) }, seat.id);
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
        const canStart = rooms.canStart(roomId);
        if (!canStart.ok) {
          sendTo(playerId, { type: 'error', msg: canStart.reason });
          break;
        }

        rooms.startGame(roomId);
        const state = rooms.getState(roomId);
        room.players.forEach(pid => sendTo(pid, { type: 'game_start', state }));
        startWorldLoop(roomId);
        broadcastRoomList();
        break;
      }

      case 'add_ai': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room || room.host !== playerId) break;
        rooms.addAI(roomId, msg.teamId);
        broadcast(roomId, { type: 'room_update', state: rooms.getState(roomId) });
        sendTo(playerId, { type: 'room_update', state: rooms.getState(roomId) });
        broadcastRoomList();
        break;
      }

      case 'remove_ai': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room || room.host !== playerId) break;
        rooms.removeAI(roomId, msg.teamId);
        broadcast(roomId, { type: 'room_update', state: rooms.getState(roomId) });
        sendTo(playerId, { type: 'room_update', state: rooms.getState(roomId) });
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
        if (target.hp <= 0) break;
        const attacker = room.playerData[playerId];
        if (attacker?.teamId && target.teamId && attacker.teamId === target.teamId) break;

        target.hp = Math.max(0, target.hp - msg.damage);
        target.recentAttackers = target.recentAttackers || {};
        if (attacker && playerId !== msg.targetId) {
          target.recentAttackers[playerId] = Date.now();
        }

        if (target.hp <= 0) {
          target.deaths = (target.deaths || 0) + 1;
          if (attacker) {
            attacker.kills = (attacker.kills || 0) + 1;
            attacker.score = (attacker.score || 0) + 100;
          }
          awardUnitDeathXp(room, target, attacker);
          const now = Date.now();
          Object.entries(target.recentAttackers || {}).forEach(([assistId, hitAt]) => {
            if (assistId === playerId || now - hitAt > ASSIST_WINDOW_MS) return;
            const assister = room.playerData[assistId];
            if (!assister || assister.teamId !== attacker?.teamId) return;
            assister.assists = (assister.assists || 0) + 1;
            assister.score = (assister.score || 0) + 35;
          });
          target.recentAttackers = {};
          scheduleRespawn(roomId, msg.targetId);
        }

        room.players.forEach(pid => sendTo(pid, {
          type: 'player_hit',
          targetId: msg.targetId,
          attackerId: playerId,
          damage: msg.damage,
          hp: target.hp,
          skillId: msg.skillId,
          hitDir: msg.hitDir || 1,
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

      case 'unit_hit': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'playing') break;
        const attacker = room.playerData[playerId];
        if (!attacker || attacker.hp <= 0) break;
        const damage = Math.max(1, Math.min(500, Number(msg.damage) || 0));
        const unitId = String(msg.unitId || '');
        const creep = (room.creeps || []).find(entry => entry.id === unitId);
        if (creep && creep.teamId !== attacker.teamId) {
          damageCreep(room, creep, damage, attacker);
          break;
        }
        const objective = (room.objectives || []).find(entry => entry.id === unitId);
        if (objective && objective.teamId !== attacker.teamId) {
          damageObjective(room, objective, damage);
        }
        break;
      }

      case 'item_pickup': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'playing') break;
        const player = room.playerData[playerId];
        if (!player || player.hp <= 0) break;
        const item = rooms.pickupItem(roomId, msg.itemId);
        if (!item) break;
        room.players.forEach(pid => sendTo(pid, {
          type: 'item_picked',
          playerId,
          item,
        }));
        setTimeout(() => {
          const spawnedItem = rooms.spawnItem(roomId);
          if (!spawnedItem) return;
          const latestRoom = rooms.get(roomId);
          latestRoom?.players.forEach(pid => sendTo(pid, {
            type: 'item_spawned',
            item: spawnedItem,
          }));
        }, 8000);
        break;
      }

      case 'chat': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room) break;

        const player = room.playerData[playerId];
        room.players.forEach(pid => sendTo(pid, {
          type: 'chat',
          fromId: playerId,
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
      const activePlayerId = ws.playerId || playerId;
      const roomId = ws.roomId;
      const room = rooms.markDisconnected(roomId, activePlayerId);

      if (room) {
        broadcast(roomId, { type: 'player_left', playerId: activePlayerId, state: rooms.getState(roomId) });
      }

      clients.delete(activePlayerId);
      clients.delete(playerId);
      broadcastRoomList();
    });
  });

  return wss;
}

module.exports = { setupWebSocket };
