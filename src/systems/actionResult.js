// Shared trigger for the top-center ActionResult HUD popup
// (components/ActionResult.jsx). Framework-free singleton: `id` increments on
// every call so Hud.jsx's poll detects a fresh trigger even when back-to-back
// messages share the same text.
export const actionResultState = {
  text: '',
  success: true,
  id: 0,
}

export function showActionResult(text, success) {
  actionResultState.text = text
  actionResultState.success = success
  actionResultState.id++
}
