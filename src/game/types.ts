import type { LevelTheme, ObstacleDef, ObstacleKind } from './levels'

export type Vec2 = { x: number; y: number }

export type Gun = {
  id: 'blue' | 'red'
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  spin: number
  /** Team color (bullets, glow) — the character's look comes from `skin` */
  color: string
  accent: string
  skin: string
  /** Hit — character shattered */
  broken: boolean
  /** 1 right after firing, eases back to 0 — drives the squash / squint animation */
  kick: number
}

export type Shard = {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  spin: number
  life: number
  maxLife: number
  color: string
  w: number
  h: number
}

export type Bullet = {
  id: number
  owner: 'blue' | 'red'
  x: number
  y: number
  vx: number
  vy: number
  color: string
  alive: boolean
  trail: Vec2[]
  bounces: number
}

export type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export type Obstacle = ObstacleDef & {
  kind: ObstacleKind
}

export type Phase = 'playing' | 'won' | 'lost'

export type GameState = {
  level: number
  phase: Phase
  guns: [Gun, Gun]
  bullets: Bullet[]
  particles: Particle[]
  shards: Shard[]
  obstacles: Obstacle[]
  blueCooldown: number
  redCooldown: number
  messageTimer: number
  flash: number
  aiReload: number
  /** false when red is a real (online) player instead of the CPU */
  redAI: boolean
  recoilScale: number
  bulletSpeed: number
  bulletMode: 'pass' | 'bounce'
  maxBounces: number
  theme: LevelTheme
  levelName: string
}
