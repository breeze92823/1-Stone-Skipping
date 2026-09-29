// "Hold E to ..." orchestrator. Features register a zone; each frame the
// nearest in-range zone (first registered wins ties) is fed to the shared
// hold gate (systems/interactHold.js), and its onConfirm fires once when the
// 2 s hold completes. Framework-free: the HUD reads interactState at ~10Hz.
//
// register({ id, label, isNear, onConfirm })
//   label     string, or () => string|null (null hides the prompt);
//             'Buy Stone' -> prompt reads "Press E to Buy Stone"
//   isNear()  true while the player is in range and the prompt should show
//   onConfirm() runs once when the hold completes
import { isInteractKeyDown } from './input.js'
import { step as stepHold } from './interactHold.js'

const zones = []

export const interactState = {
  label: null, // label of the zone currently in range, or null
}

export function registerInteractZone(zone) {
  const existing = zones.findIndex((z) => z.id === zone.id) // HMR re-registers
  if (existing >= 0) zones.splice(existing, 1)
  zones.push(zone)
  return () => {
    const i = zones.indexOf(zone)
    if (i >= 0) zones.splice(i, 1)
  }
}

export function step() {
  const zone = zones.find((z) => z.isNear()) ?? null
  const label = zone ? (typeof zone.label === 'function' ? zone.label() : zone.label) : null
  interactState.label = label
  const confirmed = stepHold(zone && label ? zone.id : null, isInteractKeyDown())
  if (confirmed && zone && label) zone.onConfirm()
}
