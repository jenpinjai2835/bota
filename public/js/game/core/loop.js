// Frame loop
// ============================================================
//  GAME LOOP
// ============================================================
let lastFrame = 0;
const TOWER_BREAK_CINEMATIC_MS = 950;
const GAME_END_CINEMATIC_MS = 1700;

function isCinematicPauseActive() {
  return !!cinematicPause?.active;
}

function beginCinematicPause(mode = 'tower-break', winnerTeamId = null) {
  const now = Date.now();
  const duration = winnerTeamId ? GAME_END_CINEMATIC_MS : TOWER_BREAK_CINEMATIC_MS;
  cinematicPause.active = true;
  cinematicPause.mode = mode;
  cinematicPause.until = Math.max(cinematicPause.until || 0, now + duration);
  cinematicPause.frame = 0;
  if (winnerTeamId) cinematicPause.pendingWinner = winnerTeamId;
}

function finishCinematicPause() {
  const pendingWorldState = cinematicPause.pendingWorldState;
  const pendingWinner = cinematicPause.pendingWinner;
  cinematicPause.active = false;
  cinematicPause.mode = null;
  cinematicPause.until = 0;
  cinematicPause.frame = 0;
  cinematicPause.pendingWorldState = null;
  cinematicPause.pendingWinner = null;

  if (pendingWorldState) applyWorldState(pendingWorldState);
  if (pendingWinner) {
    gameRunning = false;
    isAlive = false;
    if (respawnTimer) {
      clearInterval(respawnTimer);
      respawnTimer = null;
    }
    document.getElementById('controls-hint')?.classList.remove('visible');
    document.getElementById('death-overlay')?.classList.remove('visible');
    document.getElementById('scoreboard')?.classList.remove('visible');
    showGameSummary(pendingWinner);
  }
}

function gameLoop(ts = 0) {
  if (!gameRunning && !isCinematicPauseActive()) return;
  const dt = ts - lastFrame;
  lastFrame = ts;
  const cinematic = isCinematicPauseActive();

  const canvas = document.getElementById('game-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  if (!cinematic) {
    rememberMyPlayerBodyPosition();
    if (typeof applyTestModeRuntime === 'function') applyTestModeRuntime();
    handleInput();
    if (myPlayer) updatePlayer(myPlayer, dt);
    if (typeof applyTestModeRuntime === 'function') applyTestModeRuntime();
    Object.values(remotePlayers).forEach(p => updatePlayer(p, dt));
    resolvePlayerBodyCollisions();
    resolvePlayerWorldBodyCollisions();
    updateMatchItems();
    updateProjectiles();
    updateTowerShots();
  } else {
    cinematicPause.frame++;
    if (cinematicPause.frame % 2 === 0) updateProjectiles();
  }
  updateCamera(canvas);
  render(canvas);
  if (!cinematic) {
    updateHUD();
    updateSkillsBar();
    sendInput();
  }

  if (cinematic && Date.now() >= cinematicPause.until) {
    finishCinematicPause();
  }

  if (gameRunning || isCinematicPauseActive()) requestAnimationFrame(gameLoop);
}
