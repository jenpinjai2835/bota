// Main render pass
function render(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const scaleX = W / getViewportWorldWidth();
  const scaleY = H / WORLD_H;
  const stage = currentStage;

  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, stage, W, H, W / getViewportWorldWidth(), scaleY);
  ctx.save();
  const zoom = CAM.zoom || 1;
  if (zoom !== 1) {
    ctx.translate(W / 2, H * 0.5);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H * 0.5);
  }
  ctx.translate(-CAM.x * scaleX, -CAM.y * scaleY);
  drawBattlefieldFloor(ctx, stage, scaleX, scaleY);
  stage.pillars.forEach(pl => drawPillar(ctx, pl, stage, scaleX, scaleY));
  (stage.fountains || []).forEach(fountain => drawFountain(ctx, fountain, stage, scaleX, scaleY));
  stage.platforms.forEach(plat => drawPlatform(ctx, plat, stage, scaleX, scaleY));
  matchItems.forEach(item => drawMatchItem(ctx, item, scaleX, scaleY));
  projectiles.forEach(p => drawProjectile(ctx, p, scaleX, scaleY));
  creepProjectiles.forEach(shot => drawCreepProjectile(ctx, shot, scaleX, scaleY));
  effects.filter(e => e.id !== 'level-up' && e.id !== 'tower-warp').forEach(e => drawEffect(ctx, e, scaleX, scaleY));
  const depthEntities = [
    ...deathParts.map(part => ({ kind: 'deathPart', entity: part, depth: part.groundY ?? part.y })),
    ...objectives.map(obj => ({ kind: 'objective', entity: obj, depth: getUnitFoot(obj).y })),
    ...creeps.map(creep => ({ kind: 'creep', entity: creep, depth: getUnitFoot(creep).y })),
    ...Object.values(remotePlayers).map(player => ({ kind: 'player', entity: player, depth: getUnitFoot(player).y })),
  ];
  if (myPlayer) depthEntities.push({ kind: 'player', entity: myPlayer, depth: getUnitFoot(myPlayer).y, isMe: true });
  depthEntities
    .filter(item => item.kind !== 'deathPart')
    .forEach(item => drawUnitFootprint(ctx, item.entity, scaleX, scaleY));
  depthEntities
    .sort((a, b) => a.depth - b.depth)
    .forEach(item => {
      if (item.kind === 'objective') drawObjective(ctx, item.entity, scaleX, scaleY);
      if (item.kind === 'creep') drawCreep(ctx, item.entity, scaleX, scaleY);
      if (item.kind === 'player') drawPlayer(ctx, item.entity, scaleX, scaleY, !!item.isMe);
      if (item.kind === 'deathPart') drawDeathPart(ctx, item.entity, scaleX, scaleY);
    });
  effects.filter(e => e.id === 'level-up').forEach(e => drawEffect(ctx, e, scaleX, scaleY));
  bloodParticles.forEach(b => drawBloodParticle(ctx, b, scaleX, scaleY));
  damageNumbers.forEach(n => drawDamageNumber(ctx, n, scaleX, scaleY));
  towerShots.forEach(shot => drawTowerShot(ctx, shot, scaleX, scaleY));
  effects.filter(e => e.id === 'tower-warp').forEach(e => drawEffect(ctx, e, scaleX, scaleY));
  drawDebugBlockPolygons(ctx, scaleX, scaleY);
  ctx.restore();

  const vignette = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.18, W / 2, H * 0.5, W * 0.7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

