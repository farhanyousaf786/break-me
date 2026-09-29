// Synthesizes the game's sound effects into WAV files (mirrors the web version's Web Audio sounds).
// Run: node scripts/gen-sfx.mjs            (all files)
//      node scripts/gen-sfx.mjs shoot.wav  (only the named files)
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RATE = 22050
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sfx')
const only = process.argv.slice(2)

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
  if (only.length && !only.includes(name)) return
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

/* ---------------------------------------------------------------- gun shots */
// One shot per gun skin (guns.ts). Each voice is a factory returning a per-sample function, built
// from small stateful parts; `shot` soft-clips with `drive` and fades the last few ms (no clicks).

const lpK = (fc) => 1 - Math.exp((-2 * Math.PI * Math.min(fc, RATE * 0.45)) / RATE)
function osc() {
  let ph = 0
  return (f, type = 'sine') => {
    ph += f / RATE
    return waves[type](ph)
  }
}
function lowpass() {
  let y = 0
  return (x, fc) => (y += lpK(fc) * (x - y))
}
function highpass() {
  const lp = lowpass()
  return (x, fc) => x - lp(x, fc)
}
const white = () => Math.random() * 2 - 1
/** Attack ramp then exponential decay. */
const ar = (t, attack, tau) => (t < 0 ? 0 : Math.min(1, t / attack) * Math.exp(-t / tau))
/** Pitch that starts at `from` and settles toward `to`. */
const glide = (t, from, to, tau) => to + (from - to) * Math.exp(-t / tau)

function shot(name, seconds, drive, make) {
  if (only.length && !only.includes(name)) return
  const buf = buffer(seconds)
  const voice = make()
  const fade = 0.015 * RATE
  for (let i = 0; i < buf.length; i++) {
    buf[i] = Math.tanh(voice(i / RATE) * drive) * Math.min(1, (buf.length - i) / fade)
  }
  writeWav(name, buf)
}

/** Punchy cartoon blaster: click, bright snap, falling "pew" body, chest thump, short room. */
function blasterVoice() {
  const body = osc()
  const sub = osc()
  const snapLp = lowpass()
  const snapHp = highpass()
  const room = lowpass()
  let prev = 0
  return (t) => {
    const w = white()
    const click = (w - prev) * Math.exp(-t / 0.0018) * 0.7
    prev = w
    const snap = snapHp(snapLp(w, glide(t, 7000, 1400, 0.025)), 450) * ar(t, 0.0008, 0.028) * 1.5
    const pew = body(glide(t, 1100, 170, 0.03), 'triangle') * ar(t, 0.002, 0.055) * 0.5
    const thump = sub(glide(t, 170, 48, 0.022)) * ar(t, 0.002, 0.075)
    const tail = room(w, 800) * (t < 0.018 ? 0 : Math.exp(-(t - 0.018) / 0.07)) * 0.55
    return click + snap + pew + thump + tail
  }
}

shot('shoot.wav', 0.32, 1.3, blasterVoice)

shot('shoot-pistol.wav', 0.2, 1.2, () => {
  const pop = osc()
  const sub = osc()
  const lp = lowpass()
  const hp = highpass()
  return (t) => {
    const w = white()
    const snap = hp(lp(w, glide(t, 9000, 2500, 0.012)), 900) * ar(t, 0.0005, 0.018) * 1.4
    const tone = pop(glide(t, 1400, 380, 0.018)) * ar(t, 0.001, 0.03) * 0.6
    return snap + tone + sub(glide(t, 220, 90, 0.02)) * ar(t, 0.002, 0.04) * 0.5
  }
})

shot('shoot-water.wav', 0.34, 1, () => {
  const lp = lowpass()
  const hp = highpass()
  const bloop = osc()
  return (t) => {
    const gurgle = 1 + 0.55 * Math.sin(2 * Math.PI * 26 * t)
    const squirt = hp(lp(white(), glide(t, 3800, 900, 0.12)), 500) * ar(t, 0.012, 0.11) * gurgle * 1.6
    return squirt + bloop(glide(t, 520, 240, 0.04)) * ar(t, 0.003, 0.05) * 0.45
  }
})

shot('shoot-snow.wav', 0.22, 1.2, () => {
  const lp = lowpass()
  const sub = osc()
  return (t) =>
    lp(white(), glide(t, 2600, 400, 0.03)) * ar(t, 0.002, 0.045) * 1.8 +
    sub(glide(t, 150, 60, 0.02)) * ar(t, 0.002, 0.05) * 0.6
})

shot('shoot-bubble.wav', 0.26, 1, () => {
  const a = osc()
  const b = osc()
  let prev = 0
  return (t) => {
    const w = white()
    const click = (w - prev) * Math.exp(-t / 0.0015) * 0.4
    prev = w
    const first = a(280 + 900 * (1 - Math.exp(-t / 0.045))) * ar(t, 0.003, 0.06)
    const t2 = t - 0.08
    const second = t2 < 0 ? 0 : b(420 + 1300 * (1 - Math.exp(-t2 / 0.035))) * ar(t2, 0.003, 0.04) * 0.55
    return click + first + second
  }
})

shot('shoot-plunger.wav', 0.3, 1.3, () => {
  const pop = osc()
  const rubber = osc()
  const hp = highpass()
  return (t) =>
    pop(glide(t, 750, 180, 0.028)) * ar(t, 0.001, 0.06) * 0.8 +
    rubber(170 * (1 + 0.08 * Math.sin(2 * Math.PI * 30 * t)), 'triangle') * ar(t, 0.005, 0.08) * 0.4 +
    hp(white(), 2500) * ar(t, 0.0008, 0.01) * 0.6
})

