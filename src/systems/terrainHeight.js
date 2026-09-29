import {
  BOUNDS,
  GROUND_Y,
  LAKE,
  LAKE_BANK,
  LAKE_END,
  LEADER_BRIDGE,
  LEADER_COURT,
  LEADER_MOAT,
  LEADER_MOAT_WATERS,
  PATH_TOP,
  PATHS,
  POOL_PLATFORM,
  POOL_RIM,
  POOL_RIM_TOP,
  POOL_WATER_Y,
  POOLS,
  THROW_ZONE,
  WATER_Y,
  poolRect,
} from '../data/world.js'

// Raised floor rectangles, evaluated in order with later entries overriding
// earlier ones — that's what lets a pool's sunken interior cut through its
// own rim, and the rim sit on top of the walkway it overlaps.
const SOLIDS = []
const WATERS = [] // { x0, x1, z0, z1, y, pool? }

for (const [x0, x1, z0, z1] of PATHS) SOLIDS.push({ x0, x1, z0, z1, top: PATH_TOP })
SOLIDS.push({ ...THROW_ZONE })

// Leaderboard courtyard: an island a step up, ringed by a shallow moat the
// player can wade through, with a bridge in from the south.
for (const w of LEADER_MOAT_WATERS) {
  SOLIDS.push({ ...w, top: GROUND_Y })
  WATERS.push({ ...w, y: LEADER_MOAT.y })
}
SOLIDS.push({ ...LEADER_COURT })
SOLIDS.push({ ...LEADER_BRIDGE })

for (const p of POOLS) {
  const r = poolRect(p)
  SOLIDS.push({ ...r, top: POOL_RIM_TOP })
  const inner = { x0: r.x0 + POOL_RIM, x1: r.x1 - POOL_RIM, z0: r.z0 + POOL_RIM, z1: r.z1 - POOL_RIM }
  SOLIDS.push({ ...inner, top: GROUND_Y + 0.05 })
  const platform = { ...inner, x0: inner.x1 - POOL_PLATFORM.length }
  SOLIDS.push({ ...platform, top: POOL_PLATFORM.top })
  WATERS.push({ ...inner, x1: platform.x0, y: POOL_WATER_Y, pool: p })
}

function inside(r, x, z) {
  return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1
}

const BEACH_Z = LAKE.maxZ - LAKE_END.depth

// Height of the terraced bank beside the canal: the tier you're on depends
// on how far out from the water's edge you are.
function lakeBankHeight(x) {
  const out = x < LAKE.minX ? LAKE.minX - x : x - LAKE.maxX
  const tier = Math.min(Math.floor(out / LAKE_BANK.tierWidth), LAKE_BANK.tops.length - 1)
  return LAKE_BANK.tops[tier]
}

// Floor height under (x, z). South of the throw zone: -Infinity over the
// open canal so the player falls in (and respawns) rather than walking on
// water, the bank height beside it, and the beach at the far end.
export function terrainHeightAt(x, z) {
  if (z > BOUNDS.maxZ) {
    if (x < LAKE.minX || x > LAKE.maxX) return lakeBankHeight(x)
    return z >= BEACH_Z ? LAKE_END.top : -Infinity
  }
  let h = GROUND_Y
  for (const s of SOLIDS) if (inside(s, x, z)) h = s.top
  return h
}

// Water surface under (x, z), or null. `pool` is set for training pools;
// `lake` for the open canal past the throw zone.
const lakeHit = { y: WATER_Y, lake: true, pool: null }
export function waterAt(x, z) {
  if (z > BOUNDS.maxZ && z < BEACH_Z && x >= LAKE.minX && x <= LAKE.maxX) return lakeHit
  for (const w of WATERS) if (inside(w, x, z)) return w
  return null
}

// True once (x, z) is inside the ring of cliffs around the playable area.
export function isInsideCliffs(x, z) {
  if (x < BOUNDS.minX || x > BOUNDS.maxX || z < BOUNDS.minZ) return true
  return z > LAKE.maxZ
}
