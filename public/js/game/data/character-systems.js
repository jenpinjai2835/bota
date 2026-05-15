// Character identity, stat profiles, match items, and teams
const STAT_PROFILE_PRESETS = {
  brawler: { maxHp: 560, attackPower: 1.02, attackSpeed: 1.05, defense: 12, speed: 5, jumpPower: 14, knockbackPower: 1.08, knockbackResist: 0.08, maxMana: 110, manaRegen: 0.32 },
  assassin: { maxHp: 500, attackPower: 1.18, defense: 5, speed: 7, jumpPower: 15, knockbackPower: 1.16, knockbackResist: 0.02, maxMana: 100, manaRegen: 0.28 },
  tank: { maxHp: 720, attackPower: 0.94, defense: 28, speed: 3, jumpPower: 11, knockbackPower: 0.92, knockbackResist: 0.28, maxMana: 90, manaRegen: 0.22 },
  ranger: { maxHp: 510, attackPower: 1.08, defense: 8, speed: 5, jumpPower: 14, knockbackPower: 1, knockbackResist: 0.05, maxMana: 105, manaRegen: 0.26 },
  mage: { maxHp: 500, attackPower: 1.14, defense: 6, speed: 4, jumpPower: 13, knockbackPower: 0.96, knockbackResist: 0.04, maxMana: 125, manaRegen: 0.36 },
  warrior: { maxHp: 590, attackPower: 1.1, defense: 14, speed: 5, jumpPower: 14, knockbackPower: 1.1, knockbackResist: 0.1, maxMana: 105, manaRegen: 0.3 },
  rogue: { maxHp: 510, attackPower: 1.15, defense: 7, speed: 6, jumpPower: 14, knockbackPower: 1.1, knockbackResist: 0.04, maxMana: 100, manaRegen: 0.28 },
  support: { maxHp: 540, attackPower: 0.98, defense: 10, speed: 5, jumpPower: 13, knockbackPower: 0.92, knockbackResist: 0.08, maxMana: 130, manaRegen: 0.38 },
  heavy: { maxHp: 680, attackPower: 1.02, defense: 24, speed: 3, jumpPower: 10, knockbackPower: 1.04, knockbackResist: 0.24, maxMana: 95, manaRegen: 0.22 },
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
  statGain: {
    maxHp: 34,
    attackPower: 0.025,
    defense: 1.1,
    speed: 0.025,
    jumpPower: 0.03,
    knockbackPower: 0.012,
    knockbackResist: 0.006,
    maxMana: 6,
    manaRegen: 0.012,
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
