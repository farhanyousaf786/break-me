import { Platform } from 'react-native'
import { androidAds } from './android/ads'
import { iosAds } from './ios/ads'
import type { AdsModule } from './types'

/** The game imports ads from here; each platform's logic lives in its own folder. */
const ads: AdsModule = Platform.OS === 'ios' ? iosAds : androidAds

export const { useAds, initAds, openPrivacyOptions, noteResult, maybeShowInterstitial, showRewarded, AdBanner, AdRect } = ads