shot('shoot-double.wav', 0.55, 1.7, () => {
  const lp1 = lowpass()
  const lp2 = lowpass()
  const room = lowpass()
  const sub = osc()
  const pumpHp = highpass()
  let prev = 0
  return (t) => {
    const w = white()
    const crack = (w - prev) * Math.exp(-t / 0.003) * 0.9
    prev = w
    const fc = glide(t, 6500, 260, 0.045)
    const blast = lp2(lp1(w, fc), fc) * ar(t, 0.001, 0.07) * 2.2
    const thump = sub(glide(t, 130, 38, 0.03)) * ar(t, 0.002, 0.11) * 1.1
    const tail = room(w, 650) * (t < 0.03 ? 0 : Math.exp(-(t - 0.03) / 0.12)) * 0.8
    // Pump-action "chk-chk" after the blast.
    const pump = pumpHp(w, 1800) * (ar(t - 0.34, 0.001, 0.012) + ar(t - 0.41, 0.001, 0.014)) * 0.7
    return crack + blast + thump + tail + pump
  }
})

shot('shoot-crossbow.wav', 0.42, 1.2, () => {
  const N = Math.round(RATE / 196)
  const line = Float32Array.from({ length: N }, () => white())
  let k = 0
  const air = lowpass()
  const airHp = highpass()
  return (t) => {
    const next = (k + 1) % N
    const s = line[k]
    line[k] = 0.5 * (line[k] + line[next]) * 0.994
    k = next
    const whoosh = airHp(air(white(), 2200), 500) * ar(t - 0.01, 0.03, 0.06) * 0.5
    return s * Math.min(1, t / 0.002) * 0.9 + whoosh
  }
})

shot('shoot-ray.wav', 0.26, 1, () => {
  const sq = osc()
  const lp = lowpass()
  return (t) => {
    const f = glide(t, 2400, 280, 0.06) * (1 + 0.06 * Math.sin(2 * Math.PI * 45 * t))
    return lp(sq(f, 'square'), 3200) * ar(t, 0.002, 0.09) * 0.7
  }
})

shot('shoot-carrot.wav', 0.3, 1.4, () => {
  const sub = osc()
  const fwoop = osc()
  const hp = highpass()
  return (t) => {
    const crunch = hp(white(), 1500) * (Math.random() < 0.45 ? 1 : 0.15) * ar(t, 0.001, 0.028) * 0.9
    return (
      sub(glide(t, 190, 55, 0.03)) * ar(t, 0.002, 0.09) +
      crunch +
      fwoop(glide(t, 300, 650, 0.08), 'triangle') * ar(t, 0.01, 0.06) * 0.25
    )
  }
})

shot('shoot-confetti.wav', 0.5, 1.3, () => {
  const pop = osc()
  const lp = lowpass()
  const hp = highpass()
  const bell = osc()
  return (t) => {
    const w = white()
    const burst = lp(w, glide(t, 5500, 800, 0.03)) * ar(t, 0.001, 0.03) * 1.3
    const body = pop(glide(t, 900, 200, 0.02)) * ar(t, 0.001, 0.04) * 0.7
    const crackle = t > 0.05 && Math.random() < 0.012 ? hp(w * 6, 2000) : hp(0, 2000)
    const sparkle = bell(2637) * ar(t - 0.06, 0.002, 0.1) * 0.18
    return burst + body + crackle * Math.exp(-t / 0.2) * 0.5 + sparkle
  }
})

shot('shoot-duck.wav', 0.26, 1.5, () => {
  const saw = osc()
  const lp1 = lowpass()
  const lp2 = lowpass()
  const hp = highpass()
  const sub = osc()
  return (t) => {
    const f = glide(t, 640, 430, 0.1)
    const nasal = hp(lp2(lp1(saw(f, 'sawtooth'), 1900), 1900), 450)
    const env = Math.min(1, t / 0.012) * (t < 0.14 ? 1 : Math.exp(-(t - 0.14) / 0.03))
    return nasal * env * (0.8 + 0.2 * Math.sin(2 * Math.PI * 18 * t)) + sub(glide(t, 160, 70, 0.02)) * ar(t, 0.002, 0.04) * 0.5
  }
})

shot('shoot-candy.wav', 0.32, 1.2, () => {
  const pop = osc()
  const b1 = osc()
  const b2 = osc()
  let prev = 0
  return (t) => {
    const w = white()
    const click = (w - prev) * Math.exp(-t / 0.0015) * 0.6
    prev = w
    return (
      click +
      pop(glide(t, 1600, 480, 0.012)) * ar(t, 0.0005, 0.022) +
      b1(2093) * ar(t - 0.03, 0.002, 0.11) * 0.25 +
      b2(3136) * ar(t - 0.055, 0.002, 0.09) * 0.18
    )
  }
})

shot('shoot-minigun.wav', 0.22, 1.4, () => {
  const lp = lowpass()
  const hp = highpass()
  const subs = [osc(), osc(), osc()]
  const whir = osc()
  const whirLp = lowpass()
  return (t) => {
    const w = hp(lp(white(), 6000), 600)
    let s = 0
    subs.forEach((o, n) => {
      const tn = t - n * 0.05
      if (tn < 0) return
      const g = 1 - n * 0.2
      s += (w * ar(tn, 0.0006, 0.015) * 1.3 + o(glide(tn, 200, 70, 0.015)) * ar(tn, 0.001, 0.03) * 0.7) * g
    })
    return s + whirLp(whir(95, 'sawtooth'), 500) * ar(t, 0.01, 0.12) * 0.2
  }
})

shot('shoot-grenade.wav', 0.36, 1.3, () => {
  const tube = osc()
  const overtone = osc()
  const air = lowpass()
  const ring = osc()
  return (t) => {
    const f = glide(t, 330, 140, 0.05)
    return (
      tube(f) * ar(t, 0.002, 0.1) * 0.9 +
      overtone(f * 2) * ar(t, 0.002, 0.06) * 0.3 +
      air(white(), 1200) * ar(t, 0.002, 0.05) * 0.9 +
      ring(920) * ar(t, 0.001, 0.05) * 0.15
    )
  }
})

