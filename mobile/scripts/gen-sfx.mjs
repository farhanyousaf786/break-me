// Synthesizes the game's sound effects into WAV files (mirrors the web version's Web Audio sounds).
// Run: node scripts/gen-sfx.mjs
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RATE = 22050
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sfx')

function buffer(seconds) {
  return new Float32Array(Math.ceil(RATE * seconds))
}

function decay(t, duration) {
  return Math.max(0, 1 - t / duration) ** 2
}

const waves = {
  sine: (p) => Math.sin(2 * Math.PI * p),
  square: (p) => (p % 1 < 0.5 ? 1 : -1),
  triangle: (p) => 4 * Math.abs((p % 1) - 0.5) - 1,
  sawtooth: (p) => 2 * (p % 1) - 1,
}

function addTone(buf, { freq, duration, type, gain, delay = 0, slide = 1 }) {
  const start = Math.floor(delay * RATE)
  let phase = 0
  for (let i = 0; i < duration * RATE && start + i < buf.length; i++) {
    const t = i / RATE
    const f = freq * slide ** (t / duration)
    phase += f / RATE
    buf[start + i] += waves[type](phase) * gain * decay(t, duration)
  }
}

function addNoise(buf, { duration, gain, smoothing }) {
  let last = 0
  for (let i = 0; i < duration * RATE && i < buf.length; i++) {
    const t = i / RATE
    last += smoothing * ((Math.random() * 2 - 1) - last)
    buf[i] += last * gain * decay(t, duration)
  }
}

function writeWav(name, buf) {
  let peak = 0
  for (const s of buf) peak = Math.max(peak, Math.abs(s))
  const norm = peak > 0 ? 0.9 / peak : 1

  const data = Buffer.alloc(buf.length * 2)
  buf.forEach((s, i) => data.writeInt16LE(Math.round(s * norm * 32767), i * 2))

  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(RATE, 24)
  header.writeUInt32LE(RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)

  writeFileSync(join(outDir, name), Buffer.concat([header, data]))
  console.log('wrote', name)
}

const shoot = buffer(0.16)
addNoise(shoot, { duration: 0.08, gain: 0.8, smoothing: 0.6 })
addTone(shoot, { freq: 180, duration: 0.09, type: 'square', gain: 0.3, slide: 0.5 })
addTone(shoot, { freq: 90, duration: 0.12, type: 'triangle', gain: 0.35, slide: 0.6 })
writeWav('shoot.wav', shoot)

const shatter = buffer(0.45)
addNoise(shatter, { duration: 0.22, gain: 0.9, smoothing: 0.35 })
addTone(shatter, { freq: 220, duration: 0.15, type: 'sawtooth', gain: 0.3, slide: 0.4 })
addTone(shatter, { freq: 110, duration: 0.28, type: 'triangle', gain: 0.35, slide: 0.5 })
addTone(shatter, { freq: 55, duration: 0.35, type: 'sine', gain: 0.3, delay: 0.04 })
addTone(shatter, { freq: 440, duration: 0.08, type: 'square', gain: 0.12, delay: 0.02 })
writeWav('break.wav', shatter)
