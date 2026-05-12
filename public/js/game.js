// ============================================================
//  CHARACTERS DATA
// ============================================================
const CHARACTERS = [
  {
    id: 'dragonfist',
    name: 'DRAGONFIST',
    class: 'Brawler',
    icon: '🐉',
    color: '#FF4500',
    speed: 5, jumpPower: 14, maxHp: 120,
    skills: [
      { id: 'punch', name: 'Dragon Punch', icon: '👊', key: 'Z', damage: 25, range: 60, cooldown: 300, type: 'melee', color: '#FF4500' },
      { id: 'flame', name: 'Flame Breath', icon: '🔥', key: 'X', damage: 18, range: 180, cooldown: 2000, type: 'projectile', color: '#FF6600' },
      { id: 'rush', name: 'Dragon Rush', icon: '💨', key: 'C', damage: 30, range: 120, cooldown: 4000, type: 'dash', color: '#FF2200' },
      { id: 'roar', name: 'Ancient Roar', icon: '🌋', key: 'V', damage: 15, range: 100, cooldown: 6000, type: 'aoe', color: '#FF8800' },
    ]
  },
  {
    id: 'shadowblade',
    name: 'SHADOWBLADE',
    class: 'Assassin',
    icon: '🗡️',
    color: '#9B59B6',
    speed: 7, jumpPower: 15, maxHp: 80,
    skills: [
      { id: 'slash', name: 'Shadow Slash', icon: '🌑', key: 'Z', damage: 30, range: 55, cooldown: 200, type: 'melee', color: '#9B59B6' },
      { id: 'blink', name: 'Blink Strike', icon: '⚡', key: 'X', damage: 40, range: 200, cooldown: 3000, type: 'dash', color: '#BDC3F7' },
      { id: 'shadow', name: 'Shadow Clone', icon: '👥', key: 'C', damage: 20, range: 80, cooldown: 5000, type: 'aoe', color: '#6C3483' },
      { id: 'vanish', name: 'Vanish', icon: '🌫️', key: 'V', damage: 50, range: 70, cooldown: 8000, type: 'melee', color: '#7D3C98' },
    ]
  },
  {
    id: 'stoneguard',
    name: 'STONEGUARD',
    class: 'Tank',
    icon: '🛡️',
    color: '#7F8C8D',
    speed: 3, jumpPower: 11, maxHp: 200,
    skills: [
      { id: 'smash', name: 'Stone Smash', icon: '🗿', key: 'Z', damage: 35, range: 65, cooldown: 500, type: 'melee', color: '#95A5A6' },
      { id: 'wall', name: 'Rock Wall', icon: '🧱', key: 'X', damage: 25, range: 80, cooldown: 3500, type: 'aoe', color: '#7F8C8D' },
      { id: 'charge', name: 'Bull Charge', icon: '🐗', key: 'C', damage: 45, range: 200, cooldown: 5000, type: 'dash', color: '#626567' },
      { id: 'fortress', name: 'Fortress Mode', icon: '🏰', key: 'V', damage: 0, range: 0, cooldown: 10000, type: 'buff', color: '#ABB2B9' },
    ]
  },
  {
    id: 'stormarrow',
    name: 'STORMARROW',
    class: 'Ranger',
    icon: '🏹',
    color: '#27AE60',
    speed: 5, jumpPower: 14, maxHp: 90,
    skills: [
      { id: 'arrow', name: 'Storm Arrow', icon: '🪃', key: 'Z', damage: 22, range: 300, cooldown: 400, type: 'projectile', color: '#27AE60' },
      { id: 'volley', name: 'Arrow Volley', icon: '🌧️', key: 'X', damage: 15, range: 250, cooldown: 2500, type: 'projectile', color: '#1E8449' },
      { id: 'vine', name: 'Vine Trap', icon: '🌿', key: 'C', damage: 20, range: 200, cooldown: 4000, type: 'projectile', color: '#196F3D' },
      { id: 'eagle', name: 'Eagle Eye', icon: '🦅', key: 'V', damage: 60, range: 400, cooldown: 7000, type: 'projectile', color: '#52BE80' },
    ]
  },
  {
    id: 'pyromancer',
    name: 'PYROMANCER',
    class: 'Mage',
    icon: '🔮',
    color: '#E74C3C',
    speed: 4, jumpPower: 13, maxHp: 85,
    skills: [
      { id: 'fireball', name: 'Fireball', icon: '🔥', key: 'Z', damage: 28, range: 280, cooldown: 600, type: 'projectile', color: '#E74C3C' },
      { id: 'meteor', name: 'Meteor Strike', icon: '☄️', key: 'X', damage: 55, range: 220, cooldown: 4000, type: 'aoe', color: '#CB4335' },
      { id: 'inferno', name: 'Inferno Ring', icon: '💥', key: 'C', damage: 30, range: 90, cooldown: 5000, type: 'aoe', color: '#F1948A' },
      { id: 'phoenix', name: 'Phoenix Rise', icon: '🦅', key: 'V', damage: 80, range: 120, cooldown: 12000, type: 'aoe', color: '#FF6B6B' },
    ]
  },
  {
    id: 'frostmage',
    name: 'FROSTMAGE',
    class: 'Mage',
    icon: '❄️',
    color: '#3498DB',
    speed: 4, jumpPower: 13, maxHp: 85,
    skills: [
      { id: 'shard', name: 'Ice Shard', icon: '🧊', key: 'Z', damage: 20, range: 260, cooldown: 400, type: 'projectile', color: '#3498DB' },
      { id: 'blizzard', name: 'Blizzard', icon: '🌨️', key: 'X', damage: 40, range: 150, cooldown: 4500, type: 'aoe', color: '#2980B9' },
      { id: 'freeze', name: 'Glacial Freeze', icon: '🏔️', key: 'C', damage: 35, range: 200, cooldown: 5000, type: 'projectile', color: '#85C1E9' },
      { id: 'glacier', name: 'Glacier Crash', icon: '⛰️', key: 'V', damage: 70, range: 120, cooldown: 9000, type: 'aoe', color: '#AED6F1' },
    ]
  },
  {
    id: 'thunderking',
    name: 'THUNDERKING',
    class: 'Warrior',
    icon: '⚡',
    color: '#F1C40F',
    speed: 5, jumpPower: 14, maxHp: 110,
    skills: [
      { id: 'bolt', name: 'Thunder Bolt', icon: '⚡', key: 'Z', damage: 27, range: 240, cooldown: 500, type: 'projectile', color: '#F1C40F' },
      { id: 'storm', name: 'Storm Surge', icon: '🌩️', key: 'X', damage: 38, range: 130, cooldown: 3000, type: 'aoe', color: '#D4AC0D' },
      { id: 'thunder', name: 'Thunder Dash', icon: '💫', key: 'C', damage: 32, range: 160, cooldown: 4000, type: 'dash', color: '#F9E79F' },
      { id: 'zeus', name: 'Zeus Wrath', icon: '🌪️', key: 'V', damage: 90, range: 180, cooldown: 11000, type: 'aoe', color: '#FCF3CF' },
    ]
  },
  {
    id: 'venomfang',
    name: 'VENOMFANG',
    class: 'Rogue',
    icon: '🐍',
    color: '#1ABC9C',
    speed: 6, jumpPower: 14, maxHp: 88,
    skills: [
      { id: 'bite', name: 'Venom Bite', icon: '🐍', key: 'Z', damage: 20, range: 58, cooldown: 300, type: 'melee', color: '#1ABC9C' },
      { id: 'poison', name: 'Poison Cloud', icon: '☁️', key: 'X', damage: 35, range: 100, cooldown: 3000, type: 'aoe', color: '#16A085' },
      { id: 'serpent', name: 'Serpent Strike', icon: '⚡', key: 'C', damage: 42, range: 160, cooldown: 5000, type: 'dash', color: '#1ABC9C' },
      { id: 'gorgon', name: 'Gorgon Gaze', icon: '👁️', key: 'V', damage: 55, range: 220, cooldown: 9000, type: 'projectile', color: '#76D7C4' },
    ]
  },
  {
    id: 'celestial',
    name: 'CELESTIAL',
    class: 'Healer',
    icon: '✨',
    color: '#E8DAEF',
    speed: 5, jumpPower: 13, maxHp: 95,
    skills: [
      { id: 'light', name: 'Holy Light', icon: '☀️', key: 'Z', damage: 20, range: 220, cooldown: 400, type: 'projectile', color: '#F9E79F' },
      { id: 'nova', name: 'Holy Nova', icon: '💫', key: 'X', damage: 35, range: 110, cooldown: 3000, type: 'aoe', color: '#FEF9E7' },
      { id: 'heal', name: 'Divine Heal', icon: '💚', key: 'C', damage: -40, range: 80, cooldown: 5000, type: 'heal', color: '#82E0AA' },
      { id: 'judgment', name: 'Divine Judgment', icon: '⚖️', key: 'V', damage: 85, range: 250, cooldown: 10000, type: 'aoe', color: '#FDFEFE' },
    ]
  },
  {
    id: 'ironclad',
    name: 'IRONCLAD',
    class: 'Heavy',
    icon: '🤖',
    color: '#BDC3C7',
    speed: 3, jumpPower: 10, maxHp: 180,
    skills: [
      { id: 'cannon', name: 'Iron Cannon', icon: '💣', key: 'Z', damage: 40, range: 320, cooldown: 800, type: 'projectile', color: '#7F8C8D' },
      { id: 'slam', name: 'Ground Slam', icon: '💢', key: 'X', damage: 50, range: 120, cooldown: 4000, type: 'aoe', color: '#95A5A6' },
      { id: 'missile', name: 'Rocket Barrage', icon: '🚀', key: 'C', damage: 60, range: 280, cooldown: 6000, type: 'projectile', color: '#AEB6BF' },
      { id: 'overdrive', name: 'Overdrive', icon: '⚙️', key: 'V', damage: 100, range: 100, cooldown: 15000, type: 'aoe', color: '#D0D3D4' },
    ]
  },
];

