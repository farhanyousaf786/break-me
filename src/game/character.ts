import type { Skin } from './skins'

/**
 * Platform-neutral character drawing. Web (canvas 2D) and mobile (Skia) each provide a
 * small `Painter` adapter, so every skin is defined exactly once.
 */

export const OUTLINE = '#1f1a2e'
const BLUSH = '#ff8fab'
const WHITE = '#ffffff'
const MOUTH = '#7a2b3b'
const GOLD = '#ffcf3f'

export type Style = { fill?: string; stroke?: string; width?: number; alpha?: number }
export type Pt = [number, number]

export interface Painter {
  save(): void
  restore(): void
  translate(x: number, y: number): void
  rotate(rad: number): void
  scale(x: number, y: number): void
  oval(cx: number, cy: number, rx: number, ry: number, rot: number, s: Style): void
  circle(cx: number, cy: number, r: number, s: Style): void
  poly(pts: Pt[], closed: boolean, s: Style): void
  /** Clockwise from a0 to a1 (radians); closed into a chord when filled. */
  arc(cx: number, cy: number, r: number, a0: number, a1: number, s: Style): void
  rrect(x: number, y: number, w: number, h: number, r: number, s: Style): void
  glow(cx: number, cy: number, rx: number, ry: number, color: string, alpha: number): void
}

export type Pose = {
  angle: number
  spin: number
  kick: number
  /** Team color — used for the glow so you can tell sides apart even with the same skin ('' = no glow) */
  color: string
  /** De-syncs bob / blink between the two characters */
  seed: number
}

const out = (fill: string, width = 2.5): Style => ({ fill, stroke: OUTLINE, width })
const ink = (width: number, alpha?: number): Style => ({ stroke: OUTLINE, width, alpha })

function animate(pose: Pose, now: number) {
  const squash = pose.kick * 0.22
  return {
    bob: Math.sin(now * 0.004 + pose.seed) * 1.5,
    sx: 1 + squash,
    sy: 1 - squash,
    tilt: Math.max(-0.35, Math.min(0.35, pose.spin * 0.04)),
    blinking: (now / 1000 + pose.seed) % 3.2 < 0.13,
    squint: pose.kick > 0.35,
  }
}

type Anim = ReturnType<typeof animate>

const handColor = (skin: Skin) => (skin.shape === 'human' ? skin.skinTone ?? skin.body : skin.body)

function drawGun(p: Painter, pose: Pose, skin: Skin) {
  p.save()
  p.rotate(pose.angle)
  p.rrect(18, 4, 7, 10, 2.5, out('#5b6275', 2))
  p.rrect(31, -2.5, 15, 6, 2, out('#aab2c5', 2))
  p.rrect(13, -5, 21, 11, 4, out('#8b93a7', 2))
  p.rrect(44, -1.5, 4, 4, 1, { fill: WHITE })
  p.circle(20, 0.5, 2, { fill: BLUSH })
  p.oval(22, 8, 5, 4.5, 0, out(skin.glove ?? handColor(skin), 2))
  if (skin.glove) {
    p.circle(20, 6.8, 1.1, { fill: '#ff4d6d' })
    p.circle(22.6, 6.2, 1.1, { fill: '#5cf2ff' })
    p.circle(25, 7.4, 1.1, { fill: '#46d27e' })
  }
  p.restore()
}

