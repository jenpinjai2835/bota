// Lane depth, creeps, towers, and ancient objectives
const MONSTER_TYPES = ['monster_6', 'monster_7', 'monster_8', 'monster_9', 'monster_10'];
const MONSTER_VECTOR_PARTS = {
  monster_6: ['Head.png', 'Left Leg.png', 'Right Leg.png'],
  monster_7: ['Head.png', 'Left Arm.png', 'Left Hand.png', 'Left Leg.png', 'Right Arm.png', 'Right Hand.png', 'Right Leg.png'],
  monster_8: ['Body.png', 'Head.png', 'Left Arm.png', 'Left Leg.png', 'Right Arm.png', 'Right Leg.png', 'Tail.png'],
  monster_9: ['Body.png', 'Head.png', 'Leg1.png', 'Leg2.png', 'Leg3.png', 'Leg4.png', 'Leg5.png'],
  monster_10: ['Body.png', 'Head.png', 'Left Arm.png', 'Left Leg.png', 'Right Arm.png', 'Right Leg.png'],
};
const MONSTER_ACTIONS = {
  walk: { folder: 'walking', file: 'Walking', frames: 18, fps: 14 },
  run: { folder: 'walking', file: 'Walking', frames: 18, fps: 18 },
  idle: { folder: 'idle', file: 'Idle', frames: 18, fps: 7 },
  attack: { folder: 'attack', file: 'Attack', frames: 18, fps: 16 },
  dead: { folder: 'dying', file: 'Dying', frames: 18, fps: 12 },
};
const monsterFrameFallbackCache = {};
const monsterVectorImages = {};
const monsterVectorData = {};
const monsterVectorLoadStarted = {};
const monsterVectorBoundsCache = {};
const MONSTER_ATTACK_STABLE_PARTS = {
  monster_8: /.*/i,
  monster_10: /arm|leg/i,
};
const MONSTER_ATTACK_DRAW_MS = 620;

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
  preloadMonsterVectorAssets();
}

