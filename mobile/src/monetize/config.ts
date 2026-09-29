import { SKINS } from '../game/skins'

/**
 * Platform-neutral monetization settings: product catalog and ad pacing.
 * Store keys and ad unit IDs are per platform — see `android/keys.ts` and `ios/keys.ts`.
 */

/** Full-screen ads between results: at most one per this many results, and this many seconds apart. */
export const INTERSTITIAL_EVERY = 3
export const INTERSTITIAL_GAP_S = 120

/** Optional "watch a video" rewards. */
export const VIDEO_COINS = 25
export const VIDEO_COINS_PER_DAY = 5

/**
 * Store products. Create each one with the same ID in Google Play Console / App Store Connect,
 * then import them into RevenueCat. `fallbackPrice` is only shown until the store returns the
 * real, localized price.
 */
export type Product =
  | { id: string; kind: 'noAds'; title: string; fallbackPrice: string }
  | { id: string; kind: 'coins'; coins: number; title: string; fallbackPrice: string; tag?: string }
  | { id: string; kind: 'skins'; skins: string[]; title: string; fallbackPrice: string; tag?: string }

export const NO_ADS: Product = { id: 'remove_ads', kind: 'noAds', title: 'Remove Ads', fallbackPrice: '$2.99' }

export const COIN_PACKS: Product[] = [
  { id: 'coins_500', kind: 'coins', coins: 500, title: 'Pouch of Coins', fallbackPrice: '$0.99' },
  { id: 'coins_1500', kind: 'coins', coins: 1500, title: 'Bag of Coins', fallbackPrice: '$2.99', tag: 'POPULAR' },
  { id: 'coins_4000', kind: 'coins', coins: 4000, title: 'Chest of Coins', fallbackPrice: '$6.99', tag: 'BEST VALUE' },
]

const HERO_IDS = SKINS.filter((s) => s.hero).map((s) => s.id)

export const HERO_SQUAD: Product = {
  id: 'hero_squad',
  kind: 'skins',
  skins: HERO_IDS,
  title: `Premium Pass — all ${HERO_IDS.length} fighters`,
  fallbackPrice: '$6.99',
  tag: 'SAVE 55%',
}

export const HERO_PRODUCTS: Product[] = HERO_IDS.map((id) => ({
  id: `hero_${id}`,
  kind: 'skins',
  skins: [id],
  title: SKINS.find((s) => s.id === id)?.name ?? id,
  fallbackPrice: '$1.99',
}))

export const ALL_PRODUCTS: Product[] = [NO_ADS, ...COIN_PACKS, HERO_SQUAD, ...HERO_PRODUCTS]

export const heroProduct = (skinId: string) => HERO_PRODUCTS.find((p) => p.kind === 'skins' && p.skins[0] === skinId)

export const productById = (id: string) => ALL_PRODUCTS.find((p) => p.id === id)

/** What the wallet receives for a product. */
export function grantFor(product: Product) {
  if (product.kind === 'coins') return { coins: product.coins }
  if (product.kind === 'skins') return { skins: product.skins }
  return { noAds: true }
}
