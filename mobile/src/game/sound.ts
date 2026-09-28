import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'

const POOL_SIZE = 3

type Pool = { players: AudioPlayer[]; next: number }

let shootPool: Pool | null = null
let breakPool: Pool | null = null

function makePool(source: number): Pool {
  return {
    players: Array.from({ length: POOL_SIZE }, () => createAudioPlayer(source)),
    next: 0,
  }
}

/** Load sounds once; call early (e.g. app start) so the first shot isn't delayed. */
export function initSound() {
  if (shootPool) return
  void setAudioModeAsync({ playsInSilentMode: true })
  shootPool = makePool(require('../../assets/sfx/shoot.wav'))
  breakPool = makePool(require('../../assets/sfx/break.wav'))
}

// Round-robin across players so rapid shots overlap instead of cutting each other off.
function play(pool: Pool | null) {
  if (!pool) return
  const player = pool.players[pool.next]
  pool.next = (pool.next + 1) % pool.players.length
  if (player.currentTime > 0) void player.seekTo(0)
  player.play()
}

export function playShoot() {
  play(shootPool)
}

export function playBreak() {
  play(breakPool)
}
