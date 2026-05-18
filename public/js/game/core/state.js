// Shared state, assets, and action helpers
// ============================================================
//  GAME STATE
// ============================================================
let ws = null;
let myPlayerId = null;
let myRoomId = null;
let myName = '';
let myCharId = 'dragonfist';
let mySessionToken = localStorage.getItem('bota_session_token') || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
localStorage.setItem('bota_session_token', mySessionToken);
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
let matchItems = [];
let creeps = [];
let creepProjectiles = [];
let objectives = [];
let towerShots = [];
let gameWinner = null;
let nextMatchItemSpawnAt = 0;
let skillCooldowns = {};
let scores = {};
let isAlive = true;
let respawnTimer = null;
let focusedPlayerId = null;
let lastKillAnnouncementKey = null;
let lastKillAnnouncementAt = 0;
let combatStatsExpanded = false;
let combatStatsRenderSignature = '';
let chatAutoHideTimer = null;
let assetLoadingStartedForRoomId = null;
let clientBootAssetsReady = false;
let lobbyAssetPreloadKey = '';
let reconnecting = false;
let reconnectAttempt = 0;
let reconnectTimer = null;
let testModeState = {
  immortal: false,
};
let cinematicPause = {
  active: false,
  mode: null,
  until: 0,
  frame: 0,
  pendingWorldState: null,
  pendingWinner: null,
  focusX: null,
  focusY: null,
};
const mutedChatPlayerIds = new Set();
const recentCreepDeathBursts = new Map();
const assetLoadCache = new Map();
const stageBackgroundWarmupCache = new Map();
const RESPAWN_DELAY_MS = 10000;
const CHARACTER_VISUAL_SCALE = 0.6;
const MIN_CHARACTER_HP = 500;
const MELEE_Z_RANGE_MULTIPLIER = 1.5;
const BATTLEFIELD_TOP_Y = 300;
const BATTLEFIELD_BOTTOM_Y = 540;
const UNIT_FOOT_RADIUS_X = 19;
const UNIT_FOOT_RADIUS_Y = 13;
const DEPTH_DISTANCE_SCALE = 1.45;
const DEATH_BODY_FADE_START_MS = 3800;
const DEATH_BODY_FADE_DURATION_MS = 1200;
const DEATH_PART_LIFE = 300;
const spriteImages = {};
const objectiveImages = {};
const OBJECTIVE_TEXTURE_URLS = {
  sunTower: '/assets/objectives/tower-sun-blue.png',
  moonTower: '/assets/objectives/tower-moon-purple.png',
};
const monsterImages = {};
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
let basicAttackReadyAt = 0;
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
  Object.entries(OBJECTIVE_TEXTURE_URLS).forEach(([key, src]) => {
    if (objectiveImages[key]) return;
    const img = new Image();
    img.src = src;
    objectiveImages[key] = img;
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

function collectInitialClientAssetUrls() {
  const urls = new Set();
  const ch = CHARACTERS.find(char => char.id === 'dragonfist') || CHARACTERS[0];
  if (ch?.sprite?.src) urls.add(ch.sprite.src);
  Object.values(ch?.sprite?.sheets || {}).forEach(sheet => {
    if (sheet.src) urls.add(sheet.src);
  });
  [
    'Body.png',
    'Head.png',
    'Left_Leg.png',
    'Right_Leg.png',
    'clothes/Body_clothes.png',
    'clothes/Hat.png',
  ].forEach(file => urls.add(`${WARRIOR_VECTOR_OVERLAY_BASE}${file}`));
  urls.add(`${WARRIOR_VECTOR_OVERLAY_BASE}animations.json`);
  Object.values(OBJECTIVE_TEXTURE_URLS).forEach(src => urls.add(src));
  return Array.from(urls);
}

function collectMatchAssetUrls() {
  const urls = new Set();
  CHARACTERS.forEach(ch => {
    if (ch.sprite?.src) urls.add(ch.sprite.src);
    Object.values(ch.sprite?.sheets || {}).forEach(sheet => {
      if (sheet.src) urls.add(sheet.src);
    });
  });
  WARRIOR_VECTOR_OVERLAY_FILES.forEach(file => urls.add(`${WARRIOR_VECTOR_OVERLAY_BASE}${file}`));
  urls.add(`${WARRIOR_VECTOR_OVERLAY_BASE}animations.json`);
  Object.values(OBJECTIVE_TEXTURE_URLS).forEach(src => urls.add(src));

  const monsterTypes = typeof MONSTER_TYPES !== 'undefined' ? MONSTER_TYPES : [];
  const monsterActions = typeof MONSTER_ACTIONS !== 'undefined' ? MONSTER_ACTIONS : {};
  const monsterVectorParts = typeof MONSTER_VECTOR_PARTS !== 'undefined' ? MONSTER_VECTOR_PARTS : {};
  monsterTypes.forEach(type => {
    Object.values(monsterActions).forEach(meta => {
      for (let i = 0; i < meta.frames; i++) {
        urls.add(`/assets/monsters/${type}/${meta.folder}/0_Monster_${meta.file}_${String(i).padStart(3, '0')}.png`);
      }
    });
    if (monsterVectorParts[type]?.length) {
      urls.add(`/assets/monsters/${type}/vector/Animations.scml`);
      monsterVectorParts[type].forEach(file => {
        urls.add(`/assets/monsters/${type}/vector/${encodeURIComponent(file)}`);
      });
    }
  });
  return Array.from(urls);
}

function collectStageBackgroundAssetUrls(stageId = 1) {
  const urls = new Set();
  const stages = stageId ? STAGES.filter(stage => stage.id === stageId) : STAGES;
  stages.forEach(stage => {
    if (stage.bgImage) urls.add(stage.bgImage);
    (stage.layers || []).forEach(layer => {
      if (layer.src) urls.add(layer.src);
    });
  });
  return Array.from(urls);
}

function loadImageAsset(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    if (img.complete) resolve(true);
  });
}

