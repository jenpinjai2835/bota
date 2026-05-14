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
    p.vx = 0;
    p.vy = 0;
    p.state = 'dead';
    p.onGround = true;
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
