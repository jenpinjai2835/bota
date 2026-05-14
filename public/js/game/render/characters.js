// Character, sprite sheet, and vector-part rendering
function drawBlade(ctx, x1, y1, x2, y2, color = '#E9EDF7') {
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.58)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawCharacterDetails(ctx, ch, w, h, color, run) {
  const id = ch?.id || '';
  const accent = ch?.color || color;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (id === 'dragonfist') {
    ctx.fillStyle = '#FFB238';
    ctx.beginPath();
    ctx.moveTo(-w * 0.18, -h * 0.58);
    ctx.lineTo(-w * 0.34, -h * 0.72);
    ctx.lineTo(-w * 0.08, -h * 0.62);
    ctx.moveTo(w * 0.18, -h * 0.58);
    ctx.lineTo(w * 0.34, -h * 0.72);
    ctx.lineTo(w * 0.08, -h * 0.62);
    ctx.fill();
    ['left', 'right'].forEach((side, i) => {
      const s = i === 0 ? -1 : 1;
      const gx = s * w * 0.44;
      const gy = h * 0.22 + run * s * 2;
      const glow = ctx.createRadialGradient(gx, gy, 1, gx, gy, w * 0.24);
      glow.addColorStop(0, 'rgba(255,178,56,0.8)');
      glow.addColorStop(1, 'rgba(255,69,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(gx, gy, w * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FF6B22';
      ctx.beginPath();
      ctx.arc(gx, gy, w * 0.13, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (id === 'shadowblade') {
    ctx.fillStyle = 'rgba(18,12,28,0.92)';
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h * 0.34);
    ctx.quadraticCurveTo(0, -h * 0.72, w * 0.34, -h * 0.34);
    ctx.lineTo(w * 0.22, -h * 0.14);
    ctx.quadraticCurveTo(0, -h * 0.24, -w * 0.22, -h * 0.14);
    ctx.closePath();
    ctx.fill();
    drawBlade(ctx, -w * 0.46, h * 0.24, -w * 0.1, -h * 0.04, '#D9D7FF');
    drawBlade(ctx, w * 0.46, h * 0.24, w * 0.1, -h * 0.04, '#D9D7FF');
  } else if (id === 'stoneguard') {
    ctx.fillStyle = '#A7B0B3';
    drawRoundRect(ctx, -w * 0.47, -h * 0.08, w * 0.28, h * 0.46, 8);
    ctx.fill();
    ctx.strokeStyle = '#4D5659';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#D1D6D8';
    ctx.beginPath();
    ctx.moveTo(-w * 0.33, h * 0.03);
    ctx.lineTo(-w * 0.24, h * 0.14);
    ctx.lineTo(-w * 0.33, h * 0.25);
    ctx.lineTo(-w * 0.42, h * 0.14);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'stormarrow') {
    ctx.strokeStyle = '#BEEFBF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w * 0.3, -h * 0.02, h * 0.25, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(w * 0.42, -h * 0.18);
    ctx.lineTo(w * 0.42, h * 0.16);
    ctx.stroke();
    drawBlade(ctx, -w * 0.28, h * 0.08, w * 0.32, -h * 0.02, '#7DFF9D');
  } else if (id === 'pyromancer' || id === 'frostmage' || id === 'celestial') {
    const mageColor = id === 'pyromancer' ? '#FF6B3D' : id === 'frostmage' ? '#AEE9FF' : '#FFF2A8';
    ctx.strokeStyle = '#2C1B20';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h * 0.42);
    ctx.lineTo(w * 0.42, -h * 0.34);
    ctx.stroke();
    ctx.strokeStyle = mageColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h * 0.42);
    ctx.lineTo(w * 0.42, -h * 0.34);
    ctx.stroke();
    const orb = ctx.createRadialGradient(w * 0.42, -h * 0.42, 1, w * 0.42, -h * 0.42, w * 0.22);
    orb.addColorStop(0, '#FFFFFF');
    orb.addColorStop(0.4, mageColor);
    orb.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(w * 0.42, -h * 0.42, w * 0.22, 0, Math.PI * 2);
    ctx.fill();
    if (id === 'celestial') {
      ctx.strokeStyle = '#FFF7B8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.62, w * 0.34, h * 0.08, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (id === 'thunderking') {
    ctx.fillStyle = '#F7D84A';
    ctx.beginPath();
    ctx.moveTo(-w * 0.26, -h * 0.58);
    ctx.lineTo(-w * 0.14, -h * 0.76);
    ctx.lineTo(0, -h * 0.58);
    ctx.lineTo(w * 0.14, -h * 0.76);
    ctx.lineTo(w * 0.26, -h * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#FFE777';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w * 0.44, h * 0.12);
    ctx.lineTo(-w * 0.18, -h * 0.08);
    ctx.lineTo(-w * 0.02, h * 0.08);
    ctx.lineTo(w * 0.22, -h * 0.16);
    ctx.stroke();
  } else if (id === 'venomfang') {
    ctx.strokeStyle = '#7DFFD3';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-w * 0.36, h * 0.16);
    ctx.bezierCurveTo(-w * 0.1, -h * 0.12, w * 0.18, h * 0.24, w * 0.42, -h * 0.06);
    ctx.stroke();
    ctx.fillStyle = '#DFFFF4';
    ctx.beginPath();
    ctx.moveTo(-w * 0.09, -h * 0.34);
    ctx.lineTo(-w * 0.02, -h * 0.2);
    ctx.lineTo(w * 0.05, -h * 0.34);
    ctx.fill();
  } else if (id === 'ironclad') {
    ctx.fillStyle = '#D4D9DD';
    drawRoundRect(ctx, -w * 0.43, -h * 0.18, w * 0.2, h * 0.44, 5);
    ctx.fill();
    drawRoundRect(ctx, w * 0.23, -h * 0.18, w * 0.2, h * 0.44, 5);
    ctx.fill();
    ctx.fillStyle = '#3A3F44';
    ctx.beginPath();
    ctx.arc(w * 0.33, -h * 0.02, w * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF674A';
    ctx.fillRect(w * 0.26, -h * 0.05, w * 0.14, h * 0.05);
  }

  ctx.fillStyle = withAlpha(accent, 0.35);
  drawRoundRect(ctx, -w * 0.2, -h * 0.03, w * 0.4, h * 0.16, 4);
  ctx.fill();
  ctx.restore();
}

function drawPlayerPlate(ctx, p, centerX, topY, plateW, sx, sy, isMe) {
  const nameW = Math.max(96, plateW);
  const label = getPlayerClassLabel(p);
  if (p.hp <= 0 && p.deathUntil) {
    const remaining = Math.max(0, Math.ceil((p.deathUntil - Date.now()) / 1000));
    const countdownY = topY - 36 * sy;
    ctx.save();
    ctx.fillStyle = 'rgba(7,5,6,0.78)';
    drawRoundRect(ctx, centerX - 12 * sy, countdownY - 14 * sy, 24 * sy, 20 * sy, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,61,70,0.9)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#FFDF8B';
    ctx.font = `900 ${Math.max(13, 15 * Math.min(sx, sy))}px Cinzel, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(remaining), centerX, countdownY - 4 * sy);
    ctx.restore();
  }
  drawRoundRect(ctx, centerX - nameW / 2, topY - 24 * sy, nameW, 20 * sy, 4);
  ctx.fillStyle = 'rgba(7,5,6,0.72)';
  ctx.fill();
  ctx.strokeStyle = isMe ? 'rgba(76, 232, 128, 0.95)' : 'rgba(255, 72, 72, 0.92)';
  ctx.lineWidth = Math.max(1, 1.35 * Math.min(sx, sy));
  ctx.stroke();

  let nameFontSize = Math.max(9, 11 * Math.min(sx, sy));
  ctx.font = `700 ${nameFontSize}px Cinzel, serif`;
  while (nameFontSize > 7 && ctx.measureText(label).width > nameW - 12) {
    nameFontSize -= 0.5;
    ctx.font = `700 ${nameFontSize}px Cinzel, serif`;
  }
  ctx.fillStyle = isMe ? '#F5E182' : '#F3E8D2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, centerX, topY - 8 * sy);

  const bw = nameW - 10;
  const bh = Math.max(4, 4 * sy);
  const bx = centerX - bw / 2;
  const by = topY - 10 * sy;
  drawRoundRect(ctx, bx, by, bw, bh, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fill();
  const hpPct = Math.max(0, p.hp / (p.maxHp || 100));
  drawRoundRect(ctx, bx, by, bw * hpPct, bh, 3);
  ctx.fillStyle = hpPct > 0.6 ? '#39D36A' : hpPct > 0.3 ? '#FFB02E' : '#FF3D46';
  ctx.fill();
  drawHealthSegmentTicks(ctx, bx, by, bw, bh, p.maxHp || 100);

}

function drawHealthSegmentTicks(ctx, x, y, w, h, maxHp) {
  const count = Math.floor(maxHp / 100);
  if (count <= 1) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.lineWidth = 2;
  for (let i = 1; i < count; i++) {
    const tx = x + w * (i * 100 / maxHp);
    ctx.beginPath();
    ctx.moveTo(tx, y + 1);
    ctx.lineTo(tx, y + h - 1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDragonfistActionFX(ctx, action, drawW, drawH, p) {
  if (!action) return;

  const progress = getActionProgress(p);
  const fade = Math.max(0, 1 - progress);
  const punchY = -drawH * 0.45;
  const fistX = drawW * 0.24 + progress * drawW * 0.38;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  if (action === 'punch') {
    const impact = 1 - Math.abs(progress - 0.45) / 0.45;
    ctx.strokeStyle = `rgba(255, 196, 72, ${0.78 * Math.max(0, impact)})`;
    ctx.shadowColor = 'rgba(255, 96, 24, 0.85)';
    ctx.shadowBlur = drawW * 0.1;
    ctx.lineWidth = Math.max(5, drawW * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(fistX, punchY, drawW * (0.2 + progress * 0.18), -1.08, 0.78);
    ctx.stroke();

    const glow = ctx.createRadialGradient(fistX, punchY, 0, fistX, punchY, drawW * 0.18);
    glow.addColorStop(0, `rgba(255, 235, 126, ${0.62 * fade})`);
    glow.addColorStop(0.45, `rgba(255, 92, 22, ${0.42 * fade})`);
    glow.addColorStop(1, 'rgba(255, 92, 22, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(fistX, punchY, drawW * 0.26, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 242, 160, ${0.64 * fade})`;
    ctx.lineWidth = Math.max(2, drawW * 0.024);
    for (let i = 0; i < 3; i++) {
      const sparkY = punchY + (i - 1) * drawH * 0.045;
      ctx.beginPath();
      ctx.moveTo(fistX - drawW * 0.08, sparkY);
      ctx.lineTo(fistX + drawW * (0.22 + progress * 0.2), sparkY - drawH * 0.025);
      ctx.stroke();
    }
  }

  if (action === 'flame') {
    const flameX = drawW * 0.18;
    const flameY = -drawH * 0.36;
    const flameLen = drawW * (0.42 + progress * 0.24);
    const flameGrad = ctx.createLinearGradient(flameX, flameY, flameX + flameLen, flameY);
    flameGrad.addColorStop(0, `rgba(255, 245, 150, ${0.82 * fade})`);
    flameGrad.addColorStop(0.35, `rgba(255, 106, 28, ${0.68 * fade})`);
    flameGrad.addColorStop(1, 'rgba(255, 42, 12, 0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(flameX, flameY);
    ctx.quadraticCurveTo(flameX + flameLen * 0.45, flameY - drawH * 0.1, flameX + flameLen, flameY - drawH * 0.02);
    ctx.quadraticCurveTo(flameX + flameLen * 0.42, flameY + drawH * 0.12, flameX, flameY);
    ctx.fill();
  }

  if (action === 'rush') {
    ctx.strokeStyle = `rgba(255, 114, 35, ${0.52 * fade})`;
    ctx.lineWidth = Math.max(2, drawW * 0.02);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const y = -drawH * (0.22 + i * 0.15);
      ctx.beginPath();
      ctx.moveTo(-drawW * (0.62 + i * 0.08), y);
      ctx.lineTo(-drawW * 0.18, y - drawH * 0.03);
      ctx.stroke();
    }
  }

  if (action === 'roar') {
    ctx.strokeStyle = `rgba(255, 184, 48, ${0.72 * fade})`;
    ctx.lineWidth = Math.max(2, drawW * 0.022);
    ctx.beginPath();
    ctx.arc(0, -drawH * 0.52, drawW * (0.28 + progress * 0.42), 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 92, 22, ${0.16 * fade})`;
    ctx.beginPath();
    ctx.arc(0, -drawH * 0.52, drawW * (0.38 + progress * 0.52), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSpriteActionOverlay(ctx, p, footX, footY, drawW, drawH, action) {
  if (!action || action === 'roar') return;

  const progress = getActionProgress(p);
  const fade = Math.max(0, 1 - progress);
  const dir = p.facing || 1;
  const handX = footX + dir * drawW * (0.34 + progress * 0.16);
  const handY = footY - drawH * 0.44;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255, 100, 24, 0.9)';
  ctx.shadowBlur = drawW * 0.14;

  if (action === 'punch') {
    const impact = Math.max(0, 1 - Math.abs(progress - 0.45) / 0.45);
    ctx.strokeStyle = `rgba(255, 220, 106, ${0.9 * impact})`;
    ctx.lineWidth = Math.max(5, drawW * 0.065);
    ctx.beginPath();
    ctx.arc(handX, handY, drawW * (0.22 + progress * 0.18), dir > 0 ? -1.2 : Math.PI + 1.2, dir > 0 ? 0.65 : Math.PI - 0.65, dir < 0);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 248, 190, ${0.72 * fade})`;
    ctx.lineWidth = Math.max(2, drawW * 0.026);
    for (let i = 0; i < 3; i++) {
      const sparkY = handY + (i - 1) * drawH * 0.048;
      ctx.beginPath();
      ctx.moveTo(handX - dir * drawW * 0.08, sparkY);
      ctx.lineTo(handX + dir * drawW * (0.3 + progress * 0.22), sparkY - drawH * 0.02);
      ctx.stroke();
    }
  }

  if (action === 'flame') {
    const flameLen = drawW * (0.48 + progress * 0.34);
    const flameGrad = ctx.createLinearGradient(handX, handY, handX + dir * flameLen, handY);
    flameGrad.addColorStop(0, `rgba(255, 245, 150, ${0.78 * fade})`);
    flameGrad.addColorStop(0.42, `rgba(255, 106, 28, ${0.64 * fade})`);
    flameGrad.addColorStop(1, 'rgba(255, 42, 12, 0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.quadraticCurveTo(handX + dir * flameLen * 0.46, handY - drawH * 0.11, handX + dir * flameLen, handY - drawH * 0.03);
    ctx.quadraticCurveTo(handX + dir * flameLen * 0.44, handY + drawH * 0.12, handX, handY);
    ctx.fill();
  }

  if (action === 'rush') {
    ctx.strokeStyle = `rgba(255, 120, 34, ${0.6 * fade})`;
    ctx.lineWidth = Math.max(3, drawW * 0.032);
    for (let i = 0; i < 4; i++) {
      const y = footY - drawH * (0.25 + i * 0.14);
      ctx.beginPath();
      ctx.moveTo(footX - dir * drawW * (0.72 + i * 0.08), y);
      ctx.lineTo(footX - dir * drawW * 0.18, y - drawH * 0.025);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawDragonfistFootwork(ctx, drawW, drawH, stride, lift, isMoving) {
  if (!isMoving && lift <= 0.02) return;

  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(18, 11, 10, 0.82)';
  ctx.lineWidth = Math.max(3, drawW * 0.035);

  const hipY = -drawH * 0.34;
  const kneeY = -drawH * 0.17;
  const footY = -drawH * 0.01;
  const leftStep = stride * drawW * 0.055;
  const rightStep = -stride * drawW * 0.055;
  const leftLift = Math.max(0, stride) * lift * drawH * 0.035;
  const rightLift = Math.max(0, -stride) * lift * drawH * 0.035;

  function leg(x, step, liftY) {
    ctx.beginPath();
    ctx.moveTo(x * drawW, hipY);
    ctx.quadraticCurveTo(x * drawW + step * 0.55, kneeY, x * drawW + step, footY - liftY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(242, 176, 76, 0.58)';
    ctx.lineWidth = Math.max(1, drawW * 0.012);
    ctx.beginPath();
    ctx.moveTo(x * drawW + step * 0.25, kneeY + drawH * 0.03);
    ctx.lineTo(x * drawW + step, footY - liftY);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(18, 11, 10, 0.82)';
    ctx.lineWidth = Math.max(3, drawW * 0.035);
  }

  leg(-0.1, leftStep, leftLift);
  leg(0.12, rightStep, rightLift);
  ctx.restore();
}

function getSpriteSheetId(ch, p, action) {
  const skill = getSkillForAction(ch, action);
  if (ch?.id === 'dragonfist') {
    if (p.hp <= 0 || p.state === 'dead' || p.state === 'hurt' || p.hitStunUntil > Date.now()) return 'idle';
    if (p.state === 'idle') return 'idle';
    if (p.state === 'jump' || p.state === 'fall') return 'jump';
    if (['punch', 'flame', 'roar'].includes(action)) return 'attack';
    if (p.state === 'run' || action === 'rush') return 'run';
    return null;
  }

  if (skill?.type === 'dash') return 'run';
  if (action) return 'attack';
  if (p.state === 'jump' || p.state === 'fall') return 'jump';
  if (p.state === 'run') return 'run';
  if (p.state === 'idle') return 'idle';
  return null;
}

function getCharacterSpriteSource(ch, p, action) {
  const sheets = ch.sprite?.sheets || {};
  const sheetId = getSpriteSheetId(ch, p, action);

  if (sheetId && sheets[sheetId]) {
    const img = spriteImages[`${ch.id}:${sheetId}`];
    if (img?.complete && img.naturalWidth) {
      return {
        img,
        ch,
        sheetId,
        sheet: sheets[sheetId],
        baseFacing: sheets[sheetId].baseFacing || ch.sprite?.baseFacing || 1,
        scale: sheets[sheetId].scale || ch.sprite?.scale || 1.7,
        footY: sheets[sheetId].footY || 1,
        visualHeight: sheets[sheetId].visualHeight || 1,
        plateWidth: sheets[sheetId].plateWidth || 0.72,
        frameAspect: sheets[sheetId].frameAspect || false,
      };
    }
  }

  const img = spriteImages[ch.id];
  return {
    img,
    ch,
    sheetId: null,
    sheet: null,
    baseFacing: ch.sprite?.baseFacing || 1,
    scale: ch.sprite?.scale || 1.7,
    footY: 1,
    visualHeight: 1,
    plateWidth: 1.25,
  };
}

function getDragonfistSpriteSource(ch, p, action) {
  return getCharacterSpriteSource(ch, p, action);
}

function getDragonfistJumpFrame(p, frameCount) {
  const vy = typeof p.vy === 'number' ? p.vy : 0;
  if (vy < -10) return Math.min(2, frameCount - 1);
  if (vy < -5) return Math.min(3, frameCount - 1);
  if (vy < 1) return Math.min(4, frameCount - 1);
  if (vy < 6) return Math.min(5, frameCount - 1);
  if (vy < 10) return Math.min(6, frameCount - 1);
  return Math.min(7, frameCount - 1);
}

function getJumpProgress(p) {
  const vy = typeof p.vy === 'number' ? p.vy : 0;
  const normalized = (vy + 16) / 32;
  return Math.max(0, Math.min(0.999, normalized));
}

function drawSpriteSheetFrame(ctx, source, drawW, drawH, p, action) {
  const { img, sheet, sheetId } = source;
  const frameW = img.naturalWidth / sheet.cols;
  const frameH = img.naturalHeight / sheet.rows;
  let frame = 0;

  if (sheetId === 'attack') {
    frame = Math.min(sheet.frames - 1, Math.floor(getActionProgress(p) * sheet.frames));
  } else if (sheetId === 'jump' && source.ch?.id === 'dragonfist') {
    frame = getDragonfistJumpFrame(p, sheet.frames);
  } else if (sheetId === 'jump') {
    frame = Math.min(sheet.frames - 1, Math.floor(getJumpProgress(p) * sheet.frames));
  } else {
    frame = Math.floor(Date.now() * 0.001 * (sheet.fps || 16)) % sheet.frames;
  }

  const sx = (frame % sheet.cols) * frameW;
  const sy = Math.floor(frame / sheet.cols) * frameH;
  ctx.drawImage(img, sx, sy, frameW, frameH, -drawW / 2, -drawH * (source.footY || 1), drawW, drawH);
}

const warriorVectorBoundsCache = {};

function getWarriorVectorTimelineKey(timeline, time, length) {
  const keys = timeline?.keys || [];
  if (!keys.length) return null;
  if (keys.length === 1) return keys[0];

  let current = keys[0];
  let next = keys[1];
  for (let i = 0; i < keys.length; i++) {
    const candidate = keys[i];
    const candidateNext = keys[(i + 1) % keys.length];
    const nextTime = candidateNext.time <= candidate.time ? candidateNext.time + length : candidateNext.time;
    if (time >= candidate.time && time < nextTime) {
      current = candidate;
      next = candidateNext;
      break;
    }
  }

  const span = (next.time <= current.time ? next.time + length : next.time) - current.time;
  const localTime = time < current.time ? time + length : time;
  const t = span > 0 ? Math.max(0, Math.min(1, (localTime - current.time) / span)) : 0;
  const spin = current.spin ?? 1;
  let angleDelta = (next.angle || 0) - (current.angle || 0);
  if (spin === 0) {
    angleDelta = 0;
  } else if (spin > 0 && angleDelta < 0) {
    angleDelta += 360;
  } else if (spin < 0 && angleDelta > 0) {
    angleDelta -= 360;
  }

  return {
    ...current,
    x: current.x + ((next.x || 0) - (current.x || 0)) * t,
    y: current.y + ((next.y || 0) - (current.y || 0)) * t,
    angle: (current.angle || 0) + angleDelta * t,
    scaleX: (current.scaleX ?? 1) + ((next.scaleX ?? 1) - (current.scaleX ?? 1)) * t,
    scaleY: (current.scaleY ?? 1) + ((next.scaleY ?? 1) - (current.scaleY ?? 1)) * t,
  };
}

function composeWarriorVectorTransform(parent, local) {
  const rad = (parent.angle || 0) * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const x = (local.x || 0) * (parent.scaleX ?? 1);
  const y = (local.y || 0) * (parent.scaleY ?? 1);
  return {
    x: (parent.x || 0) + x * cos - y * sin,
    y: (parent.y || 0) + x * sin + y * cos,
    angle: (parent.angle || 0) + (local.angle || 0),
    scaleX: (parent.scaleX ?? 1) * (local.scaleX ?? 1),
    scaleY: (parent.scaleY ?? 1) * (local.scaleY ?? 1),
  };
}

function getWarriorVectorMainlineKey(data, time) {
  const keys = data?.mainline || [];
  let selected = keys[0] || null;
  keys.forEach(key => {
    if ((key.time || 0) <= time) selected = key;
  });
  return selected;
}

function getWarriorVectorImageInfo(data, folder, file) {
  const fileInfo = data?.files?.[String(folder)]?.[String(file)];
  if (!fileInfo) return null;
  const img = warriorVectorOverlayImages[fileInfo.name];
  if (!img?.complete || !img.naturalWidth) return null;
  return { img, fileInfo };
}

function getWarriorVectorAnimationName(p, action) {
  if (p.hp <= 0) return 'Died';
  if (p.hitStunUntil > Date.now()) return 'Hurt';
  if (action === 'rush') return 'Run';
  if (action === 'punch') return 'Attack_1';
  if (action === 'flame' || action === 'roar') return 'Attack_2';
  if (action) return 'Attack_1';
  if (p.state === 'run') return 'Run';
  if (p.state === 'jump' || p.state === 'fall') return 'Run';
  return 'Idle';
}

function getWarriorVectorAnimationTime(animation, p, action) {
  if (!animation?.length) return 0;
  if (p.hp <= 0) return animation.length - 1;
  if (p.hitStunUntil > Date.now()) {
    return Math.min(animation.length - 1, (1 - (p.hitStunUntil - Date.now()) / 260) * animation.length);
  }
  if (action && action !== 'rush') {
    return Math.min(animation.length - 1, getActionProgress(p) * animation.length);
  }
  return Date.now() % animation.length;
}

function getWarriorVectorCharacterObjects(animationName, p, action, forcedTime = null) {
  const data = warriorVectorAnimationsData;
  const animation = data?.animations?.[animationName];
  if (!data?.files || !animation?.length) return [];

  const time = forcedTime ?? getWarriorVectorAnimationTime(animation, p, action);
  const mainline = getWarriorVectorMainlineKey(animation, time);
  if (!mainline) return [];

  const identity = { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 };
  const boneTransforms = {};
  (mainline.boneRefs || []).forEach(ref => {
    const timeline = animation.timelines?.[String(ref.timeline)];
    const local = getWarriorVectorTimelineKey(timeline, time, animation.length);
    if (!local) return;
    const parent = ref.parent !== null && ref.parent !== undefined
      ? boneTransforms[String(ref.parent)] || identity
      : identity;
    boneTransforms[String(ref.id)] = composeWarriorVectorTransform(parent, local);
  });

  return (mainline.objectRefs || [])
    .map(ref => {
      const timeline = animation.timelines?.[String(ref.timeline)];
      const local = getWarriorVectorTimelineKey(timeline, time, animation.length);
      if (!local) return null;
      const imageInfo = getWarriorVectorImageInfo(data, local.folder, local.file);
      if (!imageInfo) return null;
      const parent = ref.parent !== null && ref.parent !== undefined
        ? boneTransforms[String(ref.parent)] || identity
        : identity;
      return {
        ...imageInfo,
        transform: composeWarriorVectorTransform(parent, local),
        zIndex: ref.zIndex || 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.zIndex - b.zIndex);
}

function getWarriorVectorObjectsBounds(objects) {
  const bounds = objects.reduce((acc, item) => {
    getWarriorVectorObjectCorners(item).forEach(point => {
      acc.minX = Math.min(acc.minX, point.x);
      acc.minY = Math.min(acc.minY, point.y);
      acc.maxX = Math.max(acc.maxX, point.x);
      acc.maxY = Math.max(acc.maxY, point.y);
    });
    return acc;
  }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) return null;
  return { ...bounds, width, height };
}

function getWarriorVectorReferenceBounds() {
  if (warriorVectorBoundsCache.idle) return warriorVectorBoundsCache.idle;
  const objects = getWarriorVectorCharacterObjects(
    'Idle',
    { hp: 1, state: 'idle', hitStunUntil: 0 },
    null,
    0
  );
  warriorVectorBoundsCache.idle = getWarriorVectorObjectsBounds(objects);
  return warriorVectorBoundsCache.idle;
}

function getWarriorVectorObjectCorners(item) {
  const { img, fileInfo, transform } = item;
  const pivotX = fileInfo.pivotX ?? 0.5;
  const pivotY = fileInfo.pivotY ?? 0.5;
  const points = [
    [-pivotX * img.naturalWidth, -pivotY * img.naturalHeight],
    [(1 - pivotX) * img.naturalWidth, -pivotY * img.naturalHeight],
    [(1 - pivotX) * img.naturalWidth, (1 - pivotY) * img.naturalHeight],
    [-pivotX * img.naturalWidth, (1 - pivotY) * img.naturalHeight],
  ];
  const rad = -(transform.angle || 0) * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return points.map(([x, y]) => {
    const sx = x * (transform.scaleX ?? 1);
    const sy = y * (transform.scaleY ?? 1);
    return {
      x: transform.x + sx * cos - sy * sin,
      y: -transform.y + sx * sin + sy * cos,
    };
  });
}

function drawWarriorVectorOverlayObject(ctx, item) {
  const { img, fileInfo, transform } = item;
  ctx.save();
  ctx.translate(transform.x, -transform.y);
  ctx.rotate(-(transform.angle || 0) * Math.PI / 180);
  ctx.scale(transform.scaleX ?? 1, transform.scaleY ?? 1);
  ctx.drawImage(
    img,
    -(fileInfo.pivotX ?? 0.5) * img.naturalWidth,
    -(fileInfo.pivotY ?? 0.5) * img.naturalHeight
  );
  ctx.restore();
}

function drawWarriorVectorCharacter(ctx, drawW, drawH, p, action, source) {
  if (source.ch?.id !== 'dragonfist') return false;
  const animationName = getWarriorVectorAnimationName(p, action);
  const objects = getWarriorVectorCharacterObjects(animationName, p, action);
  if (!objects.length) return false;

  const bounds = getWarriorVectorObjectsBounds(objects);
  if (!bounds) return false;

  const referenceBounds = getWarriorVectorReferenceBounds() || bounds;
  const scale = (drawH * 0.82) / referenceBounds.height;
  const offsetX = drawW * 0.02 - ((bounds.minX + bounds.maxX) * 0.5 * scale);
  const offsetY = drawH * 0.08 - bounds.maxY * scale;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  objects.forEach(item => drawWarriorVectorOverlayObject(ctx, item));
  ctx.restore();
  return true;
}

function drawDragonfistSprite(ctx, source, footX, footY, drawW, drawH, p, bob, lean, action, shouldFlip) {
  const runPhase = Date.now() * 0.018;
  const idleBreath = p.state === 'idle' && source.sheetId !== 'idle'
    ? Math.sin(Date.now() * 0.004) * 0.004
    : 0;
  const actionProgress = getActionProgress(p);
  const punchDrive = action === 'punch' ? Math.sin(actionProgress * Math.PI) : 0;
  const rushDrive = action === 'rush' ? Math.sin(actionProgress * Math.PI) : 0;
  const stride = p.state === 'run' ? Math.sin(runPhase) : rushDrive * 0.8;
  const lift = p.state === 'run' ? Math.abs(Math.cos(runPhase)) : Math.abs(rushDrive);
  const deathRoll = p.hp <= 0 ? (p.deathAngle || 0) : 0;

  ctx.save();
  ctx.translate(footX + (p.facing || 1) * punchDrive * 6, footY + bob - rushDrive * 2);
  ctx.rotate(deathRoll + lean + (action === 'punch' ? (p.facing || 1) * punchDrive * 0.08 : 0));
  if (shouldFlip) ctx.scale(-1, 1);
  ctx.scale(1 + punchDrive * 0.01, 1 + idleBreath - rushDrive * 0.015);
  if (source.ch?.id === 'dragonfist') {
    drawWarriorVectorCharacter(ctx, drawW, drawH, p, action, source);
  } else if (source.sheet) {
    drawSpriteSheetFrame(ctx, source, drawW, drawH, p, action);
  } else {
    ctx.drawImage(source.img, -drawW / 2, -drawH, drawW, drawH);
    drawDragonfistFootwork(ctx, drawW, drawH, stride, lift, p.state === 'run' || action === 'rush');
  }
  if (action === 'roar') drawDragonfistActionFX(ctx, action, drawW, drawH, p);
  ctx.restore();
}

function getDeathBodyAlpha(p) {
  if (p.hp > 0) return 1;
  const elapsed = Date.now() - (p.deathStartedAt || Date.now());
  return Math.max(0, Math.min(1, 1 - (elapsed - DEATH_BODY_FADE_START_MS) / DEATH_BODY_FADE_DURATION_MS));
}

function drawSpritePlayer(ctx, p, sx, sy, isMe) {
  const ch = p.charData;
  const action = p.hp <= 0 ? null : getActiveAction(p);
  const source = ch?.sprite
    ? getCharacterSpriteSource(ch, p, action)
    : { img: spriteImages[ch?.id], ch, baseFacing: ch?.sprite?.baseFacing || 1, scale: ch?.sprite?.scale || 1.7, visualHeight: 1 };
  const img = source.img;
  if (!img || !img.complete || !img.naturalWidth) return false;

  const x = p.x * sx;
  const y = p.y * sy;
  const w = p.width * sx;
  const h = p.height * sy;
  const footX = x + w / 2;
  const footY = y + h;
  const drawH = h * source.scale * CHARACTER_VISUAL_SCALE;
  const sheetFrameAspect = source.sheet
    ? (img.naturalWidth / source.sheet.cols) / (img.naturalHeight / source.sheet.rows)
    : 1;
  const drawW = source.sheet
    ? drawH * (source.frameAspect ? sheetFrameAspect : 1)
    : drawH * (img.naturalWidth / img.naturalHeight);
  const visualH = drawH * (source.visualHeight || 1);
  const t = Date.now() * 0.012;
  const actionProgress = getActionProgress(p);
  const actionKick = action ? Math.sin(actionProgress * Math.PI) : 0;
  const bob = p.state === 'idle'
    ? (source.sheetId === 'idle' ? 0 : Math.sin(t) * 1.6 * sy)
    : p.state === 'run'
      ? Math.abs(Math.sin(t * 1.8)) * -1.4 * sy
      : 0;
  const lean = p.state === 'run' ? p.facing * 0.06 : action ? p.facing * 0.045 * actionKick : 0;
  const baseFacing = source.baseFacing || 1;
  const shouldFlip = (p.facing || 1) !== baseFacing;
  const bodyAlpha = getDeathBodyAlpha(p);
  if (p.hp <= 0 && p.bodyShattered) {
    drawPlayerPlate(ctx, p, footX, footY - visualH - 6 * sy, Math.max(82, drawW * (source.plateWidth || 1.25)), sx, sy, isMe);
    return true;
  }

  ctx.save();
  ctx.globalAlpha = bodyAlpha;
  ctx.fillStyle = 'rgba(0,0,0,0.46)';
  ctx.beginPath();
  ctx.ellipse(footX, footY + 2 * sy, drawW * 0.38, 8 * sy, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isMe) {
    const aura = ctx.createRadialGradient(footX, footY - drawH * 0.45, 0, footX, footY - drawH * 0.45, drawW * 0.95);
    aura.addColorStop(0, withAlpha(ch.color || '#F5E182', 0.18));
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(footX, footY - drawH * 0.45, drawW * 0.95, 0, Math.PI * 2);
    ctx.fill();
  }

  if (source.sheet || ch.id === 'dragonfist') {
    drawDragonfistSprite(ctx, source, footX, footY, drawW, drawH, p, bob, lean, action, shouldFlip);
    ctx.restore();
  } else {
    ctx.translate(footX, footY + bob);
    ctx.rotate((p.hp <= 0 ? (p.deathAngle || 0) : 0) + lean);
    if (shouldFlip) ctx.scale(-1, 1);
    ctx.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
    drawDragonfistActionFX(ctx, action, drawW, drawH, p);
    ctx.restore();
  }

  if (p.hp > 0) drawSpriteActionOverlay(ctx, p, footX, footY, drawW, drawH, action);
  drawPlayerPlate(ctx, p, footX, footY - visualH - 6 * sy, Math.max(82, drawW * (source.plateWidth || 1.25)), sx, sy, isMe);
  return true;
}

function drawPlayer(ctx, p, sx, sy, isMe) {
  const baseX = p.x * sx, baseY = p.y * sy;
  const baseW = p.width * sx, baseH = p.height * sy;
  const w = baseW * CHARACTER_VISUAL_SCALE, h = baseH * CHARACTER_VISUAL_SCALE;
  const x = baseX + baseW / 2 - w / 2;
  const y = baseY + baseH - h;
  const ch = p.charData;
  const color = ch?.color || '#D4AF37';
  const label = getPlayerClassLabel(p);
  const t = Date.now() * 0.012;
  const bob = p.state === 'idle' ? Math.sin(t) * 1.2 * sy : 0;
  const run = p.state === 'run' ? Math.sin(t * 1.7) : 0;

  if (drawSpritePlayer(ctx, p, sx, sy, isMe)) return;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + 4 * sy, w * 0.7, 7 * sy, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isMe) {
    const aura = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w * 1.25);
    aura.addColorStop(0, withAlpha('#F5E182', 0.16));
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, w * 1.25, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.translate(x + w / 2, y + h / 2 + bob);
  if (p.facing < 0) ctx.scale(-1, 1);

  const bodyGrad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.45);
  bodyGrad.addColorStop(0, shade(color, 54));
  bodyGrad.addColorStop(0.38, color);
  bodyGrad.addColorStop(1, shade(color, -48));
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = Math.max(1, 2 * sx);

  ctx.fillStyle = shade(color, -38);
  ctx.beginPath();
  ctx.moveTo(-w * 0.28, -h * 0.18);
  ctx.quadraticCurveTo(-w * 0.48, h * 0.12, -w * 0.34, h * 0.48);
  ctx.lineTo(w * 0.24, h * 0.48);
  ctx.quadraticCurveTo(w * 0.38, h * 0.08, w * 0.26, -h * 0.2);
  ctx.closePath();
  ctx.fill();

  const legA = run * 5 * sy;
  ctx.fillStyle = shade(color, -18);
  drawRoundRect(ctx, -w * 0.22, h * 0.18, w * 0.16, h * 0.42 + legA, 4);
  ctx.fill();
  drawRoundRect(ctx, w * 0.06, h * 0.18, w * 0.16, h * 0.42 - legA, 4);
  ctx.fill();
  ctx.fillStyle = '#181113';
  drawRoundRect(ctx, -w * 0.28, h * 0.54 + legA, w * 0.27, h * 0.09, 3);
  ctx.fill();
  drawRoundRect(ctx, w * 0.02, h * 0.54 - legA, w * 0.27, h * 0.09, 3);
  ctx.fill();

  ctx.fillStyle = shade(color, -10);
  drawRoundRect(ctx, -w * 0.5, -h * 0.18 + run * 2 * sy, w * 0.16, h * 0.44, 5);
  ctx.fill();
  drawRoundRect(ctx, w * 0.34, -h * 0.18 - run * 2 * sy, w * 0.16, h * 0.44, 5);
  ctx.fill();
  ctx.fillStyle = '#211719';
  ctx.beginPath();
  ctx.arc(-w * 0.42, h * 0.27 + run * 2 * sy, w * 0.11, 0, Math.PI * 2);
  ctx.arc(w * 0.42, h * 0.27 - run * 2 * sy, w * 0.11, 0, Math.PI * 2);
  ctx.fill();

  drawRoundRect(ctx, -w * 0.34, -h * 0.25, w * 0.68, h * 0.52, 8);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.stroke();

  const breast = ctx.createLinearGradient(-w * 0.2, -h * 0.2, w * 0.22, h * 0.22);
  breast.addColorStop(0, 'rgba(255,255,255,0.32)');
  breast.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = breast;
  drawRoundRect(ctx, -w * 0.21, -h * 0.16, w * 0.42, h * 0.32, 5);
  ctx.fill();

  ctx.fillStyle = shade(color, 22);
  drawRoundRect(ctx, -w * 0.5, -h * 0.3, w * 0.25, h * 0.2, 5);
  ctx.fill();
  drawRoundRect(ctx, w * 0.25, -h * 0.3, w * 0.25, h * 0.2, 5);
  ctx.fill();

  const headGrad = ctx.createRadialGradient(-w * 0.06, -h * 0.46, 1, 0, -h * 0.39, w * 0.36);
  headGrad.addColorStop(0, shade(color, 74));
  headGrad.addColorStop(0.6, shade(color, 8));
  headGrad.addColorStop(1, shade(color, -36));
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, -h * 0.39, w * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  drawRoundRect(ctx, -w * 0.17, -h * 0.42, w * 0.34, h * 0.12, 3);
  ctx.fill();
  ctx.fillStyle = '#F8F2DC';
  ctx.fillRect(w * 0.04, -h * 0.39, w * 0.08, h * 0.04);

  drawCharacterDetails(ctx, ch, w, h, color, run);
  ctx.restore();

  const nameY = y - 11 * sy;
  const nameW = Math.max(64, w * 1.9);
  drawRoundRect(ctx, x + w / 2 - nameW / 2, nameY - 24 * sy, nameW, 20 * sy, 4);
  ctx.fillStyle = 'rgba(7,5,6,0.72)';
  ctx.fill();
  ctx.strokeStyle = isMe ? 'rgba(76, 232, 128, 0.95)' : 'rgba(255, 72, 72, 0.92)';
  ctx.lineWidth = Math.max(1, 1.35 * Math.min(sx, sy));
  ctx.stroke();

  ctx.font = `700 ${Math.max(9, 11 * Math.min(sx, sy))}px Cinzel, serif`;
  ctx.fillStyle = isMe ? '#F5E182' : '#F3E8D2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, x + w / 2, nameY - 8 * sy);

  const bw = nameW - 10;
  const bh = Math.max(4, 4 * sy);
  const bx = x + w / 2 - bw / 2;
  const by = nameY - 10 * sy;
  drawRoundRect(ctx, bx, by, bw, bh, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fill();
  const hpPct = Math.max(0, p.hp / (p.maxHp || 100));
  drawRoundRect(ctx, bx, by, bw * hpPct, bh, 3);
  ctx.fillStyle = hpPct > 0.6 ? '#39D36A' : hpPct > 0.3 ? '#FFB02E' : '#FF3D46';
  ctx.fill();
  drawHealthSegmentTicks(ctx, bx, by, bw, bh, p.maxHp || 100);

}