// ============================================================
//  STAGES DATA
// ============================================================
const STAGES = [
  {
    id: 1, name: "Temple of Ruins",
    bg: ['#1a0a06', '#3d1a0a', '#1a0a06'],
    platforms: [
      { x: 0, y: 520, w: 900, h: 80, color: '#4a2800' },        // ground
      { x: 80, y: 400, w: 160, h: 20, color: '#6b3a10' },
      { x: 320, y: 340, w: 200, h: 20, color: '#6b3a10' },
      { x: 600, y: 400, w: 160, h: 20, color: '#6b3a10' },
      { x: 180, y: 250, w: 140, h: 20, color: '#5a3008' },
      { x: 520, y: 250, w: 140, h: 20, color: '#5a3008' },
      { x: 350, y: 165, w: 140, h: 20, color: '#4a2800' },
    ],
    pillars: [
      { x: 60, y: 300, w: 30, h: 220, color: '#3d2200' },
      { x: 750, y: 300, w: 30, h: 220, color: '#3d2200' },
    ],
    decorColor: '#D4AF37',
  },
  {
    id: 2, name: "Frost Citadel",
    bg: ['#060d1a', '#0d1f3d', '#060d1a'],
    platforms: [
      { x: 0, y: 520, w: 900, h: 80, color: '#0a2040' },
      { x: 50, y: 420, w: 180, h: 18, color: '#1a4a80' },
      { x: 300, y: 370, w: 240, h: 18, color: '#1a4a80' },
      { x: 620, y: 420, w: 180, h: 18, color: '#1a4a80' },
      { x: 160, y: 280, w: 150, h: 18, color: '#0d3060' },
      { x: 540, y: 280, w: 150, h: 18, color: '#0d3060' },
      { x: 360, y: 190, w: 120, h: 18, color: '#0a2050' },
    ],
    pillars: [
      { x: 40, y: 280, w: 25, h: 240, color: '#0d2850' },
      { x: 775, y: 280, w: 25, h: 240, color: '#0d2850' },
    ],
    decorColor: '#85C1E9',
  },
  {
    id: 3, name: "Thunder Peak",
    bg: ['#0a0a1a', '#1a1a3d', '#0a0a1a'],
    platforms: [
      { x: 0, y: 520, w: 900, h: 80, color: '#1a1a40' },
      { x: 40, y: 440, w: 140, h: 18, color: '#2a2a6a' },
      { x: 260, y: 380, w: 160, h: 18, color: '#2a2a6a' },
      { x: 500, y: 310, w: 160, h: 18, color: '#2a2a6a' },
      { x: 680, y: 430, w: 140, h: 18, color: '#2a2a6a' },
      { x: 150, y: 270, w: 120, h: 18, color: '#1a1a50' },
      { x: 620, y: 240, w: 120, h: 18, color: '#1a1a50' },
      { x: 380, y: 170, w: 100, h: 18, color: '#111140' },
    ],
    pillars: [
      { x: 30, y: 260, w: 20, h: 260, color: '#151535' },
      { x: 790, y: 260, w: 20, h: 260, color: '#151535' },
      { x: 410, y: 300, w: 20, h: 220, color: '#151535' },
    ],
    decorColor: '#F1C40F',
  },
];

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
let skillCooldowns = {};
let scores = {};
let isAlive = true;
let respawnTimer = null;

