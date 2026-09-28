import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { player } from '../systems/playerState.js'

// Sun offset from its target; the shadow frustum only covers SHADOW_EXTENT
// around the player, so the light rig follows them rather than trying to
// shadow the whole lobby at once.
const SUN_OFFSET = [30, 45, 20]
const SHADOW_EXTENT = 40

// Bright, flat-ish daylight like a Roblox lobby: strong sky/ground bounce so
// colours stay saturated, and one shadow-casting sun.
export default function Lighting() {
  const sun = useRef()

  useFrame(() => {
    const light = sun.current
    if (!light) return
    const { x, z } = player.position
    light.position.set(x + SUN_OFFSET[0], SUN_OFFSET[1], z + SUN_OFFSET[2])
    light.target.position.set(x, 0, z)
    light.target.updateMatrixWorld()
  })

  return (
    <>
      <hemisphereLight args={['#e4f3ff', '#9bc27a', 0.95]} />
      <ambientLight intensity={0.3} />
      <directionalLight
        ref={sun}
        color="#fff6e6"
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
      />
    </>
  )
}
