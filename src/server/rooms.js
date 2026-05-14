const MAX_PLAYERS = 5;

const SPAWN_POINTS = [
  { x: 150, y: 454 },
  { x: 350, y: 454 },
  { x: 550, y: 454 },
  { x: 250, y: 454 },
  { x: 450, y: 454 },
];

const RESPAWN_POINTS = [
  { x: 150, y: 454 },
  { x: 250, y: 454 },
  { x: 350, y: 454 },
  { x: 450, y: 454 },
  { x: 550, y: 454 },
];

const CHARACTER_MAX_HP = {
  dragonfist: 120,
  shadowblade: 80,
  stoneguard: 200,
  stormarrow: 90,
  pyromancer: 85,
  frostmage: 85,
  thunderking: 110,
  venomfang: 88,
  celestial: 95,
  ironclad: 180,
};

function generateRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function createPlayer(playerId, { name, character }, index = 0) {
  const maxHp = CHARACTER_MAX_HP[character] || 100;
  return {
    id: playerId,
    name,
    character,
    ready: false,
    x: 200 + index * 80,
    y: 454,
    hp: maxHp,
    maxHp,
    facing: 1,
    state: 'idle',
    vx: 0,
    vy: 0,
    onGround: true,
    score: 0,
    deaths: 0,
    lastRespawnIndex: index % RESPAWN_POINTS.length,
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

  listOpenRooms() {
    return Array.from(this.rooms.entries())
      .filter(([, room]) => room.status === 'lobby' && room.players.length < MAX_PLAYERS)
      .map(([id, room]) => {
        const host = room.playerData[room.host];
        return {
          id,
          stage: room.stage,
          hostName: host?.name || 'Unknown',
          players: room.players.length,
          maxPlayers: MAX_PLAYERS,
        };
      });
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
      player.lastRespawnIndex = i % RESPAWN_POINTS.length;
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

  getRespawnPoint(excludeIndex = -1) {
    let index = Math.floor(Math.random() * RESPAWN_POINTS.length);
    if (RESPAWN_POINTS.length > 1 && index === excludeIndex) {
      index = (index + 1 + Math.floor(Math.random() * (RESPAWN_POINTS.length - 1))) % RESPAWN_POINTS.length;
    }
    return { ...RESPAWN_POINTS[index], index };
  }
}

module.exports = { RoomStore };
