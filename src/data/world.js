// World layout for the lobby, in metres. +X is east, +Z is south, so the
// default camera (on +Z looking toward -Z) faces north toward the
// leaderboards and waterfall. Landmark names are documented in
// LANDMARKS.md at the repo root.
//
//            N  cliffs + waterfall
//            moat ~ leaderboard courtyard ~ moat
//   pools    admin board
//   50x      [ egg plaza: eggs + pet ]   chest     stone grid
//   15x             neck                           (2 x 5)
//   20x   <- west   spawn section   east branch ->
//   10x             chevron road       portal
//   1x               |            hacked egg
//   ============== THROW ZONE ==============
//            lake (S)
export const GROUND_Y = 0
export const WATER_Y = -0.4 // lake surface past the throw zone
export const PATH_TOP = 0.12 // gray lego paths sit slightly proud of the grass

// Walkable interior. Cliffs close off W, N and E; the south edge is the
// throw zone's bank, and past it is open lake.
export const BOUNDS = { minX: -46, maxX: 42, minZ: -50, maxZ: 20.5 }

// The lake is a long straight canal running south from the throw zone to a
// sandy beach at the far end. It's narrower than the throw zone strip and
// centred on the chevron road; low terraced banks line both sides, each
// tier LAKE_BANK.tierWidth wide and stepping up away from the water.
export const LAKE = { minX: -22, maxX: 34, minZ: 20.5, maxZ: 4534 }
export const LAKE_BANK = { tierWidth: 8, tops: [1.2, 3.7, 6.2] }
export const LAKE_END = { depth: 14, top: 0.3 } // sandy strip across the canal's far end

// Themed stretches of the canal, north to south. Each zone starts at its
// startZ, where its name sign hangs over the water, and runs to the next
// zone's startZ (the last runs to the end beach). The first zone starts at
// the throw zone.
// `water` / `shallows` tint that stretch of canal.
export const LAKE_ZONES = [
  { id: 'palm', label: 'Palm Beach', icon: 'palm', startZ: 200, water: '#14cbe6', shallows: '#a6f4ff' },
  { id: 'desert', label: 'Cactus Desert', icon: 'cactus', startZ: 586, water: '#14cbe6', shallows: '#a6f4ff' },
  { id: 'autumn', label: 'Autumn Woods', icon: 'maple', startZ: 952, water: '#eab84e', shallows: '#ffe3a3' },
  { id: 'frost', label: 'Frost Lake', icon: 'snowflake', startZ: 1320, water: '#8fdcf2', shallows: '#e4fbff' },
  { id: 'marsh', label: 'Mushroom Marsh', icon: 'mushroom', startZ: 1770, water: '#4fcfb6', shallows: '#bdf7e0' },
  { id: 'candy', label: 'Candy Banks', icon: 'lollipop', startZ: 2220, water: '#ff9ccb', shallows: '#ffdcec' },
  { id: 'crystal', label: 'Crystal Valley', icon: 'gem', startZ: 2760, water: '#a985f2', shallows: '#e0d0ff' },
  { id: 'ember', label: 'Ember River', icon: 'flame', startZ: 3270, water: '#ff8a2e', shallows: '#ffd28a' },
  { id: 'starfall', label: 'Starfall Shores', icon: 'sparkle', startZ: 3900, water: '#5a6ce0', shallows: '#bcc6ff' },
]

// Giant pirate portal standing on the end beach, facing back up the canal.
export const LAKE_PORTAL = { scale: 5, zOffset: 5, sub: '100M' } // zOffset: metres past the beach's north edge

export const SPAWN = { x: 6, y: PATH_TOP, z: 1 } // in the spawn section
export const SPAWN_FACING = Math.PI // face north

export const PLAYER_MOVE_SPEED = 7

// Grass checker / lego stud sizes shared by every lego surface so seams
// between boxes line up.
export const CHECKER = 2.5
export const STUD = 0.5

// Gray checkered walkway rectangles [x0, x1, z0, z1]; overlapping ones
// merge into the blocky outline, and everything between them is grass.
// The central road runs plaza -> neck -> spawn section -> chevron road.
export const PATHS = [
  [-37, -6, -34, 14], // pool block: one gray frame under all six pools
  [-13, -6, -35, 14], // pool walkway along the pools' east ends
  [-4, 18, -24, -10], // egg plaza: one solid gray rectangle holding the eggs
  [3, 9, -10, -6], // neck: narrow road out of the plaza's south edge
  [0, 11, -6, 7], // spawn section: the road widens around spawn
  [-6, 0, 2, 4.7], // west branch to the pool walkway
  [9, 24, -3.5, 2], // east branch (yard path) to the stone grid, south of the chest
  [3, 9, 7, 17], // chevron road: straight south to the throw zone
  [-4, 28, -27, -24], // strip between the moat and the egg plaza
  [22, 39, -17, 5], // skill stones yard, against the east cliff
  [22, 28, -24, -17], // yard, north tongue up to the leaderboards
]

