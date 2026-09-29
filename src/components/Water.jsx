import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, PlaneGeometry, RepeatWrapping, SRGBColorSpace } from 'three'
import { LAKE, LAKE_ZONES, WATER_Y } from '../data/world.js'

// Metres of water covered by one ripple tile, and how fast the ripples
// drift (tiles per second).
const RIPPLE_TILE = 10
const RIPPLE_DRIFT = { x: 0.01, y: 0.006 }

// The canal past the throw zone, running south between its banks. It
// extends a little under the grass slab and the banks so there are no gaps.
// Consecutive LAKE_ZONES with the same water colour share one piece.
const LAKE_W = LAKE.maxX - LAKE.minX + 2
const LAKE_MID_X = (LAKE.minX + LAKE.maxX) / 2
const SEGMENTS = LAKE_ZONES.reduce((segs, zone, i) => {
  const z1 = i === LAKE_ZONES.length - 1 ? LAKE.maxZ : zone.endZ
  const prev = segs[segs.length - 1]
  if (prev && prev.color === zone.water) prev.z1 = z1
  else segs.push({ color: zone.water, z0: prev ? prev.z1 : LAKE.minZ - 10, z1 })
  return segs
}, [])

// A flat water piece whose UVs are world XZ in ripple tiles, so ripples line
// up across the seams between pieces.
function makeSegmentGeometry({ z0, z1 }) {
  const geo = new PlaneGeometry(LAKE_W, z1 - z0)
  const zMid = (z0 + z1) / 2
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    // rotated -90 deg about X: local y becomes world -z
    uv.setXY(i, (pos.getX(i) + LAKE_MID_X) / RIPPLE_TILE, (pos.getY(i) - zMid) / RIPPLE_TILE)
  }
  return geo
}

function makeRippleTexture(color) {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color
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
  const pieces = useMemo(
    () =>
      SEGMENTS.map((seg) => {
        const texture = makeRippleTexture(seg.color)
        texture.colorSpace = SRGBColorSpace
        return { ...seg, texture, geometry: makeSegmentGeometry(seg) }
      }),
    [],
  )

  useFrame((_state, delta) => {
    for (const { texture } of pieces) {
      texture.offset.x = (texture.offset.x + delta * RIPPLE_DRIFT.x) % 1
      texture.offset.y = (texture.offset.y + delta * RIPPLE_DRIFT.y) % 1
    }
  })

  useEffect(
    () => () => {
      for (const { texture, geometry } of pieces) {
        texture.dispose()
        geometry.dispose()
      }
    },
    [pieces],
  )

  return pieces.map(({ z0, z1, texture, geometry }) => (
    <mesh key={z0} position={[LAKE_MID_X, WATER_Y, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} geometry={geometry} receiveShadow>
      {/* Unlit, like Roblox water: keeps its flat saturated colour under the
          bright lobby lighting instead of washing out. */}
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  ))
}
