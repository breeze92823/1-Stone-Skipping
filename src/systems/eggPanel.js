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
export const eggPanelState = { kind: null }

export function stepEggPanel() {
  let near = null
  for (const egg of EGGS) {
    if (!EGG_PANELS[egg.kind]) continue
    if (Math.hypot(player.position.x - egg.x, player.position.z - egg.z) <= EGG_PANEL_RANGE) {
      near = egg.kind
      break
    }
  }
  eggPanelState.kind = near
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
