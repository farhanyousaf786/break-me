import type { Persistence, ReactNativeAsyncStorage } from 'firebase/auth'

// Metro resolves firebase/auth to its React Native build, which exports this; the published
// types only describe the browser build.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence
}
