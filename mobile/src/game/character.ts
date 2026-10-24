import type { Shape, Skin } from './skins'

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
  /** Draws the player's photo clipped to a circle; false when there is none (or no support). */
  photo?(cx: number, cy: number, r: number): boolean
}

export type Pose = {
  angle: number
  spin: number
  kick: number
  /** Team color — used for the glow so you can tell sides apart even with the same skin ('' = no glow) */
  color: string
  /** De-syncs bob / blink between the two characters */
  seed: number
  /** Gun skin id (guns.ts); defaults to the Buddy Blaster */
  weapon?: string
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

const grip = (p: Painter, color: string) => p.rrect(18, 4, 7, 10, 2.5, out(color, 2))

function blaster(p: Painter, c: { grip: string; barrel: string; body: string }) {
  grip(p, c.grip)
  p.rrect(31, -2.5, 15, 6, 2, out(c.barrel, 2))
  p.rrect(13, -5, 21, 11, 4, out(c.body, 2))
  p.rrect(44, -1.5, 4, 4, 1, { fill: WHITE })
}

/** Gun designs in gun space: +x along the barrel, grip hand at (22, 8), muzzle near x = 46. */
export function drawWeapon(p: Painter, weapon: string | undefined) {
  switch (weapon) {
    case 'pistol':
      p.poly([[17, 3], [25, 3], [23, 15], [16, 14]], true, out('#e05a8a', 2))
      p.rrect(12, -5, 26, 9, 3.5, out('#ff8fbf', 2))
      p.rrect(36, -3.5, 10, 6, 2, out('#ffd1e6', 2))
      p.rrect(15, -3.6, 18, 2.2, 1, { fill: WHITE, alpha: 0.6 })
      p.circle(46, -0.5, 1.4, { fill: OUTLINE })
      break
    case 'water':
      grip(p, '#ff9f1c')
      p.rrect(12, -4, 26, 10, 5, out('#4cc9f0', 2))
      p.circle(22, -9, 6.5, out('#dff3ff', 2))
      p.arc(22, -9, 5, 0, Math.PI, { fill: '#4895ef' })
      p.poly([[37, -2.5], [46, -1.5], [46, 2.5], [37, 3.5]], true, out('#ff9f1c', 2))
      p.oval(50, 0.5, 1.9, 1.4, 0, { fill: '#4cc9f0', alpha: 0.85 })
      break
    case 'bubble':
      grip(p, '#c77dff')
      p.rrect(35, -1.5, 7, 3, 1.5, out('#c77dff', 1.6))
      p.oval(25, 0, 13, 7, 0, out('#e0aaff', 2))
      p.circle(20, -2, 2, { fill: WHITE, alpha: 0.7 })
      p.circle(45, 0, 4.2, { stroke: OUTLINE, width: 3.2 })
      p.circle(45, 0, 4.2, { stroke: '#ffd6ff', width: 1.6 })
      p.circle(52, -5, 2.6, { stroke: '#9bd7ff', width: 1.2 })
      p.circle(51.2, -5.8, 0.7, { fill: WHITE })
      p.circle(50, 5.5, 1.8, { stroke: '#9bd7ff', width: 1.1 })
      break
    case 'double':
      p.poly([[3, -3], [14, -4], [14, 6], [4, 9]], true, out('#c68642', 2))
      grip(p, '#8d5a2b')
      p.rrect(24, -5, 22, 4.6, 2, out('#c3cad8', 1.8))
      p.rrect(24, -0.4, 22, 4.6, 2, out('#9aa3b8', 1.8))
      p.rrect(12, -5, 14, 11, 3, out('#8d5a2b', 2))
      p.circle(44.8, -2.7, 1.1, { fill: OUTLINE })
      p.circle(44.8, 1.9, 1.1, { fill: OUTLINE })
      break
    case 'ray':
      p.poly([[17, 3], [24, 3], [26, 14], [18, 15]], true, out('#6c757d', 2))
      p.rrect(29, -2, 14, 4, 2, out('#c3cad8', 1.6))
      for (const x of [31, 35, 39]) p.rrect(x - 1.2, -5.5, 2.4, 11, 1.2, out('#ffd166', 1.3))
      p.oval(21, -0.5, 11, 7.5, 0, out('#ff6b6b', 2))
      p.circle(19, -2, 2.6, out('#bde0fe', 1.3))
      p.glow(46, 0, 5, 5, '#7cfc00', 0.55)
      p.circle(45.5, 0, 3.4, out('#b9fbc0', 1.6))
      break
    case 'carrot':
      grip(p, '#e76f51')
      p.poly([[12, -3], [3, -10], [9, -1]], true, out('#57cc99', 1.6))
      p.poly([[12, 0], [2, 0], [10, 3]], true, out('#57cc99', 1.6))
      p.poly([[12, 2], [4, 9], [11, 5]], true, out('#57cc99', 1.6))
      p.poly([[12, -6], [46, -1], [46, 1.5], [12, 7]], true, out('#ff9f1c', 2))
      p.poly([[20, -4.2], [22.5, -2]], false, ink(1.2, 0.5))
      p.poly([[29, 3.5], [31.5, 1.8]], false, ink(1.2, 0.5))
      p.poly([[37, -1.8], [39, -0.6]], false, ink(1.2, 0.5))
      break
    case 'duck':
      grip(p, '#f4a261')
      p.oval(24, -1, 13, 8, 0, out('#ffd60a', 2))
      p.oval(21, 0, 5.5, 3.5, -0.3, out('#ffc300', 1.4))
      p.circle(36, -4, 6, out('#ffd60a', 2))
      p.poly([[40, -5], [48, -1.5], [40, 1.5]], true, out('#ff8c42', 1.8))
      p.circle(37, -6, 1.3, { fill: OUTLINE })
      p.circle(37.4, -6.4, 0.45, { fill: WHITE })
      break
    case 'candy':
      grip(p, '#ff70a6')
      p.poly([[10, -5], [3, -10], [3, 9], [10, 5]], true, out('#ff70a6', 1.8))
      p.poly([[41, -4], [48, -9], [48, 9], [41, 4]], true, out('#ff70a6', 1.8))
      p.rrect(9, -6, 33, 12, 6, { fill: WHITE })
      for (const x of [14, 21, 28, 35]) p.poly([[x, -5.5], [x + 4, 5.5]], false, { stroke: '#ff4d6d', width: 3 })
      p.rrect(9, -6, 33, 12, 6, ink(2))
      break
    case 'rocket':
      grip(p, '#2d6a4f')
      p.rrect(1, -6, 4, 10, 2, out('#ffd166', 1.6))
      p.rrect(20, -12, 6, 5, 1.5, out('#2d6a4f', 1.6))
      p.rrect(4, -7, 40, 12, 6, out('#52b788', 2))
      p.rrect(14, -7, 3, 12, 1, { fill: '#2d6a4f' })
      p.rrect(32, -7, 3, 12, 1, { fill: '#2d6a4f' })
      p.poly([[43, -5], [51, -1], [43, 3]], true, out('#ef476f', 2))
      break
    case 'golden':
      blaster(p, { grip: '#b8860b', barrel: '#fff1a8', body: '#ffcf3f' })
      p.circle(20, 0.5, 2, { fill: '#ff4d6d' })
      star(p, 29, -9, 3.2, { fill: WHITE })
      star(p, 38, 7, 2, { fill: '#fff6c2' })
      break
    case 'snow':
      grip(p, '#4ea8de')
      p.rrect(34, -3.5, 12, 7, 3, out('#90e0ef', 2))
      p.rrect(12, -5, 24, 11, 5, out('#caf0f8', 2))
      p.oval(18, -4.5, 4, 2, 0, { fill: WHITE })
      p.oval(28, -4.8, 5, 2.2, 0, { fill: WHITE })
      p.circle(23, -10, 5.5, out(WHITE, 1.8))
      p.circle(24.5, -8.8, 3, { fill: '#caf0f8', alpha: 0.8 })
      p.circle(21.5, -11.5, 1.2, { fill: WHITE })
      break
    case 'plunger':
      grip(p, '#6d4c41')
      p.rrect(30, -1.5, 12, 3, 1.5, out('#d4a373', 1.6))
      p.rrect(10, -4.5, 22, 9, 3, out('#e63946', 2))
      p.rrect(13, -3, 16, 1.8, 0.9, { fill: WHITE, alpha: 0.5 })
      p.poly([[41, -5.5], [47, -7.5], [47, 7.5], [41, 5.5]], true, out('#e63946', 2))
      break
    case 'crossbow':
      p.rrect(8, -2.5, 30, 5, 2.5, out('#a0522d', 2))
      grip(p, '#8d5a2b')
      p.poly([[37, -2], [32, -14], [35, -15], [40, -2]], true, out('#ff70a6', 1.6))
      p.poly([[37, 2], [32, 14], [35, 15], [40, 2]], true, out('#ff70a6', 1.6))
      p.poly([[33.5, -14.2], [24, 0], [33.5, 14.2]], false, ink(1))
      p.rrect(22, -0.9, 23, 1.8, 0.9, { fill: '#6d4c41' })
      heart(p, 46, 0, 3, out('#ff4d6d', 1.2))
      break
    case 'confetti':
      grip(p, '#ffbe0b')
      p.poly([[12, -3], [44, -8], [44, 8], [12, 3]], true, out('#ff006e', 2))
      p.poly([[22, -4.6], [26, 5.2]], false, { stroke: '#ffbe0b', width: 2.4 })
      p.poly([[32, -6.1], [36, 6.8]], false, { stroke: '#3a86ff', width: 2.4 })
      p.rrect(43, -8.5, 3, 17, 1.5, out('#ffbe0b', 1.4))
      p.rrect(48, -6, 3, 2, 0.6, { fill: '#06d6a0' })
      p.rrect(50, 1, 2.4, 2, 0.6, { fill: '#8338ec' })
      p.rrect(48, 5, 2.4, 2, 0.6, { fill: '#ffbe0b' })
      break
    case 'minigun':
      grip(p, '#495057')
      for (const y of [-5, -1.5, 2]) p.rrect(24, y, 22, 3, 1.5, out('#adb5bd', 1.2))
      p.rrect(40, -6.5, 3, 12, 1.2, out('#495057', 1.4))
      p.rrect(12, -10, 10, 4, 2, out('#495057', 1.4))
      p.rrect(8, -6, 18, 12, 4, out('#6c757d', 2))
      p.circle(17, 0, 2.2, { fill: '#ffd60a' })
      break
    case 'grenade':
      grip(p, '#3a5a40')
      p.rrect(20, -6, 26, 12, 4, out('#a3b18a', 2))
      p.rrect(28, -6, 3, 12, 0.5, { fill: '#ffd166' })
      p.rrect(43, -7, 4, 14, 2, out('#3a5a40', 1.6))
      p.circle(16, 0, 8, out('#588157', 2))
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3
        p.circle(16 + Math.cos(a) * 4.6, Math.sin(a) * 4.6, 1.2, { fill: '#3a5a40' })
      }
      break
    case 'laser':
      grip(p, '#1d3557')
      p.poly([[16, -5], [11, -11], [22, -5.5]], true, out('#1d3557', 1.4))
      p.rrect(38, -2.5, 9, 5, 2, out('#1d3557', 1.6))
      p.poly([[10, -5], [34, -6], [40, -3], [40, 3], [34, 6], [10, 5]], true, out('#e9ecef', 2))
      p.rrect(14, -1.2, 20, 2.4, 1.2, { fill: '#00f5ff' })
      p.glow(47, 0, 4, 4, '#00f5ff', 0.7)
      break
    case 'thunder':
      grip(p, '#3c096c')
      p.rrect(28, -1.5, 16, 3, 1.5, out('#c77dff', 1.2))
      for (const x of [31, 35, 39]) p.circle(x, 0, 4.2, { stroke: '#ffd60a', width: 2 })
      p.rrect(10, -5, 22, 10, 4, out('#7b2cbf', 2))
      p.poly([[19, -3.5], [23, -0.5], [21, -0.5], [24, 3.5], [18.5, 0.5], [20.5, 0.5]], true, { fill: '#ffd60a' })
      p.glow(46, 0, 5, 5, '#ffd60a', 0.6)
      p.circle(46, 0, 3, out('#fff3b0', 1.4))
      break
    case 'star':
      grip(p, '#c77dff')
      p.rrect(8, -1.8, 32, 3.6, 1.8, out('#ffd6ff', 1.6))
      p.glow(42, 0, 8, 8, GOLD, 0.5)
      star(p, 42, 0, 7.5, out(GOLD, 1.8))
      p.circle(42, 0, 1.6, { fill: WHITE })
      star(p, 30, -8, 2, { fill: '#fff6c2' })
      break
    case 'kitty':
      grip(p, '#ff8fab')
      p.poly([[16, -4], [18, -11], [23, -5]], true, out('#ffc8dd', 1.6))
      p.poly([[27, -5], [32, -11], [33, -4]], true, out('#ffc8dd', 1.6))
      p.rrect(36, -3, 8, 6, 3, out('#ffafcc', 1.8))
      p.rrect(12, -5, 26, 11, 5.5, out('#ffc8dd', 2))
      p.circle(21, -0.5, 1.1, { fill: OUTLINE })
      p.circle(28, -0.5, 1.1, { fill: OUTLINE })
      p.oval(24.5, 1.8, 1.2, 0.8, 0, { fill: BLUSH })
      p.circle(46, 0, 3.6, out('#ff8fab', 1.4))
      break
    case 'banana':
      grip(p, '#8d5a2b')
      p.poly(
        [[10, -1], [18, -7], [30, -8.5], [42, -5.5], [47, -2], [46, 1], [40, -1.5], [30, -3], [19, -1], [12, 4]],
        true,
        out('#ffe066', 2),
      )
      p.poly([[20, -4.5], [32, -5.5], [40, -3.5]], false, ink(1.1, 0.35))
      p.circle(46.5, -0.5, 1.5, { fill: '#6d4c41' })
      break
    case 'bee':
      grip(p, '#f4a261')
      p.oval(22, -10, 6, 3.6, -0.4, { fill: WHITE, alpha: 0.75, stroke: OUTLINE, width: 1.2 })
      p.oval(29, -10, 5, 3, 0.4, { fill: WHITE, alpha: 0.75, stroke: OUTLINE, width: 1.2 })
      p.poly([[37, -2.5], [47, 0], [37, 2.5]], true, { fill: OUTLINE })
      p.oval(26, 0, 13, 7, 0, out('#ffd60a', 2))
      p.rrect(22, -6.5, 3, 13, 1, { fill: OUTLINE })
      p.rrect(29, -6.5, 3, 13, 1, { fill: OUTLINE })
      p.circle(16, -1.5, 1.2, { fill: OUTLINE })
      break
    case 'music':
      grip(p, '#4361ee')
      p.poly([[32, -2.5], [46, -8], [46, 8], [32, 2.5]], true, out(GOLD, 2))
      p.rrect(10, -6, 24, 12, 3, out('#bde0fe', 2))
      p.circle(18, 1.5, 2, { fill: '#9b5de5' })
      p.rrect(19.2, -4, 1.4, 6, 0.7, { fill: '#9b5de5' })
      p.circle(26, 2.5, 2, { fill: '#9b5de5' })
      p.rrect(27.2, -3, 1.4, 6, 0.7, { fill: '#9b5de5' })
      p.rrect(19.2, -4.5, 9.4, 1.6, 0.8, { fill: '#9b5de5' })
      break
    case 'cupcake':
      grip(p, '#ff99c8')
      p.rrect(33, -3.5, 13, 7, 3, out('#a0c4ff', 2))
      p.poly([[10, -2], [34, -5], [34, 7], [12, 6]], true, out('#ff99c8', 2))
      for (const x of [16, 22, 28]) p.poly([[x, -2.5], [x + 1, 6]], false, ink(1, 0.3))
      p.oval(22, -5, 13, 5, 0, out('#fff0f6', 2))
      for (const [x, c] of [[16, '#3a86ff'], [21, '#ffbe0b'], [27, '#06d6a0']] as [number, string][]) {
        p.rrect(x, -6.5, 2.6, 1.2, 0.6, { fill: c })
      }
      p.circle(22, -10.5, 2.6, out('#e63946', 1.4))
      break
    case 'twin':
      grip(p, '#c9184a')
      p.rrect(32, -5.8, 14, 4.6, 2, out(GOLD, 1.6))
      p.rrect(32, 1.2, 14, 4.6, 2, out(GOLD, 1.6))
      p.rrect(11, -6.5, 23, 13, 5.5, out('#ff4d6d', 2))
      heart(p, 23, 0, 4, out(WHITE, 1.2))
      star(p, 15, -10, 2.4, { fill: GOLD })
      star(p, 40, 9, 1.8, { fill: '#fff6c2' })
      p.glow(46, -3.5, 3, 3, '#ff4d6d', 0.6)
      p.glow(46, 3.5, 3, 3, '#ff4d6d', 0.6)
      break
    case 'triple':
      grip(p, '#3a0ca3')
      for (const y of [-6, -1.4, 3.2]) p.rrect(30, y, 16, 2.8, 1.4, out('#bde0fe', 1.2))
      p.rrect(11, -6.5, 21, 13, 5, out('#4361ee', 2))
      star(p, 21, 0, 4.2, out(GOLD, 1.2))
      star(p, 14, -10, 2, { fill: GOLD })
      star(p, 38, -10, 1.6, { fill: '#fff6c2' })
      break
    case 'sprinkle':
      grip(p, '#ff70a6')
      p.poly([[12, -4], [40, -9], [40, 9], [12, 4]], true, out('#ffafcc', 2))
      p.rrect(39, -10, 7, 20, 3.5, out('#ff70a6', 2))
      for (const [x, y, c, a] of [
        [18, -2, '#3a86ff', 0.4], [24, 2, '#ffbe0b', -0.5], [28, -4, '#06d6a0', 0.2], [33, 3, '#8338ec', 0.7],
        [34, -3, '#ff006e', -0.3],
      ] as [number, number, string, number][]) {
        p.save()
        p.translate(x, y)
        p.rotate(a)
        p.rrect(-2, -0.7, 4, 1.4, 0.7, { fill: c })
        p.restore()
      }
      star(p, 30, -12, 2, { fill: GOLD })
      break
    case 'rainbow':
      grip(p, '#7209b7')
      p.rrect(33, -3.5, 13, 7, 3, out(GOLD, 2))
      p.rrect(11, -6.5, 24, 13, 5.5, out(WHITE, 2))
      for (const [i, c] of ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'].entries()) {
        p.rrect(14 + i * 4, -4.5, 3, 9, 1.5, { fill: c })
      }
      p.rrect(11, -6.5, 24, 13, 5.5, ink(2))
      p.glow(47, 0, 5, 5, '#ffca3a', 0.6)
      star(p, 38, -9, 2.2, { fill: GOLD })
      break
    case 'dragon':
      grip(p, '#1b4332')
      p.poly([[16, -6], [13, -14], [21, -6.5]], true, out('#ffd166', 1.4))
      p.poly([[24, -6.5], [23, -14], [29, -6.5]], true, out('#ffd166', 1.4))
      p.rrect(8, -6.5, 28, 13, 5.5, out('#2d6a4f', 2))
      for (const x of [13, 19, 25]) p.poly([[x, 6.5], [x + 2.5, 9.5], [x + 5, 6.5]], true, out('#95d5b2', 1))
      p.poly([[33, -7.5], [47, -3], [47, 3], [33, 7.5]], true, out('#52b788', 2))
      p.circle(36, -3, 1.8, { fill: '#ffd166' })
      p.circle(36.3, -3, 0.8, { fill: OUTLINE })
      p.glow(49, 0, 5, 4, '#ff6b00', 0.7)
      break
    case 'slingshot':
      // Wooden Y with a stretchy band and a pebble in the pouch.
      p.rrect(18, 2, 7, 12, 2.5, out('#a0522d', 2))
      p.poly([[21, 3], [30, -1], [44, -9]], false, { stroke: OUTLINE, width: 6 })
      p.poly([[21, 3], [30, -1], [44, -9]], false, { stroke: '#c68642', width: 3.6 })
      p.poly([[30, -1], [44, 8]], false, { stroke: OUTLINE, width: 6 })
      p.poly([[30, -1], [44, 8]], false, { stroke: '#c68642', width: 3.6 })
      p.poly([[44, -9], [36, -0.5], [44, 8]], false, { stroke: '#ff5d8f', width: 1.6 })
      p.circle(36, -0.5, 3, out('#9aa3b8', 1.3))
      break
    case 'pizza':
      grip(p, '#8d5a2b')
      p.rrect(12, -5.5, 22, 11, 4, out('#c0392b', 2))
      p.rrect(32, -4, 14, 8, 2.5, out('#f4d03f', 2))
      for (const [x, y] of [[17, -1.5], [23, 2], [28, -2]] as Pt[]) p.circle(x, y, 1.8, { fill: '#ffe8a3' })
      p.poly([[36, -4], [40, 0], [36, 4]], true, { fill: '#e74c3c' })
      p.circle(44, 0, 1.2, { fill: OUTLINE })
      break
    case 'ghost':
      grip(p, '#6c63ff')
      p.rrect(33, -3, 13, 6, 2.5, out('#b8b5ff', 2))
      p.poly([[11, 6], [11, -3], [16, -8], [26, -8], [31, -3], [31, 6], [28, 4], [25, 7], [21, 4], [17, 7], [14, 4]], true, out('#f4f1ff', 2))
      p.circle(18, -2, 1.6, { fill: OUTLINE })
      p.circle(24, -2, 1.6, { fill: OUTLINE })
      p.oval(21, 1.8, 1.6, 1.2, 0, { fill: OUTLINE })
      p.glow(47, 0, 4, 4, '#b8b5ff', 0.55)
      break
    case 'donut':
      grip(p, '#ff70a6')
      p.rrect(32, -3.5, 14, 7, 3, out('#ffd6e8', 2))
      p.circle(22, 0, 9.5, out('#e0a060', 2))
      p.circle(22, 0, 7.5, { fill: '#ff70a6' })
      p.circle(22, 0, 3.2, out('#1f1a2e', 1))
      for (const [x, y, c] of [[17, -4, '#fff'], [26, -4.5, '#4cc9f0'], [27, 3.5, '#ffe066'], [17.5, 4, '#06d6a0']] as [number, number, string][]) {
        p.rrect(x - 1.4, y - 0.5, 2.8, 1, 0.5, { fill: c })
      }
      break
    case 'ice':
      grip(p, '#2a6f97')
      p.rrect(12, -5.5, 22, 11, 4, out('#89c2d9', 2))
      p.poly([[32, -5], [47, 0], [32, 5]], true, out('#caf0f8', 2))
      p.poly([[16, -5.5], [19, -11], [22, -5.5]], true, out('#e0fbfc', 1.4))
      p.poly([[24, -5.5], [26, -9], [28, -5.5]], true, out('#e0fbfc', 1.4))
      p.rrect(15, -3.8, 16, 2, 1, { fill: WHITE, alpha: 0.6 })
      p.glow(48, 0, 5, 4, '#90e0ef', 0.6)
      break
    case 'unicorn':
      grip(p, '#c9a6ff')
      p.rrect(11, -6, 20, 12, 5, out('#fbf3ff', 2))
      p.poly([[30, -5], [49, 0], [30, 5]], true, out(GOLD, 2))
      p.poly([[35, -3.5], [37, 3]], false, ink(1.1, 0.5))
      p.poly([[41, -2], [42.5, 2]], false, ink(1.1, 0.5))
      for (const [i, c] of RAINBOW.entries()) p.rrect(13 + i * 3.2, -4, 2.4, 8, 1.2, { fill: c, alpha: 0.85 })
      star(p, 20, -10, 2.2, { fill: '#ff8fab' })
      p.glow(49, 0, 4, 4, '#ff8fab', 0.55)
      break
    case 'pumpkin':
      grip(p, '#2d6a4f')
      p.rrect(34, -5, 12, 10, 3.5, out('#343a40', 2))
      p.oval(23, 0, 13, 9.5, 0, out('#ff8c1a', 2))
      p.poly([[17, -8], [17, 8]], false, ink(1.2, 0.35))
      p.poly([[29, -8], [29, 8]], false, ink(1.2, 0.35))
      p.poly([[18, -2], [20.5, -4.5], [23, -2]], true, { fill: '#3b1d06' })
      p.poly([[24, -2], [26.5, -4.5], [29, -2]], true, { fill: '#3b1d06' })
      p.poly([[18, 2], [21, 4.5], [23.5, 2.5], [26, 4.5], [29, 2]], false, { stroke: '#3b1d06', width: 1.6 })
      p.rrect(21.5, -12, 3, 4, 1, out('#2d6a4f', 1.2))
      break
    case 'storm':
      grip(p, '#1d3557')
      p.rrect(31, -3, 15, 6, 2.5, out('#457b9d', 2))
      for (const [x, y, r] of [[15, -1, 6], [22, -4, 7], [28, 0, 5.5], [20, 3, 6]] as [number, number, number][]) {
        p.circle(x, y, r, out('#a8b8d0', 2))
      }
      for (const [x, y, r] of [[15, -1, 5], [22, -4, 6], [28, 0, 4.5], [20, 3, 5]] as [number, number, number][]) {
        p.circle(x, y, r, { fill: '#c9d6ea' })
      }
      p.poly([[21, 4], [18, 11], [22, 9], [20, 15]], false, { stroke: '#ffd60a', width: 2 })
      p.glow(47, 0, 6, 5, '#ffd60a', 0.6)
      break
    case 'galaxy':
      grip(p, '#240046')
      p.rrect(32, -4.5, 14, 9, 3.5, out('#7b2cbf', 2))
      p.rrect(10, -7, 25, 14, 6, out('#10002b', 2))
      p.oval(22, 0, 8, 3, -0.3, { stroke: '#c77dff', width: 1.6 })
      p.circle(22, 0, 3.2, out('#ff9e00', 1))
      for (const [x, y] of [[14, -3.5], [30, 3.5], [27, -4.5], [15, 4]] as Pt[]) p.circle(x, y, 0.8, { fill: WHITE })
      star(p, 40, -9, 2, { fill: '#e0aaff' })
      p.glow(48, 0, 6, 5, '#c77dff', 0.7)
      break
    default:
      blaster(p, { grip: '#5b6275', barrel: '#aab2c5', body: '#8b93a7' })
      p.circle(20, 0.5, 2, { fill: BLUSH })
  }
}

