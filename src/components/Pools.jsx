import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import {
  POOL_PLATFORM,
  POOL_RIM,
  POOL_RIM_TOP,
  POOL_WATER_Y,
  POOLS,
  isPoolUnlocked,
  poolRect,
} from '../data/world.js'
import { legoMaterial } from '../materials/lego.js'
import { useGameStore } from '../store/useGameStore.js'
import Label from './Label.jsx'

// Colours per pool, read off the screenshots: the natural 1x lake with its
// wooden dock, then teal, purple (crystals), ice-white/blue, gold, and the
// black neon premium pool.
const THEMES = {
  lake: { rim: '#f0b562', rimSide: '#c9803c', trim: '#a4652c', floor: '#e8cf8e', water: '#34b6f2', platform: '#b27238', platformTop: '#c98a4d', ripple: 0.35 },
  teal: { rim: '#4fd8b6', rimSide: '#29ab8c', trim: '#1c8a70', floor: '#1d9d85', water: '#35e0cc', platform: '#23a88b', platformTop: '#5fe6c6', ripple: 0.3 },
  purple: { rim: '#b88cf7', rimSide: '#8a55e0', trim: '#6a38c2', floor: '#6d37c9', water: '#a578ff', platform: '#5a2fae', platformTop: '#8d5ff0', ripple: 0.3, crystals: '#e0c4ff' },
  ice: { rim: '#f8f3e6', rimSide: '#e2d8c0', trim: '#cbbf9f', floor: '#bfe8fa', water: '#91dcf8', platform: '#3d84e0', platformTop: '#6aa8f5', ripple: 0.3 },
  gold: { rim: '#ffd23a', rimSide: '#e8aa12', trim: '#c98a0b', floor: '#f0c64a', water: '#ffdb55', platform: '#e7a912', platformTop: '#ffd23a', ripple: 0.25 },
  neon: { rim: '#1c1f25', rimSide: '#121418', trim: '#0a0b0d', floor: '#0b0d10', water: '#0e1318', platform: '#1d2027', platformTop: '#2a2e36', ripple: 0, glow: '#3dff6e' },
}

function makeRippleCanvas() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 3
  for (let i = 0; i < 7; i++) {
    const y = (i + 0.5) * (size / 7)
    ctx.beginPath()
    for (let x = 0; x <= size; x += 8) {
      const yy = y + Math.sin((x / size) * Math.PI * 4 + i * 1.7) * 6
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }
  return canvas
}

function makeCircuitCanvas() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 4
  ctx.strokeRect(2, 2, size - 4, size - 4)
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(40, 2)
  ctx.lineTo(40, 90)
  ctx.lineTo(110, 160)
  ctx.lineTo(110, 254)
  ctx.moveTo(180, 2)
  ctx.lineTo(180, 60)
  ctx.lineTo(254, 130)
  ctx.moveTo(2, 200)
  ctx.lineTo(60, 200)
  ctx.lineTo(90, 230)
  ctx.stroke()
  ctx.fillStyle = '#fff'
  for (const [x, y] of [[40, 90], [110, 160], [180, 60], [60, 200]]) {
    ctx.beginPath()
    ctx.arc(x, y, 7, 0, Math.PI * 2)
    ctx.fill()
  }
  return canvas
}

function Box({ x0, x1, z0, z1, y0 = -0.1, y1, material, cast = false }) {
  return (
    <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]} material={material} castShadow={cast} receiveShadow>
      <boxGeometry args={[x1 - x0, y1 - y0, z1 - z0]} />
    </mesh>
  )
}

function Crystal({ position, color, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <octahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial color={color} emissive="#b26bff" emissiveIntensity={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.55, 0]} scale={[1, 2.2, 1]} castShadow>
        <cylinderGeometry args={[0.3, 0.32, 0.5, 6]} />
        <meshStandardMaterial color={color} emissive="#9a4dff" emissiveIntensity={0.6} roughness={0.25} />
      </mesh>
    </group>
  )
}

