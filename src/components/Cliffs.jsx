import { useLayoutEffect, useMemo, useRef } from 'react'
import { Object3D } from 'three'
import { BOUNDS, CHECKER } from '../data/world.js'
import { legoMaterial, PALETTE } from '../materials/lego.js'
import { seededRandom } from '../utils/random.js'
import { Tree } from './Trees.jsx'

const SEGMENT = 5 // m along the wall per block column
const DEPTH = 5 // m each terrace steps back
const TIERS = 3

// Terraced brick cliffs ringing the lobby: brown checker sides, grass
// checker tops, each column stepping back and up in three tiers. Heights
// snap to the checker size so the checker bands stay whole. Along the lake
// the cliffs are lower so the throw zone view stays open.
function buildCliffs() {
  const rand = seededRandom(7)
  const blocks = [] // [cx, cy, cz, sx, sy, sz]
  const treeSpots = []
  const bottom = -6

  function wall({ along, from, to, fixed, outward, baseHeights, lowAfter }) {
    for (let a = from; a < to; a += SEGMENT) {
      const low = lowAfter !== undefined && a >= lowAfter
      let offset = 0
      for (let t = 0; t < TIERS; t++) {
        const jitter = rand() < 0.35 ? CHECKER : 0
        const depth = DEPTH + jitter
        const hBase = (low ? [5, 7.5, 7.5] : baseHeights)[Math.floor(rand() * 3)]
        const h = hBase + t * (low ? 5 : 7.5) + (rand() < 0.3 ? CHECKER : 0)
        const inner = fixed + outward * offset
        const outer = inner + outward * depth
        const c = (inner + outer) / 2
        const mid = a + SEGMENT / 2
        const sy = h - bottom
        const cy = bottom + sy / 2
        if (along === 'z') blocks.push([c, cy, mid, depth, sy, SEGMENT])
        else blocks.push([mid, cy, c, SEGMENT, sy, depth])
        if (t === 0 && rand() < 0.18) {
          const pos = along === 'z' ? [c, h, mid] : [mid, h, c]
          treeSpots.push(pos)
        }
        offset += depth - (rand() < 0.5 ? CHECKER : 0)
      }
    }
  }

  const heights = [10, 12.5, 15]
  // The lobby's side walls stop at the throw zone; south of it the lake is
  // lined by the low terraced banks in LakeBanks.jsx instead.
  wall({ along: 'z', from: BOUNDS.minZ - 20, to: BOUNDS.maxZ, fixed: BOUNDS.minX, outward: -1, baseHeights: heights, lowAfter: BOUNDS.maxZ - 5 })
  wall({ along: 'z', from: BOUNDS.minZ - 20, to: BOUNDS.maxZ, fixed: BOUNDS.maxX, outward: 1, baseHeights: heights, lowAfter: BOUNDS.maxZ - 5 })
  wall({ along: 'x', from: BOUNDS.minX - 20, to: BOUNDS.maxX + 20, fixed: BOUNDS.minZ, outward: -1, baseHeights: [12.5, 15, 17.5] })

  return { blocks, treeSpots }
}

export default function Cliffs() {
  const ref = useRef()
  const { blocks, treeSpots } = useMemo(buildCliffs, [])
  const material = legoMaterial({
    top: PALETTE.grass,
    top2: PALETTE.grass2,
    side: PALETTE.dirt,
    side2: PALETTE.dirt2,
    checker: CHECKER,
  })

  useLayoutEffect(() => {
    const dummy = new Object3D()
    blocks.forEach(([x, y, z, sx, sy, sz], i) => {
      dummy.position.set(x, y, z)
      dummy.scale.set(sx, sy, sz)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [blocks])

  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, material, blocks.length]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      {treeSpots.map((p, i) => (
        <Tree key={i} position={p} scale={1.2} seed={i + 100} />
      ))}
    </group>
  )
}