// Runs the full width of the lobby just south of the 1x pool; the lake
// starts at its south edge.
export const THROW_ZONE = { x0: -44, x1: 40, z0: 17, z1: BOUNDS.maxZ, top: 0.16 }

export function isInThrowZone(x, z) {
  return x >= THROW_ZONE.x0 && x <= THROW_ZONE.x1 && z >= THROW_ZONE.z0 && z <= THROW_ZONE.z1
}

// Training pools, south to north, packed side by side POOL_PITCH apart with
// gray walkway strips between them. Each is a rectangle whose east end
// (x = POOL_EAST_X) faces the walkway and holds the platform you throw from.
// The 1x pool sits just north of the throw zone.
export const POOL_EAST_X = -12
export const POOL_RIM = 0.8
export const POOL_RIM_TOP = 0.5
export const POOL_WATER_Y = 0.3
export const POOL_PLATFORM = { length: 3.2, top: 0.62 }
const POOL_PITCH = 7.5
const POOL_W = 6.5
const FIRST_POOL_Z = 9
export const POOLS = [
  { id: 'p1', mult: 1, rebirths: 0, len: 11, theme: 'lake' },
  { id: 'p4', mult: 4, rebirths: 3, signRebirths: 2, len: 14, theme: 'teal' },
  { id: 'p10', mult: 10, rebirths: 5, signRebirths: 4, len: 17, theme: 'purple' },
  { id: 'p20', mult: 20, rebirths: 7, signRebirths: 6, len: 19, theme: 'ice' },
  { id: 'p15', mult: 15, rebirths: 12, winCost: 10000, len: 21, theme: 'gold' },
  { id: 'p50', mult: 50, rebirths: 13, winCost: 20000, len: 23, theme: 'neon' },
].map((p, i) => ({ ...p, zc: FIRST_POOL_Z - i * POOL_PITCH, w: POOL_W }))

export function poolRect(p) {
  return { x0: POOL_EAST_X - p.len, x1: POOL_EAST_X, z0: p.zc - p.w / 2, z1: p.zc + p.w / 2 }
}

// The darker inset panel on top of a pool's throwing platform (matches the
// inset Box in Pools.jsx); standing on it triggers the pool's HUD banner.
export function poolInsetRect(p) {
  const r = poolRect(p)
  const x1 = r.x1 - POOL_RIM
  return {
    x0: x1 - POOL_PLATFORM.length + 0.5,
    x1: x1 - 0.5,
    z0: r.z0 + POOL_RIM + 0.8,
    z1: r.z1 - POOL_RIM - 0.8,
  }
}

export function isPoolUnlocked(p, rebirths) {
  return p.winCost === undefined && rebirths >= p.rebirths
}

// Where the tutorial arrows lead: the 1x pool's throwing platform.
export const GUIDE_TARGET = { x: POOL_EAST_X - POOL_RIM - POOL_PLATFORM.length / 2, z: POOLS[0].zc }

// Inside the egg plaza: the Featured Pet at the back centre, Uncommon and
// Rare either side of it, Common and Rainbow at the front corners.
export const EGGS = [
  { kind: 'common', x: -2, z: -13.2, label: 'COMMON', color: '#e3ecf5', labelColor: '#f2f4f7', wins: '50 Wins' },
  { kind: 'uncommon', x: 0.8, z: -18, label: 'UNCOMMON', color: '#2fe04c', labelColor: '#3ee356', wins: '500 Wins', rebirths: 8 },
  { kind: 'rare', x: 13.2, z: -18, label: 'RARE', color: '#2cc6ff', labelColor: '#4fc8ff', wins: '4K Wins', rebirths: 8 },
  { kind: 'rainbow', x: 15.6, z: -13.2, label: 'Rainbow Egg', rebirths: 10 },
]
// VITE_SHOW_ADDON=true shows the add-on features (Featured Pet label, Claim Chest, Phoenix Relic,
// Admin Abuse board); anything else hides them.
export const SHOW_ADDON = import.meta.env.VITE_SHOW_ADDON === 'true'
export const FEATURED_PET = { x: 7, z: -20.5 }
export const CLAIM_CHEST = { x: 21.5, z: -7.5 } // on the grass just SE of the egg plaza
export const ADMIN_BOARD = { x: 1.5, z: -26, rot: 0.15 }

// The leaderboards enclose a square gray-checker courtyard on three sides:
// two boards side by side along the back, one on each side wall facing
// inward. The courtyard is an island in a moat; a bridge on its south side
// leads in from the egg plaza, and the waterfall pours into the moat behind
// the back boards.
export const LEADER_COURT = { x0: 0, x1: 18, z0: -46, z1: -31, top: 0.4 }
export const LEADER_MOAT = { x0: -4, x1: 22, z0: -49.5, z1: -27, y: 0.08 }
export const LEADER_BRIDGE = { x0: 5.5, x1: 12.5, z0: -31, z1: -24, top: 0.4 }
export const LEADERBOARDS = [
  { title: 'Top Level', x: 1.3, z: -38.5, rot: Math.PI / 2, stat: 'level' },
  { title: 'Top Time Played', x: 5.3, z: -45.2, rot: 0, stat: 'time' },
  { title: 'Top Skills', x: 12.7, z: -45.2, rot: 0, stat: 'skill' },
  { title: 'Top Wins', x: 16.7, z: -38.5, rot: -Math.PI / 2, stat: 'wins' },
]
export const WATERFALL = { x0: -0.5, x1: 18.5, z: -49.4, bottom: LEADER_MOAT.y, top: 32 }