function Pool({ pool, textures }) {
  const theme = THEMES[pool.theme]
  const rebirths = useGameStore((s) => s.rebirths)
  const unlocked = isPoolUnlocked(pool, rebirths)
  const r = poolRect(pool)
  const inner = { x0: r.x0 + POOL_RIM, x1: r.x1 - POOL_RIM, z0: r.z0 + POOL_RIM, z1: r.z1 - POOL_RIM }
  const platform = { ...inner, x0: inner.x1 - POOL_PLATFORM.length }
  const water = { ...inner, x1: platform.x0 }

  const rim = legoMaterial({ top: theme.rim, side: theme.rimSide })
  const trim = legoMaterial({ top: theme.trim })
  const floor = legoMaterial({ top: theme.floor, stud: 0.6 })
  const platformMat = legoMaterial({ top: theme.platformTop, side: theme.platform })
  const platformInset = legoMaterial({ top: theme.platform, stud: 0.4 })
  const glowMat = theme.glow ? legoMaterial({ top: theme.glow, emissive: theme.glow, emissiveIntensity: 1.4, studStrength: 0 }) : null

  const waterMat = useMemo(() => {
    const map = pool.theme === 'neon' ? textures.circuit.clone() : textures.ripple.clone()
    map.wrapS = map.wrapT = RepeatWrapping
    const lenX = water.x1 - water.x0
    const lenZ = water.z1 - water.z0
    map.repeat.set(lenX / (pool.theme === 'neon' ? 3 : 6), lenZ / (pool.theme === 'neon' ? 3 : 6))
    map.needsUpdate = true
    return {
      map,
      scroll: pool.theme !== 'neon',
    }
  }, [pool, textures]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => waterMat.map.dispose(), [waterMat])

  useFrame((_s, dt) => {
    if (waterMat.scroll) waterMat.map.offset.x = (waterMat.map.offset.x - dt * 0.05) % 1
  })

  const labelX = platform.x0 + POOL_PLATFORM.length / 2
  const labelLines = []
  if (pool.robux !== undefined) {
    labelLines.push({ text: 'ALL WORLDS', size: 0.34, fill: '#ffffff' })
    labelLines.push({ parts: [{ icon: 'robux' }, { text: String(pool.robux) }], size: 0.62, pill: '#22252b', fill: '#ffffff' })
  } else {
    labelLines.push({ parts: [{ icon: 'rebirth' }, { text: String(pool.signRebirths ?? pool.rebirths) }], size: 0.62, pill: '#22252b', fill: '#ffffff' })
  }
  labelLines.push({ text: unlocked ? 'UNLOCKED' : 'LOCKED', size: 0.36, fill: unlocked ? '#3cff55' : '#ff2d2d' })
  labelLines.push({ text: `${pool.mult}x SKILL`, size: 0.78, fill: ['#ffffff', '#e9e4d2'] })

  return (
    <group>
      {/* darker outer trim, then the rim ring, then the sunken floor.
          Kept below the floor's top (0.05) so its top face never sits
          coplanar with the floor or water and z-fights across the pool. */}
      <Box x0={r.x0 - 0.3} x1={r.x1 + 0.3} z0={r.z0 - 0.3} z1={r.z1 + 0.3} y1={0} material={trim} />
      <Box x0={r.x0} x1={r.x1} z0={r.z0} z1={inner.z0} y1={POOL_RIM_TOP} material={rim} cast />
      <Box x0={r.x0} x1={r.x1} z0={inner.z1} z1={r.z1} y1={POOL_RIM_TOP} material={rim} cast />
      <Box x0={r.x0} x1={inner.x0} z0={inner.z0} z1={inner.z1} y1={POOL_RIM_TOP} material={rim} cast />
      <Box x0={inner.x1} x1={r.x1} z0={inner.z0} z1={inner.z1} y1={POOL_RIM_TOP} material={rim} cast />
      <Box {...inner} y1={0.05} material={floor} />

      {/* throwing platform at the walkway end */}
      <Box {...platform} y1={POOL_PLATFORM.top} material={platformMat} cast />
      <Box
        x0={platform.x0 + 0.5}
        x1={platform.x1 - 0.5}
        z0={platform.z0 + 0.8}
        z1={platform.z1 - 0.8}
        y0={POOL_PLATFORM.top - 0.05}
        y1={POOL_PLATFORM.top + 0.02}
        material={platformInset}
      />

      <mesh
        position={[(water.x0 + water.x1) / 2, POOL_WATER_Y, (water.z0 + water.z1) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[water.x1 - water.x0, water.z1 - water.z0]} />
        <meshStandardMaterial
          color={theme.water}
          emissive={theme.glow ?? '#ffffff'}
          emissiveMap={waterMat.map}
          emissiveIntensity={theme.glow ? 1.1 : theme.ripple}
          roughness={0.15}
          metalness={0.05}
          transparent
          opacity={pool.theme === 'neon' ? 0.95 : 0.82}
        />
      </mesh>

      {pool.theme === 'lake' && <LakeDressing water={water} />}

      {pool.theme === 'purple' &&
        [
          [r.x0 + 0.4, r.z0 + 0.4],
          [r.x0 + 0.4, r.z1 - 0.4],
          [r.x1 - 0.4, r.z0 + 0.4],
          [r.x1 - 0.4, r.z1 - 0.4],
          [(r.x0 + r.x1) / 2, r.z0 + 0.4],
          [(r.x0 + r.x1) / 2, r.z1 - 0.4],
        ].map(([x, z], i) => <Crystal key={i} position={[x, POOL_RIM_TOP, z]} color={theme.crystals} scale={i < 4 ? 1 : 0.7} />)}

      {glowMat && (
        <>
          <Box x0={r.x0} x1={r.x1} z0={r.z0} z1={r.z0 + 0.12} y0={POOL_RIM_TOP} y1={POOL_RIM_TOP + 0.04} material={glowMat} />
          <Box x0={r.x0} x1={r.x1} z0={r.z1 - 0.12} z1={r.z1} y0={POOL_RIM_TOP} y1={POOL_RIM_TOP + 0.04} material={glowMat} />
          <Box x0={r.x0} x1={r.x0 + 0.12} z0={r.z0} z1={r.z1} y0={POOL_RIM_TOP} y1={POOL_RIM_TOP + 0.04} material={glowMat} />
          <Box x0={inner.x0 - 0.1} x1={inner.x1 + 0.1} z0={inner.z0 - 0.1} z1={inner.z0} y0={POOL_RIM_TOP} y1={POOL_RIM_TOP + 0.04} material={glowMat} />
          <Box x0={inner.x0 - 0.1} x1={inner.x1 + 0.1} z0={inner.z1} z1={inner.z1 + 0.1} y0={POOL_RIM_TOP} y1={POOL_RIM_TOP + 0.04} material={glowMat} />
          <Box x0={platform.x0 - 0.1} x1={platform.x0} z0={inner.z0} z1={inner.z1} y0={POOL_PLATFORM.top} y1={POOL_PLATFORM.top + 0.04} material={glowMat} />
          <pointLight position={[(r.x0 + r.x1) / 2, 1.5, pool.zc]} color={theme.glow} intensity={6} distance={14} />
        </>
      )}

      <Label lines={labelLines} position={[labelX, 3.4, pool.zc]} scale={1.4} />
    </group>
  )
}

// The 1x pool is a little natural pond: sandy banks, rocks and a plank dock
// laid over its platform.
function LakeDressing({ water }) {
  const sand = legoMaterial({ top: '#f1dca0', side: '#d9bd78', stud: 0.4 })
  const rock = legoMaterial({ top: '#9ea6ae', side: '#7d858e', stud: 0.3 })
  const plank = legoMaterial({ top: '#c48547', side: '#8f5a2a', stud: 0.3 })
  const midZ = (water.z0 + water.z1) / 2
  return (
    <group>
      <Box x0={water.x0} x1={water.x1} z0={water.z0} z1={water.z0 + 0.9} y1={POOL_WATER_Y + 0.06} material={sand} />
      <Box x0={water.x0} x1={water.x1} z0={water.z1 - 0.9} z1={water.z1} y1={POOL_WATER_Y + 0.06} material={sand} />
      <Box x0={water.x0} x1={water.x0 + 1} z0={water.z0} z1={water.z1} y1={POOL_WATER_Y + 0.06} material={sand} />
      {[
        [water.x0 + 0.8, water.z0 + 0.8, 0.5],
        [water.x0 + 1.6, water.z1 - 0.9, 0.4],
        [water.x0 + 4, water.z0 + 0.7, 0.35],
      ].map(([x, z, s], i) => (
        <mesh key={i} position={[x, POOL_WATER_Y + 0.1, z]} scale={[s * 1.4, s, s]} material={rock} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
      {/* dock planks sticking out over the water */}
      {[-1.2, -0.4, 0.4, 1.2].map((dz) => (
        <mesh key={dz} position={[water.x1 - 0.9, POOL_PLATFORM.top - 0.05, midZ + dz * 0.9]} material={plank} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.12, 0.7]} />
        </mesh>
      ))}
      {[-1.5, 1.5].map((dz) => (
        <mesh key={dz} position={[water.x1 - 1.8, 0.3, midZ + dz]} material={plank} castShadow>
          <boxGeometry args={[0.25, 0.8, 0.25]} />
        </mesh>
      ))}
    </group>
  )
}

export default function Pools() {
  const textures = useMemo(() => {
    const ripple = new CanvasTexture(makeRippleCanvas())
    const circuit = new CanvasTexture(makeCircuitCanvas())
    ripple.colorSpace = circuit.colorSpace = SRGBColorSpace
    return { ripple, circuit }
  }, [])

  useEffect(
    () => () => {
      textures.ripple.dispose()
      textures.circuit.dispose()
    },
    [textures],
  )

  return (
    <group>
      {POOLS.map((p) => (
        <Pool key={p.id} pool={p} textures={textures} />
      ))}
    </group>
  )
}
