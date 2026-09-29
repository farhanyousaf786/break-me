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
  world: number
  name: string
  blurb: string
  /** The one new idea this level introduces (shown as a NEW badge). */
  intro?: string
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

export type World = { id: number; name: string; tagline: string; color: string }

export const WORLDS: World[] = [
  { id: 1, name: 'Training Yard', tagline: 'Learn to aim with recoil', color: '#46d27e' },
  { id: 2, name: 'Block Party', tagline: 'Cover, lanes and moving walls', color: '#ff9f43' },
  { id: 3, name: 'Bounce House', tagline: 'Bullets ricochet off walls', color: '#4cb4ff' },
  { id: 4, name: 'Danger Zone', tagline: 'Mines, heavy kick, everything', color: '#ff6474' },
]

const W = ARENA.width
const H = ARENA.height
const wall = ARENA.wall
const cx = W / 2
const cy = H / 2
/** Gap kept between a moving wall and the arena edge so a character is never squeezed. */
const SAFE = 66

const block = (id: string, x: number, y: number, w: number, h: number): ObstacleDef => ({
  id,
  kind: 'block',
  x,
  y,
  w,
  h,
})

const mine = (id: string, centerX: number, centerY: number, size = 36): ObstacleDef => ({
  id,
  kind: 'hazard',
  x: centerX - size / 2,
  y: centerY - size / 2,
  w: size,
  h: size,
})

/** Wall sliding left↔right across the arena at height `y`. */
const slider = (id: string, y: number, w: number, speed: number, startRight = false): ObstacleDef => {
  const minX = wall + SAFE
  const maxX = W - wall - SAFE - w
  return { id, kind: 'block', x: startRight ? maxX : minX, y, w, h: 22, vx: startRight ? -speed : speed, minX, maxX }
}

/** Column riding up↕down through the middle. */
const elevator = (id: string, x: number, w: number, h: number, speed: number): ObstacleDef => {
  const minY = wall + SAFE
  const maxY = H - wall - SAFE - h
  return { id, kind: 'block', x, y: minY, w, h, vy: speed, minY, maxY }
}