function drawEars(p: Painter, skin: Skin) {
  const earFill = skin.earColor ?? skin.body
  if (skin.ears === 'tuft') {
    p.oval(-4.5, -21, 3, 6.5, -0.5, out(skin.accent, 2))
    p.oval(4.5, -21, 3, 6.5, 0.5, out(skin.accent, 2))
    p.oval(0, -23, 3.2, 7.5, 0, out(skin.accent, 2))
    return
  }
  for (const s of [-1, 1]) {
    switch (skin.ears) {
      case 'cat':
        p.poly([[s * 19, -6], [s * 15, -27], [s * 4, -17]], true, out(earFill))
        p.poly([[s * 15.5, -10], [s * 14, -22], [s * 8, -16]], true, { fill: BLUSH })
        break
      case 'fox':
        p.poly([[s * 20, -4], [s * 17, -31], [s * 3, -16]], true, out(earFill))
        p.poly([[s * 16, -11], [s * 16, -25], [s * 9, -17]], true, { fill: skin.belly })
        break
      case 'horns':
        p.poly([[s * 14, -13], [s * 13, -29], [s * 5, -17]], true, out(skin.accent))
        break
      case 'bunny':
        p.oval(s * 8, -30, 5.5, 13, s * 0.18, out(earFill))
        p.oval(s * 8, -29, 2.6, 9, s * 0.18, { fill: BLUSH })
        break
      case 'bear':
        p.circle(s * 14, -14, 7.5, out(earFill))
        p.circle(s * 14, -14, 3.8, { fill: skin.earColor ? '#4a4a58' : skin.accent })
        break
      case 'frog':
        p.circle(s * 7, -15, 8, out(skin.body))
        break
      case 'antenna':
        p.poly([[s * 6, -16], [s * 11, -31]], false, ink(2.2))
        p.circle(s * 11, -32, 3.8, out(skin.accent, 2))
        break
      case 'mouse':
        p.circle(s * 15, -15, 10, out(earFill))
        p.circle(s * 15, -15, 5.8, { fill: BLUSH })
        break
      case 'unicorn':
        p.poly([[s * 17, -8], [s * 14, -24], [s * 6, -16]], true, out(earFill))
        p.poly([[s * 14, -11], [s * 13.5, -20], [s * 9, -16]], true, { fill: BLUSH })
        break
      case 'owl':
        p.poly([[s * 18, -8], [s * 21, -27], [s * 7, -17]], true, out(skin.accent))
        break
    }
  }
  if (skin.ears === 'unicorn') {
    p.poly([[-4.5, -17], [0, -38], [4.5, -17]], true, out(GOLD, 2))
    p.poly([[-3.2, -23], [2.6, -26]], false, ink(1.3, 0.6))
    p.poly([[-2, -29.5], [1.6, -31.5]], false, ink(1.3, 0.6))
  }
}

/** Floppy ears hang over the head, so they're drawn after the body. */
function drawFrontEars(p: Painter, skin: Skin) {
  if (skin.ears !== 'dog') return
  const fill = skin.earColor ?? skin.accent
  for (const s of [-1, 1]) p.oval(s * 17, -7, 6.5, 12, s * -0.45, out(fill))
}

function drawExtras(p: Painter, skin: Skin) {
  if (skin.extra === 'spots') {
    const spot: Style = { fill: skin.accent, alpha: 0.45 }
    p.circle(-15, -3, 2.3, spot)
    p.circle(-11, -10, 1.5, spot)
    p.circle(15.5, -5, 2, spot)
    p.circle(13, 10, 1.6, spot)
  } else if (skin.extra === 'patches') {
    for (const s of [-1, 1]) p.oval(s * 7.5, -2, 5.8, 6.8, s * -0.45, { fill: skin.accent })
  } else if (skin.extra === 'stripes') {
    const stripe: Style = { stroke: skin.accent, width: 2.6 }
    p.poly([[-5, -18], [-4, -12.5]], false, stripe)
    p.poly([[0, -19.5], [0, -13.5]], false, stripe)
    p.poly([[5, -18], [4, -12.5]], false, stripe)
    for (const s of [-1, 1]) {
      p.poly([[s * 20.5, -6], [s * 15, -4]], false, stripe)
      p.poly([[s * 20.5, 2], [s * 15.5, 3]], false, stripe)
    }
  } else if (skin.extra === 'mask') {
    p.oval(0, -3.5, 18, 6.8, 0, { fill: skin.accent })
    for (const s of [-1, 1]) p.oval(s * 7, -3, 6.8, 6.4, 0, { fill: skin.accent })
  } else if (skin.extra === 'face') {
    p.oval(0, 1, 16, 14, 0, { fill: skin.belly })
  } else if (skin.extra === 'ninja') {
    const band = skin.hairColor ?? '#e63946'
    p.poly([[17, -13], [29, -19], [27, -10]], true, out(band, 2))
    p.poly([[17, -11], [27, -4], [21, -3]], true, out(band, 2))
    p.oval(0, -14, 18, 3.6, 0, { fill: band })
    p.oval(0, -3.5, 16.5, 7.2, 0, out(skin.skinTone ?? '#ffd9b8', 2))
  }
}

