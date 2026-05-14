// Legacy fallback renderer and drawing primitives
//  RENDER
// ============================================================
function legacyRender(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const scaleX = W / WORLD_W;
  const scaleY = H / WORLD_H;

  ctx.clearRect(0, 0, W, H);

  // Background gradient
  const stage = currentStage;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, stage.bg[0]);
  grad.addColorStop(0.5, stage.bg[1]);
  grad.addColorStop(1, stage.bg[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Background stars
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 137 + 50) % WORLD_W) * scaleX;
    const sy = ((i * 97 + 30) % 400) * scaleY;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }

  // Pillars
  stage.pillars.forEach(pl => {
    const px = pl.x * scaleX, py = pl.y * scaleY;
    const pw = pl.w * scaleX, ph = pl.h * scaleY;
    ctx.fillStyle = pl.color;
    ctx.fillRect(px, py, pw, ph);
    // decor lines
    ctx.fillStyle = stage.decorColor + '33';
    ctx.fillRect(px + 2, py, 3 * scaleX, ph);
    ctx.fillRect(px + pw - 5 * scaleX, py, 3 * scaleX, ph);
  });

  // Platforms
  stage.platforms.forEach(plat => {
    const px = plat.x * scaleX, py = plat.y * scaleY;
    const pw = plat.w * scaleX, ph = plat.h * scaleY;
    ctx.fillStyle = plat.color;
    ctx.fillRect(px, py, pw, ph);
    // Top edge highlight
    ctx.fillStyle = stage.decorColor + '55';
    ctx.fillRect(px, py, pw, 3);
    // Stone texture lines
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let xi = 0; xi < pw; xi += 30 * scaleX) {
      ctx.fillRect(px + xi, py + 3, 1, ph - 3);
    }
  });

  // Projectiles
  projectiles.forEach(p => {
    const px = p.x * scaleX, py = p.y * scaleY;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(px, py, p.radius * Math.min(scaleX, scaleY), 0, Math.PI * 2);
    ctx.fill();
    // Trail
    ctx.fillStyle = p.color + '44';
    ctx.beginPath();
    ctx.arc(px - p.vx * scaleX * 2, py - p.vy * scaleY * 2, p.radius * Math.min(scaleX, scaleY) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Effects
  effects.forEach(e => {
    const alpha = e.life / e.maxLife;
    const r = e.radius * (1 - alpha * 0.5) * Math.min(scaleX, scaleY);
    const ex = e.x * scaleX, ey = e.y * scaleY;
    ctx.strokeStyle = e.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.stroke();
    if (r > 15) {
      ctx.beginPath();
      ctx.arc(ex, ey, r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // Remote players
  Object.values(remotePlayers).forEach(p => drawPlayer(ctx, p, scaleX, scaleY, false));
  // My player
  if (myPlayer && isAlive) drawPlayer(ctx, myPlayer, scaleX, scaleY, true);
}

function legacyDrawPlayer(ctx, p, sx, sy, isMe) {
  const x = p.x * sx, y = p.y * sy;
  const w = p.width * sx, h = p.height * sy;
  const ch = p.charData;
  const color = ch?.color || '#D4AF37';

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.ellipse(x + w/2, y + h + 2, w * 0.45, 5 * sy, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.save();
  ctx.translate(x + w/2, y + h/2);
  if (p.facing < 0) ctx.scale(-1, 1);

  // Legs
  const legOff = (p.state === 'run' ? Math.sin(Date.now() * 0.015) * 5 * sy : 0);
  ctx.fillStyle = color + 'CC';
  ctx.fillRect(-w*0.18, h*0.2, w*0.16, h*0.38 + legOff);
  ctx.fillRect(w*0.02, h*0.2, w*0.16, h*0.38 - legOff);

  // Torso
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-w*0.32, -h*0.25, w*0.64, h*0.48, 3);
  ctx.fill();

  // Shoulder pads
  ctx.fillStyle = color + 'EE';
  ctx.fillRect(-w*0.42, -h*0.22, w*0.14, h*0.22);
  ctx.fillRect(w*0.28, -h*0.22, w*0.14, h*0.22);

  // Head
  ctx.fillStyle = color + 'DD';
  ctx.beginPath();
  ctx.arc(0, -h*0.38, w*0.26, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#FFF';
  ctx.fillRect(w*0.04, -h*0.44, w*0.1, h*0.08);
  ctx.fillStyle = '#000';
  ctx.fillRect(w*0.06, -h*0.43, w*0.06, h*0.06);

  // Emoji icon on chest
  ctx.restore();
  ctx.font = `${w * 0.55}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch?.icon || '?', x + w/2, y + h/2 - h*0.05);

  // Name tag
  ctx.font = `bold ${Math.max(9, 11 * Math.min(sx,sy))}px Cinzel, serif`;
  ctx.fillStyle = isMe ? '#F5E182' : '#E8D5B0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(p.name, x + w/2, y - 4);

  // HP bar (above name)
  const bw = w * 1.2, bh = 4 * sy;
  const bx = x + w/2 - bw/2, by = y - 18 * sy;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx, by, bw, bh);
  const hpPct = Math.max(0, p.hp / (p.maxHp || 100));
  ctx.fillStyle = hpPct > 0.6 ? '#4CAF50' : hpPct > 0.3 ? '#FFA500' : '#FF4444';
  ctx.fillRect(bx, by, bw * hpPct, bh);

  // "ME" indicator
  if (isMe) {
    ctx.fillStyle = '#F5E182';
    ctx.font = `${8 * Math.min(sx,sy)}px Cinzel, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('▲', x + w/2, by - 2);
  }
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shade(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(r + amount)}, ${clamp(g + amount)}, ${clamp(b + amount)})`;
}

function drawRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
