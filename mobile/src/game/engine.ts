import { ARENA } from './arena'
import { gunFire } from './guns'
import { getLevel } from './levels'
import { DEFAULT_SKINS, getSkin, type SkinChoice } from './skins'
import { buzz } from './haptics'
import { BUBBLE_RADIUS, POWER_KINDS, POWERS, type PowerKind } from './powerups'
import { playBreak, playPowerUp, playShieldBlock, playShoot, preloadShots } from './sound'
import type { Boom, Bullet, GameState, Gun, Obstacle, Particle, Phase, PowerUp, Shard, Taunt, Vec2 } from './types'

export { ARENA }

const BULLET_RADIUS = 4
const GUN_HIT_RADIUS = 28
const GUN_RADIUS = 30
const MAX_TRAIL = 18

const BASE_RECOIL = 340
const ANGULAR_KICK = 9.5
const SIDE_KICK = 55

/** Global calm-down on top of each level's tuning */
const BULLET_SPEED_SCALE = 0.72
const RECOIL_SCALE = 0.85

/** Game speed while a finishing shot is about to land */
export const SLOW_MO_SPEED = 0.15
/** Look-ahead (game seconds) for "this bullet is about to hit" */
const SLOW_MO_LOOKAHEAD = 0.22
/** Long enough (real seconds) for the bullet to reach its target at slow speed */
const SLOW_MO_REAL_S = SLOW_MO_LOOKAHEAD / SLOW_MO_SPEED + 0.1
const SLOW_MO_AFTER_BREAK_S = 1.0

const MAX_POWERUPS = 2
const POWERUP_LIFE = 12
const POWERUP_SPEED = 26

const LINEAR_DAMP = 0.975
const ANGULAR_DAMP = 0.985
const WALL_RESTITUTION = 0.55

let nextBulletId = 1

export function createState(
  levelId = 1,
  skins: SkinChoice = DEFAULT_SKINS,
  opts: { redAI?: boolean; guns?: { blue?: string; red?: string }; powerups?: boolean } = {},
): GameState {
  const cfg = getLevel(levelId)
  preloadShots([opts.guns?.blue, opts.guns?.red])
  // The first levels teach the basics without bubbles in the way.
  const powerups = opts.powerups ?? cfg.id >= 3
  const obstacles = cfg.obstacles.map((o) => ({ ...o }))
  const shield = startingShield(obstacles, [cfg.blueStart, cfg.redStart])

  return {
    level: cfg.id,
    phase: 'playing',
    guns: [
      {
        id: 'blue',
        x: cfg.blueStart.x,
        y: cfg.blueStart.y,
        vx: 20 + Math.random() * 20,
        vy: -10 + Math.random() * 20,
        angle: Math.PI * 0.15,
        spin: cfg.blueSpin,
        color: '#5ec8ff',
        accent: '#2a7fad',
        skin: skins.blue,
        weapon: opts.guns?.blue,
        broken: false,
        kick: 0,
      },
      {
        id: 'red',
        x: cfg.redStart.x,
        y: cfg.redStart.y,
        vx: -25 + Math.random() * 15,
        vy: 10 + Math.random() * 20,
        angle: Math.PI * 1.1,
        spin: cfg.redSpin,
        color: '#ff6b7a',
        accent: '#c43a4a',
        skin: skins.red,
        weapon: opts.guns?.red,
        broken: false,
        kick: 0,
      },
    ],
    bullets: [],
    particles: [],
    shards: [],
    booms: [],
    taunts: [],
    tauntCooldown: 4,
    obstacles,
    blueCooldown: 0,
    // The first-shot delay is the CPU's head start for the player; a human red can fire at GO.
    redCooldown: (opts.redAI ?? true) ? cfg.aiFirstShot : 0,
    messageTimer: 0,
    flash: 0,
    aiReload: cfg.aiReload,
    redAI: opts.redAI ?? true,
    recoilScale: cfg.recoilScale * RECOIL_SCALE,
    bulletSpeed: cfg.bulletSpeed * BULLET_SPEED_SCALE,
    bulletMode: cfg.bulletMode,
    maxBounces: cfg.maxBounces,
    theme: cfg.theme,
    levelName: cfg.name,
    slowMo: 0,
    slowMoBullet: 0,
    powerups: shield ? [shield] : [],
    // No random spawns on the first levels, but the timer still runs so the opening shield works.
    powerupTimer: powerups ? 8 + Math.random() * 3 : 1e9,
  }
}

function muzzle(gun: Gun): Vec2 {
  const barrel = 46
  return {
    x: gun.x + Math.cos(gun.angle) * barrel,
    y: gun.y + Math.sin(gun.angle) * barrel,
  }
}