shot('shoot-laser.wav', 0.3, 1, () => {
  let cph = 0
  let mph = 0
  const hp = highpass()
  return (t) => {
    const f = glide(t, 3200, 480, 0.07)
    cph += f / RATE
    mph += (f * 1.5) / RATE
    const index = 3 * Math.exp(-t / 0.08)
    const zap = Math.sin(2 * Math.PI * cph + index * Math.sin(2 * Math.PI * mph))
    return zap * ar(t, 0.002, 0.1) * 0.7 + hp(white(), 4000) * ar(t, 0.001, 0.02) * 0.2
  }
})

shot('shoot-rocket.wav', 0.62, 1.4, () => {
  const sub = osc()
  const lp = lowpass()
  const hp = highpass()
  return (t) => {
    const whoosh = hp(lp(white(), 300 + 4200 * (1 - Math.exp(-t / 0.22))), 120)
    const hiss = Math.min(1, t / 0.03) * Math.exp(-t / 0.24) * 1.5
    const crackle = Math.random() < 0.02 ? white() * 0.8 * Math.exp(-t / 0.3) : 0
    return sub(glide(t, 150, 40, 0.04)) * ar(t, 0.002, 0.1) + whoosh * hiss + crackle
  }
})

shot('shoot-thunder.wav', 0.46, 1.6, () => {
  const hp = highpass()
  const rumble = lowpass()
  const saw = osc()
  let gate = 1
  let nextFlip = 0
  return (t) => {
    if (t >= nextFlip) {
      gate = Math.random() < 0.6 ? 1 : 0.1
      nextFlip = t + 0.002 + Math.random() * 0.005
    }
    const w = white()
    const crackle = hp(w, 900) * gate * ar(t, 0.001, 0.12) * 1.2
    const zap = saw(glide(t, 1800, 200, 0.05), 'sawtooth') * ar(t, 0.001, 0.06) * 0.3
    return crackle + zap + rumble(w, 150) * ar(t, 0.02, 0.2) * 2.5
  }
})

shot('shoot-golden.wav', 0.45, 1.3, () => {
  const blaster = blasterVoice()
  const chime = osc()
  const chime2 = osc()
  return (t) =>
    blaster(t) * 0.9 + chime(1568) * ar(t - 0.02, 0.002, 0.16) * 0.28 + chime2(2349) * ar(t - 0.05, 0.002, 0.14) * 0.22
})

/* ------------------------------------------------------------------ UI tap */

const tap = buffer(0.07)
addTone(tap, { freq: 900, duration: 0.05, type: 'sine', gain: 0.8, slide: 1.6 })
addTone(tap, { freq: 1800, duration: 0.02, type: 'triangle', gain: 0.25 })
writeWav('tap.wav', tap)

/* ------------------------------------------------------- character voices */
// Tiny cartoon voices built from scratch: a harmonic buzz shaped by moving vowel formants.

const lerp = (a, b, t) => a + (b - a) * t

/** Piecewise-linear curve through [time 0..1, value] points. */
function curve(points) {
  return (t) => {
    for (let i = 1; i < points.length; i++) {
      const [t1, v1] = points[i]
      const [t0, v0] = points[i - 1]
      if (t <= t1) return lerp(v0, v1, (t - t0) / (t1 - t0 || 1))
    }
    return points[points.length - 1][1]
  }
}

// Adult vowel formants (F1, F2, F3); scaled up so the voices sound small and squeaky.
const VOWELS = {
  i: [270, 2290, 3010],
  e: [530, 1840, 2480],
  ae: [660, 1720, 2410],
  a: [730, 1090, 2440],
  o: [570, 840, 2410],
  u: [300, 870, 2240],
}
const TINY = 1.35

function syllable(buf, { delay = 0, duration, pitch, vowels, breath = 0.15, gain = 1 }) {
  const start = Math.floor(delay * RATE)
  const n = Math.floor(duration * RATE)
  const vowelAt = curve(vowels.map(([t], i) => [t, i]))
  const phases = new Float64Array(40)
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const t = i / RATE
    const u = i / n
    const f0 = pitch(u) * (1 + 0.035 * Math.sin(2 * Math.PI * 7 * t))
    const vi = vowelAt(u)
    const lo = Math.floor(vi)
    const hi = Math.min(vowels.length - 1, lo + 1)
    const formants = VOWELS[vowels[lo][1]].map((f, k) => lerp(f, VOWELS[vowels[hi][1]][k], vi - lo) * TINY)
    const env = Math.min(1, u / 0.08) * Math.min(1, (1 - u) / 0.25)
    let s = 0
    for (let h = 1; h < phases.length; h++) {
      const fh = f0 * h
      if (fh > RATE * 0.45) break
      phases[h] += fh / RATE
      let shape = 0
      formants.forEach((F, k) => {
        const bw = 90 + F * 0.08
        shape += (k === 0 ? 1 : 0.6) / (1 + ((fh - F) / bw) ** 2)
      })
      s += Math.sin(2 * Math.PI * phases[h]) * shape / Math.sqrt(h)
    }
    const aspiration = (Math.random() * 2 - 1) * breath * Math.max(0, 1 - u / 0.15)
    buf[start + i] += (s + aspiration) * env * gain
  }
}

const yay = buffer(0.5)
syllable(yay, {
  duration: 0.48,
  pitch: curve([[0, 560], [0.3, 800], [1, 640]]),
  vowels: [[0, 'i'], [0.3, 'ae'], [0.75, 'e'], [1, 'i']],
})
writeWav('voice-yay.wav', yay)

const woo = buffer(0.4)
syllable(woo, {
  duration: 0.38,
  pitch: curve([[0, 430], [0.6, 720], [1, 680]]),
  vowels: [[0, 'u'], [0.5, 'o'], [1, 'u']],
})
writeWav('voice-woo.wav', woo)

const wee = buffer(0.3)
syllable(wee, {
  duration: 0.28,
  pitch: curve([[0, 720], [0.7, 1080], [1, 1000]]),
  vowels: [[0, 'u'], [0.25, 'i'], [1, 'i']],
})
writeWav('voice-wee.wav', wee)

