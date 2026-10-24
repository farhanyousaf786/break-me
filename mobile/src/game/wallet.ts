import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSyncExternalStore } from 'react'
import type { LevelConfig } from './levels'
import { DEFAULT_AURA, FREE_AURAS, getAura, isAuraId } from './auras'
import { DEFAULT_GUN, FREE_GUNS, getGun, isGunId } from './guns'
import { AURAS, lookItemKey } from './look'
import { SKINS, type AuraKind, type Skin } from './skins'

/* ---------------------------------------------------------------- economy */

/** Shots needed for a perfect (3-star) clear: harder levels get more room. */
export const PAR: Record<LevelConfig['tier'], number> = { Easy: 3, Medium: 6, Hard: 10 }
/** Coins per star on a first clear. */
export const COINS_PER_STAR: Record<LevelConfig['tier'], number> = { Easy: 10, Medium: 15, Hard: 25 }
/** Replays pay this share, so grinding one easy level isn't the best strategy. */
export const REPLAY_SHARE = 0.5
export const ONLINE_WIN_COINS = 20
export const ONLINE_LOSS_COINS = 5
export const STARTER_COINS = 100

export function starsFor(tier: LevelConfig['tier'], shots: number): 1 | 2 | 3 {
  const par = PAR[tier]
  if (shots <= par) return 3
  if (shots <= par * 2) return 2
  return 1
}

export type Rarity = 'free' | 'common' | 'rare' | 'epic' | 'hero'

export const RARITY: Record<Rarity, { label: string; price: number; color: string }> = {
  free: { label: 'Free', price: 0, color: '#9aa3b8' },
  common: { label: 'Common', price: 60, color: '#46d27e' },
  rare: { label: 'Rare', price: 150, color: '#4cb4ff' },
  epic: { label: 'Epic', price: 300, color: '#b18cff' },
  hero: { label: 'Premium', price: 800, color: '#ffcf3f' },
}

export const FREE_SKINS = ['cosmo', 'nova', 'kitty', 'max']

export function rarityOf(skin: Skin): Rarity {
  if (FREE_SKINS.includes(skin.id)) return 'free'
  if (skin.hero) return 'hero'
  const shape = skin.shape ?? 'blob'
  if (shape === 'robot' || shape === 'ghost') return 'epic'
  if (shape === 'human') return 'rare'
  return 'common'
}

export const priceOf = (skin: Skin) => RARITY[rarityOf(skin)].price

/* ------------------------------------------------------------------ store */

export type Wallet = {
  coins: number
  owned: string[]
  /** Best stars per level id */
  stars: Record<number, number>
  /** Bought "Remove Ads" */
  noAds: boolean
  /** Store transaction ids already credited, so a coin pack is never paid out twice */
  granted: string[]
  /** Rewarded-video coins claimed today */
  videos: { day: string; count: number }
  /** Owned gun skins and the one in hand */
  guns: string[]
  gun: string
  /** Owned auras and the one equipped on your fighter */
  auras: AuraKind[]
  aura: AuraKind
  /** Unlocked premium creator items, as `field:index` keys */
  looks: string[]
}

const KEY = 'breakme_wallet'
const EMPTY: Wallet = {
  coins: 0,
  owned: FREE_SKINS,
  stars: {},
  noAds: false,
  granted: [],
  videos: { day: '', count: 0 },
  guns: [...FREE_GUNS],
  gun: DEFAULT_GUN,
  auras: [...FREE_AURAS],
  aura: DEFAULT_AURA,
  looks: [],
}

let wallet: Wallet = EMPTY
const listeners = new Set<() => void>()

function commit(next: Wallet) {
  wallet = next
  listeners.forEach((l) => l())
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {
    // Still applies for this session.
  })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useWallet(): Wallet {
  return useSyncExternalStore(subscribe, () => wallet)
}

export const isOwned = (id: string) => wallet.owned.includes(id)

export const getWallet = () => wallet