// Input
const keys = {};
let lastInputSent = 0;

// ============================================================
//  CHARACTER GRID (MENU)
// ============================================================
function buildCharGrid() {
  const grid = document.getElementById('char-grid');
  grid.innerHTML = '';
  CHARACTERS.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'char-card' + (ch.id === myCharId ? ' selected' : '');
    card.innerHTML = `<div class="char-icon">${ch.icon}</div><div class="char-name">${ch.name}</div><div class="char-class">${ch.class}</div>`;
    card.onclick = () => {
      myCharId = ch.id;
      document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    };
    grid.appendChild(card);
  });
}
buildCharGrid();

// ============================================================
//  SCREEN MANAGEMENT
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function goToLobbyMenu() {
  const name = document.getElementById('input-name').value.trim();
  if (!name) { document.getElementById('menu-error').textContent = 'กรุณาใส่ชื่อก่อนนะ!'; return; }
  myName = name;
  document.getElementById('menu-error').textContent = '';
  connectWebSocket(() => showScreen('screen-lobby-select'));
}

// ============================================================
//  WEBSOCKET
// ============================================================
function connectWebSocket(onConnect) {
  if (ws && ws.readyState === WebSocket.OPEN) { onConnect && onConnect(); return; }
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${location.host}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => { onConnect && onConnect(); };
  ws.onmessage = (e) => handleMessage(JSON.parse(e.data));
  ws.onerror = () => { showError('เชื่อมต่อ Server ไม่ได้ กรุณาลองใหม่'); };
  ws.onclose = () => {
    if (gameRunning) addChat('System', 'หลุดการเชื่อมต่อ...');
  };
}

