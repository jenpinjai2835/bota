const MAX_PLAYERS = 10;
const MIN_CHARACTER_HP = 500;
const TEAM_IDS = ['sun', 'moon'];
const TEAM_NAMES = { sun: 'Team 1', moon: 'Team 2' };
const MATCH_ITEM_TYPES = ['healing_orb', 'mana_orb', 'power_rune', 'guard_rune', 'haste_rune'];
const LOCKED_CHARACTER_ID = 'dragonfist';
const ITEM_SPAWN_POINTS = [
  { x: 430, y: 456 },
  { x: 840, y: 392 },
  { x: 1260, y: 456 },
  { x: 1680, y: 392 },
  { x: 2090, y: 456 },
];

const SPAWN_POINTS = [
  { x: 178, y: 440, teamId: 'sun' },
  { x: 246, y: 394, teamId: 'sun' },
  { x: 314, y: 352, teamId: 'sun' },
  { x: 2298, y: 440, teamId: 'moon' },
  { x: 2230, y: 394, teamId: 'moon' },
  { x: 2162, y: 352, teamId: 'moon' },
];

const RESPAWN_POINTS = [
  { x: 178, y: 440, teamId: 'sun' },
  { x: 246, y: 394, teamId: 'sun' },
  { x: 2298, y: 440, teamId: 'moon' },
  { x: 2230, y: 394, teamId: 'moon' },
];

const OBJECTIVE_BLUEPRINTS = [
  { id: 'sun_ancient', type: 'ancient', teamId: 'sun', x: 96, y: 304, w: 74, h: 116, maxHp: 2500, name: 'Sun Ancient' },
  { id: 'sun_tower_base', type: 'tower', teamId: 'sun', x: 410, y: 276, w: 82, h: 104, footRadiusX: 44, footRadiusY: 14, maxHp: 1000, name: 'Sun Base Tower', range: 220, damage: 34 },
  { id: 'sun_tower_mid', type: 'tower', teamId: 'sun', x: 720, y: 276, w: 82, h: 104, footRadiusX: 44, footRadiusY: 14, maxHp: 1000, name: 'Sun Mid Tower', range: 220, damage: 34 },
  { id: 'sun_tower_front', type: 'tower', teamId: 'sun', x: 1030, y: 276, w: 82, h: 104, footRadiusX: 44, footRadiusY: 14, maxHp: 1000, name: 'Sun Front Tower', range: 220, damage: 34 },
  { id: 'moon_ancient', type: 'ancient', teamId: 'moon', x: 2350, y: 304, w: 74, h: 116, maxHp: 2500, name: 'Moon Ancient' },
  { id: 'moon_tower_base', type: 'tower', teamId: 'moon', x: 2028, y: 276, w: 82, h: 104, footRadiusX: 44, footRadiusY: 14, maxHp: 1000, name: 'Moon Base Tower', range: 220, damage: 34 },
  { id: 'moon_tower_mid', type: 'tower', teamId: 'moon', x: 1718, y: 276, w: 82, h: 104, footRadiusX: 44, footRadiusY: 14, maxHp: 1000, name: 'Moon Mid Tower', range: 220, damage: 34 },
  { id: 'moon_tower_front', type: 'tower', teamId: 'moon', x: 1408, y: 276, w: 82, h: 104, footRadiusX: 44, footRadiusY: 14, maxHp: 1000, name: 'Moon Front Tower', range: 220, damage: 34 },
];

