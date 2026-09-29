import { ARENA } from './arena'
import { drawCharacter, type Painter, type Style } from './character'
import { getSkin } from './skins'
import type { Bullet, GameState, Gun, Obstacle, Particle, Shard } from './types'

function drawWalls(ctx: CanvasRenderingContext2D, state: GameState) {
  const { width, height, wall } = ARENA
  const { theme } = state

  ctx.fillStyle = theme.floor
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(wall, wall, width - wall * 2, height - wall * 2)

  const gold = ctx.createLinearGradient(0, 0, width, height)
  gold.addColorStop(0, theme.wallA)
  gold.addColorStop(0.5, theme.wallB)
  gold.addColorStop(1, theme.wallA)
  ctx.fillStyle = gold

  ctx.fillRect(0, 0, width, wall)
  ctx.fillRect(0, height - wall, width, wall)
  ctx.fillRect(0, 0, wall, height)
  ctx.fillRect(width - wall, 0, wall, height)

  ctx.strokeStyle = 'rgba(0,0,0,0.28)'
  ctx.lineWidth = 1.5
  for (let i = 4; i < wall - 2; i += 5) {
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(width, i)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, height - i)
    ctx.lineTo(width, height - i)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.lineWidth = 2
  ctx.strokeRect(wall - 1, wall - 1, width - wall * 2 + 2, height - wall * 2 + 2)

  if (state.bulletMode === 'bounce') {
    ctx.fillStyle = theme.accent
    ctx.globalAlpha = 0.15
    ctx.fillRect(wall, wall, 6, height - wall * 2)
    ctx.fillRect(width - wall - 6, wall, 6, height - wall * 2)
    ctx.globalAlpha = 1
  }
}

function drawObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[], accent: string) {
  for (const o of obstacles) {
    if (o.kind === 'hazard') {
      ctx.save()
      ctx.shadowColor = '#ff4d5a'
      ctx.shadowBlur = 12
      ctx.fillStyle = '#ff4d5a'
      const cx = o.x + o.w / 2
      const cy = o.y + o.h / 2
      const r = Math.min(o.w, o.h) / 2
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffd0d4'
      ctx.beginPath()
      ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.28, 0, Math.PI * 2)
      ctx.fill()
      // spikes
      ctx.strokeStyle = '#ffeaec'
      ctx.lineWidth = 2
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * r * 0.4, cy + Math.sin(a) * r * 0.4)
        ctx.lineTo(cx + Math.cos(a) * (r + 4), cy + Math.sin(a) * (r + 4))
        ctx.stroke()
      }
      ctx.restore()
      continue
    }

    // block
    const g = ctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y + o.h)
    g.addColorStop(0, accent)
    g.addColorStop(1, '#8a7020')
    ctx.fillStyle = g
    ctx.fillRect(o.x, o.y, o.w, o.h)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 2
    ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2)
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    for (let y = o.y + 6; y < o.y + o.h - 4; y += 8) {
      ctx.fillRect(o.x + 4, y, o.w - 8, 2)
    }
  }
}

export function canvasPainter(ctx: CanvasRenderingContext2D): Painter {
  const paint = (s: Style) => {
    ctx.globalAlpha = s.alpha ?? 1
    if (s.fill) {
      ctx.fillStyle = s.fill
      ctx.fill()
    }
    if (s.stroke) {
      ctx.strokeStyle = s.stroke
      ctx.lineWidth = s.width ?? 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
  return {
    save: () => ctx.save(),
    restore: () => ctx.restore(),
    translate: (x, y) => ctx.translate(x, y),
    rotate: (rad) => ctx.rotate(rad),
    scale: (x, y) => ctx.scale(x, y),
    oval(cx, cy, rx, ry, rot, s) {
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2)
      paint(s)
    },
    circle(cx, cy, r, s) {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      paint(s)
    },
    poly(pts, closed, s) {
      ctx.beginPath()
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
      if (closed) ctx.closePath()
      paint(s)
    },
    arc(cx, cy, r, a0, a1, s) {
      ctx.beginPath()
      ctx.arc(cx, cy, r, a0, a1)
      if (s.fill) ctx.closePath()
      paint(s)
    },
    rrect(x, y, w, h, r, s) {
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, r)
      paint(s)
    },
    glow(cx, cy, rx, ry, color, alpha) {
      ctx.save()
      ctx.shadowColor = color
      ctx.shadowBlur = 18
      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    },
  }
}

function drawGunCharacter(p: Painter, gun: Gun, now: number) {
  if (gun.broken) return
  const pose = { angle: gun.angle, spin: gun.spin, kick: gun.kick, color: gun.color, seed: gun.id === 'blue' ? 0 : 1.7 }
  drawCharacter(p, gun.x, gun.y, pose, getSkin(gun.skin), now)
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet) {
  if (b.trail.length > 1) {
    ctx.beginPath()
    ctx.moveTo(b.trail[0].x, b.trail[0].y)
    for (let i = 1; i < b.trail.length; i++) {
      ctx.lineTo(b.trail[i].x, b.trail[i].y)
    }
    ctx.strokeStyle = b.color
    ctx.globalAlpha = 0.75
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  ctx.beginPath()
  ctx.arc(b.x, b.y, 4, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = b.color
  ctx.shadowBlur = 10
  ctx.fill()
  ctx.shadowBlur = 0
}

function drawShard(ctx: CanvasRenderingContext2D, s: Shard) {
  const a = Math.max(0, s.life / s.maxLife)
  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.rotate(s.angle)
  ctx.globalAlpha = a
  ctx.fillStyle = s.color
  ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h)
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 1
  ctx.strokeRect(-s.w / 2, -s.h / 2, s.w, s.h)
  ctx.restore()
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const a = Math.max(0, p.life / p.maxLife)
  ctx.globalAlpha = a
  ctx.fillStyle = p.color
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState) {
  drawWalls(ctx, state)
  drawObstacles(ctx, state.obstacles, state.theme.accent)

  for (const p of state.particles) drawParticle(ctx, p)
  for (const s of state.shards) drawShard(ctx, s)
  for (const b of state.bullets) drawBullet(ctx, b)
  const now = performance.now()
  const painter = canvasPainter(ctx)
  for (const g of state.guns) drawGunCharacter(painter, g, now)

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${state.flash * 0.35})`
    ctx.fillRect(0, 0, ARENA.width, ARENA.height)
  }

  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = '700 16px "Segoe UI", system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`Lv ${state.level} · ${state.levelName}`, ARENA.wall + 8, ARENA.wall + 24)

  if (state.bulletMode === 'bounce') {
    ctx.font = '600 11px "Segoe UI", system-ui, sans-serif'
    ctx.fillStyle = state.theme.accent
    ctx.fillText('RICOCHET', ARENA.wall + 8, ARENA.wall + 42)
  }

  if (state.phase === 'won') {
    drawBanner(ctx, 'BREAK!', '#4fc3ff')
  } else if (state.phase === 'lost') {
    drawBanner(ctx, 'BROKEN', '#ff4d5a')
  }
}

function drawBanner(ctx: CanvasRenderingContext2D, text: string, color: string) {
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(0, ARENA.height * 0.42, ARENA.width, 70)
  ctx.fillStyle = color
  ctx.font = '800 36px "Segoe UI", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.shadowColor = color
  ctx.shadowBlur = 18
  ctx.fillText(text, ARENA.width / 2, ARENA.height * 0.42 + 48)
  ctx.restore()
}
