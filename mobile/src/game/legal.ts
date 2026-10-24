/** Hosted legal pages for Play Console + first-launch consent. */

const DEFAULT_PRIVACY = 'https://www.switchtofuture.com/break-buddies/privacy-policy'
const DEFAULT_TERMS = 'https://www.switchtofuture.com/break-buddies/terms'

export const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() || DEFAULT_PRIVACY
export const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL?.trim() || DEFAULT_TERMS

/** Minimum age for Break Buddies (matches Play target audience / Terms). */
export const MIN_AGE = 13