function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'connected':
      myPlayerId = msg.playerId;
      break;
    case 'room_created':
      myRoomId = msg.roomId;
      isHost = true;
      roomState = msg.state;
      showLobbyRoom(msg.state);
      break;
    case 'room_joined':
      myRoomId = msg.roomId;
      isHost = false;
      roomState = msg.state;
      showLobbyRoom(msg.state);
      break;
    case 'room_update':
    case 'player_joined':
    case 'player_left':
      roomState = msg.state;
      updateLobbyUI(msg.state);
      break;
    case 'game_start':
      roomState = msg.state;
      startGameClient(msg.state);
      break;
    case 'player_state':
      if (remotePlayers[msg.playerId]) {
        Object.assign(remotePlayers[msg.playerId], { x: msg.x, y: msg.y, vx: msg.vx, vy: msg.vy, facing: msg.facing, state: msg.state, hp: msg.hp });
        if (msg.action) spawnEffect(msg.x, msg.y, msg.action, remotePlayers[msg.playerId].charData?.color || '#fff');
      }
      break;
    case 'player_hit':
      handleHitEffect(msg);
      break;
    case 'player_respawn':
      if (msg.playerId === myPlayerId) {
        isAlive = true;
        myPlayer.hp = msg.hp;
        myPlayer.x = msg.x; myPlayer.y = msg.y;
        document.getElementById('death-overlay').classList.remove('visible');
        clearTimeout(respawnTimer);
      } else if (remotePlayers[msg.playerId]) {
        remotePlayers[msg.playerId].hp = msg.hp;
        remotePlayers[msg.playerId].x = msg.x;
        remotePlayers[msg.playerId].y = msg.y;
      }
      break;
    case 'score_update':
      scores = {};
      msg.scores.forEach(s => { scores[s.id] = s; });
      updateScoreboard();
      updateHUD();
      break;
    case 'skill_cast':
      handleRemoteSkill(msg);
      break;
    case 'chat':
      addChat(msg.from, msg.msg);
      break;
    case 'error':
      showError(msg.msg);
      break;
  }
}

