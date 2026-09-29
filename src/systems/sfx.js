// Sound effects: played through one shared AudioContext.
// Volume follows the portal's master_volume setting, read at play time.
// No React imports.
import { settings } from './settingsState.js'

let ctx = null

function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// --- Stone/water splash (sampled) -------------------------------------------
// One decoded AudioBuffer, played through cheap one-shot BufferSources. Loading
// starts on the first user gesture (when the AudioContext may run) so the
// first throw isn't delayed; until decoded, splashes are simply silent.
const SPLASH_URL = `${import.meta.env.BASE_URL}audio/water_splash.mp3`
const SPLASH_GAIN = 0.15 // 0..1, multiplies on top of master_volume
const SPLASH_MIN_GAP = 0.04 // s, drops near-simultaneous duplicates
const SPLASH_MAX_VOICES = 6

let splashBuffer = null
let splashLoading = false
let splashVoices = 0
let lastSplashAt = -1

function loadSplash() {
  if (splashBuffer || splashLoading) return
  const c = unlock()
  if (!c) return
  splashLoading = true
  fetch(SPLASH_URL)
    .then((r) => r.arrayBuffer())
    .then((data) => c.decodeAudioData(data))
    .then((buf) => { splashBuffer = buf })
    .catch(() => { splashLoading = false }) // retry on the next gesture/splash
}

if (typeof window !== 'undefined') {
  const onGesture = () => {
    loadSplash()
    if (splashBuffer) {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
    }
  }
  window.addEventListener('pointerdown', onGesture)
  window.addEventListener('keydown', onGesture)
}

// Called every time a stone touches water. power ~0.6 (skip) .. 1.4 (sink).
export function playWaterSplash(power = 1) {
  if (!splashBuffer) { loadSplash(); return }
  const c = ctx
  if (!c || c.state !== 'running') return
  const t = c.currentTime
  if (t - lastSplashAt < SPLASH_MIN_GAP || splashVoices >= SPLASH_MAX_VOICES) return
  lastSplashAt = t

  const vol = SPLASH_GAIN * ((settings.master_volume ?? 80) / 100)
  const src = c.createBufferSource()
  src.buffer = splashBuffer
  // Bigger splashes sound a touch deeper; small random detune avoids repetition.
  src.playbackRate.value = (1.15 - power * 0.15) * (0.94 + Math.random() * 0.12)
  const g = c.createGain()
  g.gain.value = vol
  src.connect(g)
  g.connect(c.destination)
  splashVoices++
  src.onended = () => { splashVoices--; src.disconnect(); g.disconnect() }
  src.start(t)
}
