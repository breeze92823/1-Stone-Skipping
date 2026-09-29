import { useEffect, useRef, useState } from 'react'
import { EGG_PANELS, eggPanelState } from '../systems/eggPanel.js'
import { hatchOne, hatchMulti, toggleAuto } from '../systems/eggHatch.js'
import { useGameStore } from '../store/useGameStore.js'

// Hatch-odds card shown while the player stands next to an egg pedestal.
// Polls the eggPanel singleton at ~10Hz; re-renders only when the kind changes.
export default function EggPanel() {
  const [kind, setKind] = useState(null)
  const [hover, setHover] = useState(null)
  const rootRef = useRef(null)
  const auto = useGameStore((s) => s.autoHatch)
  const owned = useGameStore((s) => s.ownedPets)

  useEffect(() => {
    const id = setInterval(() => setKind(eggPanelState.kind), 100)
    return () => clearInterval(id)
  }, [])

  // Follow the egg's projected screen position every frame (DOM transform only).
  useEffect(() => {
    if (!kind) return
    let raf
    const tick = () => {
      const root = rootRef.current
      const s = eggPanelState.screen
      if (root) {
        root.style.visibility = s.visible ? 'visible' : 'hidden'
        root.style.transform = `translate(${s.x}px, ${s.y}px) translate(${s.side === 'right' ? '0%' : '-100%'}, -50%) scale(${s.scale})`
        root.style.transformOrigin = s.side === 'right' ? '0% 50%' : '100% 50%'
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [kind])

  const panel = kind && EGG_PANELS[kind]
  if (!panel) return null

  return (
    <div ref={rootRef} className="egg-panel" style={{ visibility: 'hidden' }}>
      <div className="egg-odds">
        <div className="egg-odds-title">{panel.title}</div>
        <div className="egg-odds-grid">
          {panel.pets.map((pet) => (
            <div
              key={pet.name}
              className={`egg-pet${owned.includes(pet.name) ? " owned" : ""}`}
              style={{ '--pet': pet.color }}
              onPointerEnter={() => setHover(pet)}
              onPointerLeave={() => setHover((h) => (h === pet ? null : h))}
            >
              {hover === pet && (
                <div className="pet-tip">
                  <div className="pet-tip-name">{pet.name}</div>
                  <div className="pet-tip-rarity">{pet.rarity}</div>
                  <div className="pet-tip-mult"><span>⚡</span>×{pet.mult}</div>
                  <div className="pet-tip-exist">{pet.exist} Exist</div>
                </div>
              )}
              <span className="egg-pet-icon">{pet.icon}</span>
              <span className="egg-pet-chance">{pet.chance}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="egg-actions">
        <div className="egg-btn egg-btn-hatch" onClick={hatchOne}><b>E</b><span>Hatch</span></div>
        <div className="egg-btn egg-btn-multi" onClick={hatchMulti}><b>R</b><span>Multi</span></div>
        <div className={`egg-btn egg-btn-auto${auto ? " on" : ""}`} onClick={toggleAuto}><b>T</b><span>{auto ? 'Stop' : 'Auto'}</span></div>
      </div>
      <div className="egg-cost">
        <span className="egg-cost-trophy">🏆</span>
        <span>{panel.cost}</span>
      </div>
    </div>
  )
}
