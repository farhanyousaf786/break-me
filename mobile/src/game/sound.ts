import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAudioPlayer, preload, setAudioModeAsync, type AudioPlayer } from 'expo-audio'
import { AppState, Platform } from 'react-native'

/** 0 = off, 1 = low, 2 = medium, 3 = high. */
export type Level = 0 | 1 | 2 | 3
export type AudioSettings = { music: Level; sfx: Level; voice: Level }

export const DEFAULT_AUDIO: AudioSettings = { music: 1, sfx: 3, voice: 3 }
const LEVEL_VOLUME = [0, 0.35, 0.7, 1]
const MUSIC_MAX = 0.45
const SETTINGS_KEY = 'breakme_audio'

type Pool = { players: AudioPlayer[]; next: number }

const VOICES = {
  yay: require('../../assets/sfx/voice-yay.wav'),
  woo: require('../../assets/sfx/voice-woo.wav'),
  wee: require('../../assets/sfx/voice-wee.wav'),
  hehe: require('../../assets/sfx/voice-hehe.wav'),
  squeak: require('../../assets/sfx/voice-squeak.wav'),
  ouch: require('../../assets/sfx/voice-ouch.wav'),
  eek: require('../../assets/sfx/voice-eek.wav'),
  aww: require('../../assets/sfx/voice-aww.wav'),
  uhoh: require('../../assets/sfx/voice-uhoh.wav'),
  oof: require('../../assets/sfx/voice-oof.wav'),
  wahwah: require('../../assets/sfx/voice-wahwah.wav'),
} as const
export type Voice = keyof typeof VOICES

/** Soft preview level relative to the player's SFX setting (locker browsing). */
const PREVIEW_DIM = 0.42

// Keyed by gun id (guns.ts); unknown ids and the Buddy Blaster use shoot.wav.
const GUN_SHOTS: Record<string, number> = {
  blaster: require('../../assets/sfx/shoot.wav'),
  pistol: require('../../assets/sfx/shoot-pistol.wav'),
  water: require('../../assets/sfx/shoot-water.wav'),
  snow: require('../../assets/sfx/shoot-snow.wav'),
  bubble: require('../../assets/sfx/shoot-bubble.wav'),
  plunger: require('../../assets/sfx/shoot-plunger.wav'),
  double: require('../../assets/sfx/shoot-double.wav'),
  crossbow: require('../../assets/sfx/shoot-crossbow.wav'),
  ray: require('../../assets/sfx/shoot-ray.wav'),
  carrot: require('../../assets/sfx/shoot-carrot.wav'),
  confetti: require('../../assets/sfx/shoot-confetti.wav'),
  duck: require('../../assets/sfx/shoot-duck.wav'),
  candy: require('../../assets/sfx/shoot-candy.wav'),
  minigun: require('../../assets/sfx/shoot-minigun.wav'),
  grenade: require('../../assets/sfx/shoot-grenade.wav'),
  laser: require('../../assets/sfx/shoot-laser.wav'),
  rocket: require('../../assets/sfx/shoot-rocket.wav'),
  thunder: require('../../assets/sfx/shoot-thunder.wav'),
  golden: require('../../assets/sfx/shoot-golden.wav'),
  star: require('../../assets/sfx/shoot-star.wav'),
  kitty: require('../../assets/sfx/shoot-kitty.wav'),
  banana: require('../../assets/sfx/shoot-banana.wav'),
  bee: require('../../assets/sfx/shoot-bee.wav'),
  music: require('../../assets/sfx/shoot-music.wav'),
  cupcake: require('../../assets/sfx/shoot-cupcake.wav'),
  twin: require('../../assets/sfx/shoot-twin.wav'),
  triple: require('../../assets/sfx/shoot-triple.wav'),
  sprinkle: require('../../assets/sfx/shoot-sprinkle.wav'),
  rainbow: require('../../assets/sfx/shoot-rainbow.wav'),
  dragon: require('../../assets/sfx/shoot-dragon.wav'),
  slingshot: require('../../assets/sfx/shoot-slingshot.wav'),
  pizza: require('../../assets/sfx/shoot-pizza.wav'),
  ghost: require('../../assets/sfx/shoot-ghost.wav'),
  donut: require('../../assets/sfx/shoot-donut.wav'),
  ice: require('../../assets/sfx/shoot-ice.wav'),
  unicorn: require('../../assets/sfx/shoot-unicorn.wav'),
  pumpkin: require('../../assets/sfx/shoot-pumpkin.wav'),
  storm: require('../../assets/sfx/shoot-storm.wav'),
  galaxy: require('../../assets/sfx/shoot-galaxy.wav'),
}

