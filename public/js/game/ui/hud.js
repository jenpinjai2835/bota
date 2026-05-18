// HUD, skills, scoreboard, major announcements, and chat
// ============================================================
//  HUD
// ============================================================
function buildHUD() {
  const container = document.getElementById('hud-players');
  container.innerHTML = '';

  const div = document.createElement('div');
  div.className = 'player-hud-card is-focus';
  div.id = 'focused-hud-card';
  div.innerHTML = `
    <div class="hud-focus-head">
      <span class="phud-icon" id="focus-icon"></span>
      <div class="hud-focus-title">
        <div class="phud-name" id="focus-class"></div>
        <div class="phud-char"><span id="focus-character"></span> &middot; LV <span id="focus-level">1</span></div>
      </div>
    </div>
    <div class="hud-stat-line"><span>HP</span><span id="focus-hp-text"></span></div>
    <div class="hp-bar"><div class="hp-fill high" id="focus-hp" style="width:100%"></div><div class="hp-ticks" id="focus-hp-ticks"></div></div>
    <div class="hud-stat-line mana-line"><span>MP</span><span id="focus-mana-text"></span></div>
    <div class="mana-bar"><div class="mana-fill" id="focus-mana" style="width:100%"></div></div>
  `;
  container.appendChild(div);
  buildTestModePanel();
  updateCombatStatsPanel();
}

function isTestImmortalActive() {
  return !!testModeState?.immortal;
}

function buildTestModePanel() {
  const hud = document.getElementById('hud');
  if (!hud) return;
  let panel = document.getElementById('test-mode-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'test-mode-panel';
    hud.appendChild(panel);
  }
  panel.innerHTML = `
    <div class="test-mode-title">TEST MODE</div>
    <div class="test-mode-row">
      <button type="button" class="test-mode-btn" onclick="testLevelUp()">LEVEL UP</button>
      <button type="button" class="test-mode-btn toggle" id="test-immortal-btn" onclick="toggleTestImmortal()">IMMORTAL</button>
    </div>
    <div class="test-mode-status" id="test-mode-status"></div>
  `;
  updateTestModePanel();
}

function updateTestModePanel() {
  const panel = document.getElementById('test-mode-panel');
  if (!panel) return;
  const level = myPlayer?.progression?.level || 1;
  const immortal = isTestImmortalActive();
  const immortalBtn = document.getElementById('test-immortal-btn');
  const status = document.getElementById('test-mode-status');
  if (immortalBtn) immortalBtn.classList.toggle('active', immortal);
  if (status) {
    status.textContent = `LV ${level}/${LEVEL_CONFIG.maxLevel} | ${immortal ? 'IMMORTAL ON' : 'IMMORTAL OFF'}`;
  }
}

function testLevelUp() {
  if (!myPlayer) return;
  if (!grantPlayerTestLevel(myPlayer, 1)) return;
  updateHUD();
  updateSkillsBar();
  updateTestModePanel();
  sendInput();
}

function toggleTestImmortal() {
  setTestImmortal(!isTestImmortalActive());
}

function setTestImmortal(enabled) {
  testModeState.immortal = !!enabled;
  applyTestModeRuntime();
  updateTestModePanel();
  syncTestModeToServer();
}

function syncTestModeToServer() {
  if (!myPlayer || !ws || ws.readyState !== WebSocket.OPEN) return;
  send({ type: 'test_mode', immortal: isTestImmortalActive() });
}

function applyTestModeRuntime() {
  if (!myPlayer || !isTestImmortalActive()) return;
  ensurePlayerSystems(myPlayer);
  myPlayer.hp = myPlayer.maxHp;
  myPlayer.mana = myPlayer.maxMana;
  isAlive = true;
  myPlayer.state = myPlayer.state === 'dead' ? 'idle' : myPlayer.state;
  myPlayer.deathUntil = 0;
  myPlayer.deathStartedAt = 0;
  myPlayer.deathFadeStartedAt = 0;
  myPlayer.bodyShattered = false;
  Object.keys(skillCooldowns).forEach(skillId => {
    skillCooldowns[skillId] = 0;
  });
  basicAttackReadyAt = 0;
  document.getElementById('death-overlay')?.classList.remove('visible');
}

