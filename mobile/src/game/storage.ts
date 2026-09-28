import AsyncStorage from '@react-native-async-storage/async-storage'
import { LEVELS } from './levels'

const UNLOCK_KEY = 'breakme_unlocked'
const MAX_LEVEL = LEVELS.length

function clamp(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(MAX_LEVEL, Math.floor(n))
}

export async function loadUnlocked(): Promise<number> {
  try {
    return clamp(Number((await AsyncStorage.getItem(UNLOCK_KEY)) ?? '1'))
  } catch {
    return 1
  }
}

export async function unlockAfterWin(clearedId: number, current: number): Promise<number> {
  const next = Math.max(current, clamp(clearedId + 1))
  try {
    await AsyncStorage.setItem(UNLOCK_KEY, String(next))
  } catch {
    // Progress still applies for this session if persisting fails.
  }
  return next
}
