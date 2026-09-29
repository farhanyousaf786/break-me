import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'

export type Stats = {
  cpuWins: number
  cpuLosses: number
  onlineWins: number
  onlineLosses: number
  /** Current run of wins in a row (any mode). */
  streak: number
  bestStreak: number
}

const STATS_KEY = 'breakme_stats'
const EMPTY: Stats = { cpuWins: 0, cpuLosses: 0, onlineWins: 0, onlineLosses: 0, streak: 0, bestStreak: 0 }

let stats: Stats = { ...EMPTY }
let loaded: Promise<void> | null = null
const listeners = new Set<(s: Stats) => void>()

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(STATS_KEY)
    .then((raw) => {
      const saved = JSON.parse(raw ?? '{}')
      const next = { ...EMPTY }
      for (const key of Object.keys(EMPTY) as (keyof Stats)[]) {
        const v = saved[key]
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) next[key] = Math.floor(v)
      }
      stats = next
      listeners.forEach((l) => l(stats))
    })
    .catch(() => {})
  return loaded
}

async function update(change: (s: Stats) => Stats) {
  await load()
  stats = change(stats)
  listeners.forEach((l) => l(stats))
  void AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats)).catch(() => {})
}

function withResult(s: Stats, won: boolean): Stats {
  const streak = won ? s.streak + 1 : 0
  return { ...s, streak, bestStreak: Math.max(s.bestStreak, streak) }
}

export function recordCpuResult(won: boolean) {
  void update((s) => withResult({ ...s, cpuWins: s.cpuWins + (won ? 1 : 0), cpuLosses: s.cpuLosses + (won ? 0 : 1) }, won))
}

export function recordOnlineResult(won: boolean) {
  void update((s) =>
    withResult({ ...s, onlineWins: s.onlineWins + (won ? 1 : 0), onlineLosses: s.onlineLosses + (won ? 0 : 1) }, won),
  )
}

export function totalWins(s: Stats): number {
  return s.cpuWins + s.onlineWins
}

export function useStats(): Stats {
  const [value, setValue] = useState(stats)
  useEffect(() => {
    listeners.add(setValue)
    void load().then(() => setValue(stats))
    return () => {
      listeners.delete(setValue)
    }
  }, [])
  return value
}
