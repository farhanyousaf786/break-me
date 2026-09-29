import type { AuraKind, EarKind, ExtraKind, EyeKind, HairKind, HatKind, MouthKind, OutfitKind, Shape, Skin } from './skins'

/**
 * Character-creator options. A look is a list of indexes into these tables, encoded as a short
 * `c:` string (one base-36 digit per field) so it can travel as a normal skin id in online matches.
 * Only append to these lists and keep each under 36 entries — reordering would change how saved and
 * remote looks decode.
 */

export const LOOK_PREFIX = 'c:'

export const SHAPES: { id: Shape; label: string }[] = [
  { id: 'human', label: 'Kid' },
  { id: 'blob', label: 'Mochi' },
  { id: 'robot', label: 'Robot' },
  { id: 'ghost', label: 'Ghost' },
]

export const COLORS: { body: string; accent: string; belly: string }[] = [
  { body: '#3b82f6', accent: '#1e3a8a', belly: '#e0f0ff' },
  { body: '#ef4444', accent: '#991b1b', belly: '#fff0f0' },
  { body: '#22c55e', accent: '#166534', belly: '#eafff0' },
  { body: '#a855f7', accent: '#6b21a8', belly: '#f6ecff' },
  { body: '#f59e0b', accent: '#92400e', belly: '#fff6e0' },
  { body: '#ec4899', accent: '#9d174d', belly: '#fff0f7' },
  { body: '#1f2937', accent: '#4b5563', belly: '#e5e7eb' },
  { body: '#5ec8ff', accent: '#2a7fad', belly: '#fff4f6' },
  { body: '#ff6b7a', accent: '#c43a4a', belly: '#fff4f6' },
  { body: '#ffd166', accent: '#c9912a', belly: '#fffaf0' },
  { body: '#7ee0b8', accent: '#2f8f6a', belly: '#d8fff0' },
  { body: '#f4f4f5', accent: '#9ca3af', belly: '#ffffff' },
  // premium
  { body: '#ffc93c', accent: '#b8860b', belly: '#fff3c4' },
  { body: '#c9d3e0', accent: '#6b7a90', belly: '#f4f7fb' },
  { body: '#1b1f4b', accent: '#7c5cff', belly: '#cfd4ff' },
  { body: '#ff4d1a', accent: '#8a1c00', belly: '#ffd27a' },
  { body: '#b6ff3b', accent: '#4f8a00', belly: '#f0ffd6' },
  { body: '#f2a7a0', accent: '#b76e79', belly: '#fff0ec' },
]

export const TONES = ['#ffe3cc', '#ffd9b8', '#f1c9a5', '#e8b48a', '#c68a64', '#a86f4c', '#6b3e26', '#4a2a1a']

/** `null` = no hair. */
export const HAIRS: (HairKind | null)[] = [
  'spiky', 'bob', 'pigtails', 'messy', 'ponytail', 'long', 'bun', 'afro', 'mohawk', 'buzz',
  'hijab', 'cap', 'beanie', 'cowboy', 'bandana', 'wizard', 'crown', 'chef', 'helmet', null,
  // premium
  'shaggy', 'samurai', 'viking', 'pharaoh',
]

export const HAIR_COLORS = [
  '#1c1a24', '#3a2a1f', '#6b3f1d', '#a0522d', '#d9a441', '#f3e0a0', '#e0262f', '#ff7eb6', '#7c5cff', '#39e27f', '#5ec8ff', '#f4f4f5',
  // premium
  '#ffc93c', '#c0c7d2', '#00f0ff', '#ff00c8',
]

export const MOUTHS: MouthKind[] = ['smile', 'cat', 'fang', 'tongue', 'beak', 'snout', 'none']

export const EARS: EarKind[] = ['none', 'cat', 'fox', 'bunny', 'bear', 'mouse', 'dog', 'horns', 'frog', 'antenna', 'tuft', 'unicorn', 'owl']

export const EXTRAS: ExtraKind[] = [
  'none', 'glasses', 'shades', 'mustache', 'eyepatch', 'stitches', 'angry',
  'whiskers', 'spots', 'patches', 'stripes', 'mask', 'face', 'ninja',
]

/** Which extras each body can actually draw. */
export const EXTRAS_FOR: Record<Shape, ExtraKind[]> = {
  human: ['none', 'glasses', 'shades', 'mustache', 'eyepatch', 'stitches', 'angry'],
  blob: ['none', 'whiskers', 'spots', 'patches', 'stripes', 'mask', 'face', 'ninja'],
  ghost: ['none', 'whiskers'],
  robot: ['none'],
}

export const GLOWS = ['#5cf2ff', '#ff5cc8', '#39e27f', '#ffcf3f', '#ff4d6d', '#eafcff']

export const EYES: EyeKind[] = ['normal', 'happy', 'sleepy', 'wink', 'dizzy', 'star', 'heart', 'sparkle']

export const HATS: HatKind[] = ['none', 'party', 'bow', 'flower', 'headphones', 'propeller', 'tophat', 'halo', 'devil', 'crown']

export const OUTFITS: OutfitKind[] = ['none', 'scarf', 'bowtie', 'tie', 'chain', 'medal', 'cape', 'wings']

export const AURAS: AuraKind[] = ['none', 'bubbles', 'sparkle', 'hearts', 'stars', 'flames', 'rainbow']

export type Look = {
  shape: number
  color: number
  tone: number
  hair: number
  hairColor: number
  mouth: number
  ears: number
  extra: number
  glow: number
  eyes: number
  hat: number
  outfit: number
  aura: number
}