function heart(p: Painter, cx: number, cy: number, r: number, s: Style) {
  p.poly(
    [
      [cx + r * 1.1, cy],
      [cx - r * 0.2, cy - r * 1.1],
      [cx - r * 0.9, cy - r * 0.9],
      [cx - r * 0.9, cy - r * 0.1],
      [cx - r * 0.5, cy],
      [cx - r * 0.9, cy + r * 0.1],
      [cx - r * 0.9, cy + r * 0.9],
      [cx - r * 0.2, cy + r * 1.1],
    ],
    true,
    s,
  )
}

const SPRINKLE_COLORS = ['#ff006e', '#ffbe0b', '#3a86ff', '#06d6a0', '#8338ec', '#ff70a6']
const RAINBOW = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93']

const CONFETTI: [number, number, string][] = [
  [0, 0, '#ff006e'],
  [4.5, -3, '#ffbe0b'],
  [-3.5, 3.5, '#3a86ff'],
  [-4.5, -3, '#8338ec'],
  [3.5, 4, '#06d6a0'],
]

/**
 * Bullet art in bullet space: +x is the travel direction, centred on the hitbox. Purely visual — the
 * hitbox is the same for every gun. `team` tints the default blaster shot; `seed` (the bullet id)
 * varies pellets of spray guns.
 */
