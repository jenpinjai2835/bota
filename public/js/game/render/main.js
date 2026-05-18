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
  effects.filter(e => e.id !== 'level-up').forEach(e => drawEffect(ctx, e, scaleX, scaleY));
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
  ctx.restore();

  const vignette = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.18, W / 2, H * 0.5, W * 0.7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}
