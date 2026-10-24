import {
  BlurStyle,
  ClipOp,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  matchFont,
  type SkCanvas,
  type SkFont,
  type SkImage,
  type SkPaint,
  type SkPicture,
} from '@shopify/react-native-skia'
import { PixelRatio, Platform } from 'react-native'
import { ARENA } from './arena'
import { withAura } from './auras'
import { drawCharacter, drawProjectile, type Painter, type Style } from './character'
import { gunFire } from './guns'
import { getFaceImage } from './myCharacter'
import { BUBBLE_RADIUS, drawPowerIcon, POWERS } from './powerups'
import { getSkin, type AuraKind } from './skins'
import { TAUNT_LIFE } from './engine'
import type { Boom, Bullet, GameState, Gun, Obstacle, Particle, PowerUp, Shard, Taunt, Vec2 } from './types'

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

/**
 * Shared, never-mutated paints for the per-frame hot path (characters, weapons, bubbles draw hundreds
 * of shapes a frame). Alpha is rounded to 1/32 so the cache stays small. Callers must not modify them.
 */
const paintCache = new Map<string, SkPaint>()
function cached(key: string, make: () => SkPaint): SkPaint {
  let p = paintCache.get(key)
  if (!p) {
    if (paintCache.size > 1500) paintCache.clear()
    p = make()
    paintCache.set(key, p)
  }
  return p
}
const qa = (alpha: number) => Math.round(Math.max(0, Math.min(1, alpha)) * 32) / 32

function sharedFill(color: string, alpha = 1): SkPaint {
  const a = qa(alpha)
  return cached(`f${color}${a}`, () => fill(color, a))
}

function sharedStroke(color: string, width: number, alpha = 1): SkPaint {
  const a = qa(alpha)
  return cached(`s${color}${width}${a}`, () => {
    const p = stroke(color, width, a)
    p.setStrokeCap(StrokeCap.Round)
    p.setStrokeJoin(StrokeJoin.Round)
    return p
  })
}

function sharedGlow(color: string, sigma: number, alpha = 0.7): SkPaint {
  const a = qa(alpha)
  return cached(`g${color}${sigma}${a}`, () => glow(color, sigma, a))
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

type Theme = GameState['theme']

function seeded(key: string) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  let seed = (h >>> 0) % 2147483647 || 1
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647
}

const SPACE_TOP = '#2a1f66'
const SPACE_EDGE = '#0b0a1c'

/** Four-point sparkle star. */
function sparkle(c: SkCanvas, x: number, y: number, r: number, color: string, alpha = 1) {
  const k = r * 0.28
  const path = Skia.PathBuilder.Make()
    .moveTo(x, y - r)
    .quadTo(x + k, y - k, x + r, y)
    .quadTo(x + k, y + k, x, y + r)
    .quadTo(x - k, y + k, x - r, y)
    .quadTo(x - k, y - k, x, y - r)
    .close()
    .detach()
  c.drawPath(path, fill(color, alpha))
}

function planet(c: SkCanvas, x: number, y: number, r: number, light: string, dark: string, ring?: string) {
  const back = ring ? stroke(ring, r * 0.16, 0.9) : null
  if (back) ellipse(c, x, y, r * 1.8, r * 0.45, -0.35, back)
  const body = Skia.Paint()
  body.setAntiAlias(true)
  body.setShader(
    Skia.Shader.MakeRadialGradient({ x: x - r * 0.4, y: y - r * 0.4 }, r * 1.6, [Skia.Color(light), Skia.Color(dark)], [0, 1], TileMode.Clamp),
  )
  c.drawCircle(x, y, r, body)
  c.drawCircle(x - r * 0.3, y + r * 0.3, r * 0.2, fill('#000000', 0.12))
  c.drawCircle(x + r * 0.35, y - r * 0.05, r * 0.13, fill('#000000', 0.1))
  c.drawCircle(x - r * 0.35, y - r * 0.4, r * 0.2, fill('#ffffff', 0.35))
  c.drawCircle(x, y, r, stroke('#1f1a2e', Math.max(1.5, r * 0.09), 0.9))
  if (ring) {
    c.save()
    c.clipRect(rect(x - r * 2, y, r * 4, r * 2), ClipOp.Intersect, true)
    ellipse(c, x, y, r * 1.8, r * 0.45, -0.35, stroke(ring, r * 0.16, 0.95))
    c.restore()
  }
}

/** Plain starfield used to fill the screen around the arena so there are no dead bars. */
const fills = new Map<string, SkPicture>()
function spaceFill(x: number, y: number, w: number, h: number): SkPicture {
  const key = `${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}`
  const cached = fills.get(key)
  if (cached) return cached
  const rand = seeded(key)
  const recorder = Skia.PictureRecorder()
  const c = recorder.beginRecording(rect(x, y, w, h))
  c.drawRect(rect(x, y, w, h), fill(SPACE_EDGE))
  const count = Math.round((w * h) / 2600)
  for (let i = 0; i < count; i++) {
    c.drawCircle(x + rand() * w, y + rand() * h, 0.4 + rand() * 1, fill('#ffffff', 0.2 + rand() * 0.5))
  }
  const pic = recorder.finishRecordingAsPicture()
  fills.set(key, pic)
  return pic
}