export function drawProjectile(p: Painter, weapon: string | undefined, team: string, now: number, seed = 0) {
  const spin = now * 0.018
  switch (weapon) {
    case 'star':
      p.glow(0, 0, 7, 7, GOLD, 0.6)
      p.save()
      p.rotate(spin)
      star(p, 0, 0, 5.5, out('#ffe066', 1.1))
      p.restore()
      break
    case 'kitty':
      p.circle(-1, 0, 3.4, out('#ff8fab', 1))
      for (const [x, y] of [[3, -3.4], [4, 0], [3, 3.4]] as Pt[]) p.circle(x, y, 1.5, out('#ff8fab', 0.8))
      break
    case 'banana':
      p.save()
      p.rotate(spin)
      p.poly([[-6, 1], [-3, -3], [3, -3], [6, 1], [3, -0.5], [-3, -0.5]], true, out('#ffe066', 1.1))
      p.restore()
      break
    case 'bee': {
      const buzz = Math.sin(now * 0.08 + seed) * 1.2
      p.oval(-1, -4 + buzz * 0.3, 3, 1.8, -0.4, { fill: WHITE, alpha: 0.8 })
      p.oval(0, buzz, 5, 3.4, 0, out('#ffd60a', 1))
      p.rrect(-1.5, -3.2 + buzz, 1.6, 6.4, 0.6, { fill: OUTLINE })
      p.circle(3, -0.8 + buzz, 0.8, { fill: OUTLINE })
      break
    }
    case 'music':
      p.save()
      p.rotate(-Math.PI / 2 + Math.sin(now * 0.02 + seed) * 0.3)
      p.oval(-2.5, 2.5, 3, 2.2, -0.4, { fill: '#9b5de5' })
      p.rrect(0, -6, 1.6, 9, 0.8, { fill: '#9b5de5' })
      p.poly([[1.6, -6], [5, -3.5], [1.6, -2.5]], true, { fill: '#9b5de5' })
      p.restore()
      break
    case 'cupcake':
      p.poly([[-3.5, 0], [3.5, 0], [2.5, 5], [-2.5, 5]], true, out('#ff99c8', 1))
      p.oval(0, -0.5, 4.5, 3, 0, out('#fff0f6', 1))
      p.circle(0, -4, 1.6, { fill: '#e63946' })
      break
    case 'twin':
      p.glow(0, 0, 8, 6, '#ff4d6d', 0.6)
      heart(p, 0, 0, 4, out('#ff4d6d', 1.1))
      p.circle(-0.8, -1.4, 0.9, { fill: WHITE })
      break
    case 'triple':
      p.glow(0, 0, 6, 6, '#4cc9f0', 0.6)
      p.save()
      p.rotate(spin)
      star(p, 0, 0, 5, out('#bde0fe', 1))
      p.restore()
      break
    case 'sprinkle': {
      const c = SPRINKLE_COLORS[seed % SPRINKLE_COLORS.length]
      p.rrect(-4, -1, 8, 2, 1, { fill: c })
      p.rrect(-2.5, -0.4, 4, 0.8, 0.4, { fill: WHITE, alpha: 0.6 })
      break
    }
    case 'rainbow': {
      const k = seed % RAINBOW.length
      p.glow(0, 0, 7, 7, RAINBOW[k], 0.7)
      p.circle(0, 0, 5, { fill: RAINBOW[k] })
      p.circle(0, 0, 3.4, { fill: RAINBOW[(k + 2) % RAINBOW.length] })
      p.circle(0, 0, 1.8, { fill: WHITE })
      break
    }
    case 'dragon': {
      const f = Math.sin(now * 0.06 + seed) * 1.5
      p.poly([[-9 - f, 0], [-2, -2.8], [5, 0], [-2, 2.8]], true, { fill: '#ff6b00' })
      p.poly([[-5 - f * 0.5, 0], [-1, -1.4], [3.5, 0], [-1, 1.4]], true, { fill: '#ffd166' })
      break
    }
    case 'pistol':
      p.oval(0, 0, 6.5, 2.8, 0, out('#ff8fbf', 1.2))
      p.oval(1.5, -0.6, 3, 1, 0, { fill: WHITE })
      break
    case 'water':
      p.circle(-9, 2.5, 1.4, { fill: '#4cc9f0', alpha: 0.6 })
      p.circle(-12, -1.5, 1, { fill: '#4cc9f0', alpha: 0.45 })
      p.poly([[-1, -4], [8, 0], [-1, 4]], true, { fill: '#4cc9f0' })
      p.circle(-1, 0, 4, { fill: '#4cc9f0' })
      p.circle(-2, -1.5, 1.2, { fill: WHITE })
      break
    case 'bubble': {
      const r = 6 + Math.sin(now * 0.02) * 0.7
      p.circle(0, 0, r, { fill: '#e0aaff', alpha: 0.28 })
      p.circle(0, 0, r, { stroke: '#c77dff', width: 1.5 })
      p.circle(-2.2, -2.2, 1.6, { fill: WHITE, alpha: 0.9 })
      break
    }
    case 'double':
      p.circle(0, -3.4, 2.8, out('#c3cad8', 1.2))
      p.circle(0, 3.4, 2.8, out('#c3cad8', 1.2))
      break
    case 'ray':
      p.glow(0, 0, 9, 5, '#7cfc00', 0.7)
      p.oval(0, 0, 7.5, 3.8, 0, { stroke: '#b9fbc0', width: 2 })
      p.oval(0, 0, 3.2, 1.7, 0, { fill: WHITE })
      break
    case 'carrot':
      p.poly([[-6, -1], [-12, -4.5], [-8, 0]], true, { fill: '#57cc99' })
      p.poly([[-6, 1], [-12, 4.5], [-8, 0]], true, { fill: '#57cc99' })
      p.poly([[-6.5, -3.6], [8, 0], [-6.5, 3.6]], true, out('#ff9f1c', 1.2))
      break
    case 'duck':
      p.oval(-1, 1, 5.5, 4, 0, out('#ffd60a', 1.2))
      p.circle(3, -3, 3.2, out('#ffd60a', 1.2))
      p.poly([[5.5, -3.8], [9, -2.6], [5.5, -1.4]], true, { fill: '#ff8c42' })
      p.circle(3.6, -3.8, 0.8, { fill: OUTLINE })
      break
    case 'candy':
      p.save()
      p.rotate(spin)
      p.poly([[-3.5, 0], [-8, -3.5], [-8, 3.5]], true, out('#ff70a6', 1))
      p.poly([[3.5, 0], [8, -3.5], [8, 3.5]], true, out('#ff70a6', 1))
      p.circle(0, 0, 4.2, out(WHITE, 1.2))
      p.poly([[-2, -3.5], [2, 3.5]], false, { stroke: '#ff4d6d', width: 2 })
      p.restore()
      break
    case 'rocket': {
      const flick = Math.sin(now * 0.07) * 2
      p.poly([[-7, -2.8], [-15 - flick, 0], [-7, 2.8]], true, { fill: '#ffbe0b' })
      p.poly([[-7, -1.5], [-11 - flick * 0.5, 0], [-7, 1.5]], true, { fill: '#ff6b00' })
      p.poly([[-7, -3], [-10, -6.5], [-3, -3]], true, out('#ef476f', 1))
      p.poly([[-7, 3], [-10, 6.5], [-3, 3]], true, out('#ef476f', 1))
      p.rrect(-7.5, -3.2, 13, 6.4, 3, out('#e9ecef', 1.2))
      p.poly([[5, -3.2], [10.5, 0], [5, 3.2]], true, out('#ef476f', 1.2))
      p.circle(0, 0, 1.4, { fill: '#4cc9f0' })
      break
    }
    case 'golden':
      p.glow(0, 0, 8, 8, GOLD, 0.6)
      p.save()
      p.rotate(spin)
      star(p, 0, 0, 6.5, out(GOLD, 1.2))
      p.restore()
      p.circle(0, 0, 1.5, { fill: WHITE })
      break
    case 'snow':
      p.circle(0, 0, 5.2, out(WHITE, 1.2))
      p.circle(1.3, 1.3, 3.2, { fill: '#caf0f8', alpha: 0.85 })
      p.circle(-1.8, -1.8, 1.2, { fill: WHITE })
      break
    case 'plunger':
      p.rrect(-11, -1, 12, 2, 1, { fill: '#d4a373' })
      p.poly([[1, -4.5], [6.5, -6], [6.5, 6], [1, 4.5]], true, out('#e63946', 1.2))
      break
    case 'crossbow':
      p.poly([[-10, -1], [-13, -4], [-8, -1]], true, { fill: '#ff70a6' })
      p.poly([[-10, 1], [-13, 4], [-8, 1]], true, { fill: '#ff70a6' })
      p.rrect(-11, -0.8, 14, 1.6, 0.8, { fill: '#8d5a2b' })
      heart(p, 4, 0, 3.2, out('#ff4d6d', 1))
      break
    case 'confetti':
      p.save()
      p.rotate(spin * 0.6)
      for (const [x, y, c] of CONFETTI) p.rrect(x - 1.8, y - 1.1, 3.6, 2.2, 0.6, { fill: c })
      p.restore()
      break
    case 'minigun':
      p.rrect(-6, -1.4, 11, 2.8, 1.4, { fill: '#ffd60a' })
      p.rrect(-2, -0.6, 6, 1.2, 0.6, { fill: WHITE })
      break
    case 'grenade':
      p.save()
      p.rotate(spin)
      p.rrect(-1.6, -7.2, 3.2, 3, 1, out('#adb5bd', 1))
      p.circle(0, 0, 5, out('#588157', 1.4))
      p.poly([[-3.5, 0], [3.5, 0]], false, ink(1, 0.5))
      p.circle(2.6, -7, 1.6, ink(1))
      p.restore()
      break
    case 'laser':
      p.glow(0, 0, 13, 4, '#00f5ff', 0.7)
      p.rrect(-12, -1.8, 21, 3.6, 1.8, { fill: '#00f5ff' })
      p.rrect(-10, -0.7, 18, 1.4, 0.7, { fill: WHITE })
      break
    case 'thunder': {
      const j = Math.sin(now * 0.09) * 1.2
      p.glow(0, 0, 10, 6, '#ffd60a', 0.7)
      p.poly([[-9, -2 + j], [0, -4.5], [-1, -0.6], [9, -1 - j], [-1, 4.5], [0, 0.8]], true, out('#ffd60a', 1.1))
      break
    }
    case 'slingshot':
      p.circle(0, 0, 4.2, out('#9aa3b8', 1.2))
      p.circle(-1.3, -1.3, 1.2, { fill: WHITE, alpha: 0.6 })
      break
    case 'pizza':
      p.save()
      p.rotate(spin * 0.7)
      p.poly([[-5, -5], [6, 0], [-5, 5]], true, out('#f4d03f', 1.1))
      p.rrect(-6.5, -5.5, 2.5, 11, 1.2, { fill: '#d4a373' })
      p.circle(-1, -1.5, 1.3, { fill: '#e74c3c' })
      p.circle(1.5, 1, 1.1, { fill: '#e74c3c' })
      p.restore()
      break
    case 'ghost': {
      const w = Math.sin(now * 0.03 + seed) * 1
      p.glow(0, 0, 8, 7, '#b8b5ff', 0.5)
      p.poly([[5, -4], [5, 3], [-2, 5 + w], [-5, 2], [-8, 4 - w], [-6, 0], [-8, -3 + w], [-3, -5]], true, out('#f4f1ff', 1))
      p.circle(2.5, -1.8, 0.9, { fill: OUTLINE })
      p.circle(2.5, 1.2, 0.9, { fill: OUTLINE })
      break
    }
    case 'donut':
      p.save()
      p.rotate(spin)
      p.circle(0, 0, 5.2, out('#e0a060', 1))
      p.circle(0, 0, 4, { fill: '#ff70a6' })
      p.circle(0, 0, 1.6, out('#1f1a2e', 0.8))
      p.rrect(-3, -3, 1.8, 0.8, 0.4, { fill: WHITE })
      p.rrect(1.5, 1.8, 1.8, 0.8, 0.4, { fill: '#4cc9f0' })
      p.restore()
      break
    case 'ice':
      p.glow(0, 0, 9, 5, '#90e0ef', 0.6)
      p.poly([[-7, 0], [-1, -3.5], [8, 0], [-1, 3.5]], true, out('#caf0f8', 1))
      p.poly([[-3, 0], [5, 0]], false, { stroke: WHITE, width: 1 })
      break
    case 'unicorn': {
      const k = seed % RAINBOW.length
      p.glow(0, 0, 8, 8, RAINBOW[k], 0.6)
      p.save()
      p.rotate(spin)
      star(p, 0, 0, 5.5, out(WHITE, 1))
      p.restore()
      p.circle(0, 0, 2, { fill: RAINBOW[k] })
      break
    }
    case 'pumpkin':
      p.poly([[-4, -3.5], [5, 0], [-4, 3.5]], true, out('#ffffff', 0.9))
      p.poly([[-4, -3.5], [-1, -2.3], [-1, 2.3], [-4, 3.5]], true, { fill: '#ffd166' })
      p.poly([[-1, -2.3], [2, -1.2], [2, 1.2], [-1, 2.3]], true, { fill: '#ff8c1a' })
      break
    case 'storm': {
      const j = Math.sin(now * 0.11 + seed) * 1.4
      p.glow(0, 0, 9, 5, '#8ecae6', 0.7)
      p.poly([[-8, j], [-3, -3], [0, 1], [4, -2 - j], [8, 0]], false, { stroke: WHITE, width: 2.2 })
      p.poly([[-8, j], [-3, -3], [0, 1], [4, -2 - j], [8, 0]], false, { stroke: '#8ecae6', width: 1 })
      break
    }
    case 'galaxy': {
      p.poly([[-14, 0], [-2, -3], [-2, 3]], true, { fill: '#c77dff', alpha: 0.45 })
      p.poly([[-10, 0], [-2, -1.8], [-2, 1.8]], true, { fill: '#e0aaff', alpha: 0.6 })
      p.glow(0, 0, 7, 7, '#c77dff', 0.7)
      p.circle(0, 0, 3.8, out('#ff9e00', 1))
      p.circle(-1, -1, 1.2, { fill: WHITE })
      break
    }
    default:
      p.glow(0, 0, 7, 7, team, 0.8)
      p.circle(0, 0, 4, { fill: WHITE })
  }
}

