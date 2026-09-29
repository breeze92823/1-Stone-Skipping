import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, SRGBColorSpace } from 'three'
import { HACKED_EGG, LAKE, LAKE_END, LAKE_PORTAL, PATH_TOP, PORTAL, SPAWN } from '../data/world.js'
import { legoMaterial } from '../materials/lego.js'
import Label from './Label.jsx'

function makeSwirlCanvas() {
  const S = 256
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, '#e8fbff')
  g.addColorStop(0.3, '#5fe0ff')
  g.addColorStop(1, '#1a8fd6')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  ctx.lineCap = 'round'
  for (let arm = 0; arm < 3; arm++) {
    ctx.beginPath()
    for (let t = 0; t < 1; t += 0.01) {
      const r = t * S * 0.5
      const a = t * Math.PI * 3.2 + (arm * Math.PI * 2) / 3
      const x = S / 2 + Math.cos(a) * r
      const y = S / 2 + Math.sin(a) * r
      t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'
    ctx.lineWidth = 14
    ctx.stroke()
  }
  return canvas
}

function makeHackedCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 4
  ctx.lineJoin = 'round'
  const cracks = [
    [[0, 100], [30, 120], [60, 95], [95, 130], [128, 110], [160, 140], [200, 115], [256, 135]],
    [[60, 95], [70, 60], [55, 30]],
    [[160, 140], [175, 180], [150, 220]],
    [[200, 115], [215, 70]],
    [[95, 130], [100, 175], [120, 200]],
  ]
  for (const c of cracks) {
    ctx.beginPath()
    c.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.stroke()
  }
  return canvas
}

// Pirate-themed World 2 portal: an octagonal wooden frame with gold
// rivets, a skull in a tricorn hat on top, lanterns either side and a
// spinning blue swirl, standing on a glowing green pad.
function WorldPortal({ swirlTexture, position = [PORTAL.x, PATH_TOP, PORTAL.z], rotY = Math.atan2(SPAWN.x - PORTAL.x, SPAWN.z - PORTAL.z), scale = 1, pad = true, lines = null }) {
  const swirl = useRef()
  const wood = legoMaterial({ top: '#b8773a', side: '#9a5f2a', stud: 0.3 })
  const gold = legoMaterial({ top: '#ffcc33', studStrength: 0, metalness: 0.4, roughness: 0.35 })
  const bone = legoMaterial({ top: '#f4f1e8', studStrength: 0 })
  const black = legoMaterial({ top: '#1b1b1f', studStrength: 0 })
  const glow = legoMaterial({ top: '#5dff8a', emissive: '#3dff6e', emissiveIntensity: 1.2, studStrength: 0 })

  useFrame((_s, dt) => {
    if (swirl.current) swirl.current.rotation.z -= dt * 1.4
  })

  const R = 2.7
  const CY = 3.2
  const seg = 2 * R * Math.sin(Math.PI / 8) * 1.12

  return (
    <group position={position} scale={scale}>
      {/* glowing dashed pad */}
      {pad && (
        <>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[6.5, 6.5]} />
            <meshBasicMaterial color="#5dff8a" transparent opacity={0.22} depthWrite={false} />
          </mesh>
          {[
            [0, 3.25, 6.5, 0.12],
            [0, -3.25, 6.5, 0.12],
            [3.25, 0, 0.12, 6.5],
            [-3.25, 0, 0.12, 6.5],
          ].map(([x, z, w, d], i) => (
            <mesh key={i} position={[x, 0.04, z]} material={glow}>
              <boxGeometry args={[w, 0.06, d]} />
            </mesh>
          ))}
        </>
      )}

      <group rotation={[0, rotY, 0]}>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4 + Math.PI / 8
          return (
            <group key={i}>
              <mesh position={[Math.cos(a) * R, CY + Math.sin(a) * R, 0]} rotation={[0, 0, a + Math.PI / 2]} material={wood} castShadow>
                <boxGeometry args={[seg, 0.75, 0.7]} />
              </mesh>
              <mesh position={[Math.cos(a - Math.PI / 8) * (R + 0.05), CY + Math.sin(a - Math.PI / 8) * (R + 0.05), 0.38]} material={gold}>
                <sphereGeometry args={[0.14, 10, 8]} />
              </mesh>
            </group>
          )
        })}

        <mesh ref={swirl} position={[0, CY, 0]}>
          <circleGeometry args={[R - 0.25, 40]} />
          <meshBasicMaterial map={swirlTexture} toneMapped={false} />
        </mesh>
        <mesh position={[0, CY, 0.05]}>
          <circleGeometry args={[R - 0.25, 40]} />
          <meshBasicMaterial color="#7fe8ff" transparent opacity={0.25} blending={AdditiveBlending} depthWrite={false} />
        </mesh>

        {/* feet */}
        {[-1.4, 1.4].map((x) => (
          <mesh key={x} position={[x, 0.35, 0]} material={wood} castShadow>
            <boxGeometry args={[1, 0.7, 1.4]} />
          </mesh>
        ))}

        {/* skull in a tricorn hat */}
        <group position={[0, CY + R + 0.55, 0.1]}>
          <mesh scale={[1, 0.95, 0.9]} material={bone} castShadow>
            <sphereGeometry args={[0.55, 18, 14]} />
          </mesh>
          <mesh position={[0, -0.45, 0.1]} material={bone}>
            <boxGeometry args={[0.6, 0.3, 0.5]} />
          </mesh>
          {[-0.2, 0.2].map((x) => (
            <mesh key={x} position={[x, 0, 0.44]} scale={[1, 1.1, 0.5]} material={black}>
              <sphereGeometry args={[0.14, 10, 8]} />
            </mesh>
          ))}
          <mesh position={[0, 0.45, 0]} scale={[1.5, 0.45, 1.1]} material={black} castShadow>
            <coneGeometry args={[0.65, 0.9, 3]} />
          </mesh>
          <mesh position={[0, 0.5, 0.52]} material={bone}>
            <sphereGeometry args={[0.1, 8, 6]} />
          </mesh>
        </group>

        {/* lanterns */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * (R + 0.55), CY - 0.4, 0]}>
            <mesh material={black} castShadow>
              <boxGeometry args={[0.45, 0.65, 0.45]} />
            </mesh>
            <mesh>
              <boxGeometry args={[0.3, 0.45, 0.47]} />
              <meshStandardMaterial color="#ffd23f" emissive="#ffb300" emissiveIntensity={1.5} />
            </mesh>
            <mesh position={[0, 0.42, 0]} material={black}>
              <boxGeometry args={[0.25, 0.2, 0.25]} />
            </mesh>
          </group>
        ))}
      </group>

      <Label
        position={[0, CY + R + 1.5, 0]}
        lines={
          lines ?? [
            { text: PORTAL.label, size: 0.62, fill: '#ffffff' },
            { parts: [{ text: PORTAL.sub }, { icon: 'bolt' }], size: 0.3, fill: '#ffffff' },
          ]
        }
      />
    </group>
  )
}