function buildHpTicks(maxHp) {
  const count = Math.floor(maxHp / 100);
  if (count <= 1) return '';
  let html = '';
  for (let i = 1; i < count; i++) {
    html += `<span style="left:${(i * 100 / maxHp) * 100}%"></span>`;
  }
  return html;
}

function updateHUD() {
  const p = getFocusedPlayer();
  const card = document.getElementById('focused-hud-card');
  if (!p || !card) {
    updateMiniMap();
    return;
  }

  ensurePlayerSystems(p);
  const ch = p.charData || CHARACTERS.find(c => c.id === p.character) || CHARACTERS[0];
  const stats = syncPlayerStats(p) || {};
  const hpPct = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100));
  const manaPct = Math.max(0, Math.min(100, ((p.mana || 0) / (p.maxMana || 1)) * 100));

  card.classList.toggle('is-me', p.id === myPlayerId);
  card.classList.toggle('is-enemy', p.id !== myPlayerId);
  document.getElementById('focus-icon').textContent = ch.icon || '';
  document.getElementById('focus-class').textContent = getPlayerClassLabel(p);
  document.getElementById('focus-character').textContent = ch.name || p.character || 'FIGHTER';
  document.getElementById('focus-level').textContent = p.progression?.level || 1;
  document.getElementById('focus-hp-text').textContent = `${Math.max(0, Math.ceil(p.hp || 0))}/${p.maxHp || 0}`;
  document.getElementById('focus-mana-text').textContent = `${Math.max(0, Math.floor(p.mana || 0))}/${p.maxMana || getMaxMana(ch)}`;

  const hpEl = document.getElementById('focus-hp');
  if (hpEl) {
    hpEl.style.width = hpPct + '%';
    hpEl.className = 'hp-fill ' + (hpPct > 60 ? 'high' : hpPct > 30 ? 'med' : '');
  }

  const manaEl = document.getElementById('focus-mana');
  if (manaEl) manaEl.style.width = manaPct + '%';

  const ticksEl = document.getElementById('focus-hp-ticks');
  if (ticksEl && ticksEl.dataset.maxHp !== String(p.maxHp || 0)) {
    ticksEl.dataset.maxHp = String(p.maxHp || 0);
    ticksEl.innerHTML = buildHpTicks(p.maxHp || 0);
  }

  const attrsEl = document.getElementById('focus-attrs');
  if (attrsEl) {
    const attr = stats.attributes || {};
    const primary = stats.primaryAttribute || 'str';
    attrsEl.innerHTML = ['str', 'agi', 'int'].map(key => {
      const label = key.toUpperCase();
      const value = Math.floor(attr[key] || 0);
      return `<span class="${key === primary ? 'primary' : ''}">${label} ${value}</span>`;
    }).join('');
  }
  const derivedEl = document.getElementById('focus-derived');
  if (derivedEl) {
    derivedEl.innerHTML = [
      ['ATK', stats.attackDamage || 0],
      ['ARM', stats.armor || 0],
      ['AS', (stats.attackSpeed || 1).toFixed(2)],
      ['MS', Math.round((stats.speed || 0) * 60)],
      ['MR', `${Math.round((stats.magicDefense || 0) * 100)}%`],
      ['HP+', (stats.hpRegen || 0).toFixed(1)],
      ['MP+', (stats.manaRegen || 0).toFixed(1)],
    ].map(([label, value]) => `<span><b>${label}</b>${value}</span>`).join('');
  }

  updateMiniMap();
  updateCombatStatsPanel();
  updateTestModePanel();
}

function getScoreRecord(playerId) {
  const player = getPlayerById(playerId);
  const score = scores[playerId] || {};
  return {
    id: playerId,
    name: score.name || player?.name || 'Player',
    character: score.character || player?.character,
    teamId: score.teamId || player?.teamId || assignTeamId(0),
    kills: score.kills ?? Math.floor((score.score || 0) / 100),
    deaths: score.deaths || 0,
    assists: score.assists || 0,
  };
}

function getCombatStatRows() {
  const ids = new Set(Object.keys(scores));
  if (myPlayer) ids.add(myPlayer.id);
  Object.values(remotePlayers).forEach(p => ids.add(p.id));
  return Array.from(ids).map(getScoreRecord);
}

function getCharacterNameById(characterId) {
  return CHARACTERS.find(ch => ch.id === characterId)?.name || characterId || 'FIGHTER';
}

