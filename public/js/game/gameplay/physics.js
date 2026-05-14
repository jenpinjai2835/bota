// Movement, physics, input state, and sync payloads
// ============================================================
//  PHYSICS & GAME LOOP
// ============================================================
const GRAVITY = 0.55;
const GROUND_Y = 466; // canvas height - platform height
const CAM = { x: 0, y: 0 };
const WORLD_W = 840;
const WORLD_H = 600;

function getPlatforms() { return currentStage?.platforms || []; }
function getStageWidth() { return WORLD_W; }

function updatePlayer(p, dt) {
  if (p.hp <= 0 || p.state === 'dead') {
    updateDeadPlayer(p, dt);
    return;
  }

  if (typeof p.mana !== 'number') {
    p.maxMana = p.maxMana || getMaxMana(p.charData);
    p.mana = p.maxMana;
  }
  p.mana = Math.min(p.maxMana || getMaxMana(p.charData), p.mana + getManaRegen(p.charData) * Math.max(1, dt / 16.67));

  // Gravity
  p.vy += GRAVITY;

  // Horizontal friction
  if (p.onGround) p.vx *= 0.82;
  else p.vx *= 0.94;

  p.x += p.vx;
  p.y += p.vy;

  // Platform collision
  p.onGround = false;
  getPlatforms().forEach(plat => {
    if (
      p.x + p.width > plat.x &&
      p.x < plat.x + plat.w &&
      p.y + p.height > plat.y &&
      p.y + p.height < plat.y + plat.h + 20 &&
      p.vy >= 0
    ) {
      p.y = plat.y - p.height;
      p.vy = 0;
      p.onGround = true;
    }
  });

  // World bounds
  if (p.x < 0) { p.x = 0; p.vx = 0; }
  if (p.x + p.width > getStageWidth()) { p.x = getStageWidth() - p.width; p.vx = 0; }

  // Fell off
  if (p.y > WORLD_H + 50) {
    if (p === myPlayer) {
      p.hp = 0;
      onMyDeath();
    }
  }
}

function updateDeadPlayer(p, dt) {
  const step = Math.max(0.5, Math.min(2.2, dt / 16.67 || 1));
  p.hp = 0;
  p.state = 'dead';
  p.deathStartedAt = p.deathStartedAt || Date.now();

  const oldX = p.x;
  const oldY = p.y;
  p.vy += GRAVITY * step;
  p.x += (p.vx || 0) * step;
  p.y += (p.vy || 0) * step;
  p.deathAngle = (p.deathAngle || 0) + ((p.deathSpin || 0) + (p.vx || 0) * 0.012) * step;

  p.onGround = false;
  getPlatforms().forEach(plat => {
    const intersects = p.x + p.width > plat.x &&
      p.x < plat.x + plat.w &&
      p.y + p.height > plat.y &&
      p.y < plat.y + plat.h;
    if (!intersects) return;

    const oldBottom = oldY + p.height;
    const oldRight = oldX + p.width;
    if (oldBottom <= plat.y + 8 && p.vy >= 0) {
      p.y = plat.y - p.height;
      p.vy = Math.abs(p.vy) > 1.1 ? -Math.abs(p.vy) * 0.42 : 0;
      p.vx *= 0.78;
      p.deathSpin *= -0.55;
      p.onGround = true;
    } else if (oldRight <= plat.x) {
      p.x = plat.x - p.width;
      p.vx = -Math.abs(p.vx) * 0.58;
      p.deathSpin *= -0.75;
    } else if (oldX >= plat.x + plat.w) {
      p.x = plat.x + plat.w;
      p.vx = Math.abs(p.vx) * 0.58;
      p.deathSpin *= -0.75;
    }
  });

  if (p.x < 0) {
    p.x = 0;
    p.vx = Math.abs(p.vx || 0) * 0.55;
    p.deathSpin *= -0.75;
  }
  if (p.x + p.width > getStageWidth()) {
    p.x = getStageWidth() - p.width;
    p.vx = -Math.abs(p.vx || 0) * 0.55;
    p.deathSpin *= -0.75;
  }

  p.vx *= p.onGround ? Math.pow(0.9, step) : Math.pow(0.985, step);
  if (p.onGround && Math.abs(p.vy) < 0.6) p.vy = 0;
  if (p.y > WORLD_H + 120) {
    p.y = WORLD_H + 120;
    p.vy = 0;
    p.vx *= 0.8;
  }
}

function isPlayerBodyBlocking(p) {
  return p && p.hp > 0 && p.state !== 'dead';
}

