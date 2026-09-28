import {
  BlurStyle,
  PaintStyle,
  Skia,
  StrokeCap,
  TileMode,
  matchFont,
  type SkCanvas,
  type SkFont,
  type SkPaint,
} from '@shopify/react-native-skia'
import { Platform } from 'react-native'
import { ARENA } from './arena'
import type { Bullet, GameState, Gun, Obstacle, Particle, Shard } from './types'

const DEG = 180 / Math.PI
const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' })

const fonts = new Map<string, SkFont>()
function font(size: number, weight: 'bold' | 'normal' = 'bold'): SkFont {
  const key = `${size}-${weight}`
  let f = fonts.get(key)
  if (!f) {
    f = matchFont({ fontFamily, fontSize: size, fontWeight: weight })
    fonts.set(key, f)
  }
  return f
}

function fill(color: string, alpha = 1): SkPaint {
  const p = Skia.Paint()
  p.setAntiAlias(true)
  p.setColor(Skia.Color(color))
  if (alpha < 1) p.setAlphaf(alpha)
  return p
}

function stroke(color: string, width: number, alpha = 1): SkPaint {
  const p = fill(color, alpha)
  p.setStyle(PaintStyle.Stroke)
  p.setStrokeWidth(width)
  return p
}

function glow(color: string, sigma: number, alpha = 0.7): SkPaint {
  const p = fill(color, alpha)
  p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, sigma, true))
  return p
}

function rect(x: number, y: number, w: number, h: number) {
  return Skia.XYWHRect(x, y, w, h)
}

function ellipse(
  canvas: SkCanvas,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation: number,
  paint: SkPaint,
) {
  canvas.save()
  if (rotation) canvas.rotate(rotation * DEG, cx, cy)
  canvas.drawOval(rect(cx - rx, cy - ry, rx * 2, ry * 2), paint)
  canvas.restore()
}

function line(canvas: SkCanvas, x1: number, y1: number, x2: number, y2: number, paint: SkPaint) {
  canvas.drawLine(x1, y1, x2, y2, paint)
}

function drawWalls(canvas: SkCanvas, state: GameState) {
  const { width, height, wall } = ARENA
  const { theme } = state

  canvas.drawRect(rect(0, 0, width, height), fill(theme.floor))
  canvas.drawRect(rect(wall, wall, width - wall * 2, height - wall * 2), fill('#000000', 0.18))

  const gold = Skia.Paint()
  gold.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: 0, y: 0 },
      { x: width, y: height },
      [Skia.Color(theme.wallA), Skia.Color(theme.wallB), Skia.Color(theme.wallA)],
      [0, 0.5, 1],
      TileMode.Clamp,
    ),
  )
  canvas.drawRect(rect(0, 0, width, wall), gold)
  canvas.drawRect(rect(0, height - wall, width, wall), gold)
  canvas.drawRect(rect(0, 0, wall, height), gold)
  canvas.drawRect(rect(width - wall, 0, wall, height), gold)

  const grain = stroke('#000000', 1.5, 0.28)
  for (let i = 4; i < wall - 2; i += 5) {
    line(canvas, 0, i, width, i, grain)
    line(canvas, 0, height - i, width, height - i, grain)
  }

  canvas.drawRect(
    rect(wall - 1, wall - 1, width - wall * 2 + 2, height - wall * 2 + 2),
    stroke('#ffffff', 2, 0.28),
  )

  if (state.bulletMode === 'bounce') {
    const edge = fill(theme.accent, 0.15)
    canvas.drawRect(rect(wall, wall, 6, height - wall * 2), edge)
    canvas.drawRect(rect(width - wall - 6, wall, 6, height - wall * 2), edge)
  }
}