function preloadMonsterVectorAssets() {
  MONSTER_TYPES.forEach(type => {
    monsterVectorImages[type] = monsterVectorImages[type] || {};
    (MONSTER_VECTOR_PARTS[type] || []).forEach(file => {
      if (monsterVectorImages[type][file]) return;
      const img = new Image();
      img.src = `/assets/monsters/${type}/vector/${encodeURIComponent(file)}`;
      monsterVectorImages[type][file] = img;
    });
    if (monsterVectorLoadStarted[type] || typeof fetch !== 'function') return;
    monsterVectorLoadStarted[type] = true;
    fetch(`/assets/monsters/${type}/vector/Animations.scml`)
      .then(response => response.ok ? response.text() : null)
      .then(text => {
        if (text) monsterVectorData[type] = parseMonsterVectorScml(text);
      })
      .catch(() => {
        monsterVectorData[type] = null;
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
    const attackVisualStartedAt = creep.state === 'attack' && creep.attackAt !== existing?.attackAt
      ? Date.now()
      : existing?.attackVisualStartedAt;
    return {
      ...existing,
      ...creep,
      attackVisualStartedAt,
      renderX: existing?.renderX ?? creep.x,
      renderY: existing?.renderY ?? creep.y,
      targetX: creep.x,
      targetY: creep.y,
    };
  });
  objectives = (msg.objectives || []).map(obj => ({ ...objectives.find(entry => entry.id === obj.id), ...obj }));
  creepProjectiles = (msg.creepProjectiles || []).map(shot => {
    const existing = creepProjectiles.find(entry => entry.id === shot.id);
    return {
      ...existing,
      ...shot,
      renderX: existing?.renderX ?? shot.prevX ?? shot.x,
      renderY: existing?.renderY ?? shot.prevY ?? shot.y,
      targetX: shot.x,
      targetY: shot.y,
    };
  });
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
  const isObjective = unit.type === 'tower' || unit.type === 'ancient';
  ctx.save();
  if (!isObjective) {
    ctx.fillStyle = options.shadowFillStyle || 'rgba(0,0,0,0.075)';
    ctx.beginPath();
    ctx.ellipse(foot.x * sx, foot.y * sy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = options.fillStyle || 'rgba(180,180,180,0.006)';
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
  creepProjectiles.forEach(shot => {
    shot.renderX = (shot.renderX ?? shot.x) + ((shot.targetX ?? shot.x) - (shot.renderX ?? shot.x)) * 0.62;
    shot.renderY = (shot.renderY ?? shot.y) + ((shot.targetY ?? shot.y) - (shot.renderY ?? shot.y)) * 0.62;
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
  const renderCreep = {
    ...creep,
    x: creep.renderX ?? creep.x,
    y: creep.renderY ?? creep.y,
  };
  const foot = getUnitFoot(renderCreep);
  const groundY = foot.y;
  const cx = foot.x;
  const cy = groundY - (creep.h || 42) * 0.48;
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
      groundY,
      angle: (Math.random() - 0.5) * 1.6,
      spin: (Math.random() - 0.5 + dir * 0.3) * 0.18,
      life: Math.round(DEATH_PART_LIFE * 0.72),
      maxLife: Math.round(DEATH_PART_LIFE * 0.72),
    });
  }
  spawnBloodBurst(cx, cy, dir, 16, groundY);
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
  const action = getCreepVisualAction(creep);
  const frames = monsterImages[creep.type]?.[action] || [];
  const meta = MONSTER_ACTIONS[action] || MONSTER_ACTIONS.walk;
  const frame = getMonsterFrameIndex(creep, action, Math.max(1, frames.length), meta);
  const img = getRenderableMonsterFrame(creep.type, action, frame) || creep.lastRenderableMonsterFrame || null;
  if (img?.complete && img.naturalWidth) creep.lastRenderableMonsterFrame = img;
  const drawX = creep.renderX ?? creep.x;
  const drawY = creep.renderY ?? creep.y;
  const x = (drawX + (creep.w || 42) / 2) * sx;
  const y = (drawY + (creep.h || 42)) * sy;
  const scale = Math.min(sx, sy);
  const w = 58 * scale;
  const h = 58 * scale;
  const groundOffset = getCreepGroundOffset(creep, scale);
  const facing = creep.facing || (creep.teamId === 'sun' ? 1 : -1);
  const hostile = myPlayer && creep.teamId !== myPlayer.teamId;
  ctx.save();
  if (hostile) {
    ctx.shadowColor = 'rgba(255,58,68,0.85)';
    ctx.shadowBlur = 12;
  }
  ctx.translate(x, y);
  ctx.scale(facing > 0 ? 1 : -1, 1);
  if (drawMonsterVectorCreep(ctx, creep, w, h, action, groundOffset)) {
    // Vector parts are the primary creep renderer. PNG frames remain as fallback.
  } else if (img?.complete && img.naturalWidth) {
    ctx.drawImage(img, -w / 2, -h + groundOffset, w, h);
  } else {
    drawCreepSilhouette(ctx, creep, w, h, scale, groundOffset);
  }
  ctx.restore();
  drawUnitHealthBar(ctx, creep, x, y - h + groundOffset - 3 * sy, Math.max(32, 38 * scale), sx, sy);
}

function getCreepVisualAction(creep) {
  const attackDuration = getCreepAttackVisualDuration(creep);
  const attackStartedAt = creep.attackVisualStartedAt || 0;
  if (attackStartedAt && Date.now() - attackStartedAt < attackDuration) return 'attack';
  if (creep.state === 'idle') return 'idle';
  return creep.state === 'attack' ? 'attack' : 'walk';
}

function getCreepAttackVisualDuration(creep) {
  const windup = Math.max(80, creep.attackWindup || 240);
  const cooldown = Math.max(180, creep.attackCooldown || 900);
  return Math.min(cooldown, Math.max(MONSTER_ATTACK_DRAW_MS, windup + 170));
}

function getCreepAttackVisualProgress(creep) {
  const attackDuration = getCreepAttackVisualDuration(creep);
  const startedAt = creep.attackVisualStartedAt || Math.max(0, (creep.attackAt || 0) - attackDuration);
  return Math.min(0.999, Math.max(0, Date.now() - startedAt) / attackDuration);
}

function getMonsterFrameIndex(creep, action, frameCount, meta) {
  if (action === 'attack') {
    const attackDuration = getCreepAttackVisualDuration(creep);
    const startedAt = creep.attackVisualStartedAt || Math.max(0, (creep.attackAt || 0) - attackDuration);
    const elapsed = Math.max(0, Date.now() - startedAt);
    const progress = Math.min(0.999, elapsed / attackDuration);
    return Math.floor(progress * frameCount) % frameCount;
  }
  return Math.floor(Date.now() / (1000 / (meta?.fps || 12))) % frameCount;
}

function getCreepGroundOffset(creep, scale) {
  return (creep.role === 'ranged' ? 6 : 8) * scale;
}

function getCreepAnimationPhase(creep) {
  const id = String(creep.id || creep.type || '');
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const speed = Math.max(0.75, creep.speed || 1.8);
  return Date.now() * 0.012 * speed + (hash % 628) / 100;
}

function parseMonsterVectorScml(text) {
  if (typeof DOMParser === 'undefined') return null;
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const files = {};
  Array.from(doc.getElementsByTagName('folder')).forEach(folder => {
    const folderId = String(folder.getAttribute('id') || '0');
    files[folderId] = files[folderId] || {};
    childrenByTag(folder, 'file').forEach(file => {
      const id = String(file.getAttribute('id') || '0');
      files[folderId][id] = {
        name: file.getAttribute('name') || '',
        width: Number(file.getAttribute('width')) || 0,
        height: Number(file.getAttribute('height')) || 0,
        pivotX: Number(file.getAttribute('pivot_x') ?? 0),
        pivotY: Number(file.getAttribute('pivot_y') ?? 1),
      };
    });
  });

  const animations = {};
  Array.from(doc.getElementsByTagName('animation')).forEach(animationEl => {
    const name = animationEl.getAttribute('name') || 'Idle';
    const length = Number(animationEl.getAttribute('length')) || 600;
    const mainlineEl = childrenByTag(animationEl, 'mainline')[0];
    const mainline = mainlineEl ? childrenByTag(mainlineEl, 'key').map(keyEl => ({
      id: keyEl.getAttribute('id'),
      time: Number(keyEl.getAttribute('time')) || 0,
      boneRefs: childrenByTag(keyEl, 'bone_ref').map(readMonsterVectorRef),
      objectRefs: childrenByTag(keyEl, 'object_ref').map(readMonsterVectorRef),
    })) : [];
    const timelines = {};
    childrenByTag(animationEl, 'timeline').forEach(timelineEl => {
      const id = String(timelineEl.getAttribute('id') || '0');
      const objectType = timelineEl.getAttribute('object_type') || 'sprite';
      timelines[id] = {
        id,
        name: timelineEl.getAttribute('name') || '',
        objectType,
        keys: childrenByTag(timelineEl, 'key').map(keyEl => {
          const node = childrenByTag(keyEl, objectType === 'bone' ? 'bone' : 'object')[0];
          return readMonsterVectorKey(keyEl, node, objectType);
        }).filter(Boolean),
      };
    });
    animations[name] = { name, length, mainline, timelines };
  });
  return { files, animations };
}

function childrenByTag(el, tagName) {
  return Array.from(el?.children || []).filter(child => child.tagName === tagName);
}

function readMonsterVectorRef(refEl) {
  return {
    id: String(refEl.getAttribute('id') || '0'),
    parent: refEl.hasAttribute('parent') ? String(refEl.getAttribute('parent')) : null,
    timeline: String(refEl.getAttribute('timeline') || '0'),
    key: String(refEl.getAttribute('key') || '0'),
    zIndex: Number(refEl.getAttribute('z_index')) || 0,
  };
}

function readMonsterVectorKey(keyEl, node, objectType) {
  if (!node) return null;
  return {
    time: Number(keyEl.getAttribute('time')) || 0,
    spin: keyEl.hasAttribute('spin') ? Number(keyEl.getAttribute('spin')) : 1,
    type: objectType,
    folder: node.getAttribute('folder') || '0',
    file: node.getAttribute('file') || '0',
    x: Number(node.getAttribute('x')) || 0,
    y: Number(node.getAttribute('y')) || 0,
    angle: Number(node.getAttribute('angle')) || 0,
    scaleX: Number(node.getAttribute('scale_x') ?? 1),
    scaleY: Number(node.getAttribute('scale_y') ?? 1),
  };
}

function getMonsterVectorAnimationName(creep, action) {
  if (creep.hp <= 0) return 'Dying';
  if (action === 'attack') return 'Attack';
  if (creep.state === 'walk' || creep.state === 'run') return 'Walking';
  return 'Idle';
}

function getMonsterVectorAnimationTime(animation, creep, action) {
  if (!animation?.length) return 0;
  if (action === 'attack') {
    const attackDuration = getCreepAttackVisualDuration(creep);
    const startedAt = creep.attackVisualStartedAt || Math.max(0, (creep.attackAt || 0) - attackDuration);
    const elapsed = Math.max(0, Date.now() - startedAt);
    const progress = Math.min(0.999, elapsed / attackDuration);
    return progress * animation.length;
  }
  if (action === 'walk') {
    return (getCreepAnimationPhase(creep) * 95) % animation.length;
  }
  return Date.now() % animation.length;
}

function getMonsterVectorMainlineKey(animation, time) {
  let selected = animation?.mainline?.[0] || null;
  (animation?.mainline || []).forEach(key => {
    if ((key.time || 0) <= time) selected = key;
  });
  return selected;
}

function getMonsterVectorTimelineKey(timeline, time, length) {
  const keys = timeline?.keys || [];
  if (!keys.length) return null;
  if (keys.length === 1) return keys[0];
  let current = keys[0];
  let next = keys[1];
  for (let i = 0; i < keys.length; i++) {
    const candidate = keys[i];
    const candidateNext = keys[(i + 1) % keys.length];
    const nextTime = candidateNext.time <= candidate.time ? candidateNext.time + length : candidateNext.time;
    if (time >= candidate.time && time < nextTime) {
      current = candidate;
      next = candidateNext;
      break;
    }
  }
  const span = (next.time <= current.time ? next.time + length : next.time) - current.time;
  const localTime = time < current.time ? time + length : time;
  const t = span > 0 ? Math.max(0, Math.min(1, (localTime - current.time) / span)) : 0;
  const spin = current.spin ?? 1;
  let angleDelta = (next.angle || 0) - (current.angle || 0);
  if (spin === 0) angleDelta = 0;
  else if (spin > 0 && angleDelta < 0) angleDelta += 360;
  else if (spin < 0 && angleDelta > 0) angleDelta -= 360;
  return {
    ...current,
    x: current.x + ((next.x || 0) - (current.x || 0)) * t,
    y: current.y + ((next.y || 0) - (current.y || 0)) * t,
    angle: (current.angle || 0) + angleDelta * t,
    scaleX: (current.scaleX ?? 1) + ((next.scaleX ?? 1) - (current.scaleX ?? 1)) * t,
    scaleY: (current.scaleY ?? 1) + ((next.scaleY ?? 1) - (current.scaleY ?? 1)) * t,
  };
}

function composeMonsterVectorTransform(parent, local) {
  const rad = (parent.angle || 0) * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const x = (local.x || 0) * (parent.scaleX ?? 1);
  const y = (local.y || 0) * (parent.scaleY ?? 1);
  return {
    x: (parent.x || 0) + x * cos - y * sin,
    y: (parent.y || 0) + x * sin + y * cos,
    angle: (parent.angle || 0) + (local.angle || 0),
    scaleX: (parent.scaleX ?? 1) * (local.scaleX ?? 1),
    scaleY: (parent.scaleY ?? 1) * (local.scaleY ?? 1),
  };
}

function getMonsterVectorImageInfo(type, data, folder, file) {
  const fileInfo = data?.files?.[String(folder)]?.[String(file)];
  if (!fileInfo?.name) return null;
  const img = monsterVectorImages[type]?.[fileInfo.name];
  if (!img?.complete || !img.naturalWidth) return null;
  return { img, fileInfo };
}

function getMonsterVectorObjects(type, animation, time) {
  const data = monsterVectorData[type];
  const mainline = getMonsterVectorMainlineKey(animation, time);
  if (!data?.files || !mainline) return [];
  const identity = { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 };
  const boneTransforms = {};
  (mainline.boneRefs || []).forEach(ref => {
    const timeline = animation.timelines?.[String(ref.timeline)];
    const local = getMonsterVectorTimelineKey(timeline, time, animation.length);
    if (!local) return;
    const parent = ref.parent !== null && ref.parent !== undefined ? boneTransforms[String(ref.parent)] || identity : identity;
    boneTransforms[String(ref.id)] = composeMonsterVectorTransform(parent, local);
  });
  return (mainline.objectRefs || [])
    .map(ref => {
      const timeline = animation.timelines?.[String(ref.timeline)];
      const local = getMonsterVectorTimelineKey(timeline, time, animation.length);
      if (!local) return null;
      const imageInfo = getMonsterVectorImageInfo(type, data, local.folder, local.file);
      if (!imageInfo) return null;
      const parent = ref.parent !== null && ref.parent !== undefined ? boneTransforms[String(ref.parent)] || identity : identity;
      return { ...imageInfo, timelineName: timeline?.name || '', transform: composeMonsterVectorTransform(parent, local), zIndex: ref.zIndex || 0 };
    })
    .filter(Boolean)
    .sort((a, b) => a.zIndex - b.zIndex);
}

function getMonsterVectorObjectCorners(item) {
  const { img, fileInfo, transform } = item;
  const pivotX = fileInfo.pivotX ?? 0;
  const pivotY = fileInfo.pivotY ?? 1;
  const points = [
    [-pivotX * img.naturalWidth, -(1 - pivotY) * img.naturalHeight],
    [(1 - pivotX) * img.naturalWidth, -(1 - pivotY) * img.naturalHeight],
    [(1 - pivotX) * img.naturalWidth, pivotY * img.naturalHeight],
    [-pivotX * img.naturalWidth, pivotY * img.naturalHeight],
  ];
  const rad = -(transform.angle || 0) * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return points.map(([x, y]) => {
    const sx = x * (transform.scaleX ?? 1);
    const sy = y * (transform.scaleY ?? 1);
    return {
      x: transform.x + sx * cos - sy * sin,
      y: -transform.y + sx * sin + sy * cos,
    };
  });
}

function getMonsterVectorObjectsBounds(objects) {
  const bounds = objects.reduce((acc, item) => {
    getMonsterVectorObjectCorners(item).forEach(point => {
      acc.minX = Math.min(acc.minX, point.x);
      acc.minY = Math.min(acc.minY, point.y);
      acc.maxX = Math.max(acc.maxX, point.x);
      acc.maxY = Math.max(acc.maxY, point.y);
    });
    return acc;
  }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) return null;
  return { ...bounds, width, height };
}

function getMonsterVectorReferenceBounds(type) {
  if (monsterVectorBoundsCache[type]) return monsterVectorBoundsCache[type];
  const data = monsterVectorData[type];
  const animation = data?.animations?.Idle || Object.values(data?.animations || {})[0];
  if (!animation) return null;
  const objects = getMonsterVectorObjects(type, animation, 0);
  monsterVectorBoundsCache[type] = getMonsterVectorObjectsBounds(objects);
  return monsterVectorBoundsCache[type];
}

function drawMonsterVectorObject(ctx, item) {
  const { img, fileInfo, transform } = item;
  ctx.save();
  ctx.translate(transform.x, -transform.y);
  ctx.rotate(-(transform.angle || 0) * Math.PI / 180);
  ctx.scale(transform.scaleX ?? 1, transform.scaleY ?? 1);
  ctx.drawImage(
    img,
    -(fileInfo.pivotX ?? 0) * img.naturalWidth,
    -(1 - (fileInfo.pivotY ?? 1)) * img.naturalHeight
  );
  ctx.restore();
}

function stabilizeMonsterAttackObjects(type, objects) {
  const data = monsterVectorData[type];
  const idle = data?.animations?.Idle;
  if (!idle) return objects;
  const stablePattern = MONSTER_ATTACK_STABLE_PARTS[type] || /leg/i;
  const stableObjects = getMonsterVectorObjects(type, idle, 0);
  const stableByPart = new Map(stableObjects.map(item => [item.fileInfo.name, item]));
  return objects.map(item => {
    const partName = `${item.timelineName} ${item.fileInfo.name}`;
    if (!stablePattern.test(partName)) return item;
    const stable = stableByPart.get(item.fileInfo.name);
    return stable ? { ...item, transform: stable.transform } : item;
  });
}

function drawMonsterVectorCreep(ctx, creep, drawW, drawH, action, groundOffset = 0) {
  const type = creep.type;
  const data = monsterVectorData[type];
  if (!data?.animations) return false;
  const animationName = getMonsterVectorAnimationName(creep, action);
  const animation = data.animations[animationName] || data.animations.Walking || data.animations.Idle;
  if (!animation) return false;
  const time = getMonsterVectorAnimationTime(animation, creep, action);
  let objects = getMonsterVectorObjects(type, animation, time);
  if (action === 'attack') objects = stabilizeMonsterAttackObjects(type, objects);
  if (!objects.length) return false;
  const bounds = getMonsterVectorObjectsBounds(objects);
  const referenceBounds = getMonsterVectorReferenceBounds(type) || bounds;
  if (!bounds || !referenceBounds) return false;
  const scale = Math.min(drawW / referenceBounds.width, drawH / referenceBounds.height) * 0.98;
  const offsetX = -((bounds.minX + bounds.maxX) * 0.5 * scale);
  const offsetY = -bounds.maxY * scale + groundOffset;
  ctx.save();
  if (action === 'walk') {
    const phase = getCreepAnimationPhase(creep);
    ctx.translate(0, Math.sin(phase * 2) * 1.8);
    ctx.rotate(Math.sin(phase) * 0.035);
  } else if (action === 'attack' && type === 'monster_8') {
    const drive = Math.sin(getCreepAttackVisualProgress(creep) * Math.PI);
    ctx.translate(-drive * 5, -drive * 1.2);
    ctx.rotate(-drive * 0.035);
  }
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  objects.forEach(item => drawMonsterVectorObject(ctx, item));
  ctx.restore();
  return true;
}

function getRenderableMonsterFrame(type, action, frameIndex = 0) {
  const pools = [
    monsterImages[type]?.[action],
    monsterImages[type]?.walk,
    monsterImages[type]?.idle,
  ].filter(Boolean);
  for (const frames of pools) {
    const loaded = getLoadedMonsterFrame(frames, frameIndex);
    if (loaded) return rememberMonsterFrame(type, action, loaded);
  }
  return monsterFrameFallbackCache[`${type}:${action}`] ||
    monsterFrameFallbackCache[`${type}:any`] ||
    getAnyRenderableMonsterFrame(action, frameIndex);
}

function getLoadedMonsterFrame(frames, frameIndex = 0) {
  const preferred = frames[frameIndex % Math.max(1, frames.length)];
  if (preferred?.complete && preferred.naturalWidth) return preferred;
  return frames.find(frame => frame?.complete && frame.naturalWidth) || null;
}

function rememberMonsterFrame(type, action, img) {
  if (!img?.complete || !img.naturalWidth) return img;
  monsterFrameFallbackCache[`${type}:${action}`] = img;
  monsterFrameFallbackCache[`${type}:any`] = img;
  monsterFrameFallbackCache[`any:${action}`] = img;
  monsterFrameFallbackCache.any = img;
  return img;
}

function getAnyRenderableMonsterFrame(action, frameIndex = 0) {
  for (const type of MONSTER_TYPES) {
    const actions = [action, 'walk', 'idle'];
    for (const actionId of actions) {
      const loaded = getLoadedMonsterFrame(monsterImages[type]?.[actionId] || [], frameIndex);
      if (loaded) return rememberMonsterFrame(type, actionId, loaded);
    }
  }
  return monsterFrameFallbackCache[`any:${action}`] || monsterFrameFallbackCache.any || null;
}

function drawCreepSilhouette(ctx, creep, w, h, scale, groundOffset = 0) {
  const color = creep.teamId === 'sun' ? 'rgba(96,44,34,0.78)' : 'rgba(42,58,86,0.78)';
  const edge = creep.teamId === 'sun' ? 'rgba(228,71,71,0.42)' : 'rgba(61,139,255,0.42)';
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(1, 1.1 * scale);
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.42 + groundOffset, w * 0.23, h * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,232,150,0.72)';
  ctx.beginPath();
  ctx.arc(w * 0.08, -h * 0.53 + groundOffset, Math.max(1.5, 2.4 * scale), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
  const x = (shot.renderX ?? shot.x) * sx;
  const y = (shot.renderY ?? shot.y) * sy;
  const prevX = (shot.prevRenderX ?? shot.prevX ?? shot.renderX ?? shot.x) * sx;
  const prevY = (shot.prevRenderY ?? shot.prevY ?? shot.renderY ?? shot.y) * sy;
  shot.prevRenderX = shot.renderX ?? shot.x;
  shot.prevRenderY = shot.renderY ?? shot.y;
  const color = shot.teamId === 'sun' ? '#FF9A3D' : '#69A8FF';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const trail = ctx.createLinearGradient(prevX, prevY, x, y);
  trail.addColorStop(0, 'rgba(255,255,255,0)');
  trail.addColorStop(1, withAlpha(color, 0.78));
  ctx.strokeStyle = trail;
  ctx.lineWidth = Math.max(3, 4 * scale);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(prevX, prevY);
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
