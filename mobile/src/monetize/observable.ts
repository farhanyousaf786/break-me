import { useSyncExternalStore } from 'react'

/** Minimal module-level state with a React hook, shared by the platform ads/purchases modules. */
export function observable<T extends object>(initial: T) {
  let value = initial
  const listeners = new Set<() => void>()
  const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }
  return {
    get: () => value,
    set(patch: Partial<T>) {
      value = { ...value, ...patch }
      listeners.forEach((l) => l())
    },
    use: () => useSyncExternalStore(subscribe, () => value),
  }
}
