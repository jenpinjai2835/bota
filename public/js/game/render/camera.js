// Camera tracking
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
