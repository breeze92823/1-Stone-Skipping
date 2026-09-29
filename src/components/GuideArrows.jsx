import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ExtrudeGeometry, Object3D, Shape } from 'three'
import { GUIDE_TARGET, SKILL_STONES, THROW_ZONE } from '../data/world.js'
import { useGameStore } from '../store/useGameStore.js'
import { player } from '../systems/playerState.js'
import { terrainHeightAt } from '../systems/terrainHeight.js'

const SPACING = 0.95 // m between arrows
const SPEED = 1.6 // m/s the trail crawls toward the target
const MAX_ARROWS = 90
const HIDE_WITHIN = 2.5 // m from the target where the trail disappears
// Middle of the Throw Zone strip, on the Chevron Road (x 3…9).
const THROW_ZONE_TARGET = { x: 6, z: THROW_ZONE.z0 + 1.5 }
const STONE_TARGET = SKILL_STONES[1] // +3 Skill Stone
const TARGETS = [GUIDE_TARGET, THROW_ZONE_TARGET, STONE_TARGET, GUIDE_TARGET]

// The tutorial trail: a line of white 3D arrowheads on the ground from the
// player to the 1x pool, crawling toward it.
export default function GuideArrows() {
  const ref = useRef()
  const dummy = useMemo(() => new Object3D(), [])

  const geometry = useMemo(() => {
    const s = new Shape()
    s.moveTo(0, 0.42)
    s.lineTo(0.34, -0.2)
    s.lineTo(0, -0.05)
    s.lineTo(-0.34, -0.2)
    s.closePath()
    const g = new ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 })
    g.center()
    return g
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    // Tutorial step picks the target: pool pad, throw zone, +3 stone, pool pad
    // again, then no trail (rebirth and done).
    const step = useGameStore.getState().tutorialStep
    const target = TARGETS[step] ?? null
    if (!target) {
      mesh.count = 0
      return
    }
    const dx = target.x - player.position.x
    const dz = target.z - player.position.z
    const dist = Math.hypot(dx, dz)
    const ux = dx / (dist || 1)
    const uz = dz / (dist || 1)
    const heading = Math.atan2(ux, uz)
    const phase = (clock.elapsedTime * SPEED) % SPACING

    let n = 0
    if (dist > HIDE_WITHIN) {
      for (let d = 1.2 + phase; d < dist - 0.6 && n < MAX_ARROWS; d += SPACING) {
        const x = player.position.x + ux * d
        const z = player.position.z + uz * d
        const g = terrainHeightAt(x, z)
        dummy.position.set(x, (Number.isFinite(g) ? g : 0) + 0.22, z)
        // Lay the arrowhead down, tip toward the target, slightly tilted up
        // like the Roblox beam arrows.
        dummy.rotation.set(Math.PI / 2 - 0.35, heading, 0, 'YXZ')
        dummy.updateMatrix()
        mesh.setMatrixAt(n++, dummy.matrix)
      }
    }
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, MAX_ARROWS]} castShadow frustumCulled={false}>
      <meshStandardMaterial color="#eef1f6" roughness={0.5} />
    </instancedMesh>
  )
}
