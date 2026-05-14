// Shared state, assets, and action helpers
// ============================================================
//  GAME STATE
// ============================================================
let ws = null;
let myPlayerId = null;
let myRoomId = null;
let myName = '';
let myCharId = 'dragonfist';
let isHost = false;
let isReady = false;
let roomState = null;
let gameRunning = false;
let currentStage = null;
let remotePlayers = {};
let myPlayer = null;
let projectiles = [];
let effects = [];
let damageNumbers = [];
let bloodParticles = [];
let deathParts = [];
let skillCooldowns = {};
let scores = {};
let isAlive = true;
let respawnTimer = null;
const RESPAWN_DELAY_MS = 10000;
const CHARACTER_VISUAL_SCALE = 0.6;
const MIN_CHARACTER_HP = 500;
const MELEE_Z_RANGE_MULTIPLIER = 1.5;
const DEATH_BODY_FADE_START_MS = 3800;
const DEATH_BODY_FADE_DURATION_MS = 1200;
const DEATH_PART_LIFE = 300;
const spriteImages = {};
const warriorVectorOverlayImages = {};
const WARRIOR_VECTOR_OVERLAY_BASE = '/assets/sprites/warrior-vector-parts/right-side/';
const WARRIOR_VECTOR_OVERLAY_FILES = [
  'Body.png',
  'Head.png',
  'Face_01.png',
  'Face_02.png',
  'Face_03.png',
  'Face_04.png',
  'Face_05.png',
  'Face_06.png',
  'Face_07.png',
  'Face_08.png',
  'Face_09.png',
  'Face_10.png',
  'Left_Arm.png',
  'Left_Hand.png',
  'Left_Leg.png',
  'Right_Leg.png',
  'clothes/Arm_clothes.png',
  'clothes/Body_clothes.png',
  'clothes/HairMustacheBeard.png',
  'clothes/Hand_clothes.png',
  'clothes/Hat.png',
  'clothes/Left_Shoes.png',
  'clothes/Right_Shoes.png',
  'clothes/Shiled.png',
  'clothes/Slash.png',
  'clothes/Slash_2.png',
  'clothes/Sword.png',
];
let warriorVectorAnimationsData = null;
let warriorVectorAnimationsLoadStarted = false;
let localActionState = { action: null, actionStartedAt: 0, actionUntil: 0 };
const predictedHitEffects = [];
const ACTION_DURATIONS = {
  punch: 360,
  flame: 760,
  rush: 650,
  roar: 900,
  smash: 720,
  charge: 760,
  fortress: 1050,
  cannon: 760,
  slam: 880,
  missile: 760,
  overdrive: 1100,
  heal: 940,
  judgment: 980,
  default: 360,
};

function preloadSpriteAssets() {
  if (typeof Image === 'undefined') return;
  CHARACTERS.forEach(ch => {
    if (!ch.sprite?.src) return;
    if (!spriteImages[ch.id]) {
      const img = new Image();
      img.src = ch.sprite.src;
      spriteImages[ch.id] = img;
    }
    Object.entries(ch.sprite.sheets || {}).forEach(([sheetId, sheet]) => {
      const key = `${ch.id}:${sheetId}`;
      if (spriteImages[key]) return;
      const img = new Image();
      img.src = sheet.src;
      spriteImages[key] = img;
    });
  });
  WARRIOR_VECTOR_OVERLAY_FILES.forEach(file => {
    if (warriorVectorOverlayImages[file]) return;
    const img = new Image();
    img.src = `${WARRIOR_VECTOR_OVERLAY_BASE}${file}`;
    warriorVectorOverlayImages[file] = img;
  });
  if (!warriorVectorAnimationsLoadStarted && typeof fetch === 'function') {
    warriorVectorAnimationsLoadStarted = true;
    fetch(`${WARRIOR_VECTOR_OVERLAY_BASE}animations.json`)
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        warriorVectorAnimationsData = data;
      })
      .catch(() => {
        warriorVectorAnimationsData = null;
      });
  }
}

