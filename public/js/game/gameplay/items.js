// In-match item spawning and pickup
function hydrateMatchItem(raw) {
  const definition = MATCH_ITEM_DEFINITIONS.find(entry => entry.id === raw.type) || MATCH_ITEM_DEFINITIONS[0];
  return {
    ...raw,
    definition,
    phase: raw.phase || Math.random() * Math.PI * 2,
    expiresAt: raw.expiresAt || Date.now() + 60000,
  };
}

function resetMatchItems(initialItems = []) {
  matchItems = initialItems.map(hydrateMatchItem);
  nextMatchItemSpawnAt = Date.now() + 2800;
}

function chooseMatchItemDefinition() {
  return MATCH_ITEM_DEFINITIONS[Math.floor(Math.random() * MATCH_ITEM_DEFINITIONS.length)];
}

function getItemSpawnPoint() {
  const platforms = getPlatforms();
  const candidates = platforms.length ? platforms : [{ x: 120, y: 520, w: WORLD_W - 240, h: 16 }];
  const plat = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    x: plat.x + 28 + Math.random() * Math.max(12, plat.w - 56),
    y: plat.y - 20,
  };
}

function spawnMatchItem() {
  const definition = chooseMatchItemDefinition();
  const pos = getItemSpawnPoint();
  matchItems.push({
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: definition.id,
    definition,
    x: pos.x,
    y: pos.y,
    vy: -0.8,
    phase: Math.random() * Math.PI * 2,
    expiresAt: Date.now() + 18000,
  });
}

function updateMatchItems() {
  const now = Date.now();
  if (gameRunning && !myRoomId && matchItems.length < 4 && now >= nextMatchItemSpawnAt) {
    spawnMatchItem();
    nextMatchItemSpawnAt = now + 6500 + Math.random() * 3500;
  }

  matchItems = matchItems.filter(item => {
    item.phase += 0.08;
    item.y += Math.sin(item.phase) * 0.08;
    if (item.expiresAt <= now) return false;

    if (myPlayer && isAlive && myPlayer.hp > 0) {
      const dx = item.x - (myPlayer.x + myPlayer.width / 2);
      const dy = item.y - (myPlayer.y + myPlayer.height / 2);
      if (Math.sqrt(dx * dx + dy * dy) < 34) {
        if (myRoomId) {
          send({ type: 'item_pickup', itemId: item.id });
        } else {
          applyMatchItemToPlayer(myPlayer, item);
        }
        return false;
      }
    }
    return true;
  });
}

function handleMatchItemPicked(msg) {
  const item = hydrateMatchItem(msg.item);
  matchItems = matchItems.filter(entry => entry.id !== item.id);
  const player = msg.playerId === myPlayerId ? myPlayer : remotePlayers[msg.playerId];
  if (player) applyMatchItemToPlayer(player, item);
}

function handleMatchItemSpawned(rawItem) {
  if (!rawItem || matchItems.some(item => item.id === rawItem.id)) return;
  matchItems.push(hydrateMatchItem(rawItem));
}

function drawMatchItem(ctx, item, sx, sy) {
  const def = item.definition || MATCH_ITEM_DEFINITIONS.find(entry => entry.id === item.type);
  if (!def) return;
  const x = item.x * sx;
  const y = (item.y + Math.sin(item.phase) * 2) * sy;
  const r = Math.max(9, 11 * Math.min(sx, sy));
  ctx.save();
  ctx.shadowColor = def.color;
  ctx.shadowBlur = r * 1.4;
  ctx.fillStyle = 'rgba(8,5,7,0.82)';
  ctx.strokeStyle = def.color;
  ctx.lineWidth = Math.max(1.4, 1.6 * Math.min(sx, sy));
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = def.color;
  ctx.font = `900 ${Math.max(8, r * 0.85)}px Cinzel, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.icon, x, y + 0.5 * sy);
  ctx.restore();
}
