import { useEffect, useRef } from 'react'
import { interactState } from '../systems/interact.js'
import { interactHoldState } from '../systems/interactHold.js'

const RADIUS = 14
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// "Press E to <label>" card with a keycap ringed by the hold-to-confirm
// progress. Written imperatively off a ~10Hz poll of the interact singletons,
// so it never re-renders per frame. While E is held the card collapses to just
// the enlarged ring + keycap (CSS .held); releasing restores it.
export default function InteractPrompt() {
  const rootRef = useRef(null)
  const ringRef = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    const id = setInterval(() => {
      const root = rootRef.current
      if (!root) return
      const label = interactState.label
      root.style.display = label ? '' : 'none'
      if (!label) return
      if (textRef.current.textContent !== label) textRef.current.textContent = label
      const p = interactHoldState.progress
      ringRef.current.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - p))
      root.classList.toggle('held', p > 0)
    }, 100)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={rootRef} className="interact-prompt" style={{ display: 'none' }}>
      <span className="interact-key">
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r={RADIUS} className="interact-ring-bg" />
          <circle
            ref={ringRef}
            cx="18"
            cy="18"
            r={RADIUS}
            className="interact-ring"
            style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: CIRCUMFERENCE }}
          />
        </svg>
        <span className="interact-cap">E</span>
      </span>
      <span className="interact-text">
        Press E to <span ref={textRef} />
      </span>
    </div>
  )
}