const hehe = buffer(0.34)
syllable(hehe, { duration: 0.13, pitch: curve([[0, 640], [1, 600]]), vowels: [[0, 'e'], [1, 'e']], breath: 0.6 })
syllable(hehe, {
  delay: 0.18,
  duration: 0.15,
  pitch: curve([[0, 700], [1, 640]]),
  vowels: [[0, 'e'], [1, 'i']],
  breath: 0.6,
})
writeWav('voice-hehe.wav', hehe)

const ouch = buffer(0.4)
syllable(ouch, {
  duration: 0.38,
  pitch: curve([[0, 820], [0.25, 900], [1, 460]]),
  vowels: [[0, 'a'], [0.55, 'o'], [1, 'u']],
})
writeWav('voice-ouch.wav', ouch)

const eek = buffer(0.24)
syllable(eek, {
  duration: 0.22,
  pitch: curve([[0, 1000], [0.4, 1400], [1, 1150]]),
  vowels: [[0, 'i'], [1, 'i']],
})
writeWav('voice-eek.wav', eek)

const aww = buffer(0.55)
syllable(aww, {
  duration: 0.52,
  pitch: curve([[0, 560], [0.3, 600], [1, 380]]),
  vowels: [[0, 'ae'], [0.4, 'a'], [1, 'o']],
})
writeWav('voice-aww.wav', aww)

// Rubber-toy squeak.
const squeak = buffer(0.16)
{
  let phase = 0
  const pitch = curve([[0, 1500], [0.35, 2700], [1, 1900]])
  for (let i = 0; i < squeak.length; i++) {
    const u = i / squeak.length
    phase += (pitch(u) * (1 + 0.06 * Math.sin(2 * Math.PI * 38 * (i / RATE)))) / RATE
    const env = Math.min(1, u / 0.1) * (1 - u)
    squeak[i] = (Math.sin(2 * Math.PI * phase) + 0.3 * Math.sin(4 * Math.PI * phase)) * env
  }
}
writeWav('voice-squeak.wav', squeak)

/* ------------------------------------------------------------ cute gun shots */
// Softer, toy-like shots for the cute and premium guns (after the voices so `syllable` exists).

/** Music-box style FM bell. */
function bellVoice(freq, delay, tau, gain) {
  let ph = 0
  let mph = 0
  return (t) => {
    const u = t - delay
    if (u < 0) return 0
    ph += freq / RATE
    mph += (freq * 3.5) / RATE
    return Math.sin(2 * Math.PI * ph + 1.6 * Math.exp(-u * 18) * Math.sin(2 * Math.PI * mph)) * ar(u, 0.002, tau) * gain
  }
}

/** Soft rounded "pop" (like a cork or a bubble). */
function popVoice(from, to, tau, gain) {
  const o = osc()
  let prev = 0
  return (t) => {
    const w = white()
    const click = (w - prev) * Math.exp(-t / 0.0012) * 0.25
    prev = w
    return click + o(glide(t, from, to, tau)) * ar(t, 0.0008, tau * 1.6) * gain
  }
}

shot('shoot-star.wav', 0.34, 1, () => {
  const a = bellVoice(1760, 0, 0.1, 0.8)
  const b = bellVoice(2637, 0.045, 0.14, 0.7)
  const pop = popVoice(1400, 700, 0.015, 0.6)
  const hp = highpass()
  return (t) => a(t) + b(t) + pop(t) + hp(white(), 6000) * ar(t, 0.01, 0.06) * 0.08
})

{
  if (!only.length || only.includes('shoot-kitty.wav')) {
    const mew = buffer(0.26)
    syllable(mew, { duration: 0.22, pitch: curve([[0, 900], [0.3, 1250], [1, 820]]), vowels: [[0, 'i'], [0.4, 'ae'], [1, 'u']], breath: 0.05 })
    const pop = popVoice(1200, 500, 0.012, 0.9)
    for (let i = 0; i < mew.length; i++) {
      const t = i / RATE
      mew[i] = Math.tanh((mew[i] * 0.5 + pop(t)) * 1.2) * Math.min(1, (mew.length - i) / (0.015 * RATE))
    }
    writeWav('shoot-kitty.wav', mew)
  }
}

shot('shoot-banana.wav', 0.34, 1.1, () => {
  const o = osc()
  const pop = popVoice(700, 300, 0.012, 0.6)
  return (t) => {
    const boing = 220 + 380 * Math.exp(-t / 0.08) + 60 * Math.sin(2 * Math.PI * 16 * t) * Math.exp(-t / 0.15)
    return o(boing) * ar(t, 0.003, 0.12) * 0.8 + pop(t)
  }
})

shot('shoot-bee.wav', 0.28, 1.3, () => {
  const saw = osc()
  const lp = lowpass()
  const pop = popVoice(900, 400, 0.01, 0.5)
  return (t) => {
    const f = glide(t, 330, 250, 0.1) * (1 + 0.03 * Math.sin(2 * Math.PI * 22 * t))
    const buzz = lp(saw(f, 'sawtooth'), 1600) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 55 * t))
    return buzz * Math.min(1, t / 0.01) * Math.exp(-t / 0.09) * 0.8 + pop(t)
  }
})

shot('shoot-music.wav', 0.42, 1, () => {
  const a = bellVoice(1047, 0, 0.16, 0.8)
  const b = bellVoice(1319, 0.06, 0.16, 0.7)
  const c = bellVoice(1568, 0.12, 0.2, 0.6)
  return (t) => a(t) + b(t) + c(t)
})

shot('shoot-cupcake.wav', 0.36, 1.1, () => {
  const lp = lowpass()
  const sub = osc()
  const sparkle = bellVoice(2093, 0.04, 0.12, 0.35)
  return (t) =>
    lp(white(), glide(t, 2200, 350, 0.025)) * ar(t, 0.002, 0.04) * 1.3 +
    sub(glide(t, 260, 110, 0.03)) * ar(t, 0.002, 0.05) * 0.6 +
    sparkle(t)
})

