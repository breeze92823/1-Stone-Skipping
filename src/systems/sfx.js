// Sound effects: synthesized with Web Audio on one shared AudioContext.
// Volume follows the portal's master_volume setting, read at play time.
// No React imports.
import { settings } from './settingsState.js'

const SPLASH_GAIN = 0.3 // 0..1, multiplies on top of master_volume

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

let noiseBuffer = null
function getNoiseBuffer(c) {
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, Math.floor(c.sampleRate * 0.8), c.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

// Fire-and-forget water splash for a skill gain, in sync with the "+N" popup.
// Synthesized: a filtered noise burst (the splash) plus a few rising sine
// "plips" (droplets), randomized slightly so repeated throws don't sound identical.
export function playSkillGainPop() {
  const c = unlock()
  if (!c) return
  const t = c.currentTime
  const vol = SPLASH_GAIN * ((settings.master_volume ?? 80) / 100)
  const out = c.createGain()
  out.gain.value = vol
  out.connect(c.destination)

  // Splash body: bandpass noise sweeping down as the water settles.
  const noise = c.createBufferSource()
  noise.buffer = getNoiseBuffer(c)
  const band = c.createBiquadFilter()
  band.type = 'bandpass'
  band.Q.value = 0.9
  const f0 = 2600 + Math.random() * 900
  band.frequency.setValueAtTime(f0, t)
  band.frequency.exponentialRampToValueAtTime(700, t + 0.32)
  const env = c.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(1, t + 0.02)
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.38)
  noise.connect(band)
  band.connect(env)
  env.connect(out)
  noise.start(t, Math.random() * 0.4, 0.4)

  // Droplet plips: short sine blips that glide upward.
  const plips = 2 + Math.floor(Math.random() * 2)
  for (let i = 0; i < plips; i++) {
    const start = t + 0.03 + i * (0.05 + Math.random() * 0.06)
    const f = 500 + Math.random() * 700
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(f, start)
    osc.frequency.exponentialRampToValueAtTime(f * 2.2, start + 0.07)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(0.35, start + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.1)
    osc.connect(g)
    g.connect(out)
    osc.start(start)
    osc.stop(start + 0.12)
  }
}
