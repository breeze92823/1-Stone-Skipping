import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, Object3D } from 'three'
import { drops, rings, MAX_DROPS, MAX_RINGS } from '../systems/splashes.js'

// Renders the splash droplets and surface rings from systems/splashes.js as
// two instanced meshes. Simulation is stepped in GameLoop.
export default function Splashes() {
  const dropRef = useRef()
  const ringRef = useRef()
  const dummy = useMemo(() => new Object3D(), [])

  useFrame(() => {
    const dm = dropRef.current
    const rm = ringRef.current
    if (!dm || !rm) return

    dm.count = drops.length
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i]
      const s = d.size * (1 - 0.5 * (d.age / d.life))
      dummy.position.set(d.x, d.y, d.z)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      dm.setMatrixAt(i, dummy.matrix)
    }
    dm.instanceMatrix.needsUpdate = true

    rm.count = rings.length
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i]
      const t = r.age / r.life
      const s = r.radius * (0.2 + 0.8 * Math.sqrt(t)) * (1 - 0.6 * t)
      dummy.position.set(r.x, r.y + 0.03, r.z)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.scale.setScalar(Math.max(s, 0.001))
      dummy.updateMatrix()
      rm.setMatrixAt(i, dummy.matrix)
    }
    dummy.rotation.set(0, 0, 0)
    rm.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={dropRef} args={[null, null, MAX_DROPS]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 5]} />
        <meshBasicMaterial color="#e6f6ff" transparent opacity={0.85} />
      </instancedMesh>
      <instancedMesh ref={ringRef} args={[null, null, MAX_RINGS]} frustumCulled={false}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} side={DoubleSide} depthWrite={false} />
      </instancedMesh>
    </>
  )
}
