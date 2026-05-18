// Game start and local player setup
// ============================================================
//  GAME INIT
// ============================================================
function leaveGame() {
  if (typeof stopReconnectFlow === 'function') stopReconnectFlow();
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
  deathParts = [];
  matchItems = [];
  creeps = [];
  creepProjectiles = [];
  objectives = [];
  towerShots = [];
  gameWinner = null;
  nextMatchItemSpawnAt = 0;
  scores = {};
  skillCooldowns = {};
  focusedPlayerId = null;
  lastKillAnnouncementKey = null;
  lastKillAnnouncementAt = 0;
  combatStatsExpanded = false;
  combatStatsRenderSignature = '';
  assetLoadingStartedForRoomId = null;
  if (chatAutoHideTimer) {
    clearTimeout(chatAutoHideTimer);
    chatAutoHideTimer = null;
  }
  mutedChatPlayerIds.clear();
  recentCreepDeathBursts.clear();
  localActionState = { action: null, actionStartedAt: 0, actionUntil: 0 };
  if (typeof clearInputState === 'function') clearInputState();
  else Object.keys(keys).forEach(key => { delete keys[key]; });

  if (respawnTimer) {
    clearInterval(respawnTimer);
    respawnTimer = null;
  }

  ['hud', 'skills-bar', 'chat-container', 'controls-hint', 'scoreboard', 'death-overlay', 'game-summary', 'screen-loading', 'reconnect-overlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('visible');
  });
  document.getElementById('chat-container')?.classList.remove('chat-open', 'chat-peek');
  document.getElementById('kill-banner')?.classList.remove('visible');

  const canvas = document.getElementById('game-canvas');
  canvas.classList.remove('visible');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  document.getElementById('chat-log').innerHTML = '';
  document.getElementById('score-list').innerHTML = '';
  document.getElementById('hud-players').innerHTML = '';
  document.getElementById('skills-bar').innerHTML = '';
  document.getElementById('combat-stats-panel').innerHTML = '';

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  ws = null;
  myPlayerId = null;
  localStorage.removeItem('bota_last_room_id');

  showScreen('screen-menu');
}

function startGameClient(state) {
  if (typeof clearInputState === 'function') clearInputState();
  showScreen('');
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  gameRunning = true;
  hideGameSummary();

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
    const maxHp = Math.max(p.maxHp || 0, getCharacterMaxHp(ch));
    const pd = {
      id: p.id, name: p.name, character: p.character, charData: ch,
      teamId: p.teamId || assignTeamId(0),
      x: p.x, y: p.y, hp: p.hp >= (p.maxHp || maxHp) ? maxHp : Math.min(maxHp, p.hp || maxHp), maxHp,
      mana: getMaxMana(ch), maxMana: getMaxMana(ch),
      vx: 0, vy: 0, onGround: true, facing: p.teamId === 'moon' ? -1 : 1,
      state: 'idle', score: 0, deaths: 0,
      action: null, actionStartedAt: 0, actionUntil: 0,
      bodyShattered: false,
      width: 44, height: 66,
      isAI: !!p.isAI,
      connected: p.connected !== false,
    };
    ensurePlayerSystems(pd);
    if (p.id === myPlayerId) {
      myPlayer = pd;
      isAlive = true;
    } else {
      remotePlayers[p.id] = pd;
    }
  });
  CAM.x = Math.max(0, Math.min(WORLD_W - getViewportWorldWidth(), (myPlayer?.x || 0) + (myPlayer?.width || 0) / 2 - getViewportWorldWidth() / 2));
  CAM.y = 0;

  // Init skills cooldown
  if (myPlayer) {
    const ch = myPlayer.charData;
    ch.skills.forEach(sk => { skillCooldowns[sk.id] = 0; });
  }

  buildHUD(state);
  buildSkillsBar();
  focusPlayer(myPlayer?.id || null);
  if (typeof syncTestModeToServer === 'function') syncTestModeToServer();
  if (typeof applyTestModeRuntime === 'function') applyTestModeRuntime();
  document.getElementById('hud').classList.add('visible');
  document.getElementById('skills-bar').classList.add('visible');
  document.getElementById('controls-hint').classList.add('visible');

  projectiles = []; effects = []; damageNumbers = []; deathParts = []; bloodParticles = []; towerShots = []; creepProjectiles = [];
  recentCreepDeathBursts.clear();
  creeps = state.creeps || [];
  creepProjectiles = state.creepProjectiles || [];
  objectives = state.objectives || [];
  gameWinner = state.winner || null;
  resetMatchItems(state.matchItems || []);
  scores = {};
  state.players.forEach(p => {
    scores[p.id] = {
      id: p.id,
      name: p.name,
      character: p.character,
      teamId: p.teamId || assignTeamId(0),
      kills: p.kills || 0,
      deaths: p.deaths || 0,
      assists: p.assists || 0,
      score: p.score || 0,
    };
  });
  updateCombatStatsPanel();

  gameLoop();
}
