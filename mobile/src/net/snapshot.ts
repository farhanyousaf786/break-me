import { shatterGun, SLOW_MO_SPEED, updateGame } from '../game/engine'
import { POWER_KINDS, POWERS } from '../game/powerups'
import { playPowerUp, playShieldBlock, playShoot } from '../game/sound'
import type { Bullet, GameState, Gun, Phase, PowerUp } from '../game/types'

/**
 * Host-authoritative sync: the host simulates and publishes compact snapshots ~15×/s.
 * The guest extrapolates between them and eases toward each new one.
 */

/** [x, y, vx, vy, angle, spin, kick, broken, shield, giant, tiny, frozen, triple, pickups] (fx in seconds left) */
type NetGun = number[]
/** [id, kind index (POWER_KINDS), x, y] */
type NetPowerUp = number[]

const FX_KEYS = ['shield', 'giant', 'tiny', 'frozen', 'triple'] as const
/** [id, owner (0 blue / 1 red), x, y, vx, vy] */
type NetBullet = number[]

export type Snapshot = {
  /** Round number — a change means "reset the arena" */
  r: number
  lv: number
  ph: 0 | 1 | 2
  g: NetGun[]
  b?: NetBullet[]
  /** Obstacle positions (movers) */
  o?: number[][]
  /** Banner text ("GET READY", "ROUND 2"...) */
  m?: string
  p?: NetPowerUp[]
  /** Slow motion seconds left */
  s?: number
  /** Countdown ms until GO on the host: 0 = live, -1 = still waiting for the guest */
  c?: number
}

const r1 = (n: number) => Math.round(n * 10) / 10
const PHASES: Phase[] = ['playing', 'won', 'lost']

export function encodeSnapshot(state: GameState, round: number, message: string, countdownMs: number): Snapshot {
  return {
    r: round,
    c: countdownMs,
    lv: state.level,
    ph: PHASES.indexOf(state.phase) as 0 | 1 | 2,
    g: state.guns.map((g) => [
      r1(g.x),
      r1(g.y),
      r1(g.vx),
      r1(g.vy),
      Math.round(g.angle * 1000) / 1000,
      r1(g.spin),
      Math.round(g.kick * 100) / 100,
      g.broken ? 1 : 0,
      ...FX_KEYS.map((k) => r1(g.fx?.[k] ?? 0)),
      g.pickups ?? 0,
    ]),
    p: state.powerups.map((p) => [p.id, POWER_KINDS.indexOf(p.kind), r1(p.x), r1(p.y)]),
    // Firebase rejects `undefined` anywhere in a write, so "no slow motion" is sent as 0.
    s: state.slowMo > 0 ? Math.round(state.slowMo * 100) / 100 : 0,
    b: state.bullets
      .filter((b) => b.alive)
      .map((b) => [b.id, b.owner === 'blue' ? 0 : 1, r1(b.x), r1(b.y), r1(b.vx), r1(b.vy)]),
    o: state.obstacles.map((o) => [r1(o.x), r1(o.y)]),
    m: message,
  }
}

function wrapAngle(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a))
}