function applyRecoil(gun: Gun, recoilScale: number) {
  const c = Math.cos(gun.angle)
  const s = Math.sin(gun.angle)
  const recoil = BASE_RECOIL * recoilScale

  gun.vx -= c * recoil
  gun.vy -= s * recoil
  gun.vx += -s * SIDE_KICK * recoilScale
  gun.vy += c * SIDE_KICK * recoilScale

  const kickDir = gun.spin >= 0 ? 1 : -1
  gun.spin += kickDir * (ANGULAR_KICK + Math.random() * 3.5) * recoilScale
  gun.kick = 1
}

function spawnBullet(gun: Gun, bulletSpeed: number, offset = 0): Bullet {
  const m = muzzle(gun)
  return {
    id: nextBulletId++,
    owner: gun.id,
    x: m.x,
    y: m.y,
    vx: Math.cos(gun.angle + offset) * bulletSpeed,
    vy: Math.sin(gun.angle + offset) * bulletSpeed,
    color: gun.color,
    alive: true,
    trail: [{ x: m.x, y: m.y }],
    bounces: 0,
  }
}

function muzzleSparks(particles: Particle[], gun: Gun) {
  const m = muzzle(gun)
  for (let i = 0; i < 10; i++) {
    const spread = (Math.random() - 0.5) * 0.8
    const a = gun.angle + spread
    const speed = 80 + Math.random() * 160
    particles.push({
      x: m.x,
      y: m.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 0.15 + Math.random() * 0.2,
      maxLife: 0.35,
      color: '#fff4c2',
      size: 1.5 + Math.random() * 2,
    })
  }
}

function burst(particles: Particle[], x: number, y: number, color: string, count = 28) {
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.4
    const speed = 60 + Math.random() * 220
    particles.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 0.35 + Math.random() * 0.45,
      maxLife: 0.8,
      color,
      size: 2 + Math.random() * 3.5,
    })
  }
}

const BOOM_WORDS = ['BONK!', 'CRACK!', 'POP!', 'KO!', 'SMASH!', 'BOOM!', 'OOF!']
export const BOOM_LIFE = 1.8

/** Shatter cute character into flying pieces */
export function shatterGun(gun: Gun, shards: Shard[], particles: Particle[], booms: Boom[]) {
  gun.broken = true
  gun.fx = undefined
  gun.burstLeft = 0
  playBreak()
  buzz('break')
  const skin = getSkin(gun.skin)
  burst(particles, gun.x, gun.y, skin.body, 40)
  burst(particles, gun.x, gun.y, '#fff4c2', 18)
  booms.push({
    x: gun.x,
    y: gun.y,
    color: gun.color,
    body: skin.body,
    word: BOOM_WORDS[Math.floor(Math.random() * BOOM_WORDS.length)],
    t: 0,
  })

  const pieces: { w: number; h: number; color: string; ox: number; oy: number }[] = [
    { w: 16, h: 14, color: skin.body, ox: -8, oy: -6 }, // body chunks
    { w: 16, h: 14, color: skin.body, ox: 8, oy: -6 },
    { w: 16, h: 12, color: skin.body, ox: 0, oy: 8 },
    { w: 10, h: 8, color: skin.belly, ox: 0, oy: 4 },
    { w: 9, h: 9, color: skin.earColor ?? skin.accent, ox: -12, oy: -20 }, // ears / horns
    { w: 9, h: 9, color: skin.earColor ?? skin.accent, ox: 12, oy: -20 },
    { w: 8, h: 6, color: skin.accent, ox: -9, oy: 18 }, // feet
    { w: 8, h: 6, color: skin.accent, ox: 9, oy: 18 },
    { w: 14, h: 8, color: '#8b93a7', ox: 26, oy: 0 }, // gun
    { w: 6, h: 6, color: '#ffb3c1', ox: -10, oy: 2 }, // cheeks
    { w: 6, h: 6, color: '#ffb3c1', ox: 10, oy: 2 },
  ]

  for (const p of pieces) {
    const a = Math.atan2(p.oy, p.ox || 0.01) + (Math.random() - 0.5) * 1.2
    const speed = 140 + Math.random() * 220
    shards.push({
      x: gun.x + p.ox * Math.cos(gun.angle) - p.oy * Math.sin(gun.angle),
      y: gun.y + p.ox * Math.sin(gun.angle) + p.oy * Math.cos(gun.angle),
      vx: Math.cos(a) * speed + gun.vx * 0.3,
      vy: Math.sin(a) * speed + gun.vy * 0.3 - 40,
      angle: gun.angle + Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 18,
      life: 0.9 + Math.random() * 0.5,
      maxLife: 1.4,
      color: p.color,
      w: p.w,
      h: p.h,
    })
  }
}

