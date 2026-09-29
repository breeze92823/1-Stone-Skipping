import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { thrownStones } from '../systems/stoneActions.js'
import { SKILL_STONES } from '../data/world.js'
import StoneModel from './StoneModel.jsx'

// A fixed slot pool synced from the thrownStones singleton each frame —
// same pattern as Player.jsx: read the physics state directly in useFrame
// instead of pushing it through React/zustand every tick. Each slot holds one
// copy of every stone model; only the one matching the thrown stone's `model`
// is visible, so the equipped stone is what flies at both the Throw Zone and
// the training pools.
const POOL_SIZE = 8
const STONE_SCALE = 0.17 // yard models are ~0.75 m radius; thrown stones ~0.13 m
const SPIN = 14 // rad/s about the vertical axis in flight
const DEFAULT_MODEL = SKILL_STONES[0].model

export default function ThrownStones() {
  const slots = useRef([]) // per slot: { group, models: { [model]: Group } }

  useFrame(({ clock }) => {
    for (let i = 0; i < POOL_SIZE; i++) {
      const slot = slots.current[i]
      if (!slot?.group) continue
      const stone = thrownStones[i]
      slot.group.visible = !!stone
      if (!stone) continue
      slot.group.position.copy(stone.position)
      slot.group.rotation.y = clock.elapsedTime * SPIN
      const active = stone.model || DEFAULT_MODEL
      for (const model in slot.models) slot.models[model].visible = model === active
    }
  })

  return (
    <>
      {Array.from({ length: POOL_SIZE }).map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            slots.current[i] = { group: el, models: slots.current[i]?.models ?? {} }
          }}
          scale={STONE_SCALE}
          visible={false}
        >
          {SKILL_STONES.map((s) => (
            <group
              key={s.model}
              position={[0, -0.16, 0]} // models sit on y=0; centre them on the stone's position
              visible={false}
              ref={(el) => {
                if (el) slots.current[i].models[s.model] = el
              }}
            >
              <StoneModel model={s.model} />
            </group>
          ))}
        </group>
      ))}
    </>
  )
}