function showError(msg) {
  ['menu-error','lobby-error','room-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  });
}

// ============================================================
//  ROOM MANAGEMENT
// ============================================================
function createRoom() {
  send({ type: 'create_room', name: myName, character: myCharId, stage: 1 });
}

function joinRoom() {
  const code = document.getElementById('input-room-code').value.trim().toUpperCase();
  if (!code || code.length !== 6) { document.getElementById('lobby-error').textContent = 'รหัสต้อง 6 ตัว'; return; }
  send({ type: 'join_room', roomId: code, name: myName, character: myCharId });
}

function showLobbyRoom(state) {
  showScreen('screen-lobby-room');
  document.getElementById('display-room-code').textContent = state.id;

  // stage buttons (host only)
  const stageSection = document.getElementById('stage-section');
  const stageSelect = document.getElementById('stage-select');
  if (isHost) {
    stageSection.style.display = 'block';
    stageSelect.innerHTML = '';
    STAGES.forEach(st => {
      const b = document.createElement('button');
      b.className = 'stage-btn' + (st.id === state.stage ? ' active' : '');
      b.textContent = st.name;
      b.onclick = () => {
        document.querySelectorAll('.stage-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        send({ type: 'change_stage', stage: st.id });
      };
      stageSelect.appendChild(b);
    });
  } else {
    stageSection.style.display = 'none';
  }

  document.getElementById('host-controls').style.display = isHost ? 'block' : 'none';
  document.getElementById('guest-controls').style.display = isHost ? 'none' : 'block';
  updateLobbyUI(state);
}

function updateLobbyUI(state) {
  roomState = state;
  const list = document.getElementById('player-list');
  document.getElementById('lobby-title').textContent = `ห้องรอเกม (${state.players.length}/5)`;
  list.innerHTML = '';
  state.players.forEach(p => {
    const ch = CHARACTERS.find(c => c.id === p.character) || CHARACTERS[0];
    const isMe = p.id === myPlayerId;
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `
      <span class="picon">${ch.icon}</span>
      <div>
        <div class="pname">${p.name}${isMe ? ' (คุณ)' : ''} ${p.id === state.host ? '<span class="phost">HOST</span>' : ''}</div>
        <div class="pchar">${ch.name} · ${ch.class}</div>
      </div>
      <div style="margin-left:auto;text-align:right">
        <div class="pready ${p.ready || p.id === state.host ? 'yes' : 'no'}">${p.ready || p.id === state.host ? '✓ พร้อม' : '○ รอ'}</div>
      </div>
    `;
    list.appendChild(row);
  });

  // Update stage buttons
  if (isHost) {
    document.querySelectorAll('.stage-btn').forEach((b, i) => {
      b.classList.toggle('active', STAGES[i]?.id === state.stage);
    });
  } else {
    const stageName = STAGES.find(s => s.id === state.stage)?.name || '';
    document.getElementById('lobby-info').textContent = stageName ? `ด่าน: ${stageName}` : '';
  }

  const allReady = state.players.filter(p => p.id !== state.host).every(p => p.ready);
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.disabled = state.players.length < 1;
    startBtn.style.opacity = allReady ? '1' : '0.6';
  }
}

function toggleReady() {
  isReady = !isReady;
  send({ type: 'set_ready', ready: isReady });
  document.getElementById('ready-btn').textContent = isReady ? '✓ พร้อมแล้ว!' : '○ ยังไม่พร้อม';
  document.getElementById('ready-btn').style.color = isReady ? '#4CAF50' : '';
  document.getElementById('ready-btn').style.borderColor = isReady ? '#4CAF50' : '';
}

function startGame() { send({ type: 'start_game' }); }

// ============================================================
//  GAME INIT
// ============================================================
function startGameClient(state) {
  showScreen('');
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  gameRunning = true;

  currentStage = STAGES.find(s => s.id === state.stage) || STAGES[0];

  const canvas = document.getElementById('game-canvas');
  canvas.classList.add('visible');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Build players
  remotePlayers = {};
  myPlayer = null;

  state.players.forEach(p => {
    const ch = CHARACTERS.find(c => c.id === p.character) || CHARACTERS[0];
    const pd = {
      id: p.id, name: p.name, character: p.character, charData: ch,
      x: p.x, y: p.y, hp: p.hp, maxHp: ch.maxHp,
      vx: 0, vy: 0, onGround: false, facing: 1,
      state: 'idle', score: 0, deaths: 0,
      width: 36, height: 54,
    };
    if (p.id === myPlayerId) {
      myPlayer = pd;
      isAlive = true;
    } else {
      remotePlayers[p.id] = pd;
    }
  });

  // Init skills cooldown
  if (myPlayer) {
    const ch = myPlayer.charData;
    ch.skills.forEach(sk => { skillCooldowns[sk.id] = 0; });
  }

  buildHUD(state);
  buildSkillsBar();
  document.getElementById('hud').classList.add('visible');
  document.getElementById('skills-bar').classList.add('visible');
  document.getElementById('chat-container').classList.add('visible');
  document.getElementById('controls-hint').classList.add('visible');

  projectiles = []; effects = [];
  scores = {};
  state.players.forEach(p => { scores[p.id] = { id: p.id, name: p.name, score: 0, deaths: 0 }; });

  gameLoop();
}

// ============================================================
//  HUD
// ============================================================
function buildHUD(state) {
  const container = document.getElementById('hud-players');
  container.innerHTML = '';
  state.players.forEach(p => {
    const ch = CHARACTERS.find(c => c.id === p.character) || CHARACTERS[0];
    const div = document.createElement('div');
    div.className = 'player-hud-card' + (p.id === myPlayerId ? ' is-me' : '');
    div.id = `hud-${p.id}`;
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:16px">${ch.icon}</span>
        <div>
          <div class="phud-name">${p.name}</div>
          <div class="phud-char">${ch.class}</div>
        </div>
        <div class="phud-score" style="margin-left:auto" id="score-${p.id}">0</div>
      </div>
      <div class="hp-bar"><div class="hp-fill high" id="hp-${p.id}" style="width:100%"></div></div>
    `;
    container.appendChild(div);
  });
}

function updateHUD() {
  const allPlayers = myPlayer ? [myPlayer, ...Object.values(remotePlayers)] : Object.values(remotePlayers);
  allPlayers.forEach(p => {
    const hpEl = document.getElementById(`hp-${p.id}`);
    const scoreEl = document.getElementById(`score-${p.id}`);
    if (hpEl) {
      const pct = Math.max(0, (p.hp / p.maxHp) * 100);
      hpEl.style.width = pct + '%';
      hpEl.className = 'hp-fill ' + (pct > 60 ? 'high' : pct > 30 ? 'med' : '');
    }
    if (scoreEl && scores[p.id]) scoreEl.textContent = scores[p.id].score;
  });
}

function buildSkillsBar() {
  const bar = document.getElementById('skills-bar');
  bar.innerHTML = '';
  if (!myPlayer) return;
  const ch = myPlayer.charData;
  ch.skills.forEach(sk => {
    const slot = document.createElement('div');
    slot.className = 'skill-slot';
    slot.id = `skill-${sk.id}`;
    slot.innerHTML = `<span class="sicon">${sk.icon}</span><span class="skey">${sk.key}</span><div class="scd" id="scd-${sk.id}">0</div>`;
    bar.appendChild(slot);
  });
}

function updateSkillsBar() {
  if (!myPlayer) return;
  const now = Date.now();
  myPlayer.charData.skills.forEach(sk => {
    const slot = document.getElementById(`skill-${sk.id}`);
    const cdEl = document.getElementById(`scd-${sk.id}`);
    if (!slot || !cdEl) return;
    const remaining = skillCooldowns[sk.id] - now;
    if (remaining > 0) {
      slot.classList.add('on-cd');
      cdEl.textContent = Math.ceil(remaining / 1000);
    } else {
      slot.classList.remove('on-cd');
    }
  });
}

// ============================================================
//  SCOREBOARD
// ============================================================
function updateScoreboard() {
  const list = document.getElementById('score-list');
  const sorted = Object.values(scores).sort((a, b) => b.score - a.score);
  list.innerHTML = '';
  sorted.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'score-row';
    row.innerHTML = `<span class="rank">#${i+1}</span><span class="sname">${s.name}${s.id === myPlayerId ? ' ★' : ''}</span><span class="sdead">💀 ${s.deaths || 0}</span><span class="spts">${s.score} pts</span>`;
    list.appendChild(row);
  });
}

// ============================================================
//  CHAT
// ============================================================
function addChat(from, text) {
  const log = document.getElementById('chat-log');
  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.innerHTML = `<div class="from">${from}</div><div>${text}</div>`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  if (log.children.length > 30) log.removeChild(log.firstChild);
}

function sendChat() {
  const inp = document.getElementById('chat-input');
  if (!inp.value.trim()) return;
  send({ type: 'chat', msg: inp.value.trim() });
  inp.value = '';
}

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
  if (!isAlive && p === myPlayer) return;

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

  if (keys['ArrowLeft'] || keys['a'] || keys['A']) { myPlayer.vx -= spd * 0.4; myPlayer.facing = -1; }
  if (keys['ArrowRight'] || keys['d'] || keys['D']) { myPlayer.vx += spd * 0.4; myPlayer.facing = 1; }
  if ((keys['ArrowUp'] || keys['w'] || keys['W'] || keys[' ']) && myPlayer.onGround) {
    myPlayer.vy = -ch.jumpPower;
    myPlayer.onGround = false;
  }

  // Clamp speed
  myPlayer.vx = Math.max(-spd, Math.min(spd, myPlayer.vx));

  // State
  if (!myPlayer.onGround) myPlayer.state = myPlayer.vy < 0 ? 'jump' : 'fall';
  else if (Math.abs(myPlayer.vx) > 0.5) myPlayer.state = 'run';
  else myPlayer.state = 'idle';
}