/** Static cute space scene + glowing rounded frame, recorded once per theme and replayed every frame. */
const backdrops = new Map<string, SkPicture>()
function spaceBackdrop(theme: Theme, bounce: boolean): SkPicture {
  const key = `${theme.wallA}${theme.wallB}${theme.accent}${bounce}`
  const cached = backdrops.get(key)
  if (cached) return cached

  const { width, height, wall } = ARENA
  const rand = seeded(key)
  const recorder = Skia.PictureRecorder()
  const c = recorder.beginRecording(rect(0, 0, width, height))

  const space = Skia.Paint()
  space.setShader(
    Skia.Shader.MakeRadialGradient(
      { x: width * 0.5, y: height * 0.45 },
      height * 0.62,
      [Skia.Color(SPACE_TOP), Skia.Color(SPACE_EDGE)],
      [0, 1],
      TileMode.Clamp,
    ),
  )
  c.drawRect(rect(0, 0, width, height), space)

  // Soft nebula clouds tinted by the level.
  c.drawCircle(width * 0.15, height * 0.28, 150, glow(theme.accent, 60, 0.22))
  c.drawCircle(width * 0.9, height * 0.68, 170, glow(theme.wallA, 70, 0.2))
  c.drawCircle(width * 0.5, height * 0.95, 140, glow('#ff6baa', 60, 0.12))
  c.drawCircle(width * 0.6, height * 0.08, 120, glow('#5ec8ff', 55, 0.14))

  for (let i = 0; i < 130; i++) {
    c.drawCircle(rand() * width, rand() * height, 0.4 + rand() * 1.1, fill('#ffffff', 0.25 + rand() * 0.6))
  }
  const sparkleColors = ['#ffffff', '#ffd45c', '#bfe6ff', theme.wallB]
  for (let i = 0; i < 9; i++) {
    const x = wall + 16 + rand() * (width - wall * 2 - 32)
    const y = wall + 16 + rand() * (height - wall * 2 - 32)
    sparkle(c, x, y, 3 + rand() * 3.5, sparkleColors[i % sparkleColors.length], 0.85)
  }

  // Background planets tucked into the corners, away from the fighters.
  planet(c, width - wall - 34, wall + 58, 20, '#c9b3ff', '#5b3fb8', '#ffd45c')
  planet(c, width - wall - 30, height - wall - 44, 13, '#ffb3c7', '#b2477a')
  planet(c, wall + 40, wall + 110, 7, '#9fe8ff', '#2a7fad')

  // Glowing rounded frame: a soft outer halo, a candy tube and a bright inner highlight.
  const inset = wall / 2
  const frame = Skia.RRectXY(rect(inset, inset, width - inset * 2, height - inset * 2), 16, 16)
  const halo = stroke(theme.accent, wall, 0.5)
  halo.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 7, false))
  c.drawRRect(frame, halo)
  const tube = Skia.Paint()
  tube.setAntiAlias(true)
  tube.setStyle(PaintStyle.Stroke)
  tube.setStrokeWidth(wall - 4)
  tube.setShader(
    Skia.Shader.MakeLinearGradient(
      { x: 0, y: 0 },
      { x: width, y: height },
      [Skia.Color(theme.wallA), Skia.Color(theme.wallB), Skia.Color(theme.wallA)],
      [0, 0.5, 1],
      TileMode.Clamp,
    ),
  )
  c.drawRRect(frame, tube)
  const outline = stroke('#1f1a2e', 2, 0.9)
  c.drawRRect(Skia.RRectXY(rect(2, 2, width - 4, height - 4), 20, 20), outline)
  c.drawRRect(Skia.RRectXY(rect(wall - 2, wall - 2, width - wall * 2 + 4, height - wall * 2 + 4), 12, 12), outline)
  const shine = Skia.RRectXY(rect(inset - 2, inset - 2, width - inset * 2 + 4, height - inset * 2 + 4), 17, 17)
  c.drawRRect(shine, stroke('#ffffff', 1.6, 0.55))
  for (const [x, y] of [
    [inset, inset],
    [width - inset, inset],
    [inset, height - inset],
    [width - inset, height - inset],
  ]) {
    c.drawCircle(x, y, 7, fill('#1f1a2e'))
    sparkle(c, x, y, 6, '#ffd45c')
  }
  for (let x = width * 0.25; x < width - 20; x += width * 0.25) {
    c.drawCircle(x, inset, 2.2, fill('#ffffff', 0.8))
    c.drawCircle(x, height - inset, 2.2, fill('#ffffff', 0.8))
  }

  if (bounce) {
    const edge = fill(theme.accent, 0.14)
    c.drawRect(rect(wall, wall + 12, 5, height - wall * 2 - 24), edge)
    c.drawRect(rect(width - wall - 5, wall + 12, 5, height - wall * 2 - 24), edge)
  }

  const pic = recorder.finishRecordingAsPicture()
  backdrops.set(key, pic)
  return pic
}

