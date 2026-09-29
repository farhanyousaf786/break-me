import {
  child,
  equalTo,
  get,
  limitToFirst,
  onChildAdded,
  onDisconnect,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from 'firebase/database'
import { db, signIn } from './firebase'
import type { Snapshot } from './snapshot'

export type Role = 'host' | 'guest'
export type Score = { blue: number; red: number }

/** Tells two phones apart even when they share one account. */
const DEVICE = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export type RoomDoc = {
  host: string
  hostDevice?: string
  hostSkin: string
  hostName: string
  /** Gun skin ids; missing from older app versions */
  hostGun?: string
  guest?: string
  guestDevice?: string
  guestSkin?: string
  guestName?: string
  guestGun?: string
  status: 'waiting' | 'playing' | 'done' | 'left'
  /** Rounds in the match (1, 3 or 5); missing = 3 */
  bestOf?: number
  /** After the match: true = wants a rematch, false = declined */
  rematch?: Partial<Record<Role, boolean>>
  /** Code of the rematch room, written by the host once both agree */
  next?: string
  /** Listed for quick match while waiting */
  open: boolean
  createdAt: number
  score?: Score
  winner?: 'blue' | 'red'
}

export type Match = {
  code: string
  role: Role
  hostSkin: string
  guestSkin: string
  hostName: string
  guestName: string
  hostGun: string
  guestGun: string
  bestOf: BestOf
  /** Both phones use the same account: playable, but unranked */
  selfMatch?: boolean
  /** Stand-in opponent played locally by the CPU when nobody is available for quick match. */
  bot?: boolean
}

const BOT_FIRST = ['Pixel', 'Mochi', 'Zed', 'Kiki', 'Bean', 'Rio', 'Nyx', 'Taro', 'Juno', 'Blip', 'Sunny', 'Ozzy', 'Pip', 'Luna', 'Ace', 'Boba', 'Coco', 'Dash', 'Echo', 'Fizz']
const BOT_SECOND = ['Panda', 'Rocket', 'Boop', 'Ninja', 'Star', 'Bun', 'Fox', 'Byte', 'Wolf', 'Pop', 'Duck', 'Moon']

function botName(): string {
  const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
  const style = Math.random()
  if (style < 0.35) return `${pick(BOT_FIRST)}${pick(BOT_SECOND)}`
  if (style < 0.7) return `${pick(BOT_FIRST)}${Math.floor(10 + Math.random() * 990)}`
  if (style < 0.85) return `${pick(BOT_FIRST).toLowerCase()}_${pick(BOT_SECOND).toLowerCase()}`
  return pick(BOT_FIRST)
}

export function makeBotMatch(
  mySkin: string,
  myName: string,
  skinIds: string[],
  myGun: string,
  gunIds: string[],
  bestOf: BestOf,
): Match {
  const others = skinIds.filter((id) => id !== mySkin)
  return {
    bestOf,
    hostGun: myGun,
    guestGun: gunIds[Math.floor(Math.random() * gunIds.length)] ?? myGun,
    code: makeCode(),
    role: 'host',
    hostSkin: mySkin,
    guestSkin: others[Math.floor(Math.random() * others.length)] ?? mySkin,
    hostName: myName,
    guestName: botName(),
    bot: true,
  }
}

/** Match length in rounds; the first to win more than half takes the match. */
export type BestOf = 1 | 3 | 5
export const BEST_OF_OPTIONS: BestOf[] = [1, 3, 5]
export const DEFAULT_BEST_OF: BestOf = 3
export const winsNeeded = (bestOf: BestOf) => Math.ceil(bestOf / 2)
const toBestOf = (v: unknown): BestOf => (v === 1 || v === 3 || v === 5 ? v : DEFAULT_BEST_OF)

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function makeCode(): string {
  let code = ''
  for (let i = 0; i < 5; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return code
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
}

const roomRef = (code: string) => ref(db(), `rooms/${code}`)

function toMatch(code: string, role: Role, doc: RoomDoc): Match {
  return {
    code,
    role,
    hostSkin: doc.hostSkin,
    guestSkin: doc.guestSkin ?? 'imp',
    hostName: doc.hostName,
    guestName: doc.guestName ?? 'Player',
    hostGun: doc.hostGun ?? 'blaster',
    guestGun: doc.guestGun ?? 'blaster',
    bestOf: toBestOf(doc.bestOf),
    selfMatch: Boolean(doc.guest) && doc.host === doc.guest,
  }
}

const isMine = (doc: RoomDoc, uid: string) => (doc.hostDevice ? doc.hostDevice === DEVICE : doc.host === uid)

/** Creates a waiting room. While nobody has joined, the room disappears if the host drops. */
export async function createRoom(
  skin: string,
  name: string,
  gun: string,
  open: boolean,
  bestOf: BestOf,
): Promise<{ code: string; createdAt: number }> {
  const uid = await signIn()
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = makeCode()
    const createdAt = Date.now()
    const doc: RoomDoc = { host: uid, hostDevice: DEVICE, hostSkin: skin, hostName: name, hostGun: gun, status: 'waiting', open, createdAt, bestOf }
    // Returning undefined aborts: the code is taken, so try another.
    const res = await runTransaction(roomRef(code), (cur) => (cur === null ? doc : undefined))
    if (res.committed) {
      await onDisconnect(roomRef(code)).remove()
      return { code, createdAt }
    }
  }
  throw new Error('Could not create a room. Please try again.')
}

/** Joins a waiting room as the guest (red). Throws if the code is wrong or the room is full. */
export async function joinRoom(code: string, skin: string, name: string, gun: string): Promise<Match> {
  const uid = await signIn()
  const res = await runTransaction(roomRef(code), (cur: RoomDoc | null) => {
    // The first pass may run against an empty local cache; writing null lets the server retry with real data.
    if (cur === null) return null
    if (cur.status !== 'waiting' || cur.guest || isMine(cur, uid)) return undefined
    return { ...cur, guest: uid, guestDevice: DEVICE, guestSkin: skin, guestName: name, guestGun: gun, status: 'playing', open: false }
  })
  const doc = res.snapshot.val() as RoomDoc | null
  if (!res.committed || !doc || doc.guest !== uid) {
    throw new Error('Room not found or already full.')
  }
  await onDisconnect(child(roomRef(code), 'status')).set('left')
  return toMatch(code, 'guest', doc)
}

/** Called by the host once a guest has joined: dropping out now forfeits instead of deleting. */
export async function hostMatched(code: string, doc: RoomDoc): Promise<Match> {
  await onDisconnect(roomRef(code)).cancel()
  await onDisconnect(child(roomRef(code), 'status')).set('left')
  return toMatch(code, 'host', doc)
}

/** Tries to join the oldest open room with the same match length (optionally only rooms older than `olderThan`). */
export async function findOpenRoom(
  skin: string,
  name: string,
  gun: string,
  bestOf: BestOf,
  olderThan?: number,
  exclude?: string,
): Promise<Match | null> {
  const uid = await signIn()
  let snap
  try {
    snap = await get(query(ref(db(), 'rooms'), orderByChild('open'), equalTo(true), limitToFirst(15)))
  } catch (e) {
    // Published rules are missing `.indexOn: "open"` (see database.rules.json); scan every room instead.
    if (!(e instanceof Error) || !/index/i.test(e.message)) throw e
    snap = await get(ref(db(), 'rooms'))
  }
  const rooms: { code: string; doc: RoomDoc }[] = []
  snap.forEach((c) => {
    rooms.push({ code: c.key as string, doc: c.val() as RoomDoc })
  })
  const candidates = rooms
    .filter(({ code, doc }) => code !== exclude && doc.open === true && !isMine(doc, uid) && doc.status === 'waiting')
    .filter(({ doc }) => toBestOf(doc.bestOf) === bestOf)
    .filter(({ doc }) => olderThan === undefined || doc.createdAt < olderThan)
    .sort((a, b) => a.doc.createdAt - b.doc.createdAt)

  for (const { code } of candidates) {
    try {
      return await joinRoom(code, skin, name, gun)
    } catch {
      // Someone else got it first — try the next one.
    }
  }
  return null
}

export function watchRoom(code: string, cb: (doc: RoomDoc | null) => void): () => void {
  return onValue(roomRef(code), (s) => cb(s.val() as RoomDoc | null))
}

export type RoomMeta = Pick<RoomDoc, 'status' | 'score' | 'winner' | 'rematch' | 'next'>
const META_KEYS = ['status', 'score', 'winner', 'rematch', 'next'] as const

/**
 * In-match watcher for the small fields only. Watching the whole room would re-download the
 * ~15/s snapshot stream (and re-render) for nothing. `null` = the room is gone.
 */
export function watchRoomMeta(code: string, cb: (meta: RoomMeta | null) => void): () => void {
  const meta: Record<string, unknown> = {}
  let statusLoaded = false
  const unsubs = META_KEYS.map((key) =>
    onValue(child(roomRef(code), key), (s) => {
      meta[key] = s.val() ?? undefined
      if (key === 'status') statusLoaded = true
      if (!statusLoaded) return
      cb(meta.status ? ({ ...meta } as RoomMeta) : null)
    }),
  )
  return () => unsubs.forEach((u) => u())
}

const quiet = (p: PromiseLike<unknown> & { catch(fn: () => void): unknown }) => {
  p.catch(() => {})
}

/**
 * Atomically closes my waiting room, unless someone joined it at the last moment, in which case
 * that room is returned so the match can go ahead instead.
 */
export async function claimOrCloseRoom(code: string): Promise<RoomDoc | null> {
  const res = await runTransaction(roomRef(code), (cur: RoomDoc | null) => {
    if (cur === null) return null
    if (cur.status === 'waiting' && !cur.guest) return null
    return undefined
  })
  const doc = res.snapshot.val() as RoomDoc | null
  if (doc?.guest && doc.status === 'playing') return doc
  await onDisconnect(roomRef(code)).cancel()
  return null
}

export async function cancelRoom(code: string): Promise<void> {
  await onDisconnect(roomRef(code)).cancel()
  await remove(roomRef(code))
}

/** Never throws: the room may already be gone or closed to us, which is fine when leaving. */
export async function leaveMatch(code: string, role: Role): Promise<void> {
  try {
    const status = child(roomRef(code), 'status')
    await onDisconnect(status).cancel()
    if (role === 'host') await remove(roomRef(code))
    else await set(status, 'left')
  } catch {
    // Already gone.
  }
}

/* ---- in-match traffic ---- */

export function sendShot(code: string): void {
  quiet(push(child(roomRef(code), 'shots'), { t: serverTimestamp() }))
}

/** Host side: each guest shot arrives once and is deleted after handling. */
export function onShot(code: string, cb: () => void): () => void {
  return onChildAdded(child(roomRef(code), 'shots'), (s) => {
    cb()
    quiet(remove(s.ref))
  })
}

/** Quick-chat line from one player; `n` makes repeating the same line still count as new. */
export function sendChat(code: string, role: Role, text: string): void {
  quiet(set(child(roomRef(code), `chat/${role}`), { text, n: Math.random() }))
}

export function onChat(code: string, from: Role, cb: (text: string) => void): () => void {
  let first = true
  return onValue(child(roomRef(code), `chat/${from}`), (s) => {
    const v = s.val() as { text?: string } | null
    // Skip whatever was already there when we started listening.
    if (first) {
      first = false
      return
    }
    if (v?.text) cb(v.text)
  })
}

/** The guest's match screen is up; the host holds the first countdown until then. */
export function markReady(code: string): void {
  quiet(set(child(roomRef(code), 'ready'), true))
}

export function onGuestReady(code: string, cb: () => void): () => void {
  return onValue(child(roomRef(code), 'ready'), (s) => {
    if (s.val() === true) cb()
  })
}

/** Snapshot writes waiting for the server; newer frames are dropped instead of piling up on a slow link. */
let snapsInFlight = 0
const MAX_SNAPS_IN_FLIGHT = 2

export function sendSnapshot(code: string, snap: Snapshot): void {
  if (snapsInFlight >= MAX_SNAPS_IN_FLIGHT) return
  snapsInFlight++
  set(child(roomRef(code), 'snap'), snap)
    .catch(() => {})
    .finally(() => {
      snapsInFlight--
    })
}

export function onSnapshot(code: string, cb: (snap: Snapshot) => void): () => void {
  return onValue(child(roomRef(code), 'snap'), (s) => {
    const v = s.val() as Snapshot | null
    if (v) cb(v)
  })
}

/** true = ask / accept, false = decline, null = take the request back */
export function setRematch(code: string, role: Role, value: boolean | null): void {
  quiet(set(child(roomRef(code), `rematch/${role}`), value))
}

export function setNextRoom(code: string, next: string): Promise<void> {
  return set(child(roomRef(code), 'next'), next)
}

/** Stand-in opponent's rematch: same players, fresh code. */
export function botRematch(match: Match): Match {
  return { ...match, code: makeCode() }
}

export function reportScore(code: string, score: Score, bestOf: BestOf): void {
  const need = winsNeeded(bestOf)
  const done = score.blue >= need || score.red >= need
  quiet(update(roomRef(code), {
    score,
    ...(done ? { status: 'done', winner: score.blue >= need ? 'blue' : 'red' } : {}),
  }))
}
