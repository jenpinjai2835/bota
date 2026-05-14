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
      <div class="phud-score" id="focus-score">0</div>
    </div>
    <div class="hud-stat-line"><span>HP</span><span id="focus-hp-text"></span></div>
    <div class="hp-bar"><div class="hp-fill high" id="focus-hp" style="width:100%"></div><div class="hp-ticks" id="focus-hp-ticks"></div></div>
    <div class="hud-stat-line mana-line"><span>MP</span><span id="focus-mana-text"></span></div>
    <div class="mana-bar"><div class="mana-fill" id="focus-mana" style="width:100%"></div></div>
  `;
  container.appendChild(div);
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
  if (!p || !card) return;

  ensurePlayerSystems(p);
  const ch = p.charData || CHARACTERS.find(c => c.id === p.character) || CHARACTERS[0];
  const hpPct = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100));
  const manaPct = Math.max(0, Math.min(100, ((p.mana || 0) / (p.maxMana || 1)) * 100));

  card.classList.toggle('is-me', p.id === myPlayerId);
  card.classList.toggle('is-enemy', p.id !== myPlayerId);
  document.getElementById('focus-icon').textContent = ch.icon || '';
  document.getElementById('focus-class').textContent = getPlayerClassLabel(p);
  document.getElementById('focus-character').textContent = ch.name || p.character || 'FIGHTER';
  document.getElementById('focus-level').textContent = p.progression?.level || 1;
  document.getElementById('focus-score').textContent = scores[p.id]?.score || 0;
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
}

function buildSkillsBar() {
  const bar = document.getElementById('skills-bar');
  bar.innerHTML = '';
  if (!myPlayer) return;
  const ch = myPlayer.charData;
  ch.skills.forEach(sk => {
    const slot = document.createElement('div');
    slot.className = 'skill-slot';
    slot.id = `skill-${sk.id}`;
    slot.innerHTML = `<span class="sicon">${sk.icon}</span><span class="skey">${sk.key}</span><span class="mana-cost" id="mana-cost-${sk.id}">${getSkillManaCost(sk)}</span><span class="skill-level" id="skill-level-${sk.id}">1</span><div class="scd" id="scd-${sk.id}">0</div>`;
    bar.appendChild(slot);
  });
}

function updateSkillsBar() {
  if (!myPlayer) return;
  const now = Date.now();
  myPlayer.charData.skills.forEach(sk => {
    const slot = document.getElementById(`skill-${sk.id}`);
    const cdEl = document.getElementById(`scd-${sk.id}`);
    const manaCostEl = document.getElementById(`mana-cost-${sk.id}`);
    const skillLevelEl = document.getElementById(`skill-level-${sk.id}`);
    if (!slot || !cdEl) return;
    const scaledSkill = getScaledSkill(myPlayer, sk);
    const remaining = skillCooldowns[sk.id] - now;
    const hasMana = (myPlayer.mana || 0) >= getSkillManaCost(scaledSkill);
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
    row.innerHTML = `<span class="rank">#${i + 1}</span><span class="sname">${label}${s.id === myPlayerId ? ' *' : ''}</span><span class="sdead">KO ${s.deaths || 0}</span><span class="spts">${s.score} pts</span>`;
    list.appendChild(row);
  });
}

// ============================================================
//  MAJOR ANNOUNCEMENTS
// ============================================================
function showKillBanner(killer, victim) {
  const banner = document.getElementById('kill-banner');
  if (!banner || !killer || !victim) return;
  const killerLabel = getPlayerClassLabel(killer);
  const victimLabel = getPlayerClassLabel(victim);
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
}

function sendChat() {
  const inp = document.getElementById('chat-input');
  if (!inp.value.trim()) {
    closeChatInput();
    return;
  }
  send({ type: 'chat', msg: inp.value.trim() });
  inp.value = '';
  closeChatInput();
}

function openChatInput() {
  const container = document.getElementById('chat-container');
  const inp = document.getElementById('chat-input');
  container.classList.add('visible', 'chat-open');
  inp.focus();
}

function closeChatInput() {
  const container = document.getElementById('chat-container');
  const inp = document.getElementById('chat-input');
  inp.blur();
  container.classList.remove('chat-open');
}