function fireGun(
  state: GameState,
  guns: [Gun, Gun],
  bullets: Bullet[],
  particles: Particle[],
  who: 'blue' | 'red',
): void {
  const gun = who === 'blue' ? guns[0] : guns[1]
  if (gun.broken) return
  const fire = gunFire(gun.weapon)
  shootVolley(state, gun, bullets, particles, fire.burst > 1 ? BURST_RECOIL : 1)
  gun.burstLeft = fire.burst - 1
  gun.burstTimer = BURST_GAP
}

const BURST_GAP = 0.11
// Each burst shot kicks less, so a 3-shot burst doesn't fling the fighter across the arena.
const BURST_RECOIL = 0.6

/** One shot: a single bullet, or a fan of `count` bullets for spray guns. */
function shootVolley(state: GameState, gun: Gun, bullets: Bullet[], particles: Particle[], recoil: number) {
  let { count, spread } = gunFire(gun.weapon)
  if (gun.fx?.triple) {
    count = Math.max(count, 3)
    spread = Math.max(spread, 0.3)
  }
  for (let i = 0; i < count; i++) {
    const offset = count === 1 ? 0 : (i / (count - 1) - 0.5) * spread
    bullets.push(spawnBullet(gun, state.bulletSpeed, offset))
  }
  applyRecoil(gun, state.recoilScale * recoil)
  muzzleSparks(particles, gun)
  playShoot(gun.weapon)
}

function continueBurst(state: GameState, gun: Gun, bullets: Bullet[], particles: Particle[], dt: number) {
  if (!gun.burstLeft) return
  if (gun.broken) {
    gun.burstLeft = 0
    return
  }
  gun.burstTimer = (gun.burstTimer ?? 0) - dt
  if (gun.burstTimer > 0) return
  shootVolley(state, gun, bullets, particles, BURST_RECOIL)
  gun.burstLeft -= 1
  gun.burstTimer = BURST_GAP
}

const PLAYER_COOLDOWN = 0.28

const TAUNTS = [
  'Missed me!',
  'The wall says thanks!',
  'I felt a breeze!',
  'Nice try, buddy',
  'Aim at ME, silly',
  'Pew pew... nope!',
  'Hehe, too slow',
  'Were you aiming at stars?',
  'Did you blink?',
  'That bullet had other plans',
  'So close! ...not really',
  'Oopsie!',
  'Skill issue? hehe',
  'I dodged that in my sleep',
  'My goldfish aims better',
  'Try the other way!',
  'Wheee, missed!',
  'Is that your best shot?',
  'Blame the lag, sure',
  'Boop! Not even close',
]
export const TAUNT_LIFE = 2.2
let lastTaunt = -1

/** The CPU only teases sometimes, never twice in a row with the same line. */
function maybeTaunt(state: GameState): Taunt | null {
  if (!state.redAI || state.tauntCooldown > 0 || Math.random() > 0.4) return null
  let i = Math.floor(Math.random() * TAUNTS.length)
  if (i === lastTaunt) i = (i + 1) % TAUNTS.length
  lastTaunt = i
  return { side: 'red', text: TAUNTS[i], t: 0 }
}

/** Ages speech bubbles only; for screens that are frozen and not calling updateGame. */
export function ageTaunts(state: GameState, dt: number): GameState {
  if (state.taunts.length === 0) return state
  return { ...state, taunts: state.taunts.map((t) => ({ ...t, t: t.t + dt })).filter((t) => t.t < TAUNT_LIFE) }
}

/** Shows `text` in a bubble over `side`, replacing that side's current bubble. */
export function sayTaunt(state: GameState, side: 'blue' | 'red', text: string): GameState {
  return { ...state, taunts: [...state.taunts.filter((t) => t.side !== side), { side, text, t: 0 }] }
}

function tryShoot(state: GameState, who: 'blue' | 'red'): GameState {
  if (state.phase !== 'playing') return state
  if ((who === 'blue' ? state.blueCooldown : state.redCooldown) > 0) return state
  if (state.bullets.some((b) => b.alive && b.owner === who)) return state
  const shooter = who === 'blue' ? state.guns[0] : state.guns[1]
  if (shooter.burstLeft || shooter.fx?.frozen) return state

  const guns: [Gun, Gun] = [{ ...state.guns[0] }, { ...state.guns[1] }]
  const bullets = [...state.bullets]
  const particles = [...state.particles]
  fireGun(state, guns, bullets, particles, who)

  return who === 'blue'
    ? { ...state, guns, bullets, particles, blueCooldown: PLAYER_COOLDOWN }
    : { ...state, guns, bullets, particles, redCooldown: PLAYER_COOLDOWN }
}

