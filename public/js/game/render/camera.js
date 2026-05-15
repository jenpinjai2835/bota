// Camera tracking
//  CAMERA
// ============================================================
function updateCamera(canvas) {
  if (!myPlayer) return;
  const viewW = getViewportWorldWidth();
  const targetX = myPlayer.x + myPlayer.width / 2 - viewW / 2;
  const targetY = 0;
  const maxX = Math.max(0, WORLD_W - viewW);
  CAM.x += (targetX - CAM.x) * 0.12;
  CAM.y += (targetY - CAM.y) * 0.12;
  CAM.x = Math.max(0, Math.min(CAM.x, maxX));
  CAM.y = 0;
}

// ============================================================