/** `equipped` are grandfathered in for players who picked characters before the shop existed. */
export async function loadWallet(equipped: string[]): Promise<Wallet> {
  const valid = (id: unknown): id is string => typeof id === 'string' && SKINS.some((s) => s.id === id)
  let raw: Partial<Wallet> | null = null
  try {
    raw = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null')
  } catch {
    raw = null
  }
  if (!raw) {
    commit({ ...EMPTY, coins: STARTER_COINS, owned: [...new Set([...FREE_SKINS, ...equipped.filter(valid)])] })
    return wallet
  }
  const owned = Array.isArray(raw.owned) ? raw.owned.filter(valid) : []
  const guns = [...new Set([...FREE_GUNS, ...(Array.isArray(raw.guns) ? raw.guns.filter(isGunId) : [])])]
  const looks = Array.isArray(raw.looks) ? [...new Set(raw.looks.filter((k): k is string => typeof k === 'string'))] : []
  // Creator aura unlocks (aura:N) count as owned locker auras too.
  const fromLooks = looks
    .map((k) => {
      const m = /^aura:(\d+)$/.exec(k)
      if (!m) return null
      return AURAS[Number(m[1])] ?? null
    })
    .filter((id): id is AuraKind => Boolean(id))
  const auras = [
    ...new Set([
      ...FREE_AURAS,
      ...(Array.isArray(raw.auras) ? raw.auras.filter(isAuraId) : []),
      ...fromLooks,
    ]),
  ]
  wallet = {
    coins: Math.max(0, Math.floor(Number(raw.coins) || 0)),
    owned: [...new Set([...FREE_SKINS, ...owned])],
    stars: raw.stars && typeof raw.stars === 'object' ? raw.stars : {},
    noAds: raw.noAds === true,
    granted: Array.isArray(raw.granted) ? raw.granted.filter((t): t is string => typeof t === 'string') : [],
    videos:
      raw.videos && typeof raw.videos.day === 'string' ? { day: raw.videos.day, count: Number(raw.videos.count) || 0 } : EMPTY.videos,
    guns,
    gun: isGunId(raw.gun) && guns.includes(raw.gun) ? raw.gun : DEFAULT_GUN,
    auras,
    aura: isAuraId(raw.aura) && auras.includes(raw.aura) ? raw.aura : DEFAULT_AURA,
    looks,
  }
  listeners.forEach((l) => l())
  return wallet
}

export type LevelReward = { shots: number; stars: 1 | 2 | 3; coins: number; best: number; firstClear: boolean; newBest: boolean }

export function rewardLevel(level: LevelConfig, shots: number): LevelReward {
  const stars = starsFor(level.tier, shots)
  const prev = wallet.stars[level.id] ?? 0
  const firstClear = prev === 0
  const full = stars * COINS_PER_STAR[level.tier]
  const coins = firstClear ? full : Math.round(full * REPLAY_SHARE)
  const best = Math.max(prev, stars)
  commit({ ...wallet, coins: wallet.coins + coins, stars: { ...wallet.stars, [level.id]: best } })
  return { shots, stars, coins, best, firstClear, newBest: !firstClear && stars > prev }
}

export function rewardOnline(won: boolean): number {
  const coins = won ? ONLINE_WIN_COINS : ONLINE_LOSS_COINS
  commit({ ...wallet, coins: wallet.coins + coins })
  return coins
}

export function buySkin(skin: Skin): boolean {
  const price = priceOf(skin)
  if (wallet.owned.includes(skin.id) || wallet.coins < price) return false
  commit({ ...wallet, coins: wallet.coins - price, owned: [...wallet.owned, skin.id] })
  return true
}

export function buyGun(id: string): boolean {
  const gun = getGun(id)
  if (gun.id !== id || wallet.guns.includes(id) || wallet.coins < gun.price) return false
  commit({ ...wallet, coins: wallet.coins - gun.price, guns: [...wallet.guns, id], gun: id })
  return true
}

/** Unlocks creator items (`field:index` keys) together, only if every one is affordable. */
export function buyLookItems(items: { key: string; price: number }[]): boolean {
  const fresh = items.filter((i) => !wallet.looks.includes(i.key))
  const total = fresh.reduce((sum, i) => sum + i.price, 0)
  if (fresh.length === 0) return true
  if (wallet.coins < total) return false
  const looks = [...wallet.looks, ...fresh.map((i) => i.key)]
  const auras = [...wallet.auras]
  for (const i of fresh) {
    const m = /^aura:(\d+)$/.exec(i.key)
    if (!m) continue
    const id = AURAS[Number(m[1])]
    if (id && !auras.includes(id)) auras.push(id)
  }
  commit({ ...wallet, coins: wallet.coins - total, looks, auras })
  return true
}

