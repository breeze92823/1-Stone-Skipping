import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { LAKE, WATER_Y } from '../data/world.js'

// Metres of water covered by one ripple tile, and how fast the ripples
// drift (tiles per second).
const RIPPLE_TILE = 10
const RIPPLE_DRIFT = { x: 0.01, y: 0.006 }

// The canal past the throw zone, running south between its banks. It
// extends a little under the grass slab and the banks so there are no gaps.
const LAKE_W = LAKE.maxX - LAKE.minX + 2
const LAKE_D = LAKE.maxZ - LAKE.minZ + 10

function makeRippleTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#14cbe6'
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 2
  for (let i = 0; i < 6; i++) {
    ctx.beginPath()
    const y = (i + 0.5) * (size / 6)
    ctx.moveTo(0, y)
    for (let x = 0; x <= size; x += 8) {
      ctx.lineTo(x, y + Math.sin(x * 0.15 + i) * 4)
    }
    ctx.stroke()
  }
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  return texture
}

export default function Water() {
  const texture = useMemo(() => {
    const t = makeRippleTexture()
    t.colorSpace = SRGBColorSpace
    t.repeat.set(LAKE_W / RIPPLE_TILE, LAKE_D / RIPPLE_TILE)
    return t
  }, [])

  useFrame((_state, delta) => {
    texture.offset.x = (texture.offset.x + delta * RIPPLE_DRIFT.x) % 1
    texture.offset.y = (texture.offset.y + delta * RIPPLE_DRIFT.y) % 1
  })

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <mesh
      position={[(LAKE.minX + LAKE.maxX) / 2, WATER_Y, (LAKE.minZ - 10 + LAKE.maxZ) / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[LAKE_W, LAKE_D]} />
      {/* Unlit, like Roblox water: keeps its flat saturated cyan under the
          bright lobby lighting instead of washing out. */}
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}
