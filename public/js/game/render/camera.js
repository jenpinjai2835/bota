// Camera tracking
//  CAMERA
// ============================================================
function updateCamera(canvas) {
  if (!myPlayer) return;
  const cinematic = typeof isCinematicPauseActive === 'function' && isCinematicPauseActive();
  const targetZoom = cinematic && (cinematicPause.mode === 'ancient-break' || cinematicPause.mode === 'game-end') ? 1.34 : 1;
  CAM.zoom = (CAM.zoom || 1) + (targetZoom - (CAM.zoom || 1)) * 0.08;
  const viewW = getViewportWorldWidth();
  const focusX = cinematic && Number.isFinite(cinematicPause.focusX)
    ? cinematicPause.focusX
    : myPlayer.x + myPlayer.width / 2;
  const targetX = focusX - viewW / 2;
  const targetY = 0;
  const maxX = Math.max(0, WORLD_W - viewW);
  CAM.x += (targetX - CAM.x) * (cinematic ? 0.045 : 0.12);
  CAM.y += (targetY - CAM.y) * 0.12;
  CAM.x = Math.max(0, Math.min(CAM.x, maxX));
  CAM.y = 0;
}

// ============================================================