/** Face-local extras for humans (drawn inside the face transform). */
function drawFaceProps(p: Painter, skin: Skin) {
  if (skin.extra === 'eyepatch') {
    p.poly([[-16, -11], [3, -6]], false, ink(1.6))
    p.poly([[11, -6], [17, -9]], false, ink(1.6))
    p.oval(7, -3, 5.2, 4.8, 0, { fill: OUTLINE })
  } else if (skin.extra === 'stitches') {
    p.poly([[-16, -10], [-7, -12.5]], false, ink(1.4))
    p.poly([[-14, -13], [-13.2, -8.8]], false, ink(1.2))
    p.poly([[-10.5, -14], [-9.8, -9.8]], false, ink(1.2))
  } else if (skin.extra === 'glasses') {
    for (const s of [-1, 1]) p.circle(s * 7, -3, 6, { fill: WHITE, alpha: 0.18 })
    for (const s of [-1, 1]) p.circle(s * 7, -3, 6, ink(1.8))
    p.poly([[-1.2, -3.5], [1.2, -3.5]], false, ink(1.8))
  } else if (skin.extra === 'shades') {
    for (const s of [-1, 1]) p.rrect(s * 7 - 6, -8, 12, 9, 3.5, out('#1b1b28', 1.6))
    p.poly([[-1.5, -5.5], [1.5, -5.5]], false, ink(2))
    for (const s of [-1, 1]) p.poly([[s * 7 - 3.5, -6], [s * 7 - 1, -6.5]], false, { stroke: WHITE, width: 1.4, alpha: 0.7 })
  } else if (skin.extra === 'mustache') {
    const color = skin.hairColor ?? '#4a2c17'
    for (const s of [-1, 1]) p.oval(s * 3.6, 1.6, 4.4, 2.2, s * -0.25, out(color, 1.4))
  } else if (skin.extra === 'angry' || skin.extra === 'titan') {
    for (const s of [-1, 1]) p.poly([[s * 3, -9], [s * 11.5, -12.5]], false, ink(2.6))
  }
  if (skin.extra === 'titan') {
    const ridge: Style = { stroke: OUTLINE, width: 1.5, alpha: 0.45 }
    p.poly([[-6, 7], [-5, 12]], false, ridge)
    p.poly([[0, 8], [0, 13.5]], false, ridge)
    p.poly([[6, 7], [5, 12]], false, ridge)
  }
}

function star(p: Painter, cx: number, cy: number, r: number, s: Style) {
  const pts: Pt[] = []
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  p.poly(pts, true, s)
}

function drawCape(p: Painter, color: string) {
  p.poly([[-10, 2], [10, 2], [18, 22], [0, 25], [-18, 22]], true, out(color))
}