export function tryShootBlue(state: GameState): GameState {
  return tryShoot(state, 'blue')
}

/** Human-controlled red (online opponent). */
export function tryShootRed(state: GameState): GameState {
  return tryShoot(state, 'red')
}

/** Tiny fighters are harder to hit; giant ammo is easier to land. */
function hitRadius(target: Gun, shooter: Gun) {
  return GUN_HIT_RADIUS * (target.fx?.tiny ? 0.55 : 1) + (shooter.fx?.giant ? 12 : 0)
}

function hitTest(bullet: Bullet, gun: Gun, shooter: Gun): boolean {
  const dx = bullet.x - gun.x
  const dy = bullet.y - gun.y
  const r = hitRadius(gun, shooter)
  return dx * dx + dy * dy <= r * r
}

/** True when `b` will pass through `target` within the next `window` game seconds (ignoring walls). */
function aboutToHit(b: Bullet, target: Gun, shooter: Gun, window: number) {
  const dx = b.x - target.x
  const dy = b.y - target.y
  const vx = b.vx - target.vx
  const vy = b.vy - target.vy
  const v2 = vx * vx + vy * vy
  if (v2 < 1) return false
  const t = -(dx * vx + dy * vy) / v2
  if (t < 0 || t > window) return false
  const cx = dx + vx * t
  const cy = dy + vy * t
  const r = hitRadius(target, shooter) + 4
  return cx * cx + cy * cy <= r * r
}

/* --------------------------------------------------------------- power-ups */

function tickFx(gun: Gun, dt: number) {
  if (!gun.fx) return
  const next: Gun['fx'] = {}
  let any = false
  for (const [k, v] of Object.entries(gun.fx) as [keyof NonNullable<Gun['fx']>, number][]) {
    if (v - dt > 0) {
      next[k] = v - dt
      any = true
    }
  }
  gun.fx = any ? next : undefined
}

/** The opening shield bubble: the open spot farthest from both players, drifting slowly. */
function startingShield(obstacles: Obstacle[], guns: Vec2[]): PowerUp | null {
  const pad = ARENA.wall + BUBBLE_RADIUS + 20
  let best: { x: number; y: number; d: number } | null = null
  for (let attempt = 0; attempt < 40; attempt++) {
    const x = pad + Math.random() * (ARENA.width - pad * 2)
    const y = pad + 40 + Math.random() * (ARENA.height - pad * 2 - 80)
    if (obstacles.some((o) => circleRectOverlap(x, y, BUBBLE_RADIUS + 14, o.x, o.y, o.w, o.h))) continue
    // Some randomness so it isn't always the exact same spot.
    const d = Math.min(...guns.map((g) => Math.hypot(g.x - x, g.y - y))) * (0.8 + Math.random() * 0.2)
    if (!best || d > best.d) best = { x, y, d }
  }
  if (!best) return null
  const a = Math.random() * Math.PI * 2
  const v = POWERUP_SPEED * 0.4
  return { id: nextPowerUpId++, kind: 'shield', x: best.x, y: best.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0 }
}

function spawnPowerUp(state: GameState, obstacles: Obstacle[], guns: [Gun, Gun], id: number): PowerUp | null {
  const pad = ARENA.wall + BUBBLE_RADIUS + 12
  for (let attempt = 0; attempt < 12; attempt++) {
    const x = pad + Math.random() * (ARENA.width - pad * 2)
    const y = pad + 40 + Math.random() * (ARENA.height - pad * 2 - 80)
    if (guns.some((g) => Math.hypot(g.x - x, g.y - y) < 90)) continue
    if (state.powerups.some((p) => Math.hypot(p.x - x, p.y - y) < 80)) continue
    if (obstacles.some((o) => circleRectOverlap(x, y, BUBBLE_RADIUS + 10, o.x, o.y, o.w, o.h))) continue
    const a = Math.random() * Math.PI * 2
    const kind = POWER_KINDS[Math.floor(Math.random() * POWER_KINDS.length)]
    return { id, kind, x, y, vx: Math.cos(a) * POWERUP_SPEED, vy: Math.sin(a) * POWERUP_SPEED, t: 0 }
  }
  return null
}

