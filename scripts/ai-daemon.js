const WebSocket = require('ws');

const SERVER_URL = process.env.BOTA_AI_SERVER || process.argv[2] || 'ws://localhost:3000';
const BOT_NAME = process.env.BOTA_AI_NAME || `Daemon AI ${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
const PREFERRED_TEAM = process.env.BOTA_AI_TEAM || 'moon';
const TARGET_ROOM = process.env.BOTA_AI_ROOM || '';
const BOT_TOKEN = process.env.BOTA_AI_TOKEN || '';
const AUTO_START = process.env.BOTA_AI_AUTO_START === '1';
const POLL_ROOM_MS = Number(process.env.BOTA_AI_POLL_MS || 1400);
const THINK_MS = Number(process.env.BOTA_AI_THINK_MS || 100);
const HERO_W = 44;
const HERO_H = 66;
const HERO_SPEED = 4.6;
const TEAM_DIR = { sun: 1, moon: -1 };
const OBJECTIVE_ATTACK_ORDER = {
  sun: ['moon_tower_front', 'moon_tower_mid', 'moon_tower_base', 'moon_ancient'],
  moon: ['sun_tower_front', 'sun_tower_mid', 'sun_tower_base', 'sun_ancient'],
};
const SKILLS = {
  punch: { damage: 56, range: 48, cooldown: 760, windup: 170, type: 'melee' },
  flame: { damage: 52, range: 185, cooldown: 3200, windup: 320, type: 'projectile' },
  rush: { damage: 66, range: 128, cooldown: 5200, windup: 210, type: 'dash' },
  roar: { damage: 45, range: 112, cooldown: 7800, windup: 500, type: 'aoe' },
};

function debug(...args) {
  if (process.env.BOTA_AI_DEBUG) console.log('[ai-daemon]', ...args);
}

function now() {
  return Date.now();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function unitWidth(unit) {
  return Number(unit?.width || unit?.w || HERO_W);
}

function unitHeight(unit) {
  return Number(unit?.height || unit?.h || HERO_H);
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
  const dx = af.x - bf.x;
  const dy = (af.y - bf.y) * 1.45;
  return Math.hypot(dx, dy);
}

function isObjective(unit) {
  return unit?.type === 'tower' || unit?.type === 'ancient';
}

function blockRadiusX(unit) {
  if (unit?.id?.startsWith?.('cr_')) return Number(unit.footRadiusX) || 14;
  if (unit?.type === 'tower') return Number(unit.footRadiusX) || 44;
  if (unit?.type === 'ancient') return 42;
  return Number(unit?.footRadiusX) || 15;
}

function blockRadiusY(unit) {
  if (unit?.id?.startsWith?.('cr_')) return Number(unit.footRadiusY) || 7.5;
  if (unit?.type === 'tower') return Number(unit.footRadiusY) || 14;
  if (unit?.type === 'ancient') return 24;
  return Number(unit?.footRadiusY) || 10;
}

function overlaps(a, b, padding = 0) {
  const af = unitFoot(a);
  const bf = unitFoot(b);
  return Math.abs(af.x - bf.x) < blockRadiusX(a) + blockRadiusX(b) + padding &&
    Math.abs(af.y - bf.y) < blockRadiusY(a) + blockRadiusY(b) + padding;
}

function overlapDepth(a, b, padding = 0) {
  const af = unitFoot(a);
  const bf = unitFoot(b);
  const dx = blockRadiusX(a) + blockRadiusX(b) + padding - Math.abs(af.x - bf.x);
  const dy = blockRadiusY(a) + blockRadiusY(b) + padding - Math.abs(af.y - bf.y);
  return dx > 0 && dy > 0 ? Math.min(dx, dy) : 0;
}

function chooseJoinTeam(room) {
  const teams = room.teams || [];
  const preferred = teams.find(team => team.id === PREFERRED_TEAM);
  const other = teams.find(team => team.id !== PREFERRED_TEAM);
  if (preferred && other && preferred.count <= other.count) return preferred.id;
  if (teams.length) return [...teams].sort((a, b) => a.count - b.count)[0].id;
  return PREFERRED_TEAM;
}

class AiDaemon {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.playerId = null;
    this.roomId = null;
    this.sessionToken = `bot-${now()}-${Math.random().toString(36).slice(2)}`;
    this.roomPoll = null;
    this.thinkLoop = null;
    this.autoStartLoop = null;
    this.cooldowns = {};
    this.pendingHits = new Set();
    this.readySent = false;
    this.assetReadySent = false;
    this.state = {
      status: 'disconnected',
      players: new Map(),
      creeps: [],
      objectives: [],
      winner: null,
    };
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.on('open', () => {
      debug('connected to', this.url);
      if (TARGET_ROOM) {
        this.state.status = 'joining';
        this.joinRoom(TARGET_ROOM, PREFERRED_TEAM);
      } else {
        this.state.status = 'lobby-search';
        this.requestRooms();
        this.roomPoll = setInterval(() => this.requestRooms(), POLL_ROOM_MS);
      }
    });
    this.ws.on('message', raw => this.handleMessage(JSON.parse(raw)));
    this.ws.on('close', () => this.stop());
    this.ws.on('error', error => {
      console.error('[ai-daemon] websocket error:', error.message);
    });
  }

  stop() {
    if (this.roomPoll) clearInterval(this.roomPoll);
    if (this.thinkLoop) clearInterval(this.thinkLoop);
    if (this.autoStartLoop) clearInterval(this.autoStartLoop);
    this.roomPoll = null;
    this.thinkLoop = null;
    this.autoStartLoop = null;
  }

  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message));
  }

  requestRooms() {
    if (this.state.status !== 'lobby-search') return;
    this.send({ type: 'get_rooms' });
  }

  sendReadyOnce() {
    if (this.readySent) return;
    this.readySent = true;
    this.send({ type: 'set_ready', ready: true });
  }

  sendAssetReadyOnce() {
    if (this.assetReadySent) return;
    this.assetReadySent = true;
    this.send({ type: 'asset_progress', progress: 100 });
  }

  beginAutoStart() {
    if (!AUTO_START || this.autoStartLoop) return;
    const requestStart = () => {
      if (this.state.status !== 'lobby') return this.stopAutoStart();
      debug('auto start_game');
      this.send({ type: 'start_game', botAutoStart: true });
    };
    setTimeout(requestStart, 250);
    this.autoStartLoop = setInterval(requestStart, 500);
  }

  stopAutoStart() {
    if (!this.autoStartLoop) return;
    clearInterval(this.autoStartLoop);
    this.autoStartLoop = null;
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'connected':
        this.playerId = msg.playerId;
        break;
      case 'room_list':
        debug('rooms', (msg.rooms || []).map(room => `${room.id}:${room.players}/${room.maxPlayers}`).join(',') || 'none');
        this.tryJoinRoom(msg.rooms || []);
        break;
      case 'room_joined':
        this.roomId = msg.roomId;
        debug('joined room', this.roomId);
        this.state.status = 'lobby';
        this.ingestPlayers(msg.state?.players || []);
        this.sendReadyOnce();
        this.beginAutoStart();
        break;
      case 'room_update':
      case 'player_joined':
        this.ingestPlayers(msg.state?.players || []);
        break;
      case 'asset_loading_start':
        debug(msg.type);
        this.state.status = 'loading';
        this.stopAutoStart();
        this.ingestPlayers(msg.state?.players || []);
        this.sendAssetReadyOnce();
        break;
      case 'asset_progress':
        this.ingestPlayers(msg.state?.players || []);
        break;
      case 'game_start':
        this.state.status = 'playing';
        this.stopAutoStart();
        this.ingestPlayers(msg.state?.players || []);
        this.state.creeps = msg.state?.creeps || [];
        this.state.objectives = msg.state?.objectives || [];
        debug('game_start', 'playerId', this.playerId, 'players', [...this.state.players.values()].map(player => `${player.id}:${player.teamId}:${player.isBot ? 'bot' : 'human'}`).join(','));
        this.startThinking();
        break;
      case 'world_state':
        this.state.creeps = msg.creeps || [];
        this.state.objectives = msg.objectives || [];
        this.state.winner = msg.winner || null;
        this.ingestPlayers(msg.players || []);
        if (this.state.winner) this.state.status = 'finished';
        break;
      case 'player_state':
        this.mergePlayer(msg.playerId, {
          x: msg.x,
          y: msg.y,
          vx: msg.vx || 0,
          vy: msg.vy || 0,
          facing: msg.facing || 1,
          state: msg.state,
          hp: msg.hp,
        });
        break;
      case 'player_hit':
        this.mergePlayer(msg.targetId, { hp: msg.hp });
        break;
      case 'player_respawn':
        this.mergePlayer(msg.playerId, { x: msg.x, y: msg.y, hp: msg.hp, state: 'idle', vx: 0, vy: 0 });
        break;
      case 'game_over':
        this.state.status = 'finished';
        break;
      case 'error':
        console.error('[ai-daemon] server error:', msg.msg);
        break;
    }
  }

  tryJoinRoom(rooms) {
    if (this.state.status !== 'lobby-search') return;
    const room = rooms
      .filter(entry => entry.players < entry.maxPlayers)
      .sort((a, b) => a.players - b.players)[0];
    if (!room) return;
    const teamId = chooseJoinTeam(room);
    this.state.status = 'joining';
    debug('joining', room.id, 'team', teamId);
    if (this.roomPoll) clearInterval(this.roomPoll);
    this.joinRoom(room.id, teamId);
  }

  joinRoom(roomId, teamId) {
    this.send({
      type: 'join_room',
      roomId,
      name: BOT_NAME,
      character: 'dragonfist',
      teamId,
      sessionToken: this.sessionToken,
      isBot: true,
      botToken: BOT_TOKEN,
    });
  }

  ingestPlayers(players) {
    players.forEach(player => this.mergePlayer(player.id, player));
  }

  mergePlayer(id, patch) {
    if (!id) return;
    const current = this.state.players.get(id) || { id, width: HERO_W, height: HERO_H };
    this.state.players.set(id, { ...current, ...patch, width: patch.width || current.width || HERO_W, height: patch.height || current.height || HERO_H });
  }

  me() {
    return this.state.players.get(this.playerId) || null;
  }

  startThinking() {
    if (this.thinkLoop) clearInterval(this.thinkLoop);
    this.thinkLoop = setInterval(() => this.think(), THINK_MS);
  }

  getNextObjective(teamId) {
    const order = OBJECTIVE_ATTACK_ORDER[teamId] || [];
    return order
      .map(id => this.state.objectives.find(obj => obj.id === id && obj.hp > 0))
      .find(Boolean) || null;
  }

  selectTarget(me) {
    const enemies = [...this.state.players.values()]
      .filter(player => player.id !== me.id && player.hp > 0 && player.teamId !== me.teamId);
    const hero = enemies
      .map(unit => ({ unit, distance: distanceBetween(me, unit) }))
      .filter(entry => entry.distance <= 380)
      .sort((a, b) => a.distance - b.distance)[0]?.unit;
    if (hero) return { mode: 'fight-hero', unit: hero };

    const creep = this.state.creeps
      .filter(unit => unit.hp > 0 && unit.teamId !== me.teamId)
      .map(unit => ({ unit, distance: distanceBetween(me, unit) }))
      .filter(entry => entry.distance <= 230)
      .sort((a, b) => a.distance - b.distance)[0]?.unit;
    if (creep) return { mode: 'clear-creep', unit: creep };

    const objective = this.getNextObjective(me.teamId);
    if (objective) return { mode: 'push-lane', unit: objective };
    return { mode: 'idle', unit: null };
  }

  chooseSkill(me, target) {
    const n = now();
    const around = [
      ...this.state.creeps.filter(unit => unit.hp > 0 && unit.teamId !== me.teamId),
      ...[...this.state.players.values()].filter(unit => unit.id !== me.id && unit.hp > 0 && unit.teamId !== me.teamId),
    ].filter(unit => distanceBetween(me, unit) <= SKILLS.roar.range).length;
    if (around >= 3 && (this.cooldowns.roar || 0) <= n) return 'roar';
    const dist = distanceBetween(me, target);
    if (dist > SKILLS.punch.range + 16 && dist <= SKILLS.rush.range && (this.cooldowns.rush || 0) <= n) return 'rush';
    if ((isObjective(target) || dist > SKILLS.punch.range + 8) && dist <= SKILLS.flame.range && (this.cooldowns.flame || 0) <= n) return 'flame';
    if (dist <= SKILLS.punch.range && (this.cooldowns.punch || 0) <= n) return 'punch';
    return null;
  }

  isInRange(me, target, skillId = 'punch') {
    const skill = SKILLS[skillId] || SKILLS.punch;
    if (isObjective(target)) {
      const mf = unitFoot(me);
      const tf = unitFoot(target);
      return Math.abs(tf.x - mf.x) <= skill.range + blockRadiusX(target) * 0.72 &&
        Math.abs((tf.y - mf.y) * 1.35) <= blockRadiusY(target) + 34;
    }
    return distanceBetween(me, target) <= skill.range + blockRadiusX(target) * 0.45;
  }

  blockersFor(me, target) {
    return [
      ...this.state.creeps.filter(unit => unit.hp > 0 && unit.teamId !== me.teamId && unit.id !== target?.id),
      ...this.state.objectives.filter(unit => unit.hp > 0 && unit.id !== target?.id),
      ...[...this.state.players.values()].filter(unit => unit.id !== me.id && unit.hp > 0 && unit.id !== target?.id),
      ...(target ? [target] : []),
    ];
  }

  findMove(me, target) {
    const mf = unitFoot(me);
    const tf = unitFoot(target);
    const dir = Math.sign(tf.x - mf.x) || me.facing || TEAM_DIR[me.teamId] || 1;
    const desiredGap = Math.max(26, blockRadiusX(target) * (isObjective(target) ? 0.65 : 0.38));
    const goal = { x: tf.x - dir * desiredGap, y: tf.y };
    const dx = goal.x - mf.x;
    const dy = (goal.y - mf.y) * 0.56;
    const len = Math.hypot(dx, dy) || 1;
    const stepX = (dx / len) * HERO_SPEED;
    const stepY = (dy / len) * Math.max(0.85, HERO_SPEED * 0.56);
    const side = mf.y <= tf.y ? -1 : 1;
    const attempts = [
      [stepX, stepY],
      [stepX * 0.55, side * HERO_SPEED * 0.62],
      [stepX * 0.55, -side * HERO_SPEED * 0.62],
      [0, side * HERO_SPEED * 0.78],
      [0, -side * HERO_SPEED * 0.78],
    ];
    const blockers = this.blockersFor(me, target);
    for (const [x, y] of attempts) {
      const candidate = {
        ...me,
        x: clamp(me.x + x, 0, 2520 - HERO_W),
        y: clamp(me.y + y, 300 - HERO_H, 506 - HERO_H),
      };
      const blocked = blockers.some(unit => {
        const nextDepth = overlapDepth(candidate, unit);
        if (!nextDepth) return false;
        const currentDepth = overlapDepth(me, unit);
        return !currentDepth || nextDepth >= currentDepth - 0.05;
      });
      if (!blocked) return candidate;
    }
    return { ...me, vx: 0, vy: 0, state: 'idle' };
  }

  think() {
    if (this.state.status !== 'playing') return;
    const me = this.me();
    if (!me || me.hp <= 0) return;
    const decision = this.selectTarget(me);
    debug('think', me.id, me.teamId, Math.round(me.x), Math.round(me.y), decision.mode, decision.unit?.id || 'none', decision.unit ? Math.round(distanceBetween(me, decision.unit)) : '-');
    if (!decision.unit) return this.sendInput(me, me.x, me.y, 0, 0, 'idle');

    const target = decision.unit;
    const skillId = this.chooseSkill(me, target);
    if (skillId && this.isInRange(me, target, skillId)) {
      this.castSkill(me, target, skillId);
      return this.sendInput(me, me.x, me.y, 0, 0, 'idle');
    }
    if (this.isInRange(me, target, 'punch') || (isObjective(target) && this.isInRange(me, target, 'flame'))) {
      return this.sendInput(me, me.x, me.y, 0, 0, 'idle');
    }
    const next = this.findMove(me, target);
    this.sendInput(me, next.x, next.y, next.x - me.x, next.y - me.y, next.state || 'run');
    this.mergePlayer(me.id, { x: next.x, y: next.y, vx: next.x - me.x, vy: next.y - me.y, facing: Math.sign(unitFoot(target).x - unitFoot(me).x) || me.facing || 1, state: next.state || 'run' });
  }

  sendInput(me, x, y, vx, vy, state) {
    const facing = vx ? Math.sign(vx) : me.facing || TEAM_DIR[me.teamId] || 1;
    this.send({ type: 'player_input', x, y, vx, vy, onGround: true, facing, state });
  }

  castSkill(me, target, skillId) {
    const skill = SKILLS[skillId] || SKILLS.punch;
    const key = `${skillId}:${target.id}:${Math.floor(now() / Math.max(1, skill.cooldown))}`;
    if (this.pendingHits.has(key)) return;
    this.pendingHits.add(key);
    this.cooldowns[skillId] = now() + skill.cooldown;
    const facing = Math.sign(unitFoot(target).x - unitFoot(me).x) || me.facing || 1;
    this.send({ type: 'skill_cast', skillId, x: me.x, y: me.y, facing, windup: skill.windup, actionVariant: skillId === 'punch' && facing === 1 ? 'attackKick' : null });
    debug('cast', skillId, 'target', target.id);
    setTimeout(() => {
      this.pendingHits.delete(key);
      if (target.id?.startsWith?.('cr_') || isObjective(target)) {
        this.send({ type: 'unit_hit', unitId: target.id, damage: skill.damage, skillId, hitDir: facing });
      } else {
        this.send({ type: 'player_hit', targetId: target.id, damage: skill.damage, skillId, hitDir: facing });
      }
      if (process.env.BOTA_AI_ONCE === 'skill') setTimeout(() => process.exit(0), 120);
    }, skill.windup);
  }
}

const daemon = new AiDaemon(SERVER_URL);
daemon.connect();

process.on('SIGINT', () => {
  daemon.stop();
  process.exit(0);
});