const TWINKLES = (() => {
  const rand = seeded('twinkle')
  return Array.from({ length: 16 }, () => ({
    x: ARENA.wall + rand() * (ARENA.width - ARENA.wall * 2),
    y: ARENA.wall + rand() * (ARENA.height - ARENA.wall * 2),
    r: 0.8 + rand() * 1.2,
    speed: 0.6 + rand() * 1.6,
    phase: rand() * Math.PI * 2,
  }))
})()

/** Device pixels per arena unit for the current stage; set by renderStage. */
let backdropRes = 0

/**
 * The backdrop's blurred glows are far too expensive to replay every frame, so for live games it is
 * rasterized once into an image at screen resolution and each frame just blits it.
 */
const backdropImages = new Map<string, SkImage>()
function backdropImage(theme: Theme, bounce: boolean, res: number): SkImage | null {
  const key = `${theme.wallA}${theme.wallB}${theme.accent}${bounce}@${res.toFixed(2)}`
  const cached = backdropImages.get(key)
  if (cached) return cached
  const w = Math.ceil(ARENA.width * res)
  const h = Math.ceil(ARENA.height * res)
  const surface = Skia.Surface.MakeOffscreen(w, h) ?? Skia.Surface.Make(w, h)
  if (!surface) return null
  const c = surface.getCanvas()
  c.scale(res, res)
  c.drawPicture(spaceBackdrop(theme, bounce))
  surface.flush()
  const snapshot = surface.makeImageSnapshot()
  const image = snapshot.makeNonTextureImage() ?? snapshot
  if (backdropImages.size >= 3) backdropImages.clear()
  backdropImages.set(key, image)
  return image
}

const imagePaint = (() => {
  const p = Skia.Paint()
  p.setAntiAlias(true)
  return p
})()

function drawWalls(canvas: SkCanvas, state: GameState, animate = true) {
  const bounce = state.bulletMode === 'bounce'
  const image = animate && backdropRes > 0 ? backdropImage(state.theme, bounce, backdropRes) : null
  if (image) {
    canvas.drawImageRect(image, rect(0, 0, image.width(), image.height()), rect(0, 0, image.width() / backdropRes, image.height() / backdropRes), imagePaint)
  } else {
    canvas.drawPicture(spaceBackdrop(state.theme, bounce))
  }
  if (!animate) return
  const t = Date.now() / 1000
  for (const s of TWINKLES) {
    const a = 0.15 + 0.85 * Math.abs(Math.sin(t * s.speed + s.phase))
    canvas.drawCircle(s.x, s.y, s.r, sharedFill('#ffffff', a))
  }
}

function drawObstacles(canvas: SkCanvas, obstacles: Obstacle[], theme: Theme) {
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

    // Rounded candy block: glossy gradient, top shine, darker base and a soft outline.
    const r = Math.min(8, o.w / 2, o.h / 2)
    const box = Skia.RRectXY(rect(o.x, o.y, o.w, o.h), r, r)
    canvas.drawRRect(Skia.RRectXY(rect(o.x - 3, o.y - 3, o.w + 6, o.h + 6), r + 3, r + 3), fill(theme.accent, 0.22))
    const block = Skia.Paint()
    block.setAntiAlias(true)
    block.setShader(
      Skia.Shader.MakeLinearGradient(
        { x: o.x, y: o.y },
        { x: o.x, y: o.y + o.h },
        [Skia.Color(theme.wallB), Skia.Color(theme.wallA)],
        null,
        TileMode.Clamp,
      ),
    )
    canvas.drawRRect(box, block)
    const base = Math.min(5, o.h * 0.3)
    canvas.save()
    canvas.clipRRect(box, ClipOp.Intersect, true)
    canvas.drawRect(rect(o.x, o.y + o.h - base, o.w, base), fill('#000000', 0.18))
    canvas.restore()
    const shineH = Math.min(4, o.h * 0.22)
    const inset = Math.min(5, o.w * 0.2)
    canvas.drawRRect(Skia.RRectXY(rect(o.x + inset, o.y + 3, o.w - inset * 2, shineH), shineH / 2, shineH / 2), fill('#ffffff', 0.5))
    canvas.drawRRect(box, stroke('#1f1a2e', 2, 0.9))
  }
}