function movePowerUp(p: PowerUp, dt: number, obstacles: Obstacle[]): PowerUp {
  let { x, y, vx, vy } = p
  x += vx * dt
  y += vy * dt
  const lo = ARENA.wall + BUBBLE_RADIUS
  if (x < lo || x > ARENA.width - lo) {
    vx = -vx
    x = Math.max(lo, Math.min(ARENA.width - lo, x))
  }
  if (y < lo || y > ARENA.height - lo) {
    vy = -vy
    y = Math.max(lo, Math.min(ARENA.height - lo, y))
  }
  for (const o of obstacles) {
    if (circleRectOverlap(x, y, BUBBLE_RADIUS, o.x, o.y, o.w, o.h)) {
      x = p.x
      y = p.y
      vx = -vx
      vy = -vy
      break
    }
  }
  return { ...p, x, y, vx, vy, t: p.t + dt }
}

function grantPower(kind: PowerKind, gun: Gun, other: Gun) {
  const target = kind === 'freeze' ? other : gun
  if (target.broken) return
  const key = kind === 'freeze' ? 'frozen' : kind
  target.fx = { ...target.fx, [key]: POWERS[kind].seconds }
  gun.pickups = (gun.pickups ?? 0) + 1
}

function popBubble(particles: Particle[], p: PowerUp) {
  const color = POWERS[p.kind].color
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * i) / 16
    const speed = 70 + Math.random() * 90
    particles.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.5,
      color: i % 2 ? color : '#ffffff',
      size: 2 + Math.random() * 2,
    })
  }
}

function circleRectOverlap(
  cx: number,
  cy: number,
  r: number,
  ox: number,
  oy: number,
  ow: number,
  oh: number,
): boolean {
  const nearestX = Math.max(ox, Math.min(cx, ox + ow))
  const nearestY = Math.max(oy, Math.min(cy, oy + oh))
  const dx = cx - nearestX
  const dy = cy - nearestY
  return dx * dx + dy * dy <= r * r
}

function resolveGunVsRect(gun: Gun, ox: number, oy: number, ow: number, oh: number) {
  if (!circleRectOverlap(gun.x, gun.y, GUN_RADIUS, ox, oy, ow, oh)) return

  const nearestX = Math.max(ox, Math.min(gun.x, ox + ow))
  const nearestY = Math.max(oy, Math.min(gun.y, oy + oh))
  let dx = gun.x - nearestX
  let dy = gun.y - nearestY
  let dist = Math.hypot(dx, dy)

  if (dist < 0.001) {
    // Center inside rect — push out via shortest axis
    const left = gun.x - ox
    const right = ox + ow - gun.x
    const top = gun.y - oy
    const bottom = oy + oh - gun.y
    const m = Math.min(left, right, top, bottom)
    if (m === left) {
      gun.x = ox - GUN_RADIUS
      gun.vx = -Math.abs(gun.vx) * WALL_RESTITUTION
    } else if (m === right) {
      gun.x = ox + ow + GUN_RADIUS
      gun.vx = Math.abs(gun.vx) * WALL_RESTITUTION
    } else if (m === top) {
      gun.y = oy - GUN_RADIUS
      gun.vy = -Math.abs(gun.vy) * WALL_RESTITUTION
    } else {
      gun.y = oy + oh + GUN_RADIUS
      gun.vy = Math.abs(gun.vy) * WALL_RESTITUTION
    }
    return
  }

  const nx = dx / dist
  const ny = dy / dist
  const overlap = GUN_RADIUS - dist
  gun.x += nx * overlap
  gun.y += ny * overlap
  const vn = gun.vx * nx + gun.vy * ny
  if (vn < 0) {
    gun.vx -= (1 + WALL_RESTITUTION) * vn * nx
    gun.vy -= (1 + WALL_RESTITUTION) * vn * ny
  }
}

function bounceBulletOffRect(b: Bullet, ox: number, oy: number, ow: number, oh: number): boolean {
  if (!circleRectOverlap(b.x, b.y, BULLET_RADIUS, ox, oy, ow, oh)) return false

  const nearestX = Math.max(ox, Math.min(b.x, ox + ow))
  const nearestY = Math.max(oy, Math.min(b.y, oy + oh))
  let dx = b.x - nearestX
  let dy = b.y - nearestY

  if (Math.abs(dx) > Math.abs(dy)) {
    b.vx *= -1
    b.x = dx > 0 ? ox + ow + BULLET_RADIUS : ox - BULLET_RADIUS
  } else {
    b.vy *= -1
    b.y = dy > 0 ? oy + oh + BULLET_RADIUS : oy - BULLET_RADIUS
  }
  b.bounces += 1
  return true
}