/** Suit details on the torso (drawn over the shirt). */
function drawChest(p: Painter, skin: Skin) {
  switch (skin.suit) {
    case 'web':
      p.oval(0, 10.5, 2, 3, 0, { fill: OUTLINE })
      for (const s of [-1, 1]) {
        p.poly([[s * 1.2, 9], [s * 5, 6.5]], false, ink(1))
        p.poly([[s * 1.5, 10.5], [s * 5.5, 10.5]], false, ink(1))
        p.poly([[s * 1.2, 12], [s * 5, 14.5]], false, ink(1))
      }
      break
    case 'bat':
      p.rrect(-12, 14.5, 24, 3.2, 1.2, { fill: '#ffcf3f' })
      p.oval(0, 9, 6.2, 3.4, 0, out('#ffcf3f', 1.2))
      p.poly([[-4.5, 9], [-2, 8], [-0.8, 6.6], [0, 7.8], [0.8, 6.6], [2, 8], [4.5, 9], [2, 10], [0, 11.4], [-2, 10]], true, { fill: OUTLINE })
      break
    case 'cap':
      p.rrect(-12, 14.5, 24, 3.2, 1.2, { fill: skin.accent })
      star(p, 0, 9.5, 4.8, out(WHITE, 1.2))
      break
    case 'zip':
      p.circle(0, 10, 4.8, out(WHITE, 1.2))
      p.poly([[1.3, 6.2], [-2.2, 10.6], [0.2, 10.6], [-1.2, 14], [2.4, 9.4], [0, 9.4]], true, { fill: skin.body })
      break
  }
  if (skin.extra === 'titan') p.rrect(-12, 14, 24, 3.2, 1.2, { fill: skin.accent })
}

/** Masked heads replace the regular face and hair. */
function drawMask(p: Painter, skin: Skin, a: Anim) {
  if (skin.suit === 'web') {
    const web = ink(0.9, 0.4)
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4 + Math.PI / 8
      p.poly([[0, -6], [Math.cos(ang) * 15, -6 + Math.sin(ang) * 15]], false, web)
    }
    p.circle(0, -6, 6.5, web)
    p.circle(0, -6, 11.5, web)
    const ry = a.blinking ? 1.4 : a.squint ? 3 : 5.8
    for (const s of [-1, 1]) p.oval(s * 6.5, -9, 4.6, ry, s * 0.5, out(WHITE, 2.4))
    return
  }

  const cowl = skin.hairColor ?? skin.body
  if (skin.suit === 'bat') {
    for (const s of [-1, 1]) p.poly([[s * 5, -19], [s * 12.5, -32], [s * 14.5, -14]], true, out(cowl))
  }
  p.arc(0, -7, 16.8, Math.PI - 0.1, Math.PI * 2 + 0.1, out(cowl))

  if (skin.suit === 'bat') {
    for (const s of [-1, 1]) p.oval(s * 6, -8.5, 3.8, a.blinking ? 0.7 : 1.9, -s * 0.25, { fill: WHITE })
    p.save()
    p.translate(0, -5)
    p.scale(0.85, 0.85)
    for (const s of [-1, 1]) p.oval(s * 12.5, 3.5, 3.6, 2.3, 0, { fill: BLUSH, alpha: 0.65 })
    drawMouth(p, skin, a)
    p.restore()
    return
  }

  const tone = skin.skinTone ?? '#ffd9b8'
  for (const s of [-1, 1]) p.oval(s * 6, -7.8, 4.6, 4.2, 0, { fill: tone })
  p.save()
  p.translate(0, -5)
  p.scale(0.85, 0.85)
  drawFace(p, skin, a)
  p.restore()

  if (skin.suit === 'cap') {
    star(p, 0, -16.5, 4, out(WHITE, 1.2))
    for (const s of [-1, 1]) p.poly([[s * 15, -12], [s * 23, -17], [s * 21, -12.5], [s * 25, -10], [s * 16, -7.5]], true, out(WHITE, 1.6))
  } else if (skin.suit === 'zip') {
    for (const s of [-1, 1]) p.poly([[s * 15, -13], [s * 25, -19], [s * 20.5, -12.5], [s * 26, -9], [s * 16, -7.5]], true, out(skin.accent, 1.6))
  }
}

