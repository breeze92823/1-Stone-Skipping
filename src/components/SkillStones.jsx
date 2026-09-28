import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PATH_TOP, PHOENIX_RELIC, SKILL_STONES, SKILL_TILE } from '../data/world.js'
import { legoMaterial, PALETTE } from '../materials/lego.js'
import Label from './Label.jsx'

// The skip-stone collection laid out in the east yard: each stone type sits
// on its own raised lego tile under a LOCKED/UNLOCKED, +skill, wins-required
// label.
const TILE_TOP = 0.1 // m above the path
function StoneModel({ model }) {
  const plain = (top, extra = {}) => legoMaterial({ top, studStrength: 0, roughness: 0.6, ...extra })
  switch (model) {
    case 'shell':
      return (
        <group>
          <mesh position={[0, 0.2, 0]} scale={[1, 0.35, 1]} material={plain('#eadbb4')} castShadow>
            <sphereGeometry args={[0.75, 20, 14]} />
          </mesh>
          <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]} material={plain('#cdb888')}>
            <torusGeometry args={[0.38, 0.07, 8, 24]} />
          </mesh>
          <mesh position={[0, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]} material={plain('#cdb888')}>
            <torusGeometry args={[0.16, 0.06, 8, 18]} />
          </mesh>
        </group>
      )
    case 'scallop':
      // Fan-shaped seashell: a half disc with raised ribs and a little hinge.
      return (
        <group position={[0, 0.12, -0.3]}>
          <mesh scale={[1, 0.35, 1]} material={plain('#f1e3c8')} castShadow>
            <cylinderGeometry args={[0.7, 0.7, 0.4, 20, 1, false, -Math.PI / 2, Math.PI]} />
          </mesh>
          {[-0.9, -0.45, 0, 0.45, 0.9].map((a) => (
            <mesh key={a} position={[Math.sin(a) * 0.35, 0.08, Math.cos(a) * 0.35]} rotation={[0, a, 0]} material={plain('#e2cda6')}>
              <boxGeometry args={[0.08, 0.06, 0.65]} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.05]} material={plain('#e2cda6')}>
            <boxGeometry args={[0.35, 0.14, 0.2]} />
          </mesh>
        </group>
      )
    case 'arrowhead':
      // Flat orange flint-style triangle.
      return (
        <mesh position={[0, 0.12, 0]} rotation={[0, Math.PI / 6, 0]} material={plain('#ff7a2a')} castShadow>
          <cylinderGeometry args={[0.8, 0.8, 0.22, 3]} />
        </mesh>
      )
    case 'starfish':
      return (
        <group position={[0, 0.12, 0]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh
              key={i}
              rotation={[0, (i * Math.PI * 2) / 5, 0]}
              position={[Math.sin((i * Math.PI * 2) / 5) * 0.35, 0, Math.cos((i * Math.PI * 2) / 5) * 0.35]}
              material={plain('#ff8a3d')}
              castShadow
            >
              <boxGeometry args={[0.32, 0.2, 0.8]} />
            </mesh>
          ))}
          <mesh position={[0, 0.05, 0]} material={plain('#ff9c55')}>
            <cylinderGeometry args={[0.3, 0.3, 0.25, 10]} />
          </mesh>
        </group>
      )
    case 'wood':
      return (
        <group>
          <mesh position={[0, 0.15, 0]} material={plain('#c8904f')} castShadow>
            <cylinderGeometry args={[0.75, 0.78, 0.3, 24]} />
          </mesh>
          {[0.25, 0.5].map((r) => (
            <mesh key={r} position={[0, 0.31, 0]} rotation={[Math.PI / 2, 0, 0]} material={plain('#9a6630')}>
              <torusGeometry args={[r, 0.03, 6, 24]} />
            </mesh>
          ))}
        </group>
      )
    case 'disc':
      return (
        <mesh position={[0, 0.14, 0]} scale={[1, 0.35, 1]} material={plain('#5fd6e8', { roughness: 0.3 })} castShadow>
          <sphereGeometry args={[0.75, 24, 14]} />
        </mesh>
      )
    case 'ring':
      return (
        <mesh position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]} material={plain('#f5c542', { metalness: 0.3, roughness: 0.35 })} castShadow>
          <torusGeometry args={[0.52, 0.2, 12, 28]} />
        </mesh>
      )
    case 'obsidian':
      return (
        <mesh position={[0, 0.2, 0]} scale={[1.1, 0.4, 1]} material={plain('#2c313a', { roughness: 0.25 })} castShadow>
          <dodecahedronGeometry args={[0.7, 0]} />
        </mesh>
      )
    case 'coral':
      return (
        <group>
          <mesh position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]} material={plain('#ff8f7a')} castShadow>
            <torusGeometry args={[0.5, 0.24, 12, 28]} />
          </mesh>
          <mesh position={[0, 0.1, 0]} material={plain('#fff3ee')}>
            <cylinderGeometry args={[0.3, 0.3, 0.15, 16]} />
          </mesh>
        </group>
      )
    default:
      return (
        <mesh position={[0, 0.16, 0]} scale={[1.15, 0.38, 1]} material={plain('#9aa0a8')} castShadow>
          <sphereGeometry args={[0.7, 18, 12]} />
        </mesh>
      )
  }
}

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

export default function SkillStones() {
  const tile = legoMaterial({ top: '#dfe5ec', side: PALETTE.pathEdge })
  const tileEdge = legoMaterial({ top: PALETTE.pathEdge })
  return (
    <group>
      {SKILL_STONES.map((s) => (
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
              { text: s.unlocked ? 'UNLOCKED' : 'LOCKED', size: 0.28, fill: s.unlocked ? '#3cff55' : '#ff2d2d' },
              { text: s.skill, size: 0.46, fill: '#ffffff' },
              { parts: [{ icon: 'trophy' }, { text: s.wins, fill: ['#fff6c4', '#ffd84a'] }], size: 0.3 },
            ]}
          />
        </group>
      ))}
      <PhoenixRelic />
    </group>
  )
}
