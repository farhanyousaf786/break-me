import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'
import { addCoins } from './wallet'

/**
 * Daily missions (3 per day, the same for everyone on a given date) and the lucky spin wheel
 * (1 free spin per day, plus a few more for watching a video). Resets at local midnight.
 */

export type MissionKind = 'win' | 'play' | 'shots' | 'powerups' | 'onlineWin' | 'stars3'

const TEMPLATES: Record<MissionKind, { goals: number[]; text: (n: number) => string; coins: (n: number) => number }> = {
  win: { goals: [2, 3, 5], text: (n) => `Win ${n} matches`, coins: (n) => 10 + n * 10 },
  play: { goals: [3, 5, 8], text: (n) => `Play ${n} matches`, coins: (n) => 5 + n * 5 },
  shots: { goals: [25, 40, 60], text: (n) => `Fire ${n} shots`, coins: (n) => Math.round(n / 2) + 5 },
  powerups: { goals: [2, 4, 6], text: (n) => `Grab ${n} power-up bubbles`, coins: (n) => n * 10 },
  onlineWin: { goals: [1, 2], text: (n) => (n === 1 ? 'Win an online match' : `Win ${n} online matches`), coins: (n) => n * 30 },
  stars3: { goals: [1, 2, 3], text: (n) => (n === 1 ? 'Get 3 stars on a level' : `Get 3 stars on ${n} levels`), coins: (n) => n * 20 },
}

export const MISSIONS_PER_DAY = 3
export const ALL_DONE_BONUS = 50
export const AD_SPINS_PER_DAY = 3

/** Wheel segments, clockwise from the top. `weight` is the relative chance. */
export const SPIN_PRIZES = [
  { coins: 10, weight: 22, color: '#4cb4ff' },
  { coins: 25, weight: 18, color: '#ff6b7a' },
  { coins: 15, weight: 20, color: '#46d27e' },
  { coins: 50, weight: 9, color: '#b18cff' },
  { coins: 20, weight: 18, color: '#ff9f1c' },
  { coins: 100, weight: 3, color: '#ffcf3f' },
  { coins: 30, weight: 8, color: '#ff5fa2' },
  { coins: 75, weight: 2, color: '#2ec4b6' },
]

export type Mission = { kind: MissionKind; goal: number; progress: number; claimed: boolean; coins: number }

export type DailyState = {
  day: string
  missions: Mission[]
  bonusClaimed: boolean
  freeSpinUsed: boolean
  adSpinsUsed: number
}

const KEY = 'breakme_daily'

function localDay(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Small deterministic PRNG so a date always rolls the same missions. */
function seeded(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

function rollDay(day: string): DailyState {
  const rand = seeded(day)
  const kinds = (Object.keys(TEMPLATES) as MissionKind[]).sort(() => rand() - 0.5).slice(0, MISSIONS_PER_DAY)
  const missions = kinds.map((kind) => {
    const t = TEMPLATES[kind]
    const goal = t.goals[Math.floor(rand() * t.goals.length)]
    return { kind, goal, progress: 0, claimed: false, coins: t.coins(goal) }
  })
  return { day, missions, bonusClaimed: false, freeSpinUsed: false, adSpinsUsed: 0 }
}

let state: DailyState = rollDay(localDay())
const listeners = new Set<() => void>()

function commit(next: DailyState) {
  state = next
  listeners.forEach((l) => l())
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {})
}

/** Rolls over to a fresh set when the date changed since the last look. */
function current(): DailyState {
  const day = localDay()
  if (state.day !== day) {
    // Also runs as the store snapshot during render, so swap silently instead of notifying listeners.
    state = rollDay(day)
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {})
  }
  return state
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useDaily(): DailyState {
  return useSyncExternalStore(subscribe, current)
}

export async function loadDaily() {
  try {
    const raw = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null') as DailyState | null
    if (raw && raw.day === localDay() && Array.isArray(raw.missions)) {
      state = {
        ...rollDay(raw.day),
        ...raw,
        missions: raw.missions.filter((m) => m && m.kind in TEMPLATES),
      }
      listeners.forEach((l) => l())
    }
  } catch {
    // Keep today's fresh roll.
  }
}

export const missionText = (m: Mission) => TEMPLATES[m.kind].text(m.goal)
export const missionDone = (m: Mission) => m.progress >= m.goal

export function trackDaily(kind: MissionKind, amount = 1) {
  const s = current()
  if (!s.missions.some((m) => m.kind === kind && m.progress < m.goal)) return
  commit({
    ...s,
    missions: s.missions.map((m) => (m.kind === kind ? { ...m, progress: Math.min(m.goal, m.progress + amount) } : m)),
  })
}

export function claimMission(index: number): number {
  const s = current()
  const m = s.missions[index]
  if (!m || m.claimed || !missionDone(m)) return 0
  commit({ ...s, missions: s.missions.map((x, i) => (i === index ? { ...x, claimed: true } : x)) })
  addCoins(m.coins)
  return m.coins
}

export const allClaimed = (s: DailyState) => s.missions.every((m) => m.claimed)

export function claimBonus(): number {
  const s = current()
  if (s.bonusClaimed || !allClaimed(s)) return 0
  commit({ ...s, bonusClaimed: true })
  addCoins(ALL_DONE_BONUS)
  return ALL_DONE_BONUS
}

export const adSpinsLeft = (s: DailyState) => Math.max(0, AD_SPINS_PER_DAY - s.adSpinsUsed)

/** Picks the prize up front (the wheel animates to it), pays it out and marks the spin used. */
export function spin(kind: 'free' | 'ad'): number | null {
  const s = current()
  if (kind === 'free' ? s.freeSpinUsed : adSpinsLeft(s) === 0) return null
  const total = SPIN_PRIZES.reduce((sum, p) => sum + p.weight, 0)
  let roll = Math.random() * total
  let index = 0
  while (roll >= SPIN_PRIZES[index].weight) {
    roll -= SPIN_PRIZES[index].weight
    index++
  }
  commit(kind === 'free' ? { ...s, freeSpinUsed: true } : { ...s, adSpinsUsed: s.adSpinsUsed + 1 })
  addCoins(SPIN_PRIZES[index].coins)
  return index
}

/** Things waiting for the player: finished-but-unclaimed missions, the bonus, and the free spin. */
export function dailyBadge(s: DailyState): number {
  const missions = s.missions.filter((m) => missionDone(m) && !m.claimed).length
  const bonus = allClaimed(s) && !s.bonusClaimed ? 1 : 0
  return missions + bonus + (s.freeSpinUsed ? 0 : 1)
}
