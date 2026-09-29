import { Vector3 } from 'three'
import { inputState, setMoveLocked } from './input.js'
import { player } from './playerState.js'
import { spawnActionPopup } from './actionPopups.js'
import { terrainHeightAt, waterAt, isInsideCliffs } from './terrainHeight.js'
import { useGameStore } from '../store/useGameStore.js'
import { THROW_ONESHOT_TIME, THROW_RELEASE_DELAY } from './avatarAnim.js'
import { isPoolUnlocked, isInThrowZone, LAKE, LAKE_END, POOLS, poolInsetRect, SKILL_STONES, WATER_Y } from '../data/world.js'

// The player's core action: throw the stone in hand and let it skip across
// whatever water it lands on. Each throw from an unlocked training
// pool pad earns skill once, on release (the pool's labelled amount), and level follows from skill; skips on the
// lake past the throw zone earn wins. Thrown stones are a plain array
// singleton (not zustand) since they're rewritten every frame —
// ThrownStones.jsx reads this directly in its own useFrame.
export const thrownStones = [] // { position, velocity, model, skips, pool, lake }

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

// Throws from the Throw Zone always skip the whole canal and land on the
// end beach: aimed at the beach, constant horizontal speed, and every lake skip
// rebounds with the same vertical speed (no damping, drag or skip cap).
// Hop length = speed * 2 * LAKE_HOP_VY / -GRAVITY (~90 m), so ~50 skips.
const LAKE_THROW_SPEED = 300 // m/s horizontal, ~37 s to cross the canal
const LAKE_HOP_VY = 6 // m/s up after each lake skip; peaks ~1.1 m, clears the beach lip
const LAKE_AIM_MARGIN = 3 // m kept off the canal's side banks when aiming
const BEACH_AIM_Z = LAKE.maxZ - LAKE_END.depth / 2

const _dir = new Vector3()
let reloadTimer = 0
let pendingThrow = null // { t, dir, inZone }: throw animating, stone not yet released
let throwLock = 0 // s left of the throw animation; movement is held until 0

// Skill an equipped Skill Stone adds to every pad throw.
function equippedStoneValue(id) {
  return SKILL_STONES.find((s) => s.model === id)?.value ?? 1
}

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

  // Parked at the centre of an unlocked pad: keep throwing on its own, so
  // every throw animation earns the pool's skill.
  const autoPad = !!pool && player.atPad && inputState.moveLocked && isPoolUnlocked(pool, store.rebirths)
  const autoThrow = autoPad && store.stoneReady && !pendingThrow && throwLock <= 0

  // A press starts the throw animation; the stone itself leaves the hand
  // THROW_RELEASE_DELAY later, and the player stays planted until the
  // follow-through finishes.
  if (inputState.throwPressed || autoThrow) {
    inputState.throwPressed = false
    if (store.stoneReady && !pendingThrow && throwLock <= 0) {
      if (autoThrow) {
        _dir.set(-1, 0, 0) // pads face west, toward the water
      } else if (nowInZone) {
        // Aim down the canal at the end beach, staying clear of the side banks.
        const aimX = Math.min(Math.max(player.position.x, LAKE.minX + LAKE_AIM_MARGIN), LAKE.maxX - LAKE_AIM_MARGIN)
        _dir.set(aimX - player.position.x, 0, BEACH_AIM_Z - player.position.z)
      } else {
        camera.getWorldDirection(_dir)
        _dir.y = 0
      }
      _dir.normalize()
      pendingThrow = { t: THROW_RELEASE_DELAY, dir: _dir.clone(), inZone: nowInZone }
      throwLock = THROW_ONESHOT_TIME
      player.facing = Math.atan2(_dir.x, _dir.z)
      player.throwCount += 1
    }
  }

  if (throwLock > 0) throwLock -= dt
  player.throwing = throwLock > 0

  if (pendingThrow) {
    pendingThrow.t -= dt
    if (pendingThrow.t <= 0) {
      releaseStone(pendingThrow, store)
      pendingThrow = null
    }
  }
}

function releaseStone({ dir, inZone }, store) {
  const speed = inZone ? LAKE_THROW_SPEED : throwSpeed(store.skill)
  const vy = speed * Math.sin(THROW_UP_ANGLE)
  const vh = speed * Math.cos(THROW_UP_ANGLE)
  const hand = player.handPos
  const position = hand
    ? new Vector3(hand.x, hand.y, hand.z)
    : new Vector3(player.position.x + dir.x * 0.4, player.position.y + 1.1, player.position.z + dir.z * 0.4)
  const stone = {
    position,
    velocity: new Vector3(dir.x * vh, vy, dir.z * vh),
    model: store.equippedStone, // which SKILL_STONES model to draw (ThrownStones.jsx)
    skips: 0,
    pool: null,
    lake: false,
    lakeRun: inZone, // guaranteed canal crossing (see LAKE_THROW_SPEED)
  }
  thrownStones.push(stone)
  // Each throw from an unlocked training pool's pad earns that pool's
  // labelled skill, the moment the stone leaves the hand.
  const pad = POOLS.find((p) => p.id === store.currentPoolId)
  if (pad && !inZone && isPoolUnlocked(pad, store.rebirths)) {
    const before = store.skill
    store.addSkill(pad.mult * equippedStoneValue(store.equippedStone))
    spawnActionPopup(useGameStore.getState().skill - before)
  }
  // Cinematic camera follow only kicks in for a throw made from the
  // Throw Zone, and only if nothing is already being tracked.
  if (inZone && !trackedStone) trackedStone = stone
  store.throwStone()
  reloadTimer = RELOAD_TIME
}

function settle(stone) {
  if (stone.sunk) return
  stone.sunk = true
  const store = useGameStore.getState()
  if (stone.lake && stone.skips > 0) store.addWins(stone.skips)
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

      const lakeRun = stone.lakeRun && water.lake
      const speed = stone.velocity.length()
      const angle = Math.atan2(-stone.velocity.y, Math.hypot(stone.velocity.x, stone.velocity.z))
      const canSkip = lakeRun || (angle < MAX_SHALLOW_ANGLE && speed > MIN_BOUNCE_SPEED && stone.skips < MAX_SKIPS)

      if (canSkip) {
        stone.position.y = water.y
        if (lakeRun) {
          stone.velocity.y = LAKE_HOP_VY
        } else {
          stone.velocity.y = -stone.velocity.y * BOUNCE_DAMPING
          stone.velocity.x *= DRAG_PER_BOUNCE
          stone.velocity.z *= DRAG_PER_BOUNCE
        }
        stone.skips += 1
        const store = useGameStore.getState()
        store.registerSkip(stone.skips)
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
