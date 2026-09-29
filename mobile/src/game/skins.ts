import { DEFAULT_LOOK, LOOK_PREFIX, decodeLook, lookToSkin } from './look'
/** Masked hero heads: full web mask, or a cowl (bat ears / star + wings / lightning wings). */
export type Suit = 'web' | 'bat' | 'cap' | 'zip'
export type Shape = 'blob' | 'human' | 'robot' | 'ghost'
export type EarKind = 'none' | 'cat' | 'fox' | 'horns' | 'bunny' | 'bear' | 'frog' | 'tuft' | 'antenna' | 'mouse' | 'dog' | 'unicorn' | 'owl'
export type HairKind = 'spiky' | 'bob' | 'pigtails' | 'messy' | 'bandana' | 'helmet' | 'wizard' | 'crown' | 'mohawk' | 'ponytail' | 'afro' | 'cap' | 'long' | 'bun' | 'cowboy' | 'beanie' | 'chef' | 'hijab' | 'buzz' | 'shaggy' | 'samurai' | 'viking' | 'pharaoh'
export type MouthKind = 'none' | 'cat' | 'fang' | 'smile' | 'beak' | 'snout' | 'tongue'
export type ExtraKind = 'none' | 'whiskers' | 'patches' | 'spots' | 'eyepatch' | 'stitches' | 'ninja' | 'stripes' | 'mask' | 'face' | 'glasses' | 'shades' | 'mustache' | 'titan' | 'tiara' | 'angry' | 'soldier' | 'trickster' | 'jester' | 'venom'

/** Creator-only cosmetics. */
export type EyeKind = 'normal' | 'happy' | 'sleepy' | 'wink' | 'dizzy' | 'star' | 'heart' | 'sparkle'
export type HatKind = 'none' | 'party' | 'bow' | 'flower' | 'headphones' | 'propeller' | 'tophat' | 'halo' | 'devil' | 'crown'
export type OutfitKind = 'none' | 'scarf' | 'bowtie' | 'tie' | 'chain' | 'medal' | 'cape' | 'wings'
export type AuraKind = 'none' | 'bubbles' | 'sparkle' | 'hearts' | 'stars' | 'flames' | 'rainbow'

export type PremiumGroup = 'heroes' | 'villains' | 'legends'

export const PREMIUM_GROUPS: { id: PremiumGroup; title: string; blurb: string; color: string }[] = [
  { id: 'heroes', title: 'HERO SQUAD', blurb: 'Masks, capes, gauntlets and metal arms.', color: '#ffcf3f' },
  { id: 'villains', title: 'VILLAINS', blurb: 'Big grins, bigger horns and gooey bad guys.', color: '#ff4d6d' },
  { id: 'legends', title: 'LEGENDS', blurb: 'Warriors and rulers from long, long ago.', color: '#4cc9f0' },
]

export type Skin = {
  id: string
  name: string
  /** Body shape — defaults to the round "mochi" blob */
  shape?: Shape
  /** Main color (blob body, human shirt, robot plating) */
  body: string
  accent: string
  belly: string
  earColor?: string
  ears: EarKind
  mouth: MouthKind
  extra: ExtraKind
  /** Frog-style eyes sit up on bumps with white sclera */
  eyesOnTop?: boolean
  /** Humans / ninja mask */
  skinTone?: string
  hair?: HairKind
  /** Hair, bandana or ninja headband color */
  hairColor?: string
  /** Robot LED eye color */
  glow?: string
  /** Robot face screen color */
  visor?: string
  suit?: Suit
  cape?: string
  /** Gun-hand glove color */
  glove?: string
  /** Premium character (bought with coins or real money) */
  hero?: boolean
  /** Premium category; premium skins without one are heroes */
  group?: PremiumGroup
  /** Head shows the player's own photo when the painter has one */
  photo?: boolean
  eyes?: EyeKind
  hat?: HatKind
  outfit?: OutfitKind
  aura?: AuraKind
}

