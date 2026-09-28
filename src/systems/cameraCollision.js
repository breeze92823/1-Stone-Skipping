import { isInsideCliffs, terrainHeightAt } from './terrainHeight.js'
import { WATER_Y } from '../data/world.js'

// Keeps the third-person camera boom out of the ground, the water surface
// and the cliffs ringing the world.
const FLOOR_MARGIN = 0.3 // m the camera stays above the surface under it
const STEP = 0.25 // m between samples along the boom
const MIN_DISTANCE = 0.6 // never pull closer than this to the look target

function floorAt(x, z) {
  if (isInsideCliffs(x, z)) return Infinity
  const g = terrainHeightAt(x, z)
  return (Number.isFinite(g) ? g : WATER_Y) + FLOOR_MARGIN
}

// Largest boom length <= wanted along (dirX, dirY, dirZ) from target with no
// sample dipping below the floor.
export function safeDistance(target, dirX, dirY, dirZ, wanted) {
  let last = Math.min(MIN_DISTANCE, wanted)
  for (let d = STEP; d <= wanted + 1e-6; d += STEP) {
    const dist = Math.min(d, wanted)
    const y = target.y + dirY * dist
    const x = target.x + dirX * dist
    const z = target.z + dirZ * dist
    if (y < floorAt(x, z)) return Math.max(last, MIN_DISTANCE)
    last = dist
  }
  return wanted
}