function updateMovers(obstacles: Obstacle[], dt: number) {
  for (const o of obstacles) {
    if (o.vx) {
      o.x += o.vx * dt
      const minX = o.minX ?? ARENA.wall
      const maxX = o.maxX ?? ARENA.width - ARENA.wall - o.w
      if (o.x < minX) {
        o.x = minX
        o.vx = Math.abs(o.vx)
      } else if (o.x > maxX) {
        o.x = maxX
        o.vx = -Math.abs(o.vx)
      }
    }
    if (o.vy) {
      o.y += o.vy * dt
      const minY = o.minY ?? ARENA.wall
      const maxY = o.maxY ?? ARENA.height - ARENA.wall - o.h
      if (o.y < minY) {
        o.y = minY
        o.vy = Math.abs(o.vy)
      } else if (o.y > maxY) {
        o.y = maxY
        o.vy = -Math.abs(o.vy)
      }
    }
  }
}

function integrateGun(gun: Gun, dt: number, obstacles: Obstacle[]) {
  gun.x += gun.vx * dt
  gun.y += gun.vy * dt
  gun.angle += gun.spin * dt

  gun.vx *= Math.pow(LINEAR_DAMP, dt * 60)
  gun.vy *= Math.pow(LINEAR_DAMP, dt * 60)
  gun.spin *= Math.pow(ANGULAR_DAMP, dt * 60)
  gun.kick = Math.max(0, gun.kick - dt * 4)

  const minX = ARENA.wall + GUN_RADIUS
  const maxX = ARENA.width - ARENA.wall - GUN_RADIUS
  const minY = ARENA.wall + GUN_RADIUS
  const maxY = ARENA.height - ARENA.wall - GUN_RADIUS

  if (gun.x < minX) {
    gun.x = minX
    gun.vx = Math.abs(gun.vx) * WALL_RESTITUTION
  } else if (gun.x > maxX) {
    gun.x = maxX
    gun.vx = -Math.abs(gun.vx) * WALL_RESTITUTION
  }
  if (gun.y < minY) {
    gun.y = minY
    gun.vy = Math.abs(gun.vy) * WALL_RESTITUTION
  } else if (gun.y > maxY) {
    gun.y = maxY
    gun.vy = -Math.abs(gun.vy) * WALL_RESTITUTION
  }

  for (const o of obstacles) {
    if (o.kind === 'block') resolveGunVsRect(gun, o.x, o.y, o.w, o.h)
  }
}

function gunHitsHazard(gun: Gun, obstacles: Obstacle[]): boolean {
  for (const o of obstacles) {
    if (o.kind !== 'hazard') continue
    if (circleRectOverlap(gun.x, gun.y, GUN_RADIUS * 0.85, o.x, o.y, o.w, o.h)) return true
  }
  return false
}

function separateGuns(a: Gun, b: Gun) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = Math.hypot(dx, dy) || 0.001
  const minDist = GUN_RADIUS * 2
  if (dist >= minDist) return

  const overlap = (minDist - dist) / 2
  const nx = dx / dist
  const ny = dy / dist
  a.x -= nx * overlap
  a.y -= ny * overlap
  b.x += nx * overlap
  b.y += ny * overlap

  const dvx = a.vx - b.vx
  const dvy = a.vy - b.vy
  const vn = dvx * nx + dvy * ny
  if (vn > 0) return
  const impulse = vn * 0.55
  a.vx -= impulse * nx
  a.vy -= impulse * ny
  b.vx += impulse * nx
  b.vy += impulse * ny
  a.spin += 1.2
  b.spin -= 1.2
}

function handleBulletWorld(
  b: Bullet,
  state: GameState,
  obstacles: Obstacle[],
): 'alive' | 'dead' {
  if (state.bulletMode === 'bounce') {
    const left = ARENA.wall + BULLET_RADIUS
    const right = ARENA.width - ARENA.wall - BULLET_RADIUS
    const top = ARENA.wall + BULLET_RADIUS
    const bottom = ARENA.height - ARENA.wall - BULLET_RADIUS
    let hit = false
    if (b.x < left) {
      b.x = left
      b.vx = Math.abs(b.vx)
      hit = true
    } else if (b.x > right) {
      b.x = right
      b.vx = -Math.abs(b.vx)
      hit = true
    }
    if (b.y < top) {
      b.y = top
      b.vy = Math.abs(b.vy)
      hit = true
    } else if (b.y > bottom) {
      b.y = bottom
      b.vy = -Math.abs(b.vy)
      hit = true
    }
    if (hit) b.bounces += 1
  } else {
    const margin = BULLET_RADIUS
    if (
      b.x < -margin ||
      b.x > ARENA.width + margin ||
      b.y < -margin ||
      b.y > ARENA.height + margin
    ) {
      return 'dead'
    }
  }

  for (const o of obstacles) {
    if (o.kind === 'hazard') {
      if (circleRectOverlap(b.x, b.y, BULLET_RADIUS, o.x, o.y, o.w, o.h)) {
        return 'dead'
      }
      continue
    }
    // block
    if (state.bulletMode === 'bounce') {
      if (bounceBulletOffRect(b, o.x, o.y, o.w, o.h)) {
        /* bounced */
      }
    } else if (circleRectOverlap(b.x, b.y, BULLET_RADIUS, o.x, o.y, o.w, o.h)) {
      return 'dead'
    }
  }

  if (state.bulletMode === 'bounce' && b.bounces > state.maxBounces) {
    return 'dead'
  }
  return 'alive'
}