function resolvePlayerBodyCollisions() {
  const players = [myPlayer, ...Object.values(remotePlayers)].filter(isPlayerBodyBlocking);
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i];
      const b = players[j];
      const overlapX = Math.min(a.x + a.width - b.x, b.x + b.width - a.x);
      const overlapY = Math.min(a.y + a.height - b.y, b.y + b.height - a.y);
      if (overlapX <= 0 || overlapY <= 0) continue;

      const dir = (a.x + a.width / 2) < (b.x + b.width / 2) ? -1 : 1;
      if (a === myPlayer) {
        a.x += dir * overlapX;
        a.vx = dir < 0 ? Math.min(0, a.vx || 0) : Math.max(0, a.vx || 0);
      } else if (b === myPlayer) {
        b.x -= dir * overlapX;
        b.vx = dir < 0 ? Math.max(0, b.vx || 0) : Math.min(0, b.vx || 0);
      } else {
        a.x += dir * overlapX * 0.5;
        b.x -= dir * overlapX * 0.5;
        a.vx *= -0.15;
        b.vx *= -0.15;
      }
      a.x = Math.max(0, Math.min(getStageWidth() - a.width, a.x));
      b.x = Math.max(0, Math.min(getStageWidth() - b.width, b.x));
    }
  }
}

function handleInput() {
  if (!myPlayer || !isAlive) return;
  const ch = myPlayer.charData;
  const spd = ch.speed;
  if (myPlayer.hitStunUntil > Date.now()) {
    myPlayer.state = 'hurt';
    myPlayer.vx *= 0.9;
    return;
  }

  if (keys['ArrowLeft'] || keys['a'] || keys['A']) { myPlayer.vx -= spd * 0.4; myPlayer.facing = -1; }
  if (keys['ArrowRight'] || keys['d'] || keys['D']) { myPlayer.vx += spd * 0.4; myPlayer.facing = 1; }
  if (keys['ArrowUp'] || keys['w'] || keys['W'] || keys[' ']) tryJump();

  // Clamp speed
  myPlayer.vx = Math.max(-spd, Math.min(spd, myPlayer.vx));

  // State
  if (!myPlayer.onGround) myPlayer.state = myPlayer.vy < 0 ? 'jump' : 'fall';
  else if (Math.abs(myPlayer.vx) > 0.5) myPlayer.state = 'run';
  else myPlayer.state = 'idle';
}

function isJumpKey(key) {
  return key === 'ArrowUp' || key === 'w' || key === 'W' || key === ' ';
}

function tryJump() {
  if (!myPlayer || !isAlive || !myPlayer.onGround) return false;
  myPlayer.vy = -myPlayer.charData.jumpPower;
  myPlayer.onGround = false;
  myPlayer.state = 'jump';
  return true;
}

function trySkill(skillIndex) {
  if (!myPlayer || !isAlive) return;
  const ch = myPlayer.charData;
  const skill = ch.skills[skillIndex];
  if (!skill) return;
  const now = Date.now();
  if (skillCooldowns[skill.id] > now) return;
  const manaCost = getSkillManaCost(skill);
  if ((myPlayer.mana || 0) < manaCost) {
    spawnEffect(myPlayer.x + myPlayer.width/2, myPlayer.y + myPlayer.height/2, 'no-mana', '#4AA3FF', 34);
    return;
  }

  skillCooldowns[skill.id] = now + skill.cooldown;
  myPlayer.mana = Math.max(0, (myPlayer.mana || 0) - manaCost);
  setPlayerAction(myPlayer, skill.id);

  // Self heal
  if (skill.type === 'heal') {
    myPlayer.hp = Math.min(myPlayer.maxHp, myPlayer.hp + Math.abs(skill.damage));
    spawnEffect(myPlayer.x + myPlayer.width/2, myPlayer.y, 'heal', '#82E0AA');
    send({ type: 'player_input', ...getMyState(), action: skill.id });
    return;
  }

  // Dash
  if (skill.type === 'dash') {
    myPlayer.vx = myPlayer.facing * skill.range * 0.08;
    myPlayer.vy = -4;
  }

  // Spawn projectile or AOE
  if (skill.type === 'projectile') {
    spawnProjectile(myPlayer, skill);
  } else if (skill.type === 'aoe') {
    spawnAOE(myPlayer, skill);
  } else {
    // melee
    doMeleeHit(myPlayer, skill);
  }

  send({ type: 'skill_cast', skillId: skill.id, x: myPlayer.x, y: myPlayer.y, facing: myPlayer.facing });
  spawnEffect(myPlayer.x + myPlayer.width/2, myPlayer.y + myPlayer.height/2, skill.id, skill.color);
}

function getMyState() {
  if (!myPlayer) return {};
  return {
    x: myPlayer.x, y: myPlayer.y,
    vx: myPlayer.vx, vy: myPlayer.vy,
    onGround: myPlayer.onGround,
    facing: myPlayer.facing,
    state: myPlayer.state,
    hp: myPlayer.hp,
  };
}

function sendInput() {
  const now = Date.now();
  if (now - lastInputSent < 40) return;
  lastInputSent = now;
  send({ type: 'player_input', ...getMyState() });
}