/** Unique soft sting per aura id (auras.ts) for locker preview. */
const AURA_SFX: Record<string, number> = {
  none: require('../../assets/sfx/aura-none.wav'),
  bubbles: require('../../assets/sfx/aura-bubbles.wav'),
  sparkle: require('../../assets/sfx/aura-sparkle.wav'),
  hearts: require('../../assets/sfx/aura-hearts.wav'),
  stars: require('../../assets/sfx/aura-stars.wav'),
  flames: require('../../assets/sfx/aura-flames.wav'),
  rainbow: require('../../assets/sfx/aura-rainbow.wav'),
  orbit: require('../../assets/sfx/aura-orbit.wav'),
  lightning: require('../../assets/sfx/aura-lightning.wav'),
  petals: require('../../assets/sfx/aura-petals.wav'),
  snow: require('../../assets/sfx/aura-snow.wav'),
  void: require('../../assets/sfx/aura-void.wav'),
  neon: require('../../assets/sfx/aura-neon.wav'),
  rings: require('../../assets/sfx/aura-rings.wav'),
}

// Skip "wee" (eeee-like) — shots keep short chirps; big moments use playFanfare (power-up).
const SHOT_VOICES: Voice[] = ['squeak', 'woo', 'hehe', 'squeak']
const HIT_VOICES: Voice[] = ['uhoh', 'oof', 'uhoh', 'eek']
// Kept low so the gun sound itself carries each shot.
const SHOT_VOICE_CHANCE = 0.25
const VOICE_GAP_MS = 550

let settings: AudioSettings = { ...DEFAULT_AUDIO }
let ready = false
let shootPool: Pool | null = null
// Every AudioPlayer is a native player (its own thread on Android), so only a few gun pools are kept
// alive; the least recently used one is released when another gun needs sound.
const gunPools = new Map<string, Pool>()
const MAX_GUN_POOLS = 4
let previewPlayer: AudioPlayer | null = null
let auraPreviewPlayer: AudioPlayer | null = null
let breakPool: Pool | null = null
let diePool: Pool | null = null
const DIE_DELAY_MS = 260
let tapPool: Pool | null = null
let powerPool: Pool | null = null
let shieldPool: Pool | null = null
let voicePools: Partial<Record<Voice, Pool>> = {}
let music: AudioPlayer | null = null
let appActive = true
let musicMuted = false
let lastVoiceAt = 0

function makePool(source: number, size: number): Pool {
  return { players: Array.from({ length: size }, () => createAudioPlayer(source)), next: 0 }
}

/** Voice pools are created on first use so startup doesn't build ~11 native players at once. */
function voicePool(voice: Voice): Pool {
  let pool = voicePools[voice]
  if (!pool) {
    pool = makePool(VOICES[voice], 1)
    voicePools[voice] = pool
  }
  return pool
}

/** Yield between preloads so Android isn't jammed decoding ~50 WAVs in one frame. */
async function warmAssetsInBackground() {
  // Common voices first — wins / unlocks / picks hit these often.
  for (const v of ['yay', 'woo', 'wahwah', 'squeak', 'hehe', 'uhoh'] as Voice[]) {
    voicePool(v)
    await new Promise((r) => setTimeout(r, 20))
  }

  if (!music) {
    music = createAudioPlayer(require('../../assets/sfx/music.wav'))
    music.loop = true
    syncMusic()
  }

  // Warm reusable locker preview players once so the first tap isn't a cold createAudioPlayer.
  if (!previewPlayer) previewPlayer = createAudioPlayer(GUN_SHOTS.blaster)
  if (!auraPreviewPlayer) auraPreviewPlayer = createAudioPlayer(AURA_SFX.bubbles)

  // Byte-cache the rest so the first locker preview / match shot isn't cold.
  if (Platform.OS === 'android') {
    const sources = [
      ...Object.values(GUN_SHOTS),
      ...Object.values(AURA_SFX),
      ...Object.values(VOICES),
    ]
    for (const source of sources) {
      await preload(source).catch(() => {})
      await new Promise((r) => setTimeout(r, 12))
    }
  } else {
    for (const v of Object.keys(VOICES) as Voice[]) {
      voicePool(v)
      await new Promise((r) => setTimeout(r, 20))
    }
  }
}

/**
 * Load core SFX once at app start. Heavy assets (music, every gun/aura/voice) warm in the
 * background — creating them all synchronously was freezing the first sound ~10s on Android.
 */
export function initSound() {
  if (ready) return
  ready = true
  void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' })

  shootPool = makePool(require('../../assets/sfx/shoot.wav'), 3)
  breakPool = makePool(require('../../assets/sfx/break.wav'), 2)
  diePool = makePool(require('../../assets/sfx/die.wav'), 1)
  tapPool = makePool(require('../../assets/sfx/tap.wav'), 2)
  powerPool = makePool(require('../../assets/sfx/powerup.wav'), 1)
  shieldPool = makePool(require('../../assets/sfx/shield.wav'), 1)
  voicePools = {}

  AppState.addEventListener('change', (status) => {
    appActive = status === 'active'
    syncMusic()
  })

  void loadAudioSettings().then((saved) => {
    settings = saved
    syncMusic()
  })

  // After first paint / splash — don't block taps or the first shot.
  setTimeout(() => {
    void warmAssetsInBackground()
  }, 400)
}

