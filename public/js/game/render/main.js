// Main render pass
function render(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const scaleX = W / WORLD_W;
  const scaleY = H / WORLD_H;
  const stage = currentStage;

  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, stage, W, H, scaleX, scaleY);
  stage.pillars.forEach(pl => drawPillar(ctx, pl, stage, scaleX, scaleY));
  stage.platforms.forEach(plat => drawPlatform(ctx, plat, stage, scaleX, scaleY));
  projectiles.forEach(p => drawProjectile(ctx, p, scaleX, scaleY));
  effects.forEach(e => drawEffect(ctx, e, scaleX, scaleY));
  Object.values(remotePlayers).forEach(p => drawPlayer(ctx, p, scaleX, scaleY, false));
  if (myPlayer) drawPlayer(ctx, myPlayer, scaleX, scaleY, true);
  deathParts.forEach(part => drawDeathPart(ctx, part, scaleX, scaleY));
  bloodParticles.forEach(b => drawBloodParticle(ctx, b, scaleX, scaleY));
  damageNumbers.forEach(n => drawDamageNumber(ctx, n, scaleX, scaleY));

  const vignette = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.18, W / 2, H * 0.5, W * 0.7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}
