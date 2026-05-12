const MAX_PLAYERS = 5;

const SPAWN_POINTS = [
  { x: 150, y: 380 },
  { x: 350, y: 380 },
  { x: 550, y: 380 },
  { x: 250, y: 250 },
  { x: 450, y: 250 },
];

const RESPAWN_POINTS = [
  { x: 150, y: 380 },
  { x: 350, y: 380 },
  { x: 550, y: 380 },
];

function generateRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function createPlayer(playerId, { name, character }, index = 0) {
  return {
    id: playerId,
    name,
    character,
    ready: false,
    x: 200 + index * 80,
    y: 400,
    hp: 100,
    maxHp: 100,
    facing: 1,
    state: 'idle',
    vx: 0,
    vy: 0,
    onGround: true,
    score: 0,
    deaths: 0,
  };
}

class RoomStore {
  constructor() {
    this.rooms = new Map();
  }

  create(playerId, payload) {
    let roomId = generateRoomId();
    while (this.rooms.has(roomId)) roomId = generateRoomId();

    this.rooms.set(roomId, {
      host: playerId,
      stage: payload.stage || 1,
      status: 'lobby',
      players: [playerId],
      playerData: {
        [playerId]: createPlayer(playerId, payload),
      },
      gameState: null,
    });

    return roomId;
  }

  get(roomId) {
    return this.rooms.get(roomId);
  }

  getState(roomId) {
    const room = this.get(roomId);
    if (!room) return null;

    return {
      id: roomId,
      host: room.host,
      stage: room.stage,
      status: room.status,
      players: room.players.map(pid => room.playerData[pid]),
    };
  }

  addPlayer(roomId, playerId, payload) {
    const room = this.get(roomId);
    if (!room) return { ok: false, error: 'Room not found' };
    if (room.status !== 'lobby') return { ok: false, error: 'Game already started' };
    if (room.players.length >= MAX_PLAYERS) return { ok: false, error: 'Room is full (max 5 players)' };

    room.players.push(playerId);
    room.playerData[playerId] = createPlayer(playerId, payload, room.players.length);
    return { ok: true, room };
  }

  removePlayer(roomId, playerId) {
    const room = this.get(roomId);
    if (!room) return null;

    room.players = room.players.filter(pid => pid !== playerId);
    delete room.playerData[playerId];

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    if (room.host === playerId) room.host = room.players[0];
    return room;
  }

  startGame(roomId) {
    const room = this.get(roomId);
    if (!room) return null;

    room.status = 'playing';
    room.players.forEach((pid, i) => {
      const player = room.playerData[pid];
      const spawn = SPAWN_POINTS[i % SPAWN_POINTS.length];
      player.x = spawn.x;
      player.y = spawn.y;
      player.hp = player.maxHp;
      player.state = 'idle';
      player.score = 0;
      player.deaths = 0;
    });

    return room;
  }

  getScores(roomId) {
    const room = this.get(roomId);
    if (!room) return [];

    return room.players.map(pid => ({
      id: pid,
      name: room.playerData[pid].name,
      score: room.playerData[pid].score || 0,
      deaths: room.playerData[pid].deaths || 0,
    }));
  }

  getRespawnPoint() {
    return RESPAWN_POINTS[Math.floor(Math.random() * RESPAWN_POINTS.length)];
  }
}

module.exports = { RoomStore };
