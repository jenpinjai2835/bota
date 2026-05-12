const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const wss = new WebSocket.Server({ server });

const rooms = new Map();
const clients = new Map();

function generateRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function broadcast(roomId, message, excludeId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const msg = JSON.stringify(message);
  room.players.forEach(pid => {
    if (pid !== excludeId) {
      const ws = clients.get(pid);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  });
}

function sendTo(playerId, message) {
  const ws = clients.get(playerId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function getRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return {
    id: roomId,
    host: room.host,
    stage: room.stage,
    status: room.status,
    players: room.players.map(pid => room.playerData[pid]),
  };
}

wss.on('connection', (ws) => {
  const playerId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  clients.set(playerId, ws);

  ws.send(JSON.stringify({ type: 'connected', playerId }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'create_room': {
        const roomId = generateRoomId();
        rooms.set(roomId, {
          host: playerId,
          stage: msg.stage || 1,
          status: 'lobby',
          players: [playerId],
          playerData: {
            [playerId]: {
              id: playerId,
              name: msg.name,
              character: msg.character,
              ready: false,
              x: 200, y: 400, hp: 100, maxHp: 100,
              facing: 1, state: 'idle',
              vx: 0, vy: 0, onGround: true,
              score: 0, deaths: 0,
            }
          },
          gameState: null,
        });
        ws.roomId = roomId;
        ws.playerId = playerId;
        sendTo(playerId, { type: 'room_created', roomId, state: getRoomState(roomId) });
        break;
      }

      case 'join_room': {
        const roomId = msg.roomId.toUpperCase();
        const room = rooms.get(roomId);
        if (!room) { sendTo(playerId, { type: 'error', msg: 'ไม่พบห้องนี้' }); break; }
        if (room.status !== 'lobby') { sendTo(playerId, { type: 'error', msg: 'เกมเริ่มแล้ว' }); break; }
        if (room.players.length >= 5) { sendTo(playerId, { type: 'error', msg: 'ห้องเต็มแล้ว (สูงสุด 5 คน)' }); break; }

        room.players.push(playerId);
        room.playerData[playerId] = {
          id: playerId,
          name: msg.name,
          character: msg.character,
          ready: false,
          x: 200 + room.players.length * 80, y: 400,
          hp: 100, maxHp: 100,
          facing: 1, state: 'idle',
          vx: 0, vy: 0, onGround: true,
          score: 0, deaths: 0,
        };
        ws.roomId = roomId;
        ws.playerId = playerId;

        sendTo(playerId, { type: 'room_joined', roomId, state: getRoomState(roomId) });
        broadcast(roomId, { type: 'player_joined', state: getRoomState(roomId) }, playerId);
        break;
      }

      case 'set_ready': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room || !room.playerData[playerId]) break;
        room.playerData[playerId].ready = msg.ready;
        broadcast(roomId, { type: 'room_update', state: getRoomState(roomId) });
        sendTo(playerId, { type: 'room_update', state: getRoomState(roomId) });
        break;
      }

      case 'start_game': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room || room.host !== playerId) break;
        if (room.players.length < 1) break;

        room.status = 'playing';
        const spawnPoints = [
          { x: 150, y: 380 }, { x: 350, y: 380 }, { x: 550, y: 380 },
          { x: 250, y: 250 }, { x: 450, y: 250 }
        ];
        room.players.forEach((pid, i) => {
          const pd = room.playerData[pid];
          const sp = spawnPoints[i % spawnPoints.length];
          pd.x = sp.x; pd.y = sp.y;
          pd.hp = pd.maxHp; pd.state = 'idle';
          pd.score = 0; pd.deaths = 0;
        });

        const state = getRoomState(roomId);
        room.players.forEach(pid => sendTo(pid, { type: 'game_start', state }));
        break;
      }

      case 'player_input': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'playing') break;
        const pd = room.playerData[playerId];
        if (!pd) break;

        const { x, y, hp, vx, vy, onGround, facing, state: pstate, action } = msg;
        pd.x = x; pd.y = y; pd.vx = vx; pd.vy = vy;
        pd.onGround = onGround; pd.facing = facing; pd.state = pstate;
        if (hp !== undefined) pd.hp = hp;

        broadcast(roomId, {
          type: 'player_state',
          playerId,
          x, y, vx, vy, onGround, facing, state: pstate, hp, action
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

          setTimeout(() => {
            target.hp = target.maxHp;
            const sp = [{ x: 150, y: 380 }, { x: 350, y: 380 }, { x: 550, y: 380 }];
            const rsp = sp[Math.floor(Math.random() * sp.length)];
            target.x = rsp.x; target.y = rsp.y;
            room.players.forEach(pid => sendTo(pid, {
              type: 'player_respawn',
              playerId: msg.targetId,
              x: target.x, y: target.y, hp: target.hp
            }));
          }, 3000);
        }

        room.players.forEach(pid => sendTo(pid, {
          type: 'player_hit',
          targetId: msg.targetId,
          attackerId: playerId,
          damage: msg.damage,
          hp: target.hp,
          skillId: msg.skillId,
        }));

        const allScores = room.players.map(pid => ({
          id: pid,
          name: room.playerData[pid].name,
          score: room.playerData[pid].score || 0,
          deaths: room.playerData[pid].deaths || 0,
        }));
        broadcast(roomId, { type: 'score_update', scores: allScores });
        sendTo(playerId, { type: 'score_update', scores: allScores });
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
          x: msg.x, y: msg.y,
          facing: msg.facing,
        }, playerId);
        break;
      }

      case 'chat': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room) break;
        const pd = room.playerData[playerId];
        room.players.forEach(pid => sendTo(pid, {
          type: 'chat',
          from: pd ? pd.name : 'Unknown',
          msg: msg.msg.substr(0, 100),
        }));
        break;
      }

      case 'change_stage': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room || room.host !== playerId) break;
        room.stage = msg.stage;
        broadcast(roomId, { type: 'room_update', state: getRoomState(roomId) });
        sendTo(playerId, { type: 'room_update', state: getRoomState(roomId) });
        break;
      }
    }
  });

  ws.on('close', () => {
    const roomId = ws.roomId;
    const room = rooms.get(roomId);
    if (room) {
      room.players = room.players.filter(p => p !== playerId);
      delete room.playerData[playerId];
      if (room.players.length === 0) {
        rooms.delete(roomId);
      } else {
        if (room.host === playerId) room.host = room.players[0];
        broadcast(roomId, { type: 'player_left', playerId, state: getRoomState(roomId) });
      }
    }
    clients.delete(playerId);
  });
});

server.listen(PORT, () => {
  console.log(`BRAWL OF THE ANCIENTS server running on port ${PORT}`);
});
