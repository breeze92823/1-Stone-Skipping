import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PATH_TOP, PHOENIX_RELIC, SHOW_ADDON, SKILL_STONES, SKILL_TILE } from '../data/world.js'
import { legoMaterial, PALETTE } from '../materials/lego.js'
import { useGameStore } from '../store/useGameStore.js'
import Label from './Label.jsx'
import StoneModel from './StoneModel.jsx'

// The skip-stone collection laid out in the east yard: each stone type sits
// on its own raised lego tile under a LOCKED/UNLOCKED, +skill, wins-required
// label.
const TILE_TOP = 0.1 // m above the path
function PhoenixRelic() {
  const wings = useRef()
  const pedRed = legoMaterial({ top: '#5c0f13', side: '#a8161d', stud: 0.35 })
  const pedGold = legoMaterial({ top: '#ffc21f', side: '#e39a0c', stud: 0.35 })
  const feathers = ['#ffe07a', '#ffc53d', '#ffa12a', '#ff7a1f', '#ff4d1a']

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!wings.current) return
    wings.current.position.y = 1.3 + Math.sin(t * 2) * 0.1
    wings.current.children[0].rotation.y = 0.25 + Math.sin(t * 3) * 0.15
    wings.current.children[1].rotation.y = -0.25 - Math.sin(t * 3) * 0.15
  })

  return (
    <group position={[PHOENIX_RELIC.x, PATH_TOP, PHOENIX_RELIC.z]} rotation={[0, -0.5, 0]}>
      <mesh position={[0, 0.18, 0]} material={pedGold} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.36, 1.9]} />
      </mesh>
      <mesh position={[0, 0.41, 0]} material={pedRed} receiveShadow>
        <boxGeometry args={[2.2, 0.12, 1.5]} />
      </mesh>
      <group ref={wings} position={[0, 1.3, 0]}>
        {[1, -1].map((side) => (
          <group key={side}>
            {feathers.map((c, i) => (
              <mesh
                key={i}
                position={[side * (0.35 + i * 0.12), 0.05 + i * 0.08, 0]}
                rotation={[0, 0, side * (0.9 - i * 0.28)]}
              >
                <boxGeometry args={[0.2, 1.1 - i * 0.08, 0.06]} />
                <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.35} roughness={0.4} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh scale={[1, 1.3, 1]} castShadow>
          <octahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial color="#ff2a3a" emissive="#ff1a2a" emissiveIntensity={0.7} roughness={0.2} metalness={0.2} />
        </mesh>
      </group>
      <Label
        position={[0, 2.3, 0]}
        scale={1.4}
        lines={[
          { text: 'STOCK: 865/1000', size: 0.26, fill: '#ffffff' },
          { text: 'ALWAYS 125% BETTER', size: 0.28, fill: 'rainbow' },
          { text: 'PHOENIX RELIC', size: 0.44, fill: ['#ffe77a', '#ff8a1f'] },
          { parts: [{ text: 'ONLY' }, { icon: 'robux' }, { text: '279' }], size: 0.26, fill: '#ffffff' },
        ]}
      />
    </group>
  )
}

// Label status line for a stone, by ownership / affordability.
function stoneStatus(owned, equipped, affordable) {
  if (equipped) return { text: 'EQUIPPED', fill: '#ffd84a' }
  if (owned) return { text: 'HOLD E TO EQUIP', fill: '#3cff55' }
  if (affordable) return { text: 'HOLD E TO BUY', fill: '#ffd84a' }
  return { text: 'LOCKED', fill: '#ff2d2d' }
}

export default function SkillStones() {
  const tile = legoMaterial({ top: '#dfe5ec', side: PALETTE.pathEdge })
  const tileEdge = legoMaterial({ top: PALETTE.pathEdge })
  const wins = useGameStore((s) => s.wins)
  const ownedStones = useGameStore((s) => s.ownedStones)
  const equippedStone = useGameStore((s) => s.equippedStone)

  return (
    <group>
      {SKILL_STONES.map((s) => {
        const owned = ownedStones.includes(s.model)
        const status = stoneStatus(owned, equippedStone === s.model, wins >= s.cost)
        return (
        <group key={s.skill} position={[s.x, PATH_TOP, s.z]}>
          <mesh position={[0, TILE_TOP / 2 - 0.02, 0]} material={tileEdge} receiveShadow>
            <boxGeometry args={[SKILL_TILE + 0.4, TILE_TOP, SKILL_TILE + 0.4]} />
          </mesh>
          <mesh position={[0, TILE_TOP / 2, 0]} material={tile} receiveShadow>
            <boxGeometry args={[SKILL_TILE, TILE_TOP, SKILL_TILE]} />
          </mesh>
          <group position={[0, TILE_TOP, 0]} scale={1.5}>
            <StoneModel model={s.model} />
          </group>
          <Label
            position={[0, s.highLabel ? 2.7 : 1.4, 0]}
            scale={1.5}
            lines={[
              { text: status.text, size: 0.28, fill: status.fill },
              { text: s.skill, size: 0.46, fill: '#ffffff' },
              { parts: [{ icon: 'trophy' }, { text: s.wins, fill: ['#fff6c4', '#ffd84a'] }], size: 0.3 },
            ]}
          />
        </group>
        )
      })}
      {SHOW_ADDON && <PhoenixRelic />}
    </group>
  )
}
