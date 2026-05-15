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
  const baseStats = ch?.baseStats || {};
  const level = Math.max(1, player?.progression?.level || 1);
  const levelBonus = level - 1;
  const baseAttributes = baseStats.attributes || { str: 18, agi: 18, int: 18 };
  const attrGain = baseStats.attributeGain || LEVEL_CONFIG.attributesPerLevel || {};
  const attributes = {
    str: (baseAttributes.str || 0) + levelBonus * (attrGain.str ?? LEVEL_CONFIG.attributesPerLevel.str),
    agi: (baseAttributes.agi || 0) + levelBonus * (attrGain.agi ?? LEVEL_CONFIG.attributesPerLevel.agi),
    int: (baseAttributes.int || 0) + levelBonus * (attrGain.int ?? LEVEL_CONFIG.attributesPerLevel.int),
  };
  const now = Date.now();
  player.itemModifiers = (player.itemModifiers || []).filter(mod => !mod.expiresAt || mod.expiresAt > now);
  player.itemModifiers.forEach(mod => {
    Object.entries(mod.attributes || {}).forEach(([key, value]) => {
      if (attributes[key] !== undefined) attributes[key] += value;
    });
  });
  const derived = LEVEL_CONFIG.derived || {};
  const primaryAttribute = baseStats.primaryAttribute || 'str';
  const primaryValue = attributes[primaryAttribute] || 0;
  const baseDamage = baseStats.baseDamage || 18;
  const stats = {
    primaryAttribute,
    attributes,
    strength: attributes.str,
    agility: attributes.agi,
    intelligence: attributes.int,
    maxHp: 120 + attributes.str * (derived.hpPerStr || 22),
    hpRegen: attributes.str * (derived.hpRegenPerStr || 0.08),
    maxMana: 40 + attributes.int * (derived.manaPerInt || 12),
    manaRegen: 0.2 + attributes.int * (derived.manaRegenPerInt || 0.045),
    attackDamage: baseDamage + primaryValue,
    attackPower: 1 + primaryValue * 0.01,
    defense: (baseStats.baseArmor || 0) + attributes.agi * (derived.armorPerAgi || 0.16),
    armor: 0,
    magicDefense: (baseStats.baseMagicDefense || 0) + attributes.int * (derived.magicDefensePerInt || 0.0035),
    speed: (baseStats.speed || ch?.speed || 5) + attributes.agi * (derived.speedPerAgi || 0.018),
    jumpPower: baseStats.jumpPower || ch?.jumpPower || 13,
    knockbackPower: baseStats.knockbackPower || 1,
    knockbackResist: baseStats.knockbackResist || 0,
    attackSpeed: Math.max(0.35, 1 / (baseStats.baseAttackTime || 1.7) + attributes.agi * (derived.attackSpeedPerAgi || 0.012)),
    cooldownReduction: attributes.int * (derived.cooldownReductionPerInt || 0.0014),
  };

  player.itemModifiers.forEach(mod => {
    Object.entries(mod.stats || {}).forEach(([key, value]) => {
      stats[key] = (stats[key] || 0) + value;
    });
  });

  stats.maxHp = Math.max(MIN_CHARACTER_HP, Math.round(stats.maxHp));
  stats.maxMana = Math.max(1, Math.round(stats.maxMana));
  stats.speed = Math.max(1.5, stats.speed);
  stats.attackDamage = Math.max(1, Math.round(stats.attackDamage));
  stats.armor = Math.max(0, Math.round((stats.defense || 0) * 10) / 10);
  stats.defense = stats.armor;
  stats.magicDefense = Math.max(0, Math.min(0.75, stats.magicDefense || 0));
  stats.attackSpeed = Math.max(0.35, stats.attackSpeed || 1);
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
  const baseDamage = Math.abs(skill.damage || 0);
  const scaledDamage = skill.basicAttack
    ? Math.round(baseDamage + (stats.attackDamage || 0))
    : Math.round(baseDamage * (1 + levelBonus * 0.16) * (damageSign > 0 ? (stats.attackPower || 1) : 1));
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

function applyDefenseToDamage(target, rawDamage, damageType = 'physical') {
  if (rawDamage <= 0) return rawDamage;
  if (damageType === 'magic') {
    const resist = getPlayerStat(target, 'magicDefense');
    return Math.max(1, Math.round(rawDamage * (1 - resist)));
  }
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