const CHARACTER_MAX_HP = {
  dragonfist: 648,
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

function normalizeTeamId(teamId, index = 0) {
  return TEAM_IDS.includes(teamId) ? teamId : TEAM_IDS[index % TEAM_IDS.length];
}

function normalizeCharacter(character) {
  return character === LOCKED_CHARACTER_ID ? character : LOCKED_CHARACTER_ID;
}

function createPlayer(playerId, { name, character, teamId, sessionToken, isAI = false }, index = 0) {
  const selectedCharacter = normalizeCharacter(character);
  const maxHp = Math.max(MIN_CHARACTER_HP, CHARACTER_MAX_HP[selectedCharacter] || 100);
  const assignedTeamId = normalizeTeamId(teamId, index);
  const spawn = SPAWN_POINTS.find(point => point.teamId === assignedTeamId) || SPAWN_POINTS[index % SPAWN_POINTS.length];
  return {
    id: playerId,
    name: name || (isAI ? 'AI Brawler' : 'Player'),
    character: selectedCharacter,
    teamId: assignedTeamId,
    sessionToken: sessionToken || null,
    isAI,
    connected: !isAI,
    ready: isAI,
    x: spawn.x,
    y: spawn.y,
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
    testImmortal: true,
  };
}

function createObjectives() {
  return OBJECTIVE_BLUEPRINTS.map(obj => ({
    ...obj,
    hp: obj.maxHp,
    attackAt: 0,
  }));
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
      creeps: [],
      creepProjectiles: [],
      pendingTowerShots: [],
      creepSeq: 0,
      objectives: [],
      creepAggro: {},
      towerAggro: {},
      assetProgress: {},
      winner: null,
      gameState: null,
    });

    return roomId;
  }

  get(roomId) {
    return this.rooms.get(roomId);
  }

  remove(roomId) {
    return this.rooms.delete(roomId);
  }

  getState(roomId) {
    const room = this.get(roomId);
    if (!room) return null;

    return {
      id: roomId,
      host: room.host,
      stage: room.stage,
      status: room.status,
      players: room.players.map(pid => {
        const { sessionToken, ...safePlayer } = room.playerData[pid];
        return safePlayer;
      }),
      matchItems: room.matchItems || [],
      creeps: room.creeps || [],
      creepProjectiles: room.creepProjectiles || [],
      objectives: room.objectives || [],
      assetProgress: room.assetProgress || {},
      winner: room.winner || null,
      teams: TEAM_IDS.map(id => ({
        id,
        name: TEAM_NAMES[id],
        count: room.players.filter(pid => room.playerData[pid]?.teamId === id).length,
      })),
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

    const existingSeat = this.findReconnectSeat(roomId, payload.sessionToken);
    if (existingSeat) return { ok: true, room, rejoinedPlayerId: existingSeat.id };

    room.players.push(playerId);
    room.playerData[playerId] = createPlayer(playerId, payload, room.players.length - 1);
    return { ok: true, room };
  }

  markDisconnected(roomId, playerId) {
    const room = this.get(roomId);
    if (!room) return null;
    const player = room.playerData[playerId];
    if (!player) return room;
    if (player.isAI) return room;

    if (room.status === 'playing' || room.status === 'loading') {
      player.connected = false;
      player.disconnectedAt = Date.now();
      return room;
    }

    room.players = room.players.filter(pid => pid !== playerId);
    delete room.playerData[playerId];

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    if (room.host === playerId) room.host = room.players[0];
    return room;
  }

  findReconnectSeat(roomId, sessionToken) {
    const room = this.get(roomId);
    if (!room || !sessionToken) return null;
    return room.players.map(pid => room.playerData[pid]).find(player => player?.sessionToken === sessionToken && !player.isAI) || null;
  }

  reconnectPlayer(roomId, playerId) {
    const room = this.get(roomId);
    const player = room?.playerData[playerId];
    if (!player) return null;
    player.connected = true;
    player.disconnectedAt = 0;
    return room;
  }

  addAI(roomId, teamId) {
    const room = this.get(roomId);
    if (!room || room.status !== 'lobby') return null;
    if (room.players.length >= MAX_PLAYERS) return null;
    const normalizedTeamId = normalizeTeamId(teamId, room.players.length);
    const aiCount = room.players.filter(pid => room.playerData[pid]?.isAI).length + 1;
    const aiId = `ai_${roomId}_${Date.now()}_${aiCount}`;
    room.players.push(aiId);
    room.playerData[aiId] = createPlayer(aiId, {
      name: `AI Brawler ${aiCount}`,
      character: LOCKED_CHARACTER_ID,
      teamId: normalizedTeamId,
      isAI: true,
    }, room.players.length - 1);
    return room.playerData[aiId];
  }

  removeAI(roomId, teamId = null) {
    const room = this.get(roomId);
    if (!room || room.status !== 'lobby') return null;
    const index = [...room.players].reverse().findIndex(pid => {
      const player = room.playerData[pid];
      return player?.isAI && (!teamId || player.teamId === teamId);
    });
    if (index < 0) return null;
    const pid = [...room.players].reverse()[index];
    room.players = room.players.filter(id => id !== pid);
    delete room.playerData[pid];
    return room;
  }

  getTeamCounts(roomId) {
    const room = this.get(roomId);
    if (!room) return { sun: 0, moon: 0 };
    return TEAM_IDS.reduce((acc, teamId) => {
      acc[teamId] = room.players.filter(pid => room.playerData[pid]?.teamId === teamId).length;
      return acc;
    }, {});
  }

  canStart(roomId) {
    const room = this.get(roomId);
    if (!room) return { ok: false, reason: 'Room not found' };
    if (room.status !== 'lobby') return { ok: false, reason: 'Room is not in lobby' };
    const counts = this.getTeamCounts(roomId);
    if (counts.sun < 1 || counts.moon < 1) return { ok: false, reason: 'Both teams need at least one unit' };
    if (counts.sun !== counts.moon) return { ok: false, reason: 'Team counts must be equal' };
    return { ok: true };
  }

  beginAssetLoading(roomId) {
    const room = this.get(roomId);
    if (!room) return null;
    room.status = 'loading';
    room.assetProgress = {};
    room.assetLoadingStartedAt = Date.now();
    room.assetStartScheduled = false;
    room.players.forEach(pid => {
      const player = room.playerData[pid];
      room.assetProgress[pid] = player?.isAI ? 100 : 0;
    });
    return room;
  }

  updateAssetProgress(roomId, playerId, progress) {
    const room = this.get(roomId);
    if (!room || room.status !== 'loading') return null;
    const player = room.playerData[playerId];
    if (!player || player.isAI) return room;
    room.assetProgress = room.assetProgress || {};
    room.assetProgress[playerId] = Math.max(0, Math.min(100, Math.round(progress || 0)));
    return room;
  }

  areAssetsReady(roomId) {
    const room = this.get(roomId);
    if (!room || room.status !== 'loading') return false;
    return room.players.every(pid => {
      const player = room.playerData[pid];
      return player?.isAI || (room.assetProgress?.[pid] || 0) >= 100;
    });
  }

  startGame(roomId) {
    const room = this.get(roomId);
    if (!room) return null;

    room.status = 'playing';
    room.matchItems = createMatchItems();
    room.matchItemSpawnIndex = room.matchItems.length;
    room.players.forEach((pid, i) => {
      const player = room.playerData[pid];
      const teamSpawns = SPAWN_POINTS.filter(point => point.teamId === player.teamId);
      const spawn = teamSpawns[i % Math.max(1, teamSpawns.length)] || SPAWN_POINTS[i % SPAWN_POINTS.length];
      player.x = spawn.x;
      player.y = spawn.y;
      player.teamId = normalizeTeamId(player.teamId, i);
      player.hp = player.maxHp;
      player.testImmortal = true;
      player.state = 'idle';
      player.lastRespawnIndex = i % RESPAWN_POINTS.length;
      player.kills = 0;
      player.assists = 0;
      player.score = 0;
      player.deaths = 0;
      player.recentAttackers = {};
    });
    room.creeps = [];
    room.creepProjectiles = [];
    room.pendingTowerShots = [];
    room.creepSeq = 0;
    room.creepAggro = {};
    room.towerAggro = {};
    room.assetProgress = {};
    room.nextCreepWaveAt = 0;
    room.objectives = createObjectives();
    room.winner = null;

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

  getTeamRespawnPoint(teamId, excludeIndex = -1) {
    const points = RESPAWN_POINTS.filter(point => point.teamId === teamId);
    if (!points.length) return this.getRespawnPoint(excludeIndex);
    let index = Math.floor(Math.random() * points.length);
    if (points.length > 1 && index === excludeIndex) index = (index + 1) % points.length;
    return { ...points[index], index };
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

module.exports = { RoomStore, TEAM_IDS, LOCKED_CHARACTER_ID };
