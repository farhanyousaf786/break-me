/** Masked hero heads: full web mask, or a cowl (bat ears / star + wings / lightning wings). */
export type Suit = 'web' | 'bat' | 'cap' | 'zip'
export type Shape = 'blob' | 'human' | 'robot' | 'ghost'
export type EarKind = 'none' | 'cat' | 'fox' | 'horns' | 'bunny' | 'bear' | 'frog' | 'tuft' | 'antenna' | 'mouse' | 'dog' | 'unicorn' | 'owl'
export type HairKind = 'spiky' | 'bob' | 'pigtails' | 'messy' | 'bandana' | 'helmet' | 'wizard' | 'crown' | 'mohawk' | 'ponytail' | 'afro' | 'cap' | 'long' | 'bun' | 'cowboy' | 'beanie' | 'chef' | 'hijab' | 'buzz'
export type MouthKind = 'none' | 'cat' | 'fang' | 'smile' | 'beak' | 'snout' | 'tongue'
export type ExtraKind = 'none' | 'whiskers' | 'patches' | 'spots' | 'eyepatch' | 'stitches' | 'ninja' | 'stripes' | 'mask' | 'face' | 'glasses' | 'shades' | 'mustache' | 'titan' | 'tiara' | 'angry'

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
  /** Premium superhero-style character */
  hero?: boolean
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
  { id: 'titan', name: 'Titan', hero: true, shape: 'human', body: '#d9a92b', accent: '#2f4fa8', belly: '#9b6bd1', skinTone: '#9b6bd1', glove: '#ffcf3f', ears: 'none', mouth: 'smile', extra: 'titan' },
  { id: 'ironbot', name: 'Ironbot', hero: true, shape: 'robot', body: '#d7263d', accent: '#8a1022', belly: '#f2c14e', glow: '#eafcff', visor: '#f2c14e', ears: 'none', mouth: 'none', extra: 'none' },
  { id: 'captain', name: 'Captain Star', hero: true, shape: 'human', suit: 'cap', body: '#2f5fd0', accent: '#c8263a', belly: '#f1c9a5', skinTone: '#f1c9a5', hairColor: '#2f5fd0', ears: 'none', mouth: 'smile', extra: 'none' },
  { id: 'smash', name: 'Smash', hero: true, shape: 'human', body: '#7b3fb0', accent: '#4a1f70', belly: '#6fcf4a', skinTone: '#6fcf4a', hair: 'messy', hairColor: '#1f1a2e', ears: 'none', mouth: 'fang', extra: 'angry' },
  { id: 'starla', name: 'Starla', hero: true, shape: 'human', body: '#d6263f', accent: '#1f4fb8', belly: '#e8b48a', skinTone: '#e8b48a', hair: 'long', hairColor: '#1c1a24', ears: 'none', mouth: 'smile', extra: 'tiara' },
  { id: 'zippy', name: 'Zippy', hero: true, shape: 'human', suit: 'zip', body: '#e0262f', accent: '#ffcf3f', belly: '#f1c9a5', skinTone: '#f1c9a5', hairColor: '#e0262f', ears: 'none', mouth: 'smile', extra: 'none' },
  { id: 'slimey', name: 'Slimey', shape: 'ghost', body: '#a8f06a', accent: '#5fae2e', belly: '#e9ffd6', ears: 'none', mouth: 'fang', extra: 'none' },
]

export const DEFAULT_SKINS = { blue: 'cosmo', red: 'nova' } as const

export type SkinChoice = { blue: string; red: string }

export function getSkin(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0]
}
