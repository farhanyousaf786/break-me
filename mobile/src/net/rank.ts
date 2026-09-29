import { get, onValue, orderByChild, query, ref, runTransaction, startAt } from 'firebase/database'
import { useEffect, useState } from 'react'
import type { Player } from './account'
import { auth, db } from './firebase'

/*
 * Ranking rules (shown to players in RankRules):
 * - Only Google accounts are ranked; guests are "Unranked".
 * - Online matches only (quick match and private rooms).
 * - Win +30 RP, loss -15 RP (never below 0).
 * - Flawless win (best of 3 or 5, no round lost): +10 bonus. Win streak of 3 or more: +10 bonus per win.
 * - Opponent leaves mid-match: counts as a normal win.
 * - Global position = how many ranked players have more RP than you, plus one.
 */
export const RP_WIN = 30
export const RP_LOSS = 15
export const RP_FLAWLESS = 10
export const RP_STREAK = 10
export const STREAK_FOR_BONUS = 3

export type Tier = { name: string; min: number; color: string; ink: string }

export const TIERS: Tier[] = [
  { name: 'Bronze', min: 0, color: '#d08a4f', ink: '#3d1f08' },
  { name: 'Silver', min: 300, color: '#c9d4e3', ink: '#27303d' },
  { name: 'Gold', min: 700, color: '#ffcf3f', ink: '#3d2805' },
  { name: 'Platinum', min: 1200, color: '#5eead4', ink: '#073b34' },
  { name: 'Diamond', min: 1800, color: '#7ed0ff', ink: '#08304a' },
  { name: 'Legend', min: 2500, color: '#ff7eb6', ink: '#4a0a28' },
]

export function tierFor(rp: number): { tier: Tier; next: Tier | null; progress: number } {
  let i = 0
  while (i + 1 < TIERS.length && rp >= TIERS[i + 1].min) i++
  const tier = TIERS[i]
  const next = TIERS[i + 1] ?? null
  const progress = next ? (rp - tier.min) / (next.min - tier.min) : 1
  return { tier, next, progress }
}

type RankDoc = { rp: number; wins: number; losses: number; streak: number; name: string; photo: string | null }

const rankRef = (uid: string) => ref(db(), `ranks/${uid}`)

export function rpChange(won: boolean, flawless: boolean, streakBefore: number): number {
  if (!won) return -RP_LOSS
  let delta = RP_WIN
  if (flawless) delta += RP_FLAWLESS
  if (streakBefore + 1 >= STREAK_FOR_BONUS) delta += RP_STREAK
  return delta
}

/**
 * Applies one online match result to the signed-in Google player's rank. Returns the RP change,
 * or null for guests (unranked).
 */
export async function recordRankedResult(won: boolean, flawless: boolean): Promise<number | null> {
  const user = auth().currentUser
  if (!user || user.isAnonymous) return null
  let delta = 0
  await runTransaction(rankRef(user.uid), (cur: RankDoc | null) => {
    const doc: RankDoc = cur ?? { rp: 0, wins: 0, losses: 0, streak: 0, name: '', photo: null }
    delta = rpChange(won, flawless, doc.streak)
    return {
      rp: Math.max(0, doc.rp + delta),
      wins: doc.wins + (won ? 1 : 0),
      losses: doc.losses + (won ? 0 : 1),
      streak: won ? doc.streak + 1 : 0,
      name: user.displayName ?? 'Player',
      photo: user.photoURL ?? null,
    }
  })
  return delta
}

export type RankInfo = { rp: number; wins: number; losses: number; position: number | null }

/** Live rank for a Google player; null for guests or while loading. */
export function useRank(player: Player | null | undefined): RankInfo | null {
  const [info, setInfo] = useState<RankInfo | null>(null)
  const uid = player?.kind === 'google' ? player.uid : null

  useEffect(() => {
    if (!uid) {
      setInfo(null)
      return
    }
    let alive = true
    const unsub = onValue(rankRef(uid), (snap) => {
      const doc = (snap.val() as RankDoc | null) ?? { rp: 0, wins: 0, losses: 0, streak: 0, name: '', photo: null }
      setInfo((prev) => ({ rp: doc.rp, wins: doc.wins, losses: doc.losses, position: prev?.position ?? null }))
      get(query(ref(db(), 'ranks'), orderByChild('rp'), startAt(doc.rp + 1)))
        .then((above) => {
          if (alive) setInfo((prev) => (prev ? { ...prev, position: above.size + 1 } : prev))
        })
        .catch(() => {})
    })
    return () => {
      alive = false
      unsub()
    }
  }, [uid])

  return info
}
