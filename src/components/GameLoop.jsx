import { useThree, useFrame } from '@react-three/fiber'
import { step as stepPlayer } from '../systems/playerMovement.js'
import { update as updateCamera } from '../systems/cameraOrbit.js'
import { stepPickupAndThrow, stepStones } from '../systems/stoneActions.js'
import { step as stepSplashes } from '../systems/splashes.js'
import { step as stepInteract } from '../systems/interact.js'
import { stepEggPanel } from '../systems/eggPanel.js'
import { stepEggHatch } from '../systems/eggHatch.js'
import { step as stepActionPopups } from '../systems/actionPopups.js'
import { reportLocal } from '../systems/net.js'
import '../systems/skillStoneZones.js' // registers the Skill Stones yard's hold-E zones

// The single simulation tick. Rendered before the view components so its
// useFrame subscribes first and runs first each frame.
export default function GameLoop() {
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  if (import.meta.env.DEV) {
    window.__scene = scene
    window.__gl = gl
  }

  useFrame((_state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1) // clamp huge frames (tab switch, breakpoint)
    stepActionPopups(dt, camera)
    stepPlayer(dt)
    reportLocal(dt)
    stepPickupAndThrow(camera, dt)
    stepStones(dt)
    stepSplashes(dt)
    stepInteract()
    stepEggPanel()
    stepEggHatch()
    updateCamera(camera, dt)
  })

  return null
}
