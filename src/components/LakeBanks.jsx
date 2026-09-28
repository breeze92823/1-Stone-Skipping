import { useEffect, useMemo } from 'react'
import { AdditiveBlending, CanvasTexture, SRGBColorSpace } from 'three'
import { BOUNDS, CHECKER, LAKE, LAKE_BANK, PALM_BEACH, WATER_Y } from '../data/world.js'
import { legoMaterial, PALETTE } from '../materials/lego.js'
import { seededRandom } from '../utils/random.js'
import Label from './Label.jsx'

const BANK_BOTTOM = -3
const BEACH_Z = LAKE.maxZ - PALM_BEACH.depth
const BANK_END_Z = LAKE.maxZ + 20 // banks run on a little past the beach
const OUTER_TIER_EXTRA = 30 // the top tier runs off into the distance

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

// Rocks, bushes and palms scattered along the bank tops, kept deterministic
// so they don't move between loads.
function buildBankDecor() {
  const rand = seededRandom(97)
  const items = [] // { kind, x, y, z, s, r }
  for (const side of [-1, 1]) {
    const edge = side < 0 ? LAKE.minX : LAKE.maxX
    for (let z = BOUNDS.maxZ + 6; z < BEACH_Z - 4; z += 6 + rand() * 8) {
      const tier = Math.floor(rand() * LAKE_BANK.tops.length)
      const x = edge + side * (tier * LAKE_BANK.tierWidth + 1.5 + rand() * (LAKE_BANK.tierWidth - 3))
      const roll = rand()
      const nearEnd = z > LAKE.maxZ - 70
      const kind = nearEnd && roll < 0.45 ? 'palm' : roll < 0.45 ? 'rock' : roll < 0.8 ? 'bush' : 'tuft'
      items.push({ kind, x, y: LAKE_BANK.tops[tier], z, s: 0.7 + rand() * 0.8, r: rand() * Math.PI * 2 })
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
// terraced banks either side of the canal, the bright shallows where water
// meets bank, bank scatter, and Palm Beach at the far end with its sign and
// pale blue light wall.
export default function LakeBanks() {
  const bank = legoMaterial({ top: PALETTE.grass, top2: PALETTE.grass2, side: PALETTE.dirt, side2: PALETTE.dirt2, checker: CHECKER })
  const sand = legoMaterial({ top: '#f4e2a8', side: '#dcc27f', stud: 0.5 })
  const shallows = legoMaterial({ top: '#a6f4ff', emissive: '#7feaff', emissiveIntensity: 0.35, studStrength: 0, transparent: true, opacity: 0.85 })
  const rock = legoMaterial({ top: '#b8c0ca', side: '#949eab', stud: 0.4 })
  const bush = legoMaterial({ top: PALETTE.leafLight, side: PALETTE.leaf, stud: 0.4 })
  const tuft = legoMaterial({ top: '#2f9f2a', studStrength: 0 })

  const decor = useMemo(buildBankDecor, [])
  const glow = useMemo(() => {
    const t = new CanvasTexture(makeGlowCanvas())
    t.colorSpace = SRGBColorSpace
    return t
  }, [])
  useEffect(() => () => glow.dispose(), [glow])

  const bankLength = BANK_END_Z - BOUNDS.maxZ
  const bankMidZ = (BANK_END_Z + BOUNDS.maxZ) / 2
  const canalW = LAKE.maxX - LAKE.minX
  const canalMidX = (LAKE.minX + LAKE.maxX) / 2

  return (
    <group>
      {/* terraced banks */}
      {[-1, 1].map((side) =>
        LAKE_BANK.tops.map((top, t) => {
          const edge = side < 0 ? LAKE.minX : LAKE.maxX
          const last = t === LAKE_BANK.tops.length - 1
          const w = LAKE_BANK.tierWidth + (last ? OUTER_TIER_EXTRA : 0)
          const x = edge + side * (t * LAKE_BANK.tierWidth + w / 2)
          return (
            <mesh key={`${side}-${t}`} position={[x, (top + BANK_BOTTOM) / 2, bankMidZ]} material={bank} castShadow receiveShadow>
              <boxGeometry args={[w, top - BANK_BOTTOM, bankLength]} />
            </mesh>
          )
        }),
      )}

      {/* bright shallows along both edges of the canal */}
      {[LAKE.minX + 0.7, LAKE.maxX - 0.7].map((x) => (
        <mesh key={x} position={[x, WATER_Y + 0.02, (BOUNDS.maxZ + BEACH_Z) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={shallows}>
          <planeGeometry args={[1.4, BEACH_Z - BOUNDS.maxZ]} />
        </mesh>
      ))}

      {decor.map((d, i) => {
        if (d.kind === 'palm') return <PalmTree key={i} position={[d.x, d.y, d.z]} scale={d.s + 0.3} spin={d.r} />
        if (d.kind === 'rock')
          return (
            <mesh key={i} position={[d.x, d.y + 0.3 * d.s, d.z]} rotation={[0, d.r, 0]} scale={[d.s * 1.4, d.s * 0.8, d.s]} material={rock} castShadow>
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

      {/* Palm Beach across the far end */}
      <mesh position={[canalMidX, (PALM_BEACH.top + BANK_BOTTOM) / 2, (BEACH_Z + BANK_END_Z) / 2]} material={sand} receiveShadow>
        <boxGeometry args={[canalW + 2, PALM_BEACH.top - BANK_BOTTOM, BANK_END_Z - BEACH_Z]} />
      </mesh>
      {[-0.42, -0.25, -0.05, 0.18, 0.38].map((f, i) => (
        <PalmTree
          key={i}
          position={[canalMidX + f * canalW, PALM_BEACH.top, BEACH_Z + 4 + (i % 2) * 3]}
          scale={1.4 + (i % 3) * 0.2}
          spin={i * 1.3}
          lean={0.1 + (i % 2) * 0.06}
        />
      ))}
      <Label
        position={[canalMidX, 9, BEACH_Z + 2]}
        lines={[
          {
            parts: [{ icon: 'palm' }, { text: PALM_BEACH.label }, { icon: 'palm' }],
            size: 3.6,
            fill: ['#9ff6ff', '#2ec9e6'],
            stroke: '#0f3b4a',
            strokeWidth: 0.14,
          },
        ]}
      />
      {/* pale blue light wall rising behind the beach */}
      <mesh position={[canalMidX, 22, LAKE.maxZ - 2]}>
        <planeGeometry args={[canalW + 10, 44]} />
        <meshBasicMaterial map={glow} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  )
}
