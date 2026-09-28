import { useEffect, useMemo } from 'react'
import { CanvasTexture, Shape, ShapeGeometry, SRGBColorSpace } from 'three'
import { BOUNDS, CHECKER, PATH_TOP, PATHS, THROW_ZONE } from '../data/world.js'
import { legoMaterial, PALETTE } from '../materials/lego.js'
import { LABEL_FONT } from '../utils/labelCanvas.js'
import { useFontsReady } from './Label.jsx'

const EDGE = 0.35 // m of darker border around every gray path
const CHEVRON_X = 6 // centre line of the chevron path

// The lobby floor: one big checkered grass slab (its south face is the
// dirt bank down to the lake), gray lego walkways with darker borders laid
// over it, the yellow THROW ZONE strip and the chevrons leading to it.
export default function Ground() {
  const grass = legoMaterial({
    top: PALETTE.grass,
    top2: PALETTE.grass2,
    side: PALETTE.dirt,
    side2: PALETTE.dirt2,
    checker: CHECKER,
  })
  const pathEdge = legoMaterial({ top: PALETTE.pathEdge })
  const path = legoMaterial({ top: PALETTE.path, top2: PALETTE.path2, side: PALETTE.pathEdge, checker: CHECKER })
  const yellow = legoMaterial({ top: '#ffcf2e', side: '#e0a514' })
  const yellowEdge = legoMaterial({ top: '#e8a912' })

  const slab = { x0: BOUNDS.minX - 30, x1: BOUNDS.maxX + 30, z0: BOUNDS.minZ - 30, z1: BOUNDS.maxZ }

  return (
    <group>
      <mesh
        position={[(slab.x0 + slab.x1) / 2, -4, (slab.z0 + slab.z1) / 2]}
        material={grass}
        receiveShadow
      >
        <boxGeometry args={[slab.x1 - slab.x0, 8, slab.z1 - slab.z0]} />
      </mesh>

      {PATHS.map(([x0, x1, z0, z1], i) => (
        <group key={i}>
          <mesh position={[(x0 + x1) / 2, (PATH_TOP - 0.02) / 2 - 0.05, (z0 + z1) / 2]} material={pathEdge} receiveShadow>
            <boxGeometry args={[x1 - x0 + EDGE * 2, PATH_TOP - 0.02 + 0.1, z1 - z0 + EDGE * 2]} />
          </mesh>
          <mesh position={[(x0 + x1) / 2, PATH_TOP / 2 - 0.05, (z0 + z1) / 2]} material={path} receiveShadow>
            <boxGeometry args={[x1 - x0, PATH_TOP + 0.1, z1 - z0]} />
          </mesh>
        </group>
      ))}

      <ThrowZone yellow={yellow} yellowEdge={yellowEdge} />
      <Chevrons />
    </group>
  )
}

function ThrowZone({ yellow, yellowEdge }) {
  const { x0, x1, z0, z1, top } = THROW_ZONE
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const fontsReady = useFontsReady()

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.font = `190px ${LABEL_FONT}`
    ctx.lineWidth = 26
    ctx.strokeStyle = '#1b2a44'
    ctx.strokeText('THROW ZONE', 1024, 138)
    const g = ctx.createLinearGradient(0, 40, 0, 230)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(1, '#bfe4ff')
    ctx.fillStyle = g
    ctx.fillText('THROW ZONE', 1024, 138)
    // Blue shield badges either side of the words.
    for (const sx of [170, 1878]) {
      ctx.beginPath()
      ctx.moveTo(sx - 80, 60)
      ctx.lineTo(sx + 80, 60)
      ctx.lineTo(sx + 80, 130)
      ctx.quadraticCurveTo(sx + 70, 205, sx, 225)
      ctx.quadraticCurveTo(sx - 70, 205, sx - 80, 130)
      ctx.closePath()
      ctx.fillStyle = '#1f6fe0'
      ctx.fill()
      ctx.lineWidth = 14
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(sx - 12, 80, 24, 110)
    }
    const t = new CanvasTexture(canvas)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [fontsReady])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <group>
      <mesh position={[cx, top / 2 - 0.06, cz]} material={yellowEdge} receiveShadow>
        <boxGeometry args={[x1 - x0 + 0.7, top + 0.1, z1 - z0 + 0.35]} />
      </mesh>
      <mesh position={[cx, top / 2 - 0.05, cz - 0.1]} material={yellow} receiveShadow>
        <boxGeometry args={[x1 - x0, top + 0.1, z1 - z0 - 0.4]} />
      </mesh>
      {/* rotated so it reads left-to-right when walking up from the plaza */}
      <mesh position={[CHEVRON_X, top + 0.006, cz - 0.1]} rotation={[-Math.PI / 2, 0, Math.PI]} receiveShadow>
        <planeGeometry args={[24, 3]} />
        <meshStandardMaterial map={texture} transparent roughness={0.8} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
  )
}

// Dark chevrons painted down the path to the throw zone, pointing south.
function Chevrons() {
  const geometry = useMemo(() => {
    const s = new Shape()
    s.moveTo(-2.2, 0.6)
    s.lineTo(0, -1.1)
    s.lineTo(2.2, 0.6)
    s.lineTo(2.2, 1.6)
    s.lineTo(0, -0.1)
    s.lineTo(-2.2, 1.6)
    s.closePath()
    return new ShapeGeometry(s)
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  const zs = []
  for (let z = 6.8; z <= THROW_ZONE.z0 - 1; z += 3) zs.push(z)

  return (
    <group>
      {zs.map((z) => (
        <mesh key={z} geometry={geometry} position={[CHEVRON_X, PATH_TOP + 0.005, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <meshStandardMaterial color="#454b55" roughness={0.9} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      ))}
    </group>
  )
}
