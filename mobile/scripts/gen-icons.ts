// Renders the app icon, Android adaptive icon layers, splash image and favicon from the game's own
// character art (character.ts), so the branding always matches the in-game Cosmo.
// Run: node --experimental-strip-types scripts/gen-icons.ts
import { Resvg } from '@resvg/resvg-js'
import { existsSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { OUTLINE, drawCharacter, type Painter, type Pose, type Style } from '../src/game/character.ts'
import { SKINS } from '../src/game/skins.ts'

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets')
const GOLD = '#ffcf3f'
const BLUE = '#5ec8ff'
const BG_TOP = '#3a2a86'
const BG = '#0c0b1d'

/** Painter that emits SVG. `mono` maps outlines to black and everything else to white (used as a mask). */
function svgPainter(mono = false) {
  const parts: string[] = []
  const open: number[] = [0]
  const defs = new Map<string, string>()

  const style = (s: Style) => {
    const tone = (c: string) => (mono ? (c === OUTLINE ? '#000' : '#fff') : c)
    const fill = s.fill ? tone(s.fill) : 'none'
    const stroke = s.stroke ? tone(s.stroke) : 'none'
    const a = s.alpha ?? 1
    if (mono && a < 0.9) return 'fill="none" stroke="none"'
    return `fill="${fill}" stroke="${stroke}" stroke-width="${s.width ?? 0}" stroke-linejoin="round" stroke-linecap="round" opacity="${a}"`
  }
  const push = (t: string) => {
    parts.push(`<g transform="${t}">`)
    open[open.length - 1]++
  }
  const deg = (r: number) => (r * 180) / Math.PI

  const p: Painter = {
    save: () => open.push(0),
    restore: () => {
      const n = open.pop() ?? 0
      for (let i = 0; i < n; i++) parts.push('</g>')
    },
    translate: (x, y) => push(`translate(${x} ${y})`),
    rotate: (r) => push(`rotate(${deg(r)})`),
    scale: (x, y) => push(`scale(${x} ${y})`),
    oval: (cx, cy, rx, ry, rot, s) =>
      parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${deg(rot)} ${cx} ${cy})" ${style(s)}/>`),
    circle: (cx, cy, r, s) => parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" ${style(s)}/>`),
    poly: (pts, closed, s) => {
      const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ') + (closed ? ' Z' : '')
      parts.push(`<path d="${d}" ${style(closed ? s : { ...s, fill: undefined })}/>`)
    },
    arc: (cx, cy, r, a0, a1, s) => {
      const x0 = cx + r * Math.cos(a0)
      const y0 = cy + r * Math.sin(a0)
      const x1 = cx + r * Math.cos(a1)
      const y1 = cy + r * Math.sin(a1)
      const large = a1 - a0 > Math.PI ? 1 : 0
      parts.push(`<path d="M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1}${s.fill ? ' Z' : ''}" ${style(s)}/>`)
    },
    rrect: (x, y, w, h, r, s) => parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${style(s)}/>`),
    glow: (cx, cy, rx, ry, color, alpha) => {
      if (mono) return
      const id = `glow${color.slice(1)}`
      defs.set(id, `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${alpha}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`)
      parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx * 1.5}" ry="${ry * 1.5}" fill="url(#${id})"/>`)
    },
  }
  return { p, parts, defs: () => [...defs.values()].join('') }
}

const skin = (id: string) => SKINS.find((s) => s.id === id)!

/** Four-point twinkle star. */
function sparkle(x: number, y: number, r: number, color: string) {
  const k = r * 0.28
  const d = `M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`
  return `<path d="${d}" fill="${color}"/>`
}

/**
 * Cosmo alone, centered on (cx, cy). `unit` is pixels per character unit. The whole figure
 * (antenna, feet and the raised gun) fits inside a circle of radius ~44 units around the center,
 * so pick `unit` = safe radius / 44 to guarantee nothing gets clipped.
 */
function hero(cx: number, cy: number, unit: number, { mono = false, planet = true } = {}) {
  const { p, parts, defs } = svgPainter(mono)
  const pose: Pose = { angle: 0.3, spin: 0, kick: 0, color: BLUE, seed: 5 }
  const u = unit
  p.save()
  // Body (antenna tip to feet) is centered on (cx, cy); the gun is allowed to stick out to the right.
  p.translate(cx, cy + 5 * u)
  p.scale(u, u)
  drawCharacter(p, 0, 0, pose, skin('cosmo'), 1000)
  p.restore()
  if (mono) return { defs: defs(), body: parts.join('') }

  const halo = `<circle cx="${cx}" cy="${cy - 1 * u}" r="${34 * u}" fill="url(#halo)"/>`
  const px = cx - 27 * u
  const py = cy - 24 * u
  const ring = planet
    ? `<circle cx="${px}" cy="${py}" r="${6.5 * u}" fill="url(#planet)" stroke="${OUTLINE}" stroke-width="${1.1 * u}"/>
       <ellipse cx="${px}" cy="${py}" rx="${11 * u}" ry="${2.8 * u}" transform="rotate(-20 ${px} ${py})" fill="none" stroke="${GOLD}" stroke-width="${1.3 * u}"/>`
    : ''
  const twinkles =
    sparkle(cx + 25 * u, cy - 25 * u, 4 * u, '#ffffff') +
    sparkle(cx - 33 * u, cy + 12 * u, 3 * u, GOLD) +
    sparkle(cx + 22 * u, cy + 30 * u, 2.4 * u, '#bfe6ff')
  return {
    defs:
      defs() +
      `<radialGradient id="halo"><stop offset="0" stop-color="#bfe6ff" stop-opacity="0.45"/><stop offset="0.6" stop-color="#5ec8ff" stop-opacity="0.15"/><stop offset="1" stop-color="#5ec8ff" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="planet" cx="0.35" cy="0.35" r="0.8"><stop offset="0" stop-color="#ffb3c7"/><stop offset="1" stop-color="#b2477a"/></radialGradient>`,
    body: halo + ring + twinkles + parts.join(''),
  }
}

