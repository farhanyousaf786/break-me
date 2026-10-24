import type { LevelTheme, ObstacleDef, ObstacleKind } from './levels'
import type { PowerKind } from './powerups'

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
  /** Gun skin id (guns.ts) */
  weapon?: string
  /** Equipped aura id (auras.ts / AuraKind) */
  aura?: string
  /** Premium burst guns: shots still to fire from the current trigger pull, and seconds until the next */
  burstLeft?: number
  burstTimer?: number
  /** Active power-ups: game seconds left for each */
  fx?: GunFx
  /** Power-ups grabbed this round (daily missions) */
  pickups?: number
  /** Hit — character shattered */
  broken: boolean
  /** 1 right after firing, eases back to 0 — drives the squash / squint animation */
  kick: number
}

export type GunFx = { shield?: number; giant?: number; tiny?: number; frozen?: number; triple?: number }

export type PowerUp = {
  id: number
  kind: PowerKind
  x: number
  y: number
  vx: number
  vy: number
  /** Seconds since it appeared */
  t: number
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

/** One character-break explosion: shockwave, comic burst, cracks and a floating ghost. */
export type Boom = {
  x: number
  y: number
  /** Team color */
  color: string
  /** Character body color (tints the ghost) */
  body: string
  word: string
  /** Seconds since the break */
  t: number
}

/** A speech bubble over a fighter: CPU teasing after a miss, or a quick-chat line. */
export type Taunt = {
  side: 'blue' | 'red'
  text: string
  t: number
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
  booms: Boom[]
  /** At most one bubble per side */
  taunts: Taunt[]
  /** Seconds until the CPU may taunt again */
  tauntCooldown: number
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
  /** Real seconds of slow motion left (a finishing shot is about to land) */
  slowMo: number
  /** Bullet that last triggered slow motion, so one bullet only triggers it once */
  slowMoBullet: number
  powerups: PowerUp[]
  /** Game seconds until the next bubble; power-ups are off when negative */
  powerupTimer: number
}
