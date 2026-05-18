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
  const CREEP_WAVE_MS = 30000;
  const CREEP_WAVE_SIZE = 5;
  const CREEP_LIMIT_PER_TEAM = 20;
  const CREEP_LANE_OFFSETS = [-36, -18, 0, 18, 36];
  const CREEP_FORMATION_X = { melee: [84, 54, 24, -6], ranged: [-36, -66, -96, -126] };
  const CREEP_HERO_AGGRO_RANGE = 360;
  const CREEP_HERO_DISENGAGE_RANGE = 540;
  const CREEP_ENEMY_CREEP_DETECT_RANGE = { melee: 118, ranged: 155 };
  const CREEP_ATTACK_ANIMATION_MS = 600;
  const CREEP_ATTACK_WINDUP_RATIO = { melee: 0.46, ranged: 0.58 };
  const TOWER_SHOT_TRAVEL_MS = 560;
  const CREEP_DEPTH_SPEED_MULTIPLIER = 0.56;
  const CREEP_TEAM_TYPES = {
    sun: { melee: ['monster_6', 'monster_7'], ranged: ['monster_9'] },
    moon: { melee: ['monster_8'], ranged: ['monster_10'] },
  };
  const TEAM_IDS = ['sun', 'moon'];
  const TEAM_DIR = { sun: 1, moon: -1 };
  const WORLD_W = 2520;
  const BATTLEFIELD_TOP_Y = 300;
  const BATTLEFIELD_BOTTOM_Y = 506;
  const CREEP_SPAWN = {
    sun: { x: 520, y: 378 },
    moon: { x: 1958, y: 378 },
  };
  const OBJECTIVE_ATTACK_ORDER = {
    sun: ['moon_tower_front', 'moon_tower_mid', 'moon_tower_base', 'moon_ancient'],
    moon: ['sun_tower_front', 'sun_tower_mid', 'sun_tower_base', 'sun_ancient'],
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

  function unitFootRadiusX(unit) {
    return Number(unit?.footRadiusX) || Math.max(14, unitWidth(unit) * 0.43);
  }

  function unitFootRadiusY(unit) {
    return Number(unit?.footRadiusY) || Math.max(9, unitHeight(unit) * 0.18);
  }

  function isCreepUnit(unit) {
    return Boolean(unit?.id?.startsWith?.('cr_'));
  }

  function unitBlockRadiusX(unit) {
    if (isCreepUnit(unit)) return Number(unit?.footRadiusX) || Math.max(12, unitWidth(unit) * 0.34);
    if (unit?.type === 'tower') return Number(unit?.footRadiusX) || Math.max(22, unitWidth(unit) * 0.58);
    if (unit?.type === 'ancient') return Math.max(36, unitWidth(unit) * 0.58);
    return Math.max(14, unitWidth(unit) * 0.36);
  }

  function unitBlockRadiusY(unit) {
    if (isCreepUnit(unit)) return Number(unit?.footRadiusY) || Math.max(7, unitHeight(unit) * 0.13);
    if (unit?.type === 'tower') return Number(unit?.footRadiusY) || Math.max(18, unitHeight(unit) * 0.2);
    if (unit?.type === 'ancient') return Math.max(24, unitHeight(unit) * 0.22);
    return Math.max(9, unitHeight(unit) * 0.16);
  }

  function unitsBlockOverlap(a, b, padding = 0) {
    const af = unitFoot(a);
    const bf = unitFoot(b);
    if (a?.type === 'tower' || b?.type === 'tower') return towerBlockOverlap(a, b, padding);
    return Math.abs(af.x - bf.x) < unitBlockRadiusX(a) + unitBlockRadiusX(b) + padding &&
      Math.abs(af.y - bf.y) < unitBlockRadiusY(a) + unitBlockRadiusY(b) + padding;
  }

  function towerBlockHalfWidthAt(tower, localY) {
    const points = [
      [-0.95, -0.08],
      [-0.42, -0.74],
      [0.42, -0.74],
      [0.95, -0.08],
      [0.56, 0.56],
      [0.24, 0.82],
      [-0.24, 0.82],
      [-0.56, 0.56],
    ];
    const y = Math.max(-0.82, Math.min(0.82, localY));
    let half = 0;
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y >= Math.min(y1, y2) && y <= Math.max(y1, y2)) && Math.abs(y2 - y1) > 0.0001) {
        const t = (y - y1) / (y2 - y1);
        half = Math.max(half, Math.abs(x1 + (x2 - x1) * t));
      }
    }
    return Math.max(0.24, half) * unitBlockRadiusX(tower);
  }

  function towerBlockOverlap(a, b, padding = 0) {
    const tower = a?.type === 'tower' ? a : b;
    const other = tower === a ? b : a;
    const tf = unitFoot(tower);
    const of = unitFoot(other);
    const dy = of.y - tf.y;
    const towerRy = unitBlockRadiusY(tower);
    const otherRy = unitBlockRadiusY(other);
    if (Math.abs(dy) > towerRy * 0.82 + otherRy + padding) return false;
    const localY = Math.max(-0.82, Math.min(0.82, dy / Math.max(1, towerRy)));
    const halfWidth = towerBlockHalfWidthAt(tower, localY) + unitBlockRadiusX(other) + padding;
    return Math.abs(of.x - tf.x) < halfWidth;
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

  function isCreepTargetInRange(creep, target) {
    if (!creep || !target) return false;
    if (creep.role === 'ranged') {
      return distanceBetween(creep, target) <= (creep.range || 210);
    }
    const creepFoot = unitFoot(creep);
    const targetFoot = unitFoot(target);
    const dx = Math.abs(targetFoot.x - creepFoot.x);
    const depth = Math.abs((targetFoot.y - creepFoot.y) * 1.45);
    const range = creep.range || 38;
    const reachX = range + unitFootRadiusX(target) * 0.46 + unitFootRadiusX(creep) * 0.18;
    const reachZ = unitFootRadiusY(creep) + unitFootRadiusY(target) + Math.max(14, range * 0.48);
    if (dx <= reachX && depth <= reachZ) return true;
    // Contact override: if melee creep is physically interpenetrating target's blocker volume,
    // treat as in-range to prevent deadlock where unit keeps trying to reposition forever.
    const bodyReachX = unitBlockRadiusX(creep) + unitBlockRadiusX(target) + 2;
    const bodyReachY = unitBlockRadiusY(creep) + unitBlockRadiusY(target) + 2;
    return dx <= bodyReachX && Math.abs(targetFoot.y - creepFoot.y) <= bodyReachY;
  }

  function getDamageDirection(target, attacker = null, fallback = 1) {
    if (!target) return fallback || 1;
    if (!attacker) return fallback || target.lastHitDir || target.facing || 1;
    const targetFoot = unitFoot(target);
    const attackerFoot = unitFoot(attacker);
    return Math.sign(targetFoot.x - attackerFoot.x) || fallback || target.facing || 1;
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

  function getNextAttackableObjective(room, attackerTeamId) {
    const order = OBJECTIVE_ATTACK_ORDER[attackerTeamId] || [];
    return order
      .map(id => (room.objectives || []).find(obj => obj.id === id && obj.hp > 0))
      .find(Boolean) || null;
  }

  function canDamageObjective(room, attackerTeamId, objective) {
    if (!room || !attackerTeamId || !objective || objective.teamId === attackerTeamId) return false;
    return getNextAttackableObjective(room, attackerTeamId)?.id === objective.id;
  }

  function getDefendingHeroesNearObjective(room, creep, objective) {
    if (!objective) return [];
    return getLivingEnemyHeroes(room, creep, 520)
      .filter(hero => hero.teamId === objective.teamId && distanceBetween(hero, objective) <= 320)
      .sort((a, b) => distanceBetween(creep, a) - distanceBetween(creep, b));
  }

  function clampCreepY(y, h = 42) {
    return Math.max(BATTLEFIELD_TOP_Y - h, Math.min(BATTLEFIELD_BOTTOM_Y - h, y));
  }

  function getUnitById(room, unitId) {
    return (room.creeps || []).find(unit => unit.id === unitId) ||
      (room.objectives || []).find(unit => unit.id === unitId) ||
      room.playerData?.[unitId] ||
      null;
  }

  function getWaveRole(laneIndex) {
    return laneIndex % 5 === 4 ? 'ranged' : 'melee';
  }

  function getWaveFormation(room, teamId, role, laneIndex) {
    const rowOffset = CREEP_LANE_OFFSETS[laneIndex % CREEP_LANE_OFFSETS.length] || 0;
    const rank = Math.floor(laneIndex / CREEP_LANE_OFFSETS.length);
    const roleRanks = CREEP_FORMATION_X[role] || CREEP_FORMATION_X.melee;
    const rankOffset = roleRanks[rank % roleRanks.length] || 0;
    const waveDrift = (Math.floor((room.creepSeq || 0) / Math.max(1, CREEP_WAVE_SIZE)) % 2) * 10;
    return {
      rowOffset,
      rank,
      staggerX: TEAM_DIR[teamId] * (rankOffset + waveDrift),
      depthBias: rowOffset * 0.34,
    };
  }

  function spawnCreep(room, teamId, role = 'melee', laneIndex = 0) {
    const existing = (room.creeps || []).filter(creep => creep.teamId === teamId && creep.hp > 0).length;
    if (existing >= CREEP_LIMIT_PER_TEAM) return;
    const spawn = CREEP_SPAWN[teamId];
    const teamTypes = CREEP_TEAM_TYPES[teamId] || CREEP_TEAM_TYPES.sun;
    const pool = teamTypes[role] || teamTypes.melee;
    const type = pool[(room.creepSeq || 0) % pool.length];
    const isRanged = role === 'ranged';
    room.creepSeq = (room.creepSeq || 0) + 1;
    const formation = getWaveFormation(room, teamId, role, laneIndex);
    const h = isRanged ? 40 : 42;
    const y = clampCreepY(spawn.y + formation.rowOffset, h);
    const attackSpeed = isRanged ? 0.68 : 1.08;
    const projectileSpeed = isRanged ? 13.5 : 0;
    const attackWindup = Math.round(CREEP_ATTACK_ANIMATION_MS * (isRanged ? CREEP_ATTACK_WINDUP_RATIO.ranged : CREEP_ATTACK_WINDUP_RATIO.melee));
    const thinkSeed = (room.creepSeq * 1103515245 + (teamId === 'sun' ? 97 : 193) + laneIndex * 389) >>> 0;
    const slotPhase = thinkSeed % 7;
    const individualSide = slotPhase < 3 ? -1 : 1;
    const depthBias = (slotPhase - 3) * 7;
    room.creeps.push({
      id: `cr_${teamId}_${Date.now()}_${room.creepSeq}`,
      type,
      role,
      teamId,
      x: spawn.x + formation.staggerX,
      y,
      laneY: y,
      laneIndex,
      waveSlot: laneIndex,
      waveRank: formation.rank,
      w: isRanged ? 40 : 42,
      h,
      footRadiusX: isRanged ? 12.5 : 14,
      footRadiusY: isRanged ? 7 : 7.5,
      hp: isRanged ? 95 : 135,
      maxHp: isRanged ? 95 : 135,
      damage: isRanged ? 14 : 17,
      speed: isRanged ? 2.925 : 3.3,
      range: isRanged ? 210 : 38,
      attackSpeed,
      attackCooldown: Math.round(1000 / attackSpeed),
      attackWindup,
      enemyCreepDetectRange: CREEP_ENEMY_CREEP_DETECT_RANGE[role] || CREEP_ENEMY_CREEP_DETECT_RANGE.melee,
      projectileSpeed,
      attackAt: 0,
      attackStartedAt: 0,
      attackDamageAt: 0,
      state: 'walk',
      facing: TEAM_DIR[teamId],
      thinkSeed,
      individualSide,
      depthBias: depthBias + formation.depthBias,
      slotPhase,
      avoidSide: individualSide,
    });
  }

  function getLivingEnemyHeroes(room, creep, maxDistance = Infinity) {
    return Object.values(room.playerData || {})
      .filter(player =>
        player &&
        player.hp > 0 &&
        player.teamId &&
        player.teamId !== creep.teamId &&
        distanceBetween(creep, player) <= maxDistance
      );
  }

  function rememberCreepHeroAggro(room, allyTeamId, targetId) {
    if (!room || !allyTeamId || !targetId) return;
    room.creepAggro = room.creepAggro || {};
    room.creepAggro[allyTeamId] = { targetId, startedAt: Date.now() };
  }

  function rememberTowerHeroAggro(room, defendingTeamId, targetId) {
    if (!room || !defendingTeamId || !targetId) return;
    room.towerAggro = room.towerAggro || {};
    room.towerAggro[defendingTeamId] = { targetId, startedAt: Date.now() };
  }

  function clearTowerAggroTarget(room, targetId) {
    if (!room?.towerAggro || !targetId) return;
    Object.entries(room.towerAggro).forEach(([teamId, aggro]) => {
      if (aggro?.targetId === targetId) delete room.towerAggro[teamId];
    });
  }

  function isHeroInAnyEnemyTowerAggro(room, defendingTeamId, hero) {
    if (!hero || hero.hp <= 0) return false;
    return getLivingObjectives(room, defendingTeamId).some(obj =>
      obj.type === 'tower' &&
      distanceBetween(obj, hero) <= (obj.range || 170)
    );
  }

  function getTowerAggroHero(room, tower) {
    const aggro = room.towerAggro?.[tower.teamId];
    if (!aggro) return null;
    const hero = room.playerData?.[aggro.targetId];
    if (!hero || hero.hp <= 0 || hero.teamId === tower.teamId || distanceBetween(tower, hero) > (tower.range || 170)) {
      delete room.towerAggro[tower.teamId];
      return null;
    }
    return hero;
  }

  function getCreepAggroHero(room, creep) {
    const aggro = room.creepAggro?.[creep.teamId];
    if (!aggro) return null;
    const hero = room.playerData?.[aggro.targetId];
    if (!hero || hero.hp <= 0 || hero.teamId === creep.teamId) {
      delete room.creepAggro[creep.teamId];
      return null;
    }
    if (distanceBetween(creep, hero) > CREEP_HERO_DISENGAGE_RANGE) {
      const anyChaserInRange = (room.creeps || []).some(ally =>
        ally.hp > 0 &&
        ally.teamId === creep.teamId &&
        distanceBetween(ally, hero) <= CREEP_HERO_DISENGAGE_RANGE
      );
      if (!anyChaserInRange) delete room.creepAggro[creep.teamId];
      return null;
    }
    return hero;
  }

  function findNearestEnemyUnit(room, creep) {
    const enemyCreeps = (room.creeps || []).filter(other => other.hp > 0 && other.teamId !== creep.teamId);
    const nearestCreep = enemyCreeps
      .map(unit => ({ unit, distance: distanceBetween(creep, unit) }))
      .sort((a, b) => a.distance - b.distance)[0] || null;
    const creepDetectRange = creep.enemyCreepDetectRange || CREEP_ENEMY_CREEP_DETECT_RANGE[creep.role] || 118;
    if (nearestCreep && nearestCreep.distance <= creepDetectRange) return nearestCreep.unit;

    const aggroHero = getCreepAggroHero(room, creep);
    if (aggroHero) return aggroHero;

    const nextObjective = getNextAttackableObjective(room, creep.teamId);
    const defender = getDefendingHeroesNearObjective(room, creep, nextObjective)[0];
    if (defender) {
      rememberCreepHeroAggro(room, creep.teamId, defender.id);
      return defender;
    }

    const enemyHeroes = getLivingEnemyHeroes(room, creep, CREEP_HERO_AGGRO_RANGE);
    if (enemyHeroes.length) {
      const hero = enemyHeroes
        .map(unit => ({ unit, distance: distanceBetween(creep, unit) }))
        .sort((a, b) => a.distance - b.distance)[0]?.unit || null;
      if (hero) rememberCreepHeroAggro(room, creep.teamId, hero.id);
      return hero;
    }

    if (nextObjective) return nextObjective;
    return nearestCreep?.unit || null;
  }

  function queueCreepAttack(room, creep, target, now) {
    if (!room || !creep || !target) return null;
    room.pendingCreepAttacks = room.pendingCreepAttacks || [];
    const attack = {
      id: `ca_${creep.id}_${now}`,
      creepId: creep.id,
      targetId: target.id,
      damage: creep.damage,
      role: creep.role,
      hitAt: now + Math.max(80, creep.attackWindup || 240),
    };
    room.pendingCreepAttacks.push(attack);
    creep.pendingAttackId = attack.id;
    creep.attackStartedAt = now;
    creep.attackDamageAt = attack.hitAt;
    return attack;
  }

  function resolveCreepAttack(room, roomId, attack) {
    const creep = getUnitById(room, attack.creepId);
    const target = getUnitById(room, attack.targetId);
    if (!creep || !target || creep.hp <= 0 || target.hp <= 0 || target.teamId === creep.teamId) return;
    const targetStillInRange = creep.role === 'ranged'
      ? distanceBetween(creep, target) <= (creep.range || 210) + 36
      : isCreepTargetInRange(creep, target);
    if (!targetStillInRange) return;

    if (creep.role === 'ranged') {
      spawnCreepProjectile(room, creep, target);
    } else if (target.id?.startsWith?.('cr_')) {
      damageCreep(room, target, attack.damage, creep, null, roomId);
    } else if (room.playerData?.[target.id]) {
      damagePlayer(room, roomId, target, attack.damage, creep.id, 'creep_melee', getDamageDirection(target, creep, creep.facing || 1));
    } else {
      damageObjective(room, target, attack.damage, creep.teamId, roomId, creep);
    }
  }

  function updateCreepAttacks(room, roomId, now) {
    room.pendingCreepAttacks = (room.pendingCreepAttacks || []).filter(attack => {
      if (attack.hitAt > now) return true;
      resolveCreepAttack(room, roomId, attack);
      const creep = getUnitById(room, attack.creepId);
      if (creep?.pendingAttackId === attack.id) creep.pendingAttackId = null;
      return false;
    });
  }

  function damageCreep(room, creep, amount, attacker = null, hitDir = null, roomId = null) {
    if (!creep || creep.hp <= 0) return false;
    const resolvedHitDir = hitDir || getDamageDirection(creep, attacker, creep.facing || TEAM_DIR[creep.teamId] || 1);
    creep.lastHitDir = resolvedHitDir;
    creep.lastDamage = amount;
    creep.hp = Math.max(0, creep.hp - amount);
    if (creep.hp > 0) return false;
    creep.state = 'dead';
    if (attacker) awardUnitDeathXp(room, creep, attacker, CREEP_DEATH_XP);
    if (roomId) {
      room.players.forEach(pid => sendTo(pid, {
        type: 'unit_death',
        unit: creep,
        hitDir: resolvedHitDir,
        damage: amount,
        attackerId: attacker?.id || null,
      }));
    }
    return true;
  }

  function damageObjective(room, objective, amount, attackerTeamId = null, roomId = null, attacker = null, hitDir = null) {
    if (!objective || objective.hp <= 0 || !canDamageObjective(room, attackerTeamId, objective)) return false;
    const damage = Math.max(1, Math.min(500, Number(amount) || 0));
    const resolvedHitDir = hitDir || getDamageDirection(objective, attacker, objective.lastHitDir || TEAM_DIR[attackerTeamId] || 1);
    objective.lastHitDir = resolvedHitDir;
    const oldHp = objective.hp;
    objective.hp = Math.max(0, objective.hp - damage);
    const actualDamage = Math.max(0, oldHp - objective.hp);
    if (attacker?.id && room.playerData?.[attacker.id]) {
      attacker.score = (attacker.score || 0) + Math.max(1, Math.floor(actualDamage / 5));
      if (objective.hp <= 0) {
        attacker.score += objective.type === 'ancient' ? 300 : 150;
      }
    }
    if (objective.hp <= 0 && roomId) {
      room.players.forEach(pid => sendTo(pid, {
        type: 'objective_destroyed',
        objective,
        damage,
        attackerTeamId,
        hitDir: resolvedHitDir,
      }));
    }
    if (objective.type === 'ancient' && objective.hp <= 0 && !room.winner) {
      room.winner = objective.teamId === 'sun' ? 'moon' : 'sun';
    }
    return objective.hp <= 0;
  }

  function damagePlayer(room, roomId, target, amount, attackerId = null, skillId = 'hit', hitDir = 1) {
    if (!room || !target || target.hp <= 0) return false;
    if (target.testImmortal) {
      target.hp = target.maxHp;
      return false;
    }
    const damage = Math.max(1, Math.min(500, Number(amount) || 0));
    const attacker = attackerId ? room.playerData?.[attackerId] || getUnitById(room, attackerId) : null;
    target.hp = Math.max(0, target.hp - damage);
    target.recentAttackers = target.recentAttackers || {};
    if (attacker?.id && attacker.id !== target.id) {
      target.recentAttackers[attacker.id] = Date.now();
    }

    if (target.hp <= 0) {
      target.deaths = (target.deaths || 0) + 1;
      clearTowerAggroTarget(room, target.id);
      if (attacker && room.playerData?.[attacker.id]) {
        attacker.kills = (attacker.kills || 0) + 1;
        attacker.score = (attacker.score || 0) + 100;
      }
      awardUnitDeathXp(room, target, attacker);
      const now = Date.now();
      Object.entries(target.recentAttackers || {}).forEach(([assistId, hitAt]) => {
        if (assistId === attacker?.id || now - hitAt > ASSIST_WINDOW_MS) return;
        const assister = room.playerData[assistId];
        if (!assister || assister.teamId !== attacker?.teamId) return;
        assister.assists = (assister.assists || 0) + 1;
        assister.score = (assister.score || 0) + 35;
      });
      target.recentAttackers = {};
      scheduleRespawn(roomId, target.id);
    }

    room.players.forEach(pid => sendTo(pid, {
      type: 'player_hit',
      targetId: target.id,
      attackerId: attacker?.id || attackerId,
      damage,
      hp: target.hp,
      skillId,
      hitDir,
    }));
    if (attacker?.id && room.playerData?.[attacker.id]) sendScores(roomId, attacker.id);
    return target.hp <= 0;
  }

  function spawnCreepProjectile(room, creep, target) {
    const from = unitFoot(creep);
    const to = unitFoot(target);
    room.creepProjectiles = room.creepProjectiles || [];
    room.creepProjectiles.push({
      id: `cp_${creep.id}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      teamId: creep.teamId,
      sourceId: creep.id,
      targetId: target.id,
      x: from.x,
      y: from.y - unitHeight(creep) * 0.42,
      prevX: from.x,
      prevY: from.y - unitHeight(creep) * 0.42,
      damage: creep.damage,
      speed: creep.projectileSpeed || 16,
      attackSpeed: creep.attackSpeed || 1,
      life: 95,
    });
  }

  function updateCreepProjectiles(room, roomId) {
    room.creepProjectiles = (room.creepProjectiles || []).filter(shot => {
      const target = getUnitById(room, shot.targetId);
      if (!target || target.hp <= 0 || target.teamId === shot.teamId) return false;
      const targetFoot = unitFoot(target);
      const targetX = targetFoot.x;
      const targetY = targetFoot.y - unitHeight(target) * 0.45;
      const dx = targetX - shot.x;
      const dy = targetY - shot.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      shot.prevX = shot.x;
      shot.prevY = shot.y;
      shot.life -= 1;
      if (dist <= (shot.speed || 16) + 8) {
        if (target.id?.startsWith?.('cr_')) {
          const source = getUnitById(room, shot.sourceId);
          const hitDir = Math.sign(targetFoot.x - (shot.prevX ?? shot.x)) || getDamageDirection(target, source, TEAM_DIR[shot.teamId] || 1);
          damageCreep(room, target, shot.damage, source, hitDir, roomId);
        } else if (room.playerData?.[target.id]) {
          const source = getUnitById(room, shot.sourceId);
          damagePlayer(room, roomId, target, shot.damage, source?.id || shot.sourceId, 'creep_fireball', Math.sign(targetFoot.x - (shot.prevX ?? shot.x)) || TEAM_DIR[shot.teamId] || 1);
        } else {
          const source = getUnitById(room, shot.sourceId);
          const hitDir = Math.sign(targetFoot.x - (shot.prevX ?? shot.x)) || getDamageDirection(target, source, TEAM_DIR[shot.teamId] || 1);
          damageObjective(room, target, shot.damage, shot.teamId, roomId, source, hitDir);
        }
        return false;
      }
      if (shot.life <= 0) return false;
      shot.x += (dx / Math.max(1, dist)) * (shot.speed || 16);
      shot.y += (dy / Math.max(1, dist)) * (shot.speed || 16);
      return true;
    });
  }

  function queueTowerShot(room, roomId, tower, target, targetType, now) {
    room.pendingTowerShots = room.pendingTowerShots || [];
    if (targetType === 'hero') {
      rememberTowerHeroAggro(room, tower.teamId, target.id);
    }
    const shot = {
      id: `ts_${tower.id}_${now}_${Math.random().toString(36).slice(2, 5)}`,
      towerId: tower.id,
      targetId: target.id,
      targetType,
      teamId: tower.teamId,
      damage: tower.damage || 30,
      hitAt: now + TOWER_SHOT_TRAVEL_MS,
    };
    room.pendingTowerShots.push(shot);
    room.players.forEach(pid => sendTo(pid, {
      type: 'tower_shot',
      id: shot.id,
      targetId: shot.targetId,
      targetType: shot.targetType,
      from: { x: tower.x + unitWidth(tower) / 2, y: tower.y + unitHeight(tower) * 0.18 },
      to: { x: target.x + unitWidth(target) / 2, y: target.y + unitHeight(target) * 0.45 },
      teamId: tower.teamId,
      travelMs: TOWER_SHOT_TRAVEL_MS,
    }));
  }

  function resolveTowerShot(room, roomId, shot) {
    const tower = getUnitById(room, shot.towerId);
    const target = getUnitById(room, shot.targetId);
    if (!tower || tower.hp <= 0 || !target || target.hp <= 0 || target.teamId === shot.teamId) return;
    if (shot.targetType === 'hero') {
      damagePlayer(room, roomId, target, shot.damage, tower.id, 'tower_shot', getDamageDirection(target, tower, TEAM_DIR[tower.teamId] || 1));
    } else {
      damageCreep(room, target, shot.damage, tower, null, roomId);
    }
  }

  function updateTowerShotImpacts(room, roomId, now) {
    room.pendingTowerShots = (room.pendingTowerShots || []).filter(shot => {
      if (shot.hitAt > now) return true;
      resolveTowerShot(room, roomId, shot);
      return false;
    });
  }

  function getTowerTarget(room, tower, now = Date.now()) {
    const aggroHero = getTowerAggroHero(room, tower);
    if (aggroHero) return { unit: aggroHero, type: 'hero', priority: 'hero_aggro', distance: distanceBetween(tower, aggroHero) };

    const hostileCreeps = (room.creeps || [])
      .filter(creep => creep.hp > 0 && creep.teamId !== tower.teamId && distanceBetween(tower, creep) <= (tower.range || 170))
      .map(unit => ({ unit, type: 'creep', distance: distanceBetween(tower, unit) }));
    if (hostileCreeps.length) {
      return hostileCreeps.sort((a, b) => a.distance - b.distance)[0];
    }

    const hostileHeroes = Object.values(room.playerData || {})
      .filter(hero => hero.hp > 0 && hero.teamId !== tower.teamId && distanceBetween(tower, hero) <= (tower.range || 170))
      .map(unit => ({ unit, type: 'hero', distance: distanceBetween(tower, unit) }));
    return hostileHeroes
      .sort((a, b) => a.distance - b.distance)[0] || null;
  }

  function resolveCreepSpacing(room) {
    const live = (room.creeps || []).filter(creep => creep.hp > 0);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i];
        const b = live[j];
        if (a.teamId !== b.teamId) continue;
        const af = unitFoot(a);
        const bf = unitFoot(b);
        const dx = bf.x - af.x;
        const dy = bf.y - af.y;
        const overlapX = unitBlockRadiusX(a) + unitBlockRadiusX(b) - Math.abs(dx);
        const overlapY = unitBlockRadiusY(a) + unitBlockRadiusY(b) - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;
        const push = Math.min(0.55, (overlapX + 1) * 0.18);
        const dir = dx >= 0 ? 1 : -1;
        a.x = Math.max(0, Math.min(WORLD_W - unitWidth(a), a.x - dir * push));
        b.x = Math.max(0, Math.min(WORLD_W - unitWidth(b), b.x + dir * push));
      }
    }

    // Keep creeps from getting embedded into static objectives (tower/ancient).
    const solids = (room.objectives || []).filter(obj => obj.hp > 0);
    live.forEach(creep => {
      solids.forEach(obj => {
        const cf = unitFoot(creep);
        const of = unitFoot(obj);
        const dx = cf.x - of.x;
        const dy = cf.y - of.y;
        const minX = unitBlockRadiusX(creep) + unitBlockRadiusX(obj) + 1;
        const minY = unitBlockRadiusY(creep) + unitBlockRadiusY(obj) + 1;
        const overlapX = minX - Math.abs(dx);
        const overlapY = minY - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) return;
        if (overlapY < overlapX) {
          const dirY = dy >= 0 ? 1 : -1;
          creep.y = clampCreepY(creep.y + dirY * (overlapY + 0.8), creep.h);
        } else {
          const dirX = dx >= 0 ? 1 : -1;
          creep.x = Math.max(0, Math.min(WORLD_W - unitWidth(creep), creep.x + dirX * (overlapX + 0.6)));
        }
      });

      // Heroes are authoritative blockers. Normal walking must not push creeps around.
    });
  }

  function isAlliedCreepBlocker(creep, unit) {
    return Boolean(unit?.id?.startsWith?.('cr_') && unit.teamId === creep.teamId);
  }

  function getCreepMoveBlockers(room, creep, target = null, options = {}) {
    const canOverlapTarget = target && !target.type;
    const ignoreAlliedCreeps = !!options.ignoreAlliedCreeps;
    return [
      ...(room.creeps || []).filter(unit =>
        unit.hp > 0 &&
        unit.id !== creep.id &&
        (!canOverlapTarget || unit.id !== target?.id) &&
        !(ignoreAlliedCreeps && isAlliedCreepBlocker(creep, unit))
      ),
      ...Object.values(room.playerData || {}).filter(unit => unit.hp > 0 && (!canOverlapTarget || unit.id !== target?.id)),
      ...(room.objectives || []).filter(unit => unit.hp > 0),
    ];
  }

  function getBlockOverlap(a, b) {
    const af = unitFoot(a);
    const bf = unitFoot(b);
    return {
      dx: af.x - bf.x,
      dy: af.y - bf.y,
      overlapX: unitBlockRadiusX(a) + unitBlockRadiusX(b) - Math.abs(af.x - bf.x),
      overlapY: unitBlockRadiusY(a) + unitBlockRadiusY(b) - Math.abs(af.y - bf.y),
    };
  }

  function isMovingOutOfOverlap(currentUnit, candidateUnit, blocker) {
    const current = getBlockOverlap(currentUnit, blocker);
    const next = getBlockOverlap(candidateUnit, blocker);
    if (current.overlapX <= 0 || current.overlapY <= 0) return false;
    if (next.overlapX <= 0 || next.overlapY <= 0) return true;
    const currentArea = current.overlapX * current.overlapY;
    const nextArea = next.overlapX * next.overlapY;
    return nextArea < currentArea - 0.2;
  }

  function getPlayerMoveBlockers(room, player) {
    return [
      ...(room.creeps || []).filter(unit => unit.hp > 0),
      ...(room.objectives || []).filter(unit => unit.hp > 0),
      ...Object.values(room.playerData || {}).filter(unit => unit.hp > 0 && unit.id !== player.id),
    ];
  }

  function isPlayerMoveBlocked(room, player, nextX, nextY) {
    const candidate = { ...player, x: nextX, y: nextY };
    return getPlayerMoveBlockers(room, player).some(unit => {
      if (!unitsBlockOverlap(candidate, unit, 0)) return false;
      return !isMovingOutOfOverlap(player, candidate, unit);
    });
  }

  function isAllowedContactSlide(creep, candidate, blocker, options = {}) {
    if (!options.slideBlockerId || blocker.id !== options.slideBlockerId) return false;
    const current = getBlockOverlap(creep, blocker);
    const next = getBlockOverlap(candidate, blocker);
    if (current.overlapX <= 0 || current.overlapY <= 0 || next.overlapX <= 0 || next.overlapY <= 0) return false;
    const movedY = unitFoot(candidate).y - unitFoot(creep).y;
    const movingAwayByDepth = Math.abs(movedY) > 0.05 && Math.sign(movedY) === Math.sign(current.dy || movedY);
    const depthImproves = next.overlapY < current.overlapY - 0.05;
    const xDoesNotDigIn = next.overlapX <= current.overlapX + 0.35;
    return movingAwayByDepth && depthImproves && xDoesNotDigIn;
  }

  function getCreepBlockingUnit(room, creep, nextX, nextY, target = null, options = {}) {
    const candidate = { ...creep, x: nextX, y: nextY };
    return getCreepMoveBlockers(room, creep, target, options).find(unit => {
      if (isAllowedContactSlide(creep, candidate, unit, options)) return false;
      return unitsBlockOverlap(candidate, unit, 0);
    });
  }

  function isCreepMoveBlocked(room, creep, nextX, nextY, target = null, options = {}) {
    return Boolean(getCreepBlockingUnit(room, creep, nextX, nextY, target, options));
  }

  function getForwardBlockingUnit(room, creep, goalX, goalY, target = null, options = {}) {
    const cf = unitFoot(creep);
    const dxToGoal = goalX - cf.x;
    const dir = Math.sign(dxToGoal) || creep.facing || TEAM_DIR[creep.teamId] || 1;
    return getCreepMoveBlockers(room, creep, target, options)
      .map(unit => {
        const uf = unitFoot(unit);
        const dx = (uf.x - cf.x) * dir;
        const dy = Math.abs(uf.y - cf.y);
        const frontReach = unitBlockRadiusX(creep) + unitBlockRadiusX(unit) + Math.max(34, Math.abs(dxToGoal) * 0.45);
        const depthReach = unitBlockRadiusY(creep) + unitBlockRadiusY(unit) + 24;
        return { unit, dx, dy, frontReach, depthReach, score: dx + dy * 0.7 };
      })
      .filter(entry => entry.dx > -unitBlockRadiusX(entry.unit) && entry.dx < entry.frontReach && entry.dy < entry.depthReach)
      .sort((a, b) => a.score - b.score)[0]?.unit || null;
  }

  function getCreepAvoidSign(creep) {
    return creep.avoidSide || creep.individualSide || (creep.laneIndex % 2 === 0 ? -1 : 1) || 1;
  }

  function getCreepBoundaryEscapeSign(creep, margin = 20) {
    const footY = unitFoot(creep).y;
    const edgeMargin = unitBlockRadiusY(creep) + margin;
    if (footY > BATTLEFIELD_BOTTOM_Y - edgeMargin) return -1;
    if (footY < BATTLEFIELD_TOP_Y + edgeMargin) return 1;
    return 0;
  }

  function getBoundaryTangentPenalty(creep, tangentY) {
    const escapeSign = getCreepBoundaryEscapeSign(creep, 18);
    if (!escapeSign) return 0;
    return Math.sign(tangentY || 0) === -escapeSign ? 420 : 0;
  }

  function isFrontContactBlocker(creep, blocker, stepX, stepY) {
    const moveLen = Math.hypot(stepX, stepY);
    if (moveLen < 0.001) return false;
    const cf = unitFoot(creep);
    const bf = unitFoot(blocker);
    const toX = bf.x - cf.x;
    const toY = bf.y - cf.y;
    const contactLen = Math.hypot(toX, toY);
    if (contactLen < 0.001) return true;
    const dot = (toX / contactLen) * (stepX / moveLen) + (toY / contactLen) * (stepY / moveLen);
    return dot > 0.28;
  }

  function getCreepSideSlideSign(creep, blocker) {
    const cf = unitFoot(creep);
    const bf = unitFoot(blocker);
    const awayY = Math.sign(cf.y - bf.y);
    let side = Math.abs(cf.y - bf.y) > Math.max(2.5, unitBlockRadiusY(creep) * 0.45)
      ? awayY
      : (creep.avoidSide || creep.individualSide || 1);
    const boundary = getCreepBoundaryEscapeSign(creep, 12);
    if (boundary && Math.sign(side) === -boundary) side = boundary;
    return side || 1;
  }

  function trySideContactSlide(room, creep, blocker, goalX, goalY, target, stepX, stepY, mode = 'side-contact') {
    if (!blocker) return false;
    const softCrowd = { ignoreAlliedCreeps: true, slideBlockerId: blocker.id };
    const speed = creep.speed || 1.8;
    const moveLen = Math.hypot(stepX, stepY) || 1;
    const forwardX = stepX / moveLen;
    const forwardY = stepY / moveLen;
    const side = getCreepSideSlideSign(creep, blocker);
    const lateral = Math.max(2.1, speed * CREEP_DEPTH_SPEED_MULTIPLIER * 2.9);
    const forward = Math.max(0.65, speed * 0.45);
    const cf = unitFoot(creep);
    const path = [
      { x: cf.x + forwardX * 10, y: Math.max(BATTLEFIELD_TOP_Y, Math.min(BATTLEFIELD_BOTTOM_Y, cf.y + side * 28)) },
      { x: goalX, y: goalY },
    ];
    const candidates = [
      [creep.x + forwardX * forward * 0.55, creep.y + side * lateral],
      [creep.x, creep.y + side * lateral * 1.2],
      [creep.x + forwardX * forward, creep.y + side * lateral * 1.45],
      [creep.x - forwardX * forward * 0.35, creep.y + side * lateral * 1.75],
      [creep.x + forwardX * forward * 1.55, creep.y + side * lateral * 0.85 + forwardY * forward],
    ];
    for (const [x, y] of candidates) {
      if (applyCreepStep(room, creep, x, y, target, mode, goalX, goalY, path, forwardX, side, softCrowd)) {
        creep.contactAvoid = null;
        creep.avoidSide = side;
        return true;
      }
    }
    return false;
  }

  function rotateList(list, offset = 0) {
    if (!list.length) return list;
    const start = ((offset % list.length) + list.length) % list.length;
    return [...list.slice(start), ...list.slice(0, start)];
  }

  function addObstacleAvoidanceCandidates(room, creep, candidates, goalX, goalY, target = null) {
    const blocker = getForwardBlockingUnit(room, creep, goalX, goalY, target);
    if (!blocker) return;
    const speed = creep.speed || 1.8;
    const cf = unitFoot(creep);
    const bf = unitFoot(blocker);
    const dir = Math.sign(goalX - cf.x) || creep.facing || TEAM_DIR[creep.teamId] || 1;
    const clearanceY = unitBlockRadiusY(creep) + unitBlockRadiusY(blocker) + 12;
    const topY = clampCreepY(bf.y - clearanceY - unitHeight(creep), unitHeight(creep));
    const bottomY = clampCreepY(bf.y + clearanceY - unitHeight(creep), unitHeight(creep));
    const preferredSide = Math.abs((goalY || cf.y) - (topY + unitHeight(creep))) < Math.abs((goalY || cf.y) - (bottomY + unitHeight(creep))) ? -1 : 1;
    const side = creep.avoidSide || (Math.abs((goalY || cf.y) - bf.y) < 18 ? getCreepAvoidSign(creep) : preferredSide) || 1;
    creep.avoidSide = side;
    const primaryY = side < 0 ? topY : bottomY;
    const secondaryY = side < 0 ? bottomY : topY;
    const lateralBoost = creep.stuckTicks > 2 ? 3.6 : 2.2;

    [primaryY, secondaryY].forEach((nextY, index) => {
      rotateList([0.2, 0.65, 1, 1.45, 2.1, -0.35], creep.slotPhase || 0).forEach(xMult => {
        candidates.push([
          creep.x + dir * speed * xMult,
          creep.y + Math.sign(nextY - creep.y) * Math.min(Math.abs(nextY - creep.y), Math.max(1.2, speed * CREEP_DEPTH_SPEED_MULTIPLIER * (lateralBoost - index * 0.7))),
        ]);
      });
    });
  }

  function addSlideAroundBlockerCandidates(room, creep, candidates, goalX, goalY, target = null) {
    const blocker = getForwardBlockingUnit(room, creep, goalX, goalY, target);
    if (!blocker) return;
    const speed = creep.speed || 1.8;
    const cf = unitFoot(creep);
    const bf = unitFoot(blocker);
    const dir = Math.sign(goalX - cf.x) || creep.facing || TEAM_DIR[creep.teamId] || 1;
    const lanePush = Math.max(1.4, speed * CREEP_DEPTH_SPEED_MULTIPLIER * 1.15);
    const sidePush = Math.max(1.8, speed * CREEP_DEPTH_SPEED_MULTIPLIER * 1.55);
    const overlapY = Math.abs(bf.y - cf.y);
    const blockerClearanceY = unitBlockRadiusY(creep) + unitBlockRadiusY(blocker) + 8;
    const autoSide = overlapY < blockerClearanceY ? (bf.y >= cf.y ? -1 : 1) : (bf.y >= cf.y ? 1 : -1);
    const preferred = creep.avoidSide || autoSide || getCreepAvoidSign(creep) || 1;
    const alt = -preferred;

    const slideOrders = [preferred, alt];
    const forwardWeights = [0.18, 0.35, 0.62, 0.86];
    slideOrders.forEach((side, sideIndex) => {
      forwardWeights.forEach((fw, i) => {
        const sideMul = sideIndex === 0 ? 1 : 0.9;
        const lateral = side * sidePush * (1 + i * 0.42) * sideMul;
        const forward = dir * speed * fw;
        candidates.push([creep.x + forward, creep.y + lanePush + lateral]);
        candidates.push([creep.x + forward * 0.8, creep.y + lateral]);
        candidates.push([creep.x + forward * 1.15, creep.y + lateral * 0.9]);
      });
    });
  }

  function addUnstuckCandidates(room, creep, candidates, goalX, goalY, target = null) {
    const blocker = getCreepBlockingUnit(room, creep, creep.x, creep.y, target);
    if (!blocker) return;
    const speed = creep.speed || 1.8;
    const cf = unitFoot(creep);
    const bf = unitFoot(blocker);
    const requiredY = unitBlockRadiusY(creep) + unitBlockRadiusY(blocker) + 4;
    const requiredX = unitBlockRadiusX(creep) + unitBlockRadiusX(blocker) + 4;
    const awayX = Math.sign(cf.x - bf.x) || -(Math.sign(goalX - cf.x) || creep.facing || TEAM_DIR[creep.teamId] || 1);
    const awayY = Math.sign(cf.y - bf.y) || getCreepAvoidSign(creep);
    creep.stuckTicks = Math.max(creep.stuckTicks || 0, 3);
    creep.avoidSide = awayY;
    const pushX = Math.max(2.4, speed * 1.8);
    const pushY = Math.max(2.6, speed * CREEP_DEPTH_SPEED_MULTIPLIER * 3.4);
    const escapeTopY = bf.y + awayY * requiredY - unitHeight(creep);
    const escapeSideX = bf.x + awayX * requiredX - unitWidth(creep) / 2;
    const escapeYs = [
      escapeTopY,
      creep.y + awayY * pushY,
      creep.y + awayY * pushY * 1.7,
      creep.y - awayY * pushY * 1.2,
    ];
    escapeYs.forEach(nextY => {
      candidates.push([escapeSideX, nextY]);
      candidates.push([creep.x + awayX * pushX, nextY]);
      candidates.push([creep.x + awayX * pushX * 1.8, nextY]);
      candidates.push([creep.x, nextY]);
    });
  }

  function findCreepPathWaypoint(room, creep, goalX, goalY, target = null) {
    const softCrowd = { ignoreAlliedCreeps: true };
    const startX = creep.x;
    const startY = creep.y;
    const goalTopX = goalX - unitWidth(creep) / 2;
    const goalTopY = goalY - unitHeight(creep);
    const searchMarginX = Math.max(160, Math.abs(goalTopX - startX) + 90);
    const minX = Math.max(0, Math.min(startX, goalTopX) - searchMarginX);
    const maxX = Math.min(WORLD_W - unitWidth(creep), Math.max(startX, goalTopX) + searchMarginX);
    const minY = BATTLEFIELD_TOP_Y - unitHeight(creep);
    const maxY = BATTLEFIELD_BOTTOM_Y - unitHeight(creep);
    const stepX = Math.max(24, unitBlockRadiusX(creep) * 2 + 4);
    const stepY = Math.max(18, unitBlockRadiusY(creep) * 2 + 6);
    const start = { x: Math.round(startX / stepX) * stepX, y: Math.round(startY / stepY) * stepY, first: null };
    const queue = [start];
    const seen = new Set([`${start.x}:${start.y}`]);
    const maxVisits = 90;
    let best = null;
    let visits = 0;

    while (queue.length && visits < maxVisits) {
      const node = queue.shift();
      visits += 1;
      const nodeFootX = node.x + unitWidth(creep) / 2;
      const nodeFootY = node.y + unitHeight(creep);
      const nodeScore = Math.hypot(nodeFootX - goalX, (nodeFootY - goalY) * 1.45);
      if (!best || nodeScore < best.score) best = { ...node, score: nodeScore };
      if (node.first && nodeScore < Math.max(28, stepX) && !isCreepMoveBlocked(room, creep, node.x, node.y, target, softCrowd)) return node.first;
      if (node.first && !getForwardBlockingUnit(room, { ...creep, x: node.x, y: node.y }, goalX, goalY, target)) return node.first;

      const directions = rotateList([
        [Math.sign(goalTopX - node.x) || 1, 0],
        [0, Math.sign(goalTopY - node.y) || 1],
        [0, -(Math.sign(goalTopY - node.y) || 1)],
        [-(Math.sign(goalTopX - node.x) || 1), 0],
        [Math.sign(goalTopX - node.x) || 1, Math.sign(goalTopY - node.y) || 1],
        [Math.sign(goalTopX - node.x) || 1, -(Math.sign(goalTopY - node.y) || 1)],
      ], creep.slotPhase || 0).sort((a, b) => {
        const ax = node.x + a[0] * stepX;
        const ay = node.y + a[1] * stepY;
        const bx = node.x + b[0] * stepX;
        const by = node.y + b[1] * stepY;
        const personalY = goalTopY + (creep.depthBias || 0);
        return Math.hypot(ax - goalTopX, (ay - personalY) * 1.45) - Math.hypot(bx - goalTopX, (by - personalY) * 1.45);
      });

      directions.forEach(([dx, dy]) => {
        const x = Math.round(Math.max(minX, Math.min(maxX, node.x + dx * stepX)) * 10) / 10;
        const y = Math.round(Math.max(minY, Math.min(maxY, node.y + dy * stepY)) * 10) / 10;
        const key = `${x}:${y}`;
        if (seen.has(key)) return;
        seen.add(key);
        if (isCreepMoveBlocked(room, creep, x, y, target, softCrowd)) return;
        queue.push({ x, y, first: node.first || { x, y } });
      });
    }
    return best?.first || null;
  }

  function addPathSearchCandidates(room, creep, candidates, goalX, goalY, target = null) {
    if (!getForwardBlockingUnit(room, creep, goalX, goalY, target) && (creep.stuckTicks || 0) < 2) return;
    const waypoint = findCreepPathWaypoint(room, creep, goalX, goalY, target);
    if (!waypoint) return;
    const speed = creep.speed || 1.8;
    const dx = waypoint.x - creep.x;
    const dy = waypoint.y - creep.y;
    const stepY = Math.sign(dy) * Math.min(Math.abs(dy), Math.max(1.2, speed * CREEP_DEPTH_SPEED_MULTIPLIER * 2.8));
    const stepX = Math.sign(dx) * Math.min(Math.abs(dx), Math.max(1.2, speed * 1.15));
    candidates.push([creep.x + stepX, creep.y + stepY]);
    candidates.push([creep.x + stepX, creep.y]);
    candidates.push([creep.x, creep.y + stepY]);
  }

  function getObjectiveBetweenCreepAndTarget(room, creep, target) {
    if (!target) return null;
    const cf = unitFoot(creep);
    const tf = unitFoot(target);
    const minX = Math.min(cf.x, tf.x) - unitBlockRadiusX(creep);
    const maxX = Math.max(cf.x, tf.x) + unitBlockRadiusX(creep);
    return (room.objectives || [])
      .filter(obj => obj.hp > 0 && obj.id !== target.id)
      .map(obj => {
        const of = unitFoot(obj);
        const dxSpan = maxX - minX;
        const t = dxSpan > 0 ? Math.max(0, Math.min(1, (of.x - minX) / dxSpan)) : 0;
        const corridorY = cf.y + (tf.y - cf.y) * t;
        const depthClearance = unitBlockRadiusY(creep) + unitBlockRadiusY(obj) + 18;
        const inPathX = of.x >= minX && of.x <= maxX;
        const inPathY = Math.abs(of.y - corridorY) < depthClearance + Math.abs(tf.y - cf.y) * 0.35;
        const embeddedX = Math.abs(of.x - cf.x) < unitBlockRadiusX(creep) + unitBlockRadiusX(obj) + 8;
        const embeddedY = Math.abs(of.y - cf.y) < unitBlockRadiusY(creep) + unitBlockRadiusY(obj) + 8;
        return {
          obj,
          distance: Math.hypot(of.x - cf.x, (of.y - cf.y) * 1.45),
          inPathX: inPathX || (embeddedX && of.x >= minX - 34 && of.x <= maxX + 34),
          inPathY: inPathY || embeddedY,
        };
      })
      .filter(entry => entry.inPathX && entry.inPathY)
      .sort((a, b) => a.distance - b.distance)[0]?.obj || null;
  }

  function getCreepNavigationGoal(room, creep, target, fallbackGoalX, fallbackGoalY) {
    const blocker = getObjectiveBetweenCreepAndTarget(room, creep, target);
    if (!blocker) return { x: fallbackGoalX, y: fallbackGoalY, target, path: [{ x: fallbackGoalX, y: fallbackGoalY }] };
    const cf = unitFoot(creep);
    const tf = unitFoot(target);
    const bf = unitFoot(blocker);
    const targetDir = Math.sign(tf.x - cf.x) || creep.facing || TEAM_DIR[creep.teamId] || 1;
    const clearanceY = unitBlockRadiusY(creep) + unitBlockRadiusY(blocker) + 26;
    const topFootY = bf.y - clearanceY;
    const bottomFootY = bf.y + clearanceY;
    const clampedTopY = clampCreepY(topFootY - unitHeight(creep), unitHeight(creep)) + unitHeight(creep);
    const clampedBottomY = clampCreepY(bottomFootY - unitHeight(creep), unitHeight(creep)) + unitHeight(creep);
    const topDelta = Math.abs(tf.y - clampedTopY);
    const bottomDelta = Math.abs(tf.y - clampedBottomY);
    const targetPrefersTop = topDelta <= bottomDelta;
    const personalSide = getCreepAvoidSign(creep);
    const side = creep.flankSide || (Math.abs(topDelta - bottomDelta) < 54 ? personalSide : (targetPrefersTop ? -1 : 1));
    const flankFootY = side < 0 ? clampedTopY : clampedBottomY;
    creep.flankSide = side;

    const sideClearanceX = unitBlockRadiusX(creep) + unitBlockRadiusX(blocker) + 24;
    const sideFootX = bf.x + targetDir * sideClearanceX;
    const reachedSide = targetDir > 0 ? cf.x > sideFootX : cf.x < sideFootX;
    const path = [];

    if (Math.abs(cf.y - bf.y) < clearanceY - 2) {
      path.push({ x: cf.x, y: flankFootY });
      path.push({ x: sideFootX, y: flankFootY });
    } else if (!reachedSide) {
      path.push({ x: sideFootX, y: flankFootY });
    }
    path.push({ x: fallbackGoalX, y: fallbackGoalY });

    const cleanPath = path.filter((point, index, list) => {
      if (index === 0) return Math.hypot(point.x - cf.x, (point.y - cf.y) * 1.45) > 8;
      const prev = list[index - 1];
      return Math.hypot(point.x - prev.x, (point.y - prev.y) * 1.45) > 8;
    });
    if (cleanPath.length) return { ...cleanPath[0], target, path: cleanPath, blockerId: blocker.id };

    creep.flankSide = 0;
    return { x: fallbackGoalX, y: fallbackGoalY, target, path: [{ x: fallbackGoalX, y: fallbackGoalY }] };
  }

  function tryMoveCreep(room, creep, candidates, goalX, goalY, target = null) {
    const unique = [];
    const seen = new Set();
    addUnstuckCandidates(room, creep, candidates, goalX, goalY, target);
    addPathSearchCandidates(room, creep, candidates, goalX, goalY, target);
    addObstacleAvoidanceCandidates(room, creep, candidates, goalX, goalY, target);
    addSlideAroundBlockerCandidates(room, creep, candidates, goalX, goalY, target);
    candidates.forEach(([nextX, nextY]) => {
      const x = Math.round(nextX * 10) / 10;
      const y = Math.round(clampCreepY(nextY, creep.h) * 10) / 10;
      const key = `${x}:${y}`;
      if (seen.has(key)) return;
      seen.add(key);
      unique.push([x, y]);
    });

    const sorted = unique
      .filter(([nextX, nextY]) => (nextX !== creep.x || nextY !== creep.y) && !isCreepMoveBlocked(room, creep, nextX, nextY, target))
      .sort((a, b) => {
        const personalGoalY = goalY + (creep.depthBias || 0);
        const da = Math.hypot((a[0] + unitWidth(creep) / 2) - goalX, (a[1] + unitHeight(creep)) - personalGoalY);
        const db = Math.hypot((b[0] + unitWidth(creep) / 2) - goalX, (b[1] + unitHeight(creep)) - personalGoalY);
        const vaX = a[0] - creep.x;
        const vaY = a[1] - creep.y;
        const vbX = b[0] - creep.x;
        const vbY = b[1] - creep.y;
        const prevVX = creep.lastStepX || 0;
        const prevVY = creep.lastStepY || 0;
        const turnPenaltyA = Math.abs(vaX - prevVX) * 0.18 + Math.abs(vaY - prevVY) * 0.3;
        const turnPenaltyB = Math.abs(vbX - prevVX) * 0.18 + Math.abs(vbY - prevVY) * 0.3;
        return (da + turnPenaltyA) - (db + turnPenaltyB);
      });

    if (!sorted.length) {
      creep.stuckTicks = (creep.stuckTicks || 0) + 1;
      if (creep.stuckTicks > 4) creep.avoidSide = -getCreepAvoidSign(creep);
      return false;
    }

    const beforeFoot = unitFoot(creep);
    const beforeDistance = Math.hypot(beforeFoot.x - goalX, (beforeFoot.y - goalY) * 1.45);
    const [x, y] = sorted[0];
    creep.lastStepX = x - creep.x;
    creep.lastStepY = y - creep.y;
    creep.x = x;
    creep.y = y;
    const afterFoot = unitFoot(creep);
    const afterDistance = Math.hypot(afterFoot.x - goalX, (afterFoot.y - goalY) * 1.45);
    const stillBlocked = getForwardBlockingUnit(room, creep, goalX, goalY, target);
    if (beforeDistance - afterDistance < 0.35 && stillBlocked) {
      creep.stuckTicks = (creep.stuckTicks || 0) + 1;
      if (creep.stuckTicks > 3 && creep.stuckTicks % 3 === 0) {
        creep.avoidSide = -(creep.avoidSide || creep.individualSide || 1);
      }
    } else {
      creep.stuckTicks = Math.max(0, (creep.stuckTicks || 0) - 1);
    }
    if (!stillBlocked) creep.avoidSide = creep.individualSide || 0;
    if (!getObjectiveBetweenCreepAndTarget(room, creep, target)) creep.flankSide = 0;
    return true;
  }

  const FLOW_CELL_SIZE = 44;
  const FLOW_NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  function getFlowField(room, teamId, goalX, goalY) {
    room._flowFields = room._flowFields || {};
    const cols = Math.max(8, Math.ceil(WORLD_W / FLOW_CELL_SIZE));
    const rows = Math.max(4, Math.ceil((BATTLEFIELD_BOTTOM_Y - BATTLEFIELD_TOP_Y) / FLOW_CELL_SIZE));
    const objectiveSignature = (room.objectives || [])
      .filter(obj => obj.hp > 0)
      .map(obj => `${obj.id}:${Math.round(obj.x)}:${Math.round(obj.y)}:${obj.hp}`)
      .join('|');
    const key = `${teamId}:${Math.round(goalX / 18)}:${Math.round(goalY / 18)}:${objectiveSignature}`;
    const cached = room._flowFields[key];
    if (cached) return cached;

    const blocked = Array.from({ length: rows }, () => Array(cols).fill(false));
    const field = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
    const toCell = (x, y) => {
      const cx = Math.max(0, Math.min(cols - 1, Math.floor(x / FLOW_CELL_SIZE)));
      const cy = Math.max(0, Math.min(rows - 1, Math.floor((y - BATTLEFIELD_TOP_Y) / FLOW_CELL_SIZE)));
      return { cx, cy };
    };

    (room.objectives || []).forEach(obj => {
      if (obj.hp <= 0) return;
      const f = unitFoot(obj);
      const rX = Math.max(20, unitBlockRadiusX(obj) + 10);
      const rY = Math.max(14, unitBlockRadiusY(obj) + 10);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = x * FLOW_CELL_SIZE + FLOW_CELL_SIZE * 0.5;
          const py = BATTLEFIELD_TOP_Y + y * FLOW_CELL_SIZE + FLOW_CELL_SIZE * 0.5;
          const dx = Math.abs(px - f.x);
          const dy = Math.abs(py - f.y);
          if (dx < rX && dy < rY) blocked[y][x] = true;
        }
      }
    });

    const { cx: gcx, cy: gcy } = toCell(goalX, goalY);
    blocked[gcy][gcx] = false;
    field[gcy][gcx] = 0;
    const queue = [{ x: gcx, y: gcy }];
    let qIdx = 0;
    while (qIdx < queue.length) {
      const cur = queue[qIdx++];
      const base = field[cur.y][cur.x];
      FLOW_NEIGHBORS.forEach(([nx, ny]) => {
        const x = cur.x + nx;
        const y = cur.y + ny;
        if (x < 0 || y < 0 || x >= cols || y >= rows || blocked[y][x]) return;
        const cost = base + (nx !== 0 && ny !== 0 ? 1.4 : 1);
        if (cost + 0.0001 < field[y][x]) {
          field[y][x] = cost;
          queue.push({ x, y });
        }
      });
    }

    const out = { cols, rows, field, blocked };
    room._flowFields = { [key]: out };
    return out;
  }

  function getFlowDirection(flow, x, y) {
    if (!flow) return { x: 0, y: 0 };
    const cx = Math.max(0, Math.min(flow.cols - 1, Math.floor(x / FLOW_CELL_SIZE)));
    const cy = Math.max(0, Math.min(flow.rows - 1, Math.floor((y - BATTLEFIELD_TOP_Y) / FLOW_CELL_SIZE)));
    let best = flow.field[cy][cx];
    let bx = 0;
    let by = 0;
    FLOW_NEIGHBORS.forEach(([dx, dy]) => {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= flow.cols || ny >= flow.rows) return;
      const v = flow.field[ny][nx];
      if (v < best) {
        best = v;
        bx = dx;
        by = dy;
      }
    });
    return { x: bx, y: by };
  }

  function getWaveSlotDesiredFootY(creep, fallbackY) {
    const laneFootY = (Number(creep.laneY) || (fallbackY - unitHeight(creep))) + unitHeight(creep);
    const slot = Number(creep.waveSlot || creep.laneIndex || 0);
    const row = (slot % CREEP_LANE_OFFSETS.length) - (CREEP_LANE_OFFSETS.length - 1) / 2;
    const desired = laneFootY + row * 2.6 + (creep.depthBias || 0) * 0.16;
    return Math.max(BATTLEFIELD_TOP_Y + unitBlockRadiusY(creep), Math.min(BATTLEFIELD_BOTTOM_Y - unitBlockRadiusY(creep), desired));
  }

  function trySteerMoveCreep(room, creep, goalX, goalY, target = null) {
    const softCrowd = { ignoreAlliedCreeps: true };
    const speed = creep.speed || 1.8;
    const cf = unitFoot(creep);
    const flow = getFlowField(room, creep.teamId, goalX, goalY);
    const flowDir = getFlowDirection(flow, cf.x, cf.y);
    const goalDx = goalX - cf.x;
    const goalDy = (goalY - cf.y) * CREEP_DEPTH_SPEED_MULTIPLIER;
    const goalLen = Math.hypot(goalDx, goalDy) || 1;
    let vx = flowDir.x * 1.35 + (goalDx / goalLen) * 0.55;
    let vy = flowDir.y * CREEP_DEPTH_SPEED_MULTIPLIER * 1.35 + (goalDy / goalLen) * 0.55;

    const desiredFootY = getWaveSlotDesiredFootY(creep, goalY);
    vy += Math.max(-0.42, Math.min(0.42, (desiredFootY - cf.y) / 54));

    const allies = (room.creeps || []).filter(unit => unit.hp > 0 && unit.id !== creep.id && unit.teamId === creep.teamId);
    allies.forEach(unit => {
      const uf = unitFoot(unit);
      const dx = cf.x - uf.x;
      const dy = (cf.y - uf.y) * 1.35;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const separateRange = unitBlockRadiusX(creep) + unitBlockRadiusX(unit) + 16;
      if (dist > separateRange) return;
      const t = (1 - dist / separateRange) ** 1.35;
      vx += (dx / dist) * t * 0.9;
      vy += (dy / dist) * t * 0.74;
    });

    const blockers = getCreepMoveBlockers(room, creep, target, softCrowd);
    for (let i = 0; i < blockers.length; i++) {
      const unit = blockers[i];
      const uf = unitFoot(unit);
      const dx = cf.x - uf.x;
      const dy = (cf.y - uf.y) * 1.25;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const isHero = Boolean(room.playerData?.[unit.id]);
      const isObjective = Boolean(unit.type === 'tower' || unit.type === 'ancient');
      const repelRange = unitBlockRadiusX(creep) + unitBlockRadiusX(unit) + (isHero ? 70 : isObjective ? 58 : 28);
      if (dist > repelRange) continue;
      const t = 1 - dist / repelRange;
      const forward = Math.sign(goalX - cf.x) || creep.facing || TEAM_DIR[creep.teamId] || 1;
      const side = getCreepSideSlideSign(creep, unit);
      const ahead = (uf.x - cf.x) * forward > -unitBlockRadiusX(unit) * 0.55;
      const overlappingBlock = Math.abs(uf.x - cf.x) < unitBlockRadiusX(creep) + unitBlockRadiusX(unit) + 1 &&
        Math.abs(uf.y - cf.y) < unitBlockRadiusY(creep) + unitBlockRadiusY(unit) + 1;
      if (isHero && !ahead && !overlappingBlock) continue;
      vx += (dx / dist) * t * (isHero ? 0.9 : 1.15);
      vy += (dy / dist) * t * (isHero ? 0.52 : 0.75);
      if (ahead && (isHero || isObjective)) vy += side * t * (isHero ? 1.15 : 0.95);
    }

    const forwardBlocker = getForwardBlockingUnit(room, creep, goalX, goalY, target, softCrowd);
    if (forwardBlocker) {
      const side = getCreepSideSlideSign(creep, forwardBlocker);
      vy += side * (0.65 + Math.min(0.7, (creep.stuckTicks || 0) * 0.08));
    }

    const len = Math.hypot(vx, vy) || 1;
    vx = (vx / len) * speed;
    vy = (vy / len) * Math.max(0.85, speed * CREEP_DEPTH_SPEED_MULTIPLIER);

    const nx = creep.x + vx;
    const ny = clampCreepY(creep.y + vy, creep.h);
    const path = [{ x: goalX, y: goalY }];
    const stepOptions = forwardBlocker ? { ...softCrowd, slideBlockerId: forwardBlocker.id } : softCrowd;
    if (applyCreepStep(room, creep, nx, ny, target, 'group-steer', goalX, goalY, path, flowDir.x, flowDir.y, stepOptions)) {
      return true;
    }

    const slideY = clampCreepY(creep.y + vy, creep.h);
    if (applyCreepStep(room, creep, creep.x, slideY, target, 'group-slide-y', goalX, goalY, path, flowDir.x, flowDir.y, stepOptions)) {
      creep.stuckTicks = (creep.stuckTicks || 0) + 1;
      return true;
    }
    const slideX = creep.x + vx;
    if (applyCreepStep(room, creep, slideX, creep.y, target, 'group-slide-x', goalX, goalY, path, flowDir.x, flowDir.y, stepOptions)) {
      creep.stuckTicks = (creep.stuckTicks || 0) + 1;
      return true;
    }

    setCreepDebugRoute(creep, 'group-blocked', goalX, goalY, creep.x + unitWidth(creep) / 2, creep.y + unitHeight(creep), path, flowDir.x, flowDir.y);
    creep.stuckTicks = (creep.stuckTicks || 0) + 1;
    if ((creep.stuckTicks || 0) % 4 === 0) creep.avoidSide = -getCreepAvoidSign(creep);
    return false;
  }

  function buildFallbackMoveCandidates(creep, goalX, goalY) {
    const speed = creep.speed || 1.8;
    const goalTopX = goalX - unitWidth(creep) / 2;
    const stepX = Math.sign(goalTopX - creep.x) * Math.min(Math.abs(goalTopX - creep.x), Math.max(1.2, speed));
    const goalFootY = goalY;
    const stepY = Math.sign(goalFootY - unitFoot(creep).y) * Math.min(Math.abs(goalFootY - unitFoot(creep).y), Math.max(0.9, speed * CREEP_DEPTH_SPEED_MULTIPLIER));
    const avoidSign = getCreepAvoidSign(creep);
    const sideSteps = rotateList([0, avoidSign, -avoidSign, avoidSign * 2, -avoidSign * 2, avoidSign * 3, -avoidSign * 3], creep.slotPhase || 0);
    const xSteps = rotateList([1, 0.7, 0.4, -0.3, 1.2], creep.slotPhase || 0);
    const candidates = [];
    xSteps.forEach(xMult => {
      sideSteps.forEach(side => {
        candidates.push([
          creep.x + stepX * xMult,
          creep.y + stepY + side * Math.max(1.1, speed * CREEP_DEPTH_SPEED_MULTIPLIER * (creep.stuckTicks > 2 ? 1.9 : 0.78)),
        ]);
      });
    });
    return candidates;
  }

  function setCreepDebugRoute(creep, mode, goalX, goalY, nextFootX, nextFootY, path = [], flowX = 0, flowY = 0) {
    creep.debugGoalX = goalX;
    creep.debugGoalY = goalY;
    creep.debugPath = path.length ? path : [{ x: goalX, y: goalY }];
    creep.debugMode = mode;
    creep.debugNav = {
      mode,
      flowX,
      flowY,
      goalX,
      goalY,
      nextX: nextFootX,
      nextY: nextFootY,
    };
  }

  function applyCreepStep(room, creep, nextX, nextY, target, mode, goalX, goalY, path = [], flowX = 0, flowY = 0, options = {}) {
    const x = Math.max(0, Math.min(WORLD_W - unitWidth(creep), nextX));
    const y = clampCreepY(nextY, creep.h);
    if (isCreepMoveBlocked(room, creep, x, y, target, options)) return false;
    creep.lastStepX = x - creep.x;
    creep.lastStepY = y - creep.y;
    creep.x = x;
    creep.y = y;
    setCreepDebugRoute(creep, mode, goalX, goalY, x + unitWidth(creep) / 2, y + unitHeight(creep), path, flowX, flowY);
    creep.stuckTicks = Math.max(0, (creep.stuckTicks || 0) - 1);
    return true;
  }

  function getContactAvoidTarget(room, creep, blocker, moveX, moveY, sideSign = 1, locked = null) {
    const cf = unitFoot(creep);
    const bf = unitFoot(blocker);
    let nx = Number(locked?.normalX);
    let ny = Number(locked?.normalY);
    let tx = Number(locked?.tangentX);
    let ty = Number(locked?.tangentY);
    const hasLockedTangent = Number.isFinite(tx) && Number.isFinite(ty) && Math.hypot(tx, ty) > 0.001;
    if (hasLockedTangent) {
      const tangentLen = Math.hypot(tx, ty) || 1;
      tx /= tangentLen;
      ty /= tangentLen;
      if (!Number.isFinite(nx) || !Number.isFinite(ny) || Math.hypot(nx, ny) < 0.001) {
        nx = -ty * sideSign;
        ny = tx * sideSign;
      }
    } else {
      nx = bf.x - cf.x;
      ny = bf.y - cf.y;
      const contactLen = Math.hypot(nx, ny);
      if (contactLen < 0.001) {
        nx = moveX;
        ny = moveY;
      }
      const normalLen = Math.hypot(nx, ny);
      if (normalLen < 0.001) {
        nx = (creep.facing || TEAM_DIR[creep.teamId] || 1);
        ny = 0;
      } else {
        nx /= normalLen;
        ny /= normalLen;
      }
      // Dodge along the 90-degree tangent of the contact normal. Example:
      // contact normal up (0,-1) -> left tangent (-1,0) when sideSign is +1.
      tx = ny * sideSign;
      ty = -nx * sideSign;
    }

    const clearance = Number.isFinite(locked?.clearance) ? locked.clearance :
      Math.abs(tx) * (unitBlockRadiusX(creep) + unitBlockRadiusX(blocker)) +
      Math.abs(ty) * (unitBlockRadiusY(creep) + unitBlockRadiusY(blocker)) +
      12;
    const currentTangentDistance = (cf.x - bf.x) * tx + (cf.y - bf.y) * ty;
    const remainingClearance = Math.max(8, clearance - currentTangentDistance);
    const rawFootX = cf.x + tx * remainingClearance;
    const rawFootY = cf.y + ty * remainingClearance;
    const footX = Math.max(unitWidth(creep) / 2, Math.min(WORLD_W - unitWidth(creep) / 2, rawFootX));
    const footY = Math.max(BATTLEFIELD_TOP_Y, Math.min(BATTLEFIELD_BOTTOM_Y, rawFootY));
    const clampPenalty = Math.abs(footX - rawFootX) + Math.abs(footY - rawFootY);
    const targetTopX = footX - unitWidth(creep) / 2;
    const targetTopY = clampCreepY(footY - unitHeight(creep), unitHeight(creep));

    return {
      side: sideSign,
      normalX: nx,
      normalY: ny,
      tangentX: tx,
      tangentY: ty,
      clearance,
      footX,
      footY,
      targetTopX,
      targetTopY,
      clampPenalty,
      currentTangentDistance,
      remainingClearance,
    };
  }

  function beginContactAvoid(room, creep, blocker, goalX, goalY, moveX = 0, moveY = 0) {
    if (!blocker) return;
    const preferredSide = creep.contactAvoid?.side || creep.avoidSide || 1;
    const softCrowd = { ignoreAlliedCreeps: true };
    const options = [preferredSide, -preferredSide]
      .map(side => getContactAvoidTarget(room, creep, blocker, moveX, moveY, side))
      .sort((a, b) => {
        const blockedA = isCreepMoveBlocked(room, creep, a.targetTopX, a.targetTopY, null, softCrowd) ? 120 : 0;
        const blockedB = isCreepMoveBlocked(room, creep, b.targetTopX, b.targetTopY, null, softCrowd) ? 120 : 0;
        const edgeA = getBoundaryTangentPenalty(creep, a.tangentY);
        const edgeB = getBoundaryTangentPenalty(creep, b.tangentY);
        const goalA = Math.hypot(a.footX - goalX, (a.footY - goalY) * 1.45);
        const goalB = Math.hypot(b.footX - goalX, (b.footY - goalY) * 1.45);
        return (blockedA + edgeA + a.clampPenalty * 4 + goalA * 0.02) - (blockedB + edgeB + b.clampPenalty * 4 + goalB * 0.02);
      });
    const chosen = options[0];
    creep.contactAvoid = {
      blockerId: blocker.id,
      side: chosen.side,
      normalX: chosen.normalX,
      normalY: chosen.normalY,
      tangentX: chosen.tangentX,
      tangentY: chosen.tangentY,
      moveX,
      moveY,
      clearance: chosen.clearance,
      footX: chosen.footX,
      footY: chosen.footY,
      startedAt: Date.now(),
      failedTicks: 0,
      goalX,
      goalY,
    };
    creep.avoidSide = chosen.side || creep.avoidSide || 1;
  }

  function tryContactAvoidMove(room, creep, goalX, goalY, target = null) {
    const softCrowd = { ignoreAlliedCreeps: true };
    const avoid = creep.contactAvoid;
    if (!avoid) return false;
    const blocker = getUnitById(room, avoid.blockerId) || getCreepBlockingUnit(room, creep, creep.x, creep.y, target);
    if (!blocker || blocker.hp <= 0) {
      creep.contactAvoid = null;
      return false;
    }

    const speed = creep.speed || 1.8;
    const cf = unitFoot(creep);
    const moveX = avoid.moveX || (goalX - cf.x);
    const moveY = avoid.moveY || (goalY - cf.y);
    const side = avoid.side || 1;
    const avoidTarget = getContactAvoidTarget(room, creep, blocker, moveX, moveY, side, avoid);
    const boundaryEscape = getCreepBoundaryEscapeSign(creep, 20);
    const tangentIntoBoundary = boundaryEscape && Math.sign(avoidTarget.tangentY || 0) === -boundaryEscape;
    if (tangentIntoBoundary) {
      creep.contactAvoid = null;
      beginContactAvoid(room, creep, blocker, goalX, goalY, moveX, moveY);
      return false;
    }
    creep.contactAvoid = {
      ...avoid,
      tangentX: avoidTarget.tangentX,
      tangentY: avoidTarget.tangentY,
      normalX: avoidTarget.normalX,
      normalY: avoidTarget.normalY,
      clearance: avoidTarget.clearance,
      footX: avoidTarget.footX,
      footY: avoidTarget.footY,
    };
    const targetTopX = avoidTarget.targetTopX;
    const targetTopY = avoidTarget.targetTopY;
    const dx = targetTopX - creep.x;
    const dy = targetTopY - creep.y;
    const targetDist = Math.hypot(dx, dy);
    const path = [
      { x: avoidTarget.footX, y: avoidTarget.footY },
      { x: goalX, y: goalY },
    ];

    if (targetDist > 2.5) {
      const stepX = (dx / Math.max(1, targetDist)) * speed;
      const stepY = (dy / Math.max(1, targetDist)) * Math.max(1.1, speed * CREEP_DEPTH_SPEED_MULTIPLIER * 1.8);
      const candidates = [
        [creep.x + stepX, creep.y + stepY],
        [creep.x + stepX * 0.5, creep.y + stepY],
        [creep.x + stepX, creep.y + stepY * 0.5],
      ];
      for (const [x, y] of candidates) {
        if (applyCreepStep(room, creep, x, y, target, 'contact-90', goalX, goalY, path, avoidTarget.tangentX, avoidTarget.tangentY, softCrowd)) {
          creep.contactAvoid.failedTicks = 0;
          return true;
        }
      }
    }

    const goalDx = goalX - cf.x;
    const goalDy = goalY - cf.y;
    const goalLen = Math.hypot(goalDx, goalDy) || 1;
    const nextForwardX = creep.x + (goalDx / goalLen) * speed;
    const nextForwardY = creep.y + (goalDy / goalLen) * Math.max(0.8, speed * CREEP_DEPTH_SPEED_MULTIPLIER);
    const forwardBlocker = getCreepBlockingUnit(room, creep, nextForwardX, nextForwardY, target, softCrowd);
    const sideClear = avoidTarget.currentTangentDistance >= avoidTarget.clearance * 0.72;
    if (!forwardBlocker && sideClear) {
      creep.contactAvoid = null;
      return false;
    }

    const extraX = avoidTarget.tangentX * Math.max(1.4, speed * 0.9);
    const extraY = avoidTarget.tangentY * Math.max(1.4, speed * CREEP_DEPTH_SPEED_MULTIPLIER * 2.2);
    if (applyCreepStep(room, creep, creep.x + extraX, creep.y + extraY, target, 'contact-90', goalX, goalY, path, avoidTarget.tangentX, avoidTarget.tangentY, softCrowd)) return true;
    if (trySideContactSlide(room, creep, blocker, goalX, goalY, target, moveX, moveY, 'contact-slide')) return true;
    creep.contactAvoid.failedTicks = (creep.contactAvoid.failedTicks || 0) + 1;
    if (creep.contactAvoid.failedTicks > 8) {
      creep.contactAvoid.side = -side;
      creep.avoidSide = -side;
      creep.contactAvoid.failedTicks = 0;
    }
    return false;
  }

  function tryBoundaryPocketEscape(room, creep, goalX, goalY, target = null) {
    const escapeY = getCreepBoundaryEscapeSign(creep, 22);
    if (!escapeY) return false;
    const softCrowd = { ignoreAlliedCreeps: true };
    const speed = creep.speed || 1.8;
    const cf = unitFoot(creep);
    const forward = Math.sign(goalX - cf.x) || creep.facing || TEAM_DIR[creep.teamId] || 1;
    const lift = Math.max(2.4, speed * CREEP_DEPTH_SPEED_MULTIPLIER * 3.4);
    const nudge = Math.max(0.9, speed * 0.55);
    const path = [
      { x: cf.x + forward * 12, y: Math.max(BATTLEFIELD_TOP_Y, Math.min(BATTLEFIELD_BOTTOM_Y, cf.y + escapeY * 34)) },
      { x: goalX, y: goalY },
    ];
    const candidates = [
      [creep.x, creep.y + escapeY * lift],
      [creep.x + forward * nudge, creep.y + escapeY * lift],
      [creep.x - forward * nudge * 0.55, creep.y + escapeY * lift * 1.25],
      [creep.x + forward * nudge * 1.6, creep.y + escapeY * lift * 1.1],
    ];
    for (const [x, y] of candidates) {
      if (applyCreepStep(room, creep, x, y, target, 'boundary-pocket', goalX, goalY, path, forward * 0.35, escapeY, softCrowd)) {
        creep.contactAvoid = null;
        creep.avoidSide = escapeY;
        return true;
      }
    }
    return false;
  }

  function tryDirectAdvanceMove(room, creep, goalX, goalY, target = null) {
    const softCrowd = { ignoreAlliedCreeps: true };
    const speed = creep.speed || 1.8;
    const cf = unitFoot(creep);
    const dx = goalX - cf.x;
    const dy = (goalY - cf.y) * CREEP_DEPTH_SPEED_MULTIPLIER;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.5) return true;
    const stepX = (dx / dist) * speed;
    const stepY = (dy / dist) * Math.max(0.8, speed * CREEP_DEPTH_SPEED_MULTIPLIER);
    const nextX = creep.x + stepX;
    const nextY = creep.y + stepY;
    const blocker = getCreepBlockingUnit(room, creep, nextX, nextY, target, softCrowd);
    const path = [{ x: goalX, y: goalY }];
    if (!blocker) {
      return applyCreepStep(room, creep, nextX, nextY, target, 'advance', goalX, goalY, path, Math.sign(stepX), Math.sign(stepY), softCrowd);
    }
    if (!isFrontContactBlocker(creep, blocker, stepX, stepY)) {
      creep.contactAvoid = null;
      if (trySideContactSlide(room, creep, blocker, goalX, goalY, target, stepX, stepY, 'side-contact')) return true;
      setCreepDebugRoute(creep, 'side-contact', goalX, goalY, cf.x, cf.y, path, Math.sign(stepX), Math.sign(stepY));
      creep.stuckTicks = (creep.stuckTicks || 0) + 1;
      return false;
    }
    beginContactAvoid(room, creep, blocker, goalX, goalY, stepX, stepY);
    setCreepDebugRoute(creep, 'contact-hit', goalX, goalY, cf.x, cf.y, [
      { x: creep.contactAvoid?.footX || cf.x, y: creep.contactAvoid?.footY || cf.y },
      { x: goalX, y: goalY },
    ], Math.sign(stepX), Math.sign(stepY));
    creep.stuckTicks = (creep.stuckTicks || 0) + 1;
    return false;
  }

  function tryLocalSearchEscape(room, creep, goalX, goalY, target = null) {
    const softCrowd = { ignoreAlliedCreeps: true };
    const waypoint = findCreepPathWaypoint(room, creep, goalX, goalY, target);
    if (!waypoint) return false;
    const speed = creep.speed || 1.8;
    const dx = waypoint.x - creep.x;
    const dy = waypoint.y - creep.y;
    const stepX = Math.sign(dx) * Math.min(Math.abs(dx), Math.max(1.1, speed));
    const stepY = Math.sign(dy) * Math.min(Math.abs(dy), Math.max(1.1, speed * CREEP_DEPTH_SPEED_MULTIPLIER * 2.1));
    const footWaypoint = {
      x: waypoint.x + unitWidth(creep) / 2,
      y: waypoint.y + unitHeight(creep),
    };
    return applyCreepStep(room, creep, creep.x + stepX, creep.y + stepY, target, 'local-search', goalX, goalY, [
      footWaypoint,
      { x: goalX, y: goalY },
    ], Math.sign(stepX), Math.sign(stepY), softCrowd);
  }

  function moveCreepWithContactProcess(room, creep, goalX, goalY, target = null) {
    if (trySteerMoveCreep(room, creep, goalX, goalY, target)) return true;
    if (tryContactAvoidMove(room, creep, goalX, goalY, target)) return true;
    if (tryDirectAdvanceMove(room, creep, goalX, goalY, target)) return true;
    if ((creep.stuckTicks || 0) >= 1 && tryBoundaryPocketEscape(room, creep, goalX, goalY, target)) return true;
    if ((creep.stuckTicks || 0) >= 3 && tryLocalSearchEscape(room, creep, goalX, goalY, target)) return true;
    creep.stuckTicks = (creep.stuckTicks || 0) + 1;
    if ((creep.stuckTicks || 0) % 5 === 0) creep.avoidSide = -getCreepAvoidSign(creep);
    return false;
  }

  function moveCreepTowardLane(room, creep, dir) {
    const speed = creep.speed || 1.8;
    const desiredY = typeof creep.laneY === 'number' ? creep.laneY : creep.y;
    const goalX = creep.x + dir * speed * 20 + unitWidth(creep) * 0.5;
    const goalY = desiredY + unitHeight(creep);
    creep.debugGoalX = goalX;
    creep.debugGoalY = goalY;
    creep.debugPath = [{ x: goalX, y: goalY }];
    creep.debugMode = 'lane';
    if (!moveCreepWithContactProcess(room, creep, goalX, goalY, null)) creep.state = 'idle';
  }

  function isChaseTarget(room, target) {
    return Boolean(target?.id?.startsWith?.('cr_') || room.playerData?.[target?.id] || target?.type === 'tower' || target?.type === 'ancient');
  }

  function getCreepAttackSlotGoal(room, creep, target, approachDir, fallbackGoalX, fallbackGoalY) {
    if (!target || creep.role === 'ranged') return { x: fallbackGoalX, y: fallbackGoalY };
    const tf = unitFoot(target);
    const range = creep.range || 38;
    const gapX = Math.max(18, range * 0.5 + unitFootRadiusX(target) * 0.55);
    const depthOffsets = rotateList([0, -18, 18, -36, 36, -54, 54, -72, 72, -90, 90], creep.waveSlot || creep.slotPhase || 0);
    const sideOptions = creep.individualSide === approachDir ? [approachDir, -approachDir] : [-approachDir, approachDir];
    const blockers = [
      ...(room.creeps || []).filter(unit => unit.hp > 0 && unit.id !== creep.id && unit.teamId === creep.teamId),
      ...Object.values(room.playerData || {}).filter(unit => unit.hp > 0 && unit.teamId === creep.teamId),
    ];
    const slots = [];
    sideOptions.forEach((side, sideIndex) => {
      depthOffsets.forEach((offset, offsetIndex) => {
        const footX = tf.x - side * gapX;
        const footY = Math.max(BATTLEFIELD_TOP_Y, Math.min(BATTLEFIELD_BOTTOM_Y, tf.y + offset));
        const topX = footX - unitWidth(creep) / 2;
        const topY = footY - unitHeight(creep);
        const candidate = { ...creep, x: topX, y: topY };
        const blockedBy = blockers.filter(unit => {
          const cf = unitFoot(candidate);
          const uf = unitFoot(unit);
          const dx = Math.abs(cf.x - uf.x);
          const dy = Math.abs(cf.y - uf.y);
          return dx < unitBlockRadiusX(candidate) + unitBlockRadiusX(unit) + 2 &&
            dy < unitBlockRadiusY(candidate) + unitBlockRadiusY(unit) + 2;
        }).length;
        const inRange = isCreepTargetInRange(candidate, target);
        const currentDistance = Math.hypot(footX - unitFoot(creep).x, (footY - unitFoot(creep).y) * 1.45);
        const personalOffsetCost = Math.abs(offset - (creep.depthBias || 0)) * 1.4;
        slots.push({
          x: footX,
          y: footY,
          blockedBy,
          inRange,
          score: blockedBy * 1000 + (inRange ? 0 : 160) + sideIndex * 42 + offsetIndex * 14 + personalOffsetCost + currentDistance * 0.05,
        });
      });
    });
    return slots.sort((a, b) => a.score - b.score)[0] || { x: fallbackGoalX, y: fallbackGoalY };
  }

  function moveCreepTowardTarget(room, creep, target, dir) {
    if (!isChaseTarget(room, target)) {
      moveCreepTowardLane(room, creep, dir);
      return;
    }

    const speed = creep.speed || 1.8;
    const creepFoot = unitFoot(creep);
    const targetFoot = unitFoot(target);
    const dx = targetFoot.x - creepFoot.x;
    const preferredGap = creep.role === 'ranged' ? Math.max(96, (creep.range || 210) * 0.68) : Math.max(14, (creep.range || 38) * 0.38);
    const approachDir = Math.sign(dx) || dir || TEAM_DIR[creep.teamId] || 1;
    const goalFootX = targetFoot.x - approachDir * preferredGap;
    const attackSlotGoal = getCreepAttackSlotGoal(room, creep, target, approachDir, goalFootX, targetFoot.y);
    const navigationGoal = { x: attackSlotGoal.x, y: attackSlotGoal.y, path: [{ x: attackSlotGoal.x, y: attackSlotGoal.y }] };
    creep.debugGoalX = attackSlotGoal.x;
    creep.debugGoalY = attackSlotGoal.y;
    creep.debugPath = navigationGoal.path;
    creep.debugMode = 'target';
    if (!moveCreepWithContactProcess(room, creep, navigationGoal.x, navigationGoal.y, target)) creep.state = 'idle';
  }

  function tickWorld(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return stopWorldLoop(roomId);
    const now = Date.now();

    if (!room.nextCreepWaveAt || now >= room.nextCreepWaveAt) {
      TEAM_IDS.forEach(teamId => {
        for (let laneIndex = 0; laneIndex < CREEP_WAVE_SIZE; laneIndex++) {
          spawnCreep(room, teamId, getWaveRole(laneIndex), laneIndex);
        }
      });
      room.nextCreepWaveAt = now + CREEP_WAVE_MS;
    }

    updateCreepAttacks(room, roomId, now);
    updateCreepProjectiles(room, roomId);
    updateTowerShotImpacts(room, roomId, now);

    (room.creeps || []).forEach(creep => {
      if (creep.hp <= 0) return;
      const target = findNearestEnemyUnit(room, creep);
      if (!target) return;
      const strategicObjective = getNextAttackableObjective(room, creep.teamId);
      const farGoalTarget = strategicObjective || target;
      const creepFoot = unitFoot(creep);
      const targetFoot = unitFoot(target);
      const farFoot = unitFoot(farGoalTarget);
      creep.debugGoalX = targetFoot.x;
      creep.debugGoalY = targetFoot.y;
      creep.debugFarGoalX = farFoot.x;
      creep.debugFarGoalY = farFoot.y;
      creep.debugMode = 'acquire';
      if (!creep.debugNav) {
        creep.debugNav = {
          mode: 'acquire',
          flowX: 0,
          flowY: 0,
          goalX: targetFoot.x,
          goalY: targetFoot.y,
          nextX: creepFoot.x,
          nextY: creepFoot.y,
        };
      }
      const targetDx = targetFoot.x - creepFoot.x;
      const dir = Math.abs(targetDx) > 6 ? Math.sign(targetDx) : creep.facing || TEAM_DIR[creep.teamId];
      creep.facing = dir;
      if (!isCreepTargetInRange(creep, target)) {
        creep.state = 'walk';
        moveCreepTowardTarget(room, creep, target, dir);
      } else if ((creep.attackAt || 0) <= now) {
        creep.state = 'attack';
        creep.debugMode = 'attack';
        creep.debugNav = {
          mode: 'attack-hold',
          flowX: dir || 0,
          flowY: 0,
          goalX: targetFoot.x,
          goalY: targetFoot.y,
          nextX: creepFoot.x,
          nextY: creepFoot.y,
        };
        creep.attackAt = now + (creep.attackCooldown || 900);
        queueCreepAttack(room, creep, target, now);
      } else {
        creep.state = 'idle';
        creep.debugMode = 'idle';
        creep.debugNav = {
          mode: 'idle-hold',
          flowX: dir || 0,
          flowY: 0,
          goalX: targetFoot.x,
          goalY: targetFoot.y,
          nextX: creepFoot.x,
          nextY: creepFoot.y,
        };
      }
    });

    resolveCreepSpacing(room);

    getLivingObjectives(room).forEach(obj => {
      if (obj.type !== 'tower' || (obj.attackAt || 0) > now) return;
      const targetInfo = getTowerTarget(room, obj, now);
      if (!targetInfo) return;
      const { unit: target, type } = targetInfo;
      obj.attackAt = now + 1100;
      queueTowerShot(room, roomId, obj, target, type, now);
    });

    room.creeps = (room.creeps || []).filter(creep => creep.hp > 0);
    room.players.forEach(pid => sendTo(pid, {
      type: 'world_state',
      creeps: room.creeps || [],
      creepProjectiles: room.creepProjectiles || [],
      objectives: room.objectives || [],
      winner: room.winner || null,
    }));
    if (room.winner) {
      room.status = 'finished';
      const scores = rooms.getScores(roomId);
      sendScores(roomId);
      room.players.forEach(pid => sendTo(pid, { type: 'game_over', winner: room.winner, scores }));
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

  function startRoomAfterAssetLoad(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'loading') return;
    const elapsed = Date.now() - (room.assetLoadingStartedAt || 0);
    if (elapsed < 650) {
      if (!room.assetStartScheduled) {
        room.assetStartScheduled = true;
        setTimeout(() => startRoomAfterAssetLoad(roomId), 650 - elapsed);
      }
      return;
    }
    rooms.startGame(roomId);
    const state = rooms.getState(roomId);
    room.players.forEach(pid => sendTo(pid, { type: 'game_start', state }));
    startWorldLoop(roomId);
    broadcastRoomList();
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

        rooms.beginAssetLoading(roomId);
        const state = rooms.getState(roomId);
        room.players.forEach(pid => sendTo(pid, { type: 'asset_loading_start', state }));
        broadcastRoomList();
        break;
      }

      case 'asset_progress': {
        const roomId = ws.roomId;
        const room = rooms.updateAssetProgress(roomId, playerId, msg.progress);
        if (!room) break;
        const state = rooms.getState(roomId);
        room.players.forEach(pid => sendTo(pid, { type: 'asset_progress', state }));
        if (rooms.areAssetsReady(roomId)) startRoomAfterAssetLoad(roomId);
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
        const nextX = Number.isFinite(Number(x)) ? Number(x) : player.x;
        const nextY = Number.isFinite(Number(y)) ? Number(y) : player.y;
        const blockedByUnit = isPlayerMoveBlocked(room, player, nextX, nextY);
        const acceptedX = blockedByUnit ? player.x : nextX;
        const acceptedY = blockedByUnit ? player.y : nextY;
        Object.assign(player, {
          x: acceptedX,
          y: acceptedY,
          vx: blockedByUnit ? 0 : vx,
          vy: blockedByUnit ? 0 : vy,
          onGround,
          facing,
          state: blockedByUnit ? 'idle' : pstate,
        });
        if (player.testImmortal) player.hp = player.maxHp;
        else if (hp !== undefined) player.hp = hp;
        if (player.hp <= 0 && player.teamId && room.creepAggro?.[player.teamId]?.targetId === player.id) {
          delete room.creepAggro[player.teamId];
        }
        if (player.hp <= 0) clearTowerAggroTarget(room, player.id);

        broadcast(roomId, {
          type: 'player_state',
          playerId,
          x: player.x,
          y: player.y,
          vx: player.vx,
          vy: player.vy,
          onGround,
          facing,
          state: player.state,
          hp: player.hp,
          action,
        }, playerId);
        if (blockedByUnit) {
          sendTo(playerId, {
            type: 'player_state',
            playerId,
            x: player.x,
            y: player.y,
            vx: player.vx,
            vy: player.vy,
            onGround,
            facing,
            state: player.state,
            hp: player.hp,
            action,
          });
        }
        break;
      }

      case 'test_mode': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'playing') break;
        const player = room.playerData[playerId];
        if (!player) break;
        player.testImmortal = !!msg.immortal;
        if (player.testImmortal) {
          player.hp = player.maxHp;
          player.state = player.state === 'dead' ? 'idle' : player.state;
        }
        sendTo(playerId, {
          type: 'test_mode',
          immortal: player.testImmortal,
          hp: player.hp,
        });
        break;
      }

      case 'test_restart_match': {
        const roomId = ws.roomId;
        const room = rooms.get(roomId);
        if (!room || !['playing', 'finished'].includes(room.status)) break;
        rooms.startGame(roomId);
        const state = rooms.getState(roomId);
        room.players.forEach(pid => sendTo(pid, { type: 'game_start', state, restarted: true }));
        startWorldLoop(roomId);
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
        if (attacker?.teamId && target.teamId && attacker.teamId !== target.teamId) {
          rememberCreepHeroAggro(room, target.teamId, attacker.id);
          if (isHeroInAnyEnemyTowerAggro(room, target.teamId, attacker)) {
            rememberTowerHeroAggro(room, target.teamId, attacker.id);
          }
        }
        damagePlayer(room, roomId, target, msg.damage, playerId, msg.skillId, msg.hitDir || 1);
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
          windup: msg.windup,
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
          const killed = damageCreep(room, creep, damage, attacker, msg.hitDir || null, roomId);
          if (!killed) {
            sendTo(playerId, {
              type: 'unit_hit_confirmed',
              unitId: creep.id,
              hp: creep.hp,
              damage,
              skillId: msg.skillId,
              hitDir: msg.hitDir || null,
            });
          }
          break;
        }
        const objective = (room.objectives || []).find(entry => entry.id === unitId);
        if (objective && objective.teamId !== attacker.teamId) {
          damageObjective(room, objective, damage, attacker.teamId, roomId, attacker, msg.hitDir || null);
          sendScores(roomId, attacker.id);
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