/** Hair that sits behind the head (drawn before the head circle). */
function drawHairBack(p: Painter, skin: Skin) {
  const hair = skin.hairColor ?? '#6b3f1d'
  switch (skin.hair) {
    case 'bob':
      p.oval(0, -5, 18.5, 17.5, 0, out(hair))
      break
    case 'pigtails':
      p.circle(-18.5, -5, 6.5, out(hair))
      p.circle(18.5, -5, 6.5, out(hair))
      break
    case 'long':
      p.rrect(-19, -20, 38, 36, 14, out(hair))
      break
    case 'afro':
      p.circle(0, -11, 22, out(hair))
      break
    case 'bun':
      p.circle(0, -25, 7, out(hair))
      break
    case 'ponytail':
      p.oval(-17, -2, 5.5, 11, 0.45, out(hair))
      p.circle(-14, -10, 2.8, { fill: skin.accent })
      break
    case 'hijab':
      p.oval(0, -5, 21, 22, 0, out(hair))
      break
  }
}

function drawEyes(p: Painter, skin: Skin, a: Anim) {
  const ey = skin.eyesOnTop ? -15 : -3
  for (const s of [-1, 1]) {
    const ex = s * 7
    if (a.squint) {
      p.poly([[ex - s * 3, ey - 3], [ex + s * 2, ey], [ex - s * 3, ey + 3]], false, ink(2.2))
    } else if (a.blinking) {
      p.arc(ex, ey - 1, 3.5, 0.15, Math.PI - 0.15, ink(2.2))
    } else {
      if (skin.eyesOnTop) p.circle(ex, ey, 5.6, out(WHITE, 2))
      p.oval(ex, ey, skin.eyesOnTop ? 3 : 3.8, skin.eyesOnTop ? 3.9 : 4.8, 0, { fill: OUTLINE })
      p.circle(ex + 1.3, ey - 1.8, 1.6, { fill: WHITE })
      p.circle(ex - 1.2, ey + 1.7, 0.8, { fill: WHITE })
    }
  }
}

function drawMouth(p: Painter, skin: Skin, a: Anim) {
  if (skin.mouth === 'none') return
  if (skin.mouth === 'beak') {
    p.poly([[-4.5, 2.5], [4.5, 2.5], [0, a.squint ? 9 : 7.5]], true, out('#ff9f1c', 1.6))
    return
  }
  if (skin.mouth === 'snout') {
    p.oval(0, 5.5, 6.5, 4.8, 0, out(skin.belly, 1.6))
    p.oval(0, 3.8, 2.3, 1.6, 0, { fill: OUTLINE })
    if (a.squint) p.oval(0, 7.6, 1.8, 1.8, 0, { fill: MOUTH })
    else p.poly([[0, 5.2], [0, 7.4]], false, ink(1.4))
    return
  }
  if (a.squint) {
    p.oval(0, 5, 2.6, 3.2, 0, { fill: MOUTH })
    return
  }
  switch (skin.mouth) {
    case 'cat':
      p.arc(-2, 3.5, 2, 0.1, Math.PI - 0.1, ink(1.8))
      p.arc(2, 3.5, 2, 0.1, Math.PI - 0.1, ink(1.8))
      break
    case 'fang':
      p.arc(0, 2.5, 3.2, 0.2, Math.PI - 0.2, ink(1.8))
      p.poly([[1, 5.3], [3, 5], [2.2, 7.4]], true, { fill: WHITE })
      break
    case 'smile':
      p.arc(0, 2.5, 3.2, 0.2, Math.PI - 0.2, ink(1.8))
      break
    case 'tongue':
      p.arc(0, 2.5, 5, 0.05, Math.PI - 0.05, { fill: MOUTH, stroke: OUTLINE, width: 1.6 })
      p.oval(0, 6, 2.4, 1.4, 0, { fill: BLUSH })
      break
  }
}

function drawFace(p: Painter, skin: Skin, a: Anim) {
  drawEyes(p, skin, a)
  p.oval(-12.5, 3.5, 3.6, 2.3, 0, { fill: BLUSH, alpha: 0.65 })
  p.oval(12.5, 3.5, 3.6, 2.3, 0, { fill: BLUSH, alpha: 0.65 })
  drawMouth(p, skin, a)
  if (skin.extra === 'whiskers') {
    for (const s of [-1, 1]) {
      p.poly([[s * 16, 1], [s * 23, -1]], false, ink(1.2, 0.45))
      p.poly([[s * 16, 4], [s * 23, 5]], false, ink(1.2, 0.45))
    }
  }
}

