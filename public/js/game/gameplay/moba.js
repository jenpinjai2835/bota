// Lane depth, creeps, towers, and ancient objectives
const MONSTER_TYPES = ['monster_6', 'monster_7', 'monster_8', 'monster_9', 'monster_10'];
const MONSTER_ACTIONS = {
  walk: { folder: 'walking', file: 'Walking', frames: 18, fps: 14 },
  run: { folder: 'walking', file: 'Walking', frames: 18, fps: 18 },
  idle: { folder: 'idle', file: 'Idle', frames: 18, fps: 7 },
  attack: { folder: 'attack', file: 'Attack', frames: 18, fps: 16 },
  dead: { folder: 'dying', file: 'Dying', frames: 18, fps: 12 },
};

function preloadMonsterAssets() {
  if (typeof Image === 'undefined') return;
  MONSTER_TYPES.forEach(type => {
    monsterImages[type] = monsterImages[type] || {};
    Object.entries(MONSTER_ACTIONS).forEach(([action, meta]) => {
      monsterImages[type][action] = monsterImages[type][action] || [];
      for (let i = 0; i < meta.frames; i++) {
        if (monsterImages[type][action][i]) continue;
        const img = new Image();
        img.src = `/assets/monsters/${type}/${meta.folder}/0_Monster_${meta.file}_${String(i).padStart(3, '0')}.png`;
        monsterImages[type][action][i] = img;
      }
    });
  });
}

function syncWorldState(msg) {
  const incoming = msg.creeps || [];
  const incomingIds = new Set(incoming.map(creep => creep.id));
  creeps
    .filter(creep => creep.hp > 0 && !incomingIds.has(creep.id) && !hasRecentCreepDeathBurst(creep.id))
    .forEach(creep => spawnCreepDeathBurst(creep, creep.lastHitDir || creep.facing || (creep.teamId === 'sun' ? 1 : -1), creep.lastDamage || 34));
  creeps = incoming.map(creep => {
    const existing = creeps.find(entry => entry.id === creep.id);
    return {
      ...existing,
      ...creep,
      renderX: existing?.renderX ?? creep.x,
      renderY: existing?.renderY ?? creep.y,
      targetX: creep.x,
      targetY: creep.y,
    };
  });
  objectives = (msg.objectives || []).map(obj => ({ ...objectives.find(entry => entry.id === obj.id), ...obj }));
  creepProjectiles = msg.creepProjectiles || [];
  gameWinner = msg.winner || gameWinner;
}

function rememberCreepDeathBurst(creepId) {
  if (!creepId) return;
  const now = Date.now();
  recentCreepDeathBursts.set(creepId, now);
  recentCreepDeathBursts.forEach((at, id) => {
    if (now - at > 3500) recentCreepDeathBursts.delete(id);
  });
}

function hasRecentCreepDeathBurst(creepId) {
  if (!creepId) return false;
  const at = recentCreepDeathBursts.get(creepId);
  if (!at) return false;
  if (Date.now() - at > 3500) {
    recentCreepDeathBursts.delete(creepId);
    return false;
  }
  return true;
}

function handleWorldUnitDeath(msg) {
  if (!msg?.unit || msg.unit.type === 'ancient' || msg.unit.type === 'tower') return;
  const existing = creeps.find(creep => creep.id === msg.unit.id);
  const creep = {
    ...existing,
    ...msg.unit,
    renderX: existing?.renderX ?? msg.unit.x,
    renderY: existing?.renderY ?? msg.unit.y,
  };
  if (hasRecentCreepDeathBurst(creep.id)) return;
  const hitDir = msg.hitDir || creep.lastHitDir || creep.facing || (creep.teamId === 'sun' ? 1 : -1);
  rememberCreepDeathBurst(creep.id);
  spawnCreepDeathBurst(creep, hitDir, msg.damage || creep.lastDamage || 34);
}

function getUnitCenter(unit) {
  return {
    x: unit.x + (unit.w || unit.width || 0) / 2,
    y: unit.y + (unit.h || unit.height || 0) / 2,
  };
}

function isHostileUnit(unit, player = myPlayer) {
  return unit && player && unit.teamId && player.teamId && unit.teamId !== player.teamId && unit.hp > 0;
}