// The moat's open water, as rectangles around the courtyard (the bridge
// splits the south arm). Used for stone skipping and to keep decor off it.
export const LEADER_MOAT_WATERS = [
  { x0: LEADER_MOAT.x0, x1: LEADER_COURT.x0, z0: LEADER_MOAT.z0, z1: LEADER_MOAT.z1 },
  { x0: LEADER_COURT.x1, x1: LEADER_MOAT.x1, z0: LEADER_MOAT.z0, z1: LEADER_MOAT.z1 },
  { x0: LEADER_COURT.x0, x1: LEADER_COURT.x1, z0: LEADER_MOAT.z0, z1: LEADER_COURT.z0 },
  { x0: LEADER_COURT.x0, x1: LEADER_BRIDGE.x0, z0: LEADER_COURT.z1, z1: LEADER_MOAT.z1 },
  { x0: LEADER_BRIDGE.x1, x1: LEADER_COURT.x1, z0: LEADER_COURT.z1, z1: LEADER_MOAT.z1 },
]

// A 2 x 5 grid of stones on raised tiles, backed against the east cliff
// behind the Claim Chest. Rows run north -> south; the near (west) row holds
// the cheap stones, the far (east) row the expensive ones. Far-row labels
// float higher so the two rows' labels don't overlap.
export const SKILL_TILE = 3
const STONE_ROW_Z = [-12.5, -9, -5.5, -2, 1.5]
const NEAR_ROW_X = 31
const FAR_ROW_X = 35.5
export const SKILL_STONES = [
  { skill: '+1 Skill', wins: '0 Wins', model: 'pebble', value: 1, cost: 0 },
  { skill: '+3 Skill', wins: '2 Wins', model: 'scallop', value: 3, cost: 2 },
  { skill: '+5 Skill', wins: '10 Wins', model: 'shell', value: 5, cost: 10 },
  { skill: '+12 Skill', wins: '40 Wins', model: 'starfish', value: 12, cost: 40 },
  { skill: '+30 Skill', wins: '150 Wins', model: 'wood', value: 30, cost: 150 },
].map((s, i) => ({ ...s, x: NEAR_ROW_X, z: STONE_ROW_Z[i] }))
  .concat(
    [
      { skill: '+75 Skill', wins: '500 Wins', model: 'arrowhead', value: 75, cost: 500 },
      { skill: '+200 Skill', wins: '1.5K Wins', model: 'disc', value: 200, cost: 1500 },
      { skill: '+500 Skill', wins: '4.5K Wins', model: 'ring', value: 500, cost: 4500 },
      { skill: '+1.25K Skill', wins: '14K Wins', model: 'obsidian', value: 1250, cost: 14000 },
      { skill: '+3.5K Skill', wins: '40K Wins', model: 'coral', value: 3500, cost: 40000 },
    ].map((s, i) => ({ ...s, x: FAR_ROW_X, z: STONE_ROW_Z[i], highLabel: true })),
  )
// On the path directly in front of the +5 stone.
export const PHOENIX_RELIC = { x: 26.5, z: -5.5 }

// Portal and Hacked Admin Egg stand on the grass east of the chevron road.
export const PORTAL = { x: 15.5, z: 9.5, label: 'WORLD 2', sub: 'THROW WITH 100M' }
export const HACKED_EGG = { x: 12.5, z: 14 } // just north of the throw zone strip

export const TREES = [
  [-5.2, -30], // west of the moat, beside the Admin Board
  [20.5, -19.5], // between the Rainbow Egg and the +75 stone
  [25, -29], // east of the moat
  [-40, -44],
  [-30, -42],
  [-8, -43],
  [36, -42],
  [40.5, -8],
  [27, 13], // on the grass east of the portal
  [40, 14],
  [-40, -8],
  [-41, 10],
]

// Circles the player can't walk through: [x, z, radius].
export const COLLIDERS = [
  ...TREES.map(([x, z]) => [x, z, 0.8]),
  ...EGGS.map((e) => [e.x, e.z, 1.3]),
  [FEATURED_PET.x, FEATURED_PET.z, 1.9],
  ...(SHOW_ADDON ? [[CLAIM_CHEST.x, CLAIM_CHEST.z, 1.5]] : []),
  [PORTAL.x, PORTAL.z, 2.2],
  [HACKED_EGG.x, HACKED_EGG.z, 1.2],
  ...(SHOW_ADDON ? [[PHOENIX_RELIC.x, PHOENIX_RELIC.z, 1.3]] : []),
]