function drawBlob(p: Painter, skin: Skin, a: Anim) {
  p.oval(-9, 18, 6.5, 4.5, 0, out(skin.accent))
  p.oval(9, 18, 6.5, 4.5, 0, out(skin.accent))
  drawEars(p, skin)

  p.oval(0, 0, 21, 19, 0, out(skin.body, 2.8))
  p.oval(0, 9, 12, 8, 0, { fill: skin.belly, alpha: 0.85 })
  p.oval(-10, -10, 5, 3, -0.6, { fill: WHITE, alpha: 0.55 })
  p.circle(-3.5, -14.5, 1.5, { fill: WHITE, alpha: 0.55 })

  drawExtras(p, skin)
  drawFrontEars(p, skin)
  drawFace(p, skin, a)
}

/** Top-of-head hair cap: a filled chord that stops just above the eyes. */
function hairCap(p: Painter, color: string) {
  p.arc(0, -7, 16.8, Math.PI + 0.35, Math.PI * 2 - 0.35, out(color))
}

function drawHairFront(p: Painter, skin: Skin) {
  const color = skin.hairColor ?? '#6b3f1d'
  switch (skin.hair) {
    case 'spiky':
      p.poly(
        [
          [-16, -6], [-17, -15], [-12, -21], [-10, -28], [-4, -23], [1, -30], [5, -23],
          [12, -27], [13, -20], [17, -14], [16, -6], [11, -13], [3, -15], [-5, -14], [-11, -12],
        ],
        true,
        out(color),
      )
      break
    case 'bob':
    case 'helmet':
      hairCap(p, color)
      break
    case 'pigtails':
      hairCap(p, color)
      p.circle(-14.5, -10, 2.6, { fill: skin.accent })
      p.circle(14.5, -10, 2.6, { fill: skin.accent })
      break
    case 'messy':
      hairCap(p, color)
      p.poly([[-8, -21], [-5, -29], [-2, -21]], true, out(color, 2))
      p.poly([[2, -22], [8, -28], [8, -19]], true, out(color, 2))
      p.poly([[-13, -16], [-20, -20], [-15, -10]], true, out(color, 2))
      break
    case 'bandana':
      p.poly([[14, -15], [25, -19], [23, -10]], true, out(color, 2))
      p.poly([[14, -12], [23, -5], [17, -4]], true, out(color, 2))
      hairCap(p, color)
      p.circle(-6, -17, 1.4, { fill: WHITE, alpha: 0.85 })
      p.circle(2, -19.5, 1.4, { fill: WHITE, alpha: 0.85 })
      p.circle(8.5, -16, 1.4, { fill: WHITE, alpha: 0.85 })
      break
    case 'wizard':
      p.poly([[-15, -15], [15, -15], [9, -30], [16, -40], [2, -34], [-5, -30]], true, out(color))
      p.oval(0, -15, 20, 4.5, 0, out(color))
      p.poly([[0, -27.5], [1.4, -24.5], [4.6, -24.3], [2.1, -22.3], [3, -19.2], [0, -21], [-3, -19.2], [-2.1, -22.3], [-4.6, -24.3], [-1.4, -24.5]], true, { fill: GOLD })
      break
    case 'crown':
      hairCap(p, color)
      p.poly([[-11, -18], [-13, -31], [-6, -24], [0, -33], [6, -24], [13, -31], [11, -18]], true, out(GOLD, 2))
      p.circle(0, -22.5, 2.2, { fill: '#ff4d6d' })
      p.circle(-13, -31, 1.8, { fill: WHITE })
      p.circle(13, -31, 1.8, { fill: WHITE })
      break
    case 'mohawk':
      p.poly([[-5, -20], [-7, -29], [-2, -26], [0, -36], [3, -26], [8, -30], [5, -20]], true, out(color))
      break
    case 'long':
    case 'ponytail':
    case 'bun':
    case 'buzz':
      hairCap(p, color)
      break
    case 'afro':
      hairCap(p, color)
      for (const [x, y] of [[-12, -17], [-5, -22], [3, -22], [10, -18]] as const) p.circle(x, y, 5, { fill: color })
      break
    case 'hijab':
      p.arc(0, -7, 17.5, Math.PI + 0.25, Math.PI * 2 - 0.25, out(color))
      break
    case 'cap':
      hairCap(p, color)
      p.rrect(-24, -16, 12, 4.5, 2, out(color, 2))
      p.circle(0, -23.5, 1.8, out(skin.accent, 1.2))
      p.poly([[3, -12], [7, -9]], false, { stroke: WHITE, width: 1.6, alpha: 0.5 })
      break
    case 'cowboy':
      p.rrect(-11, -36, 22, 18, 7, out(color))
      p.oval(0, -19.5, 25, 4.5, 0, out(color))
      p.rrect(-10.5, -24.5, 21, 3.5, 1, { fill: skin.accent })
      break
    case 'beanie':
      p.arc(0, -8, 18, Math.PI + 0.1, Math.PI * 2 - 0.1, out(color))
      p.rrect(-18, -15, 36, 6.5, 3, out(color, 2))
      p.circle(0, -27, 4.2, out(WHITE, 2))
      break
    case 'chef':
      for (const [x, y, r] of [[-8, -28, 7.5], [8, -28, 7.5], [0, -32, 8.5]] as const) p.circle(x, y, r, out(WHITE, 2))
      p.rrect(-13, -25, 26, 10, 3, out(WHITE, 2))
      break
  }
}

