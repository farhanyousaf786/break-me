import { ARENA } from './arena'
import { getLevel } from './levels'
import { playBreak, playShoot } from './sound'
import type { Bullet, GameState, Gun, Obstacle, Particle, Phase, Shard, Vec2 } from './types'

export { ARENA }

const BULLET_RADIUS = 4
const GUN_HIT_RADIUS = 28
const GUN_RADIUS = 30
const MAX_TRAIL = 18

const BASE_RECOIL = 340
const ANGULAR_KICK = 9.5
const SIDE_KICK = 55

const LINEAR_DAMP = 0.975
const ANGULAR_DAMP = 0.985
const WALL_RESTITUTION = 0.55

let nextBulletId = 1

export function createState(levelId = 1): GameState {
  const cfg = getLevel(levelId)

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
        broken: false,
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
        broken: false,
      },
    ],
    bullets: [],
    particles: [],
    shards: [],
    obstacles: cfg.obstacles.map((o) => ({ ...o })),
    blueCooldown: 0,
    redCooldown: cfg.aiFirstShot,
    messageTimer: 0,
    flash: 0,
    aiReload: cfg.aiReload,
    recoilScale: cfg.recoilScale,
    bulletSpeed: cfg.bulletSpeed,
    bulletMode: cfg.bulletMode,
    maxBounces: cfg.maxBounces,
    theme: cfg.theme,
    levelName: cfg.name,
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
}

function spawnBullet(gun: Gun, bulletSpeed: number): Bullet {
  const m = muzzle(gun)
  return {
    id: nextBulletId++,
    owner: gun.id,
    x: m.x,
    y: m.y,
    vx: Math.cos(gun.angle) * bulletSpeed,
    vy: Math.sin(gun.angle) * bulletSpeed,
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

/** Shatter cute character into flying pieces */
function shatterGun(gun: Gun, shards: Shard[], particles: Particle[]) {
  gun.broken = true
  playBreak()
  burst(particles, gun.x, gun.y, gun.color, 40)

  const pieces: { w: number; h: number; color: string; ox: number; oy: number }[] = [
    { w: 14, h: 14, color: '#ffe0bd', ox: 0, oy: -12 }, // head
    { w: 18, h: 14, color: gun.color, ox: 0, oy: 4 }, // body
    { w: 10, h: 8, color: gun.accent, ox: -8, oy: 14 }, // foot
    { w: 10, h: 8, color: gun.accent, ox: 8, oy: 14 },
    { w: 12, h: 8, color: '#4a5160', ox: 20, oy: 0 }, // gun
    { w: 14, h: 5, color: '#6b7385', ox: 32, oy: 0 }, // barrel
    { w: 8, h: 8, color: gun.color, ox: -10, oy: -20 }, // hair
    { w: 7, h: 7, color: '#ffe0bd', ox: 12, oy: 2 }, // hand
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
  bullets.push(spawnBullet(gun, state.bulletSpeed))
  applyRecoil(gun, state.recoilScale)
  muzzleSparks(particles, gun)
  playShoot()
}

export function tryShootBlue(state: GameState): GameState {
  if (state.phase !== 'playing') return state
  if (state.blueCooldown > 0) return state
  if (state.bullets.some((b) => b.alive && b.owner === 'blue')) return state

  const guns: [Gun, Gun] = [{ ...state.guns[0] }, { ...state.guns[1] }]
  const bullets = [...state.bullets]
  const particles = [...state.particles]
  fireGun(state, guns, bullets, particles, 'blue')

  return {
    ...state,
    guns,
    bullets,
    particles,
    blueCooldown: 0.28,
  }
}

function hitTest(bullet: Bullet, gun: Gun): boolean {
  const dx = bullet.x - gun.x
  const dy = bullet.y - gun.y
  return dx * dx + dy * dy <= GUN_HIT_RADIUS * GUN_HIT_RADIUS
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

export function updateGame(state: GameState, dt: number): GameState {
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

  if (state.phase !== 'playing') {
    return {
      ...state,
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

  let blueCooldown = Math.max(0, state.blueCooldown - dt)
  let redCooldown = Math.max(0, state.redCooldown - dt)
  const bullets = state.bullets.map((b) => ({ ...b, trail: [...b.trail] }))
  const particles = [...state.particles]
  const shards = [...state.shards]
  let phase: Phase = state.phase
  let flash = Math.max(0, state.flash - dt)
  let messageTimer = state.messageTimer

  // Hazards kill on touch → break character
  if (!guns[0].broken && gunHitsHazard(guns[0], obstacles)) {
    shatterGun(guns[0], shards, particles)
    phase = 'lost'
    flash = 0.4
    messageTimer = 1.4
  } else if (!guns[1].broken && gunHitsHazard(guns[1], obstacles)) {
    shatterGun(guns[1], shards, particles)
    phase = 'won'
    flash = 0.4
    messageTimer = 1.4
  }

  if (phase === 'playing') {
    for (const b of bullets) {
      if (!b.alive) continue
      b.x += b.vx * dt
      b.y += b.vy * dt
      const result = handleBulletWorld(b, state, obstacles)
      if (result === 'dead') {
        b.alive = false
        if (b.owner === 'red') redCooldown = state.aiReload
        continue
      }
      b.trail.push({ x: b.x, y: b.y })
      if (b.trail.length > MAX_TRAIL) b.trail.shift()
    }

    const hasRedBullet = bullets.some((b) => b.alive && b.owner === 'red')
    if (!hasRedBullet && redCooldown <= 0 && !guns[1].broken) {
      fireGun(state, guns, bullets, particles, 'red')
    }

    for (const b of bullets) {
      if (!b.alive) continue
      if (b.owner === 'blue' && !guns[1].broken && hitTest(b, guns[1])) {
        b.alive = false
        shatterGun(guns[1], shards, particles)
        phase = 'won'
        flash = 0.4
        messageTimer = 1.4
      } else if (b.owner === 'red' && !guns[0].broken && hitTest(b, guns[0])) {
        b.alive = false
        shatterGun(guns[0], shards, particles)
        phase = 'lost'
        flash = 0.4
        messageTimer = 1.4
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
    obstacles,
    blueCooldown,
    redCooldown,
    phase,
    flash,
    messageTimer,
  }
}

export function retryLevel(state: GameState): GameState {
  return createState(state.level)
}
