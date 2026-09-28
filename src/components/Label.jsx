import { useEffect, useMemo, useState } from 'react'
import { areFontsReady, makeLabelTexture, onFontsReady } from '../utils/labelCanvas.js'

// Re-renders once the web font finishes loading so labels drawn with the
// fallback font get redrawn in the real one.
export function useFontsReady() {
  const [ready, setReady] = useState(areFontsReady)
  useEffect(() => onFontsReady(() => setReady(true)), [])
  return ready
}

// A camera-facing billboard, anchored at its bottom centre so `position` is
// where the label sits on top of whatever it names. `lines` follow the spec
// in utils/labelCanvas.js.
export default function Label({ lines, position, scale = 1 }) {
  const fontsReady = useFontsReady()
  const key = JSON.stringify(lines)
  const label = useMemo(() => makeLabelTexture(lines), [key, fontsReady]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => label.texture.dispose(), [label])

  return (
    <sprite position={position} scale={[label.width * scale, label.height * scale, 1]} center={[0.5, 0]}>
      <spriteMaterial map={label.texture} transparent depthWrite={false} />
    </sprite>
  )
}
