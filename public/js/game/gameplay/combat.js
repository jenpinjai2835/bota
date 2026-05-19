// Combat, hit reactions, projectiles, and effects
// ============================================================
//  COMBAT
// ============================================================
const MAX_BLOOD_PARTICLES = 320;
const MAX_TOWER_TRAIL_PARTICLES = 210;
const TOWER_TRAIL_INTERVAL_TICKS = 5;

function doMeleeHit(attacker, skill) {
  const all = attacker === myPlayer ? Object.values(remotePlayers) : (myPlayer ? [myPlayer] : []);
  const range = getMeleeHitRange(skill);
  all.forEach(target => {
    if (!target || target.hp <= 0) return;
    if (!arePlayersHostile(attacker, target)) return;
    const dx = (target.x + target.width/2) - (attacker.x + attacker.width/2);
    if (isUnitInAttackRange(attacker, target, range, true)) {
      dealDamage(target, skill.damage, skill.id, Math.sign(dx) || attacker.facing || 1);
    }
  });
  if (attacker === myPlayer) {
    getAttackableUnits(myPlayer).forEach(unit => {
      const hitUnit = getRenderedWorldUnit(unit);
      const center = getUnitCenter(hitUnit);
      const dx = center.x - (attacker.x + attacker.width/2);
      if (isUnitInAttackRange(attacker, hitUnit, range, true)) {
        damageWorldUnit(unit, skill.damage, skill.id, Math.sign(dx) || attacker.facing || 1);
      }
    });
  }
}

function getMeleeHitRange(skill) {
  if (!skill) return 0;
  return skill.range * (skill.type === 'melee' && skill.key === 'Z' ? MELEE_Z_RANGE_MULTIPLIER : 1);
}

function spawnProjectile(owner, skill) {
  projectiles.push({
    x: owner.x + owner.width/2, y: owner.y + owner.height/2,
    vx: owner.facing * 8,
    vy: 0,
    damage: skill.damage, skillId: skill.id,
    color: skill.color, radius: 8,
    owner: owner.id || myPlayerId,
    life: 60,
  });
}

function spawnAOE(owner, skill) {
  const cx = owner.x + owner.width/2;
  const cy = owner.y + owner.height/2;
  spawnEffect(cx, cy, skill.id, skill.color, 80);

  const all = owner === myPlayer ? Object.values(remotePlayers) : (myPlayer ? [myPlayer] : []);
  all.forEach(target => {
    if (!target || target.hp <= 0) return;
    if (!arePlayersHostile(owner, target)) return;
    const foot = getUnitFoot(target);
    const dx = foot.x - cx;
    const dy = (foot.y - cy) * DEPTH_DISTANCE_SCALE;
    if (Math.sqrt(dx*dx + dy*dy) < skill.range + getUnitFootRadiusX(target) * 0.4) {
      dealDamage(target, skill.damage, skill.id, Math.sign(dx) || owner.facing || 1);
    }
  });
  if (owner === myPlayer) {
    getAttackableUnits(myPlayer).forEach(unit => {
      const hitUnit = getRenderedWorldUnit(unit);
      const center = getUnitCenter(hitUnit);
      const dx = center.x - cx;
      const dy = (center.y - cy) * DEPTH_DISTANCE_SCALE;
      if (Math.sqrt(dx*dx + dy*dy) < skill.range + getUnitFootRadiusX(hitUnit) * 0.5) {
        damageWorldUnit(unit, skill.damage, skill.id, Math.sign(dx) || owner.facing || 1);
      }
    });
  }
}

function getSkillAttackWindup(skill, player = null) {
  if (!skill) return 0;
  if (Number.isFinite(skill.attackWindup)) return Math.max(0, Math.round(skill.attackWindup));
  const duration = getSkillActionDuration(skill.id, player);
  const ratio = skill.type === 'projectile' ? 0.42 : skill.type === 'aoe' ? 0.55 : skill.type === 'dash' ? 0.32 : 0.46;
  return Math.max(80, Math.round(duration * ratio));
}

function executeSkillImpact(owner, skill) {
  if (!owner || !skill || owner.hp <= 0) return;
  if (owner === myPlayer && !isAlive) return;
  if (skill.type === 'projectile') {
    spawnProjectile(owner, skill);
  } else if (skill.type === 'aoe') {
    spawnAOE(owner, skill);
  } else {
    doMeleeHit(owner, skill);
  }
}

