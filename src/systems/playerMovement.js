import { inputState } from './input.js'
import { player, resetPlayer } from './playerState.js'
import { getYaw } from './cameraOrbit.js'
import { terrainHeightAt } from './terrainHeight.js'
import { BOUNDS, COLLIDERS, PLAYER_MOVE_SPEED, SPAWN, SPAWN_FACING, WATER_Y } from '../data/world.js'

// Kinematic capsule, stepped once per frame: apply input -> gravity ->
// integrate -> clamp to the ground height under the player's feet.

const ACCEL = 45 // m/s^2 approach toward target velocity
const GRAVITY = -22 // m/s^2
const JUMP_SPEED = 7.5 // m/s
const DROWN_DEPTH = 3 // m below the water surface that counts as "gone under"
const MAX_STEP = 0.65 // m the player can step up without jumping
const PAD_WALK_SPEED = 3 // m/s walking to a throwing pad's centre
const PAD_ARRIVE = 0.05 // m from the pad centre that counts as arrived
const PAD_FACING = Math.atan2(-1, 0) // pools' water lies west (-X) of their pads

// Clamps the (dx, dz) delta as one 2D vector so velocity curves straight
// toward the target instead of warping axis-by-axis.
function approach2D(v, targetX, targetZ, maxDelta) {
  const dx = targetX - v.x
  const dz = targetZ - v.z
  const dist = Math.hypot(dx, dz)
  if (dist <= maxDelta || dist === 0) {
    v.x = targetX
    v.z = targetZ
  } else {
    const scale = maxDelta / dist
    v.x += dx * scale
    v.z += dz * scale
  }
}

export function step(dt) {
  if (dt <= 0) return

  // Camera-relative ground basis.
  const yaw = getYaw()
  const fwdX = -Math.sin(yaw)
  const fwdZ = -Math.cos(yaw)
  const rightX = Math.cos(yaw)
  const rightZ = -Math.sin(yaw)

  const mv = inputState.move
  let wishX = fwdX * mv.z + rightX * mv.x
  let wishZ = fwdZ * mv.z + rightZ * mv.x
  let speed = PLAYER_MOVE_SPEED

  const p = player.position

  // Locked on a throwing pad: steer to its centre instead of reading WASD,
  // then stop and face the water (west) so the throw animation can start.
  if (!inputState.moveLocked) {
    player.padTarget = null
    player.atPad = false
  }
  const pad = player.padTarget
  if (pad && !player.atPad) {
    const dx = pad.x - p.x
    const dz = pad.z - p.z
    const d = Math.hypot(dx, dz)
    if (d < PAD_ARRIVE) {
      p.x = pad.x
      p.z = pad.z
      player.velocity.x = player.velocity.z = 0
      player.atPad = true
      wishX = wishZ = 0
    } else {
      wishX = dx / d
      wishZ = dz / d
      speed = Math.min(PAD_WALK_SPEED, d * 6) // ease in so it doesn't overshoot
    }
  }
  if (player.atPad) player.facing = PAD_FACING

  approach2D(player.velocity, wishX * speed, wishZ * speed, ACCEL * dt)

  // Jump reads last frame's grounded flag, then we clear it for this frame.
  if (inputState.jump) {
    if (player.grounded) player.velocity.y = JUMP_SPEED
    inputState.jump = false
  }
  player.grounded = false

  player.velocity.y += GRAVITY * dt
  const prevX = p.x
  const prevZ = p.z
  p.x += player.velocity.x * dt
  p.y += player.velocity.y * dt
  p.z += player.velocity.z * dt

  // Cliffs on W/N/E; the south edge is open so the player can fall into
  // the lake.
  const r = player.dims.radius
  if (p.x < BOUNDS.minX + r) p.x = BOUNDS.minX + r
  if (p.x > BOUNDS.maxX - r) p.x = BOUNDS.maxX - r
  if (p.z < BOUNDS.minZ + r) p.z = BOUNDS.minZ + r

  // Push out of solid props (tree trunks, pedestals, the portal...).
  for (const [cx, cz, cr] of COLLIDERS) {
    const dx = p.x - cx
    const dz = p.z - cz
    const min = cr + r
    const d2 = dx * dx + dz * dz
    if (d2 < min * min && d2 > 1e-8) {
      const d = Math.sqrt(d2)
      p.x = cx + (dx / d) * min
      p.z = cz + (dz / d) * min
    }
  }

  // Too tall a ledge to step onto (e.g. the leaderboard platform's side):
  // stay put unless the player jumps high enough.
  if (terrainHeightAt(p.x, p.z) > p.y + MAX_STEP) {
    p.x = prevX
    p.z = prevZ
  }

  const groundY = terrainHeightAt(p.x, p.z)
  if (p.y <= groundY) {
    p.y = groundY
    if (player.velocity.y < 0) player.velocity.y = 0
    player.grounded = true
  }

  // Walked off the shore and sank: send them back to spawn.
  if (p.y < WATER_Y - DROWN_DEPTH) {
    resetPlayer(SPAWN, SPAWN_FACING)
    return
  }

  // Face the direction of travel.
  if (Math.hypot(wishX, wishZ) > 0.01) {
    player.facing = Math.atan2(wishX, wishZ)
  }
}
