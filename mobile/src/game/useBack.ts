import { useEffect, useRef } from 'react'
import { BackHandler } from 'react-native'

/**
 * Android back button / swipe-back gesture. The newest listener runs first, so a screen's handler
 * beats the app-level one. Return `false` to let Android handle it (leave the app).
 */
export function useBack(handler: () => boolean | void, enabled = true) {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    if (!enabled) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => ref.current() !== false)
    return () => sub.remove()
  }, [enabled])
}