export function skiaPainter(canvas: SkCanvas): Painter {
  const paint = (draw: (p: SkPaint) => void, s: Style) => {
    const alpha = s.alpha ?? 1
    if (s.fill) draw(sharedFill(s.fill, alpha))
    if (s.stroke) draw(sharedStroke(s.stroke, s.width ?? 2, alpha))
  }
  return {
    save: () => canvas.save(),
    restore: () => canvas.restore(),
    translate: (x, y) => canvas.translate(x, y),
    rotate: (rad) => canvas.rotate(rad * DEG, 0, 0),
    scale: (x, y) => canvas.scale(x, y),
    oval(cx, cy, rx, ry, rot, s) {
      canvas.save()
      if (rot) canvas.rotate(rot * DEG, cx, cy)
      const r = rect(cx - rx, cy - ry, rx * 2, ry * 2)
      paint((p) => canvas.drawOval(r, p), s)
      canvas.restore()
    },
    circle(cx, cy, r, s) {
      paint((p) => canvas.drawCircle(cx, cy, r, p), s)
    },
    poly(pts, closed, s) {
      const b = Skia.PathBuilder.Make().moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) b.lineTo(pts[i][0], pts[i][1])
      if (closed) b.close()
      const path = b.detach()
      paint((p) => canvas.drawPath(path, p), s)
    },
    arc(cx, cy, r, a0, a1, s) {
      const b = Skia.PathBuilder.Make().addArc(rect(cx - r, cy - r, r * 2, r * 2), a0 * DEG, (a1 - a0) * DEG)
      if (s.fill) b.close()
      const path = b.detach()
      paint((p) => canvas.drawPath(path, p), s)
    },
    rrect(x, y, w, h, r, s) {
      const rr = Skia.RRectXY(rect(x, y, w, h), r, r)
      paint((p) => canvas.drawRRect(rr, p), s)
    },
    glow(cx, cy, rx, ry, color, alpha) {
      ellipse(canvas, cx, cy, rx, ry, 0, sharedGlow(color, 9, alpha))
    },
    photo(cx, cy, r) {
      const img = getFaceImage()
      if (!img) return false
      const clip = Skia.Path.Make()
      clip.addCircle(cx, cy, r)
      canvas.save()
      canvas.clipPath(clip, ClipOp.Intersect, true)
      canvas.drawImageRect(img, rect(0, 0, img.width(), img.height()), rect(cx - r, cy - r, r * 2, r * 2), photoPaint)
      canvas.restore()
      return true
    },
  }
}

const photoPaint = Skia.Paint()
photoPaint.setAntiAlias(true)

function drawGunCharacter(p: Painter, gun: Gun, now: number) {
  if (gun.broken) return
  const pose = { angle: gun.angle, spin: gun.spin, kick: gun.kick, color: gun.color, seed: gun.id === 'blue' ? 0 : 1.7, weapon: gun.weapon }
  const fx = gun.fx
  if (fx?.tiny) {
    p.save()
    p.translate(gun.x, gun.y)
    p.scale(0.55, 0.55)
    p.translate(-gun.x, -gun.y)
  }
  const skin = withAura(getSkin(gun.skin), gun.aura as AuraKind | undefined)
  drawCharacter(p, gun.x, gun.y, pose, skin, now)
  if (fx?.tiny) p.restore()
  if (!fx) return

  if (fx.frozen) {
    const r = fx.tiny ? 22 : 36
    p.rrect(gun.x - r, gun.y - r, r * 2, r * 2, 10, { fill: '#bdefff', alpha: 0.45, stroke: '#ffffff', width: 2 })
    p.poly([[gun.x - r + 8, gun.y - r + 6], [gun.x - r + 18, gun.y - r + 6]], false, { stroke: '#ffffff', width: 3, alpha: 0.8 })
  }
  if (fx.shield) {
    const pulse = 1 + Math.sin(now * 0.008) * 0.04
    const r = (fx.tiny ? 26 : 40) * pulse
    p.circle(gun.x, gun.y, r, { fill: '#5ec8ff', alpha: 0.14 })
    // Blinks in its last two seconds so players know it is about to run out.
    const fading = fx.shield < 2 && Math.floor(now / 120) % 2 === 0
    p.circle(gun.x, gun.y, r, { stroke: '#9be7ff', width: 2.5, alpha: fading ? 0.3 : 0.9 })
    p.circle(gun.x - r * 0.45, gun.y - r * 0.5, 3.5, { fill: '#ffffff', alpha: 0.7 })
  }

  // Small badges above the head for the timed effects.
  const badges = (['giant', 'triple', 'tiny'] as const).filter((k) => fx[k])
  badges.forEach((kind, i) => {
    const bx = gun.x + (i - (badges.length - 1) / 2) * 22
    const by = gun.y - (fx.tiny ? 34 : 52)
    p.circle(bx, by, 10, { fill: POWERS[kind].color, alpha: 0.35, stroke: '#ffffff', width: 1.5 })
    p.save()
    p.translate(bx, by)
    p.scale(0.7, 0.7)
    drawPowerIcon(p, kind)
    p.restore()
  })
}