function drawGun(p: Painter, pose: Pose, skin: Skin) {
  p.save()
  p.rotate(pose.angle)
  // Keep the grip under the barrel when aiming left, so asymmetric designs never hang upside down.
  if (Math.cos(pose.angle) < 0) p.scale(1, -1)
  drawWeapon(p, pose.weapon)
  p.oval(22, 8, 5, 4.5, 0, out(skin.glove ?? handColor(skin), 2))
  if (skin.extra === 'soldier') {
    // Metal hand: knuckle plates.
    p.poly([[19.5, 5], [19.5, 11]], false, ink(1, 0.45))
    p.poly([[22.5, 4.2], [22.5, 11.8]], false, ink(1, 0.45))
    p.arc(22, 8, 3.2, Math.PI * 1.1, Math.PI * 1.6, { stroke: WHITE, width: 1.3, alpha: 0.8 })
  } else if (skin.glove) {
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
  } else if (skin.extra === 'venom') {
    // Big white angled eye patches and a white spider on the belly.
    for (const s of [-1, 1]) p.poly([[s * 1.5, -4], [s * 13, -12], [s * 16, -2], [s * 9, 3]], true, out(WHITE, 1.8))
    const leg: Style = { stroke: WHITE, width: 1.4 }
    p.oval(0, 11, 2.2, 3, 0, { fill: WHITE })
    for (const s of [-1, 1]) {
      p.poly([[s * 1.5, 9.5], [s * 5, 7], [s * 7, 8]], false, leg)
      p.poly([[s * 1.5, 11], [s * 6, 10.5]], false, leg)
      p.poly([[s * 1.5, 12.5], [s * 5, 14.5], [s * 7, 14]], false, leg)
    }
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
    const lid = skin.skinTone ?? '#ffd9b8'
    for (const s of [-1, 1]) {
      p.poly([[s * 2, -4.4], [s * 12, -8.8], [s * 12, -12], [s * 2, -12]], true, { fill: lid })
      p.poly([[s * 2, -4.4], [s * 12, -8.8]], false, ink(2.4))
    }
  }
  if (skin.extra === 'jester') {
    // Dark eye rings and a huge red grin.
    for (const s of [-1, 1]) p.circle(s * 7, -3, 6.2, { fill: '#2b1640', alpha: 0.3 })
    const grin: Pt[] = []
    for (let i = 0; i <= 10; i++) {
      const x = -12 + i * 2.4
      grin.push([x, 3 + 4.5 * (1 - (x / 12) ** 2)])
    }
    p.poly(grin, false, { stroke: OUTLINE, width: 5 })
    p.poly(grin, false, { stroke: '#e11d48', width: 3 })
    for (const s of [-1, 1]) p.poly([[s * 12, 3], [s * 14, 1]], false, { stroke: '#e11d48', width: 2 })
  }
  if (skin.extra === 'soldier') {
    // Dark eye smudge plus a black muzzle mask with a vent grill.
    for (const s of [-1, 1]) p.oval(s * 7, -3.5, 7, 5.5, 0, { fill: '#1b1d27', alpha: 0.28 })
    p.rrect(-13, -0.5, 26, 12, 5.5, out('#1b1d27', 1.8))
    for (const x of [-4, 0, 4]) p.poly([[x, 3], [x, 8.5]], false, { stroke: '#4a5061', width: 1.4 })
    p.poly([[-13, 2], [-17, 0]], false, ink(1.6))
    p.poly([[13, 2], [17, 0]], false, ink(1.6))
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
  if (skin.hair === 'pharaoh') {
    // Gold and blue collar.
    p.rrect(-11, 3, 22, 6, 3, out(GOLD, 1.4))
    for (const x of [-6, 0, 6]) p.poly([[x, 3.5], [x, 8.5]], false, { stroke: skin.hairColor ?? '#1d4ed8', width: 2 })
  }
  if (skin.extra === 'trickster') {
    p.rrect(-12, 14.5, 24, 3.2, 1.2, { fill: skin.accent })
    p.poly([[-6, 4], [-2, 14]], false, { stroke: skin.accent, width: 2 })
    p.poly([[6, 4], [2, 14]], false, { stroke: skin.accent, width: 2 })
  }
  if (skin.extra === 'soldier') {
    // Tactical harness and belt, then the metal shoulder with its red star.
    p.poly([[-9, 4], [8, 17]], false, { stroke: skin.accent, width: 3 })
    p.rrect(-12, 14.5, 24, 3.2, 1.2, { fill: skin.accent })
    p.rrect(-2.5, 14, 5, 4.2, 1, out('#8a93a3', 1))
    p.save()
    p.scale(-1, 1)
    drawMetalArm(p, skin.glove ?? '#c3cad6')
    p.restore()
  }
}

/** Winter-soldier arm hanging at the side: plated upper arm with a red star, segmented forearm, fist. */
function drawMetalArm(p: Painter, metal: string) {
  const plate = ink(1, 0.4)
  const shine: Style = { stroke: WHITE, width: 1.3, alpha: 0.75 }

  p.save()
  p.translate(15, 4)
  p.rotate(-0.35)
  p.rrect(-4.6, 0, 9.2, 12, 4, out(metal, 1.8))
  p.poly([[-4.2, 7.5], [4.2, 7.5]], false, plate)
  p.poly([[-2.4, 2], [-2.4, 10]], false, shine)
  star(p, 0.6, 4.2, 2.6, out('#d62839', 0.8))
  p.restore()

  p.save()
  p.translate(19, 15)
  p.rotate(0.1)
  p.rrect(-4, -1.5, 8, 10.5, 3.5, out(metal, 1.8))
  for (const y of [1.8, 4.6]) p.poly([[-3.6, y], [3.6, y]], false, plate)
  p.poly([[-1.8, 0], [-1.8, 7.5]], false, shine)
  p.restore()

  p.circle(18.3, 24.5, 4.6, out(metal, 1.8))
  for (const x of [16.6, 18.4, 20.2]) p.poly([[x, 21.6], [x, 23.6]], false, plate)
  p.arc(18.3, 24.5, 3.2, Math.PI * 1.1, Math.PI * 1.55, shine)

  // Shoulder cap on top of the arm joint.
  p.circle(14, 5, 6, out(metal, 2))
  p.poly([[9, 5], [19, 5]], false, plate)
  p.arc(14, 5, 4.2, Math.PI * 1.1, Math.PI * 1.5, shine)
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
    case 'shaggy':
      // Shoulder-length hair behind the head, ending in uneven tips.
      p.poly(
        [
          [-15, -21], [0, -25], [15, -21], [20, -10], [22, 2], [22, 12], [18, 9], [16, 15], [12, 10],
          [-12, 10], [-16, 15], [-18, 9], [-22, 12], [-22, 2], [-20, -10],
        ],
        true,
        out(hair),
      )
      break
    case 'viking':
      // Two thick braids hanging over the shoulders.
      for (const s of [-1, 1]) {
        p.oval(s * 16, 2, 4.5, 11, s * -0.15, out(hair, 2))
        for (const y of [-2, 3, 8]) p.poly([[s * 12.5, y], [s * 19.5, y + 1]], false, ink(1.1, 0.4))
        p.circle(s * 16.5, 13, 2.2, out('#b8c0cc', 1.2))
      }
      break
    case 'pharaoh':
      // Striped headdress flaps down both sides.
      for (const s of [-1, 1]) {
        p.poly([[s * 12, -18], [s * 20, -6], [s * 21, 14], [s * 12, 14], [s * 11, -4]], true, out(hair, 2))
        for (const y of [-6, 0, 6, 11]) p.poly([[s * 12, y], [s * 20.5, y]], false, { stroke: GOLD, width: 2 })
      }
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

const closedEye = (p: Painter, ex: number, ey: number) => p.arc(ex, ey - 1, 3.5, 0.15, Math.PI - 0.15, ink(2.2))

function drawEye(p: Painter, skin: Skin, s: number, ex: number, ey: number) {
  switch (skin.eyes) {
    case 'happy':
      p.arc(ex, ey + 1.5, 3.6, Math.PI + 0.25, Math.PI * 2 - 0.25, ink(2.3))
      return
    case 'sleepy':
      p.arc(ex, ey - 0.5, 3.8, 0.1, Math.PI - 0.1, { fill: OUTLINE })
      p.poly([[ex - 4.6, ey - 0.5], [ex + 4.6, ey - 0.5]], false, ink(2.2))
      return
    case 'wink':
      if (s === 1) {
        closedEye(p, ex, ey)
        return
      }
      break
    case 'dizzy':
      p.circle(ex, ey, 4.2, ink(1.5))
      p.arc(ex + 0.6, ey, 2.3, Math.PI * 0.2, Math.PI * 1.7, ink(1.5))
      p.circle(ex + 0.8, ey, 0.9, { fill: OUTLINE })
      return
    case 'star':
      star(p, ex, ey, 5.4, out(GOLD, 1.3))
      p.circle(ex + 1.2, ey - 1.4, 1, { fill: WHITE })
      return
    case 'heart':
      p.save()
      p.translate(ex, ey)
      p.rotate(Math.PI / 2)
      heart(p, 0, 0, 4.4, out('#ff4d6d', 1.3))
      p.restore()
      p.circle(ex - 1.4, ey - 1.8, 0.9, { fill: WHITE })
      return
    case 'sparkle':
      p.oval(ex, ey, 4.6, 5.8, 0, { fill: OUTLINE })
      p.arc(ex, ey + 0.8, 3.6, 0.15, Math.PI - 0.15, { fill: '#8a6bff' })
      p.circle(ex + 1.5, ey - 2.2, 2, { fill: WHITE })
      p.circle(ex - 1.9, ey - 2.9, 0.9, { fill: WHITE })
      p.circle(ex - 1.3, ey + 2.4, 1, { fill: WHITE })
      return
  }
  if (skin.eyesOnTop) p.circle(ex, ey, 5.6, out(WHITE, 2))
  p.oval(ex, ey, skin.eyesOnTop ? 3 : 3.8, skin.eyesOnTop ? 3.9 : 4.8, 0, { fill: OUTLINE })
  p.circle(ex + 1.3, ey - 1.8, 1.6, { fill: WHITE })
  p.circle(ex - 1.2, ey + 1.7, 0.8, { fill: WHITE })
}

function drawEyes(p: Painter, skin: Skin, a: Anim) {
  const ey = skin.eyesOnTop ? -15 : -3
  const canBlink = skin.eyes !== 'happy' && skin.eyes !== 'sleepy' && skin.eyes !== 'dizzy'
  for (const s of [-1, 1]) {
    const ex = s * 7
    if (a.squint) {
      p.poly([[ex - s * 3, ey - 3], [ex + s * 2, ey], [ex - s * 3, ey + 3]], false, ink(2.2))
    } else if (a.blinking && canBlink) {
      closedEye(p, ex, ey)
    } else {
      drawEye(p, skin, s, ex, ey)
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
    case 'samurai':
      // Topknot and a red headband with trailing ties.
      hairCap(p, color)
      p.rrect(-3, -31, 6, 9, 2.5, out(color, 1.8))
      p.circle(0, -31.5, 3.6, out(color, 1.8))
      p.rrect(-16.5, -17.5, 33, 4.2, 2, out('#e63946', 1.4))
      p.poly([[15, -16], [23, -12], [21, -9]], true, out('#e63946', 1.2))
      p.poly([[15, -15], [22, -6], [18, -5]], true, out('#e63946', 1.2))
      break
    case 'viking': {
      // Round metal helmet with a nose guard and big curved horns.
      const metal = '#b8c0cc'
      for (const s of [-1, 1]) {
        p.poly([[s * 14, -15], [s * 22, -20], [s * 26, -29], [s * 24, -36], [s * 21, -27], [s * 16, -21], [s * 12, -19]], true, out('#fff4dc', 1.8))
      }
      p.arc(0, -8, 17.8, Math.PI + 0.12, Math.PI * 2 - 0.12, out(metal))
      p.rrect(-17.5, -13, 35, 4.2, 2, out('#8a93a3', 1.6))
      for (const x of [-12, -6, 0, 6, 12]) p.circle(x, -10.9, 0.9, { fill: '#e9eef5' })
      p.rrect(-1.8, -12, 3.6, 8, 1.5, out('#8a93a3', 1.3))
      p.arc(0, -8, 14, Math.PI * 1.15, Math.PI * 1.45, { stroke: WHITE, width: 2, alpha: 0.6 })
      break
    }
    case 'pharaoh':
      // Striped cap, gold band and a little cobra on the brow.
      p.arc(0, -7, 17.5, Math.PI + 0.15, Math.PI * 2 - 0.15, out(GOLD))
      for (const x of [-10, -5, 0, 5, 10]) p.poly([[x, -21 + Math.abs(x) * 0.2], [x, -14]], false, { stroke: color, width: 2.2 })
      p.rrect(-17, -14.5, 34, 4.5, 2, out(color, 1.6))
      p.oval(0, -19, 2.2, 3.2, 0, out(GOLD, 1.2))
      p.circle(0, -19.5, 0.8, { fill: '#e63946' })
      break
    case 'shaggy':
      // Middle part with strands hanging down both sides of the face.
      for (const s of [-1, 1]) {
        p.poly(
          [
            [s * 0.5, -23.5], [s * 9, -22.5], [s * 15.5, -17], [s * 18.5, -7], [s * 19.5, 3], [s * 18, 11],
            [s * 15.5, 5], [s * 13.5, 9], [s * 12, -1], [s * 10.5, -11], [s * 6, -16], [s * 1, -17.5],
          ],
          true,
          out(color, 2),
        )
        p.poly([[s * 8, -20], [s * 14, -12], [s * 16, 0]], false, { stroke: WHITE, width: 1.2, alpha: 0.25 })
        p.poly([[s * 12, -15], [s * 15, -3]], false, ink(1, 0.35))
      }
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

  if (skin.photo && p.photo?.(0, -7, 14.9)) {
    p.circle(0, -7, 16, { stroke: WHITE, width: 1.6, alpha: 0.9 })
    p.circle(0, -7, 17.2, ink(2.2))
  } else if (skin.suit) {
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

  if (skin.extra === 'trickster') {
    // Gold horned helmet: long horns sweeping up and back, a band and a green gem.
    for (const s of [-1, 1]) {
      p.poly([[s * 5, -19], [s * 8, -29], [s * 13, -40], [s * 15, -37], [s * 13, -28], [s * 11, -19]], true, out(GOLD, 1.8))
    }
    p.poly([[-15, -14], [0, -20], [15, -14]], false, { stroke: OUTLINE, width: 5.5 })
    p.poly([[-15, -14], [0, -20], [15, -14]], false, { stroke: GOLD, width: 3.5 })
    p.circle(0, -19.5, 2.3, out('#2ecc71', 1))
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

/* ------------------------------------------------------ creator cosmetics */

/** Per body: top of the head, head radius, and where a neck / collar line sits (with its half width). */
const FRAME: Record<Shape, { top: number; r: number; neck: number; w: number }> = {
  human: { top: -23.5, r: 16, neck: 10, w: 11 },
  blob: { top: -19, r: 20, neck: 8, w: 13 },
  robot: { top: -18.5, r: 19, neck: 13, w: 14 },
  ghost: { top: -22, r: 19, neck: 8, w: 13 },
}

/** Hats are drawn with (0, 0) at the top of a 16-radius head and scaled to the real head. */
function drawHat(p: Painter, skin: Skin, shape: Shape, now: number) {
  const hat = skin.hat
  if (!hat || hat === 'none') return
  const f = FRAME[shape]
  const k = f.r / 16
  p.save()
  p.translate(0, f.top)
  p.scale(k, k)
  switch (hat) {
    case 'party':
      p.save()
      p.rotate(0.22)
      p.poly([[-7, 2], [0, -16], [7, 2]], true, out('#ff5fa2', 2))
      p.poly([[-4.3, -5], [4.3, -5]], false, { stroke: '#ffe066', width: 2 })
      p.poly([[-5.8, -1], [5.8, -1]], false, { stroke: '#5ec8ff', width: 2 })
      p.circle(0, -16.5, 2.8, out('#ffe066', 1.5))
      p.restore()
      break
    case 'bow':
      p.save()
      p.translate(9, 3)
      p.rotate(0.35)
      p.poly([[0, 0], [-7, -5], [-7, 5]], true, out('#ff4d8d', 1.8))
      p.poly([[0, 0], [7, -5], [7, 5]], true, out('#ff4d8d', 1.8))
      p.circle(0, 0, 2.3, out('#ff4d8d', 1.5))
      p.restore()
      break
    case 'flower':
      for (let i = 0; i < 5; i++) {
        const t = (i / 5) * Math.PI * 2
        p.circle(-9 + Math.cos(t) * 3.4, 3 + Math.sin(t) * 3.4, 2.9, out(WHITE, 1.3))
      }
      p.circle(-9, 3, 2.3, out(GOLD, 1.2))
      break
    case 'headphones':
      p.arc(0, 16, 18.5, Math.PI + 0.25, Math.PI * 2 - 0.25, { stroke: OUTLINE, width: 5.5 })
      p.arc(0, 16, 18.5, Math.PI + 0.25, Math.PI * 2 - 0.25, { stroke: '#4a5068', width: 3 })
      p.rrect(-22, 10, 6.5, 12, 3, out('#ff5d73', 2))
      p.rrect(15.5, 10, 6.5, 12, 3, out('#ff5d73', 2))
      break
    case 'propeller': {
      p.arc(0, 7, 10.5, Math.PI, Math.PI * 2, out('#4cb4ff', 2))
      p.arc(0, 7, 10.5, Math.PI * 1.35, Math.PI * 1.65, { fill: '#ffcf3f' })
      p.poly([[0, -3.5], [0, -6]], false, ink(2))
      const spin = Math.cos(now * 0.025)
      p.oval(spin * 5, -6.5, Math.abs(spin) * 5 + 0.8, 1.7, 0, out('#ff5d73', 1.3))
      p.oval(-spin * 5, -6.5, Math.abs(spin) * 5 + 0.8, 1.7, 0, out('#39e27f', 1.3))
      p.circle(0, -6.5, 1.5, out(GOLD, 1))
      break
    }
    case 'tophat':
      p.save()
      p.rotate(0.12)
      p.rrect(-8.5, -17, 17, 18, 2, out('#2a2438', 2))
      p.rrect(-8.5, -5, 17, 3.5, 0, { fill: '#e0262f' })
      p.rrect(-6.2, -15, 2.4, 8, 1.2, { fill: WHITE, alpha: 0.25 })
      p.oval(0, 1.5, 14, 3, 0, out('#2a2438', 2))
      p.restore()
      break
    case 'halo': {
      const y = -6 + Math.sin(now * 0.004) * 1.2
      p.glow(0, y, 15, 6, GOLD, 0.5)
      p.oval(0, y, 11, 3.2, 0, { stroke: OUTLINE, width: 5 })
      p.oval(0, y, 11, 3.2, 0, { stroke: '#ffe27a', width: 3 })
      break
    }
    case 'devil':
      for (const s of [-1, 1]) {
        p.poly([[s * 4, 4], [s * 6, -3], [s * 11, -11], [s * 12, -3], [s * 11, 4]], true, out('#e0262f', 1.8))
      }
      break
    case 'crown':
      p.poly([[-10, 3], [-11.5, -9], [-5, -3], [0, -12], [5, -3], [11.5, -9], [10, 3]], true, out(GOLD, 2))
      p.circle(-11.5, -9.5, 1.6, { fill: GOLD })
      p.circle(0, -12.5, 1.8, { fill: GOLD })
      p.circle(11.5, -9.5, 1.6, { fill: GOLD })
      p.circle(0, -1, 2.1, out('#e0262f', 1))
      p.circle(-6, 0, 1.5, { fill: '#4cb4ff' })
      p.circle(6, 0, 1.5, { fill: '#39e27f' })
      break
  }
  p.restore()
}

/** Capes and wings hang behind the body. */
function drawOutfitBack(p: Painter, skin: Skin, shape: Shape, now: number) {
  const f = FRAME[shape]
  if (skin.outfit === 'cape') {
    p.save()
    p.translate(0, f.neck - 8)
    const sway = Math.sin(now * 0.003) * 1.5
    p.poly([[-f.w, 0], [f.w, 0], [f.w + 10 + sway, 21], [0, 24], [-f.w - 10 + sway, 21]], true, out('#c1121f'))
    p.poly([[-f.w + 4, 3], [f.w - 4, 3], [f.w + 5 + sway, 19], [-f.w - 5 + sway, 19]], true, { fill: '#7a0a16', alpha: 0.6 })
    p.restore()
  } else if (skin.outfit === 'wings') {
    const flap = Math.sin(now * 0.006) * 0.12
    for (const s of [-1, 1]) {
      p.save()
      p.translate(s * (f.w + 2), f.neck - 12)
      p.scale(s, 1)
      p.rotate(-0.25 + flap)
      p.oval(8, -2, 10, 5.5, -0.5, out(WHITE, 2))
      p.oval(7, 4, 8.5, 4.5, -0.2, out('#eef4ff', 2))
      p.oval(5, 9, 6.5, 3.5, 0.2, out('#dfe9ff', 2))
      p.restore()
    }
  }
}

function drawOutfitFront(p: Painter, skin: Skin, shape: Shape) {
  const o = skin.outfit
  if (!o || o === 'none' || o === 'cape' || o === 'wings') return
  const { neck, w } = FRAME[shape]
  p.save()
  p.translate(0, neck)
  switch (o) {
    case 'scarf':
      p.rrect(w - 7, 1, 5, 10, 2, out('#e63946', 2))
      p.poly([[w - 7, 6], [w - 2, 6]], false, { stroke: '#ffe066', width: 1.5 })
      p.rrect(-w, -2.5, w * 2, 5.5, 2.7, out('#e63946', 2))
      p.poly([[-w + 3, 0.2], [w - 3, 0.2]], false, { stroke: '#ffe066', width: 1.3, alpha: 0.8 })
      break
    case 'bowtie':
      p.poly([[0, 0], [-7, -4.5], [-7, 4.5]], true, out('#ff4d8d', 1.8))
      p.poly([[0, 0], [7, -4.5], [7, 4.5]], true, out('#ff4d8d', 1.8))
      p.circle(0, 0, 2.3, out('#ff4d8d', 1.5))
      break
    case 'tie':
      p.poly([[-1.8, 1.5], [1.8, 1.5], [3.2, 8], [0, 10.5], [-3.2, 8]], true, out('#2f5fd0', 1.5))
      p.poly([[-2.8, -2], [2.8, -2], [1.8, 1.8], [-1.8, 1.8]], true, out('#2f5fd0', 1.5))
      p.poly([[-2.2, 5], [2.4, 3.6]], false, { stroke: '#ffe066', width: 1.2 })
      break
    case 'chain':
      p.poly([[-w + 2, -1.5], [0, 5], [w - 2, -1.5]], false, { stroke: OUTLINE, width: 4.2 })
      p.poly([[-w + 2, -1.5], [0, 5], [w - 2, -1.5]], false, { stroke: GOLD, width: 2.4 })
      p.circle(0, 8, 3.8, out(GOLD, 1.6))
      star(p, 0, 8.2, 2.4, { fill: '#fff3c4' })
      break
    case 'medal':
      p.poly([[-4.5, -2.5], [4.5, -2.5], [1.6, 5.5], [-1.6, 5.5]], true, out('#2f5fd0', 1.4))
      p.poly([[0, -2.5], [0, 5.5]], false, { stroke: '#e0262f', width: 2 })
      p.circle(0, 8.8, 4.2, out(GOLD, 1.6))
      star(p, 0, 9, 2.6, { fill: '#fff3c4' })
      break
  }
  p.restore()
}

function sparkleShape(p: Painter, x: number, y: number, s: number, style: Style) {
  p.poly(
    [[x, y - s * 2], [x + s * 0.45, y - s * 0.45], [x + s * 2, y], [x + s * 0.45, y + s * 0.45], [x, y + s * 2], [x - s * 0.45, y + s * 0.45], [x - s * 2, y], [x - s * 0.45, y - s * 0.45]],
    true,
    style,
  )
}

/** Animated effect around the whole character, behind everything else. */
function drawAura(p: Painter, skin: Skin, now: number) {
  switch (skin.aura) {
    case 'bubbles': {
      p.glow(0, 4, 34, 30, '#7ec8ff', 0.18)
      for (let i = 0; i < 10; i++) {
        const t = (now * 0.00055 + i / 10) % 1
        const sway = Math.sin(i * 2.4 + t * 5) * 8
        const x = sway + (i - 4.5) * 5.5
        const y = 22 - t * 52
        const r = 2.2 + (i % 4) * 0.9 + Math.sin(now * 0.008 + i) * 0.4
        const a = Math.min(1, (1 - t) * 1.4)
        p.circle(x, y, r, { stroke: '#b8e8ff', width: 1.6, alpha: a })
        p.circle(x - r * 0.35, y - r * 0.35, r * 0.28, { fill: '#ffffff', alpha: a * 0.7 })
      }
      break
    }
    case 'sparkle': {
      p.glow(0, 0, 36, 32, '#fff1a8', 0.32)
      p.glow(0, 0, 22, 20, '#ffffff', 0.12)
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * Math.PI * 2 + now * 0.0011
        const pulse = 1.2 + 0.9 * Math.sin(now * 0.007 + i * 1.7)
        const r = 28 + Math.sin(now * 0.004 + i) * 3
        sparkleShape(p, Math.cos(t) * r, Math.sin(t) * r * 0.85, Math.max(0.4, pulse), { fill: i % 2 ? '#fff6b0' : '#ffffff' })
      }
      break
    }
    case 'hearts': {
      p.glow(0, 2, 32, 28, '#ff7eb6', 0.22)
      for (let i = 0; i < 7; i++) {
        const t = (now * 0.0005 + i / 7) % 1
        const x = Math.sin(i * 2.1 + t * 3.5) * 9 + (i - 3) * 7
        p.save()
        p.translate(x, 20 - t * 50)
        p.rotate(Math.sin(now * 0.004 + i) * 0.35)
        const a = Math.min(1, (1 - t) * 1.7)
        heart(p, 0, 0, 3.6 + (i % 3) * 0.4, { fill: i % 2 ? '#ff5c8a' : '#ff9ec4', alpha: a })
        p.restore()
      }
      break
    }
    case 'stars': {
      p.glow(0, 0, 34, 30, '#ffcf3f', 0.2)
      for (let i = 0; i < 7; i++) {
        const t = now * 0.0014 + (i * Math.PI * 2) / 7
        const wobble = 1 + 0.08 * Math.sin(now * 0.006 + i)
        star(p, Math.cos(t) * 32 * wobble, Math.sin(t) * 14 * wobble + 2, 3.8, {
          fill: SPRINKLE_COLORS[i % SPRINKLE_COLORS.length],
          stroke: OUTLINE,
          width: 1,
        })
      }
      break
    }
    case 'flames': {
      p.glow(0, 8, 34, 28, '#ff7a1a', 0.42)
      p.glow(0, 10, 18, 14, '#ffd23f', 0.25)
      for (let i = 0; i < 9; i++) {
        const x = -26 + i * 6.5
        const h = 14 + 8 * Math.sin(now * 0.014 + i * 1.7)
        p.poly([[x - 5.5, 20], [x, 20 - h], [x + 5.5, 20]], true, { fill: '#ff4a12', alpha: 0.92 })
        p.poly([[x - 3, 20], [x, 20 - h * 0.62], [x + 3, 20]], true, { fill: '#ff9a1f', alpha: 0.95 })
        p.poly([[x - 1.4, 20], [x, 20 - h * 0.35], [x + 1.4, 20]], true, { fill: '#ffe66d' })
      }
      break
    }
    case 'rainbow': {
      p.glow(0, 2, 38, 34, '#b18cff', 0.28)
      RAINBOW.forEach((c, i) => {
        const a0 = now * 0.0022 + i * 0.45
        p.arc(0, 2, 24 + i * 2.6, a0, a0 + Math.PI * 1.45, { stroke: c, width: 2.8, alpha: 0.9 })
      })
      for (let i = 0; i < 5; i++) {
        const t = now * 0.001 + i * 1.2
        sparkleShape(p, Math.cos(t) * 34, Math.sin(t) * 18, 1.2, { fill: '#ffffff', alpha: 0.85 })
      }
      break
    }
    case 'orbit': {
      p.glow(0, 0, 36, 32, '#5cf2ff', 0.28)
      for (let i = 0; i < 5; i++) {
        const t = now * 0.002 + (i * Math.PI * 2) / 5
        const x = Math.cos(t) * 30
        const y = Math.sin(t) * 16
        const c = RAINBOW[i % RAINBOW.length]
        p.glow(x, y, 8, 8, c, 0.55)
        p.circle(x, y, 4.2, { fill: c })
        p.circle(x - 1.2, y - 1.4, 1.4, { fill: '#ffffff', alpha: 0.85 })
      }
      break
    }
    case 'lightning': {
      p.glow(0, 0, 36, 32, '#7ec8ff', 0.3)
      p.glow(0, 0, 20, 18, '#ffffff', 0.12)
      for (let i = 0; i < 4; i++) {
        const flash = Math.sin(now * 0.02 + i * 2.1)
        if (flash < 0.15) continue
        const a = ((i / 4) * Math.PI * 2 + now * 0.003) % (Math.PI * 2)
        const x0 = Math.cos(a) * 12
        const y0 = Math.sin(a) * 8
        const x1 = Math.cos(a) * 34
        const y1 = Math.sin(a) * 22
        const mid = 0.35 + 0.3 * Math.sin(now * 0.05 + i)
        const jx = (x0 + x1) * mid + Math.sin(now * 0.04 + i) * 6
        const jy = (y0 + y1) * mid + Math.cos(now * 0.04 + i) * 4
        const alpha = 0.55 + flash * 0.4
        p.poly(
          [
            [x0, y0],
            [jx, jy],
            [x1, y1],
          ],
          false,
          { stroke: '#eafcff', width: 2.4, alpha },
        )
        p.poly(
          [
            [x0, y0],
            [jx, jy],
            [x1, y1],
          ],
          false,
          { stroke: '#5cf2ff', width: 1.2, alpha },
        )
      }
      break
    }
    case 'petals': {
      p.glow(0, 2, 34, 30, '#ff9ec4', 0.2)
      for (let i = 0; i < 9; i++) {
        const t = (now * 0.0004 + i / 9) % 1
        const spin = now * 0.003 + i
        const x = Math.sin(i * 1.7 + t * 4) * 14 + (i - 4) * 4
        const y = 18 - t * 48
        p.save()
        p.translate(x, y)
        p.rotate(spin)
        p.oval(0, 0, 4.5, 2.2, 0, { fill: i % 2 ? '#ff7eb6' : '#ffc1d9', alpha: Math.min(1, (1 - t) * 1.5) })
        p.restore()
      }
      break
    }
    case 'snow': {
      p.glow(0, 0, 34, 30, '#bdefff', 0.22)
      for (let i = 0; i < 12; i++) {
        const t = (now * 0.00035 + i / 12) % 1
        const x = ((i * 17 + now * 0.02) % 56) - 28
        const y = -28 + t * 56
        const s = 1.6 + (i % 3) * 0.5
        const a = Math.min(1, t < 0.15 ? t / 0.15 : (1 - t) / 0.2)
        p.poly(
          [
            [x, y - s],
            [x, y + s],
            [x - s, y],
            [x + s, y],
            [x - s * 0.7, y - s * 0.7],
            [x + s * 0.7, y + s * 0.7],
            [x - s * 0.7, y + s * 0.7],
            [x + s * 0.7, y - s * 0.7],
          ],
          false,
          { stroke: '#ffffff', width: 1.3, alpha: a * 0.95 },
        )
      }
      break
    }
    case 'void': {
      p.glow(0, 0, 38, 34, '#7c5cff', 0.35)
      p.glow(0, 0, 18, 16, '#1b1f4b', 0.4)
      for (let i = 0; i < 4; i++) {
        const pulse = 22 + i * 5 + Math.sin(now * 0.005 + i) * 2
        const a = 0.55 - i * 0.1
        p.circle(0, 0, pulse, { stroke: i % 2 ? '#b18cff' : '#5c4dff', width: 2.2, alpha: a })
      }
      for (let i = 0; i < 6; i++) {
        const t = now * 0.0015 + (i * Math.PI * 2) / 6
        p.circle(Math.cos(t) * 30, Math.sin(t) * 18, 2.2, { fill: '#d4c4ff', alpha: 0.8 })
      }
      break
    }
    case 'neon': {
      const hues = ['#00f0ff', '#ff00c8', '#39e27f', '#ffcf3f']
      p.glow(0, 0, 36, 32, hues[Math.floor(now / 400) % hues.length], 0.35)
      for (let i = 0; i < 3; i++) {
        const beat = 0.5 + 0.5 * Math.sin(now * 0.008 + i)
        const r = 20 + i * 7 + beat * 2
        p.circle(0, 0, r, { stroke: hues[i], width: 2.6, alpha: 0.55 + beat * 0.35 })
      }
      for (let i = 0; i < 8; i++) {
        const t = now * 0.0025 + (i * Math.PI * 2) / 8
        p.circle(Math.cos(t) * 34, Math.sin(t) * 20, 1.8, { fill: hues[i % hues.length], alpha: 0.9 })
      }
      break
    }
    case 'rings': {
      p.glow(0, -4, 36, 28, '#ffcf3f', 0.38)
      p.glow(0, -6, 16, 12, '#fff3c4', 0.25)
      for (let i = 0; i < 3; i++) {
        const tilt = now * 0.0018 + i * 0.9
        const rx = 28 - i * 3
        const ry = 10 + i * 2
        const steps = 18
        const pts: [number, number][] = []
        for (let s = 0; s <= steps; s++) {
          const a = (s / steps) * Math.PI * 2 + tilt
          pts.push([Math.cos(a) * rx, Math.sin(a) * ry - 6 + i * 2])
        }
        p.poly(pts, false, { stroke: i === 0 ? '#ffd76a' : '#c9a227', width: 2.2 - i * 0.3, alpha: 0.9 - i * 0.15 })
      }
      sparkleShape(p, 0, -28 + Math.sin(now * 0.006) * 2, 2.2, { fill: '#fff6b0' })
      break
    }
  }
}

/** Body stays upright (with a little tilt) while the gun spins around it. */
export function drawCharacter(p: Painter, x: number, y: number, pose: Pose, skin: Skin, now: number) {
  const a = animate(pose, now)
  const gunBehind = Math.sin(pose.angle) < -0.25
  const shape = skin.shape ?? 'blob'

  p.save()
  p.translate(x, y)
  if (pose.color) p.glow(0, 2, 24, 22, pose.color, 0.35)
  if (skin.aura && skin.aura !== 'none') drawAura(p, skin, now)

  if (gunBehind) drawGun(p, pose, skin)

  p.save()
  p.translate(0, shape === 'ghost' ? a.bob * 2.5 - 2 : a.bob)
  p.rotate(a.tilt)
  p.scale(a.sx, a.sy)

  if (skin.outfit) drawOutfitBack(p, skin, shape, now)

  if (shape === 'human') drawHuman(p, skin, a)
  else if (shape === 'robot') drawRobot(p, skin, a)
  else if (shape === 'ghost') drawGhost(p, skin, a)
  else drawBlob(p, skin, a)

  if (skin.outfit) drawOutfitFront(p, skin, shape)
  if (skin.hat) drawHat(p, skin, shape, now)

  p.restore()

  if (!gunBehind) drawGun(p, pose, skin)

  p.restore()
}