// Input
const keys = {};
let lastInputSent = 0;

preloadSpriteAssets();

function getSkillForAction(ch, action) {
  return ch?.skills?.find(skill => skill.id === action) || null;
}

function getSkillActionDuration(action, player = null) {
  if (ACTION_DURATIONS[action]) return ACTION_DURATIONS[action];
  const skill = getSkillForAction(player?.charData, action);
  if (skill?.type === 'melee') return 540;
  if (skill?.type === 'projectile') return 680;
  if (skill?.type === 'dash') return 720;
  if (skill?.type === 'aoe') return 860;
  if (skill?.type === 'heal') return 920;
  if (skill?.type === 'buff') return 1000;
  return ACTION_DURATIONS.default;
}

function setPlayerAction(player, action, duration = getSkillActionDuration(action, player)) {
  if (!player || !action) return;
  const actionStartedAt = Date.now();
  const actionUntil = actionStartedAt + duration;
  player.action = action;
  player.actionStartedAt = actionStartedAt;
  player.actionUntil = actionUntil;
  if (player === myPlayer) {
    localActionState = { action, actionStartedAt, actionUntil };
  }
}

function getActionTiming(player) {
  const now = Date.now();
  if (player === myPlayer && localActionState.action && localActionState.actionUntil > now) {
    return localActionState;
  }
  if (player?.action && player.actionUntil > now) {
    return player;
  }
  return null;
}

function getActiveAction(player) {
  return getActionTiming(player)?.action || null;
}

function getActionProgress(player) {
  const timing = getActionTiming(player);
  if (!timing) return 1;
  const duration = Math.max(1, (timing.actionUntil || 0) - (timing.actionStartedAt || 0));
  return Math.min(1, Math.max(0, (Date.now() - (timing.actionStartedAt || 0)) / duration));
}

function getMaxMana(ch) {
  return ch?.maxMana || 100;
}

function getCharacterMaxHp(ch) {
  return Math.max(MIN_CHARACTER_HP, ch?.maxHp || 100);
}

function getPlayerClassLabel(playerOrScore) {
  const ch = playerOrScore?.charData || CHARACTERS.find(c => c.id === playerOrScore?.character);
  return ch?.class || ch?.name || playerOrScore?.name || 'Fighter';
}

function getManaRegen(ch) {
  return ch?.manaRegen || 0.24;
}

function getSkillManaCost(skill) {
  if (typeof skill?.manaCost === 'number') return skill.manaCost;
  if (!skill) return 0;
  if (skill.type === 'melee') return 10;
  if (skill.type === 'projectile') return 24;
  if (skill.type === 'dash') return 30;
  if (skill.type === 'aoe') return 42;
  if (skill.type === 'heal') return 38;
  return 25;
}

function spawnDamageNumber(x, y, amount, color = '#FFE082') {
  if (!amount) return;
  damageNumbers.push({
    x,
    y,
    value: Math.abs(amount),
    color,
    vx: (Math.random() - 0.5) * 0.8,
    vy: -1.35,
    life: 48,
    maxLife: 48,
  });
}

function rememberPredictedHit(targetId, skillId, damage) {
  if (!targetId) return;
  const now = Date.now();
  predictedHitEffects.push({ targetId, skillId, damage, at: now });
  while (predictedHitEffects.length > 12) predictedHitEffects.shift();
}

function consumePredictedHit(msg) {
  if (msg.attackerId !== myPlayerId) return false;
  const now = Date.now();
  const index = predictedHitEffects.findIndex(hit =>
    hit.targetId === msg.targetId &&
    hit.skillId === msg.skillId &&
    hit.damage === msg.damage &&
    now - hit.at < 900
  );
  if (index < 0) return false;
  predictedHitEffects.splice(index, 1);
  return true;
}
