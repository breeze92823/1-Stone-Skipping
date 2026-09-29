// Shared "hold E for HOLD_MS to confirm" gate for every proximity prompt.
// One timer no matter which zone is near, since only one prompt is visible
// at once. Stepped once per frame from systems/interact.js; polled by
// components/InteractPrompt.jsx at ~10Hz to draw the fill ring.
export const HOLD_MS = 2000

export const interactHoldState = {
  active: false, // a hold is in progress against some zone this frame
  progress: 0, // 0..1 toward HOLD_MS
}

let ownerKey = null
let startedAt = 0

function reset() {
  ownerKey = null
  startedAt = 0
  interactHoldState.active = false
  interactHoldState.progress = 0
}

// zoneKey identifies the interactable currently in range, or null when
// nothing is near. keyDown is whether E is physically held right now.
// Returns true on the exact frame a continuous hold on the SAME zoneKey
// reaches HOLD_MS. Releasing, or the zoneKey changing mid-hold, resets the
// timer to zero.
export function step(zoneKey, keyDown) {
  if (!zoneKey || !keyDown) {
    reset()
    return false
  }
  if (ownerKey !== zoneKey) {
    ownerKey = zoneKey
    startedAt = performance.now()
  }
  interactHoldState.active = true
  const elapsed = performance.now() - startedAt
  interactHoldState.progress = Math.min(1, elapsed / HOLD_MS)
  if (elapsed >= HOLD_MS) {
    reset()
    return true
  }
  return false
}
