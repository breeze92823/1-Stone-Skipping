import { useGameStore } from '../store/useGameStore.js'
import { findPet, MAX_EQUIPPED_PETS } from '../systems/eggPanel.js'
import { showActionResult } from '../systems/actionResult.js'

// Owned pets, bottom-left. Click toggles equip (max MAX_EQUIPPED_PETS).
export default function PetBar() {
  const owned = useGameStore((s) => s.ownedPets)
  const equipped = useGameStore((s) => s.equippedPets)
  if (owned.length === 0) return null

  const toggle = (name) => {
    const s = useGameStore.getState()
    if (s.equippedPets.includes(name)) s.unequipPet(name)
    else if (s.equippedPets.length >= MAX_EQUIPPED_PETS) showActionResult(`Only ${MAX_EQUIPPED_PETS} pets can be equipped`, false)
    else s.equipPet(name)
  }

  return (
    <div className="pet-bar">
      <div className="pet-bar-title">Pets {equipped.length}/{MAX_EQUIPPED_PETS}</div>
      <div className="pet-bar-list">
        {owned.map((name) => {
          const pet = findPet(name)
          return (
            <button
              key={name}
              className={`pet-slot${equipped.includes(name) ? ' equipped' : ''}`}
              style={{ '--pet': pet.color }}
              title={`${name} ×${pet.mult}`}
              onClick={() => toggle(name)}
            >
              <span>{pet.icon}</span>
              <small>×{pet.mult}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}