function drawPowerUp(p: Painter, pu: PowerUp, now: number) {
  const { color } = POWERS[pu.kind]
  const life = 12 - pu.t
  if (life < 2 && Math.floor(now / 110) % 2 === 0) return
  const grow = Math.min(1, pu.t / 0.35)
  const wobble = 1 + Math.sin(now * 0.006 + pu.id) * 0.06
  const r = BUBBLE_RADIUS * grow * wobble
  const y = pu.y + Math.sin(now * 0.004 + pu.id * 2) * 3
  p.glow(pu.x, y, r + 4, r + 4, color, 0.45)
  p.circle(pu.x, y, r, { fill: color, alpha: 0.28 })
  p.circle(pu.x, y, r, { stroke: '#ffffff', width: 2, alpha: 0.9 })
  p.oval(pu.x - r * 0.4, y - r * 0.5, r * 0.28, r * 0.16, -0.6, { fill: '#ffffff', alpha: 0.85 })
  p.save()
  p.translate(pu.x, y)
  p.scale(grow, grow)
  drawPowerIcon(p, pu.kind)
  p.restore()
}

let camZoom = 1
let camFocus = { x: ARENA.width / 2, y: ARENA.height / 2 }

/** Where the finisher camera looks: a freshly broken fighter, or whoever the closest enemy bullet is flying at. */
function finisherFocus(state: GameState): Vec2 {
  const broken = state.guns.find((g) => g.broken)
  if (broken) return broken
  let best: Vec2 = camFocus
  let bestD = Infinity
  for (const b of state.bullets) {
    const target = b.owner === 'blue' ? state.guns[1] : state.guns[0]
    const d = Math.hypot(b.x - target.x, b.y - target.y)
    if (d < bestD) {
      bestD = d
      best = { x: (b.x + target.x) / 2, y: (b.y + target.y) / 2 }
    }
  }
  return best
}

// The bullet's look comes from its owner's gun, so online snapshots don't need to carry it.
function drawBullet(canvas: SkCanvas, p: Painter, b: Bullet, shooter: Gun, now: number) {
  const weapon = shooter.weapon
  if (b.trail.length > 1) {
    if (weapon === 'rocket') {
      for (let i = 0; i < b.trail.length; i++) {
        const k = (i + 1) / b.trail.length
        canvas.drawCircle(b.trail[i].x, b.trail[i].y, 2 + (1 - k) * 4, sharedFill('#d8dce6', 0.45 * k))
      }
    }
    const builder = Skia.PathBuilder.Make().moveTo(b.trail[0].x, b.trail[0].y)
    for (let i = 1; i < b.trail.length; i++) builder.lineTo(b.trail[i].x, b.trail[i].y)
    // The team-colored trail stays for every gun so you can always tell whose shot it is.
    const plain = !weapon || weapon === 'blaster'
    const spray = gunFire(weapon).count > 1
    canvas.drawPath(builder.detach(), sharedStroke(b.color, spray ? 1.2 : plain ? 2.5 : 2, spray ? 0.45 : plain ? 0.75 : 0.55))
  }
  const angle = Math.atan2(b.vy, b.vx)
  p.save()
  p.translate(b.x, b.y)
  p.rotate(angle)
  if (Math.cos(angle) < 0) p.scale(1, -1)
  if (shooter.fx?.giant) {
    p.glow(0, 0, 14, 14, '#ff8c42', 0.5)
    p.scale(2, 2)
  }
  drawProjectile(p, weapon, b.color, now, b.id)
  p.restore()
}

function drawShard(canvas: SkCanvas, s: Shard) {
  const a = Math.max(0, s.life / s.maxLife)
  canvas.save()
  canvas.translate(s.x, s.y)
  canvas.rotate(s.angle * DEG, 0, 0)
  const r = Math.min(s.w, s.h) * 0.35
  const piece = Skia.RRectXY(rect(-s.w / 2, -s.h / 2, s.w, s.h), r, r)
  canvas.drawRRect(piece, sharedFill(s.color, a))
  canvas.drawRRect(Skia.RRectXY(rect(-s.w / 2 + 2, -s.h / 2 + 1.5, s.w * 0.45, 2), 1, 1), sharedFill('#ffffff', 0.55 * a))
  canvas.drawRRect(piece, sharedStroke('#1f1a2e', 1.4, 0.85 * a))
  canvas.restore()
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const easeOutBack = (k: number) => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2)

function starburst(cx: number, cy: number, spikes: number, outer: number, inner: number) {
  const b = Skia.PathBuilder.Make()
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI * i) / spikes - Math.PI / 2
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    if (i === 0) b.moveTo(x, y)
    else b.lineTo(x, y)
  }
  return b.close().detach()
}