function setCombatStatsExpanded(expanded) {
  combatStatsExpanded = expanded;
  combatStatsRenderSignature = '';
  updateCombatStatsPanel();
}

function toggleMuteChat(playerId) {
  if (!playerId || playerId === myPlayerId) return;
  if (mutedChatPlayerIds.has(playerId)) {
    mutedChatPlayerIds.delete(playerId);
  } else {
    mutedChatPlayerIds.add(playerId);
  }
  combatStatsRenderSignature = '';
  updateCombatStatsPanel();
}

function updateCombatStatsPanel() {
  const panel = document.getElementById('combat-stats-panel');
  if (!panel || !gameRunning) return;
  const rows = getCombatStatRows();
  const visibleRows = combatStatsExpanded ? rows : rows.filter(row => row.id === myPlayerId);
  const teams = TEAM_DEFINITIONS.map(team => ({
    ...team,
    rows: visibleRows.filter(row => row.teamId === team.id),
  })).filter(team => combatStatsExpanded ? team.rows.length : true);
  const myRow = rows.find(row => row.id === myPlayerId);
  const signature = JSON.stringify({
    expanded: combatStatsExpanded,
    muted: Array.from(mutedChatPlayerIds).sort(),
    rows: visibleRows,
    my: myRow,
  });
  if (signature === combatStatsRenderSignature) return;
  combatStatsRenderSignature = signature;

  panel.className = `combat-stats-panel ${combatStatsExpanded ? 'expanded' : 'collapsed'}`;
  panel.innerHTML = `
    <div class="combat-stats-head">
      <button class="combat-stats-toggle" type="button" onclick="setCombatStatsExpanded(${combatStatsExpanded ? 'false' : 'true'})">${combatStatsExpanded ? 'ME' : 'ALL'}</button>
      <div>
        <div class="combat-stats-title">Battle Status</div>
        <div class="combat-stats-sub">${myRow ? `${myRow.kills} / ${myRow.deaths} / ${myRow.assists}` : '0 / 0 / 0'} K / D / A</div>
      </div>
      <div class="combat-stats-kda">K / D / A</div>
    </div>
    <div class="combat-stats-body">
      ${combatStatsExpanded ? teams.map(renderCombatStatsTeam).join('') : (myRow ? renderCombatStatsRow(myRow, true) : '')}
    </div>
  `;
}

function renderCombatStatsTeam(team) {
  return `
    <div class="combat-team-block">
      <div class="combat-team-title" style="--team-color:${team.color || '#D4AF37'}">${team.name || team.id}</div>
      ${team.rows.map(row => renderCombatStatsRow(row, false)).join('')}
    </div>
  `;
}

function renderCombatStatsRow(row, compact = false) {
  const isMe = row.id === myPlayerId;
  const muted = mutedChatPlayerIds.has(row.id);
  return `
    <div class="combat-stat-row ${isMe ? 'is-me' : ''} ${compact ? 'compact' : ''}">
      <div class="combat-stat-ident">
        <div class="combat-user">${row.name}${isMe ? ' (YOU)' : ''}</div>
        <div class="combat-char">${getCharacterNameById(row.character)}</div>
      </div>
      <div class="combat-row-kda">${row.kills} / ${row.deaths} / ${row.assists}</div>
      ${isMe ? '<div class="combat-mute-placeholder">CHAT</div>' : `<button class="combat-mute-btn ${muted ? 'muted' : ''}" type="button" onclick="toggleMuteChat('${row.id}')">${muted ? 'Unmute' : 'Mute'}</button>`}
    </div>
  `;
}