function drawObstacles(canvas: SkCanvas, obstacles: Obstacle[], accent: string) {
  for (const o of obstacles) {
    if (o.kind === 'hazard') {
      const cx = o.x + o.w / 2
      const cy = o.y + o.h / 2
      const r = Math.min(o.w, o.h) / 2
      canvas.drawCircle(cx, cy, r + 2, glow('#ff4d5a', 6))
      canvas.drawCircle(cx, cy, r, fill('#ff4d5a'))
      canvas.drawCircle(cx - r * 0.25, cy - r * 0.25, r * 0.28, fill('#ffd0d4'))
      const spike = stroke('#ffeaec', 2)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        line(
          canvas,
          cx + Math.cos(a) * r * 0.4,
          cy + Math.sin(a) * r * 0.4,
          cx + Math.cos(a) * (r + 4),
          cy + Math.sin(a) * (r + 4),
          spike,
        )
      }
      continue
    }

    const block = Skia.Paint()
    block.setShader(
      Skia.Shader.MakeLinearGradient(
        { x: o.x, y: o.y },
        { x: o.x + o.w, y: o.y + o.h },
        [Skia.Color(accent), Skia.Color('#8a7020')],
        null,
        TileMode.Clamp,
      ),
    )
    canvas.drawRect(rect(o.x, o.y, o.w, o.h), block)
    canvas.drawRect(rect(o.x + 1, o.y + 1, o.w - 2, o.h - 2), stroke('#ffffff', 2, 0.35))
    const stripe = fill('#000000', 0.2)
    for (let y = o.y + 6; y < o.y + o.h - 4; y += 8) {
      canvas.drawRect(rect(o.x + 4, y, o.w - 8, 2), stripe)
    }
  }
}

function drawCharacter(canvas: SkCanvas, gun: Gun) {
  if (gun.broken) return
  const isBlue = gun.id === 'blue'
  const skin = isBlue ? '#ffe0bd' : '#ffd4c4'
  const blush = isBlue ? '#ff9eb5' : '#ff7a90'
  const hair = isBlue ? '#5ad0ff' : '#ff6b7a'

  canvas.save()
  canvas.translate(gun.x, gun.y)
  canvas.rotate(gun.angle * DEG, 0, 0)

  canvas.drawCircle(0, -2, 26, glow(gun.color, 10, 0.45))

  ellipse(canvas, -6, 16, 7, 5, -0.2, fill(gun.accent))
  ellipse(canvas, 0, 4, 16, 14, 0, fill(gun.color))
  ellipse(canvas, 8, 17, 7, 5, 0.25, fill(gun.accent))

  canvas.drawCircle(0, -12, 15, fill(skin))

  const hairPath = Skia.PathBuilder.Make().addArc(rect(-14, -32, 24, 16), 180, 180).close().detach()
  canvas.drawPath(hairPath, fill(hair))
  ellipse(canvas, 8, -22, 6, 5, 0.4, fill(hair))

  canvas.drawCircle(-13, -18, 4, fill(skin))
  canvas.drawCircle(13, -18, 4, fill(skin))

  const cheek = fill(blush, 0.55)
  ellipse(canvas, -8, -8, 3.5, 2.2, 0, cheek)
  ellipse(canvas, 8, -8, 3.5, 2.2, 0, cheek)

  const eye = fill('#2a2d33')
  ellipse(canvas, -5.5, -13, 2.6, 3.4, 0, eye)
  ellipse(canvas, 5.5, -13, 2.6, 3.4, 0, eye)
  const shine = fill('#ffffff')
  canvas.drawCircle(-4.5, -14.5, 1.1, shine)
  canvas.drawCircle(6.5, -14.5, 1.1, shine)

  const smile = stroke('#c4786a', 1.6)
  smile.setStrokeCap(StrokeCap.Round)
  const smilePath = Skia.PathBuilder.Make()
    .addArc(rect(-4, -11, 8, 8), 0.15 * DEG, (Math.PI - 0.3) * DEG)
    .detach()
  canvas.drawPath(smilePath, smile)

  ellipse(canvas, 12, 2, 5, 4, 0.2, fill(skin))

  canvas.drawRect(rect(14, -3, 16, 10), fill('#4a5160'))
  canvas.drawRect(rect(18, 7, 7, 9), fill('#2e3440'))
  canvas.drawRect(rect(30, -1, 16, 6), fill('#6b7385'))
  canvas.drawRect(rect(44, 0, 5, 4), fill('#f5f7fa'))
  canvas.drawRect(rect(16, -2, 8, 2), fill('#ffffff', 0.45))

  canvas.drawCircle(-12, 6, 4.5, fill(skin))

  canvas.restore()
}

