import AsyncStorage from '@react-native-async-storage/async-storage'
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, getReactNativePersistence, initializeAuth, signInAnonymously, type Auth } from 'firebase/auth'
import { getDatabase, type Database } from 'firebase/database'

// Values come from mobile/.env.local (see .env.example). Expo inlines EXPO_PUBLIC_* at build time,
// so each variable must be referenced literally.
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

export const onlineConfigured = Boolean(config.apiKey && config.databaseURL && config.projectId)

let app: FirebaseApp | null = null
let authInstance: Auth | null = null

function firebaseApp(): FirebaseApp {
  if (!app) app = getApps().length ? getApp() : initializeApp(config)
  return app
}

/** Auth with the session saved in AsyncStorage, so players stay signed in between launches. */
export function auth(): Auth {
  if (!authInstance) {
    try {
      authInstance = initializeAuth(firebaseApp(), { persistence: getReactNativePersistence(AsyncStorage) })
    } catch {
      // Already initialized (e.g. after a fast refresh).
      authInstance = getAuth(firebaseApp())
    }
  }
  return authInstance
}

export function db(): Database {
  return getDatabase(firebaseApp())
}

/** Current player id; falls back to a guest session if nobody has signed in yet. */
export async function signIn(): Promise<string> {
  const a = auth()
  if (a.currentUser) return a.currentUser.uid
  const cred = await signInAnonymously(a)
  return cred.user.uid
}
