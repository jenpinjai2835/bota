// Character definitions
// ============================================================
//  CHARACTERS DATA
// ============================================================
const CHARACTERS = [
  {
    id: 'dragonfist',
    name: 'DRAGONFIST',
    class: 'Brawler',
    icon: '🐉',
    color: '#FF4500',
    sprite: {
      src: '/assets/sprites/dragonfist-padded.png',
      scale: 2.08,
      baseFacing: -1,
      sheets: {
        idle: { src: '/assets/sprites/dragonfist-idle-v2.png', cols: 4, rows: 4, frames: 16, fps: 7, scale: 3.2, baseFacing: -1, footY: 0.83, visualHeight: 0.78, plateWidth: 1.08, frameAspect: true },
        jump: { src: '/assets/sprites/dragonfist-jump.png', cols: 8, rows: 1, frames: 8, fps: 0, scale: 2.9, baseFacing: 1, footY: 0.92, visualHeight: 0.76, plateWidth: 1.08, frameAspect: true },
        run: { src: '/assets/sprites/dragonfist-run-v2.png', cols: 5, rows: 5, frames: 25, fps: 20, scale: 3.8, baseFacing: 1, footY: 0.77, visualHeight: 0.72, plateWidth: 1.08, frameAspect: true },
        attack: { src: '/assets/sprites/dragonfist-attack.png', cols: 8, rows: 1, frames: 8, fps: 18, scale: 2.8, baseFacing: 1, footY: 0.9, visualHeight: 0.72, plateWidth: 1.08, frameAspect: true },
      },
    },
    speed: 5, jumpPower: 14, maxHp: 120, maxMana: 110, manaRegen: 0.32,
    skills: [
      { id: 'punch', name: 'Dragon Punch', icon: '👊', key: 'Z', damage: 25, range: 40, cooldown: 300, manaCost: 8, type: 'melee', color: '#FF4500' },
      { id: 'flame', name: 'Flame Breath', icon: '🔥', key: 'X', damage: 18, range: 180, cooldown: 2000, manaCost: 24, type: 'projectile', color: '#FF6600' },
      { id: 'rush', name: 'Dragon Rush', icon: '💨', key: 'C', damage: 30, range: 120, cooldown: 4000, manaCost: 32, type: 'dash', color: '#FF2200' },
      { id: 'roar', name: 'Ancient Roar', icon: '🌋', key: 'V', damage: 15, range: 100, cooldown: 6000, manaCost: 45, type: 'aoe', color: '#FF8800' },
    ]
  },
  {
    id: 'shadowblade',
    name: 'SHADOWBLADE',
    class: 'Assassin',
    icon: '🗡️',
    color: '#9B59B6',
    sprite: {
      src: '/assets/sprites/shadowblade-idle.png',
      scale: 2.35,
      baseFacing: 1,
      sheets: {
        idle: { src: '/assets/sprites/shadowblade-idle.png', cols: 8, rows: 1, frames: 8, fps: 6, scale: 2.42, baseFacing: -1, footY: 0.95, visualHeight: 0.82, plateWidth: 1.08, frameAspect: true },
        jump: { src: '/assets/sprites/shadowblade-jump.png', cols: 8, rows: 1, frames: 8, fps: 0, scale: 3.55, baseFacing: 1, footY: 0.953, visualHeight: 0.6, plateWidth: 1.08, frameAspect: true },
        run: { src: '/assets/sprites/shadowblade-run.png', cols: 5, rows: 5, frames: 25, fps: 20, scale: 3.35, baseFacing: 1, footY: 0.82, visualHeight: 0.6, plateWidth: 0.5 },
        attack: { src: '/assets/sprites/shadowblade-attack.png', cols: 5, rows: 5, frames: 25, fps: 26, scale: 3.35, baseFacing: 1, footY: 0.81, visualHeight: 0.6, plateWidth: 0.5 },
      },
    },
    speed: 7, jumpPower: 15, maxHp: 80,
    skills: [
      { id: 'slash', name: 'Shadow Slash', icon: '🌑', key: 'Z', damage: 30, range: 40, cooldown: 200, type: 'melee', color: '#9B59B6' },
      { id: 'blink', name: 'Blink Strike', icon: '⚡', key: 'X', damage: 40, range: 200, cooldown: 3000, type: 'dash', color: '#BDC3F7' },
      { id: 'shadow', name: 'Shadow Clone', icon: '👥', key: 'C', damage: 20, range: 80, cooldown: 5000, type: 'aoe', color: '#6C3483' },
      { id: 'vanish', name: 'Vanish', icon: '🌫️', key: 'V', damage: 50, range: 70, cooldown: 8000, type: 'melee', color: '#7D3C98' },
    ]
  },
  {
    id: 'stoneguard',
    name: 'STONEGUARD',
    class: 'Tank',
    icon: '🛡️',
    color: '#7F8C8D',
    sprite: {
      src: '/assets/sprites/stoneguard-idle.png',
      scale: 2.58,
      baseFacing: -1,
      sheets: {
        idle: { src: '/assets/sprites/stoneguard-idle.png', cols: 8, rows: 1, frames: 8, fps: 4, scale: 2.58, baseFacing: -1, footY: 0.95, visualHeight: 0.82, plateWidth: 1.16, frameAspect: true },
        jump: { src: '/assets/sprites/stoneguard-jump.png', cols: 8, rows: 1, frames: 8, fps: 0, scale: 3.78, baseFacing: 1, footY: 0.953, visualHeight: 0.6, plateWidth: 1.16, frameAspect: true },
        run: { src: '/assets/sprites/stoneguard-run.png', cols: 5, rows: 5, frames: 25, fps: 14, scale: 3.62, baseFacing: 1, footY: 0.82, visualHeight: 0.6, plateWidth: 0.56 },
        attack: { src: '/assets/sprites/stoneguard-attack.png', cols: 5, rows: 5, frames: 25, fps: 20, scale: 3.62, baseFacing: 1, footY: 0.81, visualHeight: 0.6, plateWidth: 0.56 },
      },
    },
    speed: 3, jumpPower: 11, maxHp: 200,
    skills: [
      { id: 'smash', name: 'Stone Smash', icon: '🗿', key: 'Z', damage: 35, range: 40, cooldown: 500, type: 'melee', color: '#95A5A6' },
      { id: 'wall', name: 'Rock Wall', icon: '🧱', key: 'X', damage: 25, range: 80, cooldown: 3500, type: 'aoe', color: '#7F8C8D' },
      { id: 'charge', name: 'Bull Charge', icon: '🐗', key: 'C', damage: 45, range: 200, cooldown: 5000, type: 'dash', color: '#626567' },
      { id: 'fortress', name: 'Fortress Mode', icon: '🏰', key: 'V', damage: 0, range: 0, cooldown: 10000, type: 'buff', color: '#ABB2B9' },
    ]
  },
  {
    id: 'stormarrow',
    name: 'STORMARROW',
    class: 'Ranger',
    icon: '🏹',
    color: '#27AE60',
    sprite: {
      src: '/assets/sprites/stormarrow-idle.png',
      scale: 2.36,
      baseFacing: -1,
      sheets: {
        idle: { src: '/assets/sprites/stormarrow-idle.png', cols: 8, rows: 1, frames: 8, fps: 6, scale: 2.36, baseFacing: -1, footY: 0.95, visualHeight: 0.82, plateWidth: 1.08, frameAspect: true },
        jump: { src: '/assets/sprites/stormarrow-jump.png', cols: 8, rows: 1, frames: 8, fps: 0, scale: 3.48, baseFacing: 1, footY: 0.953, visualHeight: 0.6, plateWidth: 1.08, frameAspect: true },
        run: { src: '/assets/sprites/stormarrow-run.png', cols: 5, rows: 5, frames: 25, fps: 18, scale: 3.28, baseFacing: 1, footY: 0.82, visualHeight: 0.6, plateWidth: 0.5 },
        attack: { src: '/assets/sprites/stormarrow-attack.png', cols: 5, rows: 5, frames: 25, fps: 24, scale: 3.28, baseFacing: 1, footY: 0.81, visualHeight: 0.6, plateWidth: 0.5 },
      },
    },
    speed: 5, jumpPower: 14, maxHp: 90,
    skills: [
      { id: 'arrow', name: 'Storm Arrow', icon: '🪃', key: 'Z', damage: 22, range: 300, cooldown: 400, type: 'projectile', color: '#27AE60' },
      { id: 'volley', name: 'Arrow Volley', icon: '🌧️', key: 'X', damage: 15, range: 250, cooldown: 2500, type: 'projectile', color: '#1E8449' },
      { id: 'vine', name: 'Vine Trap', icon: '🌿', key: 'C', damage: 20, range: 200, cooldown: 4000, type: 'projectile', color: '#196F3D' },
      { id: 'eagle', name: 'Eagle Eye', icon: '🦅', key: 'V', damage: 60, range: 400, cooldown: 7000, type: 'projectile', color: '#52BE80' },
    ]
  },
  {
    id: 'pyromancer',
    name: 'PYROMANCER',
    class: 'Mage',
    icon: '🔮',
    color: '#E74C3C',
    sprite: {
      src: '/assets/sprites/pyromancer-idle.png',
      scale: 2.42,
      baseFacing: -1,
      sheets: {
        idle: { src: '/assets/sprites/pyromancer-idle.png', cols: 8, rows: 1, frames: 8, fps: 5, scale: 2.42, baseFacing: -1, footY: 0.95, visualHeight: 0.82, plateWidth: 1.1, frameAspect: true },
        jump: { src: '/assets/sprites/pyromancer-jump.png', cols: 8, rows: 1, frames: 8, fps: 0, scale: 3.55, baseFacing: 1, footY: 0.953, visualHeight: 0.6, plateWidth: 1.1, frameAspect: true },
        run: { src: '/assets/sprites/pyromancer-run.png', cols: 5, rows: 5, frames: 25, fps: 17, scale: 3.35, baseFacing: 1, footY: 0.82, visualHeight: 0.6, plateWidth: 0.52 },
        attack: { src: '/assets/sprites/pyromancer-attack.png', cols: 5, rows: 5, frames: 25, fps: 24, scale: 3.35, baseFacing: 1, footY: 0.81, visualHeight: 0.6, plateWidth: 0.52 },
      },
    },
    speed: 4, jumpPower: 13, maxHp: 85,
    skills: [
      { id: 'fireball', name: 'Fireball', icon: '🔥', key: 'Z', damage: 28, range: 280, cooldown: 600, type: 'projectile', color: '#E74C3C' },
      { id: 'meteor', name: 'Meteor Strike', icon: '☄️', key: 'X', damage: 55, range: 220, cooldown: 4000, type: 'aoe', color: '#CB4335' },
      { id: 'inferno', name: 'Inferno Ring', icon: '💥', key: 'C', damage: 30, range: 90, cooldown: 5000, type: 'aoe', color: '#F1948A' },
      { id: 'phoenix', name: 'Phoenix Rise', icon: '🦅', key: 'V', damage: 80, range: 120, cooldown: 12000, type: 'aoe', color: '#FF6B6B' },
    ]
  },
  {
    id: 'frostmage',
    name: 'FROSTMAGE',
    class: 'Mage',
    icon: '❄️',
    color: '#3498DB',
    sprite: {
      src: '/assets/sprites/frostmage-idle.png',
      scale: 2.42,
      baseFacing: -1,
      sheets: {
        idle: { src: '/assets/sprites/frostmage-idle.png', cols: 8, rows: 1, frames: 8, fps: 5, scale: 2.42, baseFacing: -1, footY: 0.95, visualHeight: 0.82, plateWidth: 1.1, frameAspect: true },
        jump: { src: '/assets/sprites/frostmage-jump.png', cols: 8, rows: 1, frames: 8, fps: 0, scale: 3.55, baseFacing: 1, footY: 0.953, visualHeight: 0.6, plateWidth: 1.1, frameAspect: true },
        run: { src: '/assets/sprites/frostmage-run.png', cols: 5, rows: 5, frames: 25, fps: 17, scale: 3.35, baseFacing: 1, footY: 0.82, visualHeight: 0.6, plateWidth: 0.52 },
        attack: { src: '/assets/sprites/frostmage-attack.png', cols: 5, rows: 5, frames: 25, fps: 24, scale: 3.35, baseFacing: 1, footY: 0.81, visualHeight: 0.6, plateWidth: 0.52 },
      },
    },
    speed: 4, jumpPower: 13, maxHp: 85,
    skills: [
      { id: 'shard', name: 'Ice Shard', icon: '🧊', key: 'Z', damage: 20, range: 260, cooldown: 400, type: 'projectile', color: '#3498DB' },
      { id: 'blizzard', name: 'Blizzard', icon: '🌨️', key: 'X', damage: 40, range: 150, cooldown: 4500, type: 'aoe', color: '#2980B9' },
      { id: 'freeze', name: 'Glacial Freeze', icon: '🏔️', key: 'C', damage: 35, range: 200, cooldown: 5000, type: 'projectile', color: '#85C1E9' },
      { id: 'glacier', name: 'Glacier Crash', icon: '⛰️', key: 'V', damage: 70, range: 120, cooldown: 9000, type: 'aoe', color: '#AED6F1' },
    ]
  },
  {
    id: 'thunderking',
    name: 'THUNDERKING',
    class: 'Warrior',
    icon: '⚡',
    color: '#F1C40F',
    sprite: {
      src: '/assets/sprites/thunderking-idle.png',
      scale: 2.5,
      baseFacing: -1,
      sheets: {
        idle: { src: '/assets/sprites/thunderking-idle.png', cols: 8, rows: 1, frames: 8, fps: 5, scale: 2.5, baseFacing: -1, footY: 0.95, visualHeight: 0.82, plateWidth: 1.12, frameAspect: true },
        jump: { src: '/assets/sprites/thunderking-jump.png', cols: 8, rows: 1, frames: 8, fps: 0, scale: 3.65, baseFacing: 1, footY: 0.953, visualHeight: 0.6, plateWidth: 1.12, frameAspect: true },
        run: { src: '/assets/sprites/thunderking-run.png', cols: 5, rows: 5, frames: 25, fps: 18, scale: 3.45, baseFacing: 1, footY: 0.82, visualHeight: 0.6, plateWidth: 0.54 },
        attack: { src: '/assets/sprites/thunderking-attack.png', cols: 5, rows: 5, frames: 25, fps: 24, scale: 3.45, baseFacing: 1, footY: 0.81, visualHeight: 0.6, plateWidth: 0.54 },
      },
    },
    speed: 5, jumpPower: 14, maxHp: 110,
    skills: [
      { id: 'bolt', name: 'Thunder Bolt', icon: '⚡', key: 'Z', damage: 27, range: 240, cooldown: 500, type: 'projectile', color: '#F1C40F' },
      { id: 'storm', name: 'Storm Surge', icon: '🌩️', key: 'X', damage: 38, range: 130, cooldown: 3000, type: 'aoe', color: '#D4AC0D' },
      { id: 'thunder', name: 'Thunder Dash', icon: '💫', key: 'C', damage: 32, range: 160, cooldown: 4000, type: 'dash', color: '#F9E79F' },
      { id: 'zeus', name: 'Zeus Wrath', icon: '🌪️', key: 'V', damage: 90, range: 180, cooldown: 11000, type: 'aoe', color: '#FCF3CF' },
    ]
  },
  {
    id: 'venomfang',
    name: 'VENOMFANG',
    class: 'Rogue',
    icon: '🐍',
    color: '#1ABC9C',
    sprite: {
      src: '/assets/sprites/venomfang-idle.png',
      scale: 2.4,
      baseFacing: -1,
      sheets: {
        idle: { src: '/assets/sprites/venomfang-idle.png', cols: 8, rows: 1, frames: 8, fps: 6, scale: 2.4, baseFacing: -1, footY: 0.95, visualHeight: 0.82, plateWidth: 1.08, frameAspect: true },
        jump: { src: '/assets/sprites/venomfang-jump.png', cols: 8, rows: 1, frames: 8, fps: 0, scale: 3.52, baseFacing: 1, footY: 0.953, visualHeight: 0.6, plateWidth: 1.08, frameAspect: true },
        run: { src: '/assets/sprites/venomfang-run.png', cols: 5, rows: 5, frames: 25, fps: 19, scale: 3.32, baseFacing: 1, footY: 0.82, visualHeight: 0.6, plateWidth: 0.5 },
        attack: { src: '/assets/sprites/venomfang-attack.png', cols: 5, rows: 5, frames: 25, fps: 25, scale: 3.32, baseFacing: 1, footY: 0.81, visualHeight: 0.6, plateWidth: 0.5 },
      },
    },
    speed: 6, jumpPower: 14, maxHp: 88,
    skills: [
      { id: 'bite', name: 'Venom Bite', icon: '🐍', key: 'Z', damage: 20, range: 40, cooldown: 300, type: 'melee', color: '#1ABC9C' },
      { id: 'poison', name: 'Poison Cloud', icon: '☁️', key: 'X', damage: 35, range: 100, cooldown: 3000, type: 'aoe', color: '#16A085' },
      { id: 'serpent', name: 'Serpent Strike', icon: '⚡', key: 'C', damage: 42, range: 160, cooldown: 5000, type: 'dash', color: '#1ABC9C' },
      { id: 'gorgon', name: 'Gorgon Gaze', icon: '👁️', key: 'V', damage: 55, range: 220, cooldown: 9000, type: 'projectile', color: '#76D7C4' },
    ]
  },
  {
    id: 'celestial',
    name: 'CELESTIAL',
    class: 'Healer',
    icon: '✨',
    color: '#E8DAEF',
    sprite: {
      src: '/assets/sprites/celestial-idle.png',
      scale: 2.42,
      baseFacing: -1,
      sheets: {
        idle: { src: '/assets/sprites/celestial-idle.png', cols: 8, rows: 1, frames: 8, fps: 5, scale: 2.42, baseFacing: -1, footY: 0.95, visualHeight: 0.82, plateWidth: 1.1, frameAspect: true },
        jump: { src: '/assets/sprites/celestial-jump.png', cols: 8, rows: 1, frames: 8, fps: 0, scale: 3.55, baseFacing: 1, footY: 0.953, visualHeight: 0.6, plateWidth: 1.1, frameAspect: true },
        run: { src: '/assets/sprites/celestial-run.png', cols: 5, rows: 5, frames: 25, fps: 17, scale: 3.35, baseFacing: 1, footY: 0.82, visualHeight: 0.6, plateWidth: 0.52 },
        attack: { src: '/assets/sprites/celestial-attack.png', cols: 5, rows: 5, frames: 25, fps: 24, scale: 3.35, baseFacing: 1, footY: 0.81, visualHeight: 0.6, plateWidth: 0.52 },
      },
    },
    speed: 5, jumpPower: 13, maxHp: 95,
    skills: [
      { id: 'light', name: 'Holy Light', icon: '☀️', key: 'Z', damage: 20, range: 220, cooldown: 400, type: 'projectile', color: '#F9E79F' },
      { id: 'nova', name: 'Holy Nova', icon: '💫', key: 'X', damage: 35, range: 110, cooldown: 3000, type: 'aoe', color: '#FEF9E7' },
      { id: 'heal', name: 'Divine Heal', icon: '💚', key: 'C', damage: -40, range: 80, cooldown: 5000, type: 'heal', color: '#82E0AA' },
      { id: 'judgment', name: 'Divine Judgment', icon: '⚖️', key: 'V', damage: 85, range: 250, cooldown: 10000, type: 'aoe', color: '#FDFEFE' },
    ]
  },
  {
    id: 'ironclad',
    name: 'IRONCLAD',
    class: 'Heavy',
    icon: '🤖',
    color: '#BDC3C7',
    sprite: {
      src: '/assets/sprites/ironclad-idle.png',
      scale: 2.62,
      baseFacing: -1,
      sheets: {
        idle: { src: '/assets/sprites/ironclad-idle.png', cols: 8, rows: 1, frames: 8, fps: 4, scale: 2.62, baseFacing: -1, footY: 0.95, visualHeight: 0.82, plateWidth: 1.18, frameAspect: true },
        jump: { src: '/assets/sprites/ironclad-jump.png', cols: 8, rows: 1, frames: 8, fps: 0, scale: 3.82, baseFacing: 1, footY: 0.953, visualHeight: 0.6, plateWidth: 1.18, frameAspect: true },
        run: { src: '/assets/sprites/ironclad-run.png', cols: 5, rows: 5, frames: 25, fps: 13, scale: 3.65, baseFacing: 1, footY: 0.82, visualHeight: 0.6, plateWidth: 0.58 },
        attack: { src: '/assets/sprites/ironclad-attack.png', cols: 5, rows: 5, frames: 25, fps: 20, scale: 3.65, baseFacing: 1, footY: 0.81, visualHeight: 0.6, plateWidth: 0.58 },
      },
    },
    speed: 3, jumpPower: 10, maxHp: 180,
    skills: [
      { id: 'cannon', name: 'Iron Cannon', icon: '💣', key: 'Z', damage: 40, range: 320, cooldown: 800, type: 'projectile', color: '#7F8C8D' },
      { id: 'slam', name: 'Ground Slam', icon: '💢', key: 'X', damage: 50, range: 120, cooldown: 4000, type: 'aoe', color: '#95A5A6' },
      { id: 'missile', name: 'Rocket Barrage', icon: '🚀', key: 'C', damage: 60, range: 280, cooldown: 6000, type: 'projectile', color: '#AEB6BF' },
      { id: 'overdrive', name: 'Overdrive', icon: '⚙️', key: 'V', damage: 100, range: 100, cooldown: 15000, type: 'aoe', color: '#D0D3D4' },
    ]
  },
];