function loadAssetUrl(url) {
  if (assetLoadCache.has(url)) return assetLoadCache.get(url);
  const loader = (() => {
    if (url.endsWith('.scml')) {
      return fetch(url)
      .then(async response => {
        if (!response.ok) return false;
        const text = await response.text();
        const match = url.match(/\/assets\/monsters\/([^/]+)\/vector\/Animations\.scml$/);
        if (match && typeof parseMonsterVectorScml === 'function' && typeof monsterVectorData !== 'undefined') {
          monsterVectorData[match[1]] = parseMonsterVectorScml(text);
        }
        return true;
      })
      .catch(() => false);
    }
    if (url.endsWith('.json')) {
      return fetch(url)
        .then(async response => {
          if (!response.ok) return false;
          if (url === `${WARRIOR_VECTOR_OVERLAY_BASE}animations.json`) {
            warriorVectorAnimationsData = await response.json();
          }
          return true;
        })
        .catch(() => false);
    }
    return loadImageAsset(url);
  })();
  assetLoadCache.set(url, loader);
  return loader;
}

async function loadAssetUrls(urls, onProgress = null) {
  const uniqueUrls = Array.from(new Set(urls));
  const total = Math.max(1, uniqueUrls.length);
  let loaded = 0;
  const report = () => onProgress && onProgress(Math.round((loaded / total) * 100), loaded, total);
  report();
  for (const url of uniqueUrls) {
    await loadAssetUrl(url);
    loaded += 1;
    report();
  }
}

function warmStageBackground(stageId = 1) {
  const stage = STAGES.find(item => item.id === stageId) || STAGES[0];
  if (!stage || typeof document === 'undefined' || stageBackgroundWarmupCache.has(stage.id)) return;
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, stage.bg?.[0] || '#0A0608');
  grad.addColorStop(0.45, stage.bg?.[1] || '#1a0a12');
  grad.addColorStop(1, stage.bg?.[2] || '#0A0608');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  stageBackgroundWarmupCache.set(stage.id, canvas);
}

function setClientLoadingProgress(progress, hint = '') {
  const pct = Math.max(0, Math.min(100, Math.round(progress || 0)));
  const fill = document.getElementById('client-loading-progress-fill');
  const text = document.getElementById('client-loading-progress-text');
  const hintEl = document.getElementById('client-loading-hint');
  if (fill) fill.style.width = `${pct}%`;
  if (text) text.textContent = `${pct}%`;
  if (hintEl && hint) hintEl.textContent = hint;
}

async function preloadInitialClientAssets() {
  if (clientBootAssetsReady) return;
  const startedAt = Date.now();
  setClientLoadingProgress(3, 'Preparing fighters...');
  await loadAssetUrls(collectInitialClientAssetUrls(), progress => {
    setClientLoadingProgress(Math.min(92, progress), 'Loading fighter assets...');
  });
  warmStageBackground(1);
  preloadSpriteAssets();
  const elapsed = Date.now() - startedAt;
  if (elapsed < 450) await new Promise(resolve => setTimeout(resolve, 450 - elapsed));
  clientBootAssetsReady = true;
  setClientLoadingProgress(100, 'Ready');
  showScreen('screen-menu');
}