function trySkill(skillIndex) {
  if (!myPlayer || !isAlive) return;
  const ch = myPlayer.charData;
  const skill = ch.skills[skillIndex];
  if (!skill) return;
  const now = Date.now();
  if (skillCooldowns[skill.id] > now) return;

  skillCooldowns[skill.id] = now + skill.cooldown;

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

// ============================================================
//  COMBAT
// ============================================================
function doMeleeHit(attacker, skill) {
  const all = attacker === myPlayer ? Object.values(remotePlayers) : (myPlayer ? [myPlayer] : []);
  all.forEach(target => {
    const dx = (target.x + target.width/2) - (attacker.x + attacker.width/2);
    const dy = (target.y + target.height/2) - (attacker.y + attacker.height/2);
    const dist = Math.sqrt(dx*dx + dy*dy);
    const inFront = (attacker.facing > 0 ? dx > 0 : dx < 0);
    if (dist < skill.range && inFront) {
      dealDamage(target, skill.damage, skill.id);
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
      dealDamage(target, skill.damage, skill.id);
    }
  });
}

function spawnEffect(x, y, id, color, radius = 40) {
  effects.push({ x, y, color: color || '#fff', radius, maxRadius: radius, life: 30, maxLife: 30, id });
}

function dealDamage(target, damage, skillId) {
  if (!isAlive && target === myPlayer) return;
  send({ type: 'player_hit', targetId: target.id || (target === myPlayer ? myPlayerId : null), damage, skillId });
  spawnEffect(target.x + target.width/2, target.y + target.height/2, skillId, '#FF4444', 30);

  if (target === myPlayer) {
    myPlayer.hp = Math.max(0, myPlayer.hp - damage);
    if (myPlayer.hp <= 0) onMyDeath();
  } else {
    target.hp = Math.max(0, target.hp - damage);
  }
}

function handleHitEffect(msg) {
  const target = msg.targetId === myPlayerId ? myPlayer : remotePlayers[msg.targetId];
  if (target) {
    target.hp = msg.hp;
    spawnEffect(target.x + target.width/2, target.y + target.height/2, msg.skillId, '#FF4444', 35);
    if (msg.hp <= 0 && msg.targetId !== myPlayerId) {
      // remote death flash
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

function onMyDeath() {
  isAlive = false;
  const overlay = document.getElementById('death-overlay');
  overlay.classList.add('visible');
  let count = 3;
  document.getElementById('respawn-countdown').textContent = `กำลังกลับมา... ${count}`;
  respawnTimer = setInterval(() => {
    count--;
    document.getElementById('respawn-countdown').textContent = count > 0 ? `กำลังกลับมา... ${count}` : 'กำลังฟื้นคืนชีพ...';
    if (count <= 0) clearInterval(respawnTimer);
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
          dealDamage(target, p.damage, p.skillId);
          spawnEffect(p.x, p.y, p.skillId, p.color, 30);
          p.life = 0;
        }
      });
    }

    return p.life > 0;
  });

  effects = effects.filter(e => { e.life--; return e.life > 0; });
}

