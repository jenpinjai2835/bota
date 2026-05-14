// Stat, level, skill scaling, items, and team helpers
function createProgressionState() {
  return {
    level: 1,
    xp: 0,
    xpToNext: getXpToNextLevel(1),
    skillPoints: 0,
    skillLevels: {},
  };
}

function getXpToNextLevel(level) {
  return LEVEL_CONFIG.baseXpToNext + (level - 1) * LEVEL_CONFIG.xpGrowth;
}

function ensurePlayerSystems(player) {
  if (!player) return null;
  if (!player.progression) player.progression = createProgressionState();
  if (!player.itemModifiers) player.itemModifiers = [];
  if (!player.teamId) player.teamId = assignTeamId(0);
  player.charData = player.charData || CHARACTERS.find(ch => ch.id === player.character) || CHARACTERS[0];
  player.charData.skills.forEach(skill => {
    if (!player.progression.skillLevels[skill.id]) player.progression.skillLevels[skill.id] = 1;
  });
  syncPlayerStats(player);
  return player;
}

function assignTeamId(index) {
  return TEAM_DEFINITIONS[index % TEAM_DEFINITIONS.length]?.id || 'sun';
}

function getPlayerTeam(player) {
  return TEAM_DEFINITIONS.find(team => team.id === player?.teamId) || TEAM_DEFINITIONS[0];
}

function arePlayersHostile(a, b) {
  if (!a || !b) return true;
  if (!a.teamId || !b.teamId) return true;
  return a.teamId !== b.teamId;
}

function calculatePlayerStats(player) {
  const ch = player?.charData || CHARACTERS.find(c => c.id === player?.character) || CHARACTERS[0];
  const stats = {
    maxHp: getCharacterMaxHp(ch),
    attackPower: ch?.baseStats?.attackPower || 1,
    defense: ch?.baseStats?.defense || 0,
    speed: ch?.baseStats?.speed || ch?.speed || 5,
    jumpPower: ch?.baseStats?.jumpPower || ch?.jumpPower || 13,
    knockbackPower: ch?.baseStats?.knockbackPower || 1,
    knockbackResist: ch?.baseStats?.knockbackResist || 0,
    maxMana: ch?.baseStats?.maxMana || getMaxMana(ch),
    manaRegen: ch?.baseStats?.manaRegen || getManaRegen(ch),
    cooldownReduction: 0,
  };

  const level = Math.max(1, player?.progression?.level || 1);
  const gains = LEVEL_CONFIG.statGain;
  for (let i = 1; i < level; i++) {
    Object.entries(gains).forEach(([key, value]) => {
      stats[key] = (stats[key] || 0) + value;
    });
  }

  const now = Date.now();
  player.itemModifiers = (player.itemModifiers || []).filter(mod => !mod.expiresAt || mod.expiresAt > now);
  player.itemModifiers.forEach(mod => {
    Object.entries(mod.stats || {}).forEach(([key, value]) => {
      stats[key] = (stats[key] || 0) + value;
    });
  });

  stats.maxHp = Math.max(MIN_CHARACTER_HP, Math.round(stats.maxHp));
  stats.maxMana = Math.max(1, Math.round(stats.maxMana));
  stats.speed = Math.max(1.5, stats.speed);
  stats.jumpPower = Math.max(6, stats.jumpPower);
  stats.cooldownReduction = Math.max(0, Math.min(0.5, stats.cooldownReduction || 0));
  stats.knockbackResist = Math.max(0, Math.min(0.75, stats.knockbackResist || 0));
  return stats;
}