function drawHuman(p: Painter, skin: Skin, a: Anim) {
  const tone = skin.skinTone ?? '#ffd9b8'

  if (skin.cape) drawCape(p, skin.cape)
  p.oval(-7, 20, 5.5, 3.5, 0, out(skin.accent))
  p.oval(7, 20, 5.5, 3.5, 0, out(skin.accent))
  p.rrect(-12, 3, 24, 17, 8, out(skin.body))
  if (!skin.suit) p.poly([[-4, 4], [0, 8.5], [4, 4]], false, ink(1.6, 0.5))
  drawChest(p, skin)
  if (skin.suit === 'cap') {
    p.circle(-15, 13, 7.5, out(skin.accent, 2))
    p.circle(-15, 13, 5, { fill: WHITE })
    p.circle(-15, 13, 3.2, { fill: '#2f5fd0' })
    star(p, -15, 13.2, 2.4, { fill: WHITE })
  }

  drawHairBack(p, skin)

  p.circle(0, -7, 16, out(tone, 2.6))

  if (skin.suit) {
    drawMask(p, skin, a)
  } else {
    p.save()
    p.translate(0, -5)
    p.scale(0.85, 0.85)
    drawFace(p, skin, a)
    drawFaceProps(p, skin)
    p.restore()
    drawHairFront(p, skin)
  }

  if (skin.extra === 'tiara') {
    p.poly([[-12.5, -15], [0, -19], [12.5, -15]], false, { stroke: GOLD, width: 3 })
    star(p, 0, -19.5, 4.2, out('#e11d48', 1.2))
  }

  if (skin.hair === 'helmet') {
    p.circle(0, -7, 20.5, { fill: '#bfe3ff', alpha: 0.18 })
    p.circle(0, -7, 20.5, { stroke: '#e6ecf5', width: 4.5 })
    p.circle(0, -7, 22.5, { stroke: OUTLINE, width: 1.4 })
    p.arc(0, -7, 16.5, Math.PI * 1.1, Math.PI * 1.45, { stroke: WHITE, width: 2.6, alpha: 0.75 })
    p.poly([[13, -22], [17, -30]], false, ink(2))
    p.circle(17.5, -31, 2.8, out('#ff5d73', 1.6))
  }
}

