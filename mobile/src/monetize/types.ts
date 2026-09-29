import type { ComponentType } from 'react'
import type { Product } from './config'

/** Contract every platform's ads module implements (`android/ads.tsx`, `ios/ads.tsx`). */
export type AdsState = { ready: boolean; rewardedReady: boolean; privacyOptions: boolean }

export type AdsModule = {
  useAds(): AdsState
  /** Consent first, then the SDK. Safe to call more than once. */
  initAds(): Promise<void>
  openPrivacyOptions(): Promise<void>
  /** Call once per finished match / level. */
  noteResult(): void
  /** Resolves when the ad is closed, or right away when none is due. */
  maybeShowInterstitial(): Promise<void>
  /** Resolves true only if the player watched to the end. */
  showRewarded(): Promise<boolean>
  /** Small banner for menus */
  AdBanner: ComponentType
  /** Medium rectangle for game-over screens */
  AdRect: ComponentType
}

/**
 * - `ready`: store connected.
 * - `test`: dev build without a store key — purchases are simulated so the flow can be tried.
 * - `off`: release build without a key, or the store failed to load.
 */
export type StoreStatus = 'loading' | 'ready' | 'test' | 'off'
export type StoreState = { status: StoreStatus; prices: Record<string, string> }

/** `pending`: paid with a slow method (Play cash/bank payment, Ask to Buy); granted when it clears. */
export type BuyResult = 'ok' | 'cancelled' | 'pending' | 'unavailable' | 'error'

/** Contract every platform's purchases module implements (`android/purchases.ts`, `ios/purchases.ts`). */
export type PurchasesModule = {
  useStore(): StoreState
  initPurchases(): Promise<void>
  buy(product: Product): Promise<BuyResult>
  /** Restores heroes and Remove Ads. Coin packs are consumed on purchase, so they aren't restorable. */
  restore(): Promise<BuyResult>
}
