import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, onlineConfigured } from './firebase'

export type Player = {
  uid: string
  name: string
  kind: 'guest' | 'google'
  photoURL: string | null
}

const GUEST_NAME_KEY = 'breakme_guest_name'
let guestName = `Player ${1000 + Math.floor(Math.random() * 9000)}`

/** Guests keep the same "Player 1234" name across launches. */
async function loadGuestName(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(GUEST_NAME_KEY)
    if (saved) guestName = saved
    else await AsyncStorage.setItem(GUEST_NAME_KEY, guestName)
  } catch {
    // Keep the in-memory name.
  }
}

function toPlayer(user: User | null): Player | null {
  if (!user) return null
  if (user.isAnonymous) return { uid: user.uid, name: guestName, kind: 'guest', photoURL: null }
  const google = user.providerData.find((p) => p.providerId === 'google.com')
  return {
    uid: user.uid,
    name: user.displayName ?? google?.displayName ?? user.email ?? 'Player',
    kind: 'google',
    photoURL: user.photoURL ?? google?.photoURL ?? null,
  }
}

const listeners = new Set<(p: Player | null) => void>()
const emit = () => {
  const p = toPlayer(auth().currentUser)
  listeners.forEach((l) => l(p))
}

export function watchPlayer(cb: (p: Player | null) => void): () => void {
  if (!onlineConfigured) {
    cb(null)
    return () => {}
  }
  listeners.add(cb)
  let unsub = () => {}
  void loadGuestName().then(() => {
    if (!listeners.has(cb)) return
    unsub = onAuthStateChanged(auth(), (u) => cb(toPlayer(u)))
  })
  return () => {
    listeners.delete(cb)
    unsub()
  }
}

/**
 * Google sign-in via the native SDK, then into Firebase. A guest who signs in keeps the same
 * account (the guest is upgraded) unless that Google account was already used on another device.
 * Returns false if the player closed the Google sheet.
 */
export async function signInWithGoogle(): Promise<boolean> {
  let mod: typeof import('@react-native-google-signin/google-signin')
  try {
    mod = await import('@react-native-google-signin/google-signin')
  } catch {
    throw new Error('Google sign-in needs a fresh app build (npx expo run:ios / run:android).')
  }
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = mod

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  if (!webClientId) throw new Error('Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env.local.')
  GoogleSignin.configure({ webClientId })

  let idToken: string | null
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const res = await GoogleSignin.signIn()
    if (!isSuccessResponse(res)) return false
    idToken = res.data.idToken
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.IN_PROGRESS) return false
    throw new Error('Google sign-in failed. Please try again.')
  }
  if (!idToken) throw new Error('Google did not return an ID token — check the web client ID.')

  const credential = GoogleAuthProvider.credential(idToken)
  const current = auth().currentUser
  if (current?.isAnonymous) {
    try {
      await linkWithCredential(current, credential)
      await current.reload()
      emit()
      return true
    } catch (e) {
      const code = (e as { code?: string }).code
      if (code !== 'auth/credential-already-in-use' && code !== 'auth/email-already-in-use') throw e
    }
  }
  await signInWithCredential(auth(), credential)
  return true
}

export async function signOutPlayer(): Promise<void> {
  const wasGoogle = toPlayer(auth().currentUser)?.kind === 'google'
  await signOut(auth())
  if (wasGoogle) {
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin')
      await GoogleSignin.signOut()
    } catch {
      // Firebase session is already cleared.
    }
  }
}
