import { TestIds } from 'react-native-google-mobile-ads'

/**
 * Android-only AdMob settings.
 *
 * Live unit IDs below are used only in release builds (`!__DEV__`). Dev / Metro always uses
 * Google's TestIds so you never tap your own live ads (AdMob bans accounts for that).
 *
 * The AdMob *app* ID (`ca-app-pub-…~…`) lives in app.json (`androidAppId` + `android_app_id`).
 * Changing it needs a new native build (`npx expo run:android` or EAS), not a Metro reload.
 */
const LIVE_UNITS = {
  /** Strip under menus (320×50) */
  banner: 'ca-app-pub-1690469075436631/7547831769',
  /**
   * Game-over medium rectangle (300×250). No separate rect unit yet — reuse banner.
   * Create a dedicated MEDIUM_RECTANGLE unit in AdMob later for clearer reports.
   */
  rect: 'ca-app-pub-1690469075436631/7547831769',
  interstitial: 'ca-app-pub-1690469075436631/4402793673',
  rewarded: 'ca-app-pub-1690469075436631/3959232704',
  /** Reserved — not shown in the game yet */
  rewardedInterstitial: 'ca-app-pub-1690469075436631/2869598034',
  native: 'ca-app-pub-1690469075436631/2646151033',
  appOpen: 'ca-app-pub-1690469075436631/5308681235',
}

/** Release → live ID; debug or empty → Google test ID. */
const pick = (real: string, test: string) => (__DEV__ || !real ? test : real)

export const AD_UNIT = {
  banner: pick(LIVE_UNITS.banner, TestIds.BANNER),
  rect: pick(LIVE_UNITS.rect || LIVE_UNITS.banner, TestIds.BANNER),
  interstitial: pick(LIVE_UNITS.interstitial, TestIds.INTERSTITIAL),
  rewarded: pick(LIVE_UNITS.rewarded, TestIds.REWARDED),
  rewardedInterstitial: pick(LIVE_UNITS.rewardedInterstitial, TestIds.REWARDED_INTERSTITIAL),
  native: pick(LIVE_UNITS.native, TestIds.NATIVE),
  appOpen: pick(LIVE_UNITS.appOpen, TestIds.APP_OPEN),
}

/** RevenueCat → Project → API keys → Google Play app (starts with `goog_`). Set in `.env.local`. */
export const REVENUECAT_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? ''