function spawnEffect(x, y, id, color, radius = 40, options = {}) {
  const maxLife = id === 'level-up' ? 72 : 30;
  const effect = { x, y, color: color || '#fff', radius, maxRadius: radius, life: maxLife, maxLife, id, ...options };
  if (id === 'attack-dust') {
    const dir = Math.sign(effect.hitDir || 0) || 1;
    const count = 11;
    effect.maxLife = effect.maxLife || effect.life || 20;
    effect.life = effect.life || effect.maxLife;
    effect.dustPuffs = Array.from({ length: count }, (_, i) => {
      const spread = (i / Math.max(1, count - 1) - 0.5) * 2;
      const burst = 0.7 + Math.random() * 1.75;
      return {
        ox: (Math.random() - 0.5) * radius * 0.36,
        oy: (Math.random() - 0.5) * radius * 0.24,
        vx: -dir * burst + spread * 0.8 + (Math.random() - 0.5) * 0.6,
        vy: -0.5 - Math.random() * 1.1 + Math.abs(spread) * 0.18,
        radiusScale: 0.26 + Math.random() * 0.34,
        alphaScale: 0.75 + Math.random() * 0.3,
      };
    });
  }
  if (id === 'tower-ground-dust') {
    const puffCount = 44;
    const ringRadius = radius * 0.14;
    const baseY = Number.isFinite(effect.groundY) ? effect.groundY - 7 : y;
    const variantSeed = Math.random();
    effect.dustProfile = {
      angleOffset: Math.random() * Math.PI * 2,
      ringStretchX: 1 + (Math.random() - 0.5) * 0.16,
      ringStretchY: 1 + (Math.random() - 0.5) * 0.14,
      ringPulseA: 0.03 + Math.random() * 0.03,
      ringPulseB: 0.02 + Math.random() * 0.03,
      radiusBaseMul: 0.96 + Math.random() * 0.12,
      opacityMul: 0.9 + Math.random() * 0.2,
      countBias: Math.round((Math.random() - 0.5) * 6),
      seed: variantSeed,
    };
    const outerCount = Math.max(22, 32 + (effect.dustProfile.countBias || 0));
    effect.outerDustPuffs = Array.from({ length: outerCount }, (_, i) => {
      const t = (i / outerCount) * Math.PI * 2;
      return {
        t,
        radiusMul: 0.92 + Math.random() * 0.2,
        sizeMul: 0.9 + Math.random() * 0.24,
        alphaMul: 0.86 + Math.random() * 0.24,
      };
    });
    effect.dustPuffs = Array.from({ length: puffCount }, (_, i) => {
      const angle = (i / puffCount) * Math.PI * 2;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle) * 0.22;
      const speed = 1.1 + Math.random() * 1.9;
      return {
        ox: dirX * ringRadius,
        oy: dirY * ringRadius,
        vx: dirX * speed,
        vy: -0.14 - Math.random() * 0.28,
        radiusScale: 0.8 + Math.random() * 0.38,
        yBase: baseY + Math.sin(angle) * 2,
        phase: Math.random() * Math.PI * 2,
        alphaScale: 0.82 + Math.random() * 0.32,
      };
    });
  }
  effects.push(effect);
}

function syncEffectFollowTarget(effect) {
  if (!effect.followPlayerId) return;
  const target = getPlayerById(effect.followPlayerId);
  if (!target) return;
  effect.x = target.x + target.width / 2;
  effect.y = target.y + target.height * (effect.followYOffsetRatio ?? 0.35);
}

function spawnBloodBurst(x, y, dir = 1, amount = 14, groundY = null) {
  for (let i = 0; i < amount; i++) {
    const speed = 1.5 + Math.random() * 4.2;
    bloodParticles.push({
      x: x + (Math.random() - 0.5) * 14,
      y: y + (Math.random() - 0.5) * 18,
      vx: dir * speed + (Math.random() - 0.5) * 1.2,
      vy: -1.9 - Math.random() * 3.2,
      size: 2.2 + Math.random() * 4.4,
      groundY,
      life: 34 + Math.floor(Math.random() * 18),
      maxLife: 52,
    });
  }
}

