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
  const CREEP_LIMIT_PER_TEAM = 16;
  const CREEP_LANE_OFFSETS = [-42, 0, 42, 0];
  const CREEP_FORMATION_X = { melee: [72, 42, 12], ranged: [-24] };
  const CREEP_HERO_AGGRO_RANGE = 360;
  const CREEP_HERO_DISENGAGE_RANGE = 540;
  const CREEP_ENEMY_CREEP_DETECT_RANGE = { melee: 118, ranged: 155 };
  const CREEP_ATTACK_ANIMATION_MS = 600;
  const CREEP_ATTACK_WINDUP_RATIO = { melee: 0.46, ranged: 0.58 };
  const CREEP_TEAM_TYPES = {
    sun: { melee: ['monster_6', 'monster_7'], ranged: ['monster_9'] },
    moon: { melee: ['monster_8'], ranged: ['monster_10'] },
  };
  const TEAM_IDS = ['sun', 'moon'];
  const TEAM_DIR = { sun: 1, moon: -1 };
  const BATTLEFIELD_TOP_Y = 300;
  const BATTLEFIELD_BOTTOM_Y = 540;
  const CREEP_SPAWN = {
    sun: { x: 260, y: 438 },
    moon: { x: 2218, y: 438 },
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
    const reachX = range + unitFootRadiusX(target) * 0.75 + unitFootRadiusX(creep) * 0.35;
    const reachZ = unitFootRadiusY(creep) + unitFootRadiusY(target) + Math.max(18, range * 0.9);
    return dx <= reachX && depth <= reachZ;
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

  function clampCreepY(y, h = 42) {
    return Math.max(BATTLEFIELD_TOP_Y - h, Math.min(BATTLEFIELD_BOTTOM_Y - h, y));
  }

  function getUnitById(room, unitId) {
    return (room.creeps || []).find(unit => unit.id === unitId) ||
      (room.objectives || []).find(unit => unit.id === unitId) ||
      room.playerData?.[unitId] ||
      null;
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
    const laneOffset = CREEP_LANE_OFFSETS[laneIndex % CREEP_LANE_OFFSETS.length] || 0;
    const h = isRanged ? 40 : 42;
    const formation = CREEP_FORMATION_X[role] || CREEP_FORMATION_X.melee;
    const staggerX = TEAM_DIR[teamId] * (formation[role === 'ranged' ? 0 : laneIndex] || 0);
    const y = clampCreepY(spawn.y + laneOffset, h);
    const attackSpeed = isRanged ? 0.68 : 1.08;
    const projectileSpeed = isRanged ? 13.5 : 0;
    const attackWindup = Math.round(CREEP_ATTACK_ANIMATION_MS * (isRanged ? CREEP_ATTACK_WINDUP_RATIO.ranged : CREEP_ATTACK_WINDUP_RATIO.melee));
    room.creeps.push({
      id: `cr_${teamId}_${Date.now()}_${room.creepSeq}`,
      type,
      role,
      teamId,
      x: spawn.x + staggerX,
      y,
      laneY: y,
      laneIndex,
      w: isRanged ? 40 : 42,
      h,
      hp: isRanged ? 95 : 135,
      maxHp: isRanged ? 95 : 135,
      damage: isRanged ? 14 : 17,
      speed: isRanged ? 1.95 : 2.2,
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

    const enemyHeroes = getLivingEnemyHeroes(room, creep, CREEP_HERO_AGGRO_RANGE);
    if (enemyHeroes.length) {
      const hero = enemyHeroes
        .map(unit => ({ unit, distance: distanceBetween(creep, unit) }))
        .sort((a, b) => a.distance - b.distance)[0]?.unit || null;
      if (hero) rememberCreepHeroAggro(room, creep.teamId, hero.id);
      return hero;
    }
    if (nearestCreep) return nearestCreep.unit;
    const enemyObjectives = getLivingObjectives(room).filter(obj => obj.teamId !== creep.teamId);
    return enemyObjectives
      .map(unit => ({ unit, distance: distanceBetween(creep, unit) }))
      .sort((a, b) => a.distance - b.distance)[0]?.unit || null;
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
      damageObjective(room, target, attack.damage);
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

  function damageObjective(room, objective, amount) {
    if (!objective || objective.hp <= 0) return;
    objective.hp = Math.max(0, objective.hp - amount);
    if (objective.type === 'ancient' && objective.hp <= 0 && !room.winner) {
      room.winner = objective.teamId === 'sun' ? 'moon' : 'sun';
    }
  }

  function damagePlayer(room, roomId, target, amount, attackerId = null, skillId = 'hit', hitDir = 1) {
    if (!room || !target || target.hp <= 0) return false;
    const damage = Math.max(1, Math.min(500, Number(amount) || 0));
    const attacker = attackerId ? room.playerData?.[attackerId] || getUnitById(room, attackerId) : null;
    target.hp = Math.max(0, target.hp - damage);
    target.recentAttackers = target.recentAttackers || {};
    if (attacker?.id && attacker.id !== target.id) {
      target.recentAttackers[attacker.id] = Date.now();
    }

    if (target.hp <= 0) {
      target.deaths = (target.deaths || 0) + 1;
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
          damageObjective(room, target, shot.damage);
        }
        return false;
      }
      if (shot.life <= 0) return false;
      shot.x += (dx / Math.max(1, dist)) * (shot.speed || 16);
      shot.y += (dy / Math.max(1, dist)) * (shot.speed || 16);
      return true;
    });
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
        const overlapX = 38 - Math.abs(dx);
        const overlapY = 32 - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;
        if (overlapY < overlapX || Math.abs(dy) > 4) {
          const push = (overlapY + 2) * 0.5;
          const dir = dy >= 0 ? 1 : -1;
          a.y = clampCreepY(a.y - dir * push, a.h);
          b.y = clampCreepY(b.y + dir * push, b.h);
        } else {
          const push = (overlapX + 1) * 0.5;
          const dir = dx >= 0 ? 1 : -1;
          a.x -= dir * push;
          b.x += dir * push;
        }
      }
    }
  }

  function getFriendlyCreepBlockers(room, creep) {
    return [
      ...(room.creeps || []).filter(unit => unit.hp > 0 && unit.id !== creep.id && unit.teamId === creep.teamId),
      ...Object.values(room.playerData || {}).filter(unit => unit.hp > 0 && unit.teamId === creep.teamId),
    ];
  }

  function isCreepMoveBlocked(room, creep, nextX, nextY) {
    const candidate = { ...creep, x: nextX, y: nextY };
    return getFriendlyCreepBlockers(room, creep).some(unit => {
      const cf = unitFoot(candidate);
      const uf = unitFoot(unit);
      const dx = Math.abs(cf.x - uf.x);
      const dy = Math.abs(cf.y - uf.y);
      return dx < (unitWidth(candidate) + unitWidth(unit)) * 0.42 &&
        dy < (unitHeight(candidate) + unitHeight(unit)) * 0.22;
    });
  }

  function moveCreepTowardLane(room, creep, dir) {
    const speed = creep.speed || 1.8;
    const desiredY = typeof creep.laneY === 'number' ? creep.laneY : creep.y;
    const laneStep = Math.sign(desiredY - creep.y) * Math.min(1.8, Math.abs(desiredY - creep.y));
    let nextX = creep.x + dir * speed;
    let nextY = clampCreepY(creep.y + laneStep, creep.h);
    if (!isCreepMoveBlocked(room, creep, nextX, nextY)) {
      creep.x = nextX;
      creep.y = nextY;
      return;
    }

    const avoidSign = (creep.laneIndex % 2 === 0 ? -1 : 1) || 1;
    for (const side of [avoidSign, -avoidSign]) {
      nextX = creep.x + dir * speed * 0.55;
      nextY = clampCreepY(creep.y + side * Math.max(2.2, speed * 1.4), creep.h);
      if (!isCreepMoveBlocked(room, creep, nextX, nextY)) {
        creep.x = nextX;
        creep.y = nextY;
        return;
      }
    }
    creep.state = 'idle';
  }

  function isChaseTarget(room, target) {
    return Boolean(target?.id?.startsWith?.('cr_') || room.playerData?.[target?.id]);
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
    const desiredTopY = clampCreepY(targetFoot.y - unitHeight(creep), unitHeight(creep));
    const depthDelta = desiredTopY - creep.y;
    const holdX = creep.role === 'ranged' ? Math.max(42, (creep.range || 210) * 0.58) : Math.max(10, (creep.range || 38) * 0.45);
    const stepX = Math.abs(dx) > holdX ? Math.sign(dx) * speed : 0;
    const stepY = Math.sign(depthDelta) * Math.min(Math.abs(depthDelta), Math.max(1.5, speed * 0.95));
    const candidates = [
      [creep.x + stepX, clampCreepY(creep.y + stepY, creep.h)],
      [creep.x, clampCreepY(creep.y + stepY, creep.h)],
      [creep.x + stepX, creep.y],
      [creep.x + (dir || TEAM_DIR[creep.teamId] || 1) * speed * 0.45, clampCreepY(creep.y + Math.sign(depthDelta || 1) * speed * 1.35, creep.h)],
      [creep.x + (dir || TEAM_DIR[creep.teamId] || 1) * speed * 0.45, clampCreepY(creep.y - Math.sign(depthDelta || 1) * speed * 1.35, creep.h)],
    ];

    for (const [nextX, nextY] of candidates) {
      if (nextX === creep.x && nextY === creep.y) continue;
      if (!isCreepMoveBlocked(room, creep, nextX, nextY)) {
        creep.x = nextX;
        creep.y = nextY;
        return;
      }
    }
    creep.state = 'idle';
  }

  function tickWorld(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return stopWorldLoop(roomId);
    const now = Date.now();

    if (!room.nextCreepWaveAt || now >= room.nextCreepWaveAt) {
      TEAM_IDS.forEach(teamId => {
        ['melee', 'melee', 'melee', 'ranged'].forEach((role, laneIndex) => spawnCreep(room, teamId, role, laneIndex));
      });
      room.nextCreepWaveAt = now + CREEP_WAVE_MS;
    }

    updateCreepAttacks(room, roomId, now);
    updateCreepProjectiles(room, roomId);

    (room.creeps || []).forEach(creep => {
      if (creep.hp <= 0) return;
      const target = findNearestEnemyUnit(room, creep);
      if (!target) return;
      const creepFoot = unitFoot(creep);
      const targetFoot = unitFoot(target);
      const targetDx = targetFoot.x - creepFoot.x;
      const dir = Math.abs(targetDx) > 6 ? Math.sign(targetDx) : creep.facing || TEAM_DIR[creep.teamId];
      creep.facing = dir;
      if (!isCreepTargetInRange(creep, target)) {
        creep.state = 'walk';
        moveCreepTowardTarget(room, creep, target, dir);
      } else if ((creep.attackAt || 0) <= now) {
        creep.state = 'attack';
        creep.attackAt = now + (creep.attackCooldown || 900);
        queueCreepAttack(room, creep, target, now);
      } else {
        creep.state = 'idle';
      }
    });

    getLivingObjectives(room).forEach(obj => {
      if (obj.type !== 'tower' || (obj.attackAt || 0) > now) return;
      const target = (room.creeps || [])
        .filter(creep => creep.hp > 0 && creep.teamId !== obj.teamId && distanceBetween(obj, creep) <= (obj.range || 170))
        .sort((a, b) => distanceBetween(obj, a) - distanceBetween(obj, b))[0];
      if (!target) return;
      obj.attackAt = now + 1100;
      damageCreep(room, target, obj.damage || 30, obj, null, roomId);
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
      creepProjectiles: room.creepProjectiles || [],
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

  function startRoomAfterAssetLoad(roomId) {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'loading') return;
    const elapsed = Date.now() - (room.assetLoadingStartedAt || 0);
    if (elapsed < 1400) {
      if (!room.assetStartScheduled) {
        room.assetStartScheduled = true;
        setTimeout(() => startRoomAfterAssetLoad(roomId), 1400 - elapsed);
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
        Object.assign(player, { x, y, vx, vy, onGround, facing, state: pstate });
        if (hp !== undefined) player.hp = hp;
        if (player.hp <= 0 && player.teamId && room.creepAggro?.[player.teamId]?.targetId === player.id) {
          delete room.creepAggro[player.teamId];
        }

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
        if (attacker?.teamId && target.teamId && attacker.teamId !== target.teamId) {
          rememberCreepHeroAggro(room, target.teamId, attacker.id);
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
          damageCreep(room, creep, damage, attacker, msg.hitDir || null, roomId);
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
