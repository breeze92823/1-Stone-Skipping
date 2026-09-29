import { forwardRef, useImperativeHandle, useRef } from 'react'

// Top-center popup for the result of a held-E attempt (systems/actionResult.js).
// Driven imperatively via show(text, success) from Hud.jsx's ~10Hz poll —
// never a per-frame re-render.
const ActionResult = forwardRef(function ActionResult(_props, ref) {
  const rootRef = useRef(null)
  const barRef = useRef(null)
  const textRef = useRef(null)

  useImperativeHandle(
    ref,
    () => ({
      show(text, success = true) {
        const root = rootRef.current
        const bar = barRef.current
        const label = textRef.current
        if (!root || !bar || !label) return
        label.textContent = text
        label.style.color = success ? '#4ade80' : '#f87171'
        root.style.display = ''
        // Restart the one-shot animation even if mid-run: clear, reflow, reapply.
        bar.style.animation = 'none'
        void bar.offsetHeight
        bar.style.animation = ''
      },
    }),
    [],
  )

  return (
    <div ref={rootRef} className="action-result" style={{ display: 'none' }}>
      <div
        ref={barRef}
        className="action-result-bar"
        onAnimationEnd={() => {
          if (rootRef.current) rootRef.current.style.display = 'none'
        }}
      >
        <span ref={textRef} className="action-result-text" />
      </div>
    </div>
  )
})

export default ActionResult