// ============================================================
//  CAMERA
// ============================================================
function updateCamera(canvas) {
  if (!myPlayer) return;
  const targetX = myPlayer.x + myPlayer.width/2 - canvas.width/2;
  const targetY = myPlayer.y + myPlayer.height/2 - canvas.height/2;
  const maxX = Math.max(0, WORLD_W - canvas.width / (canvas.width / WORLD_W));
  CAM.x += (targetX - CAM.x) * 0.12;
  CAM.y += (targetY - CAM.y) * 0.12;
  CAM.x = Math.max(0, Math.min(CAM.x, 0)); // for now, horizontal camera static
  CAM.y = Math.max(-80, Math.min(CAM.y, 0));
}

// ============================================================
//  RENDER
// ============================================================
function render(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const scaleX = W / WORLD_W;
  const scaleY = H / WORLD_H;

  ctx.clearRect(0, 0, W, H);

  // Background gradient
  const stage = currentStage;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, stage.bg[0]);
  grad.addColorStop(0.5, stage.bg[1]);
  grad.addColorStop(1, stage.bg[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Background stars
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 137 + 50) % WORLD_W) * scaleX;
    const sy = ((i * 97 + 30) % 400) * scaleY;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }

  // Pillars
  stage.pillars.forEach(pl => {
    const px = pl.x * scaleX, py = pl.y * scaleY;
    const pw = pl.w * scaleX, ph = pl.h * scaleY;
    ctx.fillStyle = pl.color;
    ctx.fillRect(px, py, pw, ph);
    // decor lines
    ctx.fillStyle = stage.decorColor + '33';
    ctx.fillRect(px + 2, py, 3 * scaleX, ph);
    ctx.fillRect(px + pw - 5 * scaleX, py, 3 * scaleX, ph);
  });

  // Platforms
  stage.platforms.forEach(plat => {
    const px = plat.x * scaleX, py = plat.y * scaleY;
    const pw = plat.w * scaleX, ph = plat.h * scaleY;
    ctx.fillStyle = plat.color;
    ctx.fillRect(px, py, pw, ph);
    // Top edge highlight
    ctx.fillStyle = stage.decorColor + '55';
    ctx.fillRect(px, py, pw, 3);
    // Stone texture lines
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let xi = 0; xi < pw; xi += 30 * scaleX) {
      ctx.fillRect(px + xi, py + 3, 1, ph - 3);
    }
  });

  // Projectiles
  projectiles.forEach(p => {
    const px = p.x * scaleX, py = p.y * scaleY;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(px, py, p.radius * Math.min(scaleX, scaleY), 0, Math.PI * 2);
    ctx.fill();
    // Trail
    ctx.fillStyle = p.color + '44';
    ctx.beginPath();
    ctx.arc(px - p.vx * scaleX * 2, py - p.vy * scaleY * 2, p.radius * Math.min(scaleX, scaleY) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Effects
  effects.forEach(e => {
    const alpha = e.life / e.maxLife;
    const r = e.radius * (1 - alpha * 0.5) * Math.min(scaleX, scaleY);
    const ex = e.x * scaleX, ey = e.y * scaleY;
    ctx.strokeStyle = e.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.stroke();
    if (r > 15) {
      ctx.beginPath();
      ctx.arc(ex, ey, r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // Remote players
  Object.values(remotePlayers).forEach(p => drawPlayer(ctx, p, scaleX, scaleY, false));
  // My player
  if (myPlayer && isAlive) drawPlayer(ctx, myPlayer, scaleX, scaleY, true);
}

function drawPlayer(ctx, p, sx, sy, isMe) {
  const x = p.x * sx, y = p.y * sy;
  const w = p.width * sx, h = p.height * sy;
  const ch = p.charData;
  const color = ch?.color || '#D4AF37';

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.ellipse(x + w/2, y + h + 2, w * 0.45, 5 * sy, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.save();
  ctx.translate(x + w/2, y + h/2);
  if (p.facing < 0) ctx.scale(-1, 1);

  // Legs
  const legOff = (p.state === 'run' ? Math.sin(Date.now() * 0.015) * 5 * sy : 0);
  ctx.fillStyle = color + 'CC';
  ctx.fillRect(-w*0.18, h*0.2, w*0.16, h*0.38 + legOff);
  ctx.fillRect(w*0.02, h*0.2, w*0.16, h*0.38 - legOff);

  // Torso
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-w*0.32, -h*0.25, w*0.64, h*0.48, 3);
  ctx.fill();

  // Shoulder pads
  ctx.fillStyle = color + 'EE';
  ctx.fillRect(-w*0.42, -h*0.22, w*0.14, h*0.22);
  ctx.fillRect(w*0.28, -h*0.22, w*0.14, h*0.22);

  // Head
  ctx.fillStyle = color + 'DD';
  ctx.beginPath();
  ctx.arc(0, -h*0.38, w*0.26, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#FFF';
  ctx.fillRect(w*0.04, -h*0.44, w*0.1, h*0.08);
  ctx.fillStyle = '#000';
  ctx.fillRect(w*0.06, -h*0.43, w*0.06, h*0.06);

  // Emoji icon on chest
  ctx.restore();
  ctx.font = `${w * 0.55}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch?.icon || '?', x + w/2, y + h/2 - h*0.05);

  // Name tag
  ctx.font = `bold ${Math.max(9, 11 * Math.min(sx,sy))}px Cinzel, serif`;
  ctx.fillStyle = isMe ? '#F5E182' : '#E8D5B0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(p.name, x + w/2, y - 4);

  // HP bar (above name)
  const bw = w * 1.2, bh = 4 * sy;
  const bx = x + w/2 - bw/2, by = y - 18 * sy;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx, by, bw, bh);
  const hpPct = Math.max(0, p.hp / (p.maxHp || 100));
  ctx.fillStyle = hpPct > 0.6 ? '#4CAF50' : hpPct > 0.3 ? '#FFA500' : '#FF4444';
  ctx.fillRect(bx, by, bw * hpPct, bh);

  // "ME" indicator
  if (isMe) {
    ctx.fillStyle = '#F5E182';
    ctx.font = `${8 * Math.min(sx,sy)}px Cinzel, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('▲', x + w/2, by - 2);
  }
}

// ============================================================
//  GAME LOOP
// ============================================================
let lastFrame = 0;
function gameLoop(ts = 0) {
  if (!gameRunning) return;
  const dt = ts - lastFrame;
  lastFrame = ts;

  const canvas = document.getElementById('game-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  handleInput();
  if (myPlayer) updatePlayer(myPlayer, dt);
  Object.values(remotePlayers).forEach(p => updatePlayer(p, dt));
  updateProjectiles();
  updateCamera(canvas);
  render(canvas);
  updateHUD();
  updateSkillsBar();
  sendInput();

  requestAnimationFrame(gameLoop);
}

// ============================================================
//  INPUT HANDLING
// ============================================================
document.addEventListener('keydown', (e) => {
  keys[e.key] = true;

  // Skills
  if (gameRunning && document.activeElement !== document.getElementById('chat-input')) {
    if (e.key === 'z' || e.key === 'Z') trySkill(0);
    if (e.key === 'x' || e.key === 'X') trySkill(1);
    if (e.key === 'c' || e.key === 'C') trySkill(2);
    if (e.key === 'v' || e.key === 'V') trySkill(3);
  }

  // Scoreboard
  if (e.key === 'Tab') {
    e.preventDefault();
    document.getElementById('scoreboard').classList.toggle('visible');
  }

  // Chat
  if (e.key === 'Enter') {
    const chatInp = document.getElementById('chat-input');
    if (document.activeElement === chatInp) {
      sendChat();
      chatInp.blur();
    } else if (gameRunning) {
      chatInp.focus();
    }
  }
});

document.addEventListener('keyup', (e) => { keys[e.key] = false; });

// Mobile touch controls (basic)
let touchStartX = null, touchStartY = null;
document.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!gameRunning) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < 10 && Math.abs(dy) < -40) {
    // swipe up = jump
    if (myPlayer && myPlayer.onGround) { myPlayer.vy = -myPlayer.charData.jumpPower; }
  }
}, { passive: true });

// Window resize
window.addEventListener('resize', () => {
  const canvas = document.getElementById('game-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});