/** Little knocked-out ghost that floats up out of a broken character. */
function drawGhost(canvas: SkCanvas, x: number, y: number, body: string, alpha: number) {
  const r = 12
  const g = Skia.PathBuilder.Make()
    .moveTo(x - r, y)
    .arcToOval(rect(x - r, y - r, r * 2, r * 2), 180, 180, false)
    .lineTo(x + r, y + 13)
    .quadTo(x + r * 0.66, y + 8, x + r * 0.33, y + 13)
    .quadTo(x, y + 8, x - r * 0.33, y + 13)
    .quadTo(x - r * 0.66, y + 8, x - r, y + 13)
    .close()
    .detach()
  ellipse(canvas, x, y - r - 5, 8, 2.6, 0, stroke('#ffd45c', 2, alpha))
  canvas.drawPath(g, fill('#ffffff', 0.92 * alpha))
  canvas.drawPath(g, stroke('#1f1a2e', 2, alpha))
  const eye = stroke('#1f1a2e', 1.8, alpha)
  eye.setStrokeCap(StrokeCap.Round)
  for (const ex of [x - 4.5, x + 4.5]) {
    line(canvas, ex - 2, y - 2, ex + 2, y + 2, eye)
    line(canvas, ex + 2, y - 2, ex - 2, y + 2, eye)
  }
  canvas.drawCircle(x, y + 5, 1.8, fill('#1f1a2e', alpha))
  canvas.drawCircle(x - 8, y + 3, 2.2, fill(body, 0.6 * alpha))
  canvas.drawCircle(x + 8, y + 3, 2.2, fill(body, 0.6 * alpha))
}

function drawBoom(canvas: SkCanvas, b: Boom) {
  const t = b.t

  if (t < 0.5) {
    const k = t / 0.5
    canvas.drawCircle(b.x, b.y, 14 + k * 120, stroke('#ffffff', 7 * (1 - k), 1 - k))
    canvas.drawCircle(b.x, b.y, 8 + k * 80, stroke(b.color, 5 * (1 - k), 1 - k))
  }

  if (t < 0.35) {
    const k = t / 0.35
    const crack = stroke('#ffffff', 2.5, 1 - k)
    crack.setStrokeCap(StrokeCap.Round)
    crack.setStrokeJoin(StrokeJoin.Round)
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 + 0.3
      const len = 22 + k * 48
      const mx = b.x + Math.cos(a) * len * 0.5 + Math.cos(a + 1.5) * 5
      const my = b.y + Math.sin(a) * len * 0.5 + Math.sin(a + 1.5) * 5
      const path = Skia.PathBuilder.Make()
        .moveTo(b.x + Math.cos(a) * 10, b.y + Math.sin(a) * 10)
        .lineTo(mx, my)
        .lineTo(b.x + Math.cos(a) * len, b.y + Math.sin(a) * len)
        .detach()
      canvas.drawPath(path, crack)
    }
  }

  if (t > 0.25) {
    const g = t - 0.25
    const fadeIn = Math.min(1, g * 4)
    const fadeOut = 1 - clamp((t - 1.3) / 0.5, 0, 1)
    drawGhost(canvas, b.x + Math.sin(g * 6) * 8, b.y - 18 - g * 60, b.body, fadeIn * fadeOut)
  }

  if (t < 1.5) {
    const pop = t < 0.22 ? easeOutBack(t / 0.22) : 1
    const alpha = 1 - clamp((t - 1.1) / 0.4, 0, 1)
    const cx = clamp(b.x + 30, ARENA.wall + 50, ARENA.width - ARENA.wall - 50)
    const cy = clamp(b.y - 44, ARENA.wall + 44, ARENA.height - ARENA.wall - 44)
    canvas.save()
    canvas.translate(cx, cy)
    canvas.rotate(-10, 0, 0)
    canvas.scale(pop, pop)
    const outer = starburst(0, 0, 12, 46, 32)
    canvas.drawPath(outer, fill('#ffd45c', alpha))
    canvas.drawPath(outer, stroke('#1f1a2e', 3, alpha))
    canvas.drawPath(starburst(0, 0, 12, 34, 24), fill(b.color, alpha))
    const f = font(b.word.length > 5 ? 15 : 18)
    const tw = f.getTextWidth(b.word)
    const outline = stroke('#1f1a2e', 4, alpha)
    outline.setStrokeJoin(StrokeJoin.Round)
    canvas.drawText(b.word, -tw / 2, 6, outline, f)
    canvas.drawText(b.word, -tw / 2, 6, fill('#ffffff', alpha), f)
    canvas.restore()
  }
}

