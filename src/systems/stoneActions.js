import { Vector3 } from 'three'
import { inputState, setMoveLocked } from './input.js'
import { player } from './playerState.js'
import { terrainHeightAt, waterAt, isInsideCliffs } from './terrainHeight.js'
import { useGameStore } from '../store/useGameStore.js'
import { isPoolUnlocked, isInThrowZone, POOLS, poolInsetRect, WATER_Y } from '../data/world.js'

// The player's core action: throw the stone in hand and let it skip across
// whatever water it lands on. Skips in an unlocked training pool earn skill
// (x the pool's multiplier) and a landing there earns level XP; skips on the
// lake past the throw zone earn wins. Thrown stones are a plain array
// singleton (not zustand) since they're rewritten every frame —
// ThrownStones.jsx reads this directly in its own useFrame.
export const thrownStones = [] // { position, velocity, skips, pool, lake }

// The stone the camera should follow instead of the player, set when a
// throw is made from inside the Throw Zone and cleared once that stone
// settles. Only one throw is tracked at a time so a second throw fired
// before the first lands doesn't yank the camera around.
let trackedStone = null
export function getTrackedStone() {
  return trackedStone
}

const GRAVITY = -16 // m/s^2, gentler than the player's so throws arc lazily
const BASE_THROW_SPEED = 11 // m/s with no skill
const SKILL_SPEED = 3 // extra m/s per decade of skill
// Radians above horizontal at release. Slightly downward, like a real
// sidearm skip: the first touchdown lands ~5 m out, inside even the short
// 1x pool, at a shallow enough angle to skip.
const THROW_UP_ANGLE = -0.08
const BOUNCE_DAMPING = 0.62 // vertical speed kept per skip
const DRAG_PER_BOUNCE = 0.92 // horizontal speed kept per skip
const MIN_BOUNCE_SPEED = 2.5 // m/s below which a stone just sinks instead
const MAX_SHALLOW_ANGLE = 0.55 // rad (~31deg); steeper impacts sink instead of skip
const MAX_SKIPS = 12
const RELOAD_TIME = 0.45 // s before the next stone is in hand

const _dir = new Vector3()
let reloadTimer = 0

export function throwSpeed(skill) {
  return BASE_THROW_SPEED + SKILL_SPEED * Math.log10(1 + skill)
}

// Reads inputState's edge-triggered throw flag each frame and consumes it.
export function stepPickupAndThrow(camera, dt) {
  const store = useGameStore.getState()

  const nowInZone = isInThrowZone(player.position.x, player.position.z)
  if (nowInZone !== store.inThrowZone) store.setInThrowZone(nowInZone)

  const pool = POOLS.find((p) => {
    const r = poolInsetRect(p)
    return player.position.x >= r.x0 && player.position.x <= r.x1 && player.position.z >= r.z0 && player.position.z <= r.z1
  })
  const poolId = pool ? pool.id : null
  if (poolId !== store.currentPoolId) {
    store.setCurrentPoolId(poolId)
    if (poolId) {
      // Parked on a throwing pad: playerMovement walks the player to its
      // centre and turns them to the water; Space frees them.
      setMoveLocked(true)
      const r = poolInsetRect(pool)
      player.padTarget = { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 }
      player.atPad = false
    }
  }

  if (!store.stoneReady) {
    reloadTimer -= dt
    if (reloadTimer <= 0) store.reloadStone()
  }

  if (inputState.throwPressed) {
    inputState.throwPressed = false
    if (store.stoneReady) {
      camera.getWorldDirection(_dir)
      _dir.y = 0
      _dir.normalize()
      const speed = throwSpeed(store.skill)
      const vy = speed * Math.sin(THROW_UP_ANGLE)
      const vh = speed * Math.cos(THROW_UP_ANGLE)
      const stone = {
        position: new Vector3(player.position.x + _dir.x * 0.4, player.position.y + 1.1, player.position.z + _dir.z * 0.4),
        velocity: new Vector3(_dir.x * vh, vy, _dir.z * vh),
        skips: 0,
        pool: null,
        lake: false,
      }
      thrownStones.push(stone)
      // Cinematic camera follow only kicks in for a throw made from the
      // Throw Zone, and only if nothing is already being tracked.
      if (nowInZone && !trackedStone) trackedStone = stone
      player.facing = Math.atan2(_dir.x, _dir.z)
      store.throwStone()
      reloadTimer = RELOAD_TIME
    }
  }
}

function settle(stone) {
  if (stone.sunk) return
  stone.sunk = true
  const store = useGameStore.getState()
  if (stone.lake && stone.skips > 0) store.addWins(stone.skips)
  if (stone.pool && isPoolUnlocked(stone.pool, store.rebirths)) store.addXp(1)
  if (stone === trackedStone) trackedStone = null
}

// Integrates every in-flight stone, bounces it off water when the impact is
// fast and shallow enough, and settles (removes) it otherwise.
export function stepStones(dt) {
  for (const stone of thrownStones) {
    stone.velocity.y += GRAVITY * dt
    stone.position.addScaledVector(stone.velocity, dt)
    const { x, y, z } = stone.position

    // Hit a cliff, or somehow fell through the world.
    if (isInsideCliffs(x, z) || y < WATER_Y - 5) {
      settle(stone)
      continue
    }

    const water = waterAt(x, z)
    if (water && y <= water.y) {
      if (water.pool) stone.pool = water.pool
      if (water.lake) stone.lake = true

      const speed = stone.velocity.length()
      const angle = Math.atan2(-stone.velocity.y, Math.hypot(stone.velocity.x, stone.velocity.z))
      const canSkip = angle < MAX_SHALLOW_ANGLE && speed > MIN_BOUNCE_SPEED && stone.skips < MAX_SKIPS

      if (canSkip) {
        stone.position.y = water.y
        stone.velocity.y = -stone.velocity.y * BOUNCE_DAMPING
        stone.velocity.x *= DRAG_PER_BOUNCE
        stone.velocity.z *= DRAG_PER_BOUNCE
        stone.skips += 1
        const store = useGameStore.getState()
        store.registerSkip(stone.skips)
        if (water.pool && isPoolUnlocked(water.pool, store.rebirths)) store.addSkill(water.pool.mult)
      } else {
        settle(stone)
      }
      continue
    }

    if (y <= terrainHeightAt(x, z)) settle(stone)
  }

  for (let i = thrownStones.length - 1; i >= 0; i--) {
    if (thrownStones[i].sunk) thrownStones.splice(i, 1)
  }
}
