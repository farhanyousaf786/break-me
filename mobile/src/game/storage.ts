import AsyncStorage from '@react-native-async-storage/async-storage'
import { LEVELS } from './levels'
import { DEFAULT_SKINS, isKnownSkin, type SkinChoice } from './skins'

const UNLOCK_KEY = 'breakme_unlocked'
// One past the last level means every level has been cleared.
const MAX_UNLOCK = LEVELS.length + 1

function clamp(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(MAX_UNLOCK, Math.floor(n))
}

export async function loadUnlocked(): Promise<number> {
  try {
    return clamp(Number((await AsyncStorage.getItem(UNLOCK_KEY)) ?? '1'))
  } catch {
    return 1
  }
}

const SKINS_KEY = 'breakme_skins'
const SKINS_VERSION = 3

const validSkin = (id: unknown): id is string => typeof id === 'string' && isKnownSkin(id)

export async function loadSkins(): Promise<SkinChoice> {
  try {
    const raw = JSON.parse((await AsyncStorage.getItem(SKINS_KEY)) ?? '{}')
    // Cosmo and Nova replaced Kitty and Imp as the defaults; move players still on the old defaults over once.
    if (raw.v !== SKINS_VERSION) {
      if (raw.blue === 'kitty') raw.blue = DEFAULT_SKINS.blue
      if (raw.red === 'imp') raw.red = DEFAULT_SKINS.red
    }
    return {
      blue: validSkin(raw.blue) ? raw.blue : DEFAULT_SKINS.blue,
      red: validSkin(raw.red) ? raw.red : DEFAULT_SKINS.red,
    }
  } catch {
    return { ...DEFAULT_SKINS }
  }
}

export async function saveSkins(choice: SkinChoice): Promise<void> {
  try {
    await AsyncStorage.setItem(SKINS_KEY, JSON.stringify({ ...choice, v: SKINS_VERSION }))
  } catch {
    // Choice still applies for this session.
  }
}

const WELCOME_KEY = 'breakme_welcomed'

/** Whether the first-launch "sign in or skip" screen has been answered. */
export async function loadWelcomed(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(WELCOME_KEY)) === '1'
  } catch {
    return false
  }
}

export function saveWelcomed() {
  AsyncStorage.setItem(WELCOME_KEY, '1').catch(() => {
    // Shows again next launch at worst.
  })
}

/** Tester shortcut: marks every level as cleared. */
export async function unlockAllLevels(): Promise<number> {
  try {
    await AsyncStorage.setItem(UNLOCK_KEY, String(MAX_UNLOCK))
  } catch {
    // Still unlocked for this session.
  }
  return MAX_UNLOCK
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
