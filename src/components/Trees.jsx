import { useMemo } from 'react'
import { TREES } from '../data/world.js'
import { legoMaterial, PALETTE } from '../materials/lego.js'
import { seededRandom } from '../utils/random.js'

// Blocky lego trees: a trunk that forks into two angled branches, each
// capped with a slab of canopy, plus a taller slab over the middle.
export function Tree({ position, scale = 1, seed = 1 }) {
  const trunk = legoMaterial({ top: PALETTE.wood, side: PALETTE.wood, stud: 0.4 })
  const leaves = legoMaterial({ top: PALETTE.leafLight, side: PALETTE.leaf, stud: 0.45 })

  const shape = useMemo(() => {
    const r = seededRandom(seed * 9973)
    const lean = (r() - 0.5) * 0.3
    const spin = r() * Math.PI * 2
    const h = 3.2 + r() * 1.2
    return { lean, spin, h, w1: 3.6 + r() * 1.2, w2: 3 + r() * 1.2 }
  }, [seed])

  const { spin, h, w1, w2 } = shape

  return (
    <group position={position} rotation={[0, spin, 0]} scale={scale}>
      <mesh position={[0, h / 2, 0]} material={trunk} castShadow receiveShadow>
        <boxGeometry args={[0.8, h, 0.8]} />
      </mesh>
      <mesh position={[-0.9, h + 0.7, 0]} rotation={[0, 0, 0.7]} material={trunk} castShadow>
        <boxGeometry args={[0.55, 2.4, 0.55]} />
      </mesh>
      <mesh position={[0.9, h + 0.9, 0.2]} rotation={[0.1, 0, -0.65]} material={trunk} castShadow>
        <boxGeometry args={[0.55, 2.6, 0.55]} />
      </mesh>

      <mesh position={[-1.9, h + 2.2, -0.3]} material={leaves} castShadow receiveShadow>
        <boxGeometry args={[w1, 1.8, w1 * 0.9]} />
      </mesh>
      <mesh position={[2, h + 2.6, 0.4]} material={leaves} castShadow receiveShadow>
        <boxGeometry args={[w2, 1.8, w2]} />
      </mesh>
      <mesh position={[0.1, h + 3.4, 0]} material={leaves} castShadow receiveShadow>
        <boxGeometry args={[w2 * 0.9, 1.6, w1 * 0.8]} />
      </mesh>
    </group>
  )
}

export default function Trees() {
  return (
    <group>
      {TREES.map(([x, z], i) => (
        <Tree key={i} position={[x, 0, z]} seed={i + 1} />
      ))}
    </group>
  )
}
