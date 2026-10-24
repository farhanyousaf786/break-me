import type { AuraKind, Skin } from './skins'

/**
 * Equippable auras — same idea as guns: buy once, equip on any fighter.
 * `id` matches `AuraKind` / look.ts `AURAS` so creator looks and the locker stay in sync.
 */

export type AuraTier = 'free' | 'common' | 'rare' | 'epic' | 'legendary' | 'premium'

export type AuraDef = {
  id: AuraKind
  name: string
  price: number
  tier: AuraTier
  blurb: string
}

export const AURA_TIER: Record<AuraTier, { label: string; color: string }> = {
  free: { label: 'Free', color: '#9aa3b8' },
  common: { label: 'Common', color: '#46d27e' },
  rare: { label: 'Rare', color: '#4cb4ff' },
  epic: { label: 'Epic', color: '#b18cff' },
  legendary: { label: 'Legendary', color: '#ffcf3f' },
  premium: { label: 'Premium', color: '#ff5fa2' },
}

export const DEFAULT_AURA: AuraKind = 'none'

/** Starter auras every player owns — never locked. */
export const FREE_AURAS: AuraKind[] = ['none', 'bubbles', 'sparkle']

export const AURAS_SHOP: AuraDef[] = [
  { id: 'none', name: 'No Aura', price: 0, tier: 'free', blurb: 'Clean look — no glow.' },
  { id: 'bubbles', name: 'Bubble Float', price: 0, tier: 'free', blurb: 'Soft bubbles drift up around you.' },
  { id: 'sparkle', name: 'Sparkle Ring', price: 0, tier: 'free', blurb: 'Twinkling stars orbit your buddy.' },
  { id: 'hearts', name: 'Heart Storm', price: 150, tier: 'common', blurb: 'Cute hearts float skyward.' },
  { id: 'stars', name: 'Star Orbit', price: 200, tier: 'rare', blurb: 'Colorful stars spin around you.' },
  { id: 'flames', name: 'Flame Trail', price: 280, tier: 'rare', blurb: 'Hot flames lick at your feet.' },
  { id: 'rainbow', name: 'Rainbow Arc', price: 350, tier: 'epic', blurb: 'A spinning rainbow wraps you.' },
  { id: 'orbit', name: 'Plasma Orbs', price: 420, tier: 'epic', blurb: 'Glowing orbs circle your body.' },
  { id: 'lightning', name: 'Storm Zap', price: 500, tier: 'epic', blurb: 'Crackling bolts flash around you.' },
  { id: 'petals', name: 'Cherry Petals', price: 380, tier: 'rare', blurb: 'Pink petals swirl in the breeze.' },
  { id: 'snow', name: 'Frost Flurry', price: 320, tier: 'rare', blurb: 'Soft snowflakes fall around you.' },
  { id: 'void', name: 'Void Ripple', price: 700, tier: 'legendary', blurb: 'Dark rings pulse from your core.' },
  { id: 'neon', name: 'Neon Pulse', price: 900, tier: 'legendary', blurb: 'Electric neon rings thump with life.' },
  { id: 'rings', name: 'Golden Halo', price: 1200, tier: 'premium', blurb: 'Shimmering gold rings crown you.' },
]

export const getAura = (id: string | undefined) => AURAS_SHOP.find((a) => a.id === id) ?? AURAS_SHOP[0]

export const isAuraId = (id: unknown): id is AuraKind =>
  typeof id === 'string' && AURAS_SHOP.some((a) => a.id === id)

/** Overlay an equipped locker aura onto any fighter skin. */
export function withAura(skin: Skin, aura: AuraKind | undefined): Skin {
  if (!aura) return skin
  return { ...skin, aura }
}
