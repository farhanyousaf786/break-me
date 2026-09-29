import { TestIds } from 'react-native-google-mobile-ads'

/**
 * Android-only store settings.
 *
 * AdMob → Apps → Break Buddies (Android) → Ad units. Paste the real unit IDs below
 * (format `ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN`). While a slot is empty, or in dev builds,
 * Google's test ads are used — never tap your own live ads, AdMob bans accounts for it.
 *
 * The AdMob *app* ID (`ca-app-pub-…~…`) goes in app.json, in both places it appears
 * (`androidAppId` in the plugin and `android_app_id` at the bottom).
 */
const LIVE_UNITS = {
  /** Small strip under the menus (320×50) */
  banner: '',
  /** Game-over rectangle (300×250). Can reuse the banner unit, but its own unit gives clearer reports. */
  rect: '',
  interstitial: '',
  rewarded: '',
}

const pick = (real: string, test: string) => (__DEV__ || !real ? test : real)

export const AD_UNIT = {
  banner: pick(LIVE_UNITS.banner, TestIds.BANNER),
  rect: pick(LIVE_UNITS.rect || LIVE_UNITS.banner, TestIds.BANNER),
  interstitial: pick(LIVE_UNITS.interstitial, TestIds.INTERSTITIAL),
  rewarded: pick(LIVE_UNITS.rewarded, TestIds.REWARDED),
}

/** RevenueCat → Project → API keys → Google Play app (starts with `goog_`). Set in `.env.local`. */
export const REVENUECAT_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? ''
