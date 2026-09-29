import { EGG_PANELS, eggPanelState } from './eggPanel.js'
import { consumeKeyPress } from './input.js'
import { showActionResult } from './actionResult.js'
import { useGameStore } from '../store/useGameStore.js'

export const MULTI_COUNT = 3
const AUTO_INTERVAL_MS = 2500

// Rolls up to `count` pets the player doesn't own yet from the egg's odds
// (renormalised over the unowned ones), pays for each, and reports the result.
export function hatch(kind, count) {
  const panel = EGG_PANELS[kind]
  if (!panel) return false
  const store = useGameStore.getState()
  const cost = Number(panel.cost)
  const pool = panel.pets.filter((p) => !store.ownedPets.includes(p.name))
  if (pool.length === 0) {
    showActionResult('You own every pet!', false)
    return false
  }
  const n = Math.min(count, pool.length, Math.floor(store.wins / cost))
  if (n === 0) {
    showActionResult(`Need ${panel.cost} Wins to Hatch`, false)
    return false
  }
  const got = []
  for (let i = 0; i < n; i++) {
    const total = pool.reduce((sum, p) => sum + p.chance, 0)
    let r = Math.random() * total
    const idx = pool.findIndex((p) => (r -= p.chance) < 0)
    got.push(pool.splice(idx < 0 ? pool.length - 1 : idx, 1)[0].name)
  }
  store.addPets(got, cost * n)
  showActionResult(`You got ${got.join(', ')}!`, true)
  return true
}

export function toggleAuto() {
  const s = useGameStore.getState()
  s.setAutoHatch(!s.autoHatch)
}

export const hatchOne = () => eggPanelState.kind && hatch(eggPanelState.kind, 1)
export const hatchMulti = () => eggPanelState.kind && hatch(eggPanelState.kind, MULTI_COUNT)

let nextAuto = 0

// Per frame, after stepEggPanel: E / R / T keys while standing at an egg, and
// the auto-hatch timer (stops on leaving the egg or when a hatch fails).
export function stepEggHatch() {
  const e = consumeKeyPress('KeyE')
  const r = consumeKeyPress('KeyR')
  const t = consumeKeyPress('KeyT')
  const store = useGameStore.getState()
  const kind = eggPanelState.kind
  if (!kind) {
    if (store.autoHatch) store.setAutoHatch(false)
    return
  }
  if (e) hatch(kind, 1)
  if (r) hatch(kind, MULTI_COUNT)
  if (t) toggleAuto()
  if (useGameStore.getState().autoHatch) {
    const now = performance.now()
    if (now >= nextAuto) {
      nextAuto = now + AUTO_INTERVAL_MS
      if (!hatch(kind, 1)) useGameStore.getState().setAutoHatch(false)
    }
  }
}