// Premium: burst guns replay their shot per bullet, so these stay short and bright.
shot('shoot-twin.wav', 0.2, 1.1, () => {
  const o = osc()
  const pop = popVoice(1100, 500, 0.01, 0.5)
  const shine = bellVoice(2349, 0.015, 0.06, 0.25)
  return (t) => o(glide(t, 1900, 620, 0.03), 'triangle') * ar(t, 0.001, 0.05) * 0.8 + pop(t) + shine(t)
})

shot('shoot-triple.wav', 0.28, 1.1, () => {
  const os = [osc(), osc(), osc()]
  const pop = popVoice(1000, 450, 0.012, 0.5)
  return (t) =>
    os.reduce((s, o, i) => s + o(glide(t, 1500 * [1, 1.26, 1.5][i], 600 * [1, 1.26, 1.5][i], 0.035)) * ar(t, 0.001, 0.07), 0) * 0.35 +
    pop(t)
})

shot('shoot-sprinkle.wav', 0.34, 1.2, () => {
  const hp = highpass()
  const pop = popVoice(1300, 600, 0.012, 0.6)
  const tinkle = bellVoice(3136, 0.07, 0.08, 0.2)
  return (t) => {
    const shake = ar(t, 0.001, 0.02) + ar(t - 0.05, 0.001, 0.02) * 0.8 + ar(t - 0.1, 0.001, 0.025) * 0.6
    return hp(white(), 3500) * shake * 0.9 + pop(t) + tinkle(t)
  }
})

shot('shoot-rainbow.wav', 0.24, 1, () => {
  const a = bellVoice(1319, 0, 0.08, 0.7)
  const b = bellVoice(1976, 0.02, 0.1, 0.5)
  const pop = popVoice(1600, 700, 0.01, 0.5)
  return (t) => a(t) + b(t) + pop(t)
})

shot('shoot-dragon.wav', 0.42, 1.4, () => {
  const lp = lowpass()
  const hp = highpass()
  const growl = osc()
  const growlLp = lowpass()
  return (t) => {
    const fire = hp(lp(white(), glide(t, 900, 2600, 0.12)), 200) * Math.min(1, t / 0.02) * Math.exp(-t / 0.14) * 1.4
    const roar = growlLp(growl(glide(t, 180, 110, 0.1), 'sawtooth'), 700) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 32 * t))
    return fire + roar * ar(t, 0.01, 0.1) * 0.6
  }
})

/* ------------------------------------------------------------ more guns */

// Rubber band "thwip" and a little pebble click.
shot('shoot-slingshot.wav', 0.24, 1.2, () => {
  const band = osc()
  const pop = popVoice(900, 350, 0.01, 0.4)
  const hp = highpass()
  return (t) => {
    const twang = band(glide(t, 180, 90, 0.05) * (1 + 0.08 * Math.sin(2 * Math.PI * 38 * t)), 'triangle') * ar(t, 0.002, 0.07) * 0.8
    return twang + hp(white(), 2500) * ar(t, 0.0008, 0.012) * 0.8 + pop(t)
  }
})

// Doughy "fwump" with a cheesy boing.
shot('shoot-pizza.wav', 0.3, 1.2, () => {
  const lp = lowpass()
  const o = osc()
  return (t) =>
    lp(white(), glide(t, 1400, 300, 0.03)) * ar(t, 0.003, 0.05) * 1.4 +
    o(260 + 200 * Math.exp(-t / 0.05) + 40 * Math.sin(2 * Math.PI * 18 * t)) * ar(t, 0.004, 0.08) * 0.55
})

// Tiny spooky "wooOOo".
shot('shoot-ghost.wav', 0.4, 1, () => {
  const o = osc()
  const lp = lowpass()
  return (t) => {
    const f = 520 + 260 * Math.sin(Math.PI * Math.min(1, t / 0.35)) * (1 + 0.04 * Math.sin(2 * Math.PI * 7 * t))
    return lp(o(f, 'triangle'), 1800) * Math.min(1, t / 0.03) * Math.exp(-t / 0.16) * 0.8
  }
})

// Soft squishy toss.
shot('shoot-donut.wav', 0.28, 1.1, () => {
  const pop = popVoice(520, 200, 0.02, 0.8)
  const shine = bellVoice(1760, 0.03, 0.08, 0.25)
  const lp = lowpass()
  return (t) => pop(t) + shine(t) + lp(white(), 900) * ar(t, 0.004, 0.03) * 0.6
})

// Crystal "tsching" with a frosty hiss.
shot('shoot-ice.wav', 0.38, 1.1, () => {
  const a = bellVoice(2637, 0, 0.12, 0.6)
  const b = bellVoice(3951, 0.01, 0.09, 0.4)
  const hp = highpass()
  return (t) => a(t) + b(t) + hp(white(), 5000) * ar(t, 0.004, 0.09) * 0.35
})

// Magical harp-ish sparkle run.
shot('shoot-unicorn.wav', 0.42, 1, () => {
  const notes = [1319, 1568, 1976, 2637].map((f, i) => bellVoice(f, i * 0.035, 0.12, 0.5))
  const pop = popVoice(1200, 600, 0.01, 0.35)
  return (t) => notes.reduce((s, n) => s + n(t), 0) + pop(t)
})

// Hollow pumpkin "bonk" plus scattered candy rattle.
shot('shoot-pumpkin.wav', 0.32, 1.2, () => {
  const o = osc()
  const hp = highpass()
  return (t) => {
    const bonk = o(glide(t, 320, 150, 0.03)) * ar(t, 0.002, 0.06) * 0.9
    const rattle = hp(white(), 3000) * (ar(t - 0.02, 0.001, 0.012) + ar(t - 0.05, 0.001, 0.012) * 0.7 + ar(t - 0.08, 0.001, 0.012) * 0.5)
    return bonk + rattle * 0.8
  }
})