function drawTaunt(canvas: SkCanvas, gun: Gun, taunt: Taunt) {
  if (gun.broken) return
  const t = taunt.t
  const pop = t < 0.2 ? easeOutBack(t / 0.2) : 1
  const alpha = 1 - clamp((t - (TAUNT_LIFE - 0.3)) / 0.3, 0, 1)
  const f = font(13)
  const tw = f.getTextWidth(taunt.text)
  const w = tw + 24
  const h = 30
  const above = gun.y - 70 > ARENA.wall + 8
  const cx = clamp(gun.x, ARENA.wall + w / 2 + 4, ARENA.width - ARENA.wall - w / 2 - 4)
  const cy = above ? gun.y - 70 + h / 2 : gun.y + 52 + h / 2
  const tipX = clamp(gun.x, cx - w / 2 + 14, cx + w / 2 - 14)

  canvas.save()
  canvas.translate(tipX, above ? cy + h / 2 : cy - h / 2)
  canvas.scale(pop, pop)
  canvas.translate(-tipX, -(above ? cy + h / 2 : cy - h / 2))
  const bubble = Skia.RRectXY(rect(cx - w / 2, cy - h / 2, w, h), h / 2, h / 2)
  const edge = above ? cy + h / 2 - 1 : cy - h / 2 + 1
  const tipY = above ? edge + 9 : edge - 9
  const tail = Skia.PathBuilder.Make().moveTo(tipX - 7, edge).lineTo(tipX + 7, edge).lineTo(tipX + 2, tipY).close().detach()
  canvas.drawPath(tail, fill('#ffffff', alpha))
  canvas.drawPath(tail, stroke('#1f1a2e', 2, alpha))
  canvas.drawRRect(bubble, fill('#ffffff', alpha))
  canvas.drawRRect(bubble, stroke('#1f1a2e', 2, alpha))
  canvas.drawRect(rect(tipX - 5.5, above ? edge - 2 : edge - 1, 11, 3), fill('#ffffff', alpha))
  canvas.drawText(taunt.text, cx - tw / 2, cy + 4.5, fill('#1f1a2e', alpha), f)
  canvas.restore()
}

function drawParticle(canvas: SkCanvas, p: Particle) {
  const a = Math.max(0, p.life / p.maxLife)
  canvas.drawCircle(p.x, p.y, p.size * a, sharedFill(p.color, a))
}

function drawBanner(canvas: SkCanvas, text: string, color: string) {
  const f = font(32)
  const tw = f.getTextWidth(text)
  const w = Math.min(ARENA.width - ARENA.wall * 2 - 20, tw + 56)
  const h = 60
  const x = (ARENA.width - w) / 2
  const y = ARENA.height * 0.44
  const pill = Skia.RRectXY(rect(x, y, w, h), h / 2, h / 2)
  canvas.drawRRect(pill, glow(color, 12, 0.35))
  canvas.drawRRect(pill, fill('#15112e', 0.88))
  canvas.drawRRect(pill, stroke(color, 2.5))
  sparkle(canvas, x + 20, y + h / 2, 7, '#ffd45c')
  sparkle(canvas, x + w - 20, y + h / 2, 7, '#ffd45c')
  const tx = ARENA.width / 2 - tw / 2
  canvas.drawText(text, tx, y + 41, glow(color, 8, 0.8), f)
  canvas.drawText(text, tx, y + 41, fill(color), f)
}

/** Fits the arena inside a screen area; everything outside the arena is filled with starfield. */
export type StageFit = { scale: number; width: number; height: number }

export function fitStage(width: number, height: number): StageFit {
  return { scale: Math.min(width / ARENA.width, height / ARENA.height), width, height }
}

/** Draws one full-stage frame (in pixels): starfield bleed plus the centered arena. */
export function renderStage(canvas: SkCanvas, state: GameState, fit: StageFit, prompt?: string, youSide?: 'blue' | 'red') {
  const s = fit.scale
  backdropRes = Math.round(s * PixelRatio.get() * 100) / 100
  const ox = (fit.width / s - ARENA.width) / 2
  const oy = (fit.height / s - ARENA.height) / 2
  canvas.scale(s, s)
  canvas.translate(ox, oy)
  if (ox > 0.5 || oy > 0.5) canvas.drawPicture(spaceFill(-ox, -oy, fit.width / s, fit.height / s))
  renderGame(canvas, state, prompt, youSide)
}

/**
 * Draws one frame in arena coordinates (390×720); the caller applies screen scaling.
 * `prompt` shows a "tap to start"-style banner while the round is waiting.
 */
function drawYouMarker(canvas: SkCanvas, gun: Gun, color: string) {
  if (gun.broken) return
  const x = gun.x
  const y = gun.y - 44
  const arrow = Skia.PathBuilder.Make().moveTo(x - 6, y + 4).lineTo(x + 6, y + 4).lineTo(x, y + 11).close().detach()
  canvas.drawPath(arrow, fill(color))
  const f = font(11)
  const label = 'YOU'
  const w = f.getTextWidth(label)
  canvas.drawRRect(Skia.RRectXY(rect(x - w / 2 - 6, y - 12, w + 12, 16), 8, 8), fill(color))
  canvas.drawText(label, x - w / 2, y + 0.5, fill('#0c0b1d'), f)
}

