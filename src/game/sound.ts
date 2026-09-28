/** Lightweight SFX via Web Audio (no audio files needed). */

let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new Ctx()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function unlockAudio() {
  ac()
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  gainStart: number,
  gainEnd = 0.001,
  delay = 0,
) {
  const audio = ac()
  if (!audio) return
  const t0 = audio.currentTime + delay
  const osc = audio.createOscillator()
  const g = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(gainStart, t0)
  g.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.0001), t0 + duration)
  osc.connect(g)
  g.connect(audio.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

function noiseBurst(duration: number, gainStart: number, filterFreq: number) {
  const audio = ac()
  if (!audio) return
  const len = Math.floor(audio.sampleRate * duration)
  const buffer = audio.createBuffer(1, len, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  }
  const src = audio.createBufferSource()
  src.buffer = buffer
  const filter = audio.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = filterFreq
  filter.Q.value = 0.8
  const g = audio.createGain()
  const t0 = audio.currentTime
  g.gain.setValueAtTime(gainStart, t0)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
  src.connect(filter)
  filter.connect(g)
  g.connect(audio.destination)
  src.start(t0)
  src.stop(t0 + duration + 0.02)
}

/** Gun fire — short crack + low thud */
export function playShoot() {
  noiseBurst(0.08, 0.35, 1800)
  tone(180, 0.09, 'square', 0.12, 0.001)
  tone(90, 0.12, 'triangle', 0.1, 0.001)
}

/** Character breaks — shatter crunch */
export function playBreak() {
  noiseBurst(0.22, 0.45, 900)
  tone(220, 0.15, 'sawtooth', 0.14, 0.001)
  tone(110, 0.28, 'triangle', 0.16, 0.001)
  tone(55, 0.35, 'sine', 0.12, 0.001, 0.04)
  tone(440, 0.08, 'square', 0.06, 0.001, 0.02)
}