function showGameSummary(winnerTeamId) {
  const overlay = document.getElementById('game-summary');
  if (!overlay) return;
  const title = document.getElementById('game-summary-title');
  const subtitle = document.getElementById('game-summary-subtitle');
  const list = document.getElementById('game-summary-list');
  const won = winnerTeamId && myPlayer?.teamId && winnerTeamId === myPlayer.teamId;
  const winnerTeam = TEAM_DEFINITIONS.find(team => team.id === winnerTeamId);
  const rows = getCombatStatRows().sort((a, b) => {
    if (a.teamId !== b.teamId) return a.teamId === winnerTeamId ? -1 : 1;
    return (b.kills - a.kills) || (a.deaths - b.deaths) || a.name.localeCompare(b.name);
  });

  if (title) {
    title.textContent = won ? 'VICTORY' : 'DEFEAT';
    title.classList.toggle('defeat', !won);
  }
  if (subtitle) {
    subtitle.textContent = `${winnerTeam?.name || winnerTeamId || 'A team'} destroyed the Ancient`;
  }
  if (list) {
    list.innerHTML = rows.map(row => `
      <div class="game-summary-row">
        <div>
          <div class="game-summary-name">${escapeHtml(row.name)}${row.id === myPlayerId ? ' (YOU)' : ''}</div>
          <div class="game-summary-char">${escapeHtml(getCharacterNameById(row.character))}</div>
        </div>
        <div class="game-summary-kda">${row.kills} / ${row.deaths} / ${row.assists}</div>
      </div>
    `).join('');
  }
  overlay.classList.add('visible');
}

function hideGameSummary() {
  document.getElementById('game-summary')?.classList.remove('visible');
}

function returnToMainMenu() {
  hideGameSummary();
  leaveGame();
}