function syncMusic() {
  if (!music) return
  music.volume = LEVEL_VOLUME[settings.music] * MUSIC_MAX
  if (settings.music > 0 && appActive && !musicMuted) {
    if (!music.playing) music.play()
  } else if (music.playing) {
    music.pause()
  }
}

/** Silence the background music (e.g. during a match) without changing the saved setting. */
export function setMusicMuted(muted: boolean) {
  musicMuted = muted
  syncMusic()
}

// Round-robin across players so rapid sounds overlap instead of cutting each other off.
function play(pool: Pool | null | undefined, level: Level) {
  if (!pool || level === 0) return
  const player = pool.players[pool.next]
  pool.next = (pool.next + 1) % pool.players.length
  player.volume = LEVEL_VOLUME[level]
  if (player.currentTime > 0) void player.seekTo(0)
  player.play()
}

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]

export function playVoice(voice: Voice) {
  if (!ready) initSound()
  lastVoiceAt = Date.now()
  play(voicePool(voice), settings.voice)
}

/** Voice that only fires if nobody spoke very recently, so rapid fire doesn't turn into noise. */
function maybeVoice(voice: Voice, chance: number) {
  if (Math.random() > chance || Date.now() - lastVoiceAt < VOICE_GAP_MS) return
  playVoice(voice)
}

function shotPool(weapon: string | undefined): Pool | null {
  if (!ready) return null
  const source = weapon ? GUN_SHOTS[weapon] : undefined
  if (!weapon || !source) return shootPool
  let pool = gunPools.get(weapon)
  if (pool) {
    gunPools.delete(weapon)
  } else {
    if (gunPools.size >= MAX_GUN_POOLS) {
      const [oldest, old] = gunPools.entries().next().value!
      gunPools.delete(oldest)
      for (const p of old.players) p.remove()
    }
    pool = makePool(source, 2)
  }
  gunPools.set(weapon, pool)
  return pool
}

/** Gun locker preview: dim unique shot while the stage shows your fighter holding that gun. */
export function previewShot(weapon: string) {
  if (!ready) initSound()
  if (settings.sfx === 0) return
  const source = GUN_SHOTS[weapon] ?? require('../../assets/sfx/shoot.wav')
  // Prefer replace on a warm player; creating a brand-new native player is what felt like 10s+ hangs.
  if (previewPlayer) {
    previewPlayer.replace(source)
  } else {
    previewPlayer = createAudioPlayer(source)
  }
  previewPlayer.volume = LEVEL_VOLUME[settings.sfx] * PREVIEW_DIM
  if (previewPlayer.currentTime > 0) void previewPlayer.seekTo(0)
  previewPlayer.play()
}

/** Aura locker preview: dim unique sting while the stage shows your fighter with that aura. */
export function previewAura(aura: string) {
  if (!ready) initSound()
  if (settings.sfx === 0) return
  const source = AURA_SFX[aura] ?? AURA_SFX.none
  if (!source) return
  if (auraPreviewPlayer) {
    auraPreviewPlayer.replace(source)
  } else {
    auraPreviewPlayer = createAudioPlayer(source)
  }
  auraPreviewPlayer.volume = LEVEL_VOLUME[settings.sfx] * PREVIEW_DIM
  if (auraPreviewPlayer.currentTime > 0) void auraPreviewPlayer.seekTo(0)
  auraPreviewPlayer.play()
}

/** Load the shot sounds for these guns ahead of time (e.g. at match start) so the first shot isn't silent. */
export function preloadShots(weapons: (string | undefined)[]) {
  initSound()
  for (const w of weapons) shotPool(w)
}

export function playShoot(weapon?: string) {
  play(shotPool(weapon), settings.sfx)
  maybeVoice(pick(SHOT_VOICES), SHOT_VOICE_CHANCE)
}

export function playBreak() {
  play(breakPool, settings.sfx)
  playVoice(pick(HIT_VOICES))
  setTimeout(() => play(diePool, settings.sfx), DIE_DELAY_MS)
}

export function playTap() {
  play(tapPool, settings.sfx)
}

export function playPowerUp() {
  play(powerPool, settings.sfx)
}

/** Unique sting for rival found, daily bonus, and other big wins (not a voice clip). */
export function playFanfare() {
  playPowerUp()
}

export function playShieldBlock() {
  play(shieldPool, settings.sfx)
}

export function getAudioSettings(): AudioSettings {
  return settings
}

export function setAudioSettings(next: AudioSettings) {
  settings = next
  syncMusic()
  void AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {})
}

const validLevel = (n: unknown): n is Level => n === 0 || n === 1 || n === 2 || n === 3

async function loadAudioSettings(): Promise<AudioSettings> {
  try {
    const raw = JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) ?? '{}')
    return {
      music: validLevel(raw.music) ? raw.music : DEFAULT_AUDIO.music,
      sfx: validLevel(raw.sfx) ? raw.sfx : DEFAULT_AUDIO.sfx,
      voice: validLevel(raw.voice) ? raw.voice : DEFAULT_AUDIO.voice,
    }
  } catch {
    return { ...DEFAULT_AUDIO }
  }
}
