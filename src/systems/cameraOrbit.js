import { Quaternion } from 'three'
import { inputState } from './input.js'
import { player } from './playerState.js'
import { safeDistance } from './cameraCollision.js'
import { getTrackedStone } from './stoneActions.js'

// Third-person follow with right-drag orbit + wheel zoom. Position and
// look-at ease at different rates so the rig reads as a follow cam rather
// than a rigid mount.
const START_PITCH = 0.42 // radians above the horizon
const state = {
  yaw: 0, // radians; 0 puts the camera on +Z looking toward -Z
  pitch: START_PITCH,
  distance: 13,
}

const MIN_PITCH = -0.1
const MAX_PITCH = 1.2
const MIN_DIST = 3
const MAX_DIST = 45
const ORBIT_SENS = 0.005
const ZOOM_SENS = 0.01

// Driven by the Bloxity `camera_sensitivity` setting (0.1-5.0, default 1).
let sensitivity = 1
export function setCameraSensitivity(value) {
  sensitivity = value
}

const POSITION_SMOOTHING = 12
const LOOK_SMOOTHING = 20

// A same-frame jump in the player's position bigger than this is a teleport
// (a respawn) rather than real movement — snap instead of swooping.
const TELEPORT_DISTANCE = 15

const target = { x: 0, y: 0, z: 0 }
const lookAt = { x: 0, y: 0, z: 0 }
const lastPlayerPos = { x: 0, y: 0, z: 0 }
let initialised = false

// While tracking a thrown stone, the camera dollies forward/back along Z in
// lockstep with the stone's own Z travel and otherwise holds perfectly
// still: X, Y and rotation are frozen at whatever they were the instant
// tracking began, rather than re-aiming at the stone every frame.
const frozenQuat = new Quaternion()
let frozenX = 0
let frozenY = 0
let frozenZ = 0
let trackStartZ = 0
let wasTracking = false

export function getYaw() {
  return state.yaw
}

// Snaps the orbit to sit directly behind the player, e.g. right after spawn.
export function syncYawToPlayer() {
  state.yaw = player.facing + Math.PI
}

// Points the orbit directly (radians / metres); used by the dev console hook.
export function setView({ yaw = state.yaw, pitch = state.pitch, distance = state.distance }) {
  state.yaw = yaw
  state.pitch = pitch
  state.distance = distance
}

export function update(camera, dt) {
  state.yaw -= inputState.look.dx * ORBIT_SENS * sensitivity
  state.pitch += inputState.look.dy * ORBIT_SENS * sensitivity
  inputState.look.dx = 0
  inputState.look.dy = 0

  if (state.pitch < MIN_PITCH) state.pitch = MIN_PITCH
  if (state.pitch > MAX_PITCH) state.pitch = MAX_PITCH

  state.distance += inputState.zoom * ZOOM_SENS
  inputState.zoom = 0
  if (state.distance < MIN_DIST) state.distance = MIN_DIST
  if (state.distance > MAX_DIST) state.distance = MAX_DIST

  // Teleport detection is based on the player's own position, not on
  // whichever target we're actually aiming at this frame — that keeps a
  // real respawn snapping the camera instantly while switching the target
  // to/from a tracked stone still eases smoothly.
  const jump = Math.hypot(
    player.position.x - lastPlayerPos.x,
    player.position.y - lastPlayerPos.y,
    player.position.z - lastPlayerPos.z,
  )
  const teleported = initialised && jump > TELEPORT_DISTANCE
  lastPlayerPos.x = player.position.x
  lastPlayerPos.y = player.position.y
  lastPlayerPos.z = player.position.z

  if (teleported) {
    state.yaw = player.facing + Math.PI
    state.pitch = START_PITCH
  }

  const trackedStone = getTrackedStone()

  if (trackedStone) {
    if (!wasTracking) {
      // Freeze the rig's current X/Y and rotation the instant tracking
      // starts; only Z will move from here on, in lockstep with the stone.
      frozenX = camera.position.x
      frozenY = camera.position.y
      frozenZ = camera.position.z
      trackStartZ = trackedStone.position.z
      frozenQuat.copy(camera.quaternion)
      wasTracking = true
    }
    camera.position.x = frozenX
    camera.position.y = frozenY
    camera.position.z = frozenZ + (trackedStone.position.z - trackStartZ)
    camera.quaternion.copy(frozenQuat)
    return
  }
  wasTracking = false

  target.x = player.position.x
  target.y = player.position.y + player.dims.height * 0.6
  target.z = player.position.z

  const cp = Math.cos(state.pitch)
  const dirX = Math.sin(state.yaw) * cp
  const dirY = Math.sin(state.pitch)
  const dirZ = Math.cos(state.yaw) * cp

  // Shorten the boom if it would end up in the ground or the water.
  const boom = safeDistance(target, dirX, dirY, dirZ, state.distance)
  const desiredX = target.x + dirX * boom
  const desiredY = target.y + dirY * boom
  const desiredZ = target.z + dirZ * boom

  if (!initialised || teleported) {
    camera.position.set(desiredX, desiredY, desiredZ)
    lookAt.x = target.x
    lookAt.y = target.y
    lookAt.z = target.z
    initialised = true
  } else {
    const tPos = dt > 0 ? 1 - Math.exp(-POSITION_SMOOTHING * dt) : 1
    camera.position.x += (desiredX - camera.position.x) * tPos
    camera.position.y += (desiredY - camera.position.y) * tPos
    camera.position.z += (desiredZ - camera.position.z) * tPos

    const tLook = dt > 0 ? 1 - Math.exp(-LOOK_SMOOTHING * dt) : 1
    lookAt.x += (target.x - lookAt.x) * tLook
    lookAt.y += (target.y - lookAt.y) * tLook
    lookAt.z += (target.z - lookAt.z) * tLook
  }

  camera.lookAt(lookAt.x, lookAt.y, lookAt.z)
}
