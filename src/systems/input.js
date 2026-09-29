import { showMenu } from './bloxity.js'

// inputState: WASD move (camera-relative, consumed by playerMovement), a
// right-drag look delta + wheel zoom (consumed by cameraOrbit), and two
// edge-triggered flags — jump, and throw from the left mouse button. Edge-triggered flags are set here on the input event and
// cleared by whichever system consumes them that frame.
export const inputState = {
  move: { x: 0, z: 0 }, // x = strafe (+ right), z = forward (+ forward)
  look: { dx: 0, dy: 0 }, // pixels dragged this frame; consumed by cameraOrbit
  zoom: 0, // wheel delta this frame; consumed by cameraOrbit
  jump: false,
  moveLocked: false, // WASD ignored (parked on a pool's throwing pad) until Space is pressed
  throwPressed: false, // set by the HUD THROW button — throw the held stone
}

const held = new Set()
const pressed = new Set() // edge-triggered key presses awaiting consumeKeyPress
let orbiting = false
let installed = false

function recomputeMove() {
  let x = 0
  let z = 0
  if (held.has('KeyW') || held.has('ArrowUp')) z += 1
  if (held.has('KeyS') || held.has('ArrowDown')) z -= 1
  if (held.has('KeyD') || held.has('ArrowRight')) x += 1
  if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1
  inputState.move.x = inputState.moveLocked ? 0 : x
  inputState.move.z = inputState.moveLocked ? 0 : z
}

export function setMoveLocked(locked) {
  inputState.moveLocked = locked
  recomputeMove()
}

function onKeyDown(e) {
  if (e.repeat) return
  held.add(e.code)
  pressed.add(e.code)
  if (e.code === 'Space') {
    if (inputState.moveLocked) setMoveLocked(false) // this press only unlocks; no jump
    else inputState.jump = true
  }
  if (e.code === 'Escape') showMenu() // opens the portal's own pause menu
  recomputeMove()
}

function onKeyUp(e) {
  held.delete(e.code)
  recomputeMove()
}

// Right-drag orbits the camera. Left click does nothing on the 3D view;
// throwing is only via the HUD THROW button.
function onPointerDown(e) {
  if (e.pointerType === 'touch') return
  if (e.button === 2) orbiting = true
}

function onPointerUp(e) {
  if (e.pointerType === 'touch') return
  if (e.button === 2) orbiting = false
}

function onPointerMove(e) {
  if (!orbiting) return
  inputState.look.dx += e.movementX || 0
  inputState.look.dy += e.movementY || 0
}

function onWheel(e) {
  inputState.zoom += e.deltaY
}

function onContextMenu(e) {
  e.preventDefault() // right-drag is the orbit gesture
}

function onBlur() {
  held.clear()
  orbiting = false
  inputState.jump = false
  recomputeMove()
}

// True once per physical press of `code`.
export function consumeKeyPress(code) {
  return pressed.delete(code)
}

// Continuous "is E physically held" signal for systems/interact.js's hold gate.
export const INTERACT_KEY = 'KeyE'
export function isInteractKeyDown() {
  return held.has(INTERACT_KEY)
}

export function install() {
  if (installed) return
  installed = true
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('wheel', onWheel, { passive: true })
  window.addEventListener('contextmenu', onContextMenu)
  window.addEventListener('blur', onBlur)
}

export function uninstall() {
  if (!installed) return
  installed = false
  onBlur()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('contextmenu', onContextMenu)
  window.removeEventListener('blur', onBlur)
}