function getPlayerDeathSpriteSource(target) {
  const ch = target?.charData || CHARACTERS.find(entry => entry.id === target?.character);
  if (!ch?.sprite) return null;
  const sheets = ch.sprite.sheets || {};
  const action = typeof getActiveAction === 'function' ? getActiveAction(target) : null;
  const preferredIds = [];
  if (ch.id === 'dragonfist' && action === 'punch') {
    preferredIds.push(target.actionVariant === 'attackKick' ? 'attackKick' : 'attack');
  }
  if (target?.state === 'run') preferredIds.push('run');
  preferredIds.push('idle', 'run', 'attack');

  for (const sheetId of preferredIds) {
    const sheet = sheets[sheetId];
    const img = spriteImages[`${ch.id}:${sheetId}`];
    if (sheet && img?.complete && img.naturalWidth) {
      const cols = Math.max(1, sheet.cols || 1);
      const rows = Math.max(1, sheet.rows || 1);
      const frames = Math.max(1, sheet.frames || cols * rows);
      const frameW = img.naturalWidth / cols;
      const frameH = img.naturalHeight / rows;
      let frame = 0;
      if (sheetId === 'idle' || sheetId === 'run') {
        const fps = sheet.fps || 12;
        frame = Math.floor(Date.now() / Math.max(1, 1000 / fps)) % frames;
      } else if (target.actionStartedAt) {
        const duration = Math.max(1, (target.actionUntil || Date.now()) - target.actionStartedAt);
        const progress = Math.max(0, Math.min(0.999, (Date.now() - target.actionStartedAt) / duration));
        frame = Math.floor(progress * frames);
      }
      return {
        img,
        sheet,
        frameX: (frame % cols) * frameW,
        frameY: Math.floor(frame / cols) * frameH,
        frameW,
        frameH,
      };
    }
  }

  const img = spriteImages[ch.id];
  if (img?.complete && img.naturalWidth) {
    return { img, frameX: 0, frameY: 0, frameW: img.naturalWidth, frameH: img.naturalHeight };
  }
  return null;
}

function spawnPlayerTextureDeathBurst(target, dir = 1, damage = 0) {
  const source = getPlayerDeathSpriteSource(target);
  if (!source?.img) return false;
  const foot = getUnitFoot(target);
  const groundY = foot.y;
  const cx = foot.x;
  const cy = groundY - (target.height || 72) * 0.58;
  const partCount = 13;
  const force = 1 + Math.min(5, Math.max(0, damage) * 0.035);
  const damageTint = target.teamId === 'sun' ? 'rgba(160, 220, 255, 0.08)' : 'rgba(216, 154, 255, 0.08)';
  for (let i = 0; i < partCount; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const sw = source.frameW * (0.19 + debrisRand(i, 205) * 0.11);
    const sh = source.frameH * (0.19 + debrisRand(i, 209) * 0.12);
    const sx = source.frameX + Math.max(0, Math.min(source.frameW - sw, source.frameW * (0.12 + col * 0.2 + (debrisRand(i, 213) - 0.5) * 0.09)));
    const sy = source.frameY + Math.max(0, Math.min(source.frameH - sh, source.frameH * (0.1 + row * 0.25 + (debrisRand(i, 217) - 0.5) * 0.11)));
    const spread = (i / Math.max(1, partCount - 1) - 0.5) * 2;
    const layerGroundY = getDebrisLayerGroundY(groundY, i + 901, 0.92);
    const layerScale = getDebrisLayerScale(groundY, layerGroundY);
    const size = (13 + debrisRand(i, 221) * 12 + (i % 3) * 2.4) * layerScale;
    deathParts.push({
      img: source.img,
      sx,
      sy,
      sw,
      sh,
      x: cx + spread * 8,
      y: cy + (debrisRand(i, 225) - 0.5) * 20,
      vx: dir * (force + debrisRand(i, 229) * 3.4) + spread * (2.7 + debrisRand(i, 233) * 2),
      vy: -3.8 - debrisRand(i, 237) * 5.1,
      w: size,
      h: size * (sh / sw),
      groundY: layerGroundY,
      angle: (debrisRand(i, 241) - 0.5) * 1.8,
      spin: (debrisRand(i, 245) - 0.5 + dir * 0.28) * 0.15,
      gravityScale: 0.32,
      bounceScale: 0.28,
      groundFriction: 0.7,
      airFriction: 0.986,
      spinBounceScale: -0.52,
      tint: damageTint,
      cracks: createDebrisCracks(i + 181, 1 + (i % 2)),
      polygon: createDebrisPolygon(i + 211, 5 + (i % 4)),
      life: Math.round(DEATH_PART_LIFE * 0.82),
      maxLife: Math.round(DEATH_PART_LIFE * 0.82),
    });
  }
  return true;
}