function blockWithShield(gun: Gun, particles: Particle[]): boolean {
  if (!gun.fx?.shield) return false
  const { shield: _, ...rest } = gun.fx
  gun.fx = Object.keys(rest).length ? rest : undefined
  burst(particles, gun.x, gun.y, '#5ec8ff', 24)
  playShieldBlock()
  return true
}

let nextPowerUpId = 1

export function updateGame(state: GameState, realDt: number): GameState {
  const dt = state.slowMo > 0 ? realDt * SLOW_MO_SPEED : realDt
  let slowMo = Math.max(0, state.slowMo - realDt)
  let slowMoBullet = state.slowMoBullet

  const updateShards = (list: Shard[]) =>
    list
      .map((s) => ({
        ...s,
        x: s.x + s.vx * dt,
        y: s.y + s.vy * dt,
        vx: s.vx * 0.98,
        vy: s.vy * 0.98 + 280 * dt,
        angle: s.angle + s.spin * dt,
        life: s.life - dt,
      }))
      .filter((s) => s.life > 0)

  const ageBooms = (list: Boom[]) => list.map((b) => ({ ...b, t: b.t + dt })).filter((b) => b.t < BOOM_LIFE)
  const ageTaunts = (list: Taunt[]) => list.map((t) => ({ ...t, t: t.t + dt })).filter((t) => t.t < TAUNT_LIFE)

  if (state.phase !== 'playing') {
    return {
      ...state,
      slowMo,
      booms: ageBooms(state.booms),
      taunts: ageTaunts(state.taunts),
      messageTimer: Math.max(0, state.messageTimer - dt),
      flash: Math.max(0, state.flash - dt),
      particles: state.particles
        .map((p) => ({
          ...p,
          x: p.x + p.vx * dt,
          y: p.y + p.vy * dt,
          life: p.life - dt,
          vx: p.vx * 0.96,
          vy: p.vy * 0.96,
        }))
        .filter((p) => p.life > 0),
      shards: updateShards(state.shards),
    }
  }

  const obstacles = state.obstacles.map((o) => ({ ...o }))
  updateMovers(obstacles, dt)

  const guns: [Gun, Gun] = [{ ...state.guns[0] }, { ...state.guns[1] }]
  if (!guns[0].broken) integrateGun(guns[0], dt, obstacles)
  if (!guns[1].broken) integrateGun(guns[1], dt, obstacles)
  if (!guns[0].broken && !guns[1].broken) separateGuns(guns[0], guns[1])
  tickFx(guns[0], dt)
  tickFx(guns[1], dt)
  let powerups = state.powerups
  let powerupTimer = state.powerupTimer

  let blueCooldown = Math.max(0, state.blueCooldown - dt)
  let redCooldown = Math.max(0, state.redCooldown - dt)
  const bullets = state.bullets.map((b) => ({ ...b, trail: [...b.trail] }))
  const particles = [...state.particles]
  const shards = [...state.shards]
  const booms = [...state.booms]
  let taunts = ageTaunts(state.taunts)
  let tauntCooldown = Math.max(0, state.tauntCooldown - dt)
  let phase: Phase = state.phase
  let flash = Math.max(0, state.flash - dt)
  let messageTimer = state.messageTimer

  // Hazards kill on touch → break character
  if (!guns[0].broken && gunHitsHazard(guns[0], obstacles)) {
    shatterGun(guns[0], shards, particles, booms)
    phase = 'lost'
    flash = 0.4
    messageTimer = 1.4
    slowMo = Math.max(slowMo, SLOW_MO_AFTER_BREAK_S)
  } else if (!guns[1].broken && gunHitsHazard(guns[1], obstacles)) {
    shatterGun(guns[1], shards, particles, booms)
    phase = 'won'
    flash = 0.4
    messageTimer = 1.4
    slowMo = Math.max(slowMo, SLOW_MO_AFTER_BREAK_S)
  }

  if (phase === 'playing') {
    for (const b of bullets) {
      if (!b.alive) continue
      b.x += b.vx * dt
      b.y += b.vy * dt
      const result = handleBulletWorld(b, state, obstacles)
      if (result === 'dead') {
        b.alive = false
        if (b.owner === 'red' && state.redAI) redCooldown = state.aiReload
        if (b.owner === 'blue') {
          const next = maybeTaunt({ ...state, tauntCooldown })
          if (next) {
            taunts = [...taunts.filter((t) => t.side !== 'red'), next]
            tauntCooldown = 7 + Math.random() * 8
          }
        }
        continue
      }
      b.trail.push({ x: b.x, y: b.y })
      if (b.trail.length > MAX_TRAIL) b.trail.shift()
    }

    continueBurst(state, guns[0], bullets, particles, dt)
    continueBurst(state, guns[1], bullets, particles, dt)

    if (powerupTimer >= 0) {
      powerups = powerups.map((p) => movePowerUp(p, dt, obstacles)).filter((p) => p.t < POWERUP_LIFE)
      powerupTimer -= dt
      if (powerupTimer <= 0) {
        powerupTimer = 6 + Math.random() * 4
        if (powerups.length < MAX_POWERUPS) {
          const p = spawnPowerUp({ ...state, powerups }, obstacles, guns, nextPowerUpId++)
          if (p) powerups = [...powerups, p]
        }
      }
      // Shooting a bubble grabs it for the shooter (the bullet keeps flying); bumping into one works too.
      powerups = powerups.filter((p) => {
        let taker = -1
        for (const b of bullets) {
          if (b.alive && Math.hypot(b.x - p.x, b.y - p.y) < BUBBLE_RADIUS + BULLET_RADIUS) {
            taker = b.owner === 'blue' ? 0 : 1
            break
          }
        }
        if (taker < 0) {
          taker = guns.findIndex((g) => !g.broken && Math.hypot(g.x - p.x, g.y - p.y) < BUBBLE_RADIUS + GUN_RADIUS - 6)
        }
        if (taker < 0) return true
        const me = guns[taker]
        grantPower(p.kind, me, guns[1 - taker])
        popBubble(particles, p)
        playPowerUp()
        taunts = [...taunts.filter((t) => t.side !== me.id), { side: me.id, text: POWERS[p.kind].label, t: 0 }]
        return false
      })
    }

    const hasRedBullet = bullets.some((b) => b.alive && b.owner === 'red')
    if (state.redAI && !hasRedBullet && !guns[1].burstLeft && !guns[1].fx?.frozen && redCooldown <= 0 && !guns[1].broken) {
      fireGun(state, guns, bullets, particles, 'red')
    }

    for (const b of bullets) {
      if (!b.alive) continue
      if (b.owner === 'blue' && !guns[1].broken && hitTest(b, guns[1], guns[0])) {
        b.alive = false
        if (blockWithShield(guns[1], particles)) continue
        shatterGun(guns[1], shards, particles, booms)
        phase = 'won'
        flash = 0.4
        messageTimer = 1.4
        slowMo = Math.max(slowMo, SLOW_MO_AFTER_BREAK_S)
      } else if (b.owner === 'red' && !guns[0].broken && hitTest(b, guns[0], guns[1])) {
        b.alive = false
        if (blockWithShield(guns[0], particles)) continue
        shatterGun(guns[0], shards, particles, booms)
        phase = 'lost'
        flash = 0.4
        messageTimer = 1.4
        slowMo = Math.max(slowMo, SLOW_MO_AFTER_BREAK_S)
      }
    }

    if (phase === 'playing' && slowMo <= 0) {
      for (const b of bullets) {
        if (!b.alive || b.id === slowMoBullet) continue
        const [target, shooter] = b.owner === 'blue' ? [guns[1], guns[0]] : [guns[0], guns[1]]
        if (target.broken || target.fx?.shield) continue
        if (aboutToHit(b, target, shooter, SLOW_MO_LOOKAHEAD)) {
          slowMo = SLOW_MO_REAL_S
          slowMoBullet = b.id
          break
        }
      }
    }
  }

  const nextParticles = particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      life: p.life - dt,
      vx: p.vx * 0.96,
      vy: p.vy * 0.96,
    }))
    .filter((p) => p.life > 0)

  return {
    ...state,
    guns,
    bullets: bullets.filter((b) => b.alive),
    particles: nextParticles,
    shards: updateShards(shards),
    booms: ageBooms(booms),
    taunts,
    tauntCooldown,
    obstacles,
    blueCooldown,
    redCooldown,
    phase,
    flash,
    messageTimer,
    slowMo,
    slowMoBullet,
    powerups,
    powerupTimer,
  }
}

export function retryLevel(state: GameState): GameState {
  return createState(
    state.level,
    { blue: state.guns[0].skin, red: state.guns[1].skin },
    { redAI: state.redAI, guns: { blue: state.guns[0].weapon, red: state.guns[1].weapon } },
  )
}