export const SKINS: Skin[] = [
  { id: 'kitty', name: 'Kitty', body: '#5ec8ff', accent: '#2a7fad', belly: '#fff4f6', ears: 'cat', mouth: 'cat', extra: 'whiskers' },
  { id: 'imp', name: 'Imp', body: '#ff6b7a', accent: '#c43a4a', belly: '#fff4f6', ears: 'horns', mouth: 'fang', extra: 'none' },
  { id: 'max', name: 'Max', shape: 'human', body: '#3b82f6', accent: '#1e3a8a', belly: '#ffd9b8', skinTone: '#ffd9b8', hair: 'spiky', hairColor: '#6b3f1d', ears: 'none', mouth: 'smile', extra: 'none' },
  { id: 'luna', name: 'Luna', shape: 'human', body: '#a855f7', accent: '#6b21a8', belly: '#ffe3cc', skinTone: '#ffe3cc', hair: 'pigtails', hairColor: '#ff7eb6', ears: 'none', mouth: 'cat', extra: 'none' },
  { id: 'bolt', name: 'Bolt', shape: 'robot', body: '#c9d4e3', accent: '#6b7a90', belly: '#e9eef5', glow: '#5cf2ff', ears: 'none', mouth: 'none', extra: 'none' },
  { id: 'mecha', name: 'Mecha', shape: 'robot', body: '#ff8a3d', accent: '#b34d12', belly: '#ffd2b0', glow: '#fff35c', ears: 'none', mouth: 'none', extra: 'none' },
  { id: 'nova', name: 'Nova', shape: 'human', body: '#ff6b7a', accent: '#8a1f2c', belly: '#f1c9a5', skinTone: '#f1c9a5', hair: 'helmet', hairColor: '#2b1a12', ears: 'none', mouth: 'cat', extra: 'none' },
  { id: 'jack', name: 'Pirate Jack', shape: 'human', body: '#1f2937', accent: '#3f1d0b', belly: '#e8b48a', skinTone: '#e8b48a', hair: 'bandana', hairColor: '#e11d48', ears: 'none', mouth: 'fang', extra: 'eyepatch' },
  { id: 'cosmo', name: 'Cosmo', shape: 'human', body: '#e5e9f0', accent: '#8a94a6', belly: '#ffd2ad', skinTone: '#ffd2ad', hair: 'helmet', hairColor: '#7c5a3a', ears: 'none', mouth: 'smile', extra: 'none' },
  { id: 'zed', name: 'Zombie Zed', shape: 'human', body: '#6b8f71', accent: '#374151', belly: '#9ad08a', skinTone: '#9ad08a', hair: 'messy', hairColor: '#3b2f2f', ears: 'none', mouth: 'fang', extra: 'stitches' },
  { id: 'kage', name: 'Ninja Kage', body: '#2b2d42', accent: '#1a1b2b', belly: '#2b2d42', skinTone: '#ffd9b8', hairColor: '#e63946', ears: 'none', mouth: 'none', extra: 'ninja' },
  { id: 'boo', name: 'Boo', shape: 'ghost', body: '#f4f1ff', accent: '#b9b0e0', belly: '#ffffff', ears: 'none', mouth: 'tongue', extra: 'none' },
  { id: 'bunny', name: 'Bunny', body: '#ffb3d1', accent: '#e0709e', belly: '#ffffff', ears: 'bunny', mouth: 'cat', extra: 'none' },
  { id: 'bear', name: 'Bear', body: '#c8905e', accent: '#8a5a34', belly: '#f3dcc0', ears: 'bear', mouth: 'snout', extra: 'none' },
  { id: 'frog', name: 'Froggy', body: '#7ed957', accent: '#3f9a2e', belly: '#e9ffd6', ears: 'frog', mouth: 'tongue', extra: 'spots', eyesOnTop: true },
  { id: 'chick', name: 'Chick', body: '#ffd84d', accent: '#e0a21a', belly: '#fff7d1', ears: 'tuft', mouth: 'beak', extra: 'none' },
  { id: 'panda', name: 'Panda', body: '#f4f4f6', accent: '#2b2b36', belly: '#ffffff', earColor: '#2b2b36', ears: 'bear', mouth: 'smile', extra: 'patches' },
  { id: 'alien', name: 'Alien', body: '#b18cff', accent: '#6b46c8', belly: '#efe6ff', ears: 'antenna', mouth: 'smile', extra: 'none' },
  { id: 'fox', name: 'Foxy', body: '#ff9f43', accent: '#c2621c', belly: '#ffffff', ears: 'fox', mouth: 'cat', extra: 'none' },
  { id: 'tiger', name: 'Tigo', body: '#ffa53d', accent: '#5a2e0e', belly: '#fff4e6', ears: 'cat', mouth: 'cat', extra: 'stripes' },
  { id: 'mouse', name: 'Squeaks', body: '#b8bccb', accent: '#7d8296', belly: '#f3f4f8', ears: 'mouse', mouth: 'cat', extra: 'whiskers' },
  { id: 'pup', name: 'Pup', body: '#e8c08f', accent: '#8a5a34', belly: '#fff6ea', ears: 'dog', mouth: 'tongue', extra: 'none' },
  { id: 'raccoon', name: 'Bandit', body: '#a3a9b7', accent: '#3a3a48', belly: '#eef0f4', earColor: '#7a8090', ears: 'cat', mouth: 'smile', extra: 'mask' },
  { id: 'unicorn', name: 'Sparkle', body: '#fbf3ff', accent: '#c9a6ff', belly: '#ffffff', ears: 'unicorn', mouth: 'smile', extra: 'none' },
  { id: 'dragon', name: 'Drako', body: '#3ecf8e', accent: '#1f7a50', belly: '#e3ffd9', ears: 'horns', mouth: 'fang', extra: 'spots' },
  { id: 'penguin', name: 'Waddles', body: '#34416a', accent: '#ff9f1c', belly: '#ffffff', ears: 'none', mouth: 'beak', extra: 'face' },
  { id: 'owl', name: 'Hoot', body: '#b07a52', accent: '#6b4428', belly: '#f3dcc0', ears: 'owl', mouth: 'beak', extra: 'face' },
  { id: 'wiz', name: 'Wizzy', shape: 'human', body: '#4c3fb8', accent: '#2a2270', belly: '#ffd9b8', skinTone: '#ffd9b8', hair: 'wizard', hairColor: '#5b4ad6', ears: 'none', mouth: 'smile', extra: 'none' },
  { id: 'king', name: 'King Kiko', shape: 'human', body: '#d6263f', accent: '#7a1020', belly: '#f1c9a5', skinTone: '#f1c9a5', hair: 'crown', hairColor: '#3b2a1e', ears: 'none', mouth: 'smile', extra: 'none' },
  { id: 'mia', name: 'Mia', shape: 'human', body: '#ff6fa8', accent: '#b8326b', belly: '#ffe0c7', skinTone: '#ffe0c7', hair: 'ponytail', hairColor: '#8b4a1f', ears: 'none', mouth: 'smile', extra: 'none' },
  { id: 'jay', name: 'Jay', shape: 'human', body: '#ffc93c', accent: '#b8860b', belly: '#8d5524', skinTone: '#8d5524', hair: 'afro', hairColor: '#4a2f1b', ears: 'none', mouth: 'smile', extra: 'none' },
  { id: 'sam', name: 'Sam', shape: 'human', body: '#22c55e', accent: '#166534', belly: '#e0ac69', skinTone: '#e0ac69', hair: 'cap', hairColor: '#ef4444', ears: 'none', mouth: 'tongue', extra: 'none' },
  { id: 'aria', name: 'Aria', shape: 'human', body: '#14b8a6', accent: '#0f5f58', belly: '#f1c27d', skinTone: '#f1c27d', hair: 'long', hairColor: '#1c1a24', ears: 'none', mouth: 'cat', extra: 'none' },
  { id: 'nora', name: 'Nora', shape: 'human', body: '#8b5cf6', accent: '#4c1d95', belly: '#d9a066', skinTone: '#d9a066', hair: 'hijab', hairColor: '#c4b5fd', ears: 'none', mouth: 'smile', extra: 'none' },
  { id: 'tex', name: 'Tex', shape: 'human', body: '#3b6ea5', accent: '#5a3a1e', belly: '#f1c27d', skinTone: '#f1c27d', hair: 'cowboy', hairColor: '#9a6334', ears: 'none', mouth: 'smile', extra: 'mustache' },
  { id: 'pepe', name: 'Chef Pepe', shape: 'human', body: '#f5f5f5', accent: '#2b2b36', belly: '#ffd9b8', skinTone: '#ffd9b8', hair: 'chef', hairColor: '#3b2a1e', ears: 'none', mouth: 'smile', extra: 'mustache' },
  { id: 'kai', name: 'Kai', shape: 'human', body: '#1e293b', accent: '#0f172a', belly: '#c68642', skinTone: '#c68642', hair: 'beanie', hairColor: '#f97316', ears: 'none', mouth: 'smile', extra: 'shades' },
  { id: 'doc', name: 'Doc', shape: 'human', body: '#e8eef5', accent: '#64748b', belly: '#f3d2b3', skinTone: '#f3d2b3', hair: 'buzz', hairColor: '#b8bcc6', ears: 'none', mouth: 'smile', extra: 'glasses' },
  { id: 'maya', name: 'Maya', shape: 'human', body: '#f59e0b', accent: '#92400e', belly: '#6b3e26', skinTone: '#6b3e26', hair: 'bun', hairColor: '#120b08', ears: 'none', mouth: 'cat', extra: 'glasses' },
  { id: 'rox', name: 'Rox', shape: 'human', body: '#1f2937', accent: '#374151', belly: '#c68a64', skinTone: '#c68a64', hair: 'mohawk', hairColor: '#39e27f', ears: 'none', mouth: 'fang', extra: 'none' },
  { id: 'chip', name: 'Chip', shape: 'robot', body: '#7ee0b8', accent: '#2f8f6a', belly: '#d8fff0', glow: '#ff5cc8', ears: 'none', mouth: 'none', extra: 'none' },
  { id: 'webby', name: 'Webby', hero: true, shape: 'human', suit: 'web', body: '#e23a3a', accent: '#1f4fb8', belly: '#e23a3a', skinTone: '#e23a3a', ears: 'none', mouth: 'none', extra: 'none' },
  { id: 'batty', name: 'Batty', hero: true, shape: 'human', suit: 'bat', body: '#4a4f60', accent: '#1b1d27', belly: '#f1c9a5', skinTone: '#f1c9a5', hairColor: '#1b1d27', cape: '#1b1d27', ears: 'none', mouth: 'smile', extra: 'none' },
  { id: 'titan', name: 'Titan', hero: true, group: 'villains', shape: 'human', body: '#d9a92b', accent: '#2f4fa8', belly: '#9b6bd1', skinTone: '#9b6bd1', glove: '#ffcf3f', ears: 'none', mouth: 'smile', extra: 'titan' },
  { id: 'ironbot', name: 'Ironbot', hero: true, shape: 'robot', body: '#d7263d', accent: '#8a1022', belly: '#f2c14e', glow: '#eafcff', visor: '#f2c14e', ears: 'none', mouth: 'none', extra: 'none' },
  { id: 'captain', name: 'Captain Star', hero: true, shape: 'human', suit: 'cap', body: '#2f5fd0', accent: '#c8263a', belly: '#f1c9a5', skinTone: '#f1c9a5', hairColor: '#2f5fd0', ears: 'none', mouth: 'smile', extra: 'none' },
  { id: 'smash', name: 'Smash', hero: true, shape: 'human', body: '#7b3fb0', accent: '#4a1f70', belly: '#6fcf4a', skinTone: '#6fcf4a', hair: 'messy', hairColor: '#1f1a2e', ears: 'none', mouth: 'fang', extra: 'angry' },
  { id: 'starla', name: 'Starla', hero: true, shape: 'human', body: '#d6263f', accent: '#1f4fb8', belly: '#e8b48a', skinTone: '#e8b48a', hair: 'long', hairColor: '#1c1a24', ears: 'none', mouth: 'smile', extra: 'tiara' },
  { id: 'zippy', name: 'Zippy', hero: true, shape: 'human', suit: 'zip', body: '#e0262f', accent: '#ffcf3f', belly: '#f1c9a5', skinTone: '#f1c9a5', hairColor: '#e0262f', ears: 'none', mouth: 'smile', extra: 'none' },
  { id: 'bucky', name: 'Bucky', hero: true, shape: 'human', body: '#2d3340', accent: '#161a22', belly: '#f1c9a5', skinTone: '#f1c9a5', hair: 'shaggy', hairColor: '#3a2a20', glove: '#c3cad6', ears: 'none', mouth: 'none', extra: 'soldier' },
  { id: 'jester', name: 'Jester', hero: true, group: 'villains', shape: 'human', body: '#6b2fa0', accent: '#2b1640', belly: '#f4f4f6', skinTone: '#f4f4f6', hair: 'messy', hairColor: '#3fbf4a', ears: 'none', mouth: 'none', extra: 'jester' },
  { id: 'goo', name: 'Goo', hero: true, group: 'villains', body: '#1b1b28', accent: '#0b0b12', belly: '#1b1b28', ears: 'none', mouth: 'fang', extra: 'venom' },
  { id: 'trickster', name: 'Trickster', hero: true, group: 'villains', shape: 'human', body: '#1f7a3a', accent: '#c9a227', belly: '#f1d3b8', skinTone: '#f1d3b8', hair: 'long', hairColor: '#15121a', cape: '#145a2a', ears: 'none', mouth: 'smile', extra: 'trickster' },
  { id: 'darklord', name: 'Dark Lord', hero: true, group: 'villains', shape: 'robot', body: '#262a36', accent: '#0b0c12', belly: '#262a36', glow: '#ff2d3d', visor: '#0b0c12', ears: 'none', mouth: 'none', extra: 'none' },
  { id: 'samurai', name: 'Samurai', hero: true, group: 'legends', shape: 'human', body: '#b91c1c', accent: '#1f1f2e', belly: '#f1c9a5', skinTone: '#f1c9a5', hair: 'samurai', hairColor: '#15121a', ears: 'none', mouth: 'smile', extra: 'angry' },
  { id: 'viking', name: 'Viking', hero: true, group: 'legends', shape: 'human', body: '#8b5a2b', accent: '#4a3020', belly: '#f3c9a5', skinTone: '#f3c9a5', hair: 'viking', hairColor: '#e8772e', ears: 'none', mouth: 'smile', extra: 'mustache' },
  { id: 'pharaoh', name: 'Pharaoh', hero: true, group: 'legends', shape: 'human', body: '#f5f0e1', accent: '#c9a227', belly: '#c68642', skinTone: '#c68642', hair: 'pharaoh', hairColor: '#1d4ed8', ears: 'none', mouth: 'smile', extra: 'none' },
  { id: 'slimey', name: 'Slimey', shape: 'ghost', body: '#a8f06a', accent: '#5fae2e', belly: '#e9ffd6', ears: 'none', mouth: 'fang', extra: 'none' },
]