function countTowerTrailParticles() {
  return bloodParticles.reduce((count, particle) => {
    return count + (particle.kind === 'smoke' || particle.kind === 'fire' ? 1 : 0);
  }, 0);
}

function spawnDeathPartsBurst(target, dir = 1, damage = 0) {
  const files = [
    'Body.png',
    'Head.png',
    'Left_Arm.png',
    'Left_Hand.png',
    'Left_Leg.png',
    'Right_Leg.png',
    'clothes/Body_clothes.png',
    'clothes/Arm_clothes.png',
    'clothes/Hand_clothes.png',
    'clothes/Hat.png',
    'clothes/Left_Shoes.png',
    'clothes/Right_Shoes.png',
    'clothes/Sword.png',
  ];
  const foot = getUnitFoot(target);
  const groundY = foot.y;
  const cx = foot.x;
  const cy = groundY - target.height * 0.58;
  const force = 2.6 + Math.min(8, Math.max(0, damage) * 0.018);
  files.forEach((file, i) => {
    const img = warriorVectorOverlayImages[file];
    if (!img?.complete || !img.naturalWidth) return;
    const spread = (i / Math.max(1, files.length - 1) - 0.5) * 2;
    const layerGroundY = getDebrisLayerGroundY(groundY, i + 1101, 0.95);
    const layerScale = getDebrisLayerScale(groundY, layerGroundY);
    const size = (file.includes('Body') ? 33 : file.includes('Head') || file.includes('Hat') ? 24 : 18) * layerScale;
    deathParts.push({
      img,
      x: cx + spread * 7,
      y: cy + (Math.random() - 0.5) * 18,
      vx: dir * (force + Math.random() * 4.5) + spread * 2.8,
      vy: -4.8 - Math.random() * (5 + Math.min(4, damage * 0.01)),
      w: size,
      h: size * (img.naturalHeight / img.naturalWidth),
      groundY: layerGroundY,
      angle: (Math.random() - 0.5) * 1.4,
      spin: (Math.random() - 0.5 + dir * 0.35) * (0.12 + Math.min(0.26, damage * 0.002)),
      life: DEATH_PART_LIFE,
      maxLife: DEATH_PART_LIFE,
    });
  });
}

