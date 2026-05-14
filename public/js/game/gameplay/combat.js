// Combat, hit reactions, projectiles, and effects
// ============================================================
//  COMBAT
// ============================================================
function doMeleeHit(attacker, skill) {
  const all = attacker === myPlayer ? Object.values(remotePlayers) : (myPlayer ? [myPlayer] : []);
  all.forEach(target => {
    if (!target || target.hp <= 0) return;
    const dx = (target.x + target.width/2) - (attacker.x + attacker.width/2);
    const dy = (target.y + target.height/2) - (attacker.y + attacker.height/2);
    const dist = Math.sqrt(dx*dx + dy*dy);
    const inFront = (attacker.facing > 0 ? dx > 0 : dx < 0);
    if (dist < skill.range && inFront) {
      dealDamage(target, skill.damage, skill.id, Math.sign(dx) || attacker.facing || 1);
    }
  });
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
    const dx = (target.x + target.width/2) - cx;
    const dy = (target.y + target.height/2) - cy;
    if (Math.sqrt(dx*dx + dy*dy) < skill.range) {
      dealDamage(target, skill.damage, skill.id, Math.sign(dx) || owner.facing || 1);
    }
  });
}

function spawnEffect(x, y, id, color, radius = 40) {
  effects.push({ x, y, color: color || '#fff', radius, maxRadius: radius, life: 30, maxLife: 30, id });
}

function spawnBloodBurst(x, y, dir = 1, amount = 14) {
  for (let i = 0; i < amount; i++) {
    const speed = 1.5 + Math.random() * 4.2;
    bloodParticles.push({
      x: x + (Math.random() - 0.5) * 14,
      y: y + (Math.random() - 0.5) * 18,
      vx: dir * speed + (Math.random() - 0.5) * 1.2,
      vy: -1.9 - Math.random() * 3.2,
      size: 2.2 + Math.random() * 4.4,
      life: 34 + Math.floor(Math.random() * 18),
      maxLife: 52,
    });
  }
}

function applyHitReaction(target, dir = 1, skillId = null) {
  if (!target) return;
  const force = skillId === 'rush' ? 9.5 : skillId === 'roar' ? 6.8 : 5.7;
  target.vx = dir * force;
  target.vy = Math.min(target.vy || 0, -3.3);
  target.facing = -dir;
  target.hitStunUntil = Date.now() + 260;
  target.hitDir = dir;
  if (target.hp > 0) target.state = 'hurt';
}

function dealDamage(target, damage, skillId, hitDir = 1) {
  if (!isAlive && target === myPlayer) return;
  const targetId = target.id || (target === myPlayer ? myPlayerId : null);
  send({ type: 'player_hit', targetId, damage, skillId, hitDir });
  spawnEffect(target.x + target.width/2, target.y + target.height/2, skillId, '#FF4444', 30);
  spawnDamageNumber(target.x + target.width/2, target.y + 8, damage, '#FFD166');
  spawnBloodBurst(target.x + target.width/2, target.y + target.height * 0.38, hitDir);
  applyHitReaction(target, hitDir, skillId);
  rememberPredictedHit(targetId, skillId, damage);

  if (target === myPlayer) {
    myPlayer.hp = Math.max(0, myPlayer.hp - damage);
    if (myPlayer.hp <= 0) onMyDeath(hitDir);
  } else {
    target.hp = Math.max(0, target.hp - damage);
    if (target.hp <= 0) {
      target.state = 'dead';
      target.deathUntil = Date.now() + RESPAWN_DELAY_MS;
    }
  }
}

function handleHitEffect(msg) {
  const target = msg.targetId === myPlayerId ? myPlayer : remotePlayers[msg.targetId];
  if (target) {
    const alreadyShown = consumePredictedHit(msg);
    target.hp = msg.hp;
    const hitDir = msg.hitDir || (target.facing ? -target.facing : 1);
    applyHitReaction(target, hitDir, msg.skillId);
    if (!alreadyShown) {
      spawnEffect(target.x + target.width/2, target.y + target.height/2, msg.skillId, '#FF4444', 35);
      spawnDamageNumber(target.x + target.width/2, target.y + 8, msg.damage, '#FFD166');
      spawnBloodBurst(target.x + target.width/2, target.y + target.height * 0.38, hitDir);
    }
    if (msg.hp <= 0 && msg.targetId === myPlayerId) {
      onMyDeath(hitDir);
    }
    if (msg.hp <= 0 && msg.targetId !== myPlayerId) {
      target.state = 'dead';
      target.deathUntil = Date.now() + RESPAWN_DELAY_MS;
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
  setPlayerAction(p, msg.skillId);
  spawnEffect(msg.x + 18, msg.y + 27, msg.skillId, skill.color, 50);

  if (skill.type === 'projectile') {
    projectiles.push({
      x: msg.x + 18, y: msg.y + 27,
      vx: msg.facing * 8, vy: 0,
      damage: skill.damage, skillId: skill.id,
      color: skill.color, radius: 8,
      owner: msg.playerId, life: 60,
    });
  } else if (skill.type === 'aoe' || skill.type === 'melee' || skill.type === 'dash') {
    // damage handled server-side
  }
}

function onMyDeath(hitDir = 1) {
  if (myPlayer?.state === 'dead' && myPlayer.deathUntil > Date.now()) return;
  isAlive = false;
  if (myPlayer) {
    myPlayer.hp = 0;
    myPlayer.vx = 0;
    myPlayer.vy = 0;
    myPlayer.state = 'dead';
    myPlayer.deathUntil = Date.now() + RESPAWN_DELAY_MS;
    myPlayer.hitDir = hitDir;
    spawnBloodBurst(myPlayer.x + myPlayer.width / 2, myPlayer.y + myPlayer.height * 0.42, hitDir, 20);
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
        if (!target) return;
        const dx = (target.x + target.width/2) - p.x;
        const dy = (target.y + target.height/2) - p.y;
        if (Math.sqrt(dx*dx + dy*dy) < p.radius + 20) {
          dealDamage(target, p.damage, p.skillId, Math.sign(dx) || Math.sign(p.vx) || 1);
          spawnEffect(p.x, p.y, p.skillId, p.color, 30);
          p.life = 0;
        }
      });
    }

    return p.life > 0;
  });

  effects = effects.filter(e => { e.life--; return e.life > 0; });
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
    b.vy += 0.22;
    b.vx *= 0.94;
    b.life--;
    return b.life > 0;
  });
}

// ============================================================
