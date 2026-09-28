import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, DoubleSide, SRGBColorSpace } from 'three'
import { CLAIM_CHEST, EGGS, FEATURED_PET, PATH_TOP } from '../data/world.js'
import { legoMaterial } from '../materials/lego.js'
import Label from './Label.jsx'

const PAD_TOP = PATH_TOP + 0.45

function makeRainbowEggCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(256, 256)
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const hue = ((x / 256) * 2 + y / 256) % 1
      const [r, g, b] = hsl(hue, 0.95, 0.56)
      const i = (y * 256 + x) * 4
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  // Zig-zag crack around the middle.
  ctx.strokeStyle = '#3b1a55'
  ctx.lineWidth = 5
  ctx.lineJoin = 'round'
  ctx.beginPath()
  for (let x = 0; x <= 256; x += 16) ctx.lineTo(x, 118 + (x / 16) % 2 * 16)
  ctx.stroke()
  return canvas
}

function hsl(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12
    const a = s * Math.min(l, 1 - l)
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
  }
  return [f(0), f(8), f(4)]
}

function EggPedestal({ egg, rainbowTexture }) {
  const rainbow = egg.kind === 'rainbow'
  const base = legoMaterial({ top: rainbow ? '#e0368c' : '#1d74dc', stud: 0.4 })
  const pad = legoMaterial({
    top: rainbow ? '#ff9bd3' : '#5fe0ff',
    side: rainbow ? '#ff5fb4' : '#2fb7f0',
    emissive: rainbow ? '#ff5fb4' : '#29b8ff',
    emissiveIntensity: 0.45,
    stud: 0.4,
  })
  const egRef = useRef()
  const phase = egg.x * 0.37

  useFrame(({ clock }) => {
    if (egRef.current) egRef.current.position.y = PAD_TOP + 1 + Math.sin(clock.elapsedTime * 1.6 + phase) * 0.06
  })

  const lines = rainbow
    ? [
        { text: 'Rainbow Egg', size: 0.52, fill: 'rainbow' },
        { parts: [{ icon: 'robux', color: '#7ce08a' }, { text: String(egg.robux), fill: '#c6ffb0' }], size: 0.36 },
      ]
    : [
        { text: egg.label, size: 0.48, fill: egg.labelColor },
        { parts: [{ icon: 'trophy' }, { text: egg.wins, fill: ['#fff6c4', '#ffd84a'] }], size: 0.34 },
      ]

  return (
    <group position={[egg.x, 0, egg.z]}>
      <mesh position={[0, PATH_TOP + 0.15, 0]} material={base} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.3, 2.5]} />
      </mesh>
      <mesh position={[0, PATH_TOP + 0.35, 0]} material={pad} castShadow receiveShadow>
        <boxGeometry args={[2.1, 0.2, 2.1]} />
      </mesh>
      <mesh ref={egRef} position={[0, PAD_TOP + 1, 0]} scale={[1, 1.28, 1]} castShadow>
        <sphereGeometry args={[0.85, 32, 24]} />
        {rainbow ? (
          <meshStandardMaterial map={rainbowTexture} roughness={0.35} emissive="#ffffff" emissiveMap={rainbowTexture} emissiveIntensity={0.25} />
        ) : (
          <meshStandardMaterial color={egg.color} roughness={0.35} />
        )}
      </mesh>
      <Label lines={lines} position={[0, 3.2, 0]} scale={1.2} />
    </group>
  )
}