export function equipGun(id: string) {
  if (wallet.guns.includes(id) && wallet.gun !== id) commit({ ...wallet, gun: id })
}

export function buyAura(id: string): boolean {
  const aura = getAura(id)
  if (aura.id !== id || wallet.auras.includes(aura.id) || wallet.coins < aura.price) return false
  const index = AURAS.indexOf(aura.id)
  const lookKey = index >= 0 ? lookItemKey('aura', index) : null
  const looks = lookKey && !wallet.looks.includes(lookKey) ? [...wallet.looks, lookKey] : wallet.looks
  commit({
    ...wallet,
    coins: wallet.coins - aura.price,
    auras: [...wallet.auras, aura.id],
    aura: aura.id,
    looks,
  })
  return true
}

export function equipAura(id: string) {
  if (!isAuraId(id) || !wallet.auras.includes(id) || wallet.aura === id) return
  commit({ ...wallet, aura: id })
}


export function addCoins(amount: number) {
  commit({ ...wallet, coins: wallet.coins + amount })
}

const today = () => new Date().toISOString().slice(0, 10)

export function videosLeft(perDay: number, w: Wallet = wallet): number {
  return w.videos.day === today() ? Math.max(0, perDay - w.videos.count) : perDay
}

export function claimVideoCoins(amount: number) {
  const day = today()
  const count = wallet.videos.day === day ? wallet.videos.count + 1 : 1
  commit({ ...wallet, coins: wallet.coins + amount, videos: { day, count } })
}

type OwnershipGrant = {
  coins?: number
  skins?: string[]
  guns?: string[]
  auras?: string[]
  noAds?: boolean
}

function withAuraLooks(auras: AuraKind[], looks: string[]) {
  const next = [...looks]
  for (const id of auras) {
    const i = AURAS.indexOf(id)
    if (i < 0) continue
    const key = lookItemKey('aura', i)
    if (!next.includes(key)) next.push(key)
  }
  return next
}

/** Applies a store purchase once per transaction id (restores re-deliver old transactions). */
export function grantPurchase(txId: string, grant: OwnershipGrant) {
  if (wallet.granted.includes(txId)) return false
  const guns = [...new Set([...wallet.guns, ...(grant.guns ?? []).filter(isGunId)])]
  const auras = [...new Set([...wallet.auras, ...(grant.auras ?? []).filter(isAuraId)])] as AuraKind[]
  commit({
    ...wallet,
    coins: wallet.coins + (grant.coins ?? 0),
    owned: [...new Set([...wallet.owned, ...(grant.skins ?? [])])],
    guns,
    auras,
    looks: withAuraLooks(auras, wallet.looks),
    noAds: wallet.noAds || Boolean(grant.noAds),
    granted: [...wallet.granted, txId],
  })
  return true
}

/** Non-consumables are re-applied from the store on restore, regardless of transaction id. */
export function applyOwnership(grant: OwnershipGrant) {
  const owned = [...new Set([...wallet.owned, ...(grant.skins ?? [])])]
  const guns = [...new Set([...wallet.guns, ...(grant.guns ?? []).filter(isGunId)])]
  const auras = [...new Set([...wallet.auras, ...(grant.auras ?? []).filter(isAuraId)])] as AuraKind[]
  const looks = withAuraLooks(auras, wallet.looks)
  const noAds = wallet.noAds || Boolean(grant.noAds)
  if (
    owned.length === wallet.owned.length &&
    guns.length === wallet.guns.length &&
    auras.length === wallet.auras.length &&
    looks.length === wallet.looks.length &&
    noAds === wallet.noAds
  ) {
    return
  }
  commit({ ...wallet, owned, guns, auras, looks, noAds })
}

/** Tester shortcut. */
export function grantCoins(amount: number) {
  commit({ ...wallet, coins: wallet.coins + amount })
}
