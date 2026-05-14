// Stage, projectile, damage, and particle rendering
function drawBackground(ctx, stage, W, H, sx, sy) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, stage.bg[0]);
  grad.addColorStop(0.45, stage.bg[1]);
  grad.addColorStop(1, stage.bg[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.5, H * 0.28, 10, W * 0.5, H * 0.28, W * 0.55);
  glow.addColorStop(0, withAlpha(stage.decorColor, 0.22));
  glow.addColorStop(0.45, withAlpha(stage.decorColor, 0.06));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 80; i++) {
    const x = ((i * 137 + 50) % WORLD_W) * sx;
    const y = ((i * 97 + 30) % 380) * sy;
    const alpha = Math.max(0.08, 0.32 + Math.sin(Date.now() * 0.0012 + i) * 0.22);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
  }

  for (let i = 0; i < 5; i++) {
    const y = (230 + i * 46) * sy;
    const offset = (i * 71) * sx;
    ctx.fillStyle = `rgba(0,0,0,${0.07 + i * 0.025})`;
    ctx.beginPath();
    ctx.moveTo(-120 * sx, H);
    for (let x = -120 * sx; x <= W + 120 * sx; x += 120 * sx) {
      const peak = y - Math.sin((x + offset) * 0.01) * 18 * sy - i * 16 * sy;
      ctx.lineTo(x, peak);
    }
    ctx.lineTo(W + 120 * sx, H);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPillar(ctx, pillar, stage, sx, sy) {
  const x = pillar.x * sx;
  const y = pillar.y * sy;
  const w = pillar.w * sx;
  const h = pillar.h * sy;
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, shade(pillar.color, -28));
  grad.addColorStop(0.5, shade(pillar.color, 18));
  grad.addColorStop(1, shade(pillar.color, -38));
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = withAlpha(stage.decorColor, 0.26);
  ctx.fillRect(x + w * 0.08, y, Math.max(2, w * 0.08), h);
  ctx.fillRect(x + w * 0.78, y, Math.max(2, w * 0.08), h);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  for (let yy = y + 34 * sy; yy < y + h; yy += 46 * sy) {
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
  }
}

function drawPlatform(ctx, plat, stage, sx, sy) {
  const x = plat.x * sx;
  const y = plat.y * sy;
  const w = plat.w * sx;
  const h = Math.max(plat.h * sy, 16);
  const depth = Math.max(12, h * 0.9);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.38)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 10;
  const face = ctx.createLinearGradient(0, y, 0, y + h + depth);
  face.addColorStop(0, shade(plat.color, 28));
  face.addColorStop(0.52, plat.color);
  face.addColorStop(1, shade(plat.color, -42));
  drawRoundRect(ctx, x, y, w, h + depth, 5);
  ctx.fillStyle = face;
  ctx.fill();
  ctx.restore();

  const top = ctx.createLinearGradient(0, y, 0, y + h);
  top.addColorStop(0, withAlpha(stage.decorColor, 0.45));
  top.addColorStop(0.18, shade(plat.color, 35));
  top.addColorStop(1, plat.color);
  drawRoundRect(ctx, x, y, w, h, 5);
  ctx.fillStyle = top;
  ctx.fill();

  ctx.strokeStyle = withAlpha(stage.decorColor, 0.55);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 2);
  ctx.lineTo(x + w - 4, y + 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  const block = Math.max(42 * sx, 32);
  for (let xx = x + block; xx < x + w - 4; xx += block) {
    ctx.beginPath();
    ctx.moveTo(xx, y + 4);
    ctx.lineTo(xx, y + h + depth - 2);
    ctx.stroke();
  }
}

function drawProjectile(ctx, p, sx, sy) {
  const x = p.x * sx;
  const y = p.y * sy;
  const r = p.radius * Math.min(sx, sy);
  const trail = ctx.createLinearGradient(x - p.vx * sx * 4, y - p.vy * sy * 4, x, y);
  trail.addColorStop(0, 'rgba(255,255,255,0)');
  trail.addColorStop(1, withAlpha(p.color, 0.72));
  ctx.strokeStyle = trail;
  ctx.lineWidth = Math.max(4, r * 1.4);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - p.vx * sx * 4, y - p.vy * sy * 4);
  ctx.lineTo(x, y);
  ctx.stroke();

  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5);
  glow.addColorStop(0, withAlpha(p.color, 0.95));
  glow.addColorStop(0.4, withAlpha(p.color, 0.42));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, Math.max(2, r * 0.45), 0, Math.PI * 2);
  ctx.fill();
}

function drawEffect(ctx, e, sx, sy) {
  const alpha = e.life / e.maxLife;
  const r = e.radius * (1 - alpha * 0.35) * Math.min(sx, sy);
  const x = e.x * sx;
  const y = e.y * sy;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
  glow.addColorStop(0, withAlpha(e.color, alpha * 0.34));
  glow.addColorStop(0.65, withAlpha(e.color, alpha * 0.12));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = withAlpha(e.color, alpha);
  ctx.lineWidth = Math.max(1.5, 3 * alpha);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();
}

function drawDamageNumber(ctx, n, sx, sy) {
  const alpha = Math.max(0, n.life / n.maxLife);
  const x = n.x * sx;
  const y = n.y * sy;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${Math.max(16, 19 * Math.min(sx, sy))}px Cinzel, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.82)';
  ctx.strokeText(`-${n.value}`, x, y);
  ctx.fillStyle = n.color;
  ctx.fillText(`-${n.value}`, x, y);
  ctx.restore();
}

function drawBloodParticle(ctx, b, sx, sy) {
  const alpha = Math.max(0, b.life / b.maxLife);
  const scale = Math.min(sx, sy);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(185, 12, 22, 0.75)';
  ctx.lineWidth = Math.max(1.2, b.size * 0.55 * scale);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(b.x * sx, b.y * sy);
  ctx.lineTo((b.x - b.vx * 1.8) * sx, (b.y - b.vy * 1.8) * sy);
  ctx.stroke();
  ctx.fillStyle = alpha > 0.45 ? '#D91F2A' : 'rgba(120, 8, 12, 0.9)';
  ctx.beginPath();
  ctx.arc(b.x * sx, b.y * sy, b.size * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
