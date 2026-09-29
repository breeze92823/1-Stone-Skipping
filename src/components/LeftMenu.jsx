import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '../store/useGameStore.js'
import { purchase } from '../systems/bloxity.js'
import { findPet, MAX_EQUIPPED_PETS } from '../systems/eggPanel.js'
import { SHOW_ADDON, SKILL_STONES } from '../data/world.js'
import { BOOSTS } from '../data/boosts.js'
import { canAcceptRebirth, levelForSkill, rebirthLevelsRequired } from '../data/progression.js'
import { formatNumber } from '../utils/formatNumber.js'

// Left-edge menu grid (Shop, Rebirth, Pets, Stones, Inventory, Gifts). Rebirth
// reuses Hud's RebirthWindow via onRebirth; the rest open a modal from here and
// are hidden unless VITE_SHOW_ADDON=true (still laid out, so Rebirth keeps its spot).
const TILES = [
  { id: 'shop', label: 'Shop', icon: '🛍️', tile: 'red' },
  { id: 'rebirth', label: 'Rebirth', icon: '🔄', tile: 'pink' },
  { id: 'pets', label: 'Pets', icon: '🐾', tile: 'brown' },
  { id: 'stones', label: 'Stones', icon: '🪨', tile: 'grey' },
  { id: 'inventory', label: 'Inventory', icon: '🎒', tile: 'tan' },
  { id: 'gifts', label: 'Gifts', icon: '🎁', tile: 'blue' },
]

function Modal({ title, onClose, children }) {
  return createPortal(
    <div className="modal-backdrop" onWheel={(e) => e.stopPropagation()}>
      <div className="modal">
        <span className="modal-title outlined">{title}</span>
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
          X
        </button>
        <div className="modal-body menu-modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

function ShopWindow() {
  const grantSkill = useGameStore((s) => s.grantSkill)
  return (
    <div className="menu-grid">
      {BOOSTS.map((b) => (
        <button
          key={b.sku}
          type="button"
          className={`menu-card boost ${b.className}`}
          onClick={async () => {
            const result = await purchase(b.sku)
            if (result?.success) grantSkill(b.amount)
          }}
        >
          <span className="outlined menu-card-name">{b.label} Skill</span>
          <span className="outlined menu-card-sub">{b.cost} Bux</span>
        </button>
      ))}
    </div>
  )
}

function PetsWindow() {
  const owned = useGameStore((s) => s.ownedPets)
  const equipped = useGameStore((s) => s.equippedPets)
  const equipPet = useGameStore((s) => s.equipPet)
  const unequipPet = useGameStore((s) => s.unequipPet)
  if (!owned.length) return <div className="outlined menu-empty">No pets yet — hatch an egg!</div>
  return (
    <>
      <div className="outlined menu-sub">
        Equipped {equipped.length}/{MAX_EQUIPPED_PETS}
      </div>
      <div className="menu-grid">
        {owned.map((name) => {
          const pet = findPet(name)
          const on = equipped.includes(name)
          return (
            <button
              key={name}
              type="button"
              className={`menu-card${on ? ' active' : ''}`}
              style={{ background: pet?.color }}
              onClick={() => (on ? unequipPet(name) : equipPet(name))}
            >
              <span className="menu-card-icon">{pet?.icon}</span>
              <span className="outlined menu-card-name">{name}</span>
              <span className="outlined menu-card-sub">x{pet?.mult}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function StonesWindow() {
  const wins = useGameStore((s) => s.wins)
  const owned = useGameStore((s) => s.ownedStones)
  const equipped = useGameStore((s) => s.equippedStone)
  const buyStone = useGameStore((s) => s.buyStone)
  const equipStone = useGameStore((s) => s.equipStone)
  return (
    <div className="menu-grid">
      {SKILL_STONES.map((s) => {
        const has = owned.includes(s.model)
        return (
          <button
            key={s.model}
            type="button"
            className={`menu-card${equipped === s.model ? ' active' : ''}`}
            disabled={!has && wins < s.cost}
            onClick={() => (has ? equipStone(s.model) : buyStone(s.model, s.cost))}
          >
            <span className="menu-card-icon">🪨</span>
            <span className="outlined menu-card-name">{s.skill}</span>
            <span className="outlined menu-card-sub">
              {equipped === s.model ? 'Equipped' : has ? 'Equip' : `${formatNumber(s.cost)} Wins`}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function InventoryWindow() {
  const stones = useGameStore((s) => s.ownedStones)
  const pets = useGameStore((s) => s.ownedPets)
  const equippedStone = useGameStore((s) => s.equippedStone)
  const equippedPets = useGameStore((s) => s.equippedPets)
  return (
    <>
      <div className="outlined menu-sub">Stones ({stones.length})</div>
      <div className="menu-grid">
        {stones.map((id) => (
          <div key={id} className={`menu-card${id === equippedStone ? ' active' : ''}`}>
            <span className="menu-card-icon">🪨</span>
            <span className="outlined menu-card-name">{SKILL_STONES.find((s) => s.model === id)?.skill ?? id}</span>
          </div>
        ))}
      </div>
      <div className="outlined menu-sub">Pets ({pets.length})</div>
      {pets.length ? (
        <div className="menu-grid">
          {pets.map((name) => (
            <div key={name} className={`menu-card${equippedPets.includes(name) ? ' active' : ''}`}>
              <span className="menu-card-icon">{findPet(name)?.icon}</span>
              <span className="outlined menu-card-name">{name}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="outlined menu-empty">None yet</div>
      )}
    </>
  )
}

const WINDOWS = {
  shop: ['Shop', ShopWindow],
  pets: ['Pets', PetsWindow],
  stones: ['Stones', StonesWindow],
  inventory: ['Inventory', InventoryWindow],
  gifts: ['Gifts', () => <div className="outlined menu-empty">No gifts available right now.</div>],
}

export default function LeftMenu({ onRebirth, spotlightRebirth = false }) {
  const skill = useGameStore((s) => s.skill)
  const rebirths = useGameStore((s) => s.rebirths)
  const [open, setOpen] = useState(null)
  const ready = canAcceptRebirth(skill, rebirths)
  const pct = Math.min(100, Math.floor((levelForSkill(skill) / rebirthLevelsRequired(rebirths)) * 100))
  const [title, Body] = WINDOWS[open] ?? []

  return (
    <>
      <div className="left-menu">
        {TILES.map((t) => (
          <button
            key={t.id}
            type="button"
            style={!SHOW_ADDON && t.id !== 'rebirth' ? { visibility: 'hidden' } : undefined}
            className={`menu-tile tile-${t.tile}${t.id === 'rebirth' && ready ? ' ready' : ''}${t.id === 'rebirth' && spotlightRebirth ? ' tutorial-spot' : ''}`}
            onClick={() => (t.id === 'rebirth' ? onRebirth() : setOpen(t.id))}
          >
            {t.id === 'rebirth' && !ready && <span className="outlined menu-pct">{pct}%</span>}
            {t.id === 'gifts' && <span className="menu-alert">!</span>}
            <span className="menu-tile-icon">{t.icon}</span>
            <span className="outlined menu-tile-label">{t.label}</span>
          </button>
        ))}
      </div>
      {Body && (
        <Modal title={title} onClose={() => setOpen(null)}>
          <Body />
        </Modal>
      )}
    </>
  )
}