export const DEFAULT_LOOK: Look = {
  shape: 0, color: 0, tone: 1, hair: 0, hairColor: 2, mouth: 0, ears: 0, extra: 0, glow: 0,
  eyes: 0, hat: 0, outfit: 0, aura: 0,
}

const FIELDS: (keyof Look)[] = ['shape', 'color', 'tone', 'hair', 'hairColor', 'mouth', 'ears', 'extra', 'glow', 'eyes', 'hat', 'outfit', 'aura']
const SIZES: Record<keyof Look, number> = {
  shape: SHAPES.length,
  color: COLORS.length,
  tone: TONES.length,
  hair: HAIRS.length,
  hairColor: HAIR_COLORS.length,
  mouth: MOUTHS.length,
  ears: EARS.length,
  extra: EXTRAS.length,
  glow: GLOWS.length,
  eyes: EYES.length,
  hat: HATS.length,
  outfit: OUTFITS.length,
  aura: AURAS.length,
}

/* ---------------------------------------------------------------- premium */

/** Coin price of each premium option, by field and index. Everything else is free. */
export const LOOK_PRICES: Partial<Record<keyof Look, Record<number, number>>> = {
  color: { 12: 150, 13: 150, 14: 150, 15: 150, 16: 150, 17: 150 },
  hairColor: { 12: 100, 13: 100, 14: 100, 15: 100 },
  hair: { 20: 250, 21: 250, 22: 300, 23: 300 },
  eyes: { 5: 200, 6: 200, 7: 250 },
  hat: { 5: 200, 6: 250, 7: 300, 8: 300, 9: 400 },
  outfit: { 4: 250, 5: 250, 6: 350, 7: 450 },
  aura: { 2: 300, 3: 300, 4: 400, 5: 400, 6: 500 },
}

export const lookItemKey = (field: keyof Look, index: number) => `${field}:${index}`

export const lookItemPrice = (field: keyof Look, index: number) => LOOK_PRICES[field]?.[index] ?? 0

export type LookItem = { field: keyof Look; index: number; key: string; price: number }

/** Premium options the look is wearing that `owned` doesn't include. */
export function lockedItems(look: Look, owned: readonly string[]): LookItem[] {
  const out: LookItem[] = []
  for (const field of FIELDS) {
    const index = look[field]
    const price = lookItemPrice(field, index)
    const key = lookItemKey(field, index)
    if (price > 0 && !owned.includes(key)) out.push({ field, index, key, price })
  }
  return out
}

/* --------------------------------------------------------------- encoding */

const clampIndex = (field: keyof Look, v: number) => (Number.isInteger(v) && v >= 0 && v < SIZES[field] ? v : DEFAULT_LOOK[field])

export function sanitizeLook(raw: Partial<Record<keyof Look, unknown>>): Look {
  const look = { ...DEFAULT_LOOK }
  for (const f of FIELDS) look[f] = clampIndex(f, Number(raw[f]))
  return look
}

export const encodeLook = (look: Look) => LOOK_PREFIX + FIELDS.map((f) => look[f].toString(36)).join('')

export function decodeLook(code: string): Look {
  const body = code.startsWith(LOOK_PREFIX) ? code.slice(LOOK_PREFIX.length) : ''
  const raw: Partial<Record<keyof Look, number>> = {}
  FIELDS.forEach((f, i) => {
    raw[f] = parseInt(body[i] ?? '', 36)
  })
  return sanitizeLook(raw)
}

export function lookToSkin(look: Look, id: string, name: string): Skin {
  const shape = SHAPES[look.shape].id
  const color = COLORS[look.color]
  const tone = TONES[look.tone]
  const extra = EXTRAS[look.extra]
  return {
    id,
    name,
    shape,
    body: color.body,
    accent: color.accent,
    belly: shape === 'human' ? tone : color.belly,
    skinTone: tone,
    hair: HAIRS[look.hair] ?? undefined,
    hairColor: HAIR_COLORS[look.hairColor],
    ears: shape === 'blob' ? EARS[look.ears] : 'none',
    mouth: shape === 'robot' ? 'none' : MOUTHS[look.mouth],
    extra: EXTRAS_FOR[shape].includes(extra) ? extra : 'none',
    glow: GLOWS[look.glow],
    eyes: shape === 'robot' ? 'normal' : EYES[look.eyes],
    hat: HATS[look.hat],
    outfit: OUTFITS[look.outfit],
    aura: AURAS[look.aura],
  }
}

/** `canUse` filters out premium options the player hasn't unlocked. */
export function randomLook(canUse: (field: keyof Look, index: number) => boolean = () => true): Look {
  const r = (n: number) => Math.floor(Math.random() * n)
  const pick = (field: keyof Look, n: number, chance = 1) => {
    if (Math.random() > chance) return 0
    const i = r(n)
    return canUse(field, i) ? i : DEFAULT_LOOK[field]
  }
  const shape = Math.random() < 0.6 ? 0 : r(SHAPES.length)
  const extras = EXTRAS_FOR[SHAPES[shape].id]
  return {
    shape,
    color: pick('color', COLORS.length),
    tone: r(TONES.length),
    hair: pick('hair', HAIRS.length),
    hairColor: pick('hairColor', HAIR_COLORS.length),
    mouth: r(MOUTHS.length - 1),
    ears: r(EARS.length),
    extra: Math.random() < 0.5 ? 0 : EXTRAS.indexOf(extras[r(extras.length)]),
    glow: r(GLOWS.length),
    eyes: pick('eyes', EYES.length, 0.5),
    hat: pick('hat', HATS.length, 0.4),
    outfit: pick('outfit', OUTFITS.length, 0.4),
    aura: pick('aura', AURAS.length, 0.25),
  }
}