function drawDebugCreepPaths(ctx, scaleX, scaleY) {
  const liveCreeps = creeps.filter(creep => creep && creep.hp > 0);
  ctx.save();
  const scale = Math.min(scaleX, scaleY);
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineWidth = Math.max(1.2, 1.8 * scale);
  ctx.font = `${Math.max(10, 12 * Math.min(scaleX, scaleY))}px Arial`;
  ctx.textAlign = 'center';
  liveCreeps.forEach(creep => {
    const w = Number(creep.w || creep.width || 42);
    const h = Number(creep.h || creep.height || 42);
    const footX = (Number(creep.renderX ?? creep.x) || 0) + w / 2;
    const footY = (Number(creep.renderY ?? creep.y) || 0) + h;
    const sx0 = footX * scaleX;
    const sy0 = footY * scaleY;
    const gx = Number(creep.debugGoalX);
    const gy = Number(creep.debugGoalY);
    const nav = creep.debugNav || null;
    const debugPath = Array.isArray(creep.debugPath) ? creep.debugPath : [];

    if (debugPath.length) {
      const pathPoints = debugPath
        .map(point => ({ x: Number(point.x), y: Number(point.y) }))
        .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
      if (pathPoints.length) {
        drawDebugPath(ctx, sx0, sy0, pathPoints, scaleX, scaleY, 'rgba(255, 232, 92, 0.95)', scale);
      }
    }

    if (Number.isFinite(gx) && Number.isFinite(gy)) {
      let sx1 = gx * scaleX;
      let sy1 = gy * scaleY;
      const dGoal = Math.hypot(sx1 - sx0, sy1 - sy0);
      if (dGoal < Math.max(16, 22 * Math.min(scaleX, scaleY))) {
        const f = creep.facing || 1;
        sx1 = sx0 + f * Math.max(24, 36 * Math.min(scaleX, scaleY));
        sy1 = sy0 - Math.max(6, 8 * Math.min(scaleX, scaleY));
      }
      drawDebugLine(ctx, sx0, sy0, sx1, sy1, 'rgba(0,255,255,1)', scale);
    }

    const fgx = Number(creep.debugFarGoalX);
    const fgy = Number(creep.debugFarGoalY);
    if (Number.isFinite(fgx) && Number.isFinite(fgy)) {
      let sx2 = fgx * scaleX;
      let sy2 = fgy * scaleY;
      const dFar = Math.hypot(sx2 - sx0, sy2 - sy0);
      if (dFar < Math.max(18, 26 * Math.min(scaleX, scaleY))) {
        const f = creep.facing || 1;
        sx2 = sx0 + f * Math.max(30, 44 * Math.min(scaleX, scaleY));
        sy2 = sy0 + Math.max(7, 10 * Math.min(scaleX, scaleY));
      }
      drawDebugLine(ctx, sx0, sy0, sx2, sy2, 'rgba(255,0,255,1)', scale);
    }

    if (nav && Number.isFinite(nav.nextX) && Number.isFinite(nav.nextY)) {
      const nx = nav.nextX * scaleX;
      const ny = nav.nextY * scaleY;
      const mode = String(nav.mode || '');
      const color = mode === 'blocked' ? 'rgba(255,80,80,0.9)' :
        mode.includes('slide') ? 'rgba(255,200,90,0.9)' :
        mode === 'pocket-escape' ? 'rgba(220,120,255,0.92)' : 'rgba(130,255,130,0.92)';
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(nx, ny, Math.max(2.1, 2.8 * Math.min(scaleX, scaleY)), 0, Math.PI * 2);
      ctx.fill();
    }

    // Always draw an exaggerated direction ray so it's visible even when next step is tiny.
    if (nav && Number.isFinite(nav.flowX) && Number.isFinite(nav.flowY)) {
      const fx = Number(nav.flowX) || 0;
      const fy = Number(nav.flowY) || 0;
      const len = Math.hypot(fx, fy);
      const fallbackFacing = creep.facing || 1;
      const ux = len > 0.001 ? (fx / len) : fallbackFacing;
      const uy = len > 0.001 ? (fy / len) : 0;
      const ray = Math.max(18, 42 * Math.min(scaleX, scaleY));
      const rx = sx0 + ux * ray;
      const ry = sy0 + uy * ray;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = Math.max(2, 2.8 * Math.min(scaleX, scaleY));
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(rx, ry);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(rx, ry, Math.max(2.2, 3 * Math.min(scaleX, scaleY)), 0, Math.PI * 2);
      ctx.fill();
    }

    const label = `${nav?.mode || creep.debugMode || 'nav'} / FAR`;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(label, sx0, sy0 - Math.max(14, 16 * Math.min(scaleX, scaleY)));
  });
  ctx.restore();
}

function drawDebugPath(ctx, startX, startY, points, scaleX, scaleY, color, scale) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  ctx.strokeStyle = 'rgba(0,0,0,0.82)';
  ctx.lineWidth = Math.max(2.4, 3.4 * scale);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  points.forEach(point => ctx.lineTo(point.x * scaleX, point.y * scaleY));
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, 1.9 * scale);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  points.forEach(point => ctx.lineTo(point.x * scaleX, point.y * scaleY));
  ctx.stroke();
  points.forEach((point, index) => {
    const x = point.x * scaleX;
    const y = point.y * scaleY;
    ctx.fillStyle = index === 0 ? 'rgba(255,255,255,0.95)' : color;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.6, 2.2 * scale), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawDebugLine(ctx, x0, y0, x1, y1, color, scale) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const arrow = Math.max(8, 12 * scale);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.lineWidth = Math.max(2.2, 3.2 * scale);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.1, 1.8 * scale);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - ux * arrow - uy * arrow * 0.55, y1 - uy * arrow + ux * arrow * 0.55);
  ctx.lineTo(x1 - ux * arrow + uy * arrow * 0.55, y1 - uy * arrow - ux * arrow * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDebugBlockPolygons(ctx, scaleX, scaleY) {
  const entities = [
    ...objectives.filter(unit => unit && unit.hp > 0).map(unit => ({ unit, color: 'rgba(80,200,255,0.95)' })),
    ...creeps.filter(unit => unit && unit.hp > 0).map(unit => ({ unit, color: 'rgba(255,180,80,0.95)' })),
    ...Object.values(remotePlayers).filter(unit => unit && unit.hp > 0).map(unit => ({ unit, color: 'rgba(255,120,120,0.95)' })),
  ];
  if (myPlayer && myPlayer.hp > 0) entities.push({ unit: myPlayer, color: 'rgba(120,255,150,0.98)' });

  ctx.save();
  ctx.lineWidth = Math.max(1, 1.5 * Math.min(scaleX, scaleY));
  entities.forEach(({ unit, color }) => {
    const w = Number(unit.width || unit.w || 40);
    const h = Number(unit.height || unit.h || 56);
    const footX = (Number(unit.x) || 0) + w / 2;
    const footY = (Number(unit.y) || 0) + h;
    const radiusX = Number(unit.footRadiusX) || Math.max(14, w * 0.43);
    const radiusY = Number(unit.footRadiusY) || Math.max(9, h * 0.18);
    const cx = footX * scaleX;
    const cy = footY * scaleY;
    const rx = radiusX * scaleX;
    const ry = radiusY * scaleY;

    // Approximate collision ellipse as an 8-point polygon for easy visual QC.
    const points = [];
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * Math.PI * 2;
      points.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
    }

    ctx.strokeStyle = color;
    ctx.fillStyle = color.replace('0.95', '0.14').replace('0.98', '0.18');
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1.8, 2.4 * Math.min(scaleX, scaleY)), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}
