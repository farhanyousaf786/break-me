import { StyleSheet, Text, View } from 'react-native'
import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  MaxAdContentRating,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads'
import { getWallet, useWallet } from '../../game/wallet'
import { INTERSTITIAL_EVERY, INTERSTITIAL_GAP_S } from '../config'
import { observable } from '../observable'
import type { AdsModule, AdsState } from '../types'
import { AD_UNIT } from './keys'

/** Google AdMob on iOS. */

const store = observable<AdsState>({ ready: false, rewardedReady: false, privacyOptions: false })

let interstitial: InterstitialAd | null = null
let interstitialLoaded = false
let rewarded: RewardedAd | null = null
let resultsSinceAd = 0
// Counting app start as the last ad keeps the first couple of minutes ad-free.
let lastAdAt = Date.now()
let started = false

async function initAds() {
  if (started) return
  started = true
  let canRequestAds = true
  try {
    // UMP consent form (EEA/UK). Configure it once in AdMob → Privacy & messaging.
    const info = await AdsConsent.gatherConsent()
    canRequestAds = info.canRequestAds
    store.set({
      privacyOptions: info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
    })
  } catch {
    // No consent message configured yet (or offline): fall back to whatever consent was stored before.
    try {
      canRequestAds = (await AdsConsent.getConsentInfo()).canRequestAds
    } catch {
      canRequestAds = true
    }
  }
  if (!canRequestAds) return
  try {
    // Cute cartoon game: keep ad content family-friendly.
    await mobileAds().setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.PG })
    await mobileAds().initialize()
  } catch {
    return
  }
  store.set({ ready: true })
  loadInterstitial()
  loadRewarded()
}

async function openPrivacyOptions() {
  try {
    await AdsConsent.showPrivacyOptionsForm()
  } catch {
    // Form unavailable; nothing to show.
  }
}

const retry = (load: () => void) => setTimeout(load, 30_000)

function loadInterstitial() {
  if (!interstitial) {
    const ad = InterstitialAd.createForAdRequest(AD_UNIT.interstitial)
    ad.addAdEventListener(AdEventType.LOADED, () => {
      interstitialLoaded = true
    })
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      interstitialLoaded = false
      ad.load()
    })
    ad.addAdEventListener(AdEventType.ERROR, () => {
      interstitialLoaded = false
      retry(() => ad.load())
    })
    interstitial = ad
  }
  interstitial.load()
}

function loadRewarded() {
  if (!rewarded) {
    const ad = RewardedAd.createForAdRequest(AD_UNIT.rewarded)
    ad.addAdEventListener(RewardedAdEventType.LOADED, () => store.set({ rewardedReady: true }))
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      store.set({ rewardedReady: false })
      ad.load()
    })
    ad.addAdEventListener(AdEventType.ERROR, () => {
      store.set({ rewardedReady: false })
      retry(() => ad.load())
    })
    rewarded = ad
  }
  rewarded.load()
}

function noteResult() {
  resultsSinceAd += 1
}

function maybeShowInterstitial(): Promise<void> {
  const ad = interstitial
  if (!store.get().ready || !ad || !interstitialLoaded || getWallet().noAds) return Promise.resolve()
  if (resultsSinceAd < INTERSTITIAL_EVERY || Date.now() - lastAdAt < INTERSTITIAL_GAP_S * 1000) return Promise.resolve()
  return new Promise((resolve) => {
    const off = ad.addAdEventListener(AdEventType.CLOSED, () => {
      off()
      resolve()
    })
    resultsSinceAd = 0
    lastAdAt = Date.now()
    ad.show().catch(() => {
      off()
      resolve()
    })
  })
}

function showRewarded(): Promise<boolean> {
  const ad = rewarded
  const { ready, rewardedReady } = store.get()
  if (!ready || !ad || !rewardedReady) return Promise.resolve(false)
  return new Promise((resolve) => {
    let earned = false
    const offEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true
    })
    const offClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      offEarned()
      offClosed()
      // A video just played; don't follow it with a forced one.
      lastAdAt = Date.now()
      resolve(earned)
    })
    ad.show().catch(() => {
      offEarned()
      offClosed()
      resolve(false)
    })
  })
}

/** Small 320×50 strip under menu screens; renders nothing for Remove Ads buyers or before consent. */
function AdBanner() {
  const { ready } = store.use()
  const { noAds } = useWallet()
  if (!ready || noAds) return null
  return (
    <View style={styles.banner}>
      <BannerAd unitId={AD_UNIT.banner} size={BannerAdSize.BANNER} />
    </View>
  )
}

/** 300×250 rectangle on game-over screens, kept apart from the buttons to avoid accidental taps. */
function AdRect() {
  const { ready } = store.use()
  const { noAds } = useWallet()
  if (!ready || noAds) return null
  return (
    <View style={styles.rect}>
      <Text style={styles.rectLabel}>ADVERTISEMENT</Text>
      <BannerAd unitId={AD_UNIT.rect} size={BannerAdSize.MEDIUM_RECTANGLE} />
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
  },
  rect: {
    alignItems: 'center',
    gap: 4,
    marginTop: 18,
  },
  rectLabel: {
    color: 'rgba(241, 243, 250, 0.45)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
})

export const iosAds: AdsModule = {
  useAds: store.use,
  initAds,
  openPrivacyOptions,
  noteResult,
  maybeShowInterstitial,
  showRewarded,
  AdBanner,
  AdRect,
}
