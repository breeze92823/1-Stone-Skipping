import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { install as installInput } from './systems/input.js'
import { player, resetPlayer } from './systems/playerState.js'
import { setView, syncYawToPlayer } from './systems/cameraOrbit.js'
import { SPAWN, SPAWN_FACING } from './data/world.js'
import { thrownStones } from './systems/stoneActions.js'
import { useGameStore } from './store/useGameStore.js'
import { init as initBloxity } from './systems/bloxity.js'

initBloxity()
resetPlayer(SPAWN, SPAWN_FACING)
syncYawToPlayer()
installInput()

// Dev-only console hook for jumping around the lobby, e.g.
// __game.teleport(10, 0, 5); __game.setView({ yaw: 0, pitch: 0.4, distance: 15 })
if (import.meta.env.DEV) {
  window.__game = {
    player,
    setView,
    stones: thrownStones,
    store: useGameStore,
    teleport: (x, y, z, facing = player.facing) => resetPlayer({ x, y, z }, facing),
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
