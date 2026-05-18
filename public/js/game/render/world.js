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

function drawBattlefieldFloor(ctx, stage, sx, sy) {
  const x = 0;
  const y = BATTLEFIELD_TOP_Y * sy;
  const w = WORLD_W * sx;
  const h = (BATTLEFIELD_BOTTOM_Y - BATTLEFIELD_TOP_Y) * sy;
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, withAlpha(stage.decorColor, 0.1));
  grad.addColorStop(0.5, 'rgba(80,45,20,0.34)');
  grad.addColorStop(1, 'rgba(120,75,24,0.56)');
  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x + 78 * sx, y);
  ctx.lineTo(x + w - 78 * sx, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = withAlpha(stage.decorColor, 0.48);
  ctx.lineWidth = Math.max(1, 1.5 * Math.min(sx, sy));
  ctx.beginPath();
  ctx.moveTo(x + 78 * sx, y);
  ctx.lineTo(x + w - 78 * sx, y);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  for (let i = 1; i < 4; i++) {
    const yy = y + (h * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x + (58 - i * 12) * sx, yy);
    ctx.lineTo(x + w - (58 - i * 12) * sx, yy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFountain(ctx, fountain, stage, sx, sy) {
  const x = fountain.x * sx;
  const y = fountain.y * sy;
  const w = fountain.w * sx;
  const h = fountain.h * sy;
  const teamColor = fountain.teamId === 'sun' ? '#E44747' : '#3D8BFF';
  ctx.save();
  ctx.shadowColor = teamColor;
  ctx.shadowBlur = 18;
  const basin = ctx.createLinearGradient(0, y, 0, y + h);
  basin.addColorStop(0, withAlpha(stage.decorColor, 0.78));
  basin.addColorStop(0.38, teamColor);
  basin.addColorStop(1, shade(teamColor, -55));
  ctx.fillStyle = basin;
  drawRoundRect(ctx, x, y + h * 0.28, w, h * 0.72, 6);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = withAlpha('#ffffff', 0.22);
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + h * 0.52, w * 0.26, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = withAlpha(stage.decorColor, 0.46);
  ctx.lineWidth = Math.max(1, 1.5 * Math.min(sx, sy));
  ctx.strokeRect(x + w * 0.04, y + h * 0.28, w * 0.92, h * 0.72);
  ctx.restore();
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
  if (e.id === 'level-up') {
    drawLevelUpEffect(ctx, e, sx, sy);
    return;
  }
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

function drawLevelUpEffect(ctx, e, sx, sy) {
  const progress = 1 - e.life / e.maxLife;
  const alpha = Math.max(0, Math.min(1, e.life / e.maxLife));
  const scale = Math.min(sx, sy);
  const x = e.x * sx;
  const y = e.y * sy;
  const baseRadius = e.radius * scale;
  const ringRadius = baseRadius * (0.45 + progress * 1.35);
  const lift = baseRadius * (0.25 + progress * 0.85);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const aura = ctx.createRadialGradient(x, y, 0, x, y, baseRadius * 1.75);
  aura.addColorStop(0, 'rgba(255, 247, 184, 0)');
  aura.addColorStop(0.28, 'rgba(255, 247, 184, 0)');
  aura.addColorStop(0.52, withAlpha(e.color, 0.2 * alpha));
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y, baseRadius * 1.75, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 3; i++) {
    const ringAlpha = alpha * (0.92 - i * 0.22);
    const rr = ringRadius + i * baseRadius * 0.22;
    ctx.strokeStyle = i === 1 ? `rgba(255, 232, 132, ${ringAlpha})` : withAlpha(e.color, ringAlpha);
    ctx.lineWidth = Math.max(1.5, (4 - i) * scale);
    ctx.beginPath();
    ctx.ellipse(x, y + baseRadius * 0.16, rr, rr * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 + progress * Math.PI * 1.6;
    const shardRadius = baseRadius * (0.18 + progress * 1.15);
    const sxp = x + Math.cos(angle) * shardRadius;
    const syp = y - lift + Math.sin(angle) * shardRadius * 0.45;
    const shardSize = (3.2 + (i % 3) * 1.2) * scale * alpha;
    ctx.fillStyle = i % 2 ? `rgba(255, 236, 138, ${alpha})` : withAlpha(e.color, alpha);
    ctx.beginPath();
    ctx.moveTo(sxp, syp - shardSize * 1.6);
    ctx.lineTo(sxp + shardSize, syp);
    ctx.lineTo(sxp, syp + shardSize * 1.6);
    ctx.lineTo(sxp - shardSize, syp);
    ctx.closePath();
    ctx.fill();
  }

  const beamWidth = baseRadius * 0.58 * (1 - progress * 0.45);
  const beamGap = baseRadius * 0.26;
  const beam = ctx.createLinearGradient(x, y + baseRadius * 0.45, x, y - baseRadius * 2.35);
  beam.addColorStop(0, 'rgba(255, 236, 138, 0)');
  beam.addColorStop(0.2, `rgba(255, 236, 138, ${0.16 * alpha})`);
  beam.addColorStop(0.64, withAlpha(e.color, 0.24 * alpha));
  beam.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = beam;
  [-1, 1].forEach(side => {
    ctx.beginPath();
    ctx.moveTo(x + side * beamGap, y + baseRadius * 0.42);
    ctx.lineTo(x + side * beamWidth, y + baseRadius * 0.42);
    ctx.lineTo(x + side * beamWidth * 0.3, y - baseRadius * 2.35);
    ctx.lineTo(x + side * beamGap * 0.45, y - baseRadius * 2.35);
    ctx.closePath();
    ctx.fill();
  });

  const textAlpha = Math.min(1, alpha * 1.6) * (progress < 0.18 ? progress / 0.18 : 1);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = textAlpha;
  ctx.font = `900 ${Math.max(14, 17 * scale)}px Cinzel, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, 4 * scale);
  ctx.strokeStyle = 'rgba(0,0,0,0.72)';
  ctx.fillStyle = '#FFF0A4';
  ctx.strokeText('LEVEL UP', x, y - baseRadius * (1.35 + progress * 0.45));
  ctx.fillText('LEVEL UP', x, y - baseRadius * (1.35 + progress * 0.45));
  ctx.restore();
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
  const color = b.color || '#D91F2A';
  if (b.kind === 'smoke') {
    const x = b.x * sx;
    const y = b.y * sy;
    const r = b.size * scale * (1.05 + (1 - alpha) * 0.95);
    const trailScale = b.trailScale || 1;
    const tx = (b.x - (b.vx || 0) * 4.8 * trailScale) * sx;
    const ty = (b.y - (b.vy || 0) * 4.8 * trailScale) * sy;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = withAlpha(color, 0.12 * alpha);
    ctx.lineWidth = Math.max(1.5, b.size * 0.42 * scale);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = withAlpha(color, 0.16 * alpha);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = withAlpha(color, 0.08 * alpha);
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y + r * 0.12, r * 0.64, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (b.kind === 'fire') {
    const x = b.x * sx;
    const y = b.y * sy;
    const r = b.size * scale * (1.08 + (1 - alpha) * 0.32);
    const trailScale = b.trailScale || 1;
    const tx = (b.x - (b.vx || 0) * 4 * trailScale) * sx;
    const ty = (b.y - (b.vy || 0) * 4 * trailScale) * sy;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = withAlpha(color, 0.26 * alpha);
    ctx.lineWidth = Math.max(1.4, b.size * 0.42 * scale);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = withAlpha(color, 0.44 * alpha);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 241, 166, ${0.54 * alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = b.color ? withAlpha(color, 0.75) : 'rgba(185, 12, 22, 0.75)';
  ctx.lineWidth = Math.max(1.2, b.size * 0.55 * scale);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(b.x * sx, b.y * sy);
  ctx.lineTo((b.x - b.vx * 1.8) * sx, (b.y - b.vy * 1.8) * sy);
  ctx.stroke();
  ctx.fillStyle = b.color ? withAlpha(color, alpha > 0.45 ? 0.95 : 0.72) : (alpha > 0.45 ? '#D91F2A' : 'rgba(120, 8, 12, 0.9)');
  ctx.beginPath();
  ctx.arc(b.x * sx, b.y * sy, b.size * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDeathPart(ctx, part, sx, sy) {
  const alpha = Math.max(0, Math.min(1, part.life / Math.max(1, part.maxLife)));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(part.x * sx, part.y * sy);
  ctx.rotate(part.angle || 0);
  if (Number.isFinite(part.sx) && Number.isFinite(part.sy) && Number.isFinite(part.sw) && Number.isFinite(part.sh)) {
    ctx.drawImage(
      part.img,
      part.sx,
      part.sy,
      part.sw,
      part.sh,
      -part.w * sx / 2,
      -part.h * sy / 2,
      part.w * sx,
      part.h * sy
    );
  } else {
    ctx.drawImage(
      part.img,
      -part.w * sx / 2,
      -part.h * sy / 2,
      part.w * sx,
      part.h * sy
    );
  }
  ctx.restore();
}