function updateMiniMap() {
  const canvas = document.getElementById('mini-map');
  if (!canvas || !gameRunning) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const pad = 8;
  const mapW = w - pad * 2;
  const mapH = h - pad * 2;
  const sx = mapW / WORLD_W;
  const sy = mapH / WORLD_H;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(7,5,6,0.78)';
  ctx.fillRect(0, 0, w, h);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(92,50,24,0.42)');
  grad.addColorStop(1, 'rgba(15,9,9,0.88)');
  ctx.fillStyle = grad;
  ctx.fillRect(pad, pad, mapW, mapH);

  ctx.strokeStyle = 'rgba(245,225,130,0.18)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const gx = pad + (mapW * i) / 4;
    ctx.beginPath();
    ctx.moveTo(gx, pad);
    ctx.lineTo(gx, pad + mapH);
    ctx.stroke();
  }

  const platforms = typeof getPlatforms === 'function' ? getPlatforms() : (currentStage?.platforms || []);
  platforms.forEach(plat => {
    ctx.fillStyle = 'rgba(212,175,55,0.42)';
    ctx.fillRect(
      pad + plat.x * sx,
      pad + plat.y * sy,
      Math.max(2, plat.w * sx),
      Math.max(2, plat.h * sy)
    );
    ctx.fillStyle = 'rgba(92,42,16,0.72)';
    ctx.fillRect(
      pad + plat.x * sx,
      pad + (plat.y + Math.max(2, plat.h * 0.35)) * sy,
      Math.max(2, plat.w * sx),
      Math.max(1, plat.h * sy * 0.65)
    );
  });

  matchItems.forEach(item => {
    ctx.fillStyle = item.definition?.color || '#F5E182';
    ctx.beginPath();
    ctx.arc(pad + item.x * sx, pad + item.y * sy, 2.3, 0, Math.PI * 2);
    ctx.fill();
  });

  const focused = getFocusedPlayer();
  const players = [...Object.values(remotePlayers), myPlayer].filter(Boolean);
  players.forEach(player => {
    const x = pad + (player.x + player.width / 2) * sx;
    const y = pad + (player.y + player.height / 2) * sy;
    const isMe = player.id === myPlayerId;
    const isEnemy = myPlayer && player.id !== myPlayerId && arePlayersHostile(myPlayer, player);
    const isFocused = focused?.id === player.id;
    ctx.fillStyle = isMe ? '#4CE880' : isEnemy ? '#FF3D46' : '#3D8BFF';
    ctx.beginPath();
    ctx.arc(x, y, isFocused ? 4.2 : 3.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isFocused ? '#FFFFFF' : 'rgba(0,0,0,0.75)';
    ctx.lineWidth = isFocused ? 1.8 : 1;
    ctx.stroke();
  });

  objectives.forEach(obj => {
    if (obj.hp <= 0) return;
    ctx.fillStyle = obj.teamId === myPlayer?.teamId ? 'rgba(76,232,128,0.95)' : 'rgba(255,72,72,0.95)';
    ctx.fillRect(pad + (obj.x + obj.w / 2) * sx - 2, pad + (obj.y + obj.h / 2) * sy - 2, 4, 4);
  });

  creeps.forEach(creep => {
    if (creep.hp <= 0) return;
    ctx.fillStyle = creep.teamId === myPlayer?.teamId ? '#7BF3A3' : '#FF5C5C';
    ctx.beginPath();
    ctx.arc(pad + (creep.x + creep.w / 2) * sx, pad + (creep.y + creep.h / 2) * sy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  if (myPlayer) {
    const viewW = getViewportWorldWidth();
    const viewH = WORLD_H;
    ctx.strokeStyle = 'rgba(255,255,255,0.38)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      pad + Math.max(0, CAM.x) * sx,
      pad + Math.max(0, CAM.y) * sy,
      Math.min(mapW, viewW * sx),
      Math.min(mapH, viewH * sy)
    );
  }

  ctx.strokeStyle = 'rgba(245,225,130,0.36)';
  ctx.lineWidth = 1;
  ctx.strokeRect(pad + 0.5, pad + 0.5, mapW - 1, mapH - 1);
}

function buildSkillsBar() {
  const bar = document.getElementById('skills-bar');
  bar.innerHTML = '';
  if (!myPlayer) return;
  const ch = myPlayer.charData;

  const miniPanel = document.createElement('div');
  miniPanel.className = 'hud-dock-panel minimap-panel';
  let miniMap = document.getElementById('mini-map');
  if (!miniMap) {
    miniMap = document.createElement('canvas');
    miniMap.id = 'mini-map';
    miniMap.width = 180;
    miniMap.height = 106;
    miniMap.setAttribute('aria-hidden', 'true');
  }
  miniPanel.appendChild(miniMap);
  bar.appendChild(miniPanel);

  const statPanel = document.createElement('div');
  statPanel.className = 'hud-dock-panel stat-panel';
  statPanel.innerHTML = '<div class="attr-strip" id="focus-attrs"></div><div class="derived-strip" id="focus-derived"></div>';
  bar.appendChild(statPanel);

  const detailPanel = document.createElement('div');
  detailPanel.className = 'hud-dock-panel detail-panel';
  const focusCard = document.getElementById('focused-hud-card');
  if (focusCard) detailPanel.appendChild(focusCard);
  bar.appendChild(detailPanel);

  const skillPanel = document.createElement('div');
  skillPanel.className = 'hud-dock-panel skill-panel';
  const expPanel = document.createElement('div');
  expPanel.className = 'skill-exp-panel';
  expPanel.innerHTML = '<div class="skill-exp-fill" id="skill-exp-fill" style="width:0%"></div>';
  skillPanel.appendChild(expPanel);
  const basicSkill = ch.skills.find(sk => sk.basicAttack) || ch.skills[0];
  if (basicSkill) {
    const slot = document.createElement('div');
    slot.className = 'skill-slot basic-attack-slot';
    slot.id = `skill-${basicSkill.id}`;
    slot.innerHTML = `<span class="sicon">${basicSkill.icon}</span><span class="skey">${basicSkill.key}</span><span class="skill-level" id="skill-level-${basicSkill.id}">1</span><div class="scd" id="scd-${basicSkill.id}">0</div>`;
    skillPanel.appendChild(slot);
  }
  ch.skills.filter(sk => sk.id !== basicSkill?.id).forEach(sk => {
    const slot = document.createElement('div');
    slot.className = 'skill-slot';
    slot.id = `skill-${sk.id}`;
    slot.innerHTML = `<span class="sicon">${sk.icon}</span><span class="skey">${sk.key}</span><span class="mana-cost" id="mana-cost-${sk.id}">${getSkillManaCost(sk)}</span><span class="skill-level" id="skill-level-${sk.id}">1</span><div class="scd" id="scd-${sk.id}">0</div>`;
    skillPanel.appendChild(slot);
  });
  bar.appendChild(skillPanel);
  updateHUD();
}

function updateSkillsBar() {
  if (!myPlayer) return;
  ensurePlayerSystems(myPlayer);
  applyTestModeRuntime();
  const xp = Math.max(0, Math.floor(myPlayer.progression?.xp || 0));
  const level = myPlayer.progression?.level || 1;
  const xpToNext = Math.max(1, Math.floor(myPlayer.progression?.xpToNext || getXpToNextLevel(level)));
  const xpPct = level >= LEVEL_CONFIG.maxLevel ? 100 : Math.max(0, Math.min(100, (xp / xpToNext) * 100));
  const expFillEl = document.getElementById('skill-exp-fill');
  if (expFillEl) expFillEl.style.width = `${xpPct}%`;

  const now = Date.now();
  const freeCast = isTestImmortalActive();
  myPlayer.charData.skills.forEach(sk => {
    const slot = document.getElementById(`skill-${sk.id}`);
    const cdEl = document.getElementById(`scd-${sk.id}`);
    const manaCostEl = document.getElementById(`mana-cost-${sk.id}`);
    const skillLevelEl = document.getElementById(`skill-level-${sk.id}`);
    if (!slot || !cdEl) return;
    const scaledSkill = getScaledSkill(myPlayer, sk);
    const remaining = freeCast ? 0 : skillCooldowns[sk.id] - now;
    const hasMana = freeCast || (myPlayer.mana || 0) >= getSkillManaCost(scaledSkill);
    if (manaCostEl) manaCostEl.textContent = getSkillManaCost(scaledSkill);
    if (skillLevelEl) skillLevelEl.textContent = scaledSkill.skillLevel;
    slot.classList.toggle('no-mana', !hasMana && remaining <= 0);
    if (remaining > 0) {
      slot.classList.add('on-cd');
      cdEl.textContent = Math.ceil(remaining / 1000);
    } else {
      slot.classList.remove('on-cd');
    }
  });
}

// ============================================================
//  SCOREBOARD
// ============================================================
function updateScoreboard() {
  const list = document.getElementById('score-list');
  const sorted = Object.values(scores).sort((a, b) => b.score - a.score);
  list.innerHTML = '';
  sorted.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'score-row';
    const player = s.id === myPlayerId ? myPlayer : remotePlayers[s.id];
    const label = getPlayerClassLabel(player || s);
    row.innerHTML = `<span class="rank">#${i + 1}</span><span class="sname">${label}${s.id === myPlayerId ? ' *' : ''}</span><span class="sdead">${s.kills || 0}/${s.deaths || 0}/${s.assists || 0}</span><span class="spts">${s.score || 0} pts</span>`;
    list.appendChild(row);
  });
}