function syncPlayerStats(player) {
  if (!player) return null;
  const oldMaxHp = player.maxHp || 0;
  const oldMaxMana = player.maxMana || 0;
  const stats = calculatePlayerStats(player);
  player.stats = stats;
  player.maxHp = stats.maxHp;
  player.maxMana = stats.maxMana;
  if (typeof player.hp !== 'number') player.hp = player.maxHp;
  if (oldMaxHp && player.hp > 0 && oldMaxHp !== player.maxHp) player.hp = Math.min(player.maxHp, player.hp + Math.max(0, player.maxHp - oldMaxHp));
  if (typeof player.mana !== 'number') player.mana = player.maxMana;
  if (oldMaxMana && oldMaxMana !== player.maxMana) player.mana = Math.min(player.maxMana, player.mana + Math.max(0, player.maxMana - oldMaxMana));
  return stats;
}

function getPlayerStat(player, key) {
  return (syncPlayerStats(player) || {})[key] || 0;
}

function getSkillLevel(player, skill) {
  ensurePlayerSystems(player);
  const manualLevel = player?.progression?.skillLevels?.[skill?.id] || 1;
  const autoLevel = 1 + Math.floor(((player?.progression?.level || 1) - 1) / LEVEL_CONFIG.skillLevelEvery);
  return Math.max(1, Math.min(LEVEL_CONFIG.maxSkillLevel, Math.max(manualLevel, autoLevel)));
}

function getScaledSkill(player, skill) {
  if (!skill) return null;
  const stats = syncPlayerStats(player) || {};
  const level = getSkillLevel(player, skill);
  const levelBonus = level - 1;
  const damageSign = skill.damage < 0 ? -1 : 1;
  const scaledDamage = Math.round(Math.abs(skill.damage || 0) * (1 + levelBonus * 0.16) * (damageSign > 0 ? (stats.attackPower || 1) : 1));
  return {
    ...skill,
    baseSkill: skill,
    skillLevel: level,
    damage: scaledDamage * damageSign,
    range: Math.round((skill.range || 0) * (1 + levelBonus * 0.07)),
    cooldown: Math.max(120, Math.round((skill.cooldown || 0) * (1 - (stats.cooldownReduction || 0)) * (1 - levelBonus * 0.035))),
    manaCost: Math.max(0, Math.round(getSkillManaCost(skill) * (1 + levelBonus * 0.05))),
  };
}

function applyDefenseToDamage(target, rawDamage) {
  if (rawDamage <= 0) return rawDamage;
  const defense = getPlayerStat(target, 'defense');
  return Math.max(1, Math.round(rawDamage * (100 / (100 + defense))));
}

function grantPlayerXp(player, amount) {
  if (!player || amount <= 0) return;
  ensurePlayerSystems(player);
  const progress = player.progression;
  progress.xp += amount;
  let leveled = false;
  while (progress.level < LEVEL_CONFIG.maxLevel && progress.xp >= progress.xpToNext) {
    progress.xp -= progress.xpToNext;
    progress.level++;
    progress.skillPoints++;
    progress.xpToNext = getXpToNextLevel(progress.level);
    leveled = true;
  }
  if (leveled) {
    syncPlayerStats(player);
    spawnEffect(
      player.x + player.width / 2,
      player.y + player.height * 0.35,
      'level-up',
      '#C783FF',
      46,
      { followPlayerId: player.id, followYOffsetRatio: 0.35 }
    );
  }
}

function applyMatchItemToPlayer(player, item) {
  if (!player || !item) return;
  ensurePlayerSystems(player);
  const def = item.definition || MATCH_ITEM_DEFINITIONS.find(entry => entry.id === item.type);
  if (!def) return;
  if (def.healPct) player.hp = Math.min(player.maxHp, player.hp + player.maxHp * def.healPct);
  if (def.manaPct) player.mana = Math.min(player.maxMana, (player.mana || 0) + player.maxMana * def.manaPct);
  if (def.stats) {
    player.itemModifiers.push({
      id: `${def.id}_${Date.now()}`,
      itemId: def.id,
      stats: { ...def.stats },
      expiresAt: Date.now() + (def.duration || 8000),
    });
  }
  syncPlayerStats(player);
  spawnEffect(player.x + player.width / 2, player.y + player.height * 0.45, def.id, def.color, 34);
}