function startLobbyAssetPreload(state = roomState) {
  const stageId = state?.stage || 1;
  const key = `${stageId}:match`;
  if (lobbyAssetPreloadKey === key) return;
  lobbyAssetPreloadKey = key;
  warmStageBackground(stageId);
  const urls = [
    ...collectStageBackgroundAssetUrls(stageId),
    ...collectMatchAssetUrls(),
  ];
  loadAssetUrls(urls)
    .then(() => {
      preloadSpriteAssets();
      if (typeof preloadMonsterAssets === 'function') preloadMonsterAssets();
    })
    .catch(() => {});
}

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
  return ch?.baseStats?.maxMana || ch?.maxMana || 100;
}

function getCharacterMaxHp(ch) {
  return Math.max(MIN_CHARACTER_HP, ch?.baseStats?.maxHp || ch?.maxHp || 100);
}

function getPlayerClassLabel(playerOrScore) {
  const ch = playerOrScore?.charData || CHARACTERS.find(c => c.id === playerOrScore?.character);
  return ch?.class || ch?.name || playerOrScore?.name || 'Fighter';
}

function getPlayerById(playerId) {
  if (!playerId) return null;
  if (myPlayer && myPlayer.id === playerId) return myPlayer;
  return remotePlayers[playerId] || null;
}

function getFocusedPlayer() {
  return getPlayerById(focusedPlayerId) || myPlayer || Object.values(remotePlayers)[0] || null;
}

function focusPlayer(playerId) {
  focusedPlayerId = getPlayerById(playerId) ? playerId : (myPlayer?.id || null);
}

function getManaRegen(ch) {
  return ch?.baseStats?.manaRegen || ch?.manaRegen || 0.24;
}

function getSkillManaCost(skill) {
  if (skill?.basicAttack) return 0;
  if (typeof skill?.manaCost === 'number') return skill.manaCost;
  if (!skill) return 0;
  if (skill.type === 'melee') return 10;
  if (skill.type === 'projectile') return 24;
  if (skill.type === 'dash') return 30;
  if (skill.type === 'aoe') return 42;
  if (skill.type === 'heal') return 38;
  return 25;
}

function getAttackSpeed(player) {
  return Math.max(0.35, player?.stats?.attackSpeed || player?.charData?.baseStats?.attackSpeed || player?.charData?.attackSpeed || 1);
}

function getBasicAttackCooldown(player, skill) {
  const base = skill?.cooldown || 850;
  return Math.max(180, Math.round(base / getAttackSpeed(player)));
}

function getUnitWidth(unit) {
  return unit?.width || unit?.w || 40;
}

function getUnitHeight(unit) {
  return unit?.height || unit?.h || 56;
}

function getUnitFoot(unit) {
  return {
    x: (unit?.x || 0) + getUnitWidth(unit) / 2,
    y: (unit?.y || 0) + getUnitHeight(unit),
  };
}

function getUnitFootRadiusX(unit) {
  return unit?.footRadiusX || Math.max(14, getUnitWidth(unit) * 0.43);
}

function getUnitFootRadiusY(unit) {
  return unit?.footRadiusY || Math.max(9, getUnitHeight(unit) * 0.18);
}

function getDepthDistance(a, b) {
  const af = getUnitFoot(a);
  const bf = getUnitFoot(b);
  const dx = bf.x - af.x;
  const dy = (bf.y - af.y) * DEPTH_DISTANCE_SCALE;
  return Math.sqrt(dx * dx + dy * dy);
}

function isUnitInAttackRange(attacker, target, range, requireFront = true) {
  const af = getUnitFoot(attacker);
  const tf = getUnitFoot(target);
  const dx = tf.x - af.x;
  if (requireFront && (attacker.facing > 0 ? dx < -getUnitFootRadiusX(target) * 0.35 : dx > getUnitFootRadiusX(target) * 0.35)) return false;
  const reach = range + getUnitFootRadiusX(target) * 0.65;
  const depthReach = getUnitFootRadiusY(attacker) + getUnitFootRadiusY(target) + Math.max(18, range * 0.9);
  return Math.abs((tf.y - af.y) * DEPTH_DISTANCE_SCALE) <= depthReach && Math.abs(dx) <= reach;
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
