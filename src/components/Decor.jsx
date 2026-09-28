import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, Object3D } from 'three'
import { BOUNDS, GROUND_Y, TREES } from '../data/world.js'
import { terrainHeightAt, waterAt } from '../systems/terrainHeight.js'
import { seededRandom } from '../utils/random.js'

// Little bits of scatter on the open grass — dark tufts, red/pink flowers
// and blue mushrooms — kept off paths, pools and tree trunks.
function scatter(count, seed, margin = 0.6) {
  const rand = seededRandom(seed)
  const out = []
  let guard = 0
  while (out.length < count && guard++ < count * 40) {
    const x = BOUNDS.minX + 1 + rand() * (BOUNDS.maxX - BOUNDS.minX - 2)
    const z = BOUNDS.minZ + 1 + rand() * (BOUNDS.maxZ - BOUNDS.minZ - 3)
    const clear = [
      [x, z],
      [x + margin, z],
      [x - margin, z],
      [x, z + margin],
      [x, z - margin],
    ].every(([sx, sz]) => terrainHeightAt(sx, sz) === GROUND_Y && !waterAt(sx, sz))
    if (!clear) continue
    if (TREES.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 1.4)) continue
    out.push({ x, z, r: rand(), s: rand() })
  }
  return out
}

function useInstances(ref, items, place, colors) {
  useLayoutEffect(() => {
    const mesh = ref.current
    const dummy = new Object3D()
    const color = new Color()
    items.forEach((item, i) => {
      place(dummy, item)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      if (colors) mesh.setColorAt(i, color.set(colors[i % colors.length]))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [ref, items, place, colors])
}

const FLOWER_COLORS = ['#ff3b3b', '#ff5fa0', '#ff3b3b', '#ffd23f']

const placeTuft = (d, t) => {
  d.position.set(t.x, 0.18, t.z)
  d.rotation.set(0, t.r * Math.PI, 0)
  d.scale.setScalar(0.7 + t.s * 0.6)
}
const placeStem = (d, f) => {
  d.position.set(f.x, 0.2, f.z)
  d.rotation.set(0, 0, 0)
  d.scale.set(1, 1, 1)
}
const placeHead = (d, f) => {
  d.position.set(f.x, 0.42, f.z)
  d.rotation.set(0, f.r * Math.PI, 0)
  d.scale.set(1, 1, 1)
}
const placeMushStem = (d, m) => {
  d.position.set(m.x, 0.15, m.z)
  d.rotation.set(0, 0, 0)
  d.scale.setScalar(0.8 + m.s * 0.5)
}
const placeMushCap = (d, m) => {
  const s = 0.8 + m.s * 0.5
  d.position.set(m.x, 0.3 * s, m.z)
  d.rotation.set(0, 0, 0)
  d.scale.setScalar(s)
}

export default function Decor() {
  const tufts = useMemo(() => scatter(160, 11), [])
  const flowers = useMemo(() => scatter(60, 23), [])
  const mushrooms = useMemo(() => scatter(18, 37), [])

  const tuftRef = useRef()
  const stemRef = useRef()
  const headRef = useRef()
  const mushStemRef = useRef()
  const mushCapRef = useRef()

  useInstances(tuftRef, tufts, placeTuft)
  useInstances(stemRef, flowers, placeStem)
  useInstances(headRef, flowers, placeHead, FLOWER_COLORS)
  useInstances(mushStemRef, mushrooms, placeMushStem)
  useInstances(mushCapRef, mushrooms, placeMushCap)

  return (
    <group>
      <instancedMesh ref={tuftRef} args={[undefined, undefined, tufts.length]} castShadow>
        <coneGeometry args={[0.28, 0.4, 4]} />
        <meshStandardMaterial color="#2f9f2a" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={stemRef} args={[undefined, undefined, flowers.length]}>
        <boxGeometry args={[0.06, 0.4, 0.06]} />
        <meshStandardMaterial color="#2e8f2a" />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, flowers.length]} castShadow>
        <boxGeometry args={[0.2, 0.12, 0.2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={mushStemRef} args={[undefined, undefined, mushrooms.length]}>
        <cylinderGeometry args={[0.07, 0.09, 0.3, 8]} />
        <meshStandardMaterial color="#f2f2f2" />
      </instancedMesh>
      <instancedMesh ref={mushCapRef} args={[undefined, undefined, mushrooms.length]} castShadow>
        <cylinderGeometry args={[0.1, 0.26, 0.14, 10]} />
        <meshStandardMaterial color="#3d8cff" roughness={0.5} />
      </instancedMesh>
    </group>
  )
}