// Short electric crackle (burst gun: stays very short).
shot('shoot-storm.wav', 0.16, 1.4, () => {
  const saw = osc()
  const hp = highpass()
  return (t) => {
    const zap = saw(glide(t, 1800, 400, 0.02) * (1 + 0.3 * Math.sin(2 * Math.PI * 120 * t)), 'sawtooth') * ar(t, 0.001, 0.03) * 0.5
    return zap + hp(white(), 2000) * ar(t, 0.0005, 0.02) * (0.6 + 0.4 * Math.sign(Math.sin(2 * Math.PI * 90 * t)))
  }
})

// Cosmic "vwoom" with a twinkle.
shot('shoot-galaxy.wav', 0.3, 1.2, () => {
  const o = osc()
  const sub = osc()
  const twinkle = bellVoice(3136, 0.03, 0.08, 0.3)
  return (t) =>
    o(glide(t, 300, 1400, 0.05), 'triangle') * ar(t, 0.004, 0.06) * 0.6 +
    sub(glide(t, 120, 60, 0.05)) * ar(t, 0.003, 0.08) * 0.6 +
    twinkle(t)
})

/* ------------------------------------------------------------ break + lose */

// Toy-glass shatter: impact thump, sharp crack, bright shatter body, a spray of glass tinkles and a
// soft cartoon "pomf", with a little sparkle at the end.
shot('break.wav', 0.75, 1.3, () => {
  const sub = osc()
  const crackHp = highpass()
  const bodyLp = lowpass()
  const bodyHp = highpass()
  const pomf = lowpass()
  const pings = Array.from({ length: 22 }, () => {
    const delay = 0.015 + Math.random() ** 1.6 * 0.45
    return { delay, f: 2400 + Math.random() * 3800, tau: 0.025 + Math.random() * 0.06, gain: 0.35 * (1 - delay * 1.4), o: osc() }
  })
  const sparkle1 = bellVoice(2093, 0.12, 0.18, 0.25)
  const sparkle2 = bellVoice(3136, 0.2, 0.16, 0.18)
  return (t) => {
    const w = white()
    const thump = sub(glide(t, 170, 42, 0.035)) * ar(t, 0.002, 0.12) * 1.1
    const crack = crackHp(w, 2500) * ar(t, 0.0004, 0.012) * 1.4
    const body = bodyHp(bodyLp(w, glide(t, 9000, 1800, 0.06)), 1400) * ar(t, 0.001, 0.07) * 1.2
    const soft = pomf(w, 500) * ar(t, 0.003, 0.08) * 1.2
    let glass = 0
    for (const p of pings) {
      const u = t - p.delay
      if (u >= 0) glass += p.o(p.f) * ar(u, 0.0008, p.tau) * p.gain
    }
    return thump + crack + body + soft + glass + sparkle1(t) + sparkle2(t)
  }
})

// Cartoon "you're out" after a break: a wobbly slide whistle falling away, then a soft bonk and
// two little rubbery bounces.
shot('die.wav', 1.05, 1.1, () => {
  const whistle = osc()
  const breathHp = highpass()
  const bonk = osc()
  const bounces = [
    [0.74, 0.12, 0.35],
    [0.86, 0.08, 0.2],
  ].map(([delay, tau, gain]) => ({ delay, tau, gain, o: osc() }))
  return (t) => {
    let s = 0
    if (t < 0.7) {
      const u = t / 0.7
      const f = 1500 * (180 / 1500) ** (u ** 1.3) * (1 + 0.05 * Math.sin(2 * Math.PI * 9 * t))
      const env = Math.min(1, t / 0.02) * (1 - u ** 3)
      s += (whistle(f) * 0.8 + breathHp(white(), 3000) * 0.06) * env * 0.7
    }
    const b = t - 0.68
    if (b >= 0) s += bonk(glide(b, 260, 90, 0.04)) * ar(b, 0.002, 0.07) * 0.9
    for (const x of bounces) {
      const u = t - x.delay
      if (u >= 0) s += x.o(glide(u, 520, 300, 0.03)) * ar(u, 0.002, x.tau) * x.gain
    }
    return s
  }
})

{
  const want = (name) => !only.length || only.includes(name)

  if (want('voice-uhoh.wav')) {
    const uhoh = buffer(0.5)
    syllable(uhoh, { duration: 0.17, pitch: curve([[0, 760], [1, 820]]), vowels: [[0, 'a'], [1, 'u']], breath: 0.05 })
    syllable(uhoh, { delay: 0.22, duration: 0.26, pitch: curve([[0, 620], [0.5, 580], [1, 500]]), vowels: [[0, 'o'], [1, 'o']], breath: 0.05 })
    writeWav('voice-uhoh.wav', uhoh)
  }

  if (want('voice-oof.wav')) {
    const oof = buffer(0.3)
    syllable(oof, { duration: 0.2, pitch: curve([[0, 640], [0.3, 700], [1, 470]]), vowels: [[0, 'u'], [1, 'o']], breath: 0.1 })
    // Soft "f" at the end.
    let lp = 0
    for (let i = Math.floor(0.17 * RATE); i < oof.length; i++) {
      const u = (i / RATE - 0.17) / 0.12
      const w = Math.random() * 2 - 1
      lp += 0.5 * (w - lp)
      oof[i] += (w - lp) * 0.25 * Math.max(0, 1 - u) * Math.min(1, u * 8)
    }
    writeWav('voice-oof.wav', oof)
  }

  // Cartoon sad trombone, sung by a buddy: "wah wah wah waaaah".
  if (want('voice-wahwah.wav')) {
    const wah = buffer(1.75)
    const notes = [
      [0, 0.26, 466],
      [0.3, 0.26, 440],
      [0.6, 0.26, 415],
      [0.9, 0.8, 392],
    ]
    notes.forEach(([delay, duration, f], i) => {
      const last = i === notes.length - 1
      syllable(wah, {
        delay,
        duration,
        pitch: last ? curve([[0, f], [0.25, f], [1, f * 0.94]]) : curve([[0, f * 0.97], [0.2, f], [1, f]]),
        vowels: [[0, 'u'], [0.25, 'a'], [last ? 0.8 : 0.8, 'a'], [1, 'u']],
        breath: 0.04,
      })
    })
    // Extra wobble on the long last note.
    for (let i = Math.floor(1.05 * RATE); i < wah.length; i++) {
      wah[i] *= 0.85 + 0.15 * Math.sin(2 * Math.PI * 6 * (i / RATE))
    }
    writeWav('voice-wahwah.wav', wah)
  }
}