export function applySnapshot(local: GameState, snap: Snapshot): GameState {
  const shards = [...local.shards]
  const particles = [...local.particles]
  const booms = [...local.booms]
  let flash = local.flash
  let taunts = local.taunts
  const nextPowerups: PowerUp[] = (snap.p ?? []).map(([id, k, x, y]) => {
    const old = local.powerups.find((p) => p.id === id)
    return { id, kind: POWER_KINDS[k] ?? 'shield', x, y, vx: 0, vy: 0, t: old ? old.t : 0 }
  })
  const gone = local.powerups.filter((p) => !nextPowerups.some((n) => n.id === p.id))

  const guns = local.guns.map((g, i) => {
    const n = snap.g[i]
    const gun: Gun = { ...g, vx: n[2], vy: n[3], spin: n[5], kick: Math.max(g.kick, n[6]) }
    if (n.length >= 14) {
      const fx: NonNullable<Gun['fx']> = {}
      FX_KEYS.forEach((k, j) => {
        if (n[8 + j] > 0) fx[k] = n[8 + j]
      })
      if ((g.fx?.shield ?? 0) > 0.3 && !fx.shield) {
        playShieldBlock()
        burstAt(particles, g.x, g.y, '#5ec8ff')
      }
      gun.fx = Object.keys(fx).length ? fx : undefined
      const pickups = n[13]
      if (pickups > (g.pickups ?? 0)) {
        const grabbed = gone.shift()
        if (grabbed) {
          playPowerUp()
          taunts = [...taunts.filter((t) => t.side !== g.id), { side: g.id, text: POWERS[grabbed.kind].label, t: 0 }]
        }
      }
      gun.pickups = pickups
    }
    const far = Math.hypot(n[0] - g.x, n[1] - g.y) > 60
    gun.x = far ? n[0] : g.x + (n[0] - g.x) * 0.5
    gun.y = far ? n[1] : g.y + (n[1] - g.y) * 0.5
    gun.angle = far ? n[4] : g.angle + wrapAngle(n[4] - g.angle) * 0.5
    if (n[7] && !gun.broken) {
      gun.x = n[0]
      gun.y = n[1]
      shatterGun(gun, shards, particles, booms)
      flash = 0.4
    }
    return gun
  }) as [Gun, Gun]

  const prev = new Map(local.bullets.map((b) => [b.id, b]))
  // Spray guns add several bullets at once; play one shot per side, not one per pellet.
  const shotBy = new Set<number>()
  const bullets: Bullet[] = (snap.b ?? []).map((nb) => {
    const [id, owner, x, y, vx, vy] = nb
    const old = prev.get(id)
    if (!old && !shotBy.has(owner)) {
      shotBy.add(owner)
      playShoot(guns[owner === 0 ? 0 : 1].weapon)
    }
    const side = owner === 0 ? 'blue' : 'red'
    return {
      id,
      owner: side,
      x,
      y,
      vx,
      vy,
      color: side === 'blue' ? guns[0].color : guns[1].color,
      alive: true,
      trail: old ? [...old.trail, { x, y }].slice(-18) : [{ x, y }],
      bounces: 0,
    }
  })

  const obstacles = local.obstacles.map((o, i) => {
    const p = snap.o?.[i]
    return p ? { ...o, x: p[0], y: p[1] } : o
  })

  return {
    ...local,
    guns,
    bullets,
    obstacles,
    shards,
    particles,
    booms,
    flash,
    taunts,
    powerups: nextPowerups,
    slowMo: snap.s ?? 0,
    phase: PHASES[snap.ph],
  }
}

function burstAt(particles: GameState['particles'], x: number, y: number, color: string) {
  for (let i = 0; i < 20; i++) {
    const a = (Math.PI * 2 * i) / 20
    const speed = 60 + Math.random() * 160
    particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.4, maxLife: 0.4, color, size: 2.5 })
  }
}

/** Guest-side motion between snapshots (no hit detection — the host decides hits). */
export function extrapolate(state: GameState, realDt: number): GameState {
  // Match the host's slow motion so bullets don't race ahead and snap back.
  const dt = state.slowMo > 0 ? realDt * SLOW_MO_SPEED : realDt
  const damp = Math.pow(0.975, dt * 60)
  const spinDamp = Math.pow(0.985, dt * 60)
  const guns = state.guns.map((g) =>
    g.broken
      ? g
      : {
          ...g,
          x: g.x + g.vx * dt,
          y: g.y + g.vy * dt,
          angle: g.angle + g.spin * dt,
          vx: g.vx * damp,
          vy: g.vy * damp,
          spin: g.spin * spinDamp,
          kick: Math.max(0, g.kick - dt * 4),
        },
  ) as [Gun, Gun]
  const bullets = state.bullets.map((b) => {
    const x = b.x + b.vx * dt
    const y = b.y + b.vy * dt
    return { ...b, x, y, trail: [...b.trail, { x, y }].slice(-18) }
  })
  // A non-playing phase makes updateGame only age particles/shards and the flash (it applies slow motion itself).
  const fx = updateGame({ ...state, phase: 'won' }, realDt)
  return {
    ...state,
    guns,
    bullets,
    powerups: state.powerups.map((p) => ({ ...p, t: p.t + dt })),
    particles: fx.particles,
    shards: fx.shards,
    booms: fx.booms,
    taunts: fx.taunts,
    flash: fx.flash,
    slowMo: fx.slowMo,
  }
}
