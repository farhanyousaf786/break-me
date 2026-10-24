import { AURAS_SHOP } from '../game/auras'
import { GUNS } from '../game/guns'
import { SKINS } from '../game/skins'

/**
 * Platform-neutral monetization settings: product catalog and ad pacing.
 * Store keys and ad unit IDs are per platform — see `android/keys.ts` and `ios/keys.ts`.
 *
 * Create matching one-time products in Play Console / App Store Connect, then import into
 * RevenueCat. Mark unlock packs + remove_ads + hero_* as non-consumable; coins_* as consumable.
 */

/** Full-screen ads between results: at most one per this many results, and this many seconds apart. */
export const INTERSTITIAL_EVERY = 3
export const INTERSTITIAL_GAP_S = 120

/** Optional "watch a video" rewards. */
export const VIDEO_COINS = 50
export const VIDEO_COINS_PER_DAY = 5

export type Grant = {
  coins?: number
  skins?: string[]
  guns?: string[]
  auras?: string[]
  noAds?: boolean
}

/**
 * Store products. `fallbackPrice` is only shown until the store returns the real, localized price.
 */
export type Product =
  | { id: string; kind: 'noAds'; title: string; fallbackPrice: string }
  | { id: string; kind: 'coins'; coins: number; title: string; fallbackPrice: string; tag?: string }
  | {
      id: string
      kind: 'unlock'
      title: string
      fallbackPrice: string
      tag?: string
      skins?: string[]
      guns?: string[]
      auras?: string[]
    }

export const NO_ADS: Product = { id: 'remove_ads', kind: 'noAds', title: 'Remove Ads', fallbackPrice: '$2.99' }

export const COIN_PACKS: Product[] = [
  { id: 'coins_500', kind: 'coins', coins: 500, title: 'Pouch of Coins', fallbackPrice: '$0.99' },
  { id: 'coins_1500', kind: 'coins', coins: 1500, title: 'Bag of Coins', fallbackPrice: '$2.99', tag: 'POPULAR' },
  { id: 'coins_4000', kind: 'coins', coins: 4000, title: 'Chest of Coins', fallbackPrice: '$6.99', tag: 'BEST VALUE' },
]

const ALL_SKIN_IDS = SKINS.map((s) => s.id)
const ALL_GUN_IDS = GUNS.map((g) => g.id)
const ALL_AURA_IDS = AURAS_SHOP.map((a) => a.id)
const HERO_IDS = SKINS.filter((s) => s.hero).map((s) => s.id)

/** $14.99 — every fighter (regular + premium). */
export const ALL_FIGHTERS: Product = {
  id: 'all_fighters',
  kind: 'unlock',
  skins: ALL_SKIN_IDS,
  title: 'All Fighters',
  fallbackPrice: '$14.99',
  tag: 'UNLOCK ALL',
}

/** $4.99 — every gun skin. */
export const ALL_GUNS: Product = {
  id: 'all_guns',
  kind: 'unlock',
  guns: ALL_GUN_IDS,
  title: 'All Guns',
  fallbackPrice: '$4.99',
  tag: 'UNLOCK ALL',
}

/** $4.99 — every aura. */
export const ALL_AURAS: Product = {
  id: 'all_auras',
  kind: 'unlock',
  auras: ALL_AURA_IDS,
  title: 'All Auras',
  fallbackPrice: '$4.99',
  tag: 'UNLOCK ALL',
}

/** $19.99 — every fighter + every gun. */
export const ALL_FIGHTERS_GUNS: Product = {
  id: 'all_fighters_guns',
  kind: 'unlock',
  skins: ALL_SKIN_IDS,
  guns: ALL_GUN_IDS,
  title: 'Fighters + Guns Bundle',
  fallbackPrice: '$19.99',
  tag: 'BEST DEAL',
}

export const UNLOCK_PACKS: Product[] = [ALL_FIGHTERS, ALL_GUNS, ALL_AURAS, ALL_FIGHTERS_GUNS]

/**
 * Legacy `hero_squad` — still granted on restore if someone bought it earlier.
 * Not offered in the shop anymore (use `all_fighters` instead). No per-hero SKUs.
 */
export const HERO_SQUAD: Product = {
  id: 'hero_squad',
  kind: 'unlock',
  skins: HERO_IDS,
  title: `Premium Pass — all ${HERO_IDS.length} heroes`,
  fallbackPrice: '$9.99',
}

/** Products the store queries / sells. Per-hero `hero_*` IDs are intentionally omitted. */
export const ALL_PRODUCTS: Product[] = [NO_ADS, ...COIN_PACKS, ...UNLOCK_PACKS, HERO_SQUAD]

/** Lookup for buy + restore. Unknown `hero_*` ids still grant that one skin (legacy purchases). */
export function productById(id: string): Product | undefined {
  const found = ALL_PRODUCTS.find((p) => p.id === id)
  if (found) return found
  if (id.startsWith('hero_')) {
    const skinId = id.slice('hero_'.length)
    if (SKINS.some((s) => s.id === skinId)) {
      return { id, kind: 'unlock', skins: [skinId], title: skinId, fallbackPrice: '$1.99' }
    }
  }
  return undefined
}

/** Shop scroll targets when opening from Characters / Guns / Auras. */
export type ShopFocus = 'earn' | 'ads' | 'unlocks' | 'coins'

/** What the wallet receives for a product. */
export function grantFor(product: Product): Grant {
  if (product.kind === 'coins') return { coins: product.coins }
  if (product.kind === 'noAds') return { noAds: true }
  return {
    skins: product.skins,
    guns: product.guns,
    auras: product.auras,
  }
}
