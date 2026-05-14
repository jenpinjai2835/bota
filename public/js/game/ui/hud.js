// HUD, skills, scoreboard, and chat
// ============================================================
//  HUD
// ============================================================
function buildHUD(state) {
  const container = document.getElementById('hud-players');
  container.innerHTML = '';
  state.players.forEach(p => {
    const ch = CHARACTERS.find(c => c.id === p.character) || CHARACTERS[0];
    const maxHp = Math.max(p.maxHp || 0, getCharacterMaxHp(ch));
    const div = document.createElement('div');
    div.className = 'player-hud-card' + (p.id === myPlayerId ? ' is-me' : '');
    div.id = `hud-${p.id}`;
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:16px">${ch.icon}</span>
        <div>
          <div class="phud-name">${getPlayerClassLabel({ ...p, charData: ch })}</div>
          <div class="phud-char">${ch.name} · LV <span id="level-${p.id}">1</span></div>
        </div>
        <div class="phud-score" style="margin-left:auto" id="score-${p.id}">0</div>
      </div>
      <div class="hud-stat-line"><span>HP</span><span id="hp-text-${p.id}"></span></div>
      <div class="hp-bar"><div class="hp-fill high" id="hp-${p.id}" style="width:100%"></div>${buildHpTicks(maxHp)}</div>
      <div class="hud-stat-line mana-line"><span>MP</span><span id="mana-text-${p.id}">${getMaxMana(ch)}/${getMaxMana(ch)}</span></div>
      <div class="mana-bar"><div class="mana-fill" id="mana-${p.id}" style="width:100%"></div></div>
    `;
    container.appendChild(div);
  });
}

function buildHpTicks(maxHp) {
  const count = Math.floor(maxHp / 100);
  if (count <= 1) return '';
  let html = '<div class="hp-ticks">';
  for (let i = 1; i < count; i++) {
    html += `<span style="left:${(i * 100 / maxHp) * 100}%"></span>`;
  }
  return `${html}</div>`;
}

function updateHUD() {
  const allPlayers = myPlayer ? [myPlayer, ...Object.values(remotePlayers)] : Object.values(remotePlayers);
  allPlayers.forEach(p => {
    const hpEl = document.getElementById(`hp-${p.id}`);
    const hpText = document.getElementById(`hp-text-${p.id}`);
    const manaEl = document.getElementById(`mana-${p.id}`);
    const manaText = document.getElementById(`mana-text-${p.id}`);
    const scoreEl = document.getElementById(`score-${p.id}`);
    const levelEl = document.getElementById(`level-${p.id}`);
    ensurePlayerSystems(p);
    if (hpEl) {
      const pct = Math.max(0, (p.hp / p.maxHp) * 100);
      hpEl.style.width = pct + '%';
      hpEl.className = 'hp-fill ' + (pct > 60 ? 'high' : pct > 30 ? 'med' : '');
    }
    if (hpText) hpText.textContent = '';
    if (manaEl) {
      const pct = Math.max(0, (p.mana / p.maxMana) * 100);
      manaEl.style.width = pct + '%';
    }
    if (manaText) manaText.textContent = `${Math.max(0, Math.floor(p.mana || 0))}/${p.maxMana || getMaxMana(p.charData)}`;
    if (scoreEl && scores[p.id]) scoreEl.textContent = scores[p.id].score;
    if (levelEl) levelEl.textContent = p.progression?.level || 1;
  });
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
    row.innerHTML = `<span class="rank">#${i+1}</span><span class="sname">${label}${s.id === myPlayerId ? ' ★' : ''}</span><span class="sdead">💀 ${s.deaths || 0}</span><span class="spts">${s.score} pts</span>`;
    list.appendChild(row);
  });
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
  if (!inp.value.trim()) return;
  send({ type: 'chat', msg: inp.value.trim() });
  inp.value = '';
}
