// Stage definitions
// ============================================================
//  STAGES DATA
// ============================================================
const STAGES = [
  {
    id: 1, name: "Temple of Ruins",
    bg: ['#1a0a06', '#3d1a0a', '#1a0a06'],
    platforms: [
      { x: 0, y: 540, w: 2520, h: 80, color: '#4a2800' },
    ],
    fountains: [
      { x: 24, y: 418, w: 110, h: 122, teamId: 'sun' },
      { x: 2386, y: 418, w: 110, h: 122, teamId: 'moon' },
    ],
    pillars: [
      { x: 150, y: 330, w: 30, h: 210, color: '#3d2200' },
      { x: 2340, y: 330, w: 30, h: 210, color: '#3d2200' },
    ],
    decorColor: '#D4AF37',
  },
  {
    id: 2, name: "Frost Citadel",
    bg: ['#060d1a', '#0d1f3d', '#060d1a'],
    platforms: [
      { x: 0, y: 520, w: 900, h: 80, color: '#0a2040' },
      { x: 50, y: 420, w: 180, h: 18, color: '#1a4a80' },
      { x: 300, y: 370, w: 240, h: 18, color: '#1a4a80' },
      { x: 620, y: 420, w: 180, h: 18, color: '#1a4a80' },
      { x: 160, y: 280, w: 150, h: 18, color: '#0d3060' },
      { x: 540, y: 280, w: 150, h: 18, color: '#0d3060' },
      { x: 360, y: 190, w: 120, h: 18, color: '#0a2050' },
    ],
    pillars: [
      { x: 40, y: 280, w: 25, h: 240, color: '#0d2850' },
      { x: 775, y: 280, w: 25, h: 240, color: '#0d2850' },
    ],
    decorColor: '#85C1E9',
  },
  {
    id: 3, name: "Thunder Peak",
    bg: ['#0a0a1a', '#1a1a3d', '#0a0a1a'],
    platforms: [
      { x: 0, y: 520, w: 900, h: 80, color: '#1a1a40' },
      { x: 40, y: 440, w: 140, h: 18, color: '#2a2a6a' },
      { x: 260, y: 380, w: 160, h: 18, color: '#2a2a6a' },
      { x: 500, y: 310, w: 160, h: 18, color: '#2a2a6a' },
      { x: 680, y: 430, w: 140, h: 18, color: '#2a2a6a' },
      { x: 150, y: 270, w: 120, h: 18, color: '#1a1a50' },
      { x: 620, y: 240, w: 120, h: 18, color: '#1a1a50' },
      { x: 380, y: 170, w: 100, h: 18, color: '#111140' },
    ],
    pillars: [
      { x: 30, y: 260, w: 20, h: 260, color: '#151535' },
      { x: 790, y: 260, w: 20, h: 260, color: '#151535' },
      { x: 410, y: 300, w: 20, h: 220, color: '#151535' },
    ],
    decorColor: '#F1C40F',
  },
];