function drawRobot(p: Painter, skin: Skin, a: Anim) {
  const led = skin.glow ?? '#5cf2ff'
  const screen = skin.visor ?? '#1b2233'
  const ledLine: Style = { stroke: led, width: 2.4 }

  p.rrect(-15, 14, 11, 7, 3, out(skin.accent))
  p.rrect(4, 14, 11, 7, 3, out(skin.accent))
  p.poly([[0, -18], [0, -27]], false, ink(2.2))
  p.circle(0, -29, 3.6, out(led, 2))
  p.rrect(-23.5, -7, 6, 11, 2.5, out(skin.accent, 2))
  p.rrect(17.5, -7, 6, 11, 2.5, out(skin.accent, 2))

  p.rrect(-19, -18, 38, 34, 11, out(skin.body, 2.8))
  p.rrect(-15, -15.5, 12, 4, 2, { fill: WHITE, alpha: 0.5 })
  p.rrect(-14, -11, 28, 14, 6, { fill: screen, stroke: OUTLINE, width: 2 })

  for (const s of [-1, 1]) {
    const ex = s * 6.5
    if (a.squint) {
      p.poly([[ex - s * 2.5, -7], [ex + s * 2, -4], [ex - s * 2.5, -1]], false, ledLine)
    } else if (a.blinking) {
      p.poly([[ex - 3, -4], [ex + 3, -4]], false, ledLine)
    } else {
      p.rrect(ex - 3.2, -8.2, 6.4, 8.4, 3, { fill: led })
      p.circle(ex + 1, -6.2, 1.1, { fill: WHITE, alpha: 0.9 })
    }
  }

  p.circle(-13, 8, 2.3, { fill: BLUSH, alpha: 0.8 })
  p.circle(13, 8, 2.3, { fill: BLUSH, alpha: 0.8 })
  if (a.squint) {
    p.oval(0, 9, 3.2, 3, 0, { fill: screen, stroke: OUTLINE, width: 1.6 })
  } else {
    p.rrect(-6.5, 6.5, 13, 5, 2.5, { fill: screen })
    for (const gx of [-3, 0, 3]) p.poly([[gx, 7.3], [gx, 10.7]], false, { stroke: led, width: 1.2, alpha: 0.8 })
  }
}

function drawGhost(p: Painter, skin: Skin, a: Anim) {
  const pts: Pt[] = []
  for (let i = 0; i <= 12; i++) {
    const t = Math.PI + (i / 12) * Math.PI
    pts.push([Math.cos(t) * 19, -3 + Math.sin(t) * 19])
  }
  pts.push([19, 16])
  for (let i = 1; i <= 6; i++) pts.push([19 - (i * 38) / 6, i % 2 ? 11.5 : 16])
  p.poly(pts, true, { fill: skin.body, stroke: OUTLINE, width: 2.6, alpha: 0.95 })
  p.oval(-9, -13, 5, 3, -0.6, { fill: WHITE, alpha: 0.8 })
  drawFace(p, skin, a)
}

/** Body stays upright (with a little tilt) while the gun spins around it. */
export function drawCharacter(p: Painter, x: number, y: number, pose: Pose, skin: Skin, now: number) {
  const a = animate(pose, now)
  const gunBehind = Math.sin(pose.angle) < -0.25
  const shape = skin.shape ?? 'blob'

  p.save()
  p.translate(x, y)
  if (pose.color) p.glow(0, 2, 24, 22, pose.color, 0.35)

  if (gunBehind) drawGun(p, pose, skin)

  p.save()
  p.translate(0, shape === 'ghost' ? a.bob * 2.5 - 2 : a.bob)
  p.rotate(a.tilt)
  p.scale(a.sx, a.sy)

  if (shape === 'human') drawHuman(p, skin, a)
  else if (shape === 'robot') drawRobot(p, skin, a)
  else if (shape === 'ghost') drawGhost(p, skin, a)
  else drawBlob(p, skin, a)

  p.restore()

  if (!gunBehind) drawGun(p, pose, skin)

  p.restore()
}
