// Skill Stones yard buy/equip via hold-E (systems/interact.js), replacing the
// old click-to-buy. Standing on a stone's tile shows "Press E to Buy Stone" or
// "Press E to Equip Stone" (nothing once it is equipped); a completed hold
// buys/equips it and reports through ActionResult, including the failure case
// of not having enough Wins.
import { player } from './playerState.js'
import { useGameStore } from '../store/useGameStore.js'
import { registerInteractZone } from './interact.js'
import { showActionResult } from './actionResult.js'
import { SKILL_STONES } from '../data/world.js'

const STONE_RANGE = 1.7 // m (per axis) — under half the 3.5 m stone spacing so tiles never overlap

for (const s of SKILL_STONES) {
  registerInteractZone({
    id: `skillStone:${s.model}`,
    isNear: () => Math.abs(player.position.x - s.x) <= STONE_RANGE && Math.abs(player.position.z - s.z) <= STONE_RANGE,
    label: () => {
      const { ownedStones, equippedStone } = useGameStore.getState()
      if (ownedStones.includes(s.model)) return equippedStone === s.model ? null : 'Equip Stone'
      return 'Buy Stone'
    },
    onConfirm: () => {
      const state = useGameStore.getState()
      if (state.ownedStones.includes(s.model)) {
        state.equipStone(s.model)
        showActionResult('Stone Equipped', true)
      } else if (state.wins >= s.cost) {
        state.buyStone(s.model, s.cost)
        showActionResult(`Stone Purchased! ${s.skill}`, true)
      } else {
        showActionResult(`Need ${s.wins} to Buy`, false)
      }
    },
  })
}
