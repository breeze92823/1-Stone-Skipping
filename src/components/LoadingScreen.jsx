import { useEffect, useState } from 'react'
import { subscribeAuth } from '../systems/bloxity.js'
import { DEV_MODE } from '../data/bloxity.js'
import { useGameStore } from '../store/useGameStore.js'

// Full-screen DOM overlay, a sibling of <Canvas> in App.jsx. Stays fully
// opaque until the 3D scene has resolved (sceneReady) AND Bloxity auth has
// settled, then fades out. VITE_DEV_MODE=true skips it entirely.
const FADE_MS = 450

export default function LoadingScreen({ sceneReady }) {
  const [authReady, setAuthReady] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => subscribeAuth((s) => setAuthReady(s.ready)), [])

  const avatarLoaded = useGameStore((s) => s.avatarLoaded)

  const ready = sceneReady && authReady && avatarLoaded

  useEffect(() => {
    if (!ready) return
    const id = setTimeout(() => setHidden(true), FADE_MS)
    return () => clearTimeout(id)
  }, [ready])

  if (DEV_MODE || hidden) return null

  return (
    <div className={`loading-screen${ready ? ' is-done' : ''}`} style={{ transitionDuration: `${FADE_MS}ms` }}>
      <h1 className="loading-title">STONE SKIPPING</h1>
      <div className="loading-bar">
        <div className="loading-bar-fill" />
      </div>
      <div className="loading-status">{sceneReady ? (authReady ? 'LOADING CHARACTER…' : 'SIGNING IN…') : 'LOADING WORLD…'}</div>
    </div>
  )
}