function HackedAdminEgg({ crackTexture }) {
  const shards = useRef()
  const egg = useRef()
  const base = legoMaterial({ top: '#15181c', side: '#0c0e10', stud: 0.35 })
  const glow = legoMaterial({ top: '#3dff6e', emissive: '#3dff6e', emissiveIntensity: 1.3, studStrength: 0 })

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (shards.current) shards.current.rotation.y = t * 0.8
    if (egg.current) egg.current.position.y = 1.55 + Math.sin(t * 1.8) * 0.07
  })

  return (
    <group position={[HACKED_EGG.x, PATH_TOP, HACKED_EGG.z]}>
      <mesh position={[0, 0.25, 0]} material={base} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.5, 2.2]} />
      </mesh>
      <mesh position={[0, 0.51, 0]} material={glow}>
        <boxGeometry args={[1.7, 0.04, 1.7]} />
      </mesh>
      <mesh ref={egg} position={[0, 1.55, 0]} scale={[1, 1.28, 1]} castShadow>
        <sphereGeometry args={[0.75, 32, 24]} />
        <meshStandardMaterial color="#141619" roughness={0.25} metalness={0.3} emissive="#3dff6e" emissiveMap={crackTexture} emissiveIntensity={1.4} />
      </mesh>
      <group ref={shards} position={[0, 1.5, 0]}>
        {Array.from({ length: 7 }).map((_, i) => {
          const a = (i / 7) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 1.15, Math.sin(i * 2.1) * 0.5, Math.sin(a) * 1.15]} rotation={[i, i * 0.7, 0]} castShadow>
              <tetrahedronGeometry args={[0.2, 0]} />
              <meshStandardMaterial color="#1a1d22" emissive="#2bd957" emissiveIntensity={0.5} roughness={0.3} />
            </mesh>
          )
        })}
      </group>
      <pointLight position={[0, 1.6, 0]} color="#3dff6e" intensity={4} distance={7} />
      <Label
        position={[0, 2.9, 0]}
        lines={[
          { text: 'Hacked Admin Egg', size: 0.42, fill: ['#8dff9a', '#1fd94a'] },
          { parts: [{ icon: 'robux', color: '#7ce08a' }, { text: '100', fill: '#c6ffb0' }], size: 0.32 },
        ]}
      />
    </group>
  )
}

export default function Portal() {
  const textures = useMemo(() => {
    const swirl = new CanvasTexture(makeSwirlCanvas())
    swirl.colorSpace = SRGBColorSpace
    const crack = new CanvasTexture(makeHackedCanvas())
    crack.colorSpace = SRGBColorSpace
    return { swirl, crack }
  }, [])
  useEffect(
    () => () => {
      textures.swirl.dispose()
      textures.crack.dispose()
    },
    [textures],
  )

  return (
    <group>
      <WorldPortal swirlTexture={textures.swirl} />
      {/* the giant one closing off the lake's end beach, facing up the canal */}
      <WorldPortal
        swirlTexture={textures.swirl}
        position={[(LAKE.minX + LAKE.maxX) / 2, LAKE_END.top, LAKE.maxZ - LAKE_END.depth + LAKE_PORTAL.zOffset]}
        rotY={Math.PI}
        scale={LAKE_PORTAL.scale}
        pad={false}
        lines={[{ parts: [{ text: 'REQUIRES' }, { icon: 'bolt' }, { text: LAKE_PORTAL.sub }], size: 0.42, fill: '#ffffff' }]}
      />
      <HackedAdminEgg crackTexture={textures.crack} />
    </group>
  )
}
