import { legoMaterial } from '../materials/lego.js'

// One mesh per skip-stone type, sized for its yard tile (~0.75 m radius, base at
// y=0). Shared by SkillStones.jsx (display) and ThrownStones.jsx (in flight).
export default function StoneModel({ model }) {
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