function spawnDeathPartTrail(part) {
  if (!part?.trail || part.life < 8) return;
  const speed = Math.hypot(part.vx || 0, part.vy || 0);
  if (speed < 0.45) return;
  const lifePct = part.life / Math.max(1, part.maxLife || part.life);
  part.trailTick = (part.trailTick || 0) + 1;
  const interval = part.trailInterval || (lifePct > 0.72 ? 4 : TOWER_TRAIL_INTERVAL_TICKS);
  if (part.trailTick % interval !== 0) return;
  if (countTowerTrailParticles() >= MAX_TOWER_TRAIL_PARTICLES) return;
  const tailX = part.x - part.vx * (0.8 + Math.random() * (part.trailScatter || 0.9));
  const tailY = part.y - part.vy * (0.8 + Math.random() * (part.trailScatter || 0.9));
  const smokeSize = (part.trailSmokeSize || 8) + Math.random() * (part.trailSmokeSizeRange || 10);
  const smokeY = tailY + (Math.random() - 0.5) * 8;
  bloodParticles.push({
    kind: 'smoke',
    x: tailX + (Math.random() - 0.5) * 10,
    y: Number.isFinite(part.groundY) ? Math.min(smokeY, part.groundY - smokeSize) : smokeY,
    vx: -(part.vx || 0) * (0.08 + Math.random() * 0.04) + (Math.random() - 0.5) * 0.45,
    vy: -0.75 - Math.random() * 1.05,
    size: smokeSize,
    color: Math.random() < 0.24 ? '#7C736B' : '#4A4542',
    groundY: part.groundY,
    gravity: 0.035,
    groundDamping: 0.04,
    life: (part.trailSmokeLife || 32) + Math.floor(Math.random() * (part.trailSmokeLifeRange || 18)),
    maxLife: part.trailSmokeMaxLife || 58,
    trailScale: part.trailScale || 1,
  });
  if (Math.random() < (part.trailFireChance ?? 0.18) * lifePct && countTowerTrailParticles() < MAX_TOWER_TRAIL_PARTICLES) {
    const fireSize = (part.trailFireSize || 4) + Math.random() * (part.trailFireSizeRange || 6);
    const fireY = tailY + (Math.random() - 0.5) * 6;
    bloodParticles.push({
      kind: 'fire',
      x: tailX + (Math.random() - 0.5) * 7,
      y: Number.isFinite(part.groundY) ? Math.min(fireY, part.groundY - fireSize) : fireY,
      vx: -(part.vx || 0) * 0.16 + (Math.random() - 0.5) * 0.7,
      vy: -(part.vy || 0) * 0.08 - 0.5 - Math.random() * 1.2,
      size: fireSize,
      color: Math.random() < 0.28 ? '#FFE28A' : '#FF7A24',
      groundY: part.groundY,
      gravity: 0.025,
      groundDamping: 0.06,
      life: (part.trailFireLife || 34) + Math.floor(Math.random() * (part.trailFireLifeRange || 28)),
      maxLife: part.trailFireMaxLife || 84,
      trailScale: Math.max(1, (part.trailScale || 1) * 0.72),
    });
  }
}

function getDeathPartBottomOffset(part) {
  if (!part?.polygon?.length) return (part?.h || 0) * 0.5;
  const bottom = part.polygon.reduce((max, point) => Math.max(max, Number.isFinite(point.y) ? point.y : -0.5), -0.5);
  return (part.h || 0) * bottom;
}

function applyHitReaction(target, dir = 1, skillId = null) {
  if (!target) return;
  if (!shouldApplyHitReaction(skillId)) {
    target.hitDir = dir;
    return;
  }
  const force = getHitReactionForce(skillId, 0) * Math.max(0.25, 1 - getPlayerStat(target, 'knockbackResist'));
  target.vx = dir * force;
  target.vy = Math.min(target.vy || 0, -3.3);
  target.facing = -dir;
  target.hitStunUntil = Date.now() + 260;
  target.hitDir = dir;
  if (target.hp > 0) target.state = 'hurt';
}

function shouldApplyHitReaction(skillId = null) {
  return !['punch', 'creep_melee', 'creep_fireball', 'tower_shot', 'hit'].includes(skillId);
}

function getHitReactionForce(skillId = null, damage = 0) {
  const base = skillId === 'rush' ? 9.5 : skillId === 'roar' ? 6.8 : 5.7;
  return base + Math.min(8, Math.max(0, damage) * 0.045);
}

function startDeathMotion(target, dir = 1, damage = 0, skillId = null) {
  if (!target) return;
  const now = Date.now();
  target.hp = 0;
  target.state = 'dead';
  target.deathStartedAt = now;
  target.deathFadeStartedAt = now + DEATH_BODY_FADE_START_MS;
  target.deathUntil = now + RESPAWN_DELAY_MS;
  target.hitDir = dir;
  target.vx = 0;
  target.vy = 0;
  target.deathAngle = target.deathAngle || 0;
  target.deathSpin = 0;
  target.onGround = true;
  if (!target.bodyShattered) {
    target.bodyShattered = true;
    if (!spawnPlayerTextureDeathBurst(target, dir, damage)) spawnDeathPartsBurst(target, dir, damage);
    const foot = getUnitFoot(target);
    spawnBloodBurst(foot.x, foot.y - target.height * 0.58, dir, 30, foot.y);
  }
}

function isDragonfistAttackHit(skillId, attackerId = null) {
  if (skillId !== 'punch') return false;
  const attacker = attackerId ? getPlayerById(attackerId) : myPlayer;
  return (attacker?.character || attacker?.charData?.id) === 'dragonfist';
}

