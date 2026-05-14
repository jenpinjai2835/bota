// Game start and local player setup
// ============================================================
//  GAME INIT
// ============================================================
function leaveGame() {
  gameRunning = false;
  isAlive = true;
  isHost = false;
  isReady = false;
  roomState = null;
  myRoomId = null;
  remotePlayers = {};
  myPlayer = null;
  projectiles = [];
  effects = [];
  damageNumbers = [];
  scores = {};
  skillCooldowns = {};
  localActionState = { action: null, actionStartedAt: 0, actionUntil: 0 };
  Object.keys(keys).forEach(key => { delete keys[key]; });

  if (respawnTimer) {
    clearInterval(respawnTimer);
    respawnTimer = null;
  }

  ['hud', 'skills-bar', 'chat-container', 'controls-hint', 'scoreboard', 'death-overlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('visible');
  });

  const canvas = document.getElementById('game-canvas');
  canvas.classList.remove('visible');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  document.getElementById('chat-log').innerHTML = '';
  document.getElementById('score-list').innerHTML = '';
  document.getElementById('hud-players').innerHTML = '';
  document.getElementById('skills-bar').innerHTML = '';

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  ws = null;
  myPlayerId = null;

  showScreen('screen-menu');
}

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
      mana: getMaxMana(ch), maxMana: getMaxMana(ch),
      vx: 0, vy: 0, onGround: false, facing: 1,
      state: 'idle', score: 0, deaths: 0,
      action: null, actionStartedAt: 0, actionUntil: 0,
      width: 44, height: 66,
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

  projectiles = []; effects = []; damageNumbers = [];
  scores = {};
  state.players.forEach(p => { scores[p.id] = { id: p.id, name: p.name, score: 0, deaths: 0 }; });

  gameLoop();
}
