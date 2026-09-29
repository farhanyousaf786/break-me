import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { Platform, Vibration } from 'react-native'

const KEY = 'breakme_vibration'

let enabled = true
void AsyncStorage.getItem(KEY).then((v) => {
  if (v === 'off') enabled = false
})

export const vibrationOn = () => enabled

export function setVibration(on: boolean) {
  enabled = on
  void AsyncStorage.setItem(KEY, on ? 'on' : 'off')
  if (on) buzz('break')
}

export type Buzz = 'shot' | 'hit' | 'break' | 'win' | 'lose' | 'power' | 'tick'

// Android haptic "impacts" are faint or silent on many phones, so Android drives the motor
// directly — always one short pulse (ms), never a pattern.
const ANDROID: Record<Buzz, number> = {
  tick: 8,
  shot: 12,
  power: 20,
  hit: 25,
  break: 35,
  win: 25,
  lose: 30,
}

const IOS: Record<Buzz, Haptics.ImpactFeedbackStyle> = {
  tick: Haptics.ImpactFeedbackStyle.Soft,
  shot: Haptics.ImpactFeedbackStyle.Light,
  power: Haptics.ImpactFeedbackStyle.Light,
  hit: Haptics.ImpactFeedbackStyle.Medium,
  break: Haptics.ImpactFeedbackStyle.Medium,
  win: Haptics.ImpactFeedbackStyle.Light,
  lose: Haptics.ImpactFeedbackStyle.Light,
}

/** Buzzes closer together than this merge into one, so the phone never double-taps. */
const MIN_GAP_MS = 180
let last = 0

/** Fire-and-forget; devices without a vibration motor just ignore it. */
export function buzz(kind: Buzz) {
  if (!enabled) return
  const now = Date.now()
  if (now - last < MIN_GAP_MS && kind !== 'break') return
  last = now
  if (Platform.OS === 'android') {
    Vibration.vibrate(ANDROID[kind])
    return
  }
  Haptics.impactAsync(IOS[kind]).catch(() => {})
}
