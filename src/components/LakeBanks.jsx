import { useEffect, useMemo } from 'react'
import { AdditiveBlending, CanvasTexture, SRGBColorSpace } from 'three'
import { BOUNDS, CHECKER, LAKE, LAKE_BANK, LAKE_END, LAKE_ZONES, WATER_Y } from '../data/world.js'
import { legoMaterial, PALETTE } from '../materials/lego.js'
import { seededRandom } from '../utils/random.js'
import Label from './Label.jsx'

const BANK_BOTTOM = -3
const BEACH_Z = LAKE.maxZ - LAKE_END.depth
const BANK_END_Z = LAKE.maxZ + 20 // banks run on a little past the beach
const OUTER_TIER_EXTRA = 30 // the top tier runs off into the distance
const SIGN_Y = 9 // zone name signs hang this high over the water

// Look of each lake zone (by LAKE_ZONES id): bank colours, which scatter
// kinds it rolls, the prop lining the end beach, and its sign colours.
const ZONE_THEMES = {
  palm: {
    bank: { top: PALETTE.grass, top2: PALETTE.grass2, side: PALETTE.dirt, side2: PALETTE.dirt2 },
    pick: (roll, nearEnd) => (nearEnd && roll < 0.45 ? 'palm' : roll < 0.45 ? 'rock' : roll < 0.8 ? 'bush' : 'tuft'),
    beachProp: 'palm',
    sign: { fill: ['#9ff6ff', '#2ec9e6'], stroke: '#0f3b4a' },
  },
  desert: {
    bank: { top: '#f3d892', top2: '#ecca78', side: '#f0b75c', side2: '#e19c3f' },
    pick: (roll) => (roll < 0.4 ? 'cactus' : roll < 0.65 ? 'pillar' : roll < 0.85 ? 'sandrock' : 'tuft'),
    beachProp: 'cactus',
    sign: { fill: ['#ffe98a', '#f5a623'], stroke: '#3d2408' },
  },
  autumn: {
    bank: { top: '#f6c47c', top2: '#eea95a', side: '#ec9844', side2: '#d97a2c' },
    pick: (roll) => (roll < 0.45 ? 'autumnTree' : roll < 0.68 ? 'pumpkin' : roll < 0.85 ? 'leaves' : 'rock'),
    beachProp: 'autumnTree',
    sign: { fill: ['#ffd37a', '#f28a1e'], stroke: '#3a1d06' },
  },
  frost: {
    bank: { top: '#f2fbff', top2: '#dff3fb', side: '#b9e4f2', side2: '#a2d6e8' },
    pick: (roll) => (roll < 0.45 ? 'snowPine' : roll < 0.7 ? 'ice' : roll < 0.87 ? 'snowmound' : 'rock'),
    beachProp: 'snowPine',
    sign: { fill: ['#ffffff', '#bfe9f7'], stroke: '#123648' },
  },
  marsh: {
    bank: { top: '#6fc13f', top2: '#5aab32', side: '#3f7f2a', side2: '#356d24' },
    pick: (roll) => (roll < 0.35 ? 'mushroom' : roll < 0.6 ? 'smallMushroom' : roll < 0.82 ? 'reeds' : 'bush'),
    beachProp: 'mushroom',
    sign: { fill: ['#b6f05a', '#4fae2a'], stroke: '#1d3a0e' },
  },
  candy: {
    bank: { top: '#ffc2dc', top2: '#ffadd0', side: '#f68fbb', side2: '#ec7aab' },
    pick: (roll) => (roll < 0.35 ? 'lollipop' : roll < 0.55 ? 'cake' : roll < 0.8 ? 'candyCane' : 'gumdrop'),
    beachProp: 'lollipop',
    sign: { fill: ['#ffd1e6', '#ff7fb5'], stroke: '#5a1f3d' },
  },
  crystal: {
    bank: { top: '#8f68dc', top2: '#7f58cc', side: '#6a44b4', side2: '#5b389f' },
    pick: (roll) => (roll < 0.5 ? 'crystal' : roll < 0.68 ? 'geode' : roll < 0.84 ? 'runeStone' : 'rock'),
    beachProp: 'crystal',
    sign: { fill: ['#dcc4ff', '#9b6df0'], stroke: '#2b1552' },
  },
  ember: {
    bank: { top: '#c8613a', top2: '#b6532f', side: '#96421f', side2: '#83371a' },
    pick: (roll) => (roll < 0.35 ? 'mesa' : roll < 0.6 ? 'deadTree' : roll < 0.85 ? 'lavaRock' : 'cactus'),
    beachProp: 'mesa',
    sign: { fill: ['#ffe27a', '#ff8a1f'], stroke: '#4a1a06' },
  },
  starfall: {
    bank: { top: '#5a63c4', top2: '#4c55b4', side: '#3a4194', side2: '#2f3583' },
    pick: (roll) => (roll < 0.3 ? 'star' : roll < 0.5 ? 'moon' : roll < 0.7 ? 'planet' : 'meteor'),
    beachProp: 'moon',
    sign: { fill: ['#dfe4ff', '#8a9bff'], stroke: '#141a52' },
  },
}