function drawUnitFootprint(ctx, unit, sx, sy, options = {}) {
  if (!unit || unit.hp <= 0) return;
  const foot = getUnitFoot({
    ...unit,
    x: unit.renderX ?? unit.x,
    y: unit.renderY ?? unit.y,
  });
  const scale = Math.min(sx, sy);
  const rx = getUnitFootRadiusX(unit) * sx;
  const ry = getUnitFootRadiusY(unit) * sy;
  ctx.save();
  ctx.fillStyle = options.fillStyle || 'rgba(180,180,180,0.012)';
  ctx.strokeStyle = options.strokeStyle || 'rgba(190,190,190,0.16)';
  ctx.lineWidth = Math.max(1, 0.85 * scale);
  ctx.setLineDash([Math.max(3, 4 * scale), Math.max(2, 3 * scale)]);
  ctx.beginPath();
  ctx.ellipse(foot.x * sx, foot.y * sy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function getAttackableUnits(player = myPlayer) {
  return [
    ...creeps.filter(unit => isHostileUnit(unit, player)),
    ...objectives.filter(unit => isHostileUnit(unit, player)),
  ];
}

function damageWorldUnit(unit, damage, skillId, hitDir = 1) {
  if (!unit || !myRoomId || unit.hp <= 0) return;
  unit.hp = Math.max(0, unit.hp - damage);
  send({ type: 'unit_hit', unitId: unit.id, damage, skillId, hitDir });
  const center = getUnitCenter(unit);
  spawnDamageNumber(center.x, unit.y, damage, '#FFE082');
  spawnEffect(center.x, center.y, skillId, '#FFD166', unit.type === 'ancient' ? 48 : 28);
}

function updateTowerShots() {
  const step = 0.38;
  creeps.forEach(creep => {
    creep.renderX = (creep.renderX ?? creep.x) + ((creep.targetX ?? creep.x) - (creep.renderX ?? creep.x)) * step;
    creep.renderY = (creep.renderY ?? creep.y) + ((creep.targetY ?? creep.y) - (creep.renderY ?? creep.y)) * step;
  });
  towerShots = towerShots.filter(shot => {
    shot.life--;
    return shot.life > 0;
  });
}

function spawnCreepDeathBurst(creep, dir = 1, damage = 0) {
  const frames = monsterImages[creep.type]?.idle || monsterImages[creep.type]?.walk || [];
  const img = frames.find(frame => frame?.complete && frame.naturalWidth);
  if (!img) return;
  const cx = (creep.renderX ?? creep.x) + (creep.w || 42) / 2;
  const cy = (creep.renderY ?? creep.y) + (creep.h || 42) * 0.52;
  const force = 2.1 + Math.min(5, Math.max(0, damage) * 0.035);
  for (let i = 0; i < 8; i++) {
    const spread = (i / 7 - 0.5) * 2;
    const size = 14 + (i % 3) * 5;
    deathParts.push({
      img,
      x: cx + spread * 5,
      y: cy + (Math.random() - 0.5) * 14,
      vx: dir * (force + Math.random() * 3.2) + spread * 2.2,
      vy: -3.4 - Math.random() * 4.4,
      w: size,
      h: size,
      angle: (Math.random() - 0.5) * 1.6,
      spin: (Math.random() - 0.5 + dir * 0.3) * 0.18,
      life: Math.round(DEATH_PART_LIFE * 0.72),
      maxLife: Math.round(DEATH_PART_LIFE * 0.72),
    });
  }
  spawnBloodBurst(cx, cy, dir, 16);
}

function drawObjective(ctx, obj, sx, sy) {
  if (!obj || obj.hp <= 0) return;
  const x = obj.x * sx;
  const y = obj.y * sy;
  const w = obj.w * sx;
  const h = obj.h * sy;
  const teamColor = obj.teamId === 'sun' ? '#E44747' : '#3D8BFF';
  ctx.save();
  ctx.shadowColor = teamColor;
  ctx.shadowBlur = obj.type === 'ancient' ? 24 : 14;
  const body = ctx.createLinearGradient(x, y, x, y + h);
  body.addColorStop(0, obj.type === 'ancient' ? '#F5E182' : '#B78D3A');
  body.addColorStop(0.45, teamColor);
  body.addColorStop(1, '#251015');
  ctx.fillStyle = body;
  drawRoundRect(ctx, x, y, w, h, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = Math.max(1.3, 1.6 * Math.min(sx, sy));
  ctx.stroke();
  if (obj.type === 'ancient') {
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.28, Math.max(8, w * 0.22), 0, Math.PI * 2);
    ctx.fill();
  }
  drawUnitHealthBar(ctx, obj, x + w / 2, y - 8 * sy, Math.max(46, w * 1.1), sx, sy);
  ctx.restore();
}

function drawCreep(ctx, creep, sx, sy) {
  if (!creep || creep.hp <= 0) return;
  const action = creep.state === 'attack' ? 'attack' : 'walk';
  const frames = monsterImages[creep.type]?.[action] || [];
  const meta = MONSTER_ACTIONS[action] || MONSTER_ACTIONS.walk;
  const frame = Math.floor(Date.now() / (1000 / meta.fps)) % Math.max(1, frames.length);
  const img = getRenderableMonsterFrame(creep.type, action, frame);
  const drawX = creep.renderX ?? creep.x;
  const drawY = creep.renderY ?? creep.y;
  const x = (drawX + (creep.w || 42) / 2) * sx;
  const y = (drawY + (creep.h || 42)) * sy;
  const scale = Math.min(sx, sy);
  const w = 58 * scale;
  const h = 58 * scale;
  const facing = creep.facing || (creep.teamId === 'sun' ? 1 : -1);
  const hostile = myPlayer && creep.teamId !== myPlayer.teamId;
  ctx.save();
  if (hostile) {
    ctx.shadowColor = 'rgba(255,58,68,0.85)';
    ctx.shadowBlur = 12;
  }
  ctx.translate(x, y);
  ctx.scale(facing > 0 ? 1 : -1, 1);
  if (img?.complete && img.naturalWidth) {
    ctx.drawImage(img, -w / 2, -h, w, h);
  }
  ctx.restore();
  drawUnitHealthBar(ctx, creep, x, y - h - 3 * sy, Math.max(32, 38 * scale), sx, sy);
}

function getRenderableMonsterFrame(type, action, frameIndex = 0) {
  const pools = [
    monsterImages[type]?.[action],
    monsterImages[type]?.walk,
    monsterImages[type]?.idle,
  ].filter(Boolean);
  for (const frames of pools) {
    const preferred = frames[frameIndex % Math.max(1, frames.length)];
    if (preferred?.complete && preferred.naturalWidth) return preferred;
    const loaded = frames.find(frame => frame?.complete && frame.naturalWidth);
    if (loaded) return loaded;
  }
  return null;
}

function drawUnitHealthBar(ctx, unit, centerX, topY, width, sx, sy) {
  const hpPct = Math.max(0, Math.min(1, (unit.hp || 0) / Math.max(1, unit.maxHp || 1)));
  const h = Math.max(3, 4 * Math.min(sx, sy));
  const hostile = myPlayer && unit.teamId && unit.teamId !== myPlayer.teamId;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.68)';
  drawRoundRect(ctx, centerX - width / 2, topY, width, h, 2);
  ctx.fill();
  ctx.strokeStyle = hostile ? 'rgba(255,58,68,0.98)' : 'rgba(76,232,128,0.78)';
  ctx.lineWidth = Math.max(1, 1.2 * Math.min(sx, sy));
  ctx.stroke();
  ctx.fillStyle = hpPct > 0.5 ? '#44D66E' : hpPct > 0.25 ? '#FFB02E' : '#FF3D46';
  drawRoundRect(ctx, centerX - width / 2, topY, width * hpPct, h, 2);
  ctx.fill();
  ctx.restore();
}

function drawTowerShot(ctx, shot, sx, sy) {
  const alpha = Math.max(0, shot.life / shot.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = shot.teamId === 'sun' ? '#FF8A70' : '#79AEFF';
  ctx.lineWidth = Math.max(2, 3 * Math.min(sx, sy));
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(shot.from.x * sx, shot.from.y * sy);
  ctx.lineTo(shot.to.x * sx, shot.to.y * sy);
  ctx.stroke();
  ctx.restore();
}

function drawCreepProjectile(ctx, shot, sx, sy) {
  if (!shot) return;
  const scale = Math.min(sx, sy);
  const x = shot.x * sx;
  const y = shot.y * sy;
  const color = shot.teamId === 'sun' ? '#FF9A3D' : '#69A8FF';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const trail = ctx.createLinearGradient((shot.prevX ?? shot.x) * sx, (shot.prevY ?? shot.y) * sy, x, y);
  trail.addColorStop(0, 'rgba(255,255,255,0)');
  trail.addColorStop(1, withAlpha(color, 0.78));
  ctx.strokeStyle = trail;
  ctx.lineWidth = Math.max(3, 4 * scale);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo((shot.prevX ?? shot.x) * sx, (shot.prevY ?? shot.y) * sy);
  ctx.lineTo(x, y);
  ctx.stroke();

  const radius = Math.max(5, 7 * scale);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.8);
  glow.addColorStop(0, 'rgba(255,255,220,0.95)');
  glow.addColorStop(0.28, withAlpha(color, 0.82));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius * 3.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF5BD';
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

preloadMonsterAssets();