function spawnDragonfistImpactDust(target, hitDir = 1, skillId = null, attackerId = null) {
  if (!target || !isDragonfistAttackHit(skillId, attackerId)) return;
  const renderedTarget = getRenderedWorldUnit(target) || target;
  const foot = getUnitFoot(renderedTarget);
  const width = getUnitWidth(renderedTarget);
  const height = getUnitHeight(renderedTarget);
  const dir = Math.sign(hitDir || 0) || 1;
  const impactX = foot.x - dir * Math.max(8, width * 0.28);
  const impactY = foot.y - Math.max(12, height * 0.38);
  spawnEffect(impactX, impactY, 'attack-dust', '#B7A083', Math.max(26, Math.min(46, width * 0.82)), {
    life: 20,
    maxLife: 20,
    hitDir: dir,
  });
}

function dealDamage(target, damage, skillId, hitDir = 1) {
  if (!isAlive && target === myPlayer) return;
  if (target === myPlayer && typeof isTestImmortalActive === 'function' && isTestImmortalActive()) {
    myPlayer.hp = myPlayer.maxHp;
    myPlayer.mana = myPlayer.maxMana;
    spawnEffect(target.x + target.width/2, target.y + target.height/2, 'guard_rune', '#F5E182', 34);
    return;
  }
  if (myPlayer && target !== myPlayer && !arePlayersHostile(myPlayer, target)) return;
  const sourceSkill = myPlayer?.charData?.skills?.find(skill => skill.id === skillId);
  const damageType = sourceSkill?.damageType || (sourceSkill?.type === 'projectile' || sourceSkill?.type === 'aoe' ? 'magic' : 'physical');
  const finalDamage = applyDefenseToDamage(target, damage, damageType);
  const targetId = target.id || (target === myPlayer ? myPlayerId : null);
  send({ type: 'player_hit', targetId, damage: finalDamage, skillId, hitDir });
  spawnEffect(target.x + target.width/2, target.y + target.height/2, skillId, '#FF4444', 30);
  spawnDragonfistImpactDust(target, hitDir, skillId, myPlayerId);
  spawnDamageNumber(target.x + target.width/2, target.y + 8, finalDamage, '#FFD166');
  spawnBloodBurst(target.x + target.width/2, target.y + target.height * 0.38, hitDir);
  applyHitReaction(target, hitDir, skillId);
  rememberPredictedHit(targetId, skillId, finalDamage);

  if (target === myPlayer) {
    myPlayer.hp = Math.max(0, myPlayer.hp - finalDamage);
    if (myPlayer.hp <= 0) onMyDeath(hitDir, finalDamage, skillId);
  } else {
    target.hp = Math.max(0, target.hp - finalDamage);
    if (target.hp <= 0) {
      startDeathMotion(target, hitDir, finalDamage, skillId);
    }
  }
}

function handleHitEffect(msg) {
  const target = msg.targetId === myPlayerId ? myPlayer : remotePlayers[msg.targetId];
  if (target) {
    if (msg.targetId === myPlayerId && typeof isTestImmortalActive === 'function' && isTestImmortalActive()) {
      target.hp = target.maxHp;
      target.mana = target.maxMana;
      isAlive = true;
      spawnEffect(target.x + target.width/2, target.y + target.height/2, 'guard_rune', '#F5E182', 34);
      return;
    }
    const alreadyShown = consumePredictedHit(msg);
    target.hp = msg.hp;
    const hitDir = msg.hitDir || (target.facing ? -target.facing : 1);
    applyHitReaction(target, hitDir, msg.skillId);
    if (!alreadyShown) {
      spawnEffect(target.x + target.width/2, target.y + target.height/2, msg.skillId, '#FF4444', 35);
      spawnDragonfistImpactDust(target, hitDir, msg.skillId, msg.attackerId);
      spawnDamageNumber(target.x + target.width/2, target.y + 8, msg.damage, '#FFD166');
      spawnBloodBurst(target.x + target.width/2, target.y + target.height * 0.38, hitDir);
    }
    if (msg.hp <= 0 && msg.targetId === myPlayerId) {
      onMyDeath(hitDir, msg.damage, msg.skillId);
    }
    if (msg.hp <= 0 && msg.targetId !== myPlayerId) {
      startDeathMotion(target, hitDir, msg.damage, msg.skillId);
      spawnEffect(target.x + target.width/2, target.y + target.height/2, 'death', '#FF0000', 60);
    }
  }
}

