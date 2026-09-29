import { Vector3 } from 'three'
import { EGGS } from '../data/world.js'
import { player } from './playerState.js'

export const EGG_PANEL_RANGE = 3.2
export const MAX_EQUIPPED_PETS = 3

// Hatch odds shown in the panel; percentages per egg kind sum to 100.
export const EGG_PANELS = {
  common: {
    title: 'Common',
    cost: '50',
    pets: [
      { name: 'Pebble Pup', icon: '🐶', chance: 40, color: '#c98a4b', rarity: 'Common', mult: '2.00', exist: '572.67K' },
      { name: 'Clover Bunny', icon: '🐰', chance: 30, color: '#8fd19a', rarity: 'Common', mult: '2.50', exist: '431.20K' },
      { name: 'Forest Bear', icon: '🐻', chance: 20, color: '#3fa04a', rarity: 'Common', mult: '3.00', exist: '288.45K' },
      { name: 'Drip Dragon', icon: '🐲', chance: 10, color: '#3f8fe0', rarity: 'Common', mult: '5.00', exist: '96.10K' },
    ],
  },
}

// Kind of the egg pedestal the player stands near (with a panel), or null.
// Written each frame by stepEggPanel, polled by the HUD at ~10Hz.
export const eggPanelState = {
  kind: null,
  screen: { x: 0, y: 0, scale: 1, visible: false, side: 'right' }, // banner anchor in CSS px
}

const BANNER_HEIGHT = 1.9 // metres above the ground: level with the egg
const SIDE_OFFSET = 1.7 // metres to the side of the egg's centre
const BANNER_WIDTH = 340 // px, matches .egg-panel
const anchor = new Vector3()

export function stepEggPanel(camera) {
  let near = null
  let nearEgg = null
  for (const egg of EGGS) {
    if (!EGG_PANELS[egg.kind]) continue
    if (Math.hypot(player.position.x - egg.x, player.position.z - egg.z) <= EGG_PANEL_RANGE) {
      near = egg.kind
      nearEgg = egg
      break
    }
  }
  eggPanelState.kind = near
  if (!nearEgg) return
  // Project a point beside the egg (along the camera's horizontal right axis) so
  // the DOM banner hangs at the egg's side and always faces the viewer. It flips
  // to the other side when it would run off the screen edge.
  const e = camera.matrixWorld.elements
  const len = Math.hypot(e[0], e[2]) || 1
  const rx = e[0] / len
  const rz = e[2] / len
  const s = eggPanelState.screen
  const dist = camera.position.distanceTo({ x: nearEgg.x, y: BANNER_HEIGHT, z: nearEgg.z })
  s.scale = Math.max(0.55, Math.min(1.1, 11 / dist))
  for (const side of s.side === 'left' ? [-1, 1] : [1, -1]) {
    anchor.set(nearEgg.x + rx * SIDE_OFFSET * side, BANNER_HEIGHT, nearEgg.z + rz * SIDE_OFFSET * side).project(camera)
    s.x = (anchor.x * 0.5 + 0.5) * window.innerWidth
    s.y = (-anchor.y * 0.5 + 0.5) * window.innerHeight
    s.side = side > 0 ? 'right' : 'left'
    const edge = side > 0 ? s.x + BANNER_WIDTH * s.scale : s.x - BANNER_WIDTH * s.scale
    if (edge > 8 && edge < window.innerWidth - 8) break
  }
  s.visible = anchor.z < 1
}

export function findPet(name) {
  for (const panel of Object.values(EGG_PANELS)) {
    const pet = panel.pets.find((p) => p.name === name)
    if (pet) return pet
  }
  return null
}

// Sum of the equipped pets' multipliers, added onto the base skill multiplier.
export function petBonus(equipped) {
  return equipped.reduce((sum, name) => sum + parseFloat(findPet(name)?.mult ?? 0), 0)
}
