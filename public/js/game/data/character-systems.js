// Character identity, stat profiles, match items, and teams
const STAT_PROFILE_PRESETS = {
  brawler: { primaryAttribute: 'str', attributes: { str: 24, agi: 15, int: 13 }, attributeGain: { str: 3.2, agi: 1.8, int: 1.5 }, baseDamage: 22, baseArmor: 1.5, baseMagicDefense: 0.08, baseAttackTime: 1.7, speed: 5, jumpPower: 14, knockbackPower: 1.08, knockbackResist: 0.08 },
  assassin: { primaryAttribute: 'agi', attributes: { str: 17, agi: 25, int: 14 }, attributeGain: { str: 2.0, agi: 3.4, int: 1.7 }, baseDamage: 18, baseArmor: 1, baseMagicDefense: 0.06, baseAttackTime: 1.55, speed: 7, jumpPower: 15, knockbackPower: 1.16, knockbackResist: 0.02 },
  tank: { primaryAttribute: 'str', attributes: { str: 30, agi: 10, int: 12 }, attributeGain: { str: 3.7, agi: 1.2, int: 1.4 }, baseDamage: 20, baseArmor: 2.5, baseMagicDefense: 0.1, baseAttackTime: 1.8, speed: 3, jumpPower: 11, knockbackPower: 0.92, knockbackResist: 0.28 },
  ranger: { primaryAttribute: 'agi', attributes: { str: 18, agi: 23, int: 16 }, attributeGain: { str: 2.1, agi: 3.0, int: 1.9 }, baseDamage: 20, baseArmor: 1, baseMagicDefense: 0.07, baseAttackTime: 1.65, speed: 5, jumpPower: 14, knockbackPower: 1, knockbackResist: 0.05 },
  mage: { primaryAttribute: 'int', attributes: { str: 17, agi: 14, int: 25 }, attributeGain: { str: 1.9, agi: 1.5, int: 3.4 }, baseDamage: 17, baseArmor: 0.5, baseMagicDefense: 0.1, baseAttackTime: 1.7, speed: 4, jumpPower: 13, knockbackPower: 0.96, knockbackResist: 0.04 },
  warrior: { primaryAttribute: 'str', attributes: { str: 23, agi: 18, int: 15 }, attributeGain: { str: 2.8, agi: 2.2, int: 1.8 }, baseDamage: 21, baseArmor: 1.5, baseMagicDefense: 0.08, baseAttackTime: 1.7, speed: 5, jumpPower: 14, knockbackPower: 1.1, knockbackResist: 0.1 },
  rogue: { primaryAttribute: 'agi', attributes: { str: 18, agi: 24, int: 15 }, attributeGain: { str: 2.0, agi: 3.2, int: 1.7 }, baseDamage: 19, baseArmor: 1, baseMagicDefense: 0.07, baseAttackTime: 1.6, speed: 6, jumpPower: 14, knockbackPower: 1.1, knockbackResist: 0.04 },
  support: { primaryAttribute: 'int', attributes: { str: 19, agi: 15, int: 24 }, attributeGain: { str: 2.2, agi: 1.6, int: 3.1 }, baseDamage: 16, baseArmor: 1, baseMagicDefense: 0.12, baseAttackTime: 1.72, speed: 5, jumpPower: 13, knockbackPower: 0.92, knockbackResist: 0.08 },
  heavy: { primaryAttribute: 'str', attributes: { str: 28, agi: 11, int: 13 }, attributeGain: { str: 3.4, agi: 1.3, int: 1.5 }, baseDamage: 23, baseArmor: 2, baseMagicDefense: 0.09, baseAttackTime: 1.85, speed: 3, jumpPower: 10, knockbackPower: 1.04, knockbackResist: 0.24 },
};

