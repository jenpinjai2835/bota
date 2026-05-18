// Frame loop
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
  updateCamera(canvas);
  render(canvas);
  updateHUD();
  updateSkillsBar();
  sendInput();

  requestAnimationFrame(gameLoop);
}