/* -------------------------------------------------------- power-up sounds */

// Bubble pop plus a quick rising sparkle arpeggio.
shot('powerup.wav', 0.5, 1, () => {
  const pop = popVoice(500, 1400, 0.02, 0.7)
  const notes = [1047, 1319, 1568, 2093].map((f, i) => bellVoice(f, 0.03 + i * 0.055, 0.14, 0.55))
  return (t) => pop(t) + notes.reduce((s, n) => s + n(t), 0)
})

// Shield absorbing a hit: bright metallic "dink" with a shimmering tail.
shot('shield.wav', 0.45, 1.2, () => {
  const ring1 = bellVoice(1480, 0, 0.18, 0.7)
  const ring2 = bellVoice(2217, 0.004, 0.14, 0.5)
  const hp = highpass()
  const sub = osc()
  return (t) =>
    ring1(t) + ring2(t) + hp(white(), 3000) * ar(t, 0.0005, 0.02) * 0.6 + sub(glide(t, 300, 120, 0.03)) * ar(t, 0.001, 0.05) * 0.5
})

/* ------------------------------------------------------------------ music */
// "Cloud Nap": original lo-fi loop composed here (nothing sampled). Soft electric-piano chords, a
// round sine bass, brushed swung drums, a breathy flute-like melody and a little vinyl crackle.
// Everything wraps past the end back to the start (including echoes and reverb), so it loops seamlessly.

const BPM = 76
const STEP = 60 / BPM / 4 // sixteenth note
const BAR = 16
const BARS = 16
const LEN = Math.round(BARS * BAR * STEP * RATE)
const SWING = 0.3 // off-beat eighths land a bit late
const midi = (m) => 440 * 2 ** ((m - 69) / 12)
const lpCoef = (fc) => 1 - Math.exp((-2 * Math.PI * fc) / RATE)
const TAU = 2 * Math.PI

let seed = 11
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

const bus = {
  keys: new Float32Array(LEN),
  bass: new Float32Array(LEN),
  lead: new Float32Array(LEN),
  drums: new Float32Array(LEN),
  air: new Float32Array(LEN),
}
const at = (step) => Math.round(step * STEP * RATE)
const swung = (step) => (step % 4 === 2 ? step + SWING * 2 : step)
const put = (out, i, v) => (out[((i % LEN) + LEN) % LEN] += v)

/** Rhodes-style electric piano: FM tine that softens as it rings, with a slow tremolo. */
function epiano(freq, start, hold, gain) {
  const total = Math.round((hold + 1.1) * RATE)
  let ph = 0
  let mph = 0
  let lp = 0
  for (let i = 0; i < total; i++) {
    const t = i / RATE
    ph += freq / RATE
    mph += freq / RATE
    const idx = 1.1 * Math.exp(-t * 3.5) + 0.15
    const tine = Math.sin(TAU * ph * 4.02) * 0.12 * Math.exp(-t * 14)
    const x = Math.sin(TAU * ph + idx * Math.sin(TAU * mph)) + tine
    lp += lpCoef(2400) * (x - lp)
    const env = Math.min(1, t / 0.006) * Math.exp(-t * 0.9) * (t < hold ? 1 : Math.max(0, 1 - (t - hold) / 1.1))
    const trem = 1 - 0.12 * (0.5 + 0.5 * Math.sin(TAU * 4.2 * ((start + i) / RATE)))
    put(bus.keys, start + i, lp * env * trem * gain)
  }
}

/** Lazy strum: each chord note starts a few milliseconds after the one below it. */
function strum(notes, step, steps, gain) {
  const start = at(step)
  notes.forEach((m, k) => epiano(midi(m), start + Math.round(k * 0.014 * RATE), steps * STEP - k * 0.014, gain))
}

function bass(freq, step, steps) {
  const start = at(step)
  const hold = steps * STEP
  const total = Math.round((hold + 0.2) * RATE)
  let ph = 0
  for (let i = 0; i < total; i++) {
    const t = i / RATE
    ph += freq / RATE
    const env = Math.min(1, t / 0.03) * (t < hold ? 1 - 0.25 * (t / hold) : 0.75 * Math.max(0, 1 - (t - hold) / 0.2))
    put(bus.bass, start + i, (Math.sin(TAU * ph) + 0.18 * Math.sin(TAU * ph * 2)) * env * 0.3)
  }
}

/** Breathy flute: sine with a touch of octave, a slow swell, gentle vibrato and a little air. */
function flute(freq, step, steps) {
  const start = at(step)
  const hold = steps * STEP
  const total = Math.round((hold + 0.5) * RATE)
  let ph = 0
  let lp = 0
  for (let i = 0; i < total; i++) {
    const t = i / RATE
    const vib = 1 + 0.005 * Math.sin(TAU * 4.6 * t) * Math.min(1, t / 0.5)
    ph += (freq * vib) / RATE
    lp += lpCoef(1800) * (rand() * 2 - 1 - lp)
    const x = Math.sin(TAU * ph) + 0.12 * Math.sin(TAU * ph * 2) + lp * 0.18
    const env = Math.min(1, t / 0.14) * (t < hold ? 1 - 0.15 * (t / hold) : 0.85 * Math.max(0, 1 - (t - hold) / 0.5))
    put(bus.lead, start + i, x * env * 0.11)
  }
}