const CHARACTER_IDENTITIES = {
  dragonfist: { archetype: 'brawler', role: 'Bruiser', laneRole: 'Frontline Duelist', passiveId: 'dragon_spirit', tags: ['melee', 'knockback', 'burst'] },
  shadowblade: { archetype: 'assassin', role: 'Assassin', laneRole: 'Flanker', passiveId: 'backstab_instinct', tags: ['melee', 'mobility', 'burst'] },
  stoneguard: { archetype: 'tank', role: 'Tank', laneRole: 'Anchor', passiveId: 'stone_skin', tags: ['durable', 'control'] },
  stormarrow: { archetype: 'ranger', role: 'Ranger', laneRole: 'Marksman', passiveId: 'storm_focus', tags: ['ranged', 'poke'] },
  pyromancer: { archetype: 'mage', role: 'Mage', laneRole: 'Area Nuker', passiveId: 'ember_flow', tags: ['ranged', 'aoe'] },
  frostmage: { archetype: 'mage', role: 'Mage', laneRole: 'Control Mage', passiveId: 'frostbite', tags: ['ranged', 'control'] },
  thunderking: { archetype: 'warrior', role: 'Warrior', laneRole: 'Initiator', passiveId: 'storm_charge', tags: ['melee', 'dash'] },
  venomfang: { archetype: 'rogue', role: 'Rogue', laneRole: 'Skirmisher', passiveId: 'venom_edge', tags: ['melee', 'damage_over_time'] },
  celestial: { archetype: 'support', role: 'Support', laneRole: 'Healer', passiveId: 'divine_grace', tags: ['support', 'heal'] },
  ironclad: { archetype: 'heavy', role: 'Heavy', laneRole: 'Siege Tank', passiveId: 'iron_frame', tags: ['durable', 'projectile'] },
};

const LEVEL_CONFIG = {
  maxLevel: 25,
  baseXpToNext: 100,
  xpGrowth: 55,
  skillLevelEvery: 3,
  maxSkillLevel: 4,
  attributesPerLevel: { str: 2.3, agi: 2.0, int: 1.8 },
  derived: {
    hpPerStr: 22,
    hpRegenPerStr: 0.08,
    manaPerInt: 12,
    manaRegenPerInt: 0.045,
    armorPerAgi: 0.16,
    attackSpeedPerAgi: 0.012,
    speedPerAgi: 0.018,
    magicDefensePerInt: 0.0035,
    cooldownReductionPerInt: 0.0014,
  },
};

const MATCH_ITEM_DEFINITIONS = [
  { id: 'healing_orb', label: 'Heal', color: '#46E37D', icon: '+', kind: 'instant', healPct: 0.2 },
  { id: 'mana_orb', label: 'Mana', color: '#54B6FF', icon: '*', kind: 'instant', manaPct: 0.28 },
  { id: 'power_rune', label: 'Power', color: '#FFB13B', icon: 'P', kind: 'buff', duration: 9000, stats: { attackPower: 0.18, knockbackPower: 0.12 } },
  { id: 'guard_rune', label: 'Guard', color: '#D6DCE8', icon: 'G', kind: 'buff', duration: 9000, stats: { defense: 18, knockbackResist: 0.16 } },
  { id: 'haste_rune', label: 'Haste', color: '#E8D15C', icon: 'H', kind: 'buff', duration: 8000, stats: { speed: 1.4, cooldownReduction: 0.16 } },
];

const TEAM_DEFINITIONS = [
  { id: 'sun', name: 'Sun Team', color: '#E44747', spawnIndexes: [0, 3] },
  { id: 'moon', name: 'Moon Team', color: '#3D8BFF', spawnIndexes: [2, 4] },
];

function applyCharacterIdentityDefaults() {
  CHARACTERS.forEach(ch => {
    const identity = CHARACTER_IDENTITIES[ch.id] || { archetype: 'brawler', role: ch.class, laneRole: ch.class, tags: [] };
    const stats = STAT_PROFILE_PRESETS[identity.archetype] || STAT_PROFILE_PRESETS.brawler;
    ch.identity = identity;
    ch.baseStats = { ...stats };
    ch.maxHp = Math.max(500, ch.baseStats.maxHp || ch.maxHp || 100);
    ch.maxMana = ch.baseStats.maxMana || ch.maxMana || 100;
    ch.manaRegen = ch.baseStats.manaRegen || ch.manaRegen || 0.24;
  });
  const dragonfist = CHARACTERS.find(ch => ch.id === 'dragonfist');
  if (dragonfist) {
    const balance = {
      punch: { name: 'Dragon Strike', damage: 20, cooldown: 760, manaCost: 0, basicAttack: true, attackWindup: 170 },
      flame: { damage: 28, cooldown: 3200, manaCost: 32, attackWindup: 320 },
      rush: { damage: 36, cooldown: 5200, manaCost: 42, attackWindup: 210 },
      roar: { damage: 24, cooldown: 7800, manaCost: 58, attackWindup: 500 },
    };
    dragonfist.skills.forEach(skill => Object.assign(skill, balance[skill.id] || {}));
  }
}

applyCharacterIdentityDefaults();
