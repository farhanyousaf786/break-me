import { ARENA } from './arena'

export type ObstacleKind = 'block' | 'hazard'

export type ObstacleDef = {
  id: string
  kind: ObstacleKind
  x: number
  y: number
  w: number
  h: number
  /** Horizontal patrol speed */
  vx?: number
  /** Vertical patrol speed */
  vy?: number
  minX?: number
  maxX?: number
  minY?: number
  maxY?: number
}

export type LevelTheme = {
  floor: string
  wallA: string
  wallB: string
  accent: string
}

export type LevelConfig = {
  id: number
  name: string
  blurb: string
  tier: 'Easy' | 'Medium' | 'Hard'
  blueSpin: number
  redSpin: number
  aiReload: number
  aiFirstShot: number
  recoilScale: number
  bulletSpeed: number
  /** pass = leave arena; bounce = ricochet off walls (like Pistol Duel) */
  bulletMode: 'pass' | 'bounce'
  /** Max wall/obstacle bounces before bullet dies (bounce mode) */
  maxBounces: number
  blueStart: { x: number; y: number }
  redStart: { x: number; y: number }
  obstacles: ObstacleDef[]
  theme: LevelTheme
}

const W = ARENA.width
const H = ARENA.height
const wall = ARENA.wall

/** 10 unique arenas — inspired by Pistol Duel stage variety */
export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'Open Arena',
    blurb: 'Empty box — learn recoil',
    tier: 'Easy',
    blueSpin: 0.85,
    redSpin: -0.8,
    aiReload: 2.8,
    aiFirstShot: 2.6,
    recoilScale: 0.85,
    bulletSpeed: 400,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 70, y: H * 0.55 },
    redStart: { x: W - wall - 70, y: H * 0.35 },
    obstacles: [],
    theme: {
      floor: '#2a2d33',
      wallA: '#c9a227',
      wallB: '#e6c65c',
      accent: '#f2d56b',
    },
  },
  {
    id: 2,
    name: 'Center Pillar',
    blurb: 'Gold block blocks your shot',
    tier: 'Easy',
    blueSpin: 0.95,
    redSpin: -0.95,
    aiReload: 2.5,
    aiFirstShot: 2.3,
    recoilScale: 0.9,
    bulletSpeed: 430,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 65, y: H * 0.62 },
    redStart: { x: W - wall - 65, y: H * 0.28 },
    obstacles: [
      { id: 'pillar', kind: 'block', x: W / 2 - 28, y: H / 2 - 50, w: 56, h: 100 },
    ],
    theme: {
      floor: '#262a32',
      wallA: '#b8922a',
      wallB: '#dfc056',
      accent: '#ffe08a',
    },
  },
  {
    id: 3,
    name: 'Side Shelves',
    blurb: 'Ledges split the arena',
    tier: 'Easy',
    blueSpin: 1.05,
    redSpin: -1.1,
    aiReload: 2.3,
    aiFirstShot: 2.1,
    recoilScale: 0.95,
    bulletSpeed: 450,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 60, y: H * 0.7 },
    redStart: { x: W - wall - 60, y: H * 0.25 },
    obstacles: [
      { id: 'shelfL', kind: 'block', x: wall, y: H * 0.42, w: 130, h: 22 },
      { id: 'shelfR', kind: 'block', x: W - wall - 130, y: H * 0.58, w: 130, h: 22 },
    ],
    theme: {
      floor: '#243038',
      wallA: '#8fbf6a',
      wallB: '#c5e09a',
      accent: '#b8e986',
    },
  },
  {
    id: 4,
    name: 'Ricochet Room',
    blurb: 'Bullets bounce off walls!',
    tier: 'Medium',
    blueSpin: 1.15,
    redSpin: -1.2,
    aiReload: 2.2,
    aiFirstShot: 2.0,
    recoilScale: 1.0,
    bulletSpeed: 480,
    bulletMode: 'bounce',
    maxBounces: 5,
    blueStart: { x: wall + 70, y: H * 0.65 },
    redStart: { x: W - wall - 70, y: H * 0.3 },
    obstacles: [],
    theme: {
      floor: '#1e2838',
      wallA: '#5ec8ff',
      wallB: '#9ad8ff',
      accent: '#7ed0ff',
    },
  },
  {
    id: 5,
    name: 'Tight Cage',
    blurb: 'Smaller fight space',
    tier: 'Medium',
    blueSpin: 1.25,
    redSpin: -1.35,
    aiReload: 2.0,
    aiFirstShot: 1.7,
    recoilScale: 1.05,
    bulletSpeed: 500,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 95, y: H * 0.58 },
    redStart: { x: W - wall - 95, y: H * 0.38 },
    obstacles: [
      { id: 'padL', kind: 'block', x: wall, y: wall, w: 55, h: H - wall * 2 },
      { id: 'padR', kind: 'block', x: W - wall - 55, y: wall, w: 55, h: H - wall * 2 },
      { id: 'padT', kind: 'block', x: wall + 55, y: wall, w: W - wall * 2 - 110, h: 70 },
      { id: 'padB', kind: 'block', x: wall + 55, y: H - wall - 70, w: W - wall * 2 - 110, h: 70 },
    ],
    theme: {
      floor: '#2c2430',
      wallA: '#d48a3a',
      wallB: '#f0b86a',
      accent: '#ffb86b',
    },
  },
  {
    id: 6,
    name: 'Sweeping Bar',
    blurb: 'Moving wall — dodge it',
    tier: 'Medium',
    blueSpin: 1.3,
    redSpin: -1.4,
    aiReload: 1.85,
    aiFirstShot: 1.5,
    recoilScale: 1.1,
    bulletSpeed: 520,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 70, y: H * 0.72 },
    redStart: { x: W - wall - 70, y: H * 0.22 },
    obstacles: [
      {
        id: 'sweeper',
        kind: 'block',
        x: wall + 40,
        y: H * 0.48,
        w: 120,
        h: 26,
        vx: 110,
        minX: wall + 20,
        maxX: W - wall - 140,
      },
    ],
    theme: {
      floor: '#22282f',
      wallA: '#c9a227',
      wallB: '#e6c65c',
      accent: '#f5e08a',
    },
  },
  {
    id: 7,
    name: 'Twin Towers',
    blurb: 'Two pillars + bounce shots',
    tier: 'Hard',
    blueSpin: 1.5,
    redSpin: -1.55,
    aiReload: 1.6,
    aiFirstShot: 1.3,
    recoilScale: 1.15,
    bulletSpeed: 540,
    bulletMode: 'bounce',
    maxBounces: 4,
    blueStart: { x: wall + 55, y: H * 0.68 },
    redStart: { x: W - wall - 55, y: H * 0.28 },
    obstacles: [
      { id: 't1', kind: 'block', x: W * 0.32 - 22, y: H * 0.28, w: 44, h: 160 },
      { id: 't2', kind: 'block', x: W * 0.68 - 22, y: H * 0.48, w: 44, h: 160 },
    ],
    theme: {
      floor: '#1a222c',
      wallA: '#7a6cff',
      wallB: '#b0a6ff',
      accent: '#a89bff',
    },
  },
  {
    id: 8,
    name: 'Mine Field',
    blurb: 'One red mine — don’t touch it',
    tier: 'Hard',
    blueSpin: 1.55,
    redSpin: -1.65,
    aiReload: 1.5,
    aiFirstShot: 1.2,
    recoilScale: 1.2,
    bulletSpeed: 550,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 60, y: H * 0.75 },
    redStart: { x: W - wall - 60, y: H * 0.22 },
    obstacles: [
      { id: 'm1', kind: 'hazard', x: W * 0.48, y: H * 0.48, w: 40, h: 40 },
    ],
    theme: {
      floor: '#2a1e22',
      wallA: '#ff6b7a',
      wallB: '#ff9aa5',
      accent: '#ff7a88',
    },
  },
  {
    id: 9,
    name: 'Cross Maze',
    blurb: 'Corridors force angles',
    tier: 'Hard',
    blueSpin: 1.7,
    redSpin: -1.8,
    aiReload: 1.35,
    aiFirstShot: 1.0,
    recoilScale: 1.25,
    bulletSpeed: 580,
    bulletMode: 'bounce',
    maxBounces: 6,
    blueStart: { x: wall + 55, y: H - wall - 80 },
    redStart: { x: W - wall - 55, y: wall + 80 },
    obstacles: [
      { id: 'cx', kind: 'block', x: W / 2 - 18, y: wall + 80, w: 36, h: H - wall * 2 - 160 },
      { id: 'cy', kind: 'block', x: wall + 50, y: H / 2 - 18, w: W - wall * 2 - 100, h: 36 },
    ],
    theme: {
      floor: '#1c2430',
      wallA: '#3dd6c6',
      wallB: '#7aefe3',
      accent: '#5eead4',
    },
  },
  {
    id: 10,
    name: 'Gauntlet',
    blurb: 'Bounce + mover + one mine',
    tier: 'Hard',
    blueSpin: 1.9,
    redSpin: -2.0,
    aiReload: 1.1,
    aiFirstShot: 0.8,
    recoilScale: 1.35,
    bulletSpeed: 600,
    bulletMode: 'bounce',
    maxBounces: 4,
    blueStart: { x: wall + 55, y: H * 0.78 },
    redStart: { x: W - wall - 55, y: H * 0.2 },
    obstacles: [
      { id: 'gPillar', kind: 'block', x: W / 2 - 24, y: H / 2 - 70, w: 48, h: 140 },
      {
        id: 'gSweep',
        kind: 'block',
        x: wall + 30,
        y: H * 0.35,
        w: 100,
        h: 22,
        vx: 140,
        minX: wall + 20,
        maxX: W - wall - 120,
      },
      { id: 'gMine1', kind: 'hazard', x: W * 0.7, y: H * 0.55, w: 36, h: 36 },
    ],
    theme: {
      floor: '#18141c',
      wallA: '#e6c65c',
      wallB: '#ff6b7a',
      accent: '#f2d56b',
    },
  },
]

export function getLevel(id: number): LevelConfig {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0]
}
