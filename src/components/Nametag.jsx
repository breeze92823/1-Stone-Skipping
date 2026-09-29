import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { makeLabelTexture } from '../utils/labelCanvas.js'
import { player } from '../systems/playerState.js'

// Floating name + level above a remote player. A camera-facing sprite drawn
// from the shared label canvas (utils/labelCanvas.js), anchored at its bottom
// centre just above the character's head.
const NAMETAG_Y = player.dims.height + 0.25
const NAMETAG_SCALE = 0.55
// The level can change with every skip; repainting + re-uploading a texture
// that often would be wasted work for a tag nobody reads that precisely.
const REPAINT_INTERVAL_MS = 1000

// `getName`/`getLevel` are getters, not props, so this never re-renders on a
// schema change — same pull-based reasoning as reading a remote PlayerState's
// fields in a frame loop.
export default function Nametag({ getName, getLevel }) {
  const spriteRef = useRef()
  const textureRef = useRef(null)
  const lastLabel = useRef('')
  const accumMs = useRef(0)

  function repaint() {
    const name = getName() || 'Player'
    const level = `Lv ${Math.max(1, Math.floor(Number(getLevel()) || 1))}`
    const label = `${name}\n${level}`
    if (label === lastLabel.current) return
    lastLabel.current = label

    const { texture, width, height } = makeLabelTexture([
      { text: name, size: 0.3, fill: '#ffffff' },
      { text: level, size: 0.22, fill: '#ffe27a' },
    ])
    const sprite = spriteRef.current
    if (sprite) {
      sprite.material.map = texture
      sprite.material.needsUpdate = true
      sprite.scale.set(width * NAMETAG_SCALE, height * NAMETAG_SCALE, 1)
    }
    textureRef.current?.dispose()
    textureRef.current = texture
  }

  useEffect(() => {
    repaint()
    return () => textureRef.current?.dispose()
    // Paint once on mount; useFrame re-paints on its own cadence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((_state, delta) => {
    accumMs.current += delta * 1000
    if (accumMs.current < REPAINT_INTERVAL_MS) return
    accumMs.current = 0
    repaint()
  })

  return (
    <sprite ref={spriteRef} position={[0, NAMETAG_Y, 0]} center={[0.5, 0]}>
      <spriteMaterial transparent depthWrite={false} />
    </sprite>
  )
}