function handleRemoteSkill(msg) {
  const p = remotePlayers[msg.playerId];
  if (!p) return;
  const ch = p.charData;
  const skill = ch?.skills?.find(s => s.id === msg.skillId);
  if (!skill) return;
  if (Number.isFinite(msg.facing)) p.facing = msg.facing;
  setPlayerAction(p, msg.skillId, undefined, msg.actionVariant || null);
  const windup = Number.isFinite(msg.windup) ? msg.windup : getSkillAttackWindup(skill, p);
  spawnEffect(msg.x + 18, msg.y + 27, `${msg.skillId}-windup`, skill.color, 32);

  if (skill.type === 'projectile') {
    setTimeout(() => {
      projectiles.push({
        x: msg.x + 18, y: msg.y + 27,
        vx: msg.facing * 8, vy: 0,
        damage: skill.damage, skillId: skill.id,
        color: skill.color, radius: 8,
        owner: msg.playerId, life: 60,
      });
    }, windup);
  } else if (skill.type === 'aoe' || skill.type === 'melee' || skill.type === 'dash') {
    // damage handled server-side
    setTimeout(() => spawnEffect(msg.x + 18, msg.y + 27, msg.skillId, skill.color, 42), windup);
  }
}

function onMyDeath(hitDir = 1, damage = 0, skillId = null) {
  if (myPlayer?.state === 'dead' && myPlayer.deathUntil > Date.now()) return;
  isAlive = false;
  if (myPlayer) {
    startDeathMotion(myPlayer, hitDir, damage, skillId);
    const foot = getUnitFoot(myPlayer);
    spawnBloodBurst(foot.x, foot.y - myPlayer.height * 0.58, hitDir, 20, foot.y);
  }
  const overlay = document.getElementById('death-overlay');
  overlay.classList.add('visible');
  let count = Math.ceil(RESPAWN_DELAY_MS / 1000);
  document.getElementById('respawn-countdown').textContent = `กำลังกลับมา... ${count}`;
  if (respawnTimer) clearInterval(respawnTimer);
  respawnTimer = setInterval(() => {
    count--;
    document.getElementById('respawn-countdown').textContent = count > 0 ? `กำลังกลับมา... ${count}` : 'กำลังฟื้นคืนชีพ...';
    if (count <= 0) {
      clearInterval(respawnTimer);
      respawnTimer = null;
    }
  }, 1000);
}