// Where each zone's stretch of bank starts and ends along the canal.
const ZONE_SPANS = LAKE_ZONES.map((zone, i) => ({
  zone,
  theme: ZONE_THEMES[zone.id],
  z0: i === 0 ? BOUNDS.maxZ : zone.startZ, // the first zone's banks begin at the throw zone
  z1: i === LAKE_ZONES.length - 1 ? BANK_END_Z : LAKE_ZONES[i + 1].startZ,
}))

const AUTUMN_LEAVES = [
  { top: '#ff9f2e', side: '#e5801c' },
  { top: '#ffc93a', side: '#e8a91f' },
  { top: '#f25c2a', side: '#cf4318' },
]

// Palm tree: a gently curving trunk of stacked blocks topped with drooping
// fronds and a few coconuts.
function PalmTree({ position, scale = 1, lean = 0.12, spin = 0 }) {
  const trunk = legoMaterial({ top: '#c79a5c', side: '#a8773f', stud: 0.3 })
  const frond = legoMaterial({ top: '#5fd84a', side: '#3fbf3a', studStrength: 0 })
  const nut = legoMaterial({ top: '#6b4424', studStrength: 0 })
  const SEGMENTS = 7
  const segments = Array.from({ length: SEGMENTS }, (_, i) => {
    const t = i / (SEGMENTS - 1)
    return { x: Math.sin(t * 1.4) * lean * 6, y: 0.45 + i * 0.85, tilt: -t * lean * 2.2 }
  })
  const top = segments[SEGMENTS - 1]

  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      {segments.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, 0]} rotation={[0, 0, s.tilt]} material={trunk} castShadow>
          <boxGeometry args={[0.55 - i * 0.03, 0.9, 0.55 - i * 0.03]} />
        </mesh>
      ))}
      <group position={[top.x, top.y + 0.4, 0]}>
        {Array.from({ length: 6 }, (_, i) => (
          <group key={i} rotation={[0, (i / 6) * Math.PI * 2, 0]}>
            <mesh position={[1.3, -0.3, 0]} rotation={[0, 0, -0.45]} material={frond} castShadow>
              <boxGeometry args={[2.8, 0.1, 0.75]} />
            </mesh>
          </group>
        ))}
        {[0, 2.1, 4.2].map((a) => (
          <mesh key={a} position={[Math.cos(a) * 0.3, -0.35, Math.sin(a) * 0.3]} material={nut}>
            <sphereGeometry args={[0.18, 8, 6]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// Blocky saguaro: a tall trunk with one raised arm either side.
function Cactus({ position, scale = 1, spin = 0 }) {
  const green = legoMaterial({ top: '#6fcf4f', side: '#4fae3c', stud: 0.3 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      <mesh position={[0, 1.8, 0]} material={green} castShadow>
        <boxGeometry args={[0.8, 3.6, 0.8]} />
      </mesh>
      <mesh position={[-0.7, 1.4, 0]} material={green} castShadow>
        <boxGeometry args={[0.8, 0.5, 0.5]} />
      </mesh>
      <mesh position={[-0.95, 2.05, 0]} material={green} castShadow>
        <boxGeometry args={[0.5, 1.5, 0.5]} />
      </mesh>
      <mesh position={[0.7, 2.1, 0]} material={green} castShadow>
        <boxGeometry args={[0.8, 0.5, 0.5]} />
      </mesh>
      <mesh position={[0.95, 2.65, 0]} material={green} castShadow>
        <boxGeometry args={[0.5, 1.2, 0.5]} />
      </mesh>
    </group>
  )
}

// Sandstone pillar: a few stacked, shrinking blocks, slightly offset.
function Pillar({ position, scale = 1, spin = 0 }) {
  const stone = legoMaterial({ top: '#f4cf87', side: '#e0a95a', stud: 0.4 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      <mesh position={[0, 0.9, 0]} material={stone} castShadow>
        <boxGeometry args={[2, 1.8, 1.8]} />
      </mesh>
      <mesh position={[0.15, 2.3, -0.1]} material={stone} castShadow>
        <boxGeometry args={[1.5, 1.0, 1.4]} />
      </mesh>
      <mesh position={[-0.1, 3.2, 0.05]} material={stone} castShadow>
        <boxGeometry args={[1.1, 0.8, 1.0]} />
      </mesh>
    </group>
  )
}

// Autumn tree: a block trunk under a lumpy canopy of orange, yellow or red
// leaves (`variant` picks which).
function AutumnTree({ position, scale = 1, spin = 0, variant = 0 }) {
  const bark = legoMaterial({ top: '#8a5a32', side: '#6e4424', stud: 0.3 })
  const leaves = legoMaterial({ ...AUTUMN_LEAVES[variant % AUTUMN_LEAVES.length], stud: 0.4 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      <mesh position={[0, 1.4, 0]} material={bark} castShadow>
        <boxGeometry args={[0.5, 2.8, 0.5]} />
      </mesh>
      <mesh position={[0, 3.4, 0]} material={leaves} castShadow>
        <dodecahedronGeometry args={[1.5, 0]} />
      </mesh>
      <mesh position={[0.9, 3.0, 0.3]} material={leaves} castShadow>
        <dodecahedronGeometry args={[0.95, 0]} />
      </mesh>
      <mesh position={[-0.8, 3.1, -0.4]} material={leaves} castShadow>
        <dodecahedronGeometry args={[0.85, 0]} />
      </mesh>
    </group>
  )
}

// Squat ribbed pumpkin with a little stem.
function Pumpkin({ position, scale = 1, spin = 0 }) {
  const skin = legoMaterial({ top: '#ff8a1f', side: '#e8700f', studStrength: 0 })
  const stem = legoMaterial({ top: '#4f8a2a', studStrength: 0 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      <mesh position={[0, 0.4, 0]} scale={[1, 0.72, 1]} material={skin} castShadow>
        <sphereGeometry args={[0.6, 8, 6]} />
      </mesh>
      <mesh position={[0, 0.9, 0]} material={stem}>
        <boxGeometry args={[0.12, 0.25, 0.12]} />
      </mesh>
    </group>
  )
}

// Snow-covered pine: a short trunk under three shrinking tiers of white-frosted
// green cones.
function SnowPine({ position, scale = 1, spin = 0 }) {
  const bark = legoMaterial({ top: '#8a5a32', side: '#6e4424', studStrength: 0 })
  const snow = legoMaterial({ top: '#f4fcff', side: '#cfeaf3', studStrength: 0 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      <mesh position={[0, 0.5, 0]} material={bark} castShadow>
        <boxGeometry args={[0.5, 1, 0.5]} />
      </mesh>
      {[
        [1.9, 1.7, 1.6],
        [3.0, 1.35, 1.4],
        [4.0, 0.95, 1.2],
      ].map(([y, r, h], i) => (
        <mesh key={i} position={[0, y, 0]} material={snow} castShadow>
          <coneGeometry args={[r, h, 8]} />
        </mesh>
      ))}
    </group>
  )
}

// Cluster of translucent ice crystals.
function IceCrystal({ position, scale = 1, spin = 0 }) {
  const ice = legoMaterial({ top: '#c4f0ff', side: '#8fd8f0', studStrength: 0, transparent: true, opacity: 0.85 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      <mesh position={[0, 1.3, 0]} material={ice} castShadow>
        <boxGeometry args={[1.1, 2.6, 1.0]} />
      </mesh>
      <mesh position={[0.85, 0.8, 0.2]} rotation={[0, 0, -0.25]} material={ice} castShadow>
        <boxGeometry args={[0.7, 1.6, 0.7]} />
      </mesh>
      <mesh position={[-0.7, 0.6, -0.2]} rotation={[0, 0, 0.3]} material={ice} castShadow>
        <boxGeometry args={[0.6, 1.2, 0.6]} />
      </mesh>
    </group>
  )
}

// Giant mushroom: a cream stem under a wide domed cap. `variant` 0 is the
// red-with-white-spots cap, 1 a dusty purple one.
function Mushroom({ position, scale = 1, spin = 0, variant = 0 }) {
  const stem = legoMaterial({ top: '#f0e2c4', side: '#e0cfa8', studStrength: 0 })
  const cap = legoMaterial(variant ? { top: '#a88bb3', side: '#8c6f99', studStrength: 0 } : { top: '#f0453a', side: '#d1352b', studStrength: 0 })
  const dots = legoMaterial({ top: '#ffe9e5', studStrength: 0 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      <mesh position={[0, 1.2, 0]} material={stem} castShadow>
        <cylinderGeometry args={[0.4, 0.55, 2.4, 8]} />
      </mesh>
      <mesh position={[0, 2.5, 0]} scale={[1, 0.62, 1]} material={cap} castShadow>
        <sphereGeometry args={[1.5, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {!variant &&
        [[0.6, 3.15, 0.4], [-0.7, 3.0, 0.2], [0.1, 3.45, -0.5]].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} material={dots}>
            <sphereGeometry args={[0.22, 6, 5]} />
          </mesh>
        ))}
    </group>
  )
}

// Tuft of tall marsh reeds, each topped with a brown cattail.
function Reeds({ position, scale = 1, spin = 0 }) {
  const reed = legoMaterial({ top: '#5fa835', side: '#4a8f2a', studStrength: 0 })
  const tail = legoMaterial({ top: '#7a4b26', studStrength: 0 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      {[[0, 0, 2.2], [0.35, 0.1, 1.7], [-0.3, -0.15, 1.9]].map(([x, z, h], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, h / 2, 0]} material={reed} castShadow>
            <boxGeometry args={[0.1, h, 0.1]} />
          </mesh>
          <mesh position={[0, h + 0.15, 0]} material={tail}>
            <cylinderGeometry args={[0.1, 0.1, 0.4, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Lollipop: a slim white stick under a big swirled disc (`variant` picks pink,
// orange or purple).
const LOLLIPOP_COLORS = ['#ff6fae', '#ff9a3c', '#a97bff']
function Lollipop({ position, scale = 1, spin = 0, variant = 0 }) {
  const stick = legoMaterial({ top: '#fff4f4', side: '#f0dede', studStrength: 0 })
  const disc = legoMaterial({ top: LOLLIPOP_COLORS[variant % 3], studStrength: 0 })
  const swirl = legoMaterial({ top: '#fff7ea', studStrength: 0 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      <mesh position={[0, 1.6, 0]} material={stick} castShadow>
        <cylinderGeometry args={[0.13, 0.13, 3.2, 6]} />
      </mesh>
      <group position={[0, 3.6, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={disc} castShadow>
          <cylinderGeometry args={[1.1, 1.1, 0.3, 16]} />
        </mesh>
        {[0.75, 0.4].flatMap((r) =>
          [0.17, -0.17].map((z) => (
            <mesh key={`${r}${z}`} position={[0, 0, z]} material={swirl}>
              <torusGeometry args={[r, 0.09, 6, 20]} />
            </mesh>
          )),
        )}
      </group>
    </group>
  )
}

// Candy cane: red and white striped stem with a hooked top.
function CandyCane({ position, scale = 1, spin = 0 }) {
  const red = legoMaterial({ top: '#f0393f', side: '#d2262c', studStrength: 0 })
  const white = legoMaterial({ top: '#ffffff', side: '#eeeeee', studStrength: 0 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0, 0.35 + i * 0.5, 0]} material={i % 2 ? white : red} castShadow>
          <boxGeometry args={[0.45, 0.5, 0.45]} />
        </mesh>
      ))}
      <mesh position={[0.3, 3.35, 0]} material={red} castShadow>
        <boxGeometry args={[0.85, 0.45, 0.45]} />
      </mesh>
      <mesh position={[0.62, 3.0, 0]} material={white} castShadow>
        <boxGeometry args={[0.45, 0.5, 0.45]} />
      </mesh>
    </group>
  )
}

// Layer cake: sponge and cream tiers with a pink icing top and a cherry.
function Cake({ position, scale = 1, spin = 0 }) {
  const sponge = legoMaterial({ top: '#c98b52', side: '#b57840', studStrength: 0 })
  const cream = legoMaterial({ top: '#fff3df', side: '#f5e2c4', studStrength: 0 })
  const icing = legoMaterial({ top: '#ff9cc4', side: '#f57fb0', studStrength: 0 })
  const cherry = legoMaterial({ top: '#e0202d', studStrength: 0 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      <mesh position={[0, 0.35, 0]} material={sponge} castShadow>
        <boxGeometry args={[2.2, 0.7, 2.2]} />
      </mesh>
      <mesh position={[0, 0.83, 0]} material={cream} castShadow>
        <boxGeometry args={[2.3, 0.26, 2.3]} />
      </mesh>
      <mesh position={[0, 1.25, 0]} material={sponge} castShadow>
        <boxGeometry args={[2.2, 0.58, 2.2]} />
      </mesh>
      <mesh position={[0, 1.7, 0]} material={icing} castShadow>
        <boxGeometry args={[2.3, 0.34, 2.3]} />
      </mesh>
      <mesh position={[0, 2.0, 0]} material={cherry}>
        <sphereGeometry args={[0.28, 8, 6]} />
      </mesh>
    </group>
  )
}

// Crystal cluster: hexagonal glowing shards of different heights leaning out
// from a shared base (`variant` picks violet, pink or blue).
const CRYSTAL_COLORS = ['#b58cff', '#e58cff', '#8ca8ff']
function Crystal({ position, scale = 1, spin = 0, variant = 0 }) {
  const c = CRYSTAL_COLORS[variant % 3]
  const shard = legoMaterial({ top: c, side: c, emissive: c, emissiveIntensity: 0.25, studStrength: 0 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      {[
        [0, 0, 0, 2.6, 0.5],
        [0.7, -0.15, 0.3, 1.6, 0.36],
        [-0.65, 0.2, -0.2, 1.9, 0.4],
        [0.15, 0.25, -0.7, 1.2, 0.3],
      ].map(([x, tilt, z, h, r], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, 0, tilt]}>
          <mesh position={[0, h / 2, 0]} material={shard} castShadow>
            <cylinderGeometry args={[r * 0.85, r, h, 6]} />
          </mesh>
          <mesh position={[0, h + r * 0.55, 0]} material={shard} castShadow>
            <coneGeometry args={[r * 0.85, r * 1.1, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Geode: a dark cracked boulder with a purple crystal bed showing on top.
function Geode({ position, scale = 1, spin = 0 }) {
  const shell = legoMaterial({ top: '#7d6f96', side: '#615478', stud: 0.4 })
  const inner = legoMaterial({ top: '#c9a6ff', emissive: '#a97bff', emissiveIntensity: 0.3, studStrength: 0 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      <mesh position={[0, 0.5, 0]} scale={[1.3, 0.8, 1.1]} material={shell} castShadow>
        <dodecahedronGeometry args={[0.9, 0]} />
      </mesh>
      <mesh position={[0, 1.0, 0]} scale={[0.9, 0.35, 0.8]} material={inner}>
        <dodecahedronGeometry args={[0.7, 0]} />
      </mesh>
    </group>
  )
}

// Standing stone: a tall dark slab with a glowing rune bar.
function RuneStone({ position, scale = 1, spin = 0 }) {
  const slab = legoMaterial({ top: '#6d5f8a', side: '#54476e', stud: 0.4 })
  const rune = legoMaterial({ top: '#d9c2ff', emissive: '#b58cff', emissiveIntensity: 0.6, studStrength: 0 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      <mesh position={[0, 1.4, 0]} material={slab} castShadow>
        <boxGeometry args={[1.3, 2.8, 0.7]} />
      </mesh>
      <mesh position={[0, 1.7, 0.36]} material={rune}>
        <boxGeometry args={[0.16, 1.1, 0.04]} />
      </mesh>
      <mesh position={[0, 1.95, 0.36]} material={rune}>
        <boxGeometry args={[0.6, 0.14, 0.04]} />
      </mesh>
    </group>
  )
}

// Red sandstone mesa: a wide stepped stack of canyon-red blocks.
function Mesa({ position, scale = 1, spin = 0 }) {
  const rockA = legoMaterial({ top: '#c9683f', side: '#a9502c', stud: 0.4 })
  const rockB = legoMaterial({ top: '#dd8354', side: '#bd6438', stud: 0.4 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      <mesh position={[0, 0.9, 0]} material={rockA} castShadow>
        <boxGeometry args={[2.6, 1.8, 2.2]} />
      </mesh>
      <mesh position={[0.1, 2.3, 0]} material={rockB} castShadow>
        <boxGeometry args={[2.0, 1.0, 1.7]} />
      </mesh>
      <mesh position={[-0.1, 3.2, 0.05]} material={rockA} castShadow>
        <boxGeometry args={[1.5, 0.8, 1.3]} />
      </mesh>
    </group>
  )
}

// Dead tree: a bare trunk with two forked branches.
function DeadTree({ position, scale = 1, spin = 0 }) {
  const wood = legoMaterial({ top: '#7a4a32', side: '#5f3823', stud: 0.3 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      <mesh position={[0, 1.4, 0]} material={wood} castShadow>
        <boxGeometry args={[0.45, 2.8, 0.45]} />
      </mesh>
      <mesh position={[0.5, 2.5, 0]} rotation={[0, 0, -0.7]} material={wood} castShadow>
        <boxGeometry args={[0.28, 1.4, 0.28]} />
      </mesh>
      <mesh position={[-0.45, 2.9, 0]} rotation={[0, 0, 0.6]} material={wood} castShadow>
        <boxGeometry args={[0.28, 1.2, 0.28]} />
      </mesh>
    </group>
  )
}

// Lava rock: a dark charred boulder with a glowing molten crack on top.
function LavaRock({ position, scale = 1, spin = 0 }) {
  const char = legoMaterial({ top: '#4a3a3a', side: '#372b2b', stud: 0.4 })
  const lava = legoMaterial({ top: '#ffb13a', emissive: '#ff6a1a', emissiveIntensity: 0.9, studStrength: 0 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      <mesh position={[0, 0.55, 0]} scale={[1.3, 0.85, 1.1]} material={char} castShadow>
        <dodecahedronGeometry args={[0.9, 0]} />
      </mesh>
      <mesh position={[0, 1.12, 0]} scale={[0.9, 0.08, 0.18]} material={lava}>
        <boxGeometry args={[1.6, 1, 1]} />
      </mesh>
    </group>
  )
}

// Floating four-point star: two crossed gold shards hovering above the bank.
function Star({ position, scale = 1, spin = 0 }) {
  const gold = legoMaterial({ top: '#ffd84a', side: '#ffc21f', emissive: '#ffb800', emissiveIntensity: 0.7, studStrength: 0 })
  return (
    <group position={[position[0], position[1] + 2.4 * scale, position[2]]} scale={scale} rotation={[0, spin, 0]}>
      <mesh scale={[0.35, 1, 0.35]} material={gold}>
        <octahedronGeometry args={[1, 0]} />
      </mesh>
      <mesh scale={[1, 0.35, 0.35]} material={gold}>
        <octahedronGeometry args={[1, 0]} />
      </mesh>
    </group>
  )
}

// Crescent moon: a thick partial ring of pale glowing stone, standing upright.
function Moon({ position, scale = 1, spin = 0 }) {
  const moon = legoMaterial({ top: '#e4dcff', side: '#cbbff5', emissive: '#b9a8ff', emissiveIntensity: 0.45, studStrength: 0 })
  return (
    <group position={[position[0], position[1] + 2.8 * scale, position[2]]} scale={scale} rotation={[0, spin, 0]}>
      <mesh rotation={[0, 0, Math.PI * 0.35]} material={moon}>
        <torusGeometry args={[1.1, 0.4, 8, 20, Math.PI * 1.3]} />
      </mesh>
    </group>
  )
}

// Ringed planet floating above the bank.
function Planet({ position, scale = 1, spin = 0, variant = 0 }) {
  const body = legoMaterial({ top: ['#59a8ff', '#ff8fb8', '#7fe0c0'][variant % 3], studStrength: 0 })
  const ring = legoMaterial({ top: '#fff0c0', side: '#e6d29a', studStrength: 0 })
  return (
    <group position={[position[0], position[1] + 2.6 * scale, position[2]]} scale={scale} rotation={[0, spin, 0]}>
      <mesh material={body} castShadow>
        <sphereGeometry args={[0.8, 12, 10]} />
      </mesh>
      <mesh rotation={[Math.PI / 2 - 0.35, 0, 0.2]} scale={[1, 1, 0.12]} material={ring}>
        <torusGeometry args={[1.25, 0.28, 6, 24]} />
      </mesh>
    </group>
  )
}

// Meteorite: a dark boulder with a glowing pale-blue crack.
function Meteor({ position, scale = 1, spin = 0 }) {
  const rockMat = legoMaterial({ top: '#4e5670', side: '#3a4157', stud: 0.4 })
  const crack = legoMaterial({ top: '#9fe8ff', emissive: '#5fd0ff', emissiveIntensity: 0.9, studStrength: 0 })
  return (
    <group position={position} scale={scale} rotation={[0, spin, 0]}>
      <mesh position={[0, 0.55, 0]} scale={[1.3, 0.85, 1.1]} material={rockMat} castShadow>
        <dodecahedronGeometry args={[0.9, 0]} />
      </mesh>
      <mesh position={[0, 1.12, 0]} scale={[0.9, 0.08, 0.18]} material={crack}>
        <boxGeometry args={[1.6, 1, 1]} />
      </mesh>
    </group>
  )
}

// Rocks, bushes, palms, cacti, pillars, autumn trees, pumpkins, snow pines,
// ice crystals, mushrooms, reeds, candy, crystals, canyon rock and night-sky
// props scattered along each zone's bank tops, kept deterministic so they don't move between loads.
function buildBankDecor() {
  const rand = seededRandom(97)
  const items = [] // { kind, x, y, z, s, r }
  for (const { theme, z0, z1: spanEnd } of ZONE_SPANS) {
    const z1 = Math.min(spanEnd, BEACH_Z) - 4
    for (const side of [-1, 1]) {
      const edge = side < 0 ? LAKE.minX : LAKE.maxX
      for (let z = z0 + 6; z < z1; z += 6 + rand() * 8) {
        const tier = Math.floor(rand() * LAKE_BANK.tops.length)
        const x = edge + side * (tier * LAKE_BANK.tierWidth + 1.5 + rand() * (LAKE_BANK.tierWidth - 3))
        const kind = theme.pick(rand(), z > spanEnd - 70)
        items.push({ kind, x, y: LAKE_BANK.tops[tier], z, s: 0.7 + rand() * 0.8, r: rand() * Math.PI * 2, v: items.length % 3 })
      }
    }
  }
  return items
}

function makeGlowCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 8
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, 'rgba(160,235,255,0)')
  g.addColorStop(0.55, 'rgba(160,235,255,0.35)')
  g.addColorStop(1, 'rgba(200,245,255,0.75)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 8, 256)
  return canvas
}

// Everything south of the throw zone except the water itself: the low
// terraced banks either side of the canal (themed per LAKE_ZONES), the bright
// shallows where water meets bank, bank scatter, each zone's name sign over
// the water, and the sandy end beach with its pale blue light wall.
export default function LakeBanks() {
  const sand = legoMaterial({ top: '#f4e2a8', side: '#dcc27f', stud: 0.5 })
  const rock = legoMaterial({ top: '#b8c0ca', side: '#949eab', stud: 0.4 })
  const sandrock = legoMaterial({ top: '#eec27a', side: '#d49a4f', stud: 0.4 })
  const bush = legoMaterial({ top: PALETTE.leafLight, side: PALETTE.leaf, stud: 0.4 })
  const tuft = legoMaterial({ top: '#2f9f2a', studStrength: 0 })
  const snowMound = legoMaterial({ top: '#f4fcff', side: '#d6eef6', studStrength: 0 })
  const gumdrops = ['#ff5f8f', '#ffd447', '#6ee0a0'].map((c) => legoMaterial({ top: c, side: c, studStrength: 0 }))
  const leafPile = legoMaterial({ top: '#e8541f', side: '#c9401a', studStrength: 0 })

  const decor = useMemo(buildBankDecor, [])
  const glow = useMemo(() => {
    const t = new CanvasTexture(makeGlowCanvas())
    t.colorSpace = SRGBColorSpace
    return t
  }, [])
  useEffect(() => () => glow.dispose(), [glow])

  const canalW = LAKE.maxX - LAKE.minX
  const canalMidX = (LAKE.minX + LAKE.maxX) / 2
  const endTheme = ZONE_SPANS[ZONE_SPANS.length - 1].theme

  return (
    <group>
      {/* terraced banks, one stretch per zone */}
      {ZONE_SPANS.map(({ zone, theme, z0, z1 }) => {
        const bank = legoMaterial({ ...theme.bank, checker: CHECKER })
        return [-1, 1].map((side) =>
          LAKE_BANK.tops.map((top, t) => {
            const edge = side < 0 ? LAKE.minX : LAKE.maxX
            const last = t === LAKE_BANK.tops.length - 1
            const w = LAKE_BANK.tierWidth + (last ? OUTER_TIER_EXTRA : 0)
            const x = edge + side * (t * LAKE_BANK.tierWidth + w / 2)
            return (
              <mesh key={`${zone.id}-${side}-${t}`} position={[x, (top + BANK_BOTTOM) / 2, (z0 + z1) / 2]} material={bank} castShadow receiveShadow>
                <boxGeometry args={[w, top - BANK_BOTTOM, z1 - z0]} />
              </mesh>
            )
          }),
        )
      })}

      {/* bright shallows along both edges of the canal, tinted per zone */}
      {ZONE_SPANS.map(({ zone, z0, z1 }) => {
        const end = Math.min(z1, BEACH_Z)
        const shallows = legoMaterial({
          top: zone.shallows,
          emissive: zone.shallows,
          emissiveIntensity: 0.3,
          studStrength: 0,
          transparent: true,
          opacity: 0.85,
        })
        return [LAKE.minX + 0.7, LAKE.maxX - 0.7].map((x) => (
          <mesh key={`${zone.id}-${x}`} position={[x, WATER_Y + 0.02, (z0 + end) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={shallows}>
            <planeGeometry args={[1.4, end - z0]} />
          </mesh>
        ))
      })}

      {decor.map((d, i) => {
        if (d.kind === 'palm') return <PalmTree key={i} position={[d.x, d.y, d.z]} scale={d.s + 0.3} spin={d.r} />
        if (d.kind === 'cactus') return <Cactus key={i} position={[d.x, d.y, d.z]} scale={d.s + 0.3} spin={d.r} />
        if (d.kind === 'autumnTree')
          return <AutumnTree key={i} position={[d.x, d.y, d.z]} scale={d.s + 0.3} spin={d.r} variant={d.v} />
        if (d.kind === 'star') return <Star key={i} position={[d.x, d.y, d.z]} scale={d.s + 0.3} spin={d.r} />
        if (d.kind === 'moon') return <Moon key={i} position={[d.x, d.y, d.z]} scale={d.s + 0.3} spin={d.r} />
        if (d.kind === 'planet') return <Planet key={i} position={[d.x, d.y, d.z]} scale={d.s} spin={d.r} variant={d.v} />
        if (d.kind === 'meteor') return <Meteor key={i} position={[d.x, d.y, d.z]} scale={d.s} spin={d.r} />
        if (d.kind === 'mesa') return <Mesa key={i} position={[d.x, d.y, d.z]} scale={d.s + 0.2} spin={d.r} />
        if (d.kind === 'deadTree') return <DeadTree key={i} position={[d.x, d.y, d.z]} scale={d.s + 0.2} spin={d.r} />
        if (d.kind === 'lavaRock') return <LavaRock key={i} position={[d.x, d.y, d.z]} scale={d.s} spin={d.r} />
        if (d.kind === 'crystal') return <Crystal key={i} position={[d.x, d.y, d.z]} scale={d.s + 0.3} spin={d.r} variant={d.v} />
        if (d.kind === 'geode') return <Geode key={i} position={[d.x, d.y, d.z]} scale={d.s} spin={d.r} />
        if (d.kind === 'runeStone') return <RuneStone key={i} position={[d.x, d.y, d.z]} scale={d.s} spin={d.r} />
        if (d.kind === 'lollipop') return <Lollipop key={i} position={[d.x, d.y, d.z]} scale={d.s + 0.3} spin={d.r} variant={d.v} />
        if (d.kind === 'candyCane') return <CandyCane key={i} position={[d.x, d.y, d.z]} scale={d.s + 0.2} spin={d.r} />
        if (d.kind === 'cake') return <Cake key={i} position={[d.x, d.y, d.z]} scale={d.s} spin={d.r} />
        if (d.kind === 'gumdrop')
          return (
            <mesh key={i} position={[d.x, d.y + 0.3 * d.s, d.z]} scale={[d.s, d.s * 0.85, d.s]} material={gumdrops[d.v]} castShadow>
              <sphereGeometry args={[0.6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
          )
        if (d.kind === 'mushroom') return <Mushroom key={i} position={[d.x, d.y, d.z]} scale={d.s + 0.4} spin={d.r} variant={d.v % 2} />
        if (d.kind === 'smallMushroom') return <Mushroom key={i} position={[d.x, d.y, d.z]} scale={d.s * 0.45} spin={d.r} variant={d.v % 2} />
        if (d.kind === 'reeds') return <Reeds key={i} position={[d.x, d.y, d.z]} scale={d.s} spin={d.r} />
        if (d.kind === 'snowPine') return <SnowPine key={i} position={[d.x, d.y, d.z]} scale={d.s + 0.3} spin={d.r} />
        if (d.kind === 'ice') return <IceCrystal key={i} position={[d.x, d.y, d.z]} scale={d.s} spin={d.r} />
        if (d.kind === 'snowmound')
          return (
            <mesh key={i} position={[d.x, d.y + 0.1, d.z]} rotation={[0, d.r, 0]} scale={[d.s * 1.8, 0.5, d.s * 1.4]} material={snowMound}>
              <dodecahedronGeometry args={[0.8, 0]} />
            </mesh>
          )
        if (d.kind === 'pumpkin') return <Pumpkin key={i} position={[d.x, d.y, d.z]} scale={d.s} spin={d.r} />
        if (d.kind === 'leaves')
          return (
            <mesh key={i} position={[d.x, d.y + 0.1, d.z]} rotation={[0, d.r, 0]} scale={[d.s * 1.6, 0.25, d.s * 1.3]} material={leafPile}>
              <dodecahedronGeometry args={[0.8, 0]} />
            </mesh>
          )
        if (d.kind === 'pillar') return <Pillar key={i} position={[d.x, d.y, d.z]} scale={d.s} spin={d.r} />
        if (d.kind === 'rock' || d.kind === 'sandrock')
          return (
            <mesh
              key={i}
              position={[d.x, d.y + 0.3 * d.s, d.z]}
              rotation={[0, d.r, 0]}
              scale={[d.s * 1.4, d.s * 0.8, d.s]}
              material={d.kind === 'rock' ? rock : sandrock}
              castShadow
            >
              <dodecahedronGeometry args={[0.8, 0]} />
            </mesh>
          )
        if (d.kind === 'bush')
          return (
            <group key={i} position={[d.x, d.y, d.z]} rotation={[0, d.r, 0]} scale={d.s}>
              <mesh position={[0, 0.45, 0]} material={bush} castShadow>
                <boxGeometry args={[1.4, 0.9, 1.2]} />
              </mesh>
              <mesh position={[0.4, 0.95, 0.1]} material={bush} castShadow>
                <boxGeometry args={[0.8, 0.5, 0.8]} />
              </mesh>
            </group>
          )
        return (
          <mesh key={i} position={[d.x, d.y + 0.2, d.z]} rotation={[0, d.r, 0]} material={tuft}>
            <coneGeometry args={[0.35, 0.5, 4]} />
          </mesh>
        )
      })}

      {/* each zone's name sign, hanging over the water where the zone starts */}
      {ZONE_SPANS.map(({ zone, theme }) => (
        <Label
          key={zone.id}
          position={[canalMidX, SIGN_Y, zone.startZ + 2]}
          lines={[
            {
              parts: [{ icon: zone.icon }, { text: zone.label }, { icon: zone.icon }],
              size: 3.6,
              fill: theme.sign.fill,
              stroke: theme.sign.stroke,
              strokeWidth: 0.14,
            },
          ]}
        />
      ))}

      {/* sandy beach across the far end, lined with the last zone's props */}
      <mesh position={[canalMidX, (LAKE_END.top + BANK_BOTTOM) / 2, (BEACH_Z + BANK_END_Z) / 2]} material={sand} receiveShadow>
        <boxGeometry args={[canalW + 2, LAKE_END.top - BANK_BOTTOM, BANK_END_Z - BEACH_Z]} />
      </mesh>
      {[-0.44, -0.36, 0.36, 0.44].map((f, i) => {
        const position = [canalMidX + f * canalW, LAKE_END.top, BEACH_Z + 4 + (i % 2) * 3]
        const scale = 1.4 + (i % 3) * 0.2
        if (endTheme.beachProp === 'cactus') return <Cactus key={i} position={position} scale={scale} spin={i * 1.3} />
        if (endTheme.beachProp === 'moon') return <Moon key={i} position={position} scale={scale} spin={i * 1.3} />
        if (endTheme.beachProp === 'mesa') return <Mesa key={i} position={position} scale={scale} spin={i * 1.3} />
        if (endTheme.beachProp === 'crystal') return <Crystal key={i} position={position} scale={scale} spin={i * 1.3} variant={i} />
        if (endTheme.beachProp === 'lollipop') return <Lollipop key={i} position={position} scale={scale} spin={i * 1.3} variant={i} />
        if (endTheme.beachProp === 'mushroom') return <Mushroom key={i} position={position} scale={scale} spin={i * 1.3} variant={i % 2} />
        if (endTheme.beachProp === 'snowPine') return <SnowPine key={i} position={position} scale={scale} spin={i * 1.3} />
        if (endTheme.beachProp === 'autumnTree') return <AutumnTree key={i} position={position} scale={scale} spin={i * 1.3} variant={i} />
        return <PalmTree key={i} position={position} scale={scale} spin={i * 1.3} lean={0.1 + (i % 2) * 0.06} />
      })}
      {/* pale blue light wall rising behind the beach */}
      <mesh position={[canalMidX, 22, LAKE.maxZ - 2]}>
        <planeGeometry args={[canalW + 10, 44]} />
        <meshBasicMaterial map={glow} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  )
}