// The limited "BEST IN GAME" pet: a chubby golden pup in a cowboy hat on a
// red-and-gold display pedestal, circled by a spinning golden aura.
function FeaturedPet() {
  const pet = useRef()
  const aura = useRef()
  const body = legoMaterial({ top: '#f0ae4a', studStrength: 0 })
  const cream = legoMaterial({ top: '#fbe2b4', studStrength: 0 })
  const ear = legoMaterial({ top: '#b86a26', studStrength: 0 })
  const hat = legoMaterial({ top: '#9a5a26', side: '#7a431b', stud: 0.25 })
  const red = legoMaterial({ top: '#e0262d', studStrength: 0 })
  const black = legoMaterial({ top: '#141414', studStrength: 0, roughness: 0.3 })
  const white = legoMaterial({ top: '#ffffff', studStrength: 0 })
  const pedRed = legoMaterial({ top: '#5c0f13', side: '#a8161d', stud: 0.4 })
  const pedGold = legoMaterial({ top: '#ffc21f', side: '#e39a0c', stud: 0.4 })

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (pet.current) {
      pet.current.position.y = 0.72 + Math.abs(Math.sin(t * 2.2)) * 0.12
      pet.current.rotation.y = Math.sin(t * 0.7) * 0.25
    }
    if (aura.current) aura.current.rotation.y = t * 0.9
  })

  return (
    <group position={[FEATURED_PET.x, PATH_TOP, FEATURED_PET.z]}>
      <mesh position={[0, 0.2, 0]} material={pedGold} castShadow receiveShadow>
        <boxGeometry args={[3.8, 0.4, 2.8]} />
      </mesh>
      <mesh position={[0, 0.45, 0]} material={pedRed} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.2, 2.4]} />
      </mesh>
      <mesh position={[0, 0.58, 0]} material={pedGold} receiveShadow>
        <boxGeometry args={[2.6, 0.06, 1.6]} />
      </mesh>

      <group ref={pet} position={[0, 0.72, 0]} scale={1.45}>
        {/* body + belly */}
        <mesh position={[0, 0.5, 0]} scale={[1, 0.9, 1]} material={body} castShadow>
          <sphereGeometry args={[0.55, 24, 18]} />
        </mesh>
        <mesh position={[0, 0.45, 0.3]} scale={[1, 0.9, 0.6]} material={cream}>
          <sphereGeometry args={[0.38, 18, 14]} />
        </mesh>
        {/* paws */}
        {[-0.3, 0.3].map((x) => (
          <mesh key={x} position={[x, 0.1, 0.25]} material={cream} castShadow>
            <sphereGeometry args={[0.17, 12, 10]} />
          </mesh>
        ))}
        {/* bandana */}
        <mesh position={[0, 0.88, 0.05]} rotation={[Math.PI / 2 + 0.2, 0, 0]} material={red}>
          <torusGeometry args={[0.36, 0.1, 10, 24]} />
        </mesh>
        <mesh position={[0, 0.78, 0.4]} rotation={[0.3, 0, Math.PI]} material={red}>
          <coneGeometry args={[0.2, 0.3, 4]} />
        </mesh>
        {/* head */}
        <group position={[0, 1.35, 0.05]}>
          <mesh scale={[1.1, 0.95, 1]} material={body} castShadow>
            <sphereGeometry args={[0.55, 24, 18]} />
          </mesh>
          <mesh position={[0, -0.12, 0.45]} scale={[1.2, 0.8, 0.8]} material={cream}>
            <sphereGeometry args={[0.24, 16, 12]} />
          </mesh>
          <mesh position={[0, -0.05, 0.63]} material={black}>
            <sphereGeometry args={[0.08, 10, 8]} />
          </mesh>
          {[-0.22, 0.22].map((x) => (
            <group key={x} position={[x, 0.08, 0.46]}>
              <mesh scale={[1, 1.25, 0.6]} material={black}>
                <sphereGeometry args={[0.1, 12, 10]} />
              </mesh>
              <mesh position={[0.03, 0.04, 0.05]} material={white}>
                <sphereGeometry args={[0.035, 8, 6]} />
              </mesh>
            </group>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.55, 0.05, 0]} rotation={[0, 0, s * -0.4]} scale={[0.5, 1, 0.8]} material={ear} castShadow>
              <sphereGeometry args={[0.3, 12, 10]} />
            </mesh>
          ))}
          {/* cowboy hat */}
          <group position={[0, 0.45, -0.02]} rotation={[-0.1, 0, 0.08]}>
            <mesh material={hat} castShadow>
              <cylinderGeometry args={[0.72, 0.72, 0.07, 28]} />
            </mesh>
            <mesh position={[0, 0.22, 0]} material={hat} castShadow>
              <cylinderGeometry args={[0.34, 0.4, 0.42, 20]} />
            </mesh>
            <mesh position={[0, 0.08, 0]} material={red}>
              <cylinderGeometry args={[0.41, 0.41, 0.08, 20]} />
            </mesh>
          </group>
        </group>
        {/* tail */}
        <mesh position={[0, 0.55, -0.55]} rotation={[-0.8, 0, 0]} material={body} castShadow>
          <capsuleGeometry args={[0.08, 0.35, 4, 8]} />
        </mesh>
      </group>

      <group ref={aura} position={[0, 2, 0]} scale={1.3}>
        <mesh rotation={[Math.PI / 2 - 0.3, 0, 0]}>
          <torusGeometry args={[1.35, 0.03, 8, 48]} />
          <meshBasicMaterial color="#ffe27a" transparent opacity={0.8} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2 + 0.4, 0.5, 0]}>
          <torusGeometry args={[1.2, 0.025, 8, 48]} />
          <meshBasicMaterial color="#ffd23f" transparent opacity={0.7} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      <Label
        position={[0, 4.1, 0]}
        lines={[
          { text: 'STOCK 878/1000', size: 0.36, fill: ['#ffffff', '#cfefff'] },
          { text: 'BEST IN GAME', size: 0.5, fill: ['#ff2a2a', '#ff5fcf'] },
          {
            parts: [
              { text: 'Always', fill: ['#3fe6ff', '#2f7bff'] },
              { text: '1000%', fill: ['#ff5fd6', '#ff2a64'] },
            ],
            size: 0.5,
          },
          { text: 'Better', size: 0.44, fill: ['#9a5cff', '#3a3cff'] },
        ]}
      />
    </group>
  )
}

function makeGlowCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,245,120,1)')
  g.addColorStop(0.55, 'rgba(255,230,40,0.95)')
  g.addColorStop(0.75, 'rgba(255,210,20,0.55)')
  g.addColorStop(1, 'rgba(255,200,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return canvas
}

// Red treasure chest on a glowing yellow pad — the group/like reward.
function ClaimChest({ glowTexture }) {
  const glow = useRef()
  const red = legoMaterial({ top: '#ff2a1f', side: '#e0160f', stud: 0.35 })
  const gold = legoMaterial({ top: '#ffd21a', side: '#f0b40c', stud: 0.3 })
  const lock = legoMaterial({ top: '#2b2f36', studStrength: 0, roughness: 0.4 })

  useFrame(({ clock }) => {
    if (glow.current) glow.current.material.opacity = 0.85 + Math.sin(clock.elapsedTime * 3) * 0.15
  })

  return (
    <group position={[CLAIM_CHEST.x, PATH_TOP, CLAIM_CHEST.z]}>
      <mesh ref={glow} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.2, 48]} />
        <meshBasicMaterial map={glowTexture} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.3, 2.45, 64]} />
        <meshBasicMaterial color="#fff6a0" transparent opacity={0.9} side={DoubleSide} toneMapped={false} />
      </mesh>

      <group rotation={[0, -0.6, 0]}>
        <mesh position={[0, 0.65, 0]} material={red} castShadow receiveShadow>
          <boxGeometry args={[2.6, 1.3, 1.6]} />
        </mesh>
        <mesh position={[0, 1.3, 0]} rotation={[0, 0, Math.PI / 2]} material={red} castShadow>
          <cylinderGeometry args={[0.8, 0.8, 2.6, 20, 1, false, 0, Math.PI]} />
        </mesh>
        {[-0.95, 0.95].map((x) => (
          <group key={x}>
            <mesh position={[x, 0.65, 0]} material={gold} castShadow>
              <boxGeometry args={[0.28, 1.34, 1.66]} />
            </mesh>
            <mesh position={[x, 1.3, 0]} rotation={[0, 0, Math.PI / 2]} material={gold}>
              <cylinderGeometry args={[0.83, 0.83, 0.28, 20, 1, false, 0, Math.PI]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 1.27, 0]} material={gold}>
          <boxGeometry args={[2.66, 0.14, 1.66]} />
        </mesh>
        <mesh position={[0, 1.05, 0.84]} material={gold} castShadow>
          <boxGeometry args={[0.5, 0.55, 0.12]} />
        </mesh>
        <mesh position={[0, 1.02, 0.91]} material={lock}>
          <boxGeometry args={[0.16, 0.22, 0.04]} />
        </mesh>
      </group>

      <Label
        position={[0, 2.6, 0]}
        lines={[
          { text: 'CLAIM', size: 0.95, fill: 'rainbow', strokeWidth: 0.16 },
          { text: 'Join Group/Like To Claim!', size: 0.34, fill: ['#fff47a', '#ffc21f'] },
        ]}
      />
    </group>
  )
}

export default function EggArea() {
  const textures = useMemo(() => {
    const rainbow = new CanvasTexture(makeRainbowEggCanvas())
    rainbow.colorSpace = SRGBColorSpace
    const glow = new CanvasTexture(makeGlowCanvas())
    glow.colorSpace = SRGBColorSpace
    return { rainbow, glow }
  }, [])

  useEffect(
    () => () => {
      textures.rainbow.dispose()
      textures.glow.dispose()
    },
    [textures],
  )

  return (
    <group>
      {EGGS.map((egg) => (
        <EggPedestal key={egg.kind} egg={egg} rainbowTexture={textures.rainbow} />
      ))}
      <FeaturedPet />
      <ClaimChest glowTexture={textures.glow} />
    </group>
  )
}