/** Static map of a level's layout (walls, blocks, moving-wall tracks, mines, both fighters). */
export function renderLevelPreview(canvas: SkCanvas, state: GameState) {
  drawWalls(canvas, state, false)
  const track = stroke('#ffffff', 3, 0.35)
  track.setStrokeCap(StrokeCap.Round)
  track.setPathEffect(Skia.PathEffect.MakeDash([10, 10], 0))
  for (const o of state.obstacles) {
    if (o.vx && o.minX !== undefined && o.maxX !== undefined) {
      line(canvas, o.minX, o.y + o.h / 2, o.maxX + o.w, o.y + o.h / 2, track)
    }
    if (o.vy && o.minY !== undefined && o.maxY !== undefined) {
      line(canvas, o.x + o.w / 2, o.minY, o.x + o.w / 2, o.maxY + o.h, track)
    }
  }
  drawObstacles(canvas, state.obstacles, state.theme)
  const painter = skiaPainter(canvas)
  for (const g of state.guns) drawGunCharacter(painter, g, 0)
}

export function renderGame(canvas: SkCanvas, state: GameState, prompt?: string, youSide?: 'blue' | 'red') {
  const shake = state.flash * 18
  canvas.save()
  if (shake > 0.2) canvas.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake)

  // Finisher camera: ease in toward the action while slow motion runs, then back out.
  const wantZoom = state.slowMo > 0 ? 1.22 : 1
  camZoom += (wantZoom - camZoom) * (wantZoom > camZoom ? 0.25 : 0.12)
  if (state.slowMo > 0) {
    const f = finisherFocus(state)
    camFocus = { x: camFocus.x + (f.x - camFocus.x) * 0.3, y: camFocus.y + (f.y - camFocus.y) * 0.3 }
  }
  if (camZoom > 1.002) {
    // Keep the zoomed view inside the arena.
    const half = { w: ARENA.width / 2 / camZoom, h: ARENA.height / 2 / camZoom }
    const cx = clamp(camFocus.x, half.w, ARENA.width - half.w)
    const cy = clamp(camFocus.y, half.h, ARENA.height - half.h)
    canvas.translate(ARENA.width / 2, ARENA.height / 2)
    canvas.scale(camZoom, camZoom)
    canvas.translate(-cx, -cy)
  } else {
    camZoom = 1
  }

  drawWalls(canvas, state)
  drawObstacles(canvas, state.obstacles, state.theme)

  const now = Date.now()
  const painter = skiaPainter(canvas)
  for (const pu of state.powerups) drawPowerUp(painter, pu, now)
  for (const p of state.particles) drawParticle(canvas, p)
  for (const s of state.shards) drawShard(canvas, s)
  for (const b of state.bullets) {
    drawBullet(canvas, painter, b, b.owner === 'blue' ? state.guns[0] : state.guns[1], now)
  }
  for (const g of state.guns) drawGunCharacter(painter, g, now)
  if (youSide) {
    const g = youSide === 'blue' ? state.guns[0] : state.guns[1]
    drawYouMarker(canvas, g, g.color)
  }
  for (const b of state.booms) drawBoom(canvas, b)
  for (const t of state.taunts) drawTaunt(canvas, t.side === 'blue' ? state.guns[0] : state.guns[1], t)

  if (state.flash > 0) {
    canvas.drawRect(rect(0, 0, ARENA.width, ARENA.height), fill('#ffffff', state.flash * 0.35))
  }
  canvas.restore()

  if (camZoom > 1.01) {
    const k = qa(Math.min(1, (camZoom - 1) / 0.22))
    const vignette = cached(`v${k}`, () => {
      const p = Skia.Paint()
      p.setShader(
        Skia.Shader.MakeRadialGradient(
          { x: ARENA.width / 2, y: ARENA.height / 2 },
          ARENA.height * 0.62,
          [Skia.Color('rgba(0,0,0,0)'), Skia.Color(`rgba(8,6,24,${0.6 * k})`)],
          [0.55, 1],
          TileMode.Clamp,
        ),
      )
      return p
    })
    canvas.drawRect(rect(0, 0, ARENA.width, ARENA.height), vignette)
  }

  if (state.bulletMode === 'bounce') {
    canvas.drawText('RICOCHET', ARENA.wall + 8, ARENA.wall + 18, fill(state.theme.accent, 0.85), font(11))
  }

  // Let the break explosion play before the result banner covers the middle of the arena.
  const lastBoom = state.booms[state.booms.length - 1]
  if (state.phase !== 'playing' && (!lastBoom || lastBoom.t > 0.7)) {
    // `won` always means blue won; flip it when the viewer controls red.
    const youWon = (state.phase === 'won') === (youSide !== 'red')
    if (youWon) drawBanner(canvas, 'BREAK!', '#4fc3ff')
    else drawBanner(canvas, 'BROKEN', '#ff4d5a')
  } else if (prompt) drawBanner(canvas, prompt, state.theme.accent)
}
