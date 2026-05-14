const MAX_PLAYERS = 5;
const MIN_CHARACTER_HP = 500;
const TEAM_IDS = ['sun', 'moon'];
const MATCH_ITEM_TYPES = ['healing_orb', 'mana_orb', 'power_rune', 'guard_rune', 'haste_rune'];
const ITEM_SPAWN_POINTS = [
  { x: 205, y: 460 },
  { x: 420, y: 388 },
  { x: 640, y: 460 },
  { x: 320, y: 318 },
  { x: 520, y: 318 },
];

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
  dragonfist: 560,
  shadowblade: 500,
  stoneguard: 720,
  stormarrow: 510,
  pyromancer: 500,
  frostmage: 500,
  thunderking: 590,
  venomfang: 510,
  celestial: 540,
  ironclad: 680,
};

function generateRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function createPlayer(playerId, { name, character }, index = 0) {
  const maxHp = Math.max(MIN_CHARACTER_HP, CHARACTER_MAX_HP[character] || 100);
  return {
    id: playerId,
    name,
    character,
    teamId: TEAM_IDS[index % TEAM_IDS.length],
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
    kills: 0,
    assists: 0,
    score: 0,
    deaths: 0,
    recentAttackers: {},
    lastRespawnIndex: index % RESPAWN_POINTS.length,
  };
}

function createMatchItem(index = 0) {
  const point = ITEM_SPAWN_POINTS[index % ITEM_SPAWN_POINTS.length];
  return {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: MATCH_ITEM_TYPES[index % MATCH_ITEM_TYPES.length],
    x: point.x,
    y: point.y,
  };
}

function createMatchItems() {
  return ITEM_SPAWN_POINTS.slice(0, 4).map((point, index) => createMatchItem(index));
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
      matchItems: [],
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
      matchItems: room.matchItems || [],
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
    room.playerData[playerId] = createPlayer(playerId, payload, room.players.length - 1);
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
    room.matchItems = createMatchItems();
    room.matchItemSpawnIndex = room.matchItems.length;
    room.players.forEach((pid, i) => {
      const player = room.playerData[pid];
      const spawn = SPAWN_POINTS[i % SPAWN_POINTS.length];
      player.x = spawn.x;
      player.y = spawn.y;
      player.teamId = TEAM_IDS[i % TEAM_IDS.length];
      player.hp = player.maxHp;
      player.state = 'idle';
      player.lastRespawnIndex = i % RESPAWN_POINTS.length;
      player.kills = 0;
      player.assists = 0;
      player.score = 0;
      player.deaths = 0;
      player.recentAttackers = {};
    });

    return room;
  }

  getScores(roomId) {
    const room = this.get(roomId);
    if (!room) return [];

    return room.players.map(pid => ({
      id: pid,
      name: room.playerData[pid].name,
      character: room.playerData[pid].character,
      teamId: room.playerData[pid].teamId,
      kills: room.playerData[pid].kills || 0,
      score: room.playerData[pid].score || 0,
      deaths: room.playerData[pid].deaths || 0,
      assists: room.playerData[pid].assists || 0,
    }));
  }

  getRespawnPoint(excludeIndex = -1) {
    let index = Math.floor(Math.random() * RESPAWN_POINTS.length);
    if (RESPAWN_POINTS.length > 1 && index === excludeIndex) {
      index = (index + 1 + Math.floor(Math.random() * (RESPAWN_POINTS.length - 1))) % RESPAWN_POINTS.length;
    }
    return { ...RESPAWN_POINTS[index], index };
  }

  pickupItem(roomId, itemId) {
    const room = this.get(roomId);
    if (!room?.matchItems) return null;
    const index = room.matchItems.findIndex(item => item.id === itemId);
    if (index < 0) return null;
    const [item] = room.matchItems.splice(index, 1);
    return item;
  }

  spawnItem(roomId) {
    const room = this.get(roomId);
    if (!room || room.status !== 'playing') return null;
    room.matchItemSpawnIndex = (room.matchItemSpawnIndex || 0) + 1;
    const item = createMatchItem(room.matchItemSpawnIndex + (room.matchItems?.length || 0));
    room.matchItems = room.matchItems || [];
    room.matchItems.push(item);
    return item;
  }
}

module.exports = { RoomStore };