function drum(step, kind, gain = 1) {
  const start = at(step)
  const len = { kick: 0.4, snare: 0.22, hat: 0.05 }[kind]
  let ph = 0
  let lp = 0
  let last = 0
  for (let i = 0; i < len * RATE; i++) {
    const t = i / RATE
    const noise = rand() * 2 - 1
    let v
    if (kind === 'kick') {
      ph += (48 + 60 * Math.exp(-t * 30)) / RATE
      v = Math.sin(TAU * ph) * (1 - t / len) ** 2 * 0.75
    } else if (kind === 'snare') {
      // Soft brushed snare: filtered noise with a low body.
      lp += lpCoef(1400) * (noise - lp)
      ph += 190 / RATE
      v = (lp * 0.5 + Math.sin(TAU * ph) * 0.15 * Math.exp(-t * 30)) * (1 - t / len) ** 2.5
    } else {
      const hp = noise - last
      last = noise
      v = hp * (1 - t / len) ** 3 * 0.05
    }
    put(bus.drums, start + i, v * gain)
  }
}

// Two bars per chord: [bass root, chord voicing]
const Fmaj9 = [41, [57, 60, 64, 67, 72]]
const Em7 = [40, [55, 59, 62, 67, 71]]
const Dm9 = [38, [57, 60, 64, 65, 69]]
const Cmaj7 = [36, [55, 59, 64, 67, 71]]
const CHORDS = [Fmaj9, Em7, Dm9, Cmaj7, Fmaj9, Em7, Dm9, Cmaj7]

CHORDS.forEach(([root, voicing], c) => {
  const b0 = c * 2 * BAR
  strum(voicing, b0, 10, 0.075)
  strum(voicing.slice(1), b0 + 10 + SWING * 2, 6, 0.05)
  strum(voicing, b0 + BAR, 12, 0.07)
  strum(voicing.slice(2), b0 + BAR + 12, 4, 0.045)
  bass(midi(root), b0, 7)
  bass(midi(root), b0 + 10 + SWING * 2, 5)
  bass(midi(root), b0 + BAR, 6)
  bass(midi(root + 7), b0 + BAR + 8, 4)
  bass(midi(root + 12), b0 + BAR + 12, 3)
})

for (let bar = 0; bar < BARS; bar++) {
  const b0 = bar * BAR
  drum(b0, 'kick', 0.9)
  drum(b0 + swung(6), 'kick', 0.45)
  drum(b0 + 10 + SWING * 2, 'kick', 0.6)
  drum(b0 + 4, 'snare')
  drum(b0 + 12, 'snare')
  for (let st = 0; st < BAR; st += 2) drum(b0 + swung(st), 'hat', st % 4 === 0 ? 0.9 : 0.55)
}

// Melody only in the second half, so the loop breathes.
const MELODY = [
  [0, 0, 6, 72], [0, 6, 2, 69], [0, 8, 8, 67], [1, 0, 4, 69], [1, 4, 12, 64],
  [2, 0, 6, 71], [2, 6, 2, 67], [2, 8, 8, 64], [3, 0, 4, 62], [3, 4, 12, 67],
  [4, 0, 6, 69], [4, 6, 2, 65], [4, 8, 8, 64], [5, 0, 4, 62], [5, 4, 12, 60],
  [6, 0, 6, 64], [6, 6, 2, 67], [6, 8, 8, 71], [7, 0, 14, 72],
]
for (const [bar, st, len, m] of MELODY) flute(midi(m), (8 + bar) * BAR + swung(st), len * 0.95)

// Vinyl: faint hiss plus sparse crackles.
{
  let lp = 0
  for (let i = 0; i < LEN; i++) {
    lp += lpCoef(3500) * (rand() * 2 - 1 - lp)
    bus.air[i] += lp * 0.012
    if (rand() < 0.00035) {
      const amp = 0.04 + rand() * 0.06
      for (let k = 0; k < 40; k++) put(bus.air, i + k, (rand() * 2 - 1) * amp * Math.exp(-k / 6))
    }
  }
}

/** Echo that wraps around the loop (run twice so the tail at the end feeds the start). */
function echo(buf, steps, feedback) {
  const d = at(steps)
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < LEN; i++) buf[i] += feedback * buf[(i - d + LEN) % LEN] * (pass === 0 ? 1 : 0.25)
  }
}
echo(bus.lead, 3, 0.32)

/** Schroeder reverb; processes the loop twice and keeps the second pass so the tail wraps. */
function reverb(input) {
  const combs = [1557, 1617, 1491, 1422].map((n) => ({ buf: new Float32Array(Math.round(((n * RATE) / 44100) * 1.5)), i: 0, lp: 0 }))
  const aps = [225, 556].map((n) => ({ buf: new Float32Array(Math.round((n * RATE) / 44100)), i: 0 }))
  const out = new Float32Array(LEN)
  for (let pass = 0; pass < 2; pass++) {
    for (let n = 0; n < LEN; n++) {
      const x = input[n]
      let y = 0
      for (const c of combs) {
        const o = c.buf[c.i]
        c.lp += 0.3 * (o - c.lp)
        c.buf[c.i] = x + c.lp * 0.82
        c.i = (c.i + 1) % c.buf.length
        y += o
      }
      y *= 0.25
      for (const a of aps) {
        const o = a.buf[a.i]
        const v = y + o * 0.5
        a.buf[a.i] = v
        a.i = (a.i + 1) % a.buf.length
        y = o - v * 0.5
      }
      if (pass === 1) out[n] = y
    }
  }
  return out
}

const send = new Float32Array(LEN)
for (let i = 0; i < LEN; i++) send[i] = bus.keys[i] * 0.6 + bus.lead[i] + bus.drums[i] * 0.15
const wet = reverb(send)

// Warm, rolled-off master so nothing is sharp.
const loop = new Float32Array(LEN)
const beat = 4 * STEP
let tone = 0
for (let pass = 0; pass < 2; pass++) {
  for (let i = 0; i < LEN; i++) {
    const since = (i / RATE) % beat
    const duck = 1 - 0.12 * Math.exp(-since / 0.15)
    const x = bus.drums[i] * 0.7 + bus.lead[i] + bus.air[i] + (bus.keys[i] + bus.bass[i]) * duck + wet[i] * 1.1
    tone += lpCoef(5200) * (x - tone)
    if (pass === 1) loop[i] = Math.tanh(tone * 1.2)
  }
}

writeWav('music.wav', loop)