function drawBullet(canvas: SkCanvas, b: Bullet) {
  if (b.trail.length > 1) {
    const builder = Skia.PathBuilder.Make().moveTo(b.trail[0].x, b.trail[0].y)
    for (let i = 1; i < b.trail.length; i++) builder.lineTo(b.trail[i].x, b.trail[i].y)
    const trail = stroke(b.color, 2.5, 0.75)
    trail.setStrokeCap(StrokeCap.Round)
    canvas.drawPath(builder.detach(), trail)
  }
  canvas.drawCircle(b.x, b.y, 7, glow(b.color, 5, 0.8))
  canvas.drawCircle(b.x, b.y, 4, fill('#ffffff'))
}

function drawShard(canvas: SkCanvas, s: Shard) {
  const a = Math.max(0, s.life / s.maxLife)
  canvas.save()
  canvas.translate(s.x, s.y)
  canvas.rotate(s.angle * DEG, 0, 0)
  canvas.drawRect(rect(-s.w / 2, -s.h / 2, s.w, s.h), fill(s.color, a))
  canvas.drawRect(rect(-s.w / 2, -s.h / 2, s.w, s.h), stroke('#ffffff', 1, 0.35 * a))
  canvas.restore()
}

function drawParticle(canvas: SkCanvas, p: Particle) {
  const a = Math.max(0, p.life / p.maxLife)
  canvas.drawCircle(p.x, p.y, p.size * a, fill(p.color, a))
}

function drawBanner(canvas: SkCanvas, text: string, color: string) {
  const top = ARENA.height * 0.42
  canvas.drawRect(rect(0, top, ARENA.width, 70), fill('#000000', 0.45))
  const f = font(36)
  const x = ARENA.width / 2 - f.getTextWidth(text) / 2
  canvas.drawText(text, x, top + 48, glow(color, 8, 0.9), f)
  canvas.drawText(text, x, top + 48, fill(color), f)
}

/**
 * Draws one frame in arena coordinates (390×720); the caller applies screen scaling.
 * `prompt` shows a "tap to start"-style banner while the round is waiting.
 */
export function renderGame(canvas: SkCanvas, state: GameState, prompt?: string) {
  drawWalls(canvas, state)
  drawObstacles(canvas, state.obstacles, state.theme.accent)

  for (const p of state.particles) drawParticle(canvas, p)
  for (const s of state.shards) drawShard(canvas, s)
  for (const b of state.bullets) drawBullet(canvas, b)
  for (const g of state.guns) drawCharacter(canvas, g)

  if (state.flash > 0) {
    canvas.drawRect(rect(0, 0, ARENA.width, ARENA.height), fill('#ffffff', state.flash * 0.35))
  }

  canvas.drawText(
    `Lv ${state.level} · ${state.levelName}`,
    ARENA.wall + 8,
    ARENA.wall + 24,
    fill('#ffffff', 0.92),
    font(16),
  )

  if (state.bulletMode === 'bounce') {
    canvas.drawText('RICOCHET', ARENA.wall + 8, ARENA.wall + 42, fill(state.theme.accent), font(11))
  }

  if (state.phase === 'won') drawBanner(canvas, 'BREAK!', '#4fc3ff')
  else if (state.phase === 'lost') drawBanner(canvas, 'BROKEN', '#ff4d5a')
  else if (prompt) drawBanner(canvas, prompt, state.theme.accent)
}
