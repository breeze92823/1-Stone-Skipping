import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { thrownStones } from '../systems/stoneActions.js'

// A fixed mesh pool synced from the thrownStones singleton each frame —
// same pattern as Player.jsx: read the physics state directly in useFrame
// instead of pushing it through React/zustand every tick.
const POOL_SIZE = 8

export default function ThrownStones() {
  const refs = useRef([])

  useFrame(() => {
    for (let i = 0; i < POOL_SIZE; i++) {
      const mesh = refs.current[i]
      if (!mesh) continue
      const stone = thrownStones[i]
      if (stone) {
        mesh.visible = true
        mesh.position.copy(stone.position)
      } else {
        mesh.visible = false
      }
    }
  })

  return (
    <>
      {Array.from({ length: POOL_SIZE }).map((_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} castShadow visible={false}>
          <sphereGeometry args={[0.12, 10, 10]} />
          <meshStandardMaterial color="#8a8580" roughness={0.85} />
        </mesh>
      ))}
    </>
  )
}