export const premiumGroup = (skin: Skin): PremiumGroup => skin.group ?? 'heroes'

export const DEFAULT_SKINS = { blue: 'cosmo', red: 'nova' } as const

export type SkinChoice = { blue: string; red: string }

/** The CPU picks its own fighter: any character (premium ones too), never the same as the player's. */
export function randomRival(exclude: string, previous?: string): string {
  const pool = SKINS.filter((s) => s.id !== exclude && s.id !== previous)
  return pool[Math.floor(Math.random() * pool.length)].id
}

/**
 * "Me!" — the player's own creation (character creator, optional photo face). Kept out of SKINS so
 * it never shows up in random pools. Online it travels as its look code (`c:…`, see look.ts); the
 * photo never leaves the phone.
 */
export const ME_ID = 'me'

let me: Skin = { ...lookToSkin(DEFAULT_LOOK, ME_ID, 'Me!') }

export function setMySkin(skin: Skin) {
  me = { ...skin, id: ME_ID }
}

const lookCache = new Map<string, Skin>()

export function getSkin(id: string): Skin {
  if (id === ME_ID) return me
  if (id.startsWith(LOOK_PREFIX)) {
    let skin = lookCache.get(id)
    if (!skin) {
      skin = lookToSkin(decodeLook(id), id, 'Buddy')
      lookCache.set(id, skin)
    }
    return skin
  }
  return SKINS.find((s) => s.id === id) ?? SKINS[0]
}

export const isKnownSkin = (id: string) => id === ME_ID || SKINS.some((s) => s.id === id)

/** How another player's pick is shown here: their creation, never their photo. */
export const remoteSkin = (id: string) => (id === ME_ID ? 'max' : id)
