import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { PCFSoftShadowMap, SRGBColorSpace } from 'three'
import { notifyFirstFrame } from './systems/bloxity.js'
import { settings } from './systems/settingsState.js'
import { useSettings } from './systems/bloxityHooks.js'
import GameLoop from './components/GameLoop.jsx'
import Ground from './components/Ground.jsx'
import Cliffs from './components/Cliffs.jsx'
import Water from './components/Water.jsx'
import LakeBanks from './components/LakeBanks.jsx'
import Sky from './components/Sky.jsx'
import Lighting from './components/Lighting.jsx'
import Pools from './components/Pools.jsx'
import EggArea from './components/EggArea.jsx'
import Leaderboards from './components/Leaderboards.jsx'
import SkillStones from './components/SkillStones.jsx'
import Portal from './components/Portal.jsx'
import Trees from './components/Trees.jsx'
import Decor from './components/Decor.jsx'
import GuideArrows from './components/GuideArrows.jsx'
import Player from './components/Player.jsx'
import ThrownStones from './components/ThrownStones.jsx'
import Hud from './components/Hud.jsx'

const SKY = { top: '#6fbdf2', mid: '#b4def8', bottom: '#def0fb' }

// Rendered as the last child inside the Suspense boundary below, so it only
// mounts once every suspending resource in the scene (including the
// Bloxity avatar) has resolved — the right moment to tell the SDK loading
// is done and gameplay has started.
function LoadingGate() {
  useEffect(() => {
    notifyFirstFrame()
  }, [])
  return null
}

const GRAPHICS_PRESETS = {
  Low: { shadows: false, antialias: false, dpr: [1, 1] },
  Medium: { shadows: true, antialias: false, dpr: [1, 1.5] },
  High: { shadows: true, antialias: true, dpr: [1, 2] },
  Ultra: { shadows: true, antialias: true, dpr: [1, 2] },
}

export default function App() {
  useSettings()
  const preset = GRAPHICS_PRESETS[settings.graphics_quality] ?? GRAPHICS_PRESETS.High

  return (
    <>
      <Canvas
        shadows={preset.shadows && { type: PCFSoftShadowMap }}
        dpr={preset.dpr}
        gl={{ antialias: preset.antialias, powerPreference: 'high-performance', outputColorSpace: SRGBColorSpace }}
        camera={{ fov: 60, near: 0.1, far: 600, position: [0, 8, 16] }}
      >
        <color attach="background" args={[SKY.bottom]} />
        <fog attach="fog" args={[SKY.bottom, 200, 520]} />
        <Sky colors={SKY} />
        <Lighting />

        <GameLoop />
        <Suspense fallback={null}>
          <Ground />
          <Cliffs />
          <Water />
          <LakeBanks />
          <Pools />
          <EggArea />
          <Leaderboards />
          <SkillStones />
          <Portal />
          <Trees />
          <Decor />
          <GuideArrows />
          <ThrownStones />
          <LoadingGate />
        </Suspense>
        <Player />
      </Canvas>
      <Hud />
    </>
  )
}