function stars(size: number, count: number, seed = 3) {
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: count }, () => {
    const r = (0.6 + rnd() * 1.2) * (size / 1024)
    return `<circle cx="${rnd() * size}" cy="${rnd() * size}" r="${r * 2}" fill="#fff" opacity="${0.25 + rnd() * 0.6}"/>`
  }).join('')
}

function background(size: number) {
  return {
    defs: `<radialGradient id="bg" cx="0.5" cy="0.42" r="0.8"><stop offset="0" stop-color="${BG_TOP}"/><stop offset="1" stop-color="${BG}"/></radialGradient>
      <radialGradient id="tintB" cx="0.15" cy="0.7" r="0.6"><stop offset="0" stop-color="${BLUE}" stop-opacity="0.35"/><stop offset="1" stop-color="${BLUE}" stop-opacity="0"/></radialGradient>
      <radialGradient id="tintR" cx="0.85" cy="0.3" r="0.6"><stop offset="0" stop-color="#b18cff" stop-opacity="0.3"/><stop offset="1" stop-color="#b18cff" stop-opacity="0"/></radialGradient>`,
    body: `<rect width="${size}" height="${size}" fill="url(#bg)"/><rect width="${size}" height="${size}" fill="url(#tintB)"/><rect width="${size}" height="${size}" fill="url(#tintR)"/>${stars(size, 28)}`,
  }
}

function svg(w: number, h: number, defs: string, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`
}

const fontFiles = ['/System/Library/Fonts/Supplemental/Arial Black.ttf'].filter(existsSync)

function png(name: string, markup: string, width: number) {
  const out = new Resvg(markup, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles, loadSystemFonts: fontFiles.length === 0, defaultFontFamily: 'Arial Black' },
  }).render()
  writeFileSync(join(assets, name), out.asPng())
  console.log(`wrote ${name} (${out.width}×${out.height})`)
}

const S = 1024
/** Keep in sync with SPLASH_UNIT_DP in src/game/SplashIntro.tsx (= SPLASH_UNIT * 288 / 1024). */
const SPLASH_UNIT = 8.4

// iOS / store icon: full-bleed background + Cosmo.
{
  const bg = background(S)
  const d = hero(S / 2, S / 2, 12.4)
  png('icon.png', svg(S, S, bg.defs + d.defs, bg.body + d.body), 1024)
}

// Android adaptive: art must sit inside the centered 66% safe zone.
{
  const bg = background(S)
  png('android-icon-background.png', svg(S, S, bg.defs, bg.body), 1024)
  const d = hero(S / 2, S / 2, 8.3)
  png('android-icon-foreground.png', svg(S, S, d.defs, d.body), 1024)
  const m = hero(S / 2, S / 2, 8.3, { mono: true })
  png(
    'android-icon-monochrome.png',
    svg(S, S, `<mask id="mono">${m.body}</mask>`, `<rect width="${S}" height="${S}" fill="#fff" mask="url(#mono)"/>`),
    1024,
  )
}

// Native splash: Cosmo alone, posed and placed exactly like SkinPreview (origin offset (-8, +4),
// angle 0.25) so SplashIntro can pick him up seamlessly. Android 12+ shows this image at 288dp and
// masks it to the centered 192dp circle, so the figure must stay within radius 341px of the center.
{
  const { p, parts, defs } = svgPainter(false)
  const pose: Pose = { angle: 0.25, spin: 0, kick: 0, color: '', seed: 'cosmo'.length }
  p.save()
  p.translate(S / 2 - 8 * SPLASH_UNIT, S / 2 + 4 * SPLASH_UNIT)
  p.scale(SPLASH_UNIT, SPLASH_UNIT)
  drawCharacter(p, 0, 0, pose, skin('cosmo'), 1000)
  p.restore()
  png('splash-icon.png', svg(S, S, defs(), parts.join('')), 1024)
}

// Favicon
{
  const bg = background(S)
  const d = hero(S / 2, S / 2, 12.4)
  png('favicon.png', svg(S, S, bg.defs + d.defs, bg.body + d.body), 48)
}
