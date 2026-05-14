// Lane depth, creeps, towers, and ancient objectives
const MONSTER_TYPES = ['monster_1', 'monster_3', 'monster_6'];
const MONSTER_ACTIONS = {
  walk: { folder: 'idle', file: 'Idle', frames: 18, fps: 10 },
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
  creeps = (msg.creeps || []).map(creep => ({ ...creeps.find(entry => entry.id === creep.id), ...creep }));
  objectives = (msg.objectives || []).map(obj => ({ ...objectives.find(entry => entry.id === obj.id), ...obj }));
  gameWinner = msg.winner || gameWinner;
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
  towerShots = towerShots.filter(shot => {
    shot.life--;
    return shot.life > 0;
  });
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
  const img = frames[frame];
  const x = (creep.x + (creep.w || 42) / 2) * sx;
  const y = (creep.y + (creep.h || 42)) * sy;
  const scale = Math.min(sx, sy);
  const w = 58 * scale;
  const h = 58 * scale;
  const facing = creep.facing || (creep.teamId === 'sun' ? 1 : -1);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing > 0 ? 1 : -1, 1);
  if (img?.complete && img.naturalWidth) {
    ctx.drawImage(img, -w / 2, -h, w, h);
  } else {
    ctx.fillStyle = creep.teamId === 'sun' ? '#E44747' : '#3D8BFF';
    ctx.beginPath();
    ctx.arc(0, -h * 0.45, w * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  drawUnitHealthBar(ctx, creep, x, y - h - 3 * sy, Math.max(32, 38 * scale), sx, sy);
}

function drawUnitHealthBar(ctx, unit, centerX, topY, width, sx, sy) {
  const hpPct = Math.max(0, Math.min(1, (unit.hp || 0) / Math.max(1, unit.maxHp || 1)));
  const h = Math.max(3, 4 * Math.min(sx, sy));
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.68)';
  drawRoundRect(ctx, centerX - width / 2, topY, width, h, 2);
  ctx.fill();
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

preloadMonsterAssets();