// ============================================================
//  MAJOR ANNOUNCEMENTS
// ============================================================
function showKillBanner(killer, victim) {
  const banner = document.getElementById('kill-banner');
  if (!banner || !killer || !victim) return;
  const killerLabel = killer.name || getPlayerClassLabel(killer);
  const victimLabel = victim.name || getPlayerClassLabel(victim);
  banner.innerHTML = `<span>${killerLabel}</span> DEFEATED <span>${victimLabel}</span>`;
  banner.classList.remove('visible');
  void banner.offsetWidth;
  banner.classList.add('visible');
  setTimeout(() => banner.classList.remove('visible'), 2600);
}

// ============================================================
//  CHAT
// ============================================================
function addChat(from, text) {
  const log = document.getElementById('chat-log');
  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.innerHTML = `<div class="from">${from}</div><div>${text}</div>`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  if (log.children.length > 30) log.removeChild(log.firstChild);
  revealChatLog();
}

function sendChat() {
  const inp = document.getElementById('chat-input');
  if (!inp.value.trim()) {
    closeChatInput();
    return;
  }
  send({ type: 'chat', msg: inp.value.trim() });
  inp.value = '';
  closeChatInput(true);
  revealChatLog();
}

function openChatInput() {
  const container = document.getElementById('chat-container');
  const inp = document.getElementById('chat-input');
  if (chatAutoHideTimer) {
    clearTimeout(chatAutoHideTimer);
    chatAutoHideTimer = null;
  }
  container.classList.remove('chat-peek');
  container.classList.add('visible', 'chat-open');
  inp.focus();
}

function closeChatInput(keepLog = false) {
  const container = document.getElementById('chat-container');
  const inp = document.getElementById('chat-input');
  inp.blur();
  container.classList.remove('chat-open');
  if (!keepLog) container.classList.remove('visible', 'chat-peek');
}

function revealChatLog(duration = 10000) {
  const container = document.getElementById('chat-container');
  if (!container || !gameRunning) return;
  if (chatAutoHideTimer) clearTimeout(chatAutoHideTimer);
  container.classList.add('visible', 'chat-peek');
  chatAutoHideTimer = setTimeout(() => {
    if (!container.classList.contains('chat-open')) {
      container.classList.remove('visible', 'chat-peek');
    }
    chatAutoHideTimer = null;
  }, duration);
}