export const LEVELS: LevelConfig[] = [
  /* ---------------------------------------------------------- World 1: Training Yard */
  {
    id: 1,
    world: 1,
    name: 'First Shot',
    blurb: 'Tap to shoot. Each shot kicks you back.',
    tier: 'Easy',
    blueSpin: 0.8,
    redSpin: -0.75,
    aiReload: 3.0,
    aiFirstShot: 2.8,
    recoilScale: 0.8,
    bulletSpeed: 380,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 70, y: H * 0.58 },
    redStart: { x: W - wall - 70, y: H * 0.36 },
    obstacles: [],
    theme: { floor: '#26302a', wallA: '#6fcf7f', wallB: '#b5f0a8', accent: '#9be89a' },
  },
  {
    id: 2,
    world: 1,
    name: 'Center Post',
    blurb: 'A post blocks the straight shot. Go around it.',
    intro: 'Cover',
    tier: 'Easy',
    blueSpin: 0.9,
    redSpin: -0.85,
    aiReload: 2.8,
    aiFirstShot: 2.6,
    recoilScale: 0.85,
    bulletSpeed: 400,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 65, y: H * 0.64 },
    redStart: { x: W - wall - 65, y: H * 0.3 },
    obstacles: [block('post', cx - 26, cy - 45, 52, 90)],
    theme: { floor: '#2a2d33', wallA: '#c9a227', wallB: '#e6c65c', accent: '#f2d56b' },
  },
  {
    id: 3,
    world: 1,
    name: 'Side Shelves',
    blurb: 'Ledges give both of you a place to hide.',
    intro: 'Ledges',
    tier: 'Easy',
    blueSpin: 0.95,
    redSpin: -0.95,
    aiReload: 2.6,
    aiFirstShot: 2.4,
    recoilScale: 0.9,
    bulletSpeed: 420,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 60, y: H * 0.72 },
    redStart: { x: W - wall - 60, y: H * 0.26 },
    obstacles: [block('shelfL', wall, 290, 130, 20), block('shelfR', W - wall - 130, 410, 130, 20)],
    theme: { floor: '#243038', wallA: '#8fbf6a', wallB: '#c5e09a', accent: '#b8e986' },
  },
  {
    id: 4,
    world: 1,
    name: 'Slow Slider',
    blurb: 'The wall slides. Shoot when the lane opens.',
    intro: 'Moving wall',
    tier: 'Easy',
    blueSpin: 1.0,
    redSpin: -1.0,
    aiReload: 2.5,
    aiFirstShot: 2.3,
    recoilScale: 0.9,
    bulletSpeed: 430,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 70, y: H * 0.68 },
    redStart: { x: W - wall - 70, y: H * 0.32 },
    obstacles: [slider('slide', cy - 11, 90, 60)],
    theme: { floor: '#232b2f', wallA: '#4fbf9f', wallB: '#9ae6cf', accent: '#7fe0c0' },
  },
  {
    id: 5,
    world: 1,
    name: 'Yard Final',
    blurb: 'Post and ledges together. Use everything so far.',
    tier: 'Medium',
    blueSpin: 1.1,
    redSpin: -1.15,
    aiReload: 2.3,
    aiFirstShot: 2.0,
    recoilScale: 1.0,
    bulletSpeed: 460,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 62, y: H * 0.76 },
    redStart: { x: W - wall - 62, y: H * 0.22 },
    obstacles: [
      block('post', cx - 24, cy - 40, 48, 80),
      block('shelfL', wall, 240, 100, 20),
      block('shelfR', W - wall - 100, 460, 100, 20),
    ],
    theme: { floor: '#2b2a22', wallA: '#e0b43c', wallB: '#ffe08a', accent: '#ffd45c' },
  },

  /* ------------------------------------------------------------ World 2: Block Party */
  {
    id: 6,
    world: 2,
    name: 'Split Room',
    blurb: 'A wall splits the room. Aim through the gaps.',
    intro: 'Chokepoint',
    tier: 'Easy',
    blueSpin: 1.0,
    redSpin: -1.05,
    aiReload: 2.5,
    aiFirstShot: 2.3,
    recoilScale: 0.95,
    bulletSpeed: 440,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: cx - 40, y: H * 0.76 },
    redStart: { x: cx + 40, y: H * 0.24 },
    obstacles: [block('split', wall + 80, cy - 10, W - (wall + 80) * 2, 20)],
    theme: { floor: '#2c2430', wallA: '#d48a3a', wallB: '#f0b86a', accent: '#ffb86b' },
  },
  {
    id: 7,
    world: 2,
    name: 'Tight Cage',
    blurb: 'Less room to drift, so every kick counts.',
    intro: 'Small arena',
    tier: 'Medium',
    blueSpin: 1.15,
    redSpin: -1.2,
    aiReload: 2.2,
    aiFirstShot: 1.9,
    recoilScale: 1.0,
    bulletSpeed: 460,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: 130, y: 470 },
    redStart: { x: 260, y: 250 },
    obstacles: [
      block('padL', wall, wall, 50, H - wall * 2),
      block('padR', W - wall - 50, wall, 50, H - wall * 2),
      block('padT', wall + 50, wall, W - wall * 2 - 100, 80),
      block('padB', wall + 50, H - wall - 80, W - wall * 2 - 100, 80),
    ],
    theme: { floor: '#2e2226', wallA: '#ff8a5c', wallB: '#ffc2a1', accent: '#ffa47a' },
  },
  {
    id: 8,
    world: 2,
    name: 'Elevator',
    blurb: 'A pillar rides up and down. Time it.',
    intro: 'Elevator',
    tier: 'Medium',
    blueSpin: 1.2,
    redSpin: -1.25,
    aiReload: 2.1,
    aiFirstShot: 1.8,
    recoilScale: 1.05,
    bulletSpeed: 470,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 67, y: H * 0.66 },
    redStart: { x: W - wall - 67, y: H * 0.34 },
    obstacles: [elevator('lift', cx - 20, 40, 110, 80)],
    theme: { floor: '#2a2130', wallA: '#e46fa8', wallB: '#f7b0d3', accent: '#ff8fc4' },
  },
  {
    id: 9,
    world: 2,
    name: 'Double Slide',
    blurb: 'Two walls slide opposite ways. Find the window.',
    tier: 'Medium',
    blueSpin: 1.3,
    redSpin: -1.3,
    aiReload: 2.0,
    aiFirstShot: 1.7,
    recoilScale: 1.05,
    bulletSpeed: 490,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 72, y: H * 0.81 },
    redStart: { x: W - wall - 72, y: H * 0.19 },
    obstacles: [slider('top', 250, 100, 90), slider('bottom', 460, 100, 90, true)],
    theme: { floor: '#2c2628', wallA: '#ffb03a', wallB: '#ffd88a', accent: '#ffc25c' },
  },
  {
    id: 10,
    world: 2,
    name: 'Fortress',
    blurb: 'Both sides have a bunker. A wall sweeps between.',
    tier: 'Hard',
    blueSpin: 1.4,
    redSpin: -1.45,
    aiReload: 1.8,
    aiFirstShot: 1.5,
    recoilScale: 1.1,
    bulletSpeed: 510,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 72, y: H * 0.76 },
    redStart: { x: W - wall - 72, y: H * 0.24 },
    obstacles: [
      block('bunkerBlue', wall, 470, 110, 20),
      block('bunkerRed', W - wall - 110, 230, 110, 20),
      slider('sweep', cy - 11, 90, 110),
    ],
    theme: { floor: '#261c22', wallA: '#ff6f4f', wallB: '#ffb36b', accent: '#ff8a5c' },
  },

  /* ----------------------------------------------------------- World 3: Bounce House */
  {
    id: 11,
    world: 3,
    name: 'Rubber Room',
    blurb: 'Bullets bounce off walls now. Watch the rebound!',
    intro: 'Ricochet',
    tier: 'Easy',
    blueSpin: 1.05,
    redSpin: -1.1,
    aiReload: 2.7,
    aiFirstShot: 2.5,
    recoilScale: 0.95,
    bulletSpeed: 420,
    bulletMode: 'bounce',
    maxBounces: 2,
    blueStart: { x: wall + 70, y: H * 0.62 },
    redStart: { x: W - wall - 70, y: H * 0.34 },
    obstacles: [],
    theme: { floor: '#1e2838', wallA: '#5ec8ff', wallB: '#9ad8ff', accent: '#7ed0ff' },
  },
  {
    id: 12,
    world: 3,
    name: 'Bank Shot',
    blurb: 'A big pillar in the middle. Bounce your shot around it.',
    tier: 'Medium',
    blueSpin: 1.2,
    redSpin: -1.2,
    aiReload: 2.4,
    aiFirstShot: 2.1,
    recoilScale: 1.0,
    bulletSpeed: 450,
    bulletMode: 'bounce',
    maxBounces: 3,
    blueStart: { x: wall + 67, y: H * 0.74 },
    redStart: { x: W - wall - 67, y: H * 0.26 },
    obstacles: [block('pillar', cx - 30, cy - 70, 60, 140)],
    theme: { floor: '#1c2236', wallA: '#6f8cff', wallB: '#b0c0ff', accent: '#93a8ff' },
  },
  {
    id: 13,
    world: 3,
    name: 'Pinball',
    blurb: 'Four bumpers send bullets flying everywhere.',
    intro: 'Bumpers',
    tier: 'Medium',
    blueSpin: 1.3,
    redSpin: -1.3,
    aiReload: 2.2,
    aiFirstShot: 1.9,
    recoilScale: 1.05,
    bulletSpeed: 470,
    bulletMode: 'bounce',
    maxBounces: 4,
    blueStart: { x: wall + 62, y: H * 0.81 },
    redStart: { x: W - wall - 62, y: H * 0.19 },
    obstacles: [
      block('bTop', cx - 20, 200, 40, 40),
      block('bLeft', wall + 70, cy - 20, 40, 40),
      block('bRight', W - wall - 110, cy - 20, 40, 40),
      block('bBottom', cx - 20, 480, 40, 40),
    ],
    theme: { floor: '#1a2234', wallA: '#3dd6c6', wallB: '#7aefe3', accent: '#5eead4' },
  },
  {
    id: 14,
    world: 3,
    name: 'Twin Towers',
    blurb: 'Two towers. Hide behind one, bank off the other.',
    tier: 'Medium',
    blueSpin: 1.4,
    redSpin: -1.45,
    aiReload: 2.0,
    aiFirstShot: 1.7,
    recoilScale: 1.1,
    bulletSpeed: 500,
    bulletMode: 'bounce',
    maxBounces: 4,
    blueStart: { x: wall + 62, y: H * 0.81 },
    redStart: { x: W - wall - 62, y: H * 0.19 },
    obstacles: [block('towerL', W * 0.32 - 22, 200, 44, 160), block('towerR', W * 0.68 - 22, 360, 44, 160)],
    theme: { floor: '#1a222c', wallA: '#7a6cff', wallB: '#b0a6ff', accent: '#a89bff' },
  },
  {
    id: 15,
    world: 3,
    name: 'Ricochet Rush',
    blurb: 'Long bounces, a post and a sliding wall. Stay sharp!',
    tier: 'Hard',
    blueSpin: 1.5,
    redSpin: -1.55,
    aiReload: 1.8,
    aiFirstShot: 1.5,
    recoilScale: 1.15,
    bulletSpeed: 520,
    bulletMode: 'bounce',
    maxBounces: 5,
    blueStart: { x: wall + 67, y: H * 0.86 },
    redStart: { x: W - wall - 67, y: H * 0.2 },
    obstacles: [block('post', cx - 20, cy - 40, 40, 80), slider('slide', 520, 90, 90)],
    theme: { floor: '#181c30', wallA: '#4cb4ff', wallB: '#c28bff', accent: '#8fc6ff' },
  },

  /* ------------------------------------------------------------ World 4: Danger Zone */
  {
    id: 16,
    world: 4,
    name: 'Lone Mine',
    blurb: 'Touching the mine breaks you. Watch your drift.',
    intro: 'Mines',
    tier: 'Medium',
    blueSpin: 1.25,
    redSpin: -1.3,
    aiReload: 2.3,
    aiFirstShot: 2.1,
    recoilScale: 1.0,
    bulletSpeed: 480,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 67, y: H * 0.72 },
    redStart: { x: W - wall - 67, y: H * 0.28 },
    obstacles: [mine('mine', cx, cy, 40)],
    theme: { floor: '#2a1e22', wallA: '#ff6b7a', wallB: '#ff9aa5', accent: '#ff7a88' },
  },
  {
    id: 17,
    world: 4,
    name: 'Cross Maze',
    blurb: 'Four rooms and bouncing bullets. Use the corners.',
    tier: 'Hard',
    blueSpin: 1.5,
    redSpin: -1.6,
    aiReload: 1.8,
    aiFirstShot: 1.5,
    recoilScale: 1.15,
    bulletSpeed: 540,
    bulletMode: 'bounce',
    maxBounces: 5,
    blueStart: { x: wall + 72, y: H * 0.78 },
    redStart: { x: W - wall - 72, y: H * 0.22 },
    obstacles: [
      block('cross-v', cx - 18, wall + 82, 36, H - (wall + 82) * 2),
      block('cross-h', wall + SAFE, cy - 18, W - (wall + SAFE) * 2, 36),
    ],
    theme: { floor: '#241a20', wallA: '#e05a6a', wallB: '#ffa0aa', accent: '#ff8290' },
  },
  {
    id: 18,
    world: 4,
    name: 'Heavy Kick',
    blurb: 'Double-strength recoil. Small taps, big moves.',
    intro: 'Heavy recoil',
    tier: 'Hard',
    blueSpin: 1.5,
    redSpin: -1.55,
    aiReload: 1.7,
    aiFirstShot: 1.4,
    recoilScale: 1.45,
    bulletSpeed: 560,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 92, y: H * 0.72 },
    redStart: { x: W - wall - 92, y: H * 0.28 },
    obstacles: [block('bumpL', wall, cy - 30, 70, 60), block('bumpR', W - wall - 70, cy - 30, 70, 60)],
    theme: { floor: '#221a1a', wallA: '#ff8c42', wallB: '#ffc08a', accent: '#ffa25c' },
  },
  {
    id: 19,
    world: 4,
    name: 'Mine Lane',
    blurb: 'Two mines guard the middle lane. Aim, don’t drift.',
    tier: 'Hard',
    blueSpin: 1.65,
    redSpin: -1.7,
    aiReload: 1.55,
    aiFirstShot: 1.25,
    recoilScale: 1.2,
    bulletSpeed: 570,
    bulletMode: 'pass',
    maxBounces: 0,
    blueStart: { x: wall + 67, y: H * 0.81 },
    redStart: { x: W - wall - 67, y: H * 0.19 },
    obstacles: [block('post', cx - 20, cy - 30, 40, 60), mine('mineA', 132, 282), mine('mineB', 258, 438)],
    theme: { floor: '#2a1a1e', wallA: '#ff4d6d', wallB: '#ff9eb0', accent: '#ff6f88' },
  },
  {
    id: 20,
    world: 4,
    name: 'Final Showdown',
    blurb: 'Bounce, slide, mine. Everything you learned.',
    tier: 'Hard',
    blueSpin: 1.8,
    redSpin: -1.9,
    aiReload: 1.35,
    aiFirstShot: 1.05,
    recoilScale: 1.3,
    bulletSpeed: 600,
    bulletMode: 'bounce',
    maxBounces: 4,
    blueStart: { x: wall + 67, y: H * 0.81 },
    redStart: { x: W - wall - 67, y: H * 0.19 },
    obstacles: [block('post', cx - 24, cy - 50, 48, 100), slider('slide', 200, 80, 120), mine('mine', 270, 488)],
    theme: { floor: '#18141c', wallA: '#e6c65c', wallB: '#ff6b7a', accent: '#f2d56b' },
  },
]

export function getLevel(id: number): LevelConfig {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0]
}

export function getWorld(id: number): World {
  return WORLDS.find((w) => w.id === id) ?? WORLDS[0]
}

const UNLOCK_KEY = 'breakme_unlocked'

export function loadUnlocked(): number {
  try {
    const n = Number(localStorage.getItem(UNLOCK_KEY) ?? '1')
    if (!Number.isFinite(n) || n < 1) return 1
    return Math.min(LEVELS.length, Math.floor(n))
  } catch {
    return 1
  }
}

export function saveUnlocked(maxLevel: number) {
  try {
    localStorage.setItem(UNLOCK_KEY, String(Math.min(LEVELS.length, Math.max(1, maxLevel))))
  } catch {
    /* ignore */
  }
}

export function unlockAfterWin(clearedId: number): number {
  const current = loadUnlocked()
  const next = Math.max(current, Math.min(LEVELS.length, clearedId + 1))
  saveUnlocked(next)
  return next
}