// ============================================================
//  UPDATE PROJECTILES & EFFECTS
// ============================================================
function updateProjectiles() {
  const canvas = document.getElementById('game-canvas');
  const W = canvas.width, H = canvas.height;
  const scaleX = W / WORLD_W, scaleY = H / WORLD_H;

  projectiles = projectiles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += GRAVITY * 0.1;
    p.life--;

    if (p.life <= 0 || p.x < -100 || p.x > WORLD_W + 100) return false;

    // Platform collision
    let hit = false;
    getPlatforms().forEach(plat => {
      if (p.x > plat.x && p.x < plat.x + plat.w && p.y > plat.y && p.y < plat.y + plat.h) hit = true;
    });
    if (hit) { spawnEffect(p.x, p.y, p.skillId, p.color, 25); return false; }

    // Hit check (only for my projectiles)
    if (p.owner === myPlayerId) {
      Object.values(remotePlayers).forEach(target => {
        if (!target || target.hp <= 0) return;
        if (!arePlayersHostile(myPlayer, target)) return;
        const foot = getUnitFoot(target);
        const dx = foot.x - p.x;
        const dy = (foot.y - p.y) * DEPTH_DISTANCE_SCALE;
        if (Math.sqrt(dx*dx + dy*dy) < p.radius + getUnitFootRadiusX(target) * 0.72) {
          dealDamage(target, p.damage, p.skillId, Math.sign(dx) || Math.sign(p.vx) || 1);
          spawnEffect(p.x, p.y, p.skillId, p.color, 30);
          p.life = 0;
        }
      });
      getAttackableUnits(myPlayer).forEach(unit => {
        if (p.life <= 0) return;
        const hitUnit = getRenderedWorldUnit(unit);
        const center = getUnitCenter(hitUnit);
        const dx = center.x - p.x;
        const dy = (center.y - p.y) * DEPTH_DISTANCE_SCALE;
        if (Math.sqrt(dx*dx + dy*dy) < p.radius + Math.max(18, (hitUnit.w || 36) * 0.45)) {
          damageWorldUnit(unit, p.damage, p.skillId, Math.sign(dx) || Math.sign(p.vx) || 1);
          spawnEffect(p.x, p.y, p.skillId, p.color, 30);
          p.life = 0;
        }
      });
    }

    return p.life > 0;
  });

  effects = effects.filter(e => {
    syncEffectFollowTarget(e);
    if (e.id === 'attack-dust' && Array.isArray(e.dustPuffs)) {
      e.dustPuffs.forEach(puff => {
        puff.ox += puff.vx;
        puff.oy += puff.vy;
        puff.vx *= 0.91;
        puff.vy += 0.045;
        puff.vy *= 0.96;
      });
    }
    if (e.id === 'tower-ground-dust' && Array.isArray(e.dustPuffs)) {
      e.dustPuffs.forEach(puff => {
        puff.ox += puff.vx;
        puff.oy += puff.vy;
        puff.vx *= 0.994;
        puff.vy += 0.006;
        puff.vy *= 0.99;
      });
    }
    e.life--;
    return e.life > 0;
  });
  damageNumbers = damageNumbers.filter(n => {
    n.x += n.vx;
    n.y += n.vy;
    n.vy += 0.025;
    n.life--;
    return n.life > 0;
  });
  bloodParticles = bloodParticles.filter(b => {
    b.x += b.vx;
    b.y += b.vy;
    b.vy += b.gravity ?? 0.22;
    if (Number.isFinite(b.groundY) && b.y + b.size >= b.groundY) {
      b.y = b.groundY - b.size;
      b.vy = -Math.abs(b.vy) * (b.groundDamping ?? 0.18);
      b.vx *= 0.72;
    }
    b.vx *= 0.94;
    if (Number.isFinite(b.groundY) && b.y + b.size > b.groundY) {
      b.y = b.groundY - b.size;
    }
    b.life--;
    return b.life > 0;
  });
  if (bloodParticles.length > MAX_BLOOD_PARTICLES) {
    bloodParticles = bloodParticles.slice(bloodParticles.length - MAX_BLOOD_PARTICLES);
  }
  deathParts = deathParts.filter(part => {
    part.x += part.vx;
    part.y += part.vy;
    part.vy += GRAVITY * (part.gravityScale ?? 0.28);
    part.angle += part.spin;
    spawnDeathPartTrail(part);

    let bounced = false;
    const bottomOffset = getDeathPartBottomOffset(part);
    if (Number.isFinite(part.groundY)) {
      if (part.y + bottomOffset >= part.groundY) {
        part.y = part.groundY - bottomOffset;
        part.vy = Math.abs(part.vy) > 1.2 ? -Math.abs(part.vy) * (part.bounceScale ?? 0.34) : 0;
        part.vx *= part.groundFriction ?? 0.74;
        part.spin *= part.spinBounceScale ?? -0.56;
        bounced = true;
      }
    } else {
      getPlatforms().forEach(plat => {
        if (
          part.x > plat.x &&
          part.x < plat.x + plat.w &&
          part.y + bottomOffset > plat.y &&
          part.y - part.h * 0.5 < plat.y + plat.h
        ) {
          part.y = plat.y - bottomOffset;
          part.vy = -Math.abs(part.vy) * (part.bounceScale ?? 0.42);
          part.vx *= part.groundFriction ?? 0.72;
          part.spin *= part.spinBounceScale ?? -0.62;
          bounced = true;
        }
      });
    }
    if (!bounced && (part.x < 0 || part.x > getStageWidth())) {
      part.x = Math.max(0, Math.min(getStageWidth(), part.x));
      part.vx *= -0.5;
      part.spin *= -0.8;
    }
    part.vx *= part.airFriction ?? 0.985;
    part.life--;
    return part.life > 0;
  });
}

// ============================================================
