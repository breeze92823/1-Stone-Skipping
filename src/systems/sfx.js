// Sound effects: audio files fetched and decoded once, played through one
// shared AudioContext. Volume follows the portal's master_volume setting,
// read at play time. No React imports.
import { settings } from './settingsState.js'

const POWER_GAIN_SOUND_URL = '/audio/power_gain.mp3'
const SKILL_GAIN_GAIN = 0.135 // 0..1, multiplies on top of master_volume

let ctx = null
const bufferCache = new Map() // url -> Promise<AudioBuffer|null>

function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function loadBuffer(url) {
  if (!bufferCache.has(url)) {
    bufferCache.set(
      url,
      fetch(url)
        .then((res) => res.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data))
        .catch((err) => {
          console.warn(`[sfx] failed to load ${url}`, err)
          bufferCache.delete(url)
          return null
        }),
    )
  }
  return bufferCache.get(url)
}

// Fire-and-forget "pop" for a skill gain, in sync with the "+N" popup.
export function playSkillGainPop() {
  const c = unlock()
  if (!c) return
  loadBuffer(POWER_GAIN_SOUND_URL).then((buffer) => {
    if (!buffer) return
    const source = c.createBufferSource()
    source.buffer = buffer
    const gain = c.createGain()
    gain.gain.value = SKILL_GAIN_GAIN * ((settings.master_volume ?? 80) / 100)
    source.connect(gain)
    gain.connect(c.destination)
    source.start(0)
  })
}